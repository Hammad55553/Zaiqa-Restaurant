// Sync Queue Helper
// This module manages logging of database mutations into a local SQLite 'sync_queue' table.
// Background workers scan this queue and push mutations to Supabase.

const { db } = require('./db');

// After this many attempts a task is parked as 'dead' and no longer auto-retried.
const MAX_ATTEMPTS = 20;

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
    // Pick up brand-new tasks (pending) AND previously failed tasks whose
    // backoff window has elapsed. Tasks parked as 'dead' are excluded.
    db.all(
      `SELECT * FROM sync_queue
         WHERE status = 'pending'
            OR (status = 'failed'
                AND attempts < ?
                AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP))
         ORDER BY created_at ASC
         LIMIT ?`,
      [MAX_ATTEMPTS, limit],
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
    // Read current attempts to compute exponential backoff and cap.
    db.get(`SELECT attempts FROM sync_queue WHERE id = ?`, [id], (getErr, row) => {
      if (getErr) return reject(getErr);
      const attempts = ((row && row.attempts) || 0) + 1;

      // Exponential backoff capped at 5 minutes: 10s, 20s, 40s ... max 300s.
      const backoffSec = Math.min(300, 10 * Math.pow(2, attempts - 1));

      // After MAX_ATTEMPTS, park the task as 'dead' so it stops retrying
      // (but is still visible in the queue for manual inspection).
      const newStatus = attempts >= MAX_ATTEMPTS ? 'dead' : 'failed';

      db.run(
        `UPDATE sync_queue
            SET attempts = ?,
                status = ?,
                last_error = ?,
                next_retry_at = datetime(CURRENT_TIMESTAMP, '+' || ? || ' seconds')
          WHERE id = ?`,
        [attempts, newStatus, (errorMsg || '').slice(0, 500), backoffSec, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}

/**
 * Reset all failed/dead tasks back to pending for an immediate retry.
 * Useful after fixing a config problem (e.g. wrong Supabase key).
 * @returns {Promise<number>} number of tasks reset
 */
function resetAllFailed() {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE sync_queue
          SET status = 'pending', attempts = 0, next_retry_at = NULL
        WHERE status IN ('failed', 'dead')`,
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

module.exports = {
  addToQueue,
  getPendingTasks,
  markAsSynced,
  markAsFailed,
  resetAllFailed,
  MAX_ATTEMPTS
};
