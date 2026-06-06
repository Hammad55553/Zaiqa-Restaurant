const { db, initDb } = require('./db');

// Wait for DB to initialize
initDb();

setTimeout(() => {
  console.log('\n🌱 Seeding Zaiqa Mahal menu data...\n');

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    'Biryani & Rice',
    'BBQ & Grill',
    'Karahi & Handi',
    'Breads & Naan',
    'Beverages',
    'Starters',
    'Desserts',
    'Fast Food',
  ];

  const categoryIds = {};

  db.serialize(() => {
    // Insert categories
    categories.forEach(name => {
      db.run(`INSERT OR IGNORE INTO categories (name) VALUES (?)`, [name], function(err) {
        if (err) console.error('Category error:', err.message);
      });
    });

    // Fetch category IDs
    db.all(`SELECT id, name FROM categories`, [], (err, rows) => {
      if (err) { console.error('Fetch categories error:', err.message); return; }
      rows.forEach(r => { categoryIds[r.name] = r.id; });

      const items = [
        // Biryani & Rice
        { category: 'Biryani & Rice', name: 'Chicken Biryani (Full)', price: 650 },
        { category: 'Biryani & Rice', name: 'Chicken Biryani (Half)', price: 380 },
        { category: 'Biryani & Rice', name: 'Mutton Biryani (Full)', price: 1100 },
        { category: 'Biryani & Rice', name: 'Mutton Biryani (Half)', price: 600 },
        { category: 'Biryani & Rice', name: 'Beef Biryani (Full)', price: 850 },
        { category: 'Biryani & Rice', name: 'Beef Biryani (Half)', price: 480 },
        { category: 'Biryani & Rice', name: 'Pulao (Full)', price: 550 },
        { category: 'Biryani & Rice', name: 'Pulao (Half)', price: 320 },
        { category: 'Biryani & Rice', name: 'Zeera Rice', price: 200 },
        { category: 'Biryani & Rice', name: 'Chawal (Plain Rice)', price: 120 },

        // BBQ & Grill
        { category: 'BBQ & Grill', name: 'Chicken Tikka (6 Pcs)', price: 700 },
        { category: 'BBQ & Grill', name: 'Chicken Tikka (12 Pcs)', price: 1300 },
        { category: 'BBQ & Grill', name: 'Seekh Kabab (6 Pcs)', price: 450 },
        { category: 'BBQ & Grill', name: 'Seekh Kabab (12 Pcs)', price: 850 },
        { category: 'BBQ & Grill', name: 'Reshmi Kabab (6 Pcs)', price: 500 },
        { category: 'BBQ & Grill', name: 'Beef Boti (6 Pcs)', price: 600 },
        { category: 'BBQ & Grill', name: 'Malai Boti (6 Pcs)', price: 650 },
        { category: 'BBQ & Grill', name: 'Lamb Chops (4 Pcs)', price: 950 },
        { category: 'BBQ & Grill', name: 'Mixed BBQ Platter', price: 1800 },

        // Karahi & Handi
        { category: 'Karahi & Handi', name: 'Chicken Karahi (1 Kg)', price: 950 },
        { category: 'Karahi & Handi', name: 'Chicken Karahi (Half Kg)', price: 550 },
        { category: 'Karahi & Handi', name: 'Mutton Karahi (1 Kg)', price: 1600 },
        { category: 'Karahi & Handi', name: 'Mutton Karahi (Half Kg)', price: 900 },
        { category: 'Karahi & Handi', name: 'Beef Karahi (1 Kg)', price: 1200 },
        { category: 'Karahi & Handi', name: 'Beef Karahi (Half Kg)', price: 700 },
        { category: 'Karahi & Handi', name: 'Chicken Handi (Full)', price: 850 },
        { category: 'Karahi & Handi', name: 'Chicken Handi (Half)', price: 480 },
        { category: 'Karahi & Handi', name: 'Daal Makhani', price: 350 },
        { category: 'Karahi & Handi', name: 'Palak Gosht', price: 700 },
        { category: 'Karahi & Handi', name: 'Nihari (Bowl)', price: 400 },

        // Breads & Naan
        { category: 'Breads & Naan', name: 'Naan (Plain)', price: 30 },
        { category: 'Breads & Naan', name: 'Tandoori Roti', price: 25 },
        { category: 'Breads & Naan', name: 'Butter Naan', price: 50 },
        { category: 'Breads & Naan', name: 'Garlic Naan', price: 70 },
        { category: 'Breads & Naan', name: 'Peshwari Naan', price: 120 },
        { category: 'Breads & Naan', name: 'Paratha', price: 40 },

        // Starters
        { category: 'Starters', name: 'Chicken Samosa (4 Pcs)', price: 180 },
        { category: 'Starters', name: 'Spring Rolls (4 Pcs)', price: 200 },
        { category: 'Starters', name: 'Chicken Chaat', price: 250 },
        { category: 'Starters', name: 'Raita', price: 80 },
        { category: 'Starters', name: 'Salad', price: 100 },
        { category: 'Starters', name: 'Papad', price: 60 },

        // Beverages
        { category: 'Beverages', name: 'Lassi (Sweet)', price: 150 },
        { category: 'Beverages', name: 'Lassi (Salted)', price: 150 },
        { category: 'Beverages', name: 'Mango Lassi', price: 180 },
        { category: 'Beverages', name: 'Fresh Lime Soda', price: 120 },
        { category: 'Beverages', name: 'Kashmiri Chai', price: 100 },
        { category: 'Beverages', name: 'Doodh Pati (Tea)', price: 60 },
        { category: 'Beverages', name: 'Soft Drink (Can)', price: 80 },
        { category: 'Beverages', name: 'Water (Bottle)', price: 50 },
        { category: 'Beverages', name: 'Rooh Afza', price: 120 },

        // Desserts
        { category: 'Desserts', name: 'Gulab Jamun (4 Pcs)', price: 180 },
        { category: 'Desserts', name: 'Kheer (Bowl)', price: 200 },
        { category: 'Desserts', name: 'Rabri', price: 250 },
        { category: 'Desserts', name: 'Zarda (Sweet Rice)', price: 220 },
        { category: 'Desserts', name: 'Gajar Halwa', price: 200 },

        // Fast Food
        { category: 'Fast Food', name: 'Chicken Burger', price: 350 },
        { category: 'Fast Food', name: 'Zinger Burger', price: 420 },
        { category: 'Fast Food', name: 'Club Sandwich', price: 380 },
        { category: 'Fast Food', name: 'Chicken Shawarma', price: 280 },
        { category: 'Fast Food', name: 'Beef Roll', price: 300 },
        { category: 'Fast Food', name: 'French Fries', price: 200 },
      ];

      let inserted = 0;
      let skipped = 0;

      items.forEach(item => {
        const catId = categoryIds[item.category];
        if (!catId) { console.warn('No catId for:', item.category); skipped++; return; }
        // Check if already exists
        db.get(`SELECT id FROM items WHERE name = ? AND category_id = ?`, [item.name, catId], (err, row) => {
          if (row) { skipped++; }
          else {
            db.run(
              `INSERT INTO items (category_id, name, price) VALUES (?, ?, ?)`,
              [catId, item.name, item.price],
              (err2) => {
                if (err2) console.error('Item insert error:', item.name, err2.message);
                else inserted++;
              }
            );
          }
        });
      });

      setTimeout(() => {
        db.get('SELECT COUNT(*) as c FROM items', [], (err, row) => {
          console.log(`✅ Seeding complete!`);
          console.log(`   Items in DB: ${row?.c}`);
          console.log(`   Inserted: ~${inserted}`);
          console.log(`   Skipped (already exist): ~${skipped}`);
          process.exit(0);
        });
      }, 1500);
    });
  });
}, 600);
