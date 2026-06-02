import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Clock, CheckCircle, ChefHat, Timer, AlertCircle, RefreshCw, History, Play, RotateCcw, TrendingUp, Trash2, Package } from 'lucide-react';
import lottie from 'lottie-web';
import foodPrepData from '../../assets/foodpre.json';
import { API_BASE } from '../../config';

// ─── Ticket Timer ──────────────────────────────────────────────────────────────
const TicketTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const start = new Date(startTime);
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = parseInt(elapsed.split(':')[0]);
  const isLate = mins >= 15;
  const isWarning = mins >= 8 && mins < 15;

  return (
    <span className={isLate ? 'text-red-500 animate-pulse font-mono' : isWarning ? 'text-amber-500 font-mono' : 'text-orange-500 font-mono'}>
      {elapsed}
    </span>
  );
};

// ─── Cooking Idle Animation ────────────────────────────────────────────────────
const CookingAnimation = () => {
  const container = useRef(null);
  useEffect(() => {
    if (!container.current) return;
    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: foodPrepData
    });
    return () => anim.destroy();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-gray-100 max-w-sm mx-auto shadow-sm">
      <div ref={container} style={{ width: 160, height: 160 }} />
      <h3 className="text-lg font-black text-gray-900 mt-4 tracking-wide">All Tickets Cleared!</h3>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 text-center leading-relaxed">
        Kitchen is idle. Ready for new inbound orders!
      </p>
    </div>
  );
};

// ─── Order Status Badge ────────────────────────────────────────────────────────
const statusConfig = {
  pending:   { bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-600',     badge: 'bg-red-500',     label: 'PENDING' },
  preparing: { bg: 'bg-orange-50',  border: 'border-orange-100',  text: 'text-orange-600',  badge: 'bg-orange-500',  label: 'PREPARING' },
  ready:     { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-500', label: 'READY' },
  completed: { bg: 'bg-gray-50',    border: 'border-gray-100',    text: 'text-gray-500',    badge: 'bg-gray-400',    label: 'COMPLETED' },
};

// ─── Order Ticket Card ─────────────────────────────────────────────────────────
const OrderTicket = ({ order, onStatusChange, onDelete, isHistory = false }) => {
  const cfg = statusConfig[order.status] || statusConfig.completed;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Order #${order.id} (Table ${order.table_number}) delete karna chahte hain?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(order.id);
      } else {
        const data = await res.json();
        alert('Delete failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error while deleting order.');
    } finally {
      setDeleting(false);
    }
  };

  // Format time relative
  const timeStr = (() => {
    try {
      const d = new Date(order.time || order.created_at);
      return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '--'; }
  })();

  return (
    <div className={`bg-white rounded-3xl border flex flex-col overflow-hidden shadow-sm transition-all duration-300 ${
      order.has_new_updates ? 'border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse' 
        : `${cfg.border} hover:border-orange-300`
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${cfg.border} ${cfg.bg} flex justify-between items-center`}>
        <div>
          <h2 className={`text-xl font-display font-black leading-none ${cfg.text}`}>Table {order.table_number}</h2>
          <p className="text-[9px] font-black uppercase tracking-widest mt-1.5 text-gray-500">
            {order.area || 'Main'} Area • ID: #{order.id}
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          {!isHistory && (
            <div className="flex items-center gap-1 font-mono text-base font-black">
              <Timer size={13} className="opacity-70" />
              <TicketTimer startTime={order.time || order.created_at} />
            </div>
          )}
          {isHistory && (
            <span className="text-xs font-bold text-gray-400">{timeStr}</span>
          )}
          <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* New Updates Banner */}
      {order.has_new_updates === 1 && (
        <div className="bg-red-600 text-white px-4 py-2.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">New Items Added!</span>
          </div>
          <button
            onClick={() => onStatusChange(order.id, order.status, true)}
            className="bg-black/20 hover:bg-black/30 text-[10px] font-black px-2.5 py-1 rounded-md transition-colors uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 p-4 space-y-2.5 bg-gray-50/20 overflow-y-auto max-h-[220px] custom-scrollbar">
        {(order.items || []).map((item, idx) => (
          <div key={idx} className="flex justify-between items-start gap-3 border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
            <div className="flex-1">
              <p className="font-extrabold text-sm text-gray-800 leading-snug">{item.item_name || item.name}</p>
              {item.notes && (
                <p className="text-[10px] font-bold text-orange-500 flex items-start gap-1 mt-1">
                  <AlertCircle size={10} className="shrink-0 mt-0.5" />
                  {item.notes}
                </p>
              )}
            </div>
            <div className="shrink-0 bg-gray-100 px-2.5 py-0.5 rounded text-sm font-black text-gray-700 border border-gray-200">
              x{item.quantity || item.qty || 1}
            </div>
          </div>
        ))}
        {(!order.items || order.items.length === 0) && (
          <p className="text-xs text-gray-400 font-bold text-center py-4">No items found</p>
        )}
      </div>

      {/* Remarks */}
      {(order.remarks || order.admin_edit_remark) && (
        <div className="px-4 py-3 bg-red-50/50 border-t border-gray-100">
          {order.remarks && (
            <div className="mb-1.5 last:mb-0">
              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <AlertCircle size={10} /> Special Remarks
              </p>
              <p className="text-xs font-bold text-red-800">{order.remarks}</p>
            </div>
          )}
          {order.admin_edit_remark && (
            <div className="mb-1.5 last:mb-0">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <AlertCircle size={10} /> Admin Edit
              </p>
              <p className="text-xs font-bold text-orange-800">{order.admin_edit_remark}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="p-4 bg-white border-t border-gray-100 mt-auto flex gap-2">
        {!isHistory && order.status === 'pending' && (
          <button
            onClick={() => onStatusChange(order.id, 'preparing', true)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/10 text-xs flex justify-center items-center gap-1.5 uppercase tracking-widest"
          >
            <Play size={14} fill="currentColor" /> Start Preparing
          </button>
        )}
        {!isHistory && order.status === 'preparing' && (
          <button
            onClick={() => onStatusChange(order.id, 'ready', true)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 text-xs flex justify-center items-center gap-1.5 uppercase tracking-widest"
          >
            <CheckCircle size={14} /> Mark as Ready
          </button>
        )}
        {!isHistory && order.status === 'ready' && (
          <button
            onClick={() => onStatusChange(order.id, 'preparing', true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-2.5 rounded-xl transition-all text-xs flex justify-center items-center gap-1.5 uppercase tracking-widest"
          >
            <RotateCcw size={14} /> Recall
          </button>
        )}
        {isHistory && (
          <button
            onClick={() => onStatusChange(order.id, 'preparing', true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-2.5 rounded-xl transition-all text-xs flex justify-center items-center gap-1.5 uppercase tracking-widest"
          >
            <RotateCcw size={14} /> Recall Ticket
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 p-3 rounded-xl transition-all disabled:opacity-50"
          title="Delete Order"
        >
          {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
};

// ─── Main KDS Component ────────────────────────────────────────────────────────
const KitchenDisplay = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Fetch active orders ──────────────────────────────────────────────────
  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/active`);
      if (res.ok) {
        const data = await res.json();
        const fixed = data.map(order => ({
          ...order,
          time: order.created_at
            ? new Date(order.created_at + (order.created_at.endsWith('Z') ? '' : 'Z')).toISOString()
            : new Date().toISOString()
        }));
        setActiveOrders(fixed);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch active orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch completed orders (history from DB) ──────────────────────────────
  const fetchCompletedOrders = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/completed?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setCompletedOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch completed orders:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveOrders]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchCompletedOrders();
    }
  }, [activeTab, fetchCompletedOrders]);

  // ── Update order status ───────────────────────────────────────────────────
  const updateStatus = async (id, newStatus, clearUpdates = false) => {
    setActiveOrders(prev => prev.map(o =>
      o.id === id ? { ...o, status: newStatus, has_new_updates: clearUpdates ? 0 : o.has_new_updates } : o
    ));
    try {
      await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, clear_updates: clearUpdates })
      });
      fetchActiveOrders();
      if (activeTab === 'history') fetchCompletedOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
      fetchActiveOrders();
    }
  };

  // ── Delete order ──────────────────────────────────────────────────────────
  const handleDeleteOrder = (deletedId) => {
    setActiveOrders(prev => prev.filter(o => o.id !== deletedId));
    setCompletedOrders(prev => prev.filter(o => o.id !== deletedId));
  };

  // ── Statistics ────────────────────────────────────────────────────────────
  const pendingCount   = activeOrders.filter(o => o.status === 'pending').length;
  const preparingCount = activeOrders.filter(o => o.status === 'preparing').length;
  const readyCount     = activeOrders.filter(o => o.status === 'ready').length;
  const totalActive    = activeOrders.length;

  const avgPrepTime = useMemo(() => {
    const readyOrders = activeOrders.filter(o => o.status === 'ready');
    if (readyOrders.length === 0) return 'N/A';
    let totalSecs = 0;
    readyOrders.forEach(o => {
      const created = new Date(o.time);
      totalSecs += Math.max(0, Math.floor((new Date() - created) / 1000));
    });
    const avgMins = (totalSecs / readyOrders.length) / 60;
    return `${avgMins.toFixed(1)} min`;
  }, [activeOrders]);

  const refreshTimeStr = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : '--';

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] text-gray-900 relative overflow-hidden">

      {/* Background watermark */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(/src/assets/Logo.jpg)`,
          backgroundSize: 'contain', backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat', opacity: 0.02,
          pointerEvents: 'none', zIndex: 0
        }}
      />

      {/* ─── KDS Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center p-5 border-b border-gray-100 bg-white shrink-0 z-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
            <ChefHat className="text-orange-500 w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-gray-900 tracking-wide">Kitchen Display System</h1>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
              Live • Last synced: {refreshTimeStr}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Pending',   count: pendingCount,   color: 'red' },
            { label: 'Preparing', count: preparingCount, color: 'orange' },
            { label: 'Ready',     count: readyCount,     color: 'emerald' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 px-4 py-2 rounded-xl text-center min-w-[76px]`}>
              <p className={`text-[9px] font-black text-${color}-500 uppercase tracking-widest`}>{label}</p>
              <p className={`text-xl font-black text-${color}-600 leading-none mt-1`}>{count}</p>
            </div>
          ))}
          <div className="bg-orange-50/50 border border-orange-100 px-4 py-2 rounded-xl text-center min-w-[88px] hidden sm:block">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1 justify-center">
              <TrendingUp size={9} /> Avg Prep
            </p>
            <p className="text-lg font-black text-orange-600 leading-none mt-1">{avgPrepTime}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-xl text-center min-w-[76px] hidden sm:block">
            <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest">Completed</p>
            <p className="text-xl font-black text-purple-600 leading-none mt-1">{completedOrders.length || '–'}</p>
          </div>
          <button
            onClick={() => { fetchActiveOrders(); if (activeTab === 'history') fetchCompletedOrders(); }}
            className="p-3 bg-white border border-gray-200 hover:bg-gray-50 transition-colors rounded-xl text-gray-500 hover:text-gray-700"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ─── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 bg-white shrink-0 z-10 px-5">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Play size={13} />
          Active Board
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
            activeTab === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {totalActive}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <History size={13} />
          Completed History
          {completedOrders.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'history' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {completedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Active Board ─────────────────────────────────────────────────────── */}
      {activeTab === 'active' && (
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar z-10">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="animate-spin text-orange-400" size={32} />
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="flex justify-center items-center h-full py-16">
              <CookingAnimation />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeOrders.map(order => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  onStatusChange={updateStatus}
                  onDelete={handleDeleteOrder}
                  isHistory={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Completed History ────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar z-10">
          {historyLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="animate-spin text-purple-400" size={32} />
            </div>
          ) : completedOrders.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Package size={36} className="text-purple-300" />
              </div>
              <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">No Completed Orders</h3>
              <p className="text-xs font-bold text-gray-400 mt-2">
                Orders marked as completed will appear here from the database.
              </p>
              <button
                onClick={fetchCompletedOrders}
                className="mt-4 px-5 py-2 bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-600 transition-colors"
              >
                Refresh History
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {completedOrders.length} Completed Orders
                </p>
                <button
                  onClick={fetchCompletedOrders}
                  className="flex items-center gap-1.5 text-xs font-black text-purple-500 hover:text-purple-700 uppercase tracking-wider"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {completedOrders.map(order => (
                  <OrderTicket
                    key={order.id}
                    order={order}
                    onStatusChange={updateStatus}
                    onDelete={handleDeleteOrder}
                    isHistory={true}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
