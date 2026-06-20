const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueUserChange } = require('../services/syncHelper');

const { supabase } = require('../config/supabase');

const dns = require('dns');

// Helper to check active internet connectivity to Supabase
function checkInternet() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, 3000);

    dns.lookup('pbhfxcjdupukgdpbeusc.supabase.co', (err) => {
      clearTimeout(timer);
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Helper to process login locally
  const processLocalLogin = () => {
    db.get(
      'SELECT id, username, name, password as dbPassword, role, permissions FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid username or password' });
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
        return res.json({ message: 'Login successful', user });
      }
    );
  };

  // 1. Explicitly check internet connectivity first
  const isOnline = await checkInternet();

  if (!isOnline) {
    console.log(`📴 No internet connection detected. Falling back to local SQLite authentication immediately.`);
    return processLocalLogin();
  }

  // 2. Try to authenticate via Supabase
  try {
    console.log(`🌐 Internet is ON. Checking Supabase for credentials of user: ${username}`);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase fetch timed out')), 5000)
    );

    const fetchPromise = supabase.from('users').select('*').eq('username', username).single();
    
    const { data: onlineUser, error: onlineErr } = await Promise.race([fetchPromise, timeoutPromise]);


    if (onlineErr || !onlineUser) {
      console.log(`⚠️ User not found on Supabase (or invalid query). Returning invalid credentials directly.`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 3. Verify password against online record
    if (onlineUser.password !== password && onlineUser.password !== 'PENDING_PIN') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 4. Save/Sync this online user details to our local SQLite DB for future offline use
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
    console.error('⚠️ Supabase connection error during online check:', catchErr.message);
    // Since we verified internet was ON, a connection exception means either Supabase service is down
    // or a sudden drop occurred. In this case, we can log and fallback to local login.
    console.log('⚠️ Falling back to local authentication as a safety measure.');
    return processLocalLogin();
  }
});

// Get all users (Admin only checks can be done in frontend, but we expose endpoint)
router.get('/', async (req, res) => {
  const isOnline = await checkInternet();
  if (isOnline) {
    try {
      console.log('🌐 Fetching all users from Supabase to sync local users DB...');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase fetch timed out')), 5000)
      );

      const fetchPromise = supabase.from('users').select('*');
      
      const { data: onlineUsers, error: onlineErr } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!onlineErr && onlineUsers) {
        // Upsert all online users into local SQLite DB
        for (const user of onlineUsers) {
          const permsStr = typeof user.permissions === 'string'
            ? user.permissions
            : JSON.stringify(user.permissions || []);
          
          await new Promise((resolve) => {
            db.run(
              `INSERT INTO users (id, username, password, role, permissions, name) 
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(username) DO UPDATE SET 
                 id = excluded.id,
                 password = excluded.password,
                 role = excluded.role,
                 permissions = excluded.permissions,
                 name = excluded.name`,
              [user.id, user.username, user.password, user.role, permsStr, user.name || ''],
              () => resolve()
            );
          });
        }
      }
    } catch (err) {
      console.error('⚠️ Failed to sync users from Supabase:', err.message);
    }
  }

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
