const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET all expenses
router.get('/', (req, res) => {
  const query = `SELECT * FROM expenses ORDER BY date DESC, id DESC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching expenses:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST new expense
router.post('/', (req, res) => {
  const { category, amount, description, date } = req.body;
  if (!category || !amount) {
    return res.status(400).json({ error: 'Category and amount are required.' });
  }

  // Use provided date or fallback to current timestamp
  const expenseDate = date || new Date().toISOString();

  const query = `INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)`;
  db.run(query, [category, amount, description, expenseDate], function(err) {
    if (err) {
      console.error('Error creating expense:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      category,
      amount,
      description,
      date: expenseDate
    });
  });
});

// DELETE expense
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM expenses WHERE id = ?`;
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting expense:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    res.json({ message: 'Expense deleted successfully.' });
  });
});

module.exports = router;
