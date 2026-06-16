const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { broadcastChatNotification } = require('../services/fcmHelper');

// Get last 50 messages
router.get('/', (req, res) => {
  db.all(
    'SELECT * FROM messages ORDER BY id DESC LIMIT 50',
    [],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (messages.length === 0) {
        return res.json([]);
      }
      
      const messageIds = messages.map(m => m.id);
      const placeholders = messageIds.map(() => '?').join(',');
      
      db.all(
        `SELECT * FROM message_receipts WHERE message_id IN (${placeholders})`,
        messageIds,
        (err2, receipts) => {
          if (err2) return res.status(500).json({ error: err2.message });
          
          db.all(
            `SELECT * FROM message_reactions WHERE message_id IN (${placeholders})`,
            messageIds,
            (err3, reactions) => {
              if (err3) return res.status(500).json({ error: err3.message });
              
              // Map back
              const msgMap = {};
              messages.forEach(m => {
                m.receipts = [];
                m.reactions = [];
                msgMap[m.id] = m;
              });
              
              receipts.forEach(r => {
                if (msgMap[r.message_id]) msgMap[r.message_id].receipts.push(r);
              });
              
              reactions.forEach(react => {
                if (msgMap[react.message_id]) msgMap[react.message_id].reactions.push(react);
              });
              
              res.json(messages.reverse());
            }
          );
        }
      );
    }
  );
});

// Post a new message
router.post('/', (req, res) => {
  const { sender_username, sender_role, text } = req.body;
  if (!sender_username || !sender_role || !text) {
    return res.status(400).json({ error: 'Username, role, and text are required' });
  }

  db.run(
    'INSERT INTO messages (sender_username, sender_role, text) VALUES (?, ?, ?)',
    [sender_username, sender_role, text],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const messageId = this.lastID;
      const now = new Date().toISOString();

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

          // Broadcast over WebSocket if server is loaded
          const broadcast = req.app.get('wss_broadcast');
          if (broadcast) {
            broadcast({
              type: 'CHAT_MESSAGE',
              ...messageObj
            });
          }

          // Trigger FCM push
          broadcastChatNotification(sender_username, text);

          res.status(201).json(messageObj);
        }
      );
    }
  );
});

module.exports = router;
