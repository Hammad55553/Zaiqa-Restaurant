import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock, Database, ChevronRight, Activity } from 'lucide-react';
import { API_BASE } from '../../config';

export default function SyncQueueViewer() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ pending: 0, processing: 0, failed: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/sync`),
        fetch(`${API_BASE}/sync/stats`)
      ]);
      if (qRes.ok) setQueue(await qRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/sync/${id}/retry`, { method: 'POST' });
      if (res.ok) fetchQueue();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE}/sync/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedItem?.id === id) setSelectedItem(null);
        fetchQueue();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearCompleted = async () => {
    if (!window.confirm('Clear all completed tasks?')) return;
    try {
      const res = await fetch(`${API_BASE}/sync?status=completed`, { method: 'DELETE' });
      if (res.ok) fetchQueue();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-50 border-green-200';
      case 'failed': return 'text-red-500 bg-red-50 border-red-200';
      case 'processing': return 'text-blue-500 bg-blue-50 border-blue-200';
      default: return 'text-orange-500 bg-orange-50 border-orange-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} />;
      case 'failed': return <AlertCircle size={16} />;
      case 'processing': return <RefreshCw size={16} className="animate-spin" />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Left List Pane */}
      <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <Database className="text-orange-500" />
                Sync Queue
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Background synchronization monitor</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchQueue()}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-xl font-black text-orange-700">{stats.pending || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Processing</p>
              <p className="text-xl font-black text-blue-700">{stats.processing || 0}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">Failed</p>
              <p className="text-xl font-black text-red-700">{stats.failed || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-1">Completed</p>
                <p className="text-xl font-black text-green-700">{stats.completed || 0}</p>
              </div>
              {stats.completed > 0 && (
                <button onClick={handleClearCompleted} className="text-[9px] font-bold text-red-500 uppercase mt-2 text-left hover:underline">
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Activity size={48} className="mb-4 opacity-50" />
              <p className="font-bold">Queue is empty</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {queue.map(item => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedItem?.id === item.id ? 'border-orange-500 bg-orange-50/50 shadow-md ring-1 ring-orange-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">
                        {item.action}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {item.table_name.toUpperCase()} <span className="text-slate-400">#{item.record_id}</span>
                      </p>
                      {item.status === 'failed' && (
                        <p className="text-xs font-semibold text-red-500 mt-1">Attempts: {item.attempts}</p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Details Pane */}
      <div className="w-1/2 bg-slate-50 flex flex-col">
        {selectedItem ? (
          <div className="h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase">Task Details</h3>
                <p className="text-sm text-slate-500 font-bold">ID: {selectedItem.id}</p>
              </div>
              <div className="flex gap-2">
                {selectedItem.status === 'failed' && (
                  <button 
                    onClick={() => handleRetry(selectedItem.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition-colors shadow-sm"
                  >
                    <RefreshCw size={14} /> Retry
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(selectedItem.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-xs transition-colors border border-red-200"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Metadata</h4>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Table</p>
                  <p className="text-sm font-bold text-slate-800">{selectedItem.table_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Action</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{selectedItem.action}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Created</p>
                  <p className="text-sm font-bold text-slate-800">{new Date(selectedItem.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Attempts</p>
                  <p className="text-sm font-bold text-slate-800">{selectedItem.attempts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex-1 flex flex-col">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Payload</h4>
              <div className="flex-1 bg-slate-900 rounded-lg p-4 overflow-auto custom-scrollbar relative group">
                <pre className="text-xs font-mono text-green-400">
                  {JSON.stringify(selectedItem.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <Database size={64} className="mb-4 text-slate-300" />
            <p className="text-lg font-black text-slate-500">Select a task</p>
            <p className="text-sm font-medium mt-2">Click on any sync queue item to view its details</p>
          </div>
        )}
      </div>
    </div>
  );
}
