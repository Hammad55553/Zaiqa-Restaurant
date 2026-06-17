const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueUserChange } = require('../services/syncHelper');

const { supabase } = require('../config/supabase');

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  db.get(
    'SELECT id, username, name, password as dbPassword, role, permissions FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Helper to process login locally
      const processLocalLogin = (matchedUser) => {
        if (matchedUser.dbPassword === 'PENDING_PIN') {
          return res.json({ requirePinSetup: true, username: matchedUser.username });
        }

        if (matchedUser.dbPassword !== password) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Parse permissions if stored as JSON string
        try {
          matchedUser.permissions = matchedUser.permissions ? JSON.parse(matchedUser.permissions) : [];
        } catch (e) {
          matchedUser.permissions = [];
        }

        delete matchedUser.dbPassword;
        return res.json({ message: 'Login successful', user: matchedUser });
      };

      // If user exists locally and password matches, log in immediately
      if (user && (user.dbPassword === password || user.dbPassword === 'PENDING_PIN')) {
        return processLocalLogin(user);
      }

      // If user not found locally OR password didn't match, try to authenticate via Supabase
      try {
        console.log(`🌐 Checking Supabase for online credentials of user: ${username}`);
        const { data: onlineUser, error: onlineErr } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();

        if (onlineErr || !onlineUser) {
          // No user found online either
          if (!user) {
            return res.status(401).json({ error: 'Invalid username' });
          } else {
            return res.status(401).json({ error: 'Invalid username or password' });
          }
        }

        // Verify password against online record
        if (onlineUser.password !== password && onlineUser.password !== 'PENDING_PIN') {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Save/Sync this online user details to our local SQLite DB for future offline use
        console.log(`💾 Syncing online user '${username}' details to local database.`);
        const permsStr = typeof onlineUser.permissions === 'string' 
          ? onlineUser.permissions 
          : JSON.stringify(onlineUser.permissions || []);

        db.run(
          `INSERT INTO users (id, username, password, role, permissions, name) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(username) DO UPDATE SET 
             id = excluded.id,
             password = excluded.password,
             role = excluded.role,
             permissions = excluded.permissions,
             name = excluded.name`,
          [onlineUser.id, onlineUser.username, onlineUser.password, onlineUser.role, permsStr, onlineUser.name || ''],
          (dbErr) => {
            if (dbErr) {
              console.error('❌ Failed to update local user DB with online credentials:', dbErr.message);
            }
            // Proceed with login
            const loggedUser = {
              id: onlineUser.id,
              username: onlineUser.username,
              name: onlineUser.name,
              role: onlineUser.role,
              permissions: typeof onlineUser.permissions === 'string' ? JSON.parse(onlineUser.permissions) : (onlineUser.permissions || [])
            };

            if (onlineUser.password === 'PENDING_PIN') {
              return res.json({ requirePinSetup: true, username: onlineUser.username });
            }

            return res.json({ message: 'Login successful (Online Authenticated)', user: loggedUser });
          }
        );
      } catch (catchErr) {
        console.error('⚠️ Supabase login fallback failed:', catchErr.message);
        // Fallback to local authentication check if Supabase is offline/errors
        if (user) {
          return processLocalLogin(user);
        }
        return res.status(401).json({ error: 'Invalid username or password (Offline)' });
      }
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
  const { username, password, role, name, permissions } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
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
  const { username, password, role, name, permissions } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }

  const permsStr = JSON.stringify(permissions || []);

  if (password) {
    // Update with password change
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

module.exports = router;
