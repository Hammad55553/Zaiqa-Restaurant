console.log('main.js starting...');
const { app, BrowserWindow, Menu } = require('electron');
console.log('Electron imported, app =', typeof app);
const path = require('path');
const fs = require('fs');
const Module = require('module');

// Allow files loaded from updates directory (userData) to resolve bundled dependencies
const bundledNodeModules = path.join(__dirname, 'node_modules');
process.env.NODE_PATH = bundledNodeModules + (process.platform === 'win32' ? ';' : ':') + (process.env.NODE_PATH || '');
Module._initPaths();

process.env.PORT = '5005';

let userDataPath;
let mainWindow;

function seedDatabaseIfNeeded() {
  if (!userDataPath) return;
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(userDataPath, 'pos.db');
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
      if (err) {
        console.error('Error checking categories:', err.message);
        db.close();
        return;
      }

      if (row && row.count === 0) {
        console.log('🌱 Fresh install detected. Seeding categories and menu items...');
        
        const categories = [
          'Biryani & Rice',
          'BBQ & Grill',
          'Karahi & Handi',
          'Breads & Naan',
          'Beverages',
          'Starters',
          'Desserts',
          'Fast Food'
        ];

        categories.forEach(name => {
          db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name]);
        });

        db.all('SELECT id, name FROM categories', [], (err, catRows) => {
          if (err || !catRows) {
            db.close();
            return;
          }

          const categoryIds = {};
          catRows.forEach(r => { categoryIds[r.name] = r.id; });

          const items = [
            { category: 'Biryani & Rice', name: 'Chicken Biryani (Full)', price: 650 },
            { category: 'Biryani & Rice', name: 'Chicken Biryani (Half)', price: 380 },
            { category: 'Biryani & Rice', name: 'Mutton Biryani (Full)', price: 1100 },
            { category: 'Biryani & Rice', name: 'Mutton Biryani (Half)', price: 600 },
            { category: 'BBQ & Grill', name: 'Chicken Tikka (6 Pcs)', price: 700 },
            { category: 'BBQ & Grill', name: 'Seekh Kabab (6 Pcs)', price: 450 },
            { category: 'Karahi & Handi', name: 'Chicken Karahi (1 Kg)', price: 950 },
            { category: 'Karahi & Handi', name: 'Chicken Karahi (Half Kg)', price: 550 },
            { category: 'Breads & Naan', name: 'Naan (Plain)', price: 30 },
            { category: 'Breads & Naan', name: 'Tandoori Roti', price: 25 },
            { category: 'Beverages', name: 'Lassi (Sweet)', price: 150 },
            { category: 'Beverages', name: 'Soft Drink (Can)', price: 80 },
            { category: 'Desserts', name: 'Gulab Jamun (4 Pcs)', price: 180 },
            { category: 'Fast Food', name: 'Zinger Burger', price: 420 }
          ];

          items.forEach(item => {
            const catId = categoryIds[item.category];
            if (catId) {
              db.run('INSERT OR IGNORE INTO items (category_id, name, price) VALUES (?, ?, ?)', [
                catId,
                item.name,
                item.price
              ]);
            }
          });
          console.log('✅ Seeding completed successfully.');
          db.close();
        });
      } else {
        db.close();
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    title: 'Zaiqah POS',
    backgroundColor: '#0f172a'
  });

  const userDataPath = app.getPath('userData');
  const updateIndexPath = path.join(userDataPath, 'updates/web-dist/index.html');
  const bundledIndexPath = path.join(__dirname, 'web-dist/index.html');
  
  if (fs.existsSync(updateIndexPath)) {
    console.log('Loading updated web UI from:', updateIndexPath);
    mainWindow.loadFile(updateIndexPath);
  } else if (fs.existsSync(bundledIndexPath)) {
    console.log('Loading bundled web UI from:', bundledIndexPath);
    mainWindow.loadFile(bundledIndexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

console.log('About to call app.whenReady()...');
app.whenReady().then(() => {
  console.log('App ready!');
  userDataPath = app.getPath('userData');
  process.env.ELECTRON_USER_DATA_PATH = userDataPath;
  console.log('UserData directory:', userDataPath);
  
  const updateServerPath = path.join(userDataPath, 'updates/server/index.js');
  if (fs.existsSync(updateServerPath)) {
    console.log('Loading updated server from:', updateServerPath);
    require(updateServerPath);
  } else {
    console.log('Loading bundled server from:', path.join(__dirname, 'server/index.js'));
    require('./server/index.js');
  }
  
  setTimeout(seedDatabaseIfNeeded, 1000);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
