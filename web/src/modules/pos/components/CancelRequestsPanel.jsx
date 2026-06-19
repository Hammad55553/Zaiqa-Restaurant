import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle2, XCircle, Clock, User, ShoppingBag, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE } from '../../../config';

const STATUS_COLOR = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};

const ORDER_STATUS_LABEL = {
  pending: { label: 'Pending', color: 'text-slate-500' },
  preparing: { label: 'Preparing', color: 'text-amber-600' },
  ready: { label: 'Ready', color: 'text-emerald-600' },
  cancelled: { label: 'Cancelled', color: 'text-red-500' },
  completed: { label: 'Completed', color: 'text-blue-600' },
};

const CancelRequestsPanel = ({ onClose, currentUser }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveModalReq, setApproveModalReq] = useState(null);
  const [approveRemark, setApproveRemark] = useState('');
  const [toast, setToast] = useState(null);
  const [processing, setProcessing] = useState(null);

  const role = currentUser?.role || 'cashier';
  const username = currentUser?.username || 'Staff';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/cancel-requests`);
      if (res.ok) setRequests(await res.json());
    } catch (e) {
      console.error('Failed to fetch cancel requests', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleApprove = (req) => {
    // Permission check on client side too
    if ((req.order_status === 'ready' || req.order_status === 'completed') && role !== 'admin') {
      showToast('Only admin can approve cancellation of ready/completed orders', 'error');
      return;
    }
    setApproveRemark('');
    setApproveModalReq(req);
  };

  const submitApproval = async () => {
    if (!approveModalReq) return;
    if (!approveRemark.trim()) {
      showToast('Remarks are required to approve cancellation!', 'error');
      return;
    }

    const wasStarted = ['preparing', 'ready', 'completed'].includes(approveModalReq.order_status);
    setProcessing(approveModalReq.id);
    try {
      const res = await fetch(`${API_BASE}/orders/cancel-requests/${approveModalReq.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolved_by: username,
          resolved_role: role,
          refund_raw: wasStarted,
          log_waste: wasStarted,
          resolve_remark: approveRemark.trim()
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Order #${approveModalReq.order_id} cancelled. ${wasStarted ? 'Stock refunded.' : ''}`, 'success');
        setApproveModalReq(null);
        setApproveRemark('');
        fetchRequests();
      } else {
        showToast(data.error || 'Failed to approve', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalReq) return;
    setProcessing(rejectModalReq.id);
    try {
      const res = await fetch(`${API_BASE}/orders/cancel-requests/${rejectModalReq.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved_by: username, reject_reason: rejectReason || 'Rejected by staff' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cancel request rejected', 'success');
        setRejectModalReq(null);
        setRejectReason('');
        fetchRequests();
      } else {
        showToast(data.error || 'Failed to reject', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const canApprove = (req) => {
    if (req.order_status === 'preparing' || req.order_status === 'ready' || req.order_status === 'completed') return role === 'admin';
    return role === 'cashier' || role === 'admin';
  };

  const filtered = requests.filter(r => r.status === activeTab);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const tabBtn = (id, label, count) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${activeTab === id
          ? 'bg-zinc-900 text-white shadow-lg'
          : 'text-zinc-500 hover:bg-zinc-100'
        }`}
    >
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${activeTab === id ? 'bg-white text-zinc-900' : 'bg-amber-100 text-amber-700'}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-zinc-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">Cancel Requests</h2>
              <p className="text-xs text-zinc-500">{pendingCount} pending approval</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRequests} className="p-2 hover:bg-amber-100 rounded-lg transition-all text-amber-600">
              <RefreshCw size={14} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-all text-zinc-500">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 pb-2">
          {tabBtn('pending', 'Pending', pendingCount)}
          {tabBtn('approved', 'Approved', 0)}
          {tabBtn('rejected', 'Rejected', 0)}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <CheckCircle2 size={36} className="mb-3 text-zinc-300" />
              <p className="text-sm font-medium">No {activeTab} cancel requests</p>
            </div>
          ) : filtered.map(req => {
            const sc = STATUS_COLOR[req.status] || STATUS_COLOR.pending;
            const osl = ORDER_STATUS_LABEL[req.order_status] || { label: req.order_status, color: 'text-zinc-500' };
            const isExpanded = expandedId === req.id;
            const timeAgo = (() => {
              const diff = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 60000);
              if (diff < 1) return 'Just now';
              if (diff < 60) return `${diff}m ago`;
              return `${Math.floor(diff / 60)}h ago`;
            })();
            const needsAdmin = req.order_status === 'preparing' || req.order_status === 'ready' || req.order_status === 'completed';

            return (
              <div key={req.id} className={`rounded-xl border ${sc.border} ${sc.bg} overflow-hidden`}>
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1 ${sc.dot}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-900">Order #{req.order_id}</span>
                          <span className="text-xs font-bold text-zinc-500">•</span>
                          <span className={`text-xs font-bold ${osl.color}`}>{osl.label}</span>
                          {needsAdmin && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">Admin Only</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500 flex items-center gap-1"><User size={10} /> {req.requester_name || req.requested_by} ({req.requested_role})</span>
                          <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock size={10} /> {timeAgo}</span>
                        </div>
                        {req.table_number && (
                          <p className="text-xs text-zinc-600 mt-0.5">Table {req.table_number} · {req.area}</p>
                        )}
                        {req.reason && (
                          <p className="text-xs italic text-zinc-500 mt-1">"{req.reason}"</p>
                        )}
                        {req.status !== 'pending' && (req.resolved_by || req.resolver_name) && (
                          <p className="text-xs text-zinc-400 mt-1">
                            {req.status === 'approved' ? '✅' : '❌'} by {req.resolver_name || req.resolved_by}
                            {req.status === 'approved' && req.resolve_remark ? ` — "${req.resolve_remark}"` : ''}
                            {req.status === 'rejected' && req.reject_reason ? ` — "${req.reject_reason}"` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {req.status === 'pending' && canApprove(req) && (
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={processing === req.id}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1 shadow-sm disabled:opacity-60"
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                      )}
                      {req.status === 'pending' && (role === 'cashier' || role === 'admin') && (
                        <button
                          onClick={() => { setRejectModalReq(req); setRejectReason(''); }}
                          disabled={processing === req.id}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1 shadow-sm disabled:opacity-60"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      )}
                      {req.status === 'rejected' && role === 'admin' && (
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={processing === req.id}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1 shadow-sm disabled:opacity-60"
                        >
                          <CheckCircle2 size={12} /> Override Approve
                        </button>
                      )}
                      {req.status === 'pending' && !canApprove(req) && role !== 'admin' && (
                        <span className="text-xs text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded-lg">Needs Admin</span>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  {req.items && req.items.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                      <ShoppingBag size={10} /> {req.items.length} item{req.items.length > 1 ? 's' : ''}
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  )}
                </div>

                {/* Items Expansion */}
                {isExpanded && req.items && req.items.length > 0 && (
                  <div className="border-t border-dashed border-zinc-200 px-4 py-3 bg-white/70">
                    <div className="space-y-1">
                      {req.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-700 font-medium">{item.item_name} × {item.quantity}</span>
                          <span className="text-zinc-500">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-100">
                      <span className="text-xs font-black text-zinc-700">Total</span>
                      <span className="text-xs font-black text-zinc-900">Rs. {Number(req.total_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-sm font-black text-zinc-900 mb-1 uppercase tracking-wider">Reject Request</h3>
            <p className="text-xs text-zinc-500 mb-4">Order #{rejectModalReq.order_id} — {rejectModalReq.requested_by}</p>
            <textarea
              className="w-full border border-zinc-200 rounded-xl p-3 text-sm text-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              rows={3}
              placeholder="Reason for rejection (optional)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModalReq(null)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-xs font-black text-zinc-600 hover:bg-zinc-50 transition-all">
                Cancel
              </button>
              <button onClick={handleReject} disabled={processing === rejectModalReq.id} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all disabled:opacity-60">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Remarks Modal */}
      {approveModalReq && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-zinc-200">
            <h3 className="text-sm font-black text-zinc-900 mb-1 uppercase tracking-wider text-emerald-600">Approve Cancellation</h3>
            <p className="text-xs text-zinc-500 mb-4">Order #{approveModalReq.order_id} — Please enter the reason for approval.</p>
            <textarea
              className="w-full border border-zinc-200 rounded-xl p-3 text-sm text-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
              rows={3}
              placeholder="Remarks / Reason for approval (Mandatory)..."
              value={approveRemark}
              onChange={e => setApproveRemark(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setApproveModalReq(null)} 
                className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-xs font-black text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={submitApproval} 
                disabled={!approveRemark.trim() || processing === approveModalReq.id} 
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-xs font-black transition-all active:scale-95"
              >
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] px-5 py-3 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-2 transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default CancelRequestsPanel;
