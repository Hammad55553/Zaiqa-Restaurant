// Sync Queue Helper
// This module manages logging of database mutations into a local SQLite 'sync_queue' table.
// Background workers scan this queue and push mutations to Supabase.

const { db } = require('./db');

/**
 * Add a record change to the local sync queue.
 * @param {string} tableName - Name of the SQLite table (e.g. 'orders', 'expenses')
 * @param {string|number} recordId - Primary key value of the mutated record
 * @param {string} action - 'insert' | 'update' | 'delete'
 * @param {object} payload - The record data
 */
function addToQueue(tableName, recordId, action, payload) {
  const query = `
    INSERT INTO sync_queue (table_name, record_id, action, payload, status)
    VALUES (?, ?, ?, ?, 'pending')
  `;
  const payloadStr = JSON.stringify(payload);
  
  db.run(query, [tableName, recordId.toString(), action, payloadStr], (err) => {
    if (err) {
      console.error('❌ Failed to add mutation to sync_queue:', err.message);
    } else {
      console.log(`📡 Queued '${action}' for ${tableName} (ID: ${recordId})`);
    }
  });
}

/**
 * Fetch pending sync tasks.
 * @param {number} limit - Maximum tasks to fetch
 * @returns {Promise<Array>}
 */
function getPendingTasks(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

/**
 * Remove a sync task from the queue upon successful sync.
 * @param {number} id - The task ID
 */
function markAsSynced(id) {
  return new Promise((resolve, reject) => {
    // We delete successfully synced items to keep local db light
    db.run(`DELETE FROM sync_queue WHERE id = ?`, [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Mark a sync task as failed and increment attempts.
 * @param {number} id - The task ID
 * @param {string} errorMsg - Reason for failure
 */
function markAsFailed(id, errorMsg) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE sync_queue SET attempts = attempts + 1, status = 'failed' WHERE id = ?`,
      [id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  addToQueue,
  getPendingTasks,
  markAsSynced,
  markAsFailed
};
