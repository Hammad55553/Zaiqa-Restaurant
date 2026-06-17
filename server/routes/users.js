const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueUserChange } = require('../services/syncHelper');

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  db.get(
    'SELECT id, username, name, password as dbPassword, role, permissions FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid username' });
      }

      if (user.dbPassword === 'PENDING_PIN') {
        return res.json({ requirePinSetup: true, username: user.username });
      }

      if (user.dbPassword !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Parse permissions if stored as JSON string
      try {
        user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
      } catch (e) {
        user.permissions = [];
      }

      delete user.dbPassword;
      res.json({ message: 'Login successful', user });
    }
  );
});

// Get all users (Admin only checks can be done in frontend, but we expose endpoint)
router.get('/', (req, res) => {
  db.all('SELECT id, username, name, role, permissions FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Parse permissions for each user
    const users = rows.map(user => {
      try {
        user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
      } catch (e) {
        user.permissions = [];
      }
      return user;
    });

    res.json(users);
  });
});

// Create new user
router.post('/', (req, res) => {
  let { username, password, role, name, permissions } = req.body;
  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }
  
  if (!password) {
    password = 'PENDING_PIN';
  }

  const permsStr = JSON.stringify(permissions || []);

  db.run(
    'INSERT INTO users (username, password, role, permissions, name) VALUES (?, ?, ?, ?, ?)',
    [username, password, role, permsStr, name],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      // Sync new user to Supabase
      queueUserChange(this.lastID, 'insert');

      res.status(201).json({ id: this.lastID, username, role, name, permissions });
    }
  );
});

// Update user details & permissions
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, role, name, permissions, reset_pin } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }

  const permsStr = JSON.stringify(permissions || []);

  if (reset_pin) {
    // Reset PIN scenario
    db.run(
      'UPDATE users SET username = ?, password = ?, role = ?, name = ?, permissions = ? WHERE id = ?',
      [username, 'PENDING_PIN', role, name, permsStr, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        queueUserChange(id, 'update');
        res.json({ message: 'User updated and PIN reset successfully' });
      }
    );
  } else if (password) {
    // Update with explicit password change
    db.run(
      'UPDATE users SET username = ?, password = ?, role = ?, name = ?, permissions = ? WHERE id = ?',
      [username, password, role, name, permsStr, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        // Sync user update to Supabase
        queueUserChange(id, 'update');

        res.json({ message: 'User updated successfully' });
      }
    );
  } else {
    // Update without changing password
    db.run(
      'UPDATE users SET username = ?, role = ?, name = ?, permissions = ? WHERE id = ?',
      [username, role, name, permsStr, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        // Sync user update to Supabase
        queueUserChange(id, 'update');

        res.json({ message: 'User updated successfully' });
      }
    );
  }
});

// Delete user
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Sync deleted user from Supabase
    queueUserChange(id, 'delete');

    res.json({ message: 'User deleted successfully' });
  });
});

// Set PIN for first-time login
router.post('/set-pin', (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN are required' });
  }

  db.get('SELECT id, username, name, password, role FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.password !== 'PENDING_PIN') {
      return res.status(400).json({ error: 'PIN is already set. Request Admin to reset it.' });
    }

    db.run('UPDATE users SET password = ? WHERE id = ?', [pin, user.id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      queueUserChange(user.id, 'update');
      res.json({ message: 'PIN set successfully' });
    });
  });
});

module.exports = router;
