import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, Trash2, RotateCcw, Eye, X, RefreshCw,
  ChevronDown, Filter, Receipt, AlertCircle, Loader2, Check,
  Calendar, Table2, User, ShoppingBag, ArrowLeft
} from 'lucide-react';
import { API_BASE } from '../../config';

const API = `${API_BASE}/orders`;

const STATUS_COLORS = {
  pending:   { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
  preparing: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  ready:     { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  completed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  cancelled: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  returned:  { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
};

const Badge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
};

const OrdersHistory = ({ currentUser, onViewReceipt }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'trash'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'trash'|'restore'|'delete', order }
  const [acting, setActing] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === 'trash'
        ? `${API}/all?include_trash=true`
        : `${API}/all`;
      const res = await fetch(url);
      const data = await res.json();
      if (tab === 'trash') {
        setOrders(data.filter(o => o.deleted_at));
      } else {
        setOrders(data.filter(o => !o.deleted_at));
      }
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      String(o.id).includes(search) ||
      (o.table_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.area || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const doAction = async () => {
    if (!confirmModal) return;
    setActing(true);
    const { type, order } = confirmModal;
    try {
      if (type === 'trash') {
        await fetch(`${API}/${order.id}/trash`, { method: 'PATCH' });
      } else if (type === 'restore') {
        await fetch(`${API}/${order.id}/restore`, { method: 'PATCH' });
      } else if (type === 'delete') {
        await fetch(`${API}/${order.id}`, { method: 'DELETE' });
      }
      setConfirmModal(null);
      setSelectedOrder(null);
      fetchOrders();
    } catch (e) {
      alert('Action failed: ' + e.message);
    }
    setActing(false);
  };

  const totalRevenue = filtered
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden', position: 'relative' }}>

      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 24px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#09090b' }}>Orders History</h2>
            <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
              {filtered.length} orders · Rs. {totalRevenue.toLocaleString()} revenue
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#f4f4f5', borderRadius: 12, padding: 4 }}>
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'trash', label: '🗑 Trash', adminOnly: true },
          ].filter(t => !t.adminOnly || isAdmin).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '6px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#09090b' : '#71717a',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, table, customer..."
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #e4e4e7', borderRadius: 10, fontSize: 13, fontWeight: 600, width: 210, background: '#fafafa', outline: 'none' }}
            />
          </div>
          {tab === 'all' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e4e4e7', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#fafafa', outline: 'none' }}>
              <option value="all">All Status</option>
              {['pending','preparing','ready','completed','cancelled','returned'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          )}
          <button onClick={fetchOrders} style={{ padding: '8px 14px', border: '1.5px solid #e4e4e7', borderRadius: 10, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#71717a' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#a1a1aa' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontWeight: 700 }}>Loading orders...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a1a1aa' }}>
            <ClipboardList size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#3f3f46', marginBottom: 8 }}>
              {tab === 'trash' ? 'Trash is empty' : 'No orders found'}
            </div>
            <div style={{ fontSize: 14 }}>{search ? 'Try a different search' : tab === 'trash' ? 'Deleted orders will appear here' : 'Orders will appear here when placed'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(order => (
              <div key={order.id} style={{
                background: '#fff', borderRadius: 16, padding: '14px 18px',
                border: `1.5px solid ${order.deleted_at ? '#fecaca' : '#f4f4f5'}`,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                opacity: order.deleted_at ? 0.75 : 1,
              }}>
                {/* Order ID */}
                <div style={{ minWidth: 60 }}>
                  <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Order</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#09090b' }}>#{order.id}</div>
                </div>

                {/* Table / Customer */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <Table2 size={12} color="#a1a1aa" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#09090b' }}>
                      Table {order.table_number}
                      {order.area && order.area !== 'Main' ? ` · ${order.area}` : ''}
                    </span>
                  </div>
                  {order.customer_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={11} color="#a1a1aa" />
                      <span style={{ fontSize: 12, color: '#71717a', fontWeight: 600 }}>{order.customer_name}</span>
                    </div>
                  )}
                </div>

                {/* Items count */}
                <div style={{ minWidth: 60, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 700 }}>Items</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#3f3f46' }}>{(order.items || []).length}</div>
                </div>

                {/* Amount */}
                <div style={{ minWidth: 90, textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#ea580c' }}>Rs. {(order.total_amount || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>
                    {new Date(order.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Status */}
                <div>
                  {order.deleted_at
                    ? <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>🗑 Trashed</span>
                    : <Badge status={order.status} />
                  }
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {/* Receipt Preview */}
                  {!order.deleted_at && order.status === 'completed' && (
                    <button
                      onClick={() => setSelectedOrder(order)}
                      title="View Receipt"
                      style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                      <Receipt size={14} />
                    </button>
                  )}

                  {/* View Details */}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    title="View Details"
                    style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <Eye size={14} />
                  </button>

                  {/* Trash or Restore */}
                  {isAdmin && (
                    order.deleted_at ? (
                      <>
                        <button
                          onClick={() => setConfirmModal({ type: 'restore', order })}
                          title="Restore"
                          style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmModal({ type: 'delete', order })}
                          title="Delete Forever"
                          style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmModal({ type: 'trash', order })}
                        title="Move to Trash"
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#09090b' }}>Order #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: '#f4f4f5', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Table', value: `${selectedOrder.table_number} · ${selectedOrder.area || 'Main'}` },
                  { label: 'Status', value: <Badge status={selectedOrder.status} /> },
                  { label: 'Customer', value: selectedOrder.customer_name || 'Walk-in' },
                  { label: 'Date', value: new Date(selectedOrder.created_at).toLocaleString('en-PK') },
                  { label: 'Subtotal', value: `Rs. ${(selectedOrder.subtotal || 0).toLocaleString()}` },
                  { label: 'Tax', value: `Rs. ${(selectedOrder.tax || 0).toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8f9fc', borderRadius: 12, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#09090b' }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, color: '#09090b', fontSize: 16 }}>Total</span>
                <span style={{ fontWeight: 900, color: '#ea580c', fontSize: 22 }}>Rs. {(selectedOrder.total_amount || 0).toLocaleString()}</span>
              </div>

              {/* Items List */}
              {(selectedOrder.items || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Items ({selectedOrder.items.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8f9fc', borderRadius: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#09090b' }}>{item.item_name}</div>
                          {item.notes && <div style={{ fontSize: 11, color: '#a1a1aa' }}>{item.notes}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#ea580c' }}>Rs. {(item.price * item.quantity).toLocaleString()}</div>
                          <div style={{ fontSize: 11, color: '#a1a1aa' }}>×{item.quantity} @ Rs. {item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.remarks && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef9c3', borderRadius: 12, fontSize: 13, color: '#854d0e', fontWeight: 600 }}>
                  📝 {selectedOrder.remarks}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f4f4f5', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => setSelectedOrder(null)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>
                Close
              </button>
              {isAdmin && !selectedOrder.deleted_at && (
                <button onClick={() => { setConfirmModal({ type: 'trash', order: selectedOrder }); setSelectedOrder(null); }}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#fef2f2', fontSize: 14, fontWeight: 700, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Trash2 size={14} /> Move to Trash
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Action Modal ── */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: confirmModal.type === 'restore' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {confirmModal.type === 'restore'
                  ? <RotateCcw size={28} color="#16a34a" />
                  : <AlertCircle size={28} color="#ef4444" />}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#09090b', marginBottom: 8 }}>
                {confirmModal.type === 'trash' && 'Move to Trash?'}
                {confirmModal.type === 'restore' && 'Restore Order?'}
                {confirmModal.type === 'delete' && 'Delete Permanently?'}
              </div>
              <div style={{ fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
                {confirmModal.type === 'trash' && `Order #${confirmModal.order.id} will be moved to trash. You can restore it later.`}
                {confirmModal.type === 'restore' && `Order #${confirmModal.order.id} will be restored to active orders.`}
                {confirmModal.type === 'delete' && `Order #${confirmModal.order.id} will be permanently deleted. This cannot be undone.`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} disabled={acting}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={doAction} disabled={acting}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: confirmModal.type === 'restore' ? '#16a34a' : '#ef4444', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {acting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {confirmModal.type === 'trash' && 'Move to Trash'}
                {confirmModal.type === 'restore' && 'Restore'}
                {confirmModal.type === 'delete' && 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OrdersHistory;
