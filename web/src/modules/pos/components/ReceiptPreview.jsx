import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Logo from '../../../assets/ziqahh.png';
import { Printer, X, ZoomIn, ZoomOut, Search, FileText, Smartphone, Calendar, Hash, Trash2 } from 'lucide-react';
import { getOfflineItem, setOfflineItem } from '../../../utils/offlineDB';

// ---------- The actual slip (80mm thermal receipt) ----------
const Slip = ({ data, isPrintMode }) => {
  if (!data) return null;
  const { items = [], subtotal = 0, tax = 0, total = 0, orderId = 'PENDING', date = new Date().toISOString(), customerPhone = 'N/A', table = 'N/A', serviceCharges } = data;

  const serviceChargesAmt = serviceCharges !== undefined
    ? Number(serviceCharges)
    : (items.find(i => i.name === 'Service Charges' || i.item_name === 'Service Charges')?.price || 0);

  const displayItems = items.filter(item => item.name !== 'Service Charges' && item.item_name !== 'Service Charges');

  const fmt = (d) => new Date(d).toLocaleString('en-PK', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div style={{
      width: '72mm',
      background: '#fff',
      color: '#000',
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: '11px',
      lineHeight: '1.55',
      padding: '5mm 4mm',
      boxSizing: 'border-box'
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        <img src={Logo} alt="Logo" style={{ width: '18mm', height: '18mm', objectFit: 'contain', display: 'block', margin: '0 auto', filter: 'grayscale(100%) contrast(400%) brightness(85%)' }} />
      </div>

      {/* Restaurant Header */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'serif', lineHeight: '1.2' }}>
          ZAIQA MAHAL
        </div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#111', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '1mm' }}>
          Restaurant & Cafe
        </div>
        <div style={{ fontSize: '9px', color: '#444', marginTop: '1.5mm', lineHeight: '1.6' }}>
          Chishtian Road, Near Ali Park<br />
          Hasilpur, Punjab, Pakistan<br />
          Ph: 0300-3910101
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />

      {/* Meta grid */}
      <div style={{ fontSize: '9.5px', marginBottom: '2mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
          <span>Bill No:</span><span style={{ fontWeight: '700' }}>{orderId}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
          <span>Date:</span><span>{fmt(date)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
          <span>Table/Type:</span>
          <span style={{ fontWeight: '700' }}>
            {table ? (typeof table === 'object' ? `${table.area || 'Dining'} - Table ${table.number}` : table) : 'Walk-in'}
          </span>
        </div>
        
        {/* Cashier Name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
          <span>Cashier:</span>
          <span style={{ fontWeight: '700' }}>
            {(() => {
              const cashierField = data.cashier;
              if (cashierField) {
                try {
                  if (typeof cashierField === 'string' && cashierField.startsWith('{')) {
                    const p = JSON.parse(cashierField);
                    return p.name || p.username || 'Staff';
                  }
                } catch(e){}
                if (typeof cashierField === 'object') {
                  return cashierField.name || cashierField.username || 'Staff';
                }
                return cashierField;
              }
              try {
                const u = localStorage.getItem('pos_current_user');
                if (u) {
                  const parsed = JSON.parse(u);
                  return parsed.name || parsed.username || 'Staff';
                }
              } catch (e) {}
              return 'Staff';
            })()}
          </span>
        </div>

        {customerPhone && customerPhone !== 'N/A' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
            <span>Phone:</span><span>{customerPhone}</span>
          </div>
        )}
        {data.customerName && data.customerName !== 'Walk-in Customer' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
            <span>Customer:</span><span>{data.customerName}</span>
          </div>
        )}
      </div>

      {/* CRM/Delivery specifics */}
      {data.deliveryAddress && data.deliveryAddress !== 'N/A' && (
        <>
          <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />
          <div style={{ fontSize: '9.5px', marginBottom: '2mm', background: '#f5f5f5', padding: '1mm 2mm', borderRadius: '4px' }}>
            <div style={{ fontWeight: '900', textDecoration: 'underline', marginBottom: '1.5mm', fontSize: '10px' }}>
              DELIVERY DETAILS:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
              <span>Address:</span><span style={{ fontWeight: '700', textAlign: 'right', flex: 1, paddingLeft: '2mm' }}>{data.deliveryAddress}</span>
            </div>
            {data.paymentMethod && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
                <span>Payment Method:</span><span style={{ fontWeight: '900', textTransform: 'uppercase' }}>{data.paymentMethod}</span>
              </div>
            )}
            {data.riderName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm' }}>
                <span>Rider:</span><span style={{ fontWeight: '900' }}>{data.riderName}</span>
              </div>
            )}
            {data.remarks && (
              <div style={{ marginTop: '1.5mm', borderTop: '1px dotted #ccc', paddingTop: '1mm' }}>
                <span style={{ fontStyle: 'italic', color: '#444' }}>Remarks: {data.remarks}</span>
              </div>
            )}
          </div>
        </>
      )}

      {data.deliveryStatus && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2mm', background: '#fffbeb', border: '1px solid #fef3c7', padding: '1.5mm 2.5mm', borderRadius: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: '800', color: '#b45309' }}>DELIVERY STATUS:</span>
          <span style={{
            background: data.deliveryStatus === 'delivered' ? '#dcfce7' : '#fef3c7',
            color: data.deliveryStatus === 'delivered' ? '#166534' : '#d97706',
            padding: '0.5mm 1.5mm',
            borderRadius: '2px',
            fontWeight: '900',
            fontSize: '9px'
          }}>
            {data.deliveryStatus === 'out_for_delivery' ? 'ON THE WAY' : (data.deliveryStatus || 'PENDING')}
          </span>
        </div>
      )}

      <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />

      {/* Items Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: '1mm' }}>
        <span style={{ width: '24px' }}>QTY</span>
        <span style={{ flex: 1 }}>ITEM</span>
        <span style={{ textAlign: 'right', minWidth: '48px' }}>AMT</span>
      </div>
      <div style={{ borderTop: '1.5px solid #000', margin: '1mm 0' }} />

      {/* Items list */}
      <div style={{ marginBottom: '1mm' }}>
        {displayItems.map((item, i) => (
          <div key={i} style={{ marginBottom: '2mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ width: '24px', fontWeight: '700' }}>{item.qty}x</span>
              <span style={{ flex: 1, paddingRight: '3px' }}>{item.name}</span>
              <span style={{ textAlign: 'right', minWidth: '48px', fontWeight: '700' }}>{(item.price * item.qty).toFixed(0)}</span>
            </div>
            <div style={{ fontSize: '9px', color: '#666', paddingLeft: '24px' }}>Rs. {item.price} x {item.qty}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />

      {/* Subtotal, tax and totals */}
      <div style={{ marginBottom: '1.5mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', fontSize: '11px' }}>
          <span>Subtotal</span><span style={{ fontWeight: '700' }}>Rs. {subtotal.toFixed(0)}</span>
        </div>
        {serviceChargesAmt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', fontSize: '11px' }}>
            <span>Service Charges</span><span style={{ fontWeight: '700' }}>Rs. {serviceChargesAmt.toFixed(0)}</span>
          </div>
        )}
        {tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>GST / Tax</span><span style={{ fontWeight: '700' }}>Rs. {tax.toFixed(0)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1.5px solid #000', margin: '1mm 0' }} />
      <div style={{ borderTop: '1.5px solid #000', margin: '1mm 0 2mm' }} />

      {/* Grand Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5mm 0 3mm' }}>
        <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '1px' }}>TOTAL</span>
        <span style={{ fontSize: '17px', fontWeight: '900' }}>Rs. {total.toFixed(0)}</span>
      </div>

      <div style={{ borderTop: '1.5px solid #000', margin: '1mm 0' }} />
      <div style={{ borderTop: '1.5px solid #000', margin: '1mm 0' }} />

      {/* Footer message */}
      <div style={{ textAlign: 'center', marginTop: '4mm' }}>
        <div style={{ fontSize: '8.5px', color: '#000', marginBottom: '3mm', lineHeight: '1.5', textAlign: 'left', paddingLeft: '2mm', fontFamily: 'monospace' }}>
          Please check your order and cash change before leaving.<br />
          No challenge in court once checked out.<br />
          Order once served or prepared cannot be changed.<br />
          Dues once paid are non-refundable.<br />
          Instagram: @zaiqamahal.pk
        </div>
        <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />
        <div style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>THANK YOU</div>
        <div style={{ fontSize: '9px', color: '#333', marginTop: '1mm' }}>Please visit us again!</div>
        <div style={{ borderTop: '1px dashed #000', margin: '3mm 0 2mm' }} />
        <div style={{ fontSize: '7.5px', color: '#777', letterSpacing: '0.3px', textAlign: 'center' }}>Asper POS | Developed by Asper InfoTech Pvt Ltd</div>
      </div>
    </div>
  );
};

// ---------- Interactive Searchable Invoices Ledger ----------
const ReceiptPreview = ({ onClose, initialInvoiceId }) => {
  const [zoom, setZoom] = useState(1.5);
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    // Load real completed invoices & active deliveries from IndexedDB
    const loadInvoices = async () => {
      const storedInvoices = await getOfflineItem('zaiqa_mahal_completed_invoices', []);
      const storedDeliveries = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);

      const globalGst = await getOfflineItem('zaiqa_mahal_global_gst_rate', 16);

      // Map active deliveries so they are indexed for receipt search
      const activeMapped = storedDeliveries.map(del => {
        const subtotal = (del.items || []).reduce((s, i) => s + i.price * i.qty, 0);
        const tax = (del.items || []).reduce((sum, item) => {
          const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
            ? Number(item.taxRateOverride)
            : globalGst;
          return sum + (item.price * item.qty) * (rate / 100);
        }, 0);
        const total = subtotal + tax;
        return {
          orderId: del.id,
          customerPhone: del.phone || 'N/A',
          customerName: del.name || 'Delivery Guest',
          deliveryAddress: del.address || '',
          table: { number: del.id, area: 'Delivery' },
          items: del.items || [],
          subtotal: subtotal,
          tax: tax,
          total: total,
          paymentMethod: del.paymentMethod || 'cod',
          date: del.startTime || new Date().toISOString(),
          deliveryStatus: del.deliveryStatus || 'pending',
          isActiveDelivery: true
        };
      });

      const combined = [...storedInvoices, ...activeMapped];
      const uniqueCombined = [];
      const seenIds = new Set();
      for (const inv of combined) {
        if (inv.orderId && !seenIds.has(String(inv.orderId))) {
          seenIds.add(String(inv.orderId));
          uniqueCombined.push(inv);
        }
      }
      setInvoices(uniqueCombined);

      if (initialInvoiceId) {
        const found = uniqueCombined.find(inv => String(inv.orderId) === String(initialInvoiceId));
        if (found) {
          setSelectedInvoice(found);
          return;
        }
      }
      if (uniqueCombined.length > 0) {
        setSelectedInvoice(uniqueCombined[0]);
      }
    };
    loadInvoices();
  }, [initialInvoiceId]);

  const handlePrint = () => {
    if (selectedInvoice) {
      window.print();
    }
  };

  const clearAllReceipts = async () => {
    if (!window.confirm(`Clear all ${invoices.length} receipts from this device? This cannot be undone.`)) return;
    await setOfflineItem('zaiqa_mahal_completed_invoices', []);
    setInvoices([]);
    setSelectedInvoice(null);
  };

  const deleteOneReceipt = async (orderId, e) => {
    e.stopPropagation(); // don't select the invoice
    const updated = invoices.filter(inv => String(inv.orderId) !== String(orderId));
    await setOfflineItem('zaiqa_mahal_completed_invoices', updated.filter(i => !i.isActiveDelivery));
    setInvoices(updated);
    if (selectedInvoice?.orderId === orderId) {
      setSelectedInvoice(updated.length > 0 ? updated[0] : null);
    }
  };

  // Filter completed invoices safely by ID, Phone, Table, or Customer Name
  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const tableString = typeof inv.table === 'object'
      ? `${inv.table.area} ${inv.table.number}`.toLowerCase()
      : String(inv.table || '').toLowerCase();
    return (
      String(inv.orderId || '').toLowerCase().includes(term) ||
      String(inv.customerPhone || '').toLowerCase().includes(term) ||
      String(inv.customerName || '').toLowerCase().includes(term) ||
      tableString.includes(term)
    );
  });

  const isInvoiceVisible = filteredInvoices.length > 0 && selectedInvoice && filteredInvoices.some(inv => inv.orderId === selectedInvoice.orderId);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Top Header Bar */}
      <div style={{
        width: '100%', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(12px)',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Printer size={20} color="#f97316" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 950, fontSize: 16, letterSpacing: 0.5 }}>Receipt Search & Ledger</div>
            <div style={{ color: '#a1a1aa', fontSize: 11 }}>Search, review, and print past invoices securely.</div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {isInvoiceVisible && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '4px' }}>
              <button onClick={() => setZoom(Math.max(1.0, zoom - 0.1))} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: 11, color: '#e4e4e7', fontWeight: 800, width: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(Math.min(2.5, zoom + 0.1))} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          {isInvoiceVisible && (
            <button onClick={handlePrint} style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff', fontWeight: 900, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 15px rgba(249,115,22,0.3)',
            }}>
              <Printer size={14} /> Reprint Bill
            </button>
          )}

          {invoices.length > 0 && (
            <button onClick={clearAllReceipts} title="Clear all receipts from this device" style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444', fontWeight: 800, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Trash2 size={13} /> Clear All
            </button>
          )}

          {onClose && (
            <button onClick={onClose} style={{
              width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#a1a1aa', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
            }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Panel Content Split */}
      <div style={{ flex: 1, display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', overflow: 'hidden' }}>

        {/* Left Side: Real-time Invoices Record list & Search */}
        <div style={{
          width: window.innerWidth <= 768 ? '100%' : '380px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(24,24,27,0.7)',
          display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          {/* Search Box */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={{ display: 'block', fontSize: '9px', fontWeight: 900, color: '#f97316', uppercase: 'true', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>
              Search Bills & Receipts
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
              <input
                type="text"
                placeholder="Search Bill ID or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '12px 12px 12px 38px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(9,9,11,0.5)',
                  color: '#fff', fontSize: '13px', fontWeight: 'bold', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 15px', color: '#71717a' }}>
                <FileText size={40} style={{ margin: '0 auto 15px', color: '#3f3f46' }} />
                <h4 style={{ color: '#d4d4d8', fontWeight: 800, fontSize: '0.9rem', marginBottom: '5px' }}>No Invoices Found</h4>
                <p style={{ fontSize: '11px', lineHeight: '1.4' }}>Go to Point of Sale (POS) and checkout a dining table to generate completed bill receipts.</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 15px', color: '#71717a', fontSize: '12px' }}>
                No invoices found matching search term.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice?.orderId === inv.orderId;
                return (
                  <div
                    key={inv.orderId}
                    onClick={() => setSelectedInvoice(inv)}
                    style={{
                      padding: '16px', borderRadius: '12px',
                      background: isSelected ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1.5px solid ${isSelected ? '#f97316' : 'rgba(255,255,255,0.05)'}`,
                      cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Hash size={13} color={isSelected ? '#f97316' : '#71717a'} />
                        Bill #{inv.orderId}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {inv.isActiveDelivery && (
                          <span style={{
                            fontSize: '8px',
                            fontWeight: '900',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: inv.deliveryStatus === 'preparing' ? 'rgba(249,115,22,0.15)' : inv.deliveryStatus === 'out_for_delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                            color: inv.deliveryStatus === 'preparing' ? '#f97316' : inv.deliveryStatus === 'out_for_delivery' ? '#3b82f6' : '#ef4444',
                            border: `1px solid ${inv.deliveryStatus === 'preparing' ? 'rgba(249,115,22,0.3)' : inv.deliveryStatus === 'out_for_delivery' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`
                          }}>
                            {inv.deliveryStatus === 'out_for_delivery' ? 'ON THE WAY' : (inv.deliveryStatus || 'PENDING')}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 850 }}>
                          {typeof inv.table === 'object' ? `${inv.table.area} - ${inv.table.number}` : (String(inv.table).toLowerCase() === 'delivery' ? 'Delivery' : `Table ${inv.table}`)}
                        </span>
                        {/* Delete single receipt */}
                        {!inv.isActiveDelivery && (
                          <button
                            onClick={(e) => deleteOneReceipt(inv.orderId, e)}
                            title="Remove this receipt"
                            style={{
                              width: 22, height: 22, borderRadius: 6, border: 'none',
                              background: 'rgba(239,68,68,0.12)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#ef4444', flexShrink: 0,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a1a1aa' }}>
                      <Smartphone size={12} />
                      <span style={{ fontWeight: 700, color: inv.customerPhone !== 'N/A' ? '#e4e4e7' : '#71717a' }}>{inv.customerPhone}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={11} />
                        {new Date(inv.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                      </span>
                      <span style={{ color: isSelected ? '#fff' : '#f4f4f5', fontWeight: 900, fontSize: '13px' }}>
                        Rs. {inv.total?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Virtual Thermal Slip Preview Frame */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px', background: 'rgba(9,9,11,0.2)', overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          {isInvoiceVisible ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, animation: 'fadeIn 0.25s ease' }}>
              {/* Printer Top Slot */}
              <div style={{ width: `${72 * zoom * (96 / 25.4)}px`, height: 14, borderRadius: '6px 6px 0 0', background: 'linear-gradient(to bottom, #3f3f46, #18181b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 44, height: 4, borderRadius: 2, background: '#09090b' }} />
              </div>

              {/* Paper Roll representation */}
              <div style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                borderRadius: '0 0 4px 4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%', height: 8,
                  background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 6px, transparent 6px, transparent 8px)',
                }} />

                {/* Visual screen representation only */}
                <div style={{ width: '100%', background: '#fff' }}>
                  <Slip data={selectedInvoice} />
                </div>

                <div style={{
                  width: '100%', height: 12,
                  background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 6px, transparent 6px, transparent 8px)',
                }} />
              </div>

              {/* Printer Bottom cap */}
              <div style={{ width: `${72 * zoom * (96 / 25.4)}px`, height: 10, borderRadius: '0 0 6px 6px', background: 'linear-gradient(to bottom, #18181b, #09090b)' }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#71717a', maxWidth: '350px' }}>
              <FileText size={48} color="#f97316" style={{ margin: '0 auto 15px', opacity: 0.8 }} />
              <h3 style={{ color: '#e4e4e7', fontWeight: 800, marginBottom: '5px' }}>
                {searchTerm ? 'Bill Not Found' : 'No Selected Invoice'}
              </h3>
              <p style={{ fontSize: '12px', lineHeight: '1.5' }}>
                {searchTerm 
                  ? `The searched Bill ID or search term "${searchTerm}" does not exist in our historical database ledger.` 
                  : 'Select an invoice from the search ledger on the left to preview its thermal slip details.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedInvoice && createPortal(
        <div className="receipt-print-wrapper" style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}>
          <Slip data={selectedInvoice} isPrintMode={true} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReceiptPreview;
