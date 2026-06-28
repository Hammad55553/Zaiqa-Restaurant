// Supabase Sync Worker
// This service runs in the background and replicates SQLite mutations to Supabase.

const { supabase } = require('../config/supabase');
const { getPendingTasks, markAsSynced, markAsFailed } = require('../database/syncQueue');
const { db } = require('../database/db');

let isSyncing = false;
let checkInterval = null;
let wasOffline = false; // track network state

/**
 * Start the background synchronization daemon.
 */
function startSyncWorker(intervalMs = 10000) {
  if (checkInterval) {
    console.warn('⚠️ Sync worker is already running.');
    return;
  }

  console.log(`📡 Sync worker started. Checking queue every ${intervalMs / 1000}s.`);
  checkInterval = setInterval(processQueue, intervalMs);
  processQueue(); // run once immediately on startup
}

function stopSyncWorker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('🛑 Sync worker stopped.');
  }
}

/**
 * Reset failed tasks back to pending so they get retried.
 * Called when network comes back online.
 */
function resetFailedTasks() {
  return new Promise((resolve) => {
    db.run(
      `UPDATE sync_queue SET status = 'pending', attempts = 0 WHERE status = 'failed'`,
      function(err) {
        if (!err && this.changes > 0) {
          console.log(`🔄 Network restored — reset ${this.changes} failed tasks back to pending.`);
        }
        resolve();
      }
    );
  });
}

/**
 * Scans local queue and attempts to sync to Supabase
 */
async function processQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // If we were offline before, reset all failed tasks to retry them
    if (wasOffline) {
      await resetFailedTasks();
      wasOffline = false;
    }

    const tasks = await getPendingTasks(50); // Process up to 50 at a time
    if (tasks.length === 0) {
      isSyncing = false;
      return;
    }

    console.log(`🔄 Found ${tasks.length} pending mutations to sync to Supabase...`);

    let networkFailed = false;
    for (const task of tasks) {
      if (networkFailed) break; // stop batch if network is down

      let payload;
      try {
        payload = JSON.parse(task.payload);
      } catch (err) {
        await markAsFailed(task.id, 'Invalid JSON payload');
        continue;
      }

      let success = false;
      let errorMsg = '';

      try {
        if (task.action === 'insert' || task.action === 'update') {
          const { error } = await supabase
            .from(task.table_name)
            .upsert(payload, { onConflict: 'id' });
          if (error) throw error;
          success = true;
        } else if (task.action === 'delete') {
          const { error } = await supabase
            .from(task.table_name)
            .delete()
            .eq('id', task.record_id);
          if (error) throw error;
          success = true;
        }
      } catch (err) {
        errorMsg = err.message || 'Unknown error';
        console.warn(`⚠️ Failed to sync task ${task.id} (${task.table_name}):`, errorMsg);
      }

      if (success) {
        await markAsSynced(task.id);
        console.log(`✅ Synced task ${task.id} (${task.action} on ${task.table_name})`);
      } else {
        await markAsFailed(task.id, errorMsg);
        // Network is down — stop processing, mark as offline for retry
        const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('ENOTFOUND') ||
          errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('ECONNREFUSED') || errorMsg.includes('network');
        if (isNetworkError) {
          wasOffline = true;
          console.log('📴 Network offline. Will retry all failed tasks when connection returns.');
          networkFailed = true;
        }
      }
    }
  } catch (err) {
    console.error('❌ Error processing sync queue:', err.message);
  } finally {
    isSyncing = false;
  }
}

module.exports = {
  startSyncWorker,
  stopSyncWorker,
  triggerSyncNow: processQueue
};
