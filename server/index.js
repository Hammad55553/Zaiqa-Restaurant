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

wss.on('connection', (ws) => {
  console.log('🔌 Client connected via WebSocket');
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

// Sync mutation middleware: auto-broadcast a SYNC_TRIGGER on successful non-GET mutations
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`📡 Successful mutation detected: ${req.method} ${req.originalUrl}. Broadcasting sync...`);
        broadcast({ type: 'SYNC_TRIGGER', method: req.method, url: req.originalUrl, timestamp: Date.now() });
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

// ── Initialize SQLite DB ──────────────────────────────────────────────────────
initDb();

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
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/stock',     require('./routes/stock'));
app.use('/api/tables',    require('./routes/tables'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/deliveries',require('./routes/deliveries'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/update',    require('./routes/update'));

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

