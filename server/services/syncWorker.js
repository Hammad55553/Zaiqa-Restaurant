// Supabase Sync Worker
// This service runs in the background and replicates SQLite mutations to Supabase.

const { supabase } = require('../config/supabase');
const { getPendingTasks, markAsSynced, markAsFailed } = require('../database/syncQueue');

let isSyncing = false;
let checkInterval = null;

/**
 * Start the background synchronization daemon.
 * @param {number} intervalMs - Frequency of checks (default 10 seconds)
 */
function startSyncWorker(intervalMs = 10000) {
  if (checkInterval) {
    console.warn('⚠️ Sync worker is already running.');
    return;
  }

  console.log(`📡 Sync worker started. Checking queue every ${intervalMs / 1000}s.`);
  checkInterval = setInterval(processQueue, intervalMs);
  
  // Also run once immediately on startup
  processQueue();
}

/**
 * Stop the background synchronization daemon.
 */
function stopSyncWorker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('🛑 Sync worker stopped.');
  }
}

/**
 * Scans local queue and attempts to sync to Supabase
 */
async function processQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const tasks = await getPendingTasks(15); // Process in batches of 15
    if (tasks.length === 0) {
      isSyncing = false;
      return;
    }

    console.log(`🔄 Found ${tasks.length} pending mutations to sync to Supabase...`);

    for (const task of tasks) {
      let payload;
      try {
        payload = JSON.parse(task.payload);
      } catch (err) {
        console.error(`❌ Invalid JSON payload for task ${task.id}:`, err.message);
        await markAsFailed(task.id, 'Invalid JSON payload');
        continue;
      }

      let success = false;
      let errorMsg = '';

      try {
        if (task.action === 'insert' || task.action === 'update') {
          // Perform an upsert in Supabase
          const { error } = await supabase
            .from(task.table_name)
            .upsert(payload, { onConflict: 'id' });

          if (error) throw error;
          success = true;
        } else if (task.action === 'delete') {
          // Perform a delete in Supabase
          const { error } = await supabase
            .from(task.table_name)
            .delete()
            .eq('id', task.record_id);

          if (error) throw error;
          success = true;
        }
      } catch (err) {
        errorMsg = err.message || 'Unknown network error';
        console.warn(`⚠️ Failed to sync task ${task.id} (${task.table_name}):`, errorMsg);
      }

      if (success) {
        await markAsSynced(task.id);
        console.log(`✅ Synced task ${task.id} (${task.action} on ${task.table_name})`);
      } else {
        await markAsFailed(task.id, errorMsg);
        
        // If it's a connection/network issue, we stop processing the rest of the batch
        // to prevent spamming connections when offline.
        if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ENOTFOUND')) {
          console.log('📡 Network seems offline. Pausing batch execution.');
          break;
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
