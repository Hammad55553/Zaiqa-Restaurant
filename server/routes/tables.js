const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueTableChange } = require('../services/syncHelper');

// @route   GET /api/tables
// @desc    Get all tables
router.get('/', (req, res) => {
  db.all(`SELECT * FROM tables ORDER BY area, table_number`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // In POS layout, id is 'id', number is 'table_number', seats is 'seats', area is 'area', status is 'status'
    // To maintain compatibility with POS, let's map them
    const tables = rows.map(r => ({
      ...r,
      number: r.table_number
    }));
    res.json(tables);
  });
});

// @route   POST /api/tables
// @desc    Create a new table
router.post('/', (req, res) => {
  const { table_number, area, seats } = req.body;
  
  if (!table_number || !area) {
    return res.status(400).json({ error: 'Table number and area are required' });
  }

  db.run(
    `INSERT INTO tables (table_number, area, seats, status) VALUES (?, ?, ?, ?)`,
    [table_number, area, seats || 4, 'available'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Table number already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      // Sync new table to Supabase
      queueTableChange(this.lastID, 'insert');

      res.status(201).json({ id: this.lastID, number: table_number, area, seats: seats || 4, status: 'available' });
    }
  );
});

// @route   PATCH /api/tables/:id
// @desc    Update a table
router.patch('/:id', (req, res) => {
  const { table_number, area, seats, status } = req.body;
  const id = req.params.id;

  // Build dynamic query
  const fields = [];
  const values = [];

  if (table_number) { fields.push('table_number = ?'); values.push(table_number); }
  if (area) { fields.push('area = ?'); values.push(area); }
  if (seats !== undefined) { fields.push('seats = ?'); values.push(seats); }
  if (status) { fields.push('status = ?'); values.push(status); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(id);

  db.run(
    `UPDATE tables SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // Sync updated table details/status to Supabase
      queueTableChange(id, 'update');
      res.json({ success: true });
    }
  );
});

// @route   DELETE /api/tables/:id
// @desc    Delete a table
router.delete('/:id', (req, res) => {
  db.run(`DELETE FROM tables WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    // Sync deleted table from Supabase
    queueTableChange(req.params.id, 'delete');
    res.json({ success: true });
  });
});

module.exports = router;
