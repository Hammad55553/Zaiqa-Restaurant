import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingBag, Receipt, Star,
  Calendar, ChevronDown, RefreshCw, Clock,
  CheckCircle2, XCircle, Loader2, UtensilsCrossed,
  ArrowUpRight, Trophy, FileText
} from 'lucide-react';

import { API_BASE } from '../../config';

const API = `${API_BASE}/reports`;

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtRs  = (n) => `Rs. ${Math.round(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => new Date(d + (d.includes('Z') ? '' : 'Z')).toLocaleString('en-PK', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
});
const fmtDay  = (d) => new Date(d).toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short' });

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = '#f97316', bg = '#fff7ed' }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1.5px solid #f4f4f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 52, height: 52, borderRadius: 16, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {React.cloneElement(icon, { size: 24, color })}
    </div>
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#09090b', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center', padding: 20 }}>Koi data nahi</div>;
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#f97316' }}>
            {d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ''}
          </div>
          <div style={{ width: '100%', background: 'linear-gradient(to top, #f97316, #fbbf24)', borderRadius: '6px 6px 0 0', height: `${Math.max((d.revenue / max) * 90, d.revenue > 0 ? 8 : 2)}px`, minHeight: 2, transition: 'height 0.4s ease' }} />
          <div style={{ fontSize: 9, color: '#a1a1aa', fontWeight: 600, textAlign: 'center' }}>{fmtDay(d.date)}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    completed: { bg: '#f0fdf4', color: '#15803d', label: 'Mukammal' },
    pending:   { bg: '#fff7ed', color: '#c2410c', label: 'Pending' },
    preparing: { bg: '#fefce8', color: '#a16207', label: 'Ban raha' },
    ready:     { bg: '#eff6ff', color: '#1d4ed8', label: 'Tayar' },
  };
  const s = map[status] || { bg: '#f4f4f5', color: '#71717a', label: status };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReportsDashboard = () => {
  const [tab, setTab]           = useState('dashboard'); // 'dashboard' | 'orders' | 'topItems'
  const [todaySummary, setTodaySummary] = useState(null);
  const [weekly, setWeekly]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, weekRes, topRes] = await Promise.all([
        fetch(`${API}/summary/today`),
        fetch(`${API}/summary/weekly`),
        fetch(`${API}/top-items`),
      ]);
      setTodaySummary(await sumRes.json());
      setWeekly(await weekRes.json());
      setTopItems(await topRes.json());
    } catch { /* server offline */ }
    setLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/orders?limit=200`;
      if (filterDate)   url += `&date=${filterDate}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await fetch(url);
      setOrders(await res.json());
    } catch { setOrders([]); }
    setLoading(false);
  }, [filterDate, filterStatus]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (tab === 'orders') fetchOrders(); }, [tab, fetchOrders]);

  // Fill missing days in weekly data
  const weeklyFull = (() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = weekly.find(w => w.date === key);
      result.push({ date: key, orders: found?.orders || 0, revenue: found?.revenue || 0 });
    }
    return result;
  })();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden', fontFamily: 'inherit', position: 'relative' }}>
      
      {/* Background watermark logo */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(/src/assets/Logo.jpg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.03,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* ── Top Bar ── */}
      <div style={{ background: '#fff', padding: '16px 24px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
            <TrendingUp size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#09090b' }}>Owner's Dashboard</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Today's Revenue</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#f4f4f5', borderRadius: 12, padding: 4 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={14} /> },
            { id: 'orders',    label: 'Orders',    icon: <Receipt size={14} /> },
            { id: 'topItems',  label: 'Top Items', icon: <Trophy size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#09090b' : '#71717a',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <button onClick={tab === 'orders' ? fetchOrders : fetchDashboard}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 13, fontWeight: 700, color: '#3f3f46', cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#a1a1aa' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontWeight: 700 }}>Loading...</span>
          </div>
        )}

        {/* ─── DASHBOARD TAB ─── */}
        {!loading && tab === 'dashboard' && (
          <div>
            {/* Today Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Calendar size={16} color="#a1a1aa" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#71717a' }}>
                Aaj: {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard
                icon={<TrendingUp />} label="Aaj ki Kamai"
                value={fmtRs(todaySummary?.total_revenue)}
                sub="Completed orders"
                color="#8b5cf6" bg="#f5f3ff"
              />
              <StatCard
                icon={<ShoppingBag />} label="Aaj ke Orders"
                value={todaySummary?.total_orders || 0}
                sub="Mukammal orders"
                color="#f97316" bg="#fff7ed"
              />
              <StatCard
                icon={<Receipt />} label="Aaj ka Tax"
                value={fmtRs(todaySummary?.total_tax)}
                sub="16% GST"
                color="#0ea5e9" bg="#f0f9ff"
              />
              <StatCard
                icon={<ArrowUpRight />} label="Subtotal"
                value={fmtRs(todaySummary?.total_subtotal)}
                sub="Tax se pehle"
                color="#10b981" bg="#f0fdf4"
              />
            </div>

            {/* Weekly Chart */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1.5px solid #f4f4f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#09090b' }}>Top Selling Items</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600 }}>Highest revenue generating items</div>
              </div>
              <BarChart data={weeklyFull} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '12px 0 0', borderTop: '1px solid #f4f4f5' }}>
                {weeklyFull.map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#09090b' }}>{d.orders}</div>
                    <div style={{ fontSize: 9, color: '#a1a1aa' }}>orders</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick note */}
            <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: 16, padding: '16px 20px', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={20} color="#7c3aed" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#4c1d95' }}>To view complete order history</div>
                <div style={{ fontSize: 12, color: '#6d28d9', marginTop: 2 }}>Click the "Orders" tab above to filter by date or status</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ORDERS TAB ─── */}
        {!loading && tab === 'orders' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <input
                type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                max={today}
                style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 13, fontWeight: 600, color: '#09090b', background: '#fff', outline: 'none', cursor: 'pointer' }}
              />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 13, fontWeight: 600, color: '#09090b', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
              </select>
              <button onClick={() => { setFilterDate(''); setFilterStatus(''); }}
                style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 13, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>
                Reset
              </button>
              <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#71717a', display: 'flex', alignItems: 'center' }}>
                {orders.length} orders found
              </div>
            </div>

            {orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#a1a1aa' }}>
                <ShoppingBag size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontWeight: 700 }}>Koi order nahi mila</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map(order => (
                <div key={order.id} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #f4f4f5', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  {/* Order row */}
                  <div
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 900, color: '#3f3f46' }}>
                      #{order.id}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#09090b' }}>
                          {order.customer_name || `Table ${order.table_number}`}
                        </span>
                        {order.area && <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>{order.area}</span>}
                        <StatusBadge status={order.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#71717a' }}>
                        <Clock size={11} />
                        {fmtDate(order.created_at)}
                        {order.items && <span>· {order.items.length} items</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#ea580c' }}>{fmtRs(order.total_amount)}</div>
                      <div style={{ fontSize: 11, color: '#a1a1aa' }}>+ {fmtRs(order.tax)} tax</div>
                    </div>
                    <ChevronDown size={16} color="#a1a1aa" style={{ transform: expandedOrder === order.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {/* Expanded items */}
                  {expandedOrder === order.id && order.items && (
                    <div style={{ borderTop: '1px solid #f4f4f5', padding: '12px 18px', background: '#fafafa' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Items</div>
                      {order.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < order.items.length - 1 ? '1px dashed #e4e4e7' : 'none', fontSize: 13 }}>
                          <span style={{ color: '#3f3f46', fontWeight: 600 }}>{item.quantity}x {item.item_name}</span>
                          <span style={{ fontWeight: 700, color: '#09090b' }}>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #e4e4e7' }}>
                        <span style={{ fontSize: 12, color: '#71717a' }}>Subtotal: {fmtRs(order.subtotal)} · Tax: {fmtRs(order.tax)}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#ea580c' }}>Total: {fmtRs(order.total_amount)}</span>
                      </div>
                      {order.remarks && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>Note: {order.remarks}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TOP ITEMS TAB ─── */}
        {!loading && tab === 'topItems' && (
          <div>
            <div style={{ fontSize: 13, color: '#71717a', fontWeight: 600, marginBottom: 20 }}>
              Sabse zyada bikne wale items (completed orders se)
            </div>
            {topItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#a1a1aa' }}>
                <UtensilsCrossed size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontWeight: 700 }}>Koi data nahi abhi</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topItems.map((item, i) => {
                  const maxQty = topItems[0]?.total_qty || 1;
                  return (
                    <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', border: '1.5px solid #f4f4f5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? '#fef9c3' : i === 1 ? '#f4f4f5' : i === 2 ? '#fef3c7' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: i === 0 ? '#ca8a04' : '#71717a', flexShrink: 0 }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#09090b', marginBottom: 4 }}>Order Items</div>
                          <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                            {item.total_qty} dafa bika · {fmtRs(item.total_revenue)} total
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: '#f97316' }}>{item.total_qty}</div>
                          <div style={{ fontSize: 10, color: '#a1a1aa' }}>orders</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 6, background: '#f4f4f5', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(item.total_qty / maxQty) * 100}%`, background: 'linear-gradient(to right, #f97316, #fbbf24)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ReportsDashboard;
