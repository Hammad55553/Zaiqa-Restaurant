const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueCustomerChange } = require('../services/syncHelper');

// GET all customers with history
router.get('/', (req, res) => {
  // Fetch all customers first
  const customerQuery = `SELECT * FROM customers ORDER BY name ASC`;
  db.all(customerQuery, [], (err, customers) => {
    if (err) {
      console.error('Error fetching customers:', err.message);
      return res.status(500).json({ error: err.message });
    }

    // Fetch ledger history for all customers
    const ledgerQuery = `SELECT * FROM customer_ledger ORDER BY date DESC`;
    db.all(ledgerQuery, [], (err, ledgerRows) => {
      if (err) {
        console.error('Error fetching customer ledger:', err.message);
        return res.status(500).json({ error: err.message });
      }

      // Map history rows to respective customers
      const customersWithHistory = customers.map(c => {
        return {
          ...c,
          history: ledgerRows.filter(h => h.customer_id === c.id)
        };
      });

      res.json(customersWithHistory);
    });
  });
});

// POST register new customer
router.post('/', (req, res) => {
  const { id, name, phone, email, address, type, balance } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and contact phone are required.' });
  }

  const custId = id || `CUST-${Date.now()}`;
  const custType = type || 'Client';
  const startBalance = parseFloat(balance) || 0;

  db.serialize(() => {
    // Insert into customers
    const insertQuery = `INSERT INTO customers (id, name, phone, email, address, type, balance) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(insertQuery, [custId, name, phone, email || null, address || null, custType, startBalance], function(err) {
      if (err) {
        console.error('Error creating customer:', err.message);
        return res.status(500).json({ error: err.message });
      }

      // If there is an opening balance, record it in ledger
      if (startBalance !== 0) {
        const typeOfEntry = startBalance > 0 ? 'credit' : 'payment';
        const absAmount = Math.abs(startBalance);
        
        const ledgerInsert = `INSERT INTO customer_ledger (customer_id, type, amount, note) VALUES (?, ?, ?, ?)`;
        db.run(ledgerInsert, [custId, typeOfEntry, absAmount, 'Opening Balance'], function(err) {
          if (err) {
            console.error('Error creating opening ledger:', err.message);
          }
        });
      }

      // Sync new customer to Supabase
      queueCustomerChange(custId, 'insert');

      res.status(201).json({
        id: custId,
        name,
        phone,
        email,
        address,
        type: custType,
        balance: startBalance,
        history: startBalance !== 0 ? [{
          date: new Date().toISOString(),
          type: startBalance > 0 ? 'credit' : 'payment',
          amount: Math.abs(startBalance),
          note: 'Opening Balance'
        }] : []
      });
    });
  });
});

// PUT update customer details
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and contact phone are required.' });
  }

  const query = `UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`;
  db.run(query, [name, phone, email || null, address || null, id], function(err) {
    if (err) {
      console.error('Error updating customer:', err.message);
      return res.status(500).json({ error: err.message });
    }
    // Sync updated customer details to Supabase
    queueCustomerChange(id, 'update');

    res.json({ message: 'Customer updated successfully.' });
  });
});

// DELETE customer
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    // Delete customer ledger items
    db.run(`DELETE FROM customer_ledger WHERE customer_id = ?`, [id], (err) => {
      if (err) {
        console.error('Error deleting ledger entries:', err.message);
      }
    });

    // Delete customer
    db.run(`DELETE FROM customers WHERE id = ?`, [id], function(err) {
      if (err) {
        console.error('Error deleting customer:', err.message);
        return res.status(500).json({ error: err.message });
      }
      // Sync deleted customer from Supabase
      queueCustomerChange(id, 'delete');

      res.json({ message: 'Customer account deleted successfully.' });
    });
  });
});

// POST record new ledger entry (Debt / Payment)
router.post('/:id/ledger', (req, res) => {
  const { id } = req.params;
  const { type, amount, note } = req.body;

  if (!type || !amount) {
    return res.status(400).json({ error: 'Type and amount are required.' });
  }

  const entryAmount = parseFloat(amount);
  
  // Check if a ledger entry with this bill note already exists to prevent duplicate entries
  if (note) {
    db.get(`SELECT id FROM customer_ledger WHERE note = ?`, [note], (err, row) => {
      if (err) {
        console.error('Error checking duplicate ledger note:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (row) {
        return res.status(400).json({ error: 'This bill has already been saved/charged to this or another Khata account.' });
      }
      
      // Proceed with insertion
      insertLedgerEntry();
    });
  } else {
    insertLedgerEntry();
  }

  function insertLedgerEntry() {
    db.serialize(() => {
      // 1. Insert into ledger
      const ledgerQuery = `INSERT INTO customer_ledger (customer_id, type, amount, note) VALUES (?, ?, ?, ?)`;
      db.run(ledgerQuery, [id, type, entryAmount, note || null], function(err) {
        if (err) {
          console.error('Error creating ledger entry:', err.message);
          return res.status(500).json({ error: err.message });
        }

        // 2. Fetch current balance
        db.get(`SELECT balance, type FROM customers WHERE id = ?`, [id], (err, row) => {
          if (err || !row) {
            return res.status(500).json({ error: 'Customer not found.' });
          }

          let newBalance = row.balance;
          if (row.type === 'Company') {
            if (type === 'credit') { newBalance -= entryAmount; }
            else { newBalance += entryAmount; }
          } else {
            if (type === 'credit') { newBalance += entryAmount; }
            else { newBalance -= entryAmount; }
          }

          // 3. Update customer balance in database
          db.run(`UPDATE customers SET balance = ? WHERE id = ?`, [newBalance, id], (err) => {
            if (err) {
              console.error('Error updating customer balance:', err.message);
              return res.status(500).json({ error: err.message });
            }
            // Sync customer balance update to Supabase
            queueCustomerChange(id, 'update');

            res.json({ customer_id: id, type, amount: entryAmount, note, newBalance });
          });
        });
      });
    });
  }
});

module.exports = router;
