const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT id, username, role, permissions FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Parse permissions if stored as JSON string
      try {
        user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
      } catch (e) {
        user.permissions = [];
      }

      res.json({ message: 'Login successful', user });
    }
  );
});

// Get all users (Admin only checks can be done in frontend, but we expose endpoint)
router.get('/', (req, res) => {
  db.all('SELECT id, username, role, permissions FROM users', [], (err, rows) => {
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
  const { username, password, role, permissions } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  const permsStr = JSON.stringify(permissions || []);

  db.run(
    'INSERT INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)',
    [username, password, role, permsStr],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, username, role, permissions });
    }
  );
});

// Update user details & permissions
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, role, permissions } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }

  const permsStr = JSON.stringify(permissions || []);

  if (password) {
    // Update with password change
    db.run(
      'UPDATE users SET username = ?, password = ?, role = ?, permissions = ? WHERE id = ?',
      [username, password, role, permsStr, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'User updated successfully' });
      }
    );
  } else {
    // Update without changing password
    db.run(
      'UPDATE users SET username = ?, role = ?, permissions = ? WHERE id = ?',
      [username, role, permsStr, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
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
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;
