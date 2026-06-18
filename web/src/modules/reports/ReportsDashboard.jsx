import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, ShoppingBag, Receipt, Star,
  Calendar, ChevronDown, RefreshCw, Clock,
  CheckCircle2, XCircle, Loader2, UtensilsCrossed,
  ArrowUpRight, Trophy, FileText, X, Search, DollarSign, Wallet, Briefcase
} from 'lucide-react';

import { API_BASE } from '../../config';

// ─── Import Sub-components ───────────────────────────────────────────────────
import StatCard from './StatCard';
import BarChart from './BarChart';
import StatusBadge from './StatusBadge';
import DrilldownModal from './DrilldownModal';

const REPORTS_API = `${API_BASE}/reports`;

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtRs  = (n) => `Rs. ${Math.round(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => new Date(d + (d.includes('Z') ? '' : 'Z')).toLocaleString('en-PK', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
});

// ─── Custom Responsive SVG Charts ──────────────────────────────────────────────
const AreaChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: '#a1a1aa', fontSize: 12, textAlign: 'center', padding: 20 }}>No Data</div>;
  const max = Math.max(...data.map(d => d.revenue), 1);
  const width = 500;
  const height = 150;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 40) + 20;
    const y = height - ((d.revenue / max) * (height - 45) + 20);
    return { x, y, ...d };
  });

  const pathD = points.length > 0 ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') : '';
  const fillD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z` : '';

  return (
    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f1f5f9', padding: '16px 12px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <line x1="10" y1={height * 0.3} x2={width - 10} y2={height * 0.3} stroke="#f1f5f9" strokeDasharray="4" />
        <line x1="10" y1={height * 0.6} x2={width - 10} y2={height * 0.6} stroke="#f1f5f9" strokeDasharray="4" />
        {fillD && <path d={fillD} fill="url(#areaGrad)" />}
        {pathD && <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#8b5cf6" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#7c3aed">
              {p.revenue > 0 ? `${(p.revenue / 1000).toFixed(1)}k` : '0'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ChannelPieChart = ({ dining, delivery, takeaway }) => {
  const total = dining + delivery + takeaway;
  if (total === 0) return <div style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center', padding: 20 }}>No channel distribution yet</div>;

  const diningPct = (dining / total) * 100;
  const deliveryPct = (delivery / total) * 100;
  const takeawayPct = (takeaway / total) * 100;

  const circ = 251.2;
  const diningStroke = (diningPct / 100) * circ;
  const deliveryStroke = (deliveryPct / 100) * circ;
  const takeawayStroke = (takeawayPct / 100) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', padding: '10px 0' }}>
      <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible', flexShrink: 0 }}>
        {diningStroke > 0 && (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" strokeWidth="15"
            strokeDasharray={`${diningStroke} ${circ}`} strokeDashoffset={0} />
        )}
        {deliveryStroke > 0 && (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" strokeWidth="15"
            strokeDasharray={`${deliveryStroke} ${circ}`} strokeDashoffset={-diningStroke} />
        )}
        {takeawayStroke > 0 && (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#84cc16" strokeWidth="15"
            strokeDasharray={`${takeawayStroke} ${circ}`} strokeDashoffset={-(diningStroke + deliveryStroke)} />
        )}
        <circle cx="50" cy="50" r="28" fill="#fff" />
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#3f3f46' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: '#ec4899', display: 'inline-block' }} />
          Dining: {diningPct.toFixed(0)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#3f3f46' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: '#06b6d4', display: 'inline-block' }} />
          Delivery: {deliveryPct.toFixed(0)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#3f3f46' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: '#84cc16', display: 'inline-block' }} />
          Takeaway: {takeawayPct.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

const ExpenseDoughnut = ({ salaries, vendors }) => {
  const total = salaries + vendors;
  if (total === 0) return <div style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center', padding: 20 }}>No expenses recorded yet</div>;

  const salPct = (salaries / total) * 100;
  const venPct = (vendors / total) * 100;

  const circ = 251.2;
  const salStroke = (salPct / 100) * circ;
  const venStroke = (venPct / 100) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', padding: '10px 0' }}>
      <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', overflow: 'visible', flexShrink: 0 }}>
        {salStroke > 0 && (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="15"
            strokeDasharray={`${salStroke} ${circ}`} strokeDashoffset={0} />
        )}
        {venStroke > 0 && (
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ea580c" strokeWidth="15"
            strokeDasharray={`${venStroke} ${circ}`} strokeDashoffset={-salStroke} />
        )}
        <circle cx="50" cy="50" r="28" fill="#fff" />
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#3f3f46' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: '#ef4444', display: 'inline-block' }} />
          Salaries: {salPct.toFixed(0)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#3f3f46' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: '#ea580c', display: 'inline-block' }} />
          Vendors: {venPct.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReportsDashboard = () => {
  const [tab, setTab]           = useState('dashboard'); // 'dashboard' | 'orders' | 'topItems'
  const [globalGstRate, setGlobalGstRate] = useState(0);
  const [todaySummary, setTodaySummary] = useState(null);
  const [weekly, setWeekly]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Expanded financial drill-downs states
  const [allCompletedOrders, setAllCompletedOrders] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [drilldownModal, setDrilldownModal] = useState(null);
  const [drilldownSearch, setDrilldownSearch] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadGstSetting = async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.global_gst_rate !== undefined) {
            setGlobalGstRate(parseFloat(data.global_gst_rate));
          }
        }
      } catch (e) {
        const gst = parseFloat(localStorage.getItem('zaiqa_mahal_global_gst_rate') || 0);
        setGlobalGstRate(gst);
      }
    };
    loadGstSetting();
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, weekRes, topRes, allOrdersRes, expensesRes] = await Promise.all([
        fetch(`${REPORTS_API}/summary/today`),
        fetch(`${REPORTS_API}/summary/weekly`),
        fetch(`${REPORTS_API}/top-items`),
        fetch(`${REPORTS_API}/orders?status=completed&limit=5000`),
        fetch(`${API_BASE}/expenses`)
      ]);
      
      if (sumRes.ok) setTodaySummary(await sumRes.json());
      if (weekRes.ok) setWeekly(await weekRes.json());
      if (topRes.ok) setTopItems(await topRes.json());
      if (allOrdersRes.ok) setAllCompletedOrders(await allOrdersRes.json());
      if (expensesRes.ok) setAllExpenses(await expensesRes.json());
    } catch (err) {
      console.error("Error loading reports data:", err);
    }
    setLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${REPORTS_API}/orders?limit=200`;
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

  // Helper to calculate diff of days
  const getDaysAgo = (dateStr) => {
    if (!dateStr) return 999;
    const today = new Date();
    today.setHours(0,0,0,0);
    const cleanDateStr = dateStr.replace(' ', 'T').split('.')[0];
    const target = new Date(cleanDateStr);
    target.setHours(0,0,0,0);
    const diffTime = today.getTime() - target.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // ─── AGGREGATED METRICS FOR CARDS ──────────────────────────────────────────
  const metrics = useMemo(() => {
    // 1. Sales by Period
    const salesToday = allCompletedOrders.filter(o => getDaysAgo(o.created_at) === 0);
    const salesWeek = allCompletedOrders.filter(o => getDaysAgo(o.created_at) >= 0 && getDaysAgo(o.created_at) < 7);
    const salesMonth = allCompletedOrders.filter(o => getDaysAgo(o.created_at) >= 0 && getDaysAgo(o.created_at) < 30);
    const sales3Month = allCompletedOrders.filter(o => getDaysAgo(o.created_at) >= 0 && getDaysAgo(o.created_at) < 90);

    const sumTotal = (arr) => arr.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // 2. Sales by Order Type
    const isDelivery = (o) => o.area === 'Delivery' || o.table_number?.toString().toLowerCase().includes('delivery');
    const isTakeaway = (o) => o.table_number?.toString().toLowerCase().includes('takeaway') || o.table_number?.toString().toLowerCase().includes('take away');
    const isDining = (o) => !isDelivery(o) && !isTakeaway(o);

    const salesDining = allCompletedOrders.filter(isDining);
    const salesDelivery = allCompletedOrders.filter(isDelivery);
    const salesTakeaway = allCompletedOrders.filter(isTakeaway);

    // 3. Service Charges
    const serviceChargeRecords = [];
    let totalServiceCharges = 0;
    allCompletedOrders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          const nameLower = item.item_name?.toLowerCase() || '';
          if (nameLower.includes('service charge') || nameLower.includes('service charges') || nameLower.includes('service fee')) {
            const amt = (item.price || 0) * (item.quantity || 1);
            totalServiceCharges += amt;
            serviceChargeRecords.push({
              id: o.id,
              date: o.created_at,
              customer_name: o.customer_name || `Table ${o.table_number}`,
              item_name: item.item_name,
              amount: amt
            });
          }
        });
      }
    });

    // 4. Expenses (Salaries vs Vendors)
    const isSalary = (e) => ['salary', 'salaries', 'staff salary', 'employee salary'].includes(e.category?.toLowerCase() || '');
    const salaryExpenses = allExpenses.filter(isSalary);
    const vendorExpenses = allExpenses.filter(e => !isSalary(e));

    const totalExpenseAmt = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalSalaryAmt = salaryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalVendorAmt = vendorExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      salesToday: { label: 'Daily Sales (Today)', value: sumTotal(salesToday), records: salesToday, type: 'orders' },
      salesWeek: { label: 'Weekly Sales (7 Days)', value: sumTotal(salesWeek), records: salesWeek, type: 'orders' },
      salesMonth: { label: 'Monthly Sales (30 Days)', value: sumTotal(salesMonth), records: salesMonth, type: 'orders' },
      sales3Month: { label: '3-Month Sales (90 Days)', value: sumTotal(sales3Month), records: sales3Month, type: 'orders' },
      salesDining: { label: 'Dining Sales', value: sumTotal(salesDining), records: salesDining, type: 'orders' },
      salesDelivery: { label: 'Delivery Sales', value: sumTotal(salesDelivery), records: salesDelivery, type: 'orders' },
      salesTakeaway: { label: 'Takeaway Sales', value: sumTotal(salesTakeaway), records: salesTakeaway, type: 'orders' },
      serviceCharges: { label: 'Total Service Charges', value: totalServiceCharges, records: serviceChargeRecords, type: 'service_charges' },
      salaries: { label: 'Staff Salaries', value: totalSalaryAmt, records: salaryExpenses, type: 'expenses' },
      vendorExpenses: { label: 'Vendor Expenses', value: totalVendorAmt, records: vendorExpenses, type: 'expenses' },
      totalExpenses: { label: 'Total Expenses', value: totalExpenseAmt, records: allExpenses, type: 'expenses' }
    };
  }, [allCompletedOrders, allExpenses]);

  // Filter records in open modal
  const filteredModalRecords = useMemo(() => {
    if (!drilldownModal) return [];
    const search = drilldownSearch.toLowerCase().trim();
    if (!search) return drilldownModal.records;

    return drilldownModal.records.filter(r => {
      if (drilldownModal.type === 'orders') {
        return (
          r.id?.toString().includes(search) ||
          r.customer_name?.toLowerCase().includes(search) ||
          r.table_number?.toString().toLowerCase().includes(search) ||
          r.area?.toLowerCase().includes(search) ||
          (r.total_amount && r.total_amount.toString().includes(search))
        );
      } else if (drilldownModal.type === 'expenses') {
        return (
          r.category?.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search) ||
          (r.amount && r.amount.toString().includes(search))
        );
      } else if (drilldownModal.type === 'service_charges') {
        return (
          r.id?.toString().includes(search) ||
          r.customer_name?.toLowerCase().includes(search) ||
          r.item_name?.toLowerCase().includes(search) ||
          (r.amount && r.amount.toString().includes(search))
        );
      }
      return false;
    });
  }, [drilldownModal, drilldownSearch]);

  const modalSumTotal = useMemo(() => {
    if (drilldownModal?.type === 'orders') {
      return filteredModalRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    }
    return filteredModalRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredModalRecords, drilldownModal]);

  const printOverallDailyReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleString('en-PK', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const todayDateFormatted = new Date().toLocaleDateString('en-PK', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    const salesToday = allCompletedOrders.filter(o => getDaysAgo(o.created_at) === 0);
    const todayExpenses = allExpenses.filter(e => {
      const dVal = e.created_at || e.date;
      return getDaysAgo(dVal) === 0;
    });

    const totalRevenue = todaySummary?.total_revenue || 0;
    const totalOrders = todaySummary?.total_orders || 0;
    const totalTax = todaySummary?.total_tax || 0;
    const subtotal = todaySummary?.subtotal || 0;
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netRevenue = totalRevenue - totalExpenses;

    let totalServiceCharges = 0;
    salesToday.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          const nameLower = item.item_name?.toLowerCase() || '';
          if (nameLower.includes('service charge') || nameLower.includes('service charges') || nameLower.includes('service fee')) {
            totalServiceCharges += (item.price || 0) * (item.quantity || 1);
          }
        });
      }
    });

    const orderRowsHtml = salesToday.map((r, i) => {
      const isDelivery = r.area === 'Delivery' || r.table_number?.toString().toLowerCase().includes('delivery');
      const isTakeaway = r.table_number?.toString().toLowerCase().includes('takeaway') || r.table_number?.toString().toLowerCase().includes('take away');
      const typeLabel = isDelivery ? 'Delivery' : isTakeaway ? 'Takeaway' : 'Dining';

      let orderSC = 0;
      if (r.items && Array.isArray(r.items)) {
        r.items.forEach(item => {
          const nameLower = item.item_name?.toLowerCase() || '';
          if (nameLower.includes('service charge') || nameLower.includes('service charges') || nameLower.includes('service fee')) {
            orderSC += (item.price || 0) * (item.quantity || 1);
          }
        });
      }

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${new Date(r.created_at + (r.created_at.includes('Z') ? '' : 'Z')).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
          <td><strong>#Invoice ${r.id}</strong></td>
          <td>${r.customer_name || 'Guest'} (${typeLabel})</td>
          <td>${r.payment_method?.toUpperCase() || 'CASH'}</td>
          <td class="amount">${fmtRs(r.subtotal)}</td>
          <td class="amount">${fmtRs(r.tax)}</td>
          <td class="amount">${fmtRs(orderSC)}</td>
          <td class="amount">${fmtRs(r.total_amount)}</td>
        </tr>
      `;
    }).join('');

    const expenseRowsHtml = todayExpenses.map((r, i) => {
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${r.category}</td>
          <td>${r.description || 'No description'}</td>
          <td class="amount" style="color: #ef4444;">${fmtRs(r.amount)}</td>
        </tr>
      `;
    }).join('');

    // Generate Weekly Sales Trend Chart HTML for Print
    const weeklyFullData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = weekly.find(w => w.date === key);
      weeklyFullData.push({ date: key, orders: found?.orders || 0, revenue: found?.revenue || 0 });
    }
    const maxRev = Math.max(...weeklyFullData.map(d => d.revenue), 1);
    const chartBarsHtml = weeklyFullData.map(d => {
      const dayLabel = new Date(d.date).toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit' });
      const barHeight = Math.max((d.revenue / maxRev) * 100, d.revenue > 0 ? 5 : 2);
      const valText = d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue > 0 ? d.revenue : '0';
      return `
        <div class="print-bar-container">
          <div class="print-bar-val">${d.revenue > 0 ? `Rs. ${valText}` : ''}</div>
          <div class="print-bar" style="height: ${barHeight}px;"></div>
          <div class="print-bar-label">${dayLabel}</div>
          <div class="print-bar-sub">${d.orders} orders</div>
        </div>
      `;
    }).join('');

    // Print calculations for today's visual charts
    const diningToday = salesToday.filter(o => !o.table_number?.toString().toLowerCase().includes('delivery') && !o.table_number?.toString().toLowerCase().includes('takeaway') && !o.area?.toLowerCase().includes('delivery')).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const deliveryToday = salesToday.filter(o => o.area === 'Delivery' || o.table_number?.toString().toLowerCase().includes('delivery')).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const takeawayToday = salesToday.filter(o => o.table_number?.toString().toLowerCase().includes('takeaway') || o.table_number?.toString().toLowerCase().includes('take away')).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalSalesToday = diningToday + deliveryToday + takeawayToday;

    const salToday = todayExpenses.filter(e => ['salary', 'salaries', 'staff salary', 'employee salary'].includes(e.category?.toLowerCase() || '')).reduce((sum, e) => sum + (e.amount || 0), 0);
    const vendToday = todayExpenses.filter(e => !['salary', 'salaries', 'staff salary', 'employee salary'].includes(e.category?.toLowerCase() || '')).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpToday = salToday + vendToday;

    const circVal = 251.2;
    const dinStroke = totalSalesToday > 0 ? (diningToday / totalSalesToday) * circVal : 0;
    const delStroke = totalSalesToday > 0 ? (deliveryToday / totalSalesToday) * circVal : 0;
    const takStroke = totalSalesToday > 0 ? (takeawayToday / totalSalesToday) * circVal : 0;
    
    const salStroke = totalExpToday > 0 ? (salToday / totalExpToday) * circVal : 0;
    const venStroke = totalExpToday > 0 ? (vendToday / totalExpToday) * circVal : 0;

    const dinPct = totalSalesToday > 0 ? Math.round((diningToday / totalSalesToday) * 100) : 0;
    const delPct = totalSalesToday > 0 ? Math.round((deliveryToday / totalSalesToday) * 100) : 0;
    const takPct = totalSalesToday > 0 ? Math.round((takeawayToday / totalSalesToday) * 100) : 0;

    const salPct = totalExpToday > 0 ? Math.round((salToday / totalExpToday) * 100) : 0;
    const venPct = totalExpToday > 0 ? Math.round((vendToday / totalExpToday) * 100) : 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Financial Summary - Zaiqah Restaurant</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
            .brand-section { display: flex; align-items: center; gap: 15px; }
            .logo { height: 60px; width: 60px; border-radius: 12px; object-fit: cover; border: 1.5px solid #ea580c; }
            .logo-title { font-size: 26px; font-weight: 950; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 13px; color: #64748b; font-weight: 700; margin-top: 4px; }
            .title-block { text-align: right; }
            .report-title { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0; }
            .filter-info { font-size: 13px; color: #475569; margin-top: 6px; font-weight: 700; }
            
            /* Stats Grid */
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 15px; background: #f8fafc; }
            .stat-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .stat-value { font-size: 20px; font-weight: 950; color: #0f172a; margin-top: 5px; }
            
            .section-title { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; }
            th { background: #f1f5f9; color: #475569; padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; }
            td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .amount { text-align: right; font-weight: 800; color: #0f172a; }
            
            /* Weekly Trend Chart Styles */
            .print-chart-container { display: flex; align-items: flex-end; justify-content: space-around; height: 140px; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 25px 15px 15px; background: #f8fafc; margin-bottom: 25px; }
            .print-bar-container { display: flex; flex-direction: column; align-items: center; width: 12%; }
            .print-bar { width: 100%; background: linear-gradient(to top, #ea580c, #f97316); border-radius: 6px 6px 0 0; min-height: 2px; }
            .print-bar-val { font-size: 8px; font-weight: 800; color: #ea580c; margin-bottom: 4px; text-align: center; }
            .print-bar-label { font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 6px; text-align: center; }
            .print-bar-sub { font-size: 8px; color: #64748b; font-weight: 600; text-align: center; margin-top: 2px; }

            /* Side-by-side charts */
            .print-charts-row { display: flex; gap: 20px; margin-bottom: 25px; }
            .print-chart-box { flex: 1; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 15px; background: #f8fafc; }
            .print-chart-title-sub { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
            .print-pie-flex { display: flex; align-items: center; gap: 15px; }
            .print-chart-legend { display: flex; flex-direction: column; gap: 4px; font-size: 10px; font-weight: 700; color: #1e293b; }
            .legend-color { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }

            .no-data { text-align: center; color: #94a3b8; font-size: 12px; padding: 20px 0; }
            .footer { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
            .print-meta { font-size: 11px; color: #94a3b8; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-section">
              <img src="./Logo.jpg" class="logo" alt="Logo" />
              <div>
                <div class="logo-title">Zaiqah Restaurant</div>
                <div class="subtitle">Daily Overall Ledger</div>
              </div>
            </div>
            <div class="title-block">
              <div class="report-title">Daily Financial Report</div>
              <div class="filter-info">${todayDateFormatted}</div>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Daily Revenue</div>
              <div class="stat-value" style="color: #8b5cf6;">${fmtRs(totalRevenue)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Daily Orders</div>
              <div class="stat-value" style="color: #f97316;">${totalOrders} Completed</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Subtotal (Pre-Tax)</div>
              <div class="stat-value" style="color: #3b82f6;">${fmtRs(subtotal)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Tax (${globalGstRate}% GST)</div>
              <div class="stat-value" style="color: #10b981;">${fmtRs(totalTax)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Service Charges</div>
              <div class="stat-value" style="color: #0ea5e9;">${fmtRs(totalServiceCharges)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Daily Expenses</div>
              <div class="stat-value" style="color: #ef4444;">${fmtRs(totalExpenses)}</div>
            </div>
            <div class="stat-card" style="grid-column: span 2; background: #f0fdf4;">
              <div class="stat-label">Net Daily Income</div>
              <div class="stat-value" style="color: #22c55e;">${fmtRs(netRevenue)}</div>
            </div>
          </div>

          <div class="section-title">Last 7 Days Sales Trend</div>
          <div class="print-chart-container">
            ${chartBarsHtml}
          </div>

          <div class="print-charts-row">
            <div class="print-chart-box">
              <div class="print-chart-title-sub">Today's Sales Channels</div>
              <div class="print-pie-flex">
                <svg width="80" height="80" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                  ${dinStroke > 0 ? `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#ec4899" stroke-width="15" stroke-dasharray="${dinStroke} ${circVal}" stroke-dashoffset="0" />` : ''}
                  ${delStroke > 0 ? `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" stroke-width="15" stroke-dasharray="${delStroke} ${circVal}" stroke-dashoffset="-${dinStroke}" />` : ''}
                  ${takStroke > 0 ? `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#84cc16" stroke-width="15" stroke-dasharray="${takStroke} ${circVal}" stroke-dashoffset="-${dinStroke + delStroke}" />` : ''}
                  <circle cx="50" cy="50" r="28" fill="#fff" />
                </svg>
                <div class="print-chart-legend">
                  <div><span class="legend-color" style="background: #ec4899;"></span> Dining: ${dinPct}%</div>
                  <div><span class="legend-color" style="background: #06b6d4;"></span> Delivery: ${delPct}%</div>
                  <div><span class="legend-color" style="background: #84cc16;"></span> Takeaway: ${takPct}%</div>
                </div>
              </div>
            </div>
            
            <div class="print-chart-box">
              <div class="print-chart-title-sub">Today's Expense Division</div>
              <div class="print-pie-flex">
                <svg width="80" height="80" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                  ${salStroke > 0 ? `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" stroke-width="15" stroke-dasharray="${salStroke} ${circVal}" stroke-dashoffset="0" />` : ''}
                  ${venStroke > 0 ? `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#ea580c" stroke-width="15" stroke-dasharray="${venStroke} ${circVal}" stroke-dashoffset="-${salStroke}" />` : ''}
                  <circle cx="50" cy="50" r="28" fill="#fff" />
                </svg>
                <div class="print-chart-legend">
                  <div><span class="legend-color" style="background: #ef4444;"></span> Salaries: ${salPct}%</div>
                  <div><span class="legend-color" style="background: #ea580c;"></span> Vendors: ${venPct}%</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="section-title">Today's Order Invoices</div>
          ${salesToday.length === 0 ? `
            <div class="no-data">No orders completed today yet.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">S#</th>
                  <th>Time</th>
                  <th>Invoice ID</th>
                  <th>Customer (Type)</th>
                  <th>Payment Method</th>
                  <th style="text-align: right;">Subtotal</th>
                  <th style="text-align: right;">Tax</th>
                  <th style="text-align: right;">Service Charges</th>
                  <th style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${orderRowsHtml}
              </tbody>
            </table>
          `}
          
          <div class="section-title">Today's Expenses Log</div>
          ${todayExpenses.length === 0 ? `
            <div class="no-data">No expenses recorded today.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">S#</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${expenseRowsHtml}
              </tbody>
            </table>
          `}
          
          <div class="footer">
            <div>
              <div class="print-meta">Generated on: ${dateStr}</div>
              <div class="print-meta" style="margin-top: 4px;">Zaiqah Restaurant Financial System</div>
            </div>
            <div style="text-align: right; font-size: 12px; font-weight: 700; color: #475569;">
              Authorized Signature: ______________________
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (drilldownModal) {
    return (
      <DrilldownModal 
        drilldownModal={drilldownModal}
        filteredModalRecords={filteredModalRecords}
        drilldownSearch={drilldownSearch}
        setDrilldownSearch={setDrilldownSearch}
        setDrilldownModal={setDrilldownModal}
        modalSumTotal={modalSumTotal}
      />
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden', fontFamily: 'inherit', position: 'relative' }}>
      
      {/* Background watermark logo */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(./Logo.jpg)`,
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

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={printOverallDailyReport}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '8px 14px', 
              borderRadius: 10, 
              border: 'none', 
              background: '#ef4444', 
              fontSize: 13, 
              fontWeight: 800, 
              color: '#fff', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239,68,68,0.2)',
              transition: 'all 0.2s'
            }}>
            <FileText size={14} /> Export Daily PDF
          </button>
          
          <button onClick={tab === 'orders' ? fetchOrders : fetchDashboard}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 13, fontWeight: 700, color: '#3f3f46', cursor: 'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
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
                onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesToday); }}
                icon={<TrendingUp />} label="Aaj ki Kamai"
                value={fmtRs(todaySummary?.total_revenue)}
                sub="Completed orders"
                color="#8b5cf6" bg="#f5f3ff"
              />
              <StatCard
                onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesToday); }}
                icon={<ShoppingBag />} label="Aaj ke Orders"
                value={todaySummary?.total_orders || 0}
                sub="Mukammal orders"
                color="#f97316" bg="#fff7ed"
              />
              <StatCard
                onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesToday); }}
                icon={<Receipt />} label="Aaj ka Tax"
                value={fmtRs(todaySummary?.total_tax)}
                sub={`${globalGstRate}% GST`}
                color="#0ea5e9" bg="#f0f9ff"
              />
              <StatCard
                onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesToday); }}
                icon={<ArrowUpRight />} label="Subtotal"
                value={fmtRs(todaySummary?.total_subtotal)}
                sub="Tax se pehle"
                color="#10b981" bg="#f0fdf4"
              />
            </div>

            {/* Financial Drill-down Reports */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#09090b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="#f97316" /> Financial Drill-down Reports (Click to View Record details)
              </h3>
              
              {/* Sales Period Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
                <StatCard 
                  onClick={() => { setDrilldownSearch(''); setDrilldownModal({ label: 'Sales Report', records: allCompletedOrders, type: 'orders' }); }}
                  icon={<TrendingUp />} label="Total Sales Report" value={fmtRs(allCompletedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0))}
                  sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#8b5cf6' }}>Open Interactive Sales Ledger →</span>}
                  color="#8b5cf6" bg="#f5f3ff"
                />
                <div style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1.5px solid #f4f4f5', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#09090b', marginBottom: 12 }}>7-Day Revenue Trend (Area Chart)</div>
                  <AreaChart data={weeklyFull} />
                </div>
              </div>

              {/* Order Channels & Service Charges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesDining); }}
                    icon={<UtensilsCrossed />} label="Dining Sales" value={fmtRs(metrics.salesDining.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#ec4899' }}>View Dining Orders →</span>}
                    color="#ec4899" bg="#fdf2f8"
                  />
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesDelivery); }}
                    icon={<ShoppingBag />} label="Delivery Sales" value={fmtRs(metrics.salesDelivery.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#06b6d4' }}>View Delivery Orders →</span>}
                    color="#06b6d4" bg="#ecfeff"
                  />
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salesTakeaway); }}
                    icon={<ArrowUpRight />} label="Takeaway Sales" value={fmtRs(metrics.salesTakeaway.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#84cc16' }}>View Takeaway Orders →</span>}
                    color="#84cc16" bg="#f7fee7"
                  />
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.serviceCharges); }}
                    icon={<Receipt />} label="Service Charges" value={fmtRs(metrics.serviceCharges.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#6366f1' }}>View Service Ledger →</span>}
                    color="#6366f1" bg="#e0e7ff"
                  />
                </div>
                <div style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1.5px solid #f4f4f5', boxShadow: '0 2px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#09090b', marginBottom: 12 }}>Sales Distribution Channels (Pie/Doughnut Chart)</div>
                  <ChannelPieChart 
                    dining={metrics.salesDining.value}
                    delivery={metrics.salesDelivery.value}
                    takeaway={metrics.salesTakeaway.value}
                  />
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.salaries); }}
                    icon={<Briefcase />} label="Staff Salaries" value={fmtRs(metrics.salaries.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#ef4444' }}>View Salary Payroll →</span>}
                    color="#ef4444" bg="#fef2f2"
                  />
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.vendorExpenses); }}
                    icon={<Wallet />} label="Vendor Expenses" value={fmtRs(metrics.vendorExpenses.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#ea580c' }}>View Vendor Records →</span>}
                    color="#ea580c" bg="#fff7ed"
                  />
                  <StatCard 
                    onClick={() => { setDrilldownSearch(''); setDrilldownModal(metrics.totalExpenses); }}
                    icon={<FileText />} label="Total Expenses" value={fmtRs(metrics.totalExpenses.value)}
                    sub={<span style={{ textDecoration: 'underline', fontWeight: 600, color: '#71717a' }}>View Expense Book →</span>}
                    color="#71717a" bg="#f4f4f5"
                  />
                </div>
                <div style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1.5px solid #f4f4f5', boxShadow: '0 2px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#09090b', marginBottom: 12 }}>Expense Allocation (Doughnut Chart)</div>
                  <ExpenseDoughnut 
                    salaries={metrics.salaries.value}
                    vendors={metrics.vendorExpenses.value}
                  />
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1.5px solid #f4f4f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#09090b' }}>7-Day Sales Trend</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600 }}>Revenue & orders per day</div>
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
