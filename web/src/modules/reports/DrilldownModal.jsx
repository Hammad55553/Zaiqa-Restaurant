import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, FileText } from 'lucide-react';

const fmtRs = (n) => `Rs. ${Math.round(n || 0).toLocaleString('en-PK')}`;
const fmtDateDrilldown = (d) => new Date(d + (d.includes('Z') ? '' : 'Z')).toLocaleString('en-PK', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
});

// Helper to calculate diff of days
const getDaysAgo = (dateStr) => {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cleanDateStr = dateStr.replace(' ', 'T').split('.')[0];
  const target = new Date(cleanDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - target.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const DrilldownModal = ({ drilldownModal, drilldownSearch, setDrilldownSearch, setDrilldownModal }) => {
  const [period, setPeriod] = useState('all'); // 'today', 'week', 'month', 'quarter', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!drilldownModal) return null;

  // Process filters inside component
  const filteredRecords = useMemo(() => {
    const search = drilldownSearch.toLowerCase().trim();

    return drilldownModal.records.filter(r => {
      // 1. Period filter
      const dateVal = r.created_at || r.date;
      if (period !== 'all' && dateVal) {
        const daysAgo = getDaysAgo(dateVal);
        if (period === 'today' && daysAgo !== 0) return false;
        if (period === 'week' && (daysAgo < 0 || daysAgo >= 7)) return false;
        if (period === 'month' && (daysAgo < 0 || daysAgo >= 30)) return false;
        if (period === 'quarter' && (daysAgo < 0 || daysAgo >= 90)) return false;
        if (period === 'custom') {
          const cleanDate = dateVal.replace(' ', 'T').split('.')[0];
          const recordTime = new Date(cleanDate).getTime();
          if (startDate) {
            const startTime = new Date(startDate + 'T00:00:00').getTime();
            if (recordTime < startTime) return false;
          }
          if (endDate) {
            const endTime = new Date(endDate + 'T23:59:59').getTime();
            if (recordTime > endTime) return false;
          }
        }
      }

      // 2. Search query filter
      if (!search) return true;

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
  }, [drilldownModal, drilldownSearch, period, startDate, endDate]);

  const sumTotal = useMemo(() => {
    if (drilldownModal.type === 'orders') {
      return filteredRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    }
    return filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredRecords, drilldownModal]);

  // Handle PDF/Print Export
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleString('en-PK', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const rowsHtml = filteredRecords.map((r, i) => {
      const dateVal = r.created_at || r.date;
      const refVal = drilldownModal.type === 'orders' ? `#Invoice ${r.id}` : 
                     drilldownModal.type === 'service_charges' ? `#Order ${r.id}` : 
                     `#Exp ${r.id}`;
      const detailVal = drilldownModal.type === 'orders' ? `${r.customer_name || 'Guest'} (${r.area || 'Main'} - ${r.table_number || ''})` :
                        drilldownModal.type === 'service_charges' ? `${r.customer_name || 'Guest'} - ${r.item_name}` :
                        `${r.category} - ${r.description || 'No description'}`;
      const amountVal = drilldownModal.type === 'orders' ? r.total_amount : r.amount;

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${fmtDateDrilldown(dateVal)}</td>
          <td><strong>${refVal}</strong></td>
          <td>${detailVal}</td>
          <td class="amount">${fmtRs(amountVal)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${drilldownModal.label} - Zaiqah Restaurant</title>
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
            table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
            th { background: #f8fafc; color: #475569; padding: 12px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            tr:last-child td { border-bottom: none; }
            .amount { text-align: right; font-weight: 800; color: #0f172a; }
            .footer { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 13px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .total-amount { font-size: 24px; font-weight: 950; color: #ea580c; margin-top: 4px; }
            .print-meta { font-size: 11px; color: #94a3b8; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-section">
              <img src="./Logo.jpg" class="logo" alt="Logo" />
              <div>
                <div class="logo-title">Zaiqah Restaurant</div>
                <div class="subtitle">Financial Report Ledger</div>
              </div>
            </div>
            <div class="title-block">
              <div class="report-title">${drilldownModal.label} Records</div>
              <div class="filter-info">Filter Period: ${period.toUpperCase()} ${period === 'custom' ? `(${startDate} to ${endDate})` : ''}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">S#</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Details / Category</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <div class="print-meta">Generated on: ${dateStr}</div>
              <div class="print-meta" style="margin-top: 4px;">Total records printed: ${filteredRecords.length}</div>
            </div>
            <div style="text-align: right;">
              <span class="total-label">Total Grand Sum</span>
              <div class="total-amount">${fmtRs(sumTotal)}</div>
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

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#f8f9fc',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Full-screen Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setDrilldownModal(null)}
            style={{
              background: '#8b5cf6',
              border: 'none',
              borderRadius: 12,
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="./Logo.jpg" alt="Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #ea580c' }} />
            <div>
              <h4 style={{ fontSize: 20, fontWeight: 955, color: '#09090b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {drilldownModal.label} Records
              </h4>
              <p style={{ fontSize: 12, color: '#71717a', margin: '2px 0 0 0', fontWeight: 600 }}>
                Showing {filteredRecords.length} of {drilldownModal.records.length} total entries
              </p>
            </div>
          </div>

          <button 
            onClick={exportToPDF}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: 12,
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
              transition: 'all 0.2s',
              marginLeft: 'auto'
            }}
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>

        {/* Period Selector Bar */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fafafa', padding: '12px 24px', borderBottom: '1px solid #f4f4f5', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filter Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: 13,
              fontWeight: 700,
              color: '#09090b',
              background: '#fff',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Records</option>
            <option value="today">Today (Daily)</option>
            <option value="week">Last 7 Days (Weekly)</option>
            <option value="month">Last 30 Days (Monthly)</option>
            <option value="quarter">Last 90 Days (3-Monthly)</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease-out' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#09090b', background: '#fff', outline: 'none' }}
              />
              <span style={{ fontSize: 13, color: '#71717a', fontWeight: 700 }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#09090b', background: '#fff', outline: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ padding: '16px 24px', background: '#ffffff', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="#a1a1aa" />
          <input
            type="text"
            placeholder="Search records by reference, customer details, category, or amount..."
            value={drilldownSearch}
            onChange={(e) => setDrilldownSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: '#09090b'
            }}
          />
          {drilldownSearch && (
            <button
              onClick={() => setDrilldownSearch('')}
              style={{ background: 'none', border: 'none', color: '#ea580c', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Records Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a1a1aa' }}>
              <Search size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
              <div style={{ fontWeight: 800, fontSize: 16, color: '#27272a' }}>No matching records found</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Try changing date filter or searching for another query</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f4f4f5' }}>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reference</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>Details / Category</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, i) => {
                  const dateVal = r.created_at || r.date;
                  const refVal = drilldownModal.type === 'orders' ? `#Invoice ${r.id}` :
                    drilldownModal.type === 'service_charges' ? `#Order ${r.id}` :
                      `#Exp ${r.id}`;
                  const detailVal = drilldownModal.type === 'orders' ? `${r.customer_name || 'Guest'} (${r.area || 'Main'} - ${r.table_number || ''})` :
                    drilldownModal.type === 'service_charges' ? `${r.customer_name || 'Guest'} - ${r.item_name}` :
                      `${r.category} - ${r.description || 'No description'}`;
                  const amountVal = drilldownModal.type === 'orders' ? r.total_amount : r.amount;

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f4f4f5', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#3f3f46', fontWeight: 600 }}>{fmtDateDrilldown(dateVal)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#09090b', fontWeight: 800 }}>{refVal}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#71717a', fontWeight: 500 }}>{detailVal}</td>
                      <td style={{ padding: '14px 16px', fontSize: 14, color: '#09090b', fontWeight: 900, textAlign: 'right' }}>{fmtRs(amountVal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Full-screen Footer / Sum Total */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1.5px solid #f4f4f5',
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 }}>
            Total calculated sum
          </div>
          <div style={{ fontSize: 26, fontWeight: 950, color: '#ea580c' }}>
            {fmtRs(sumTotal)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrilldownModal;
