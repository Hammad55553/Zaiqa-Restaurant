require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');
const http = require('http');
const WebSocket = require('ws');
const { initDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5005;

// Create HTTP server from express app
const server = http.createServer(app);

// Setup WebSocket server
const wss = new WebSocket.Server({ server });

app.set('http_server', server);
app.set('wss_server', wss);

let electronApp;
try {
  electronApp = require('electron').app;
  
  // Aggressively clear cache on boot to ensure OTA updates reflect immediately on old desktop clients
  const session = require('electron').session;
  if (session && session.defaultSession) {
    session.defaultSession.clearCache().then(() => {
      console.log('✅ Electron cache forcefully cleared from server module!');
    }).catch(err => console.error('Failed to clear cache:', err));
  }
} catch (e) {
  console.log('Running outside Electron context');
}

wss.on('connection', (ws) => {
  console.log('🔌 Client connected via WebSocket');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'NOTIFICATION') {
        console.log(`🔔 Custom Notification received: ${data.title} - ${data.desc}`);
        broadcast(data);
      } else if (data.type === 'CHAT_MESSAGE') {
        const { sender_username, sender_role, text } = data;
        const { db } = require('./database/db');
        const { broadcastChatNotification } = require('./services/fcmHelper');
        
        db.run(
          'INSERT INTO messages (sender_username, sender_role, text) VALUES (?, ?, ?)',
          [sender_username, sender_role, text],
          function (err) {
            if (err) {
              console.error('❌ Failed to save chat message from WS:', err.message);
              return;
            }
            
            const messageId = this.lastID;
            const now = new Date().toISOString();

            // Self receipt (Sender reads own message immediately)
            db.run(
              "INSERT INTO message_receipts (message_id, username, status) VALUES (?, ?, 'read')",
              [messageId, sender_username],
              (err2) => {
                const messageObj = {
                  id: messageId,
                  sender_username,
                  sender_role,
                  text,
                  created_at: now,
                  receipts: [{ message_id: messageId, username: sender_username, status: 'read', updated_at: now }],
                  reactions: []
                };

                // Broadcast message to all connected clients
                broadcast({
                  type: 'CHAT_MESSAGE',
                  ...messageObj
                });

                // Trigger FCM push notifications
                broadcastChatNotification(sender_username, text);
              }
            );
          }
        );
      } else if (data.type === 'CHAT_MESSAGE_DELIVERED') {
        const { message_id, username } = data;
        const { db } = require('./database/db');
        const now = new Date().toISOString();
        db.run(
          `INSERT INTO message_receipts (message_id, username, status) VALUES (?, ?, 'delivered')
           ON CONFLICT(message_id, username) DO UPDATE SET status = 'delivered' WHERE status != 'read'`,
          [message_id, username],
          (err) => {
            if (err) return;
            broadcast({
              type: 'CHAT_RECEIPT_UPDATE',
              message_id,
              username,
              status: 'delivered',
              updated_at: now
            });
          }
        );
      } else if (data.type === 'CHAT_MESSAGE_READ') {
        const { message_id, username } = data;
        const { db } = require('./database/db');
        const now = new Date().toISOString();
        db.run(
          `INSERT INTO message_receipts (message_id, username, status) VALUES (?, ?, 'read')
           ON CONFLICT(message_id, username) DO UPDATE SET status = 'read'`,
          [message_id, username],
          (err) => {
            if (err) return;
            broadcast({
              type: 'CHAT_RECEIPT_UPDATE',
              message_id,
              username,
              status: 'read',
              updated_at: now
            });
          }
        );
      } else if (data.type === 'CHAT_MESSAGE_REACTION') {
        const { message_id, username, reaction } = data;
        const { db } = require('./database/db');
        if (!reaction) {
          db.run(
            'DELETE FROM message_reactions WHERE message_id = ? AND username = ?',
            [message_id, username],
            (err) => {
              if (err) return;
              broadcast({
                type: 'CHAT_REACTION_UPDATE',
                message_id,
                username,
                reaction: null
              });
            }
          );
        } else {
          db.run(
            `INSERT INTO message_reactions (message_id, username, reaction) VALUES (?, ?, ?)
             ON CONFLICT(message_id, username) DO UPDATE SET reaction = excluded.reaction`,
            [message_id, username, reaction],
            (err) => {
              if (err) return;
              broadcast({
                type: 'CHAT_REACTION_UPDATE',
                message_id,
                username,
                reaction
              });
            }
          );
        }
      }
    } catch (e) {
      console.warn('⚠️ Received non-JSON message over WS:', message);
    }
  });

  ws.on('close', () => console.log('❌ Client disconnected from WebSocket'));
});

// Broadcast helper function
const broadcast = (data) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

app.set('wss_broadcast', broadcast);

// Sync mutation middleware: auto-broadcast a SYNC_TRIGGER and NOTIFICATION on successful non-GET mutations
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`📡 Successful mutation detected: ${req.method} ${req.originalUrl}. Broadcasting sync...`);
        
        // 1. Broadcast sync trigger
        broadcast({ type: 'SYNC_TRIGGER', method: req.method, url: req.originalUrl, timestamp: Date.now() });

        // 2. Broadcast critical notifications automatically
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (req.method === 'POST' && req.originalUrl.includes('/orders')) {
          broadcast({
            type: 'NOTIFICATION',
            id: `notif-order-${Date.now()}`,
            title: 'New Order Placed 📝',
            desc: `A new order has been received by the system.`,
            time: timeStr
          });
        } else if (req.originalUrl.includes('/orders') && (req.method === 'PUT' || req.method === 'PATCH')) {
          broadcast({
            type: 'NOTIFICATION',
            id: `notif-update-${Date.now()}`,
            title: 'Order Status Updated 🔄',
            desc: `An order's status or details have been updated.`,
            time: timeStr
          });
        }
      }
    });
  }
  next();
});

// ── Get WiFi IP automatically ─────────────────────────────────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// ── Serve Static Assets ───────────────────────────────────────────────────────
const path = require('path');
// Serve the mobile assets folder so the mobile app can fetch them via URL to prevent OTA bundle image breakages
app.use('/assets', express.static(path.join(__dirname, '../mobile/assets')));

// ── Initialize SQLite DB ──────────────────────────────────────────────────────
initDb();

// ── Start Supabase Sync Worker ────────────────────────────────────────────────
const { startSyncWorker, triggerSyncNow } = require('./services/syncWorker');
startSyncWorker();

// ── Sync Status & Force Sync ──────────────────────────────────────────────────
const { db } = require('./database/db');
app.get('/api/sync/status', (req, res) => {
  db.get(`SELECT COUNT(*) as pending FROM sync_queue WHERE status='pending'`, (err, row1) => {
    db.get(`SELECT COUNT(*) as failed FROM sync_queue WHERE status='failed'`, (err2, row2) => {
      db.get(`SELECT MAX(created_at) as last_activity FROM sync_queue`, (err3, row3) => {
        res.json({
          pending: row1?.pending || 0,
          failed: row2?.failed || 0,
          lastActivity: row3?.last_activity || null,
          workerRunning: true,
          timestamp: new Date().toISOString()
        });
      });
    });
  });
});

app.post('/api/sync/force', async (req, res) => {
  try {
    await triggerSyncNow();
    res.json({ success: true, message: 'Sync triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Zaiqa Mahal POS Server is running!',
    server_ip: getLocalIP(),
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
const expensesRouter = require('./routes/expenses');
const tablesRouter = require('./routes/tables');
const chatRouter = require('./routes/chat');
const syncRouter = require('./routes/sync');

app.use('/api/orders',    require('./routes/orders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/stock',     require('./routes/stock'));
app.use('/api/tables',    tablesRouter);
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/expenses',  expensesRouter);
app.use('/api/customers', require('./routes/customers'));
app.use('/api/deliveries',require('./routes/deliveries'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/update',    require('./routes/update'));
app.use('/api/chat',      chatRouter);
app.use('/api/sync',      syncRouter);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Start Server ──────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          ZAIQA MAHAL POS SERVER                  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}                ║`);
  console.log(`║  WiFi:     http://${localIP}:${PORT}         ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  config.ts → API_BASE = 'http://${localIP}:${PORT}/api'`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\n✅ Server ready. All devices on same WiFi can connect.\n');
});

