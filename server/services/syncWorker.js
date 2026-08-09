// Supabase Sync Worker
// This service runs in the background and replicates SQLite mutations to Supabase.

const { supabase } = require('../config/supabase');
const { getPendingTasks, markAsSynced, markAsFailed, resetAllFailed } = require('../database/syncQueue');

let isSyncing = false;
let checkInterval = null;

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
 * Scans local queue and attempts to sync to Supabase.
 * getPendingTasks() returns both new (pending) tasks and previously failed
 * tasks whose exponential-backoff window has elapsed, so retries — including
 * after the network comes back — happen automatically here.
 */
async function processQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const tasks = await getPendingTasks(50); // Process up to 50 at a time
    if (tasks.length === 0) {
      isSyncing = false;
      return;
    }

    console.log(`🔄 Found ${tasks.length} mutation(s) to sync to Supabase...`);

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
        // If the network is down, stop the rest of this batch — no point
        // hammering. The task stays retryable and the backoff schedule set by
        // markAsFailed decides when it's attempted again.
        const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('ENOTFOUND') ||
          errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('ECONNREFUSED') || errorMsg.includes('network');
        if (isNetworkError) {
          console.log('📴 Network appears offline. Pausing this batch; will retry automatically.');
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

/**
 * Force every failed/dead task back into the queue and sync immediately.
 * Call this after fixing a config problem (e.g. correcting the Supabase key).
 */
async function retryAllNow() {
  const count = await resetAllFailed();
  console.log(`🔁 Reset ${count} failed/dead task(s) to pending. Syncing now...`);
  await processQueue();
  return count;
}

module.exports = {
  startSyncWorker,
  stopSyncWorker,
  triggerSyncNow: processQueue,
  retryAllNow
};
