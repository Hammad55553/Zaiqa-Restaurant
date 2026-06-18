import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, RotateCw, ArrowDownRight, ArrowUpRight, Check, X, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config';

const API = `${API_BASE}/stock`;

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
    <input
      {...props}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600, color: '#09090b', background: '#fafafa', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
      onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(249,115,22,0.1)'; }}
      onBlur={e => { e.target.style.borderColor = '#e4e4e7'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
    />
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(9,9,11,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
    <div style={{ position: 'relative', background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#09090b' }}>{title}</h3>
        <button onClick={onClose} style={{ background: '#f4f4f5', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#71717a' }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const LowStockAlerts = () => {
  const [lowItems, setLowItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ action: 'add', qty: '', remarks: '' });

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (res.ok) {
        const data = await res.json();
        // Filter only low stock items
        const low = data.filter(item => item.quantity <= item.min_alert);
        setLowItems(low);
      }
    } catch (err) {
      console.error('Failed to fetch stock for alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  const openAdjust = (item) => {
    setTargetItem(item);
    setAdjustForm({ action: 'add', qty: '', remarks: 'Restocked via Alerts' });
    setAdjustModal(true);
  };

  const saveAdjustment = async () => {
    if (!adjustForm.qty || parseFloat(adjustForm.qty) <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${targetItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: adjustForm.action, qty: parseFloat(adjustForm.qty), remarks: adjustForm.remarks })
      });
      if (res.ok) {
        setAdjustModal(false);
        fetchLowStock();
      }
    } catch (err) {
      console.error('Failed to save adjustment:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', position: 'relative' }}>
      
      {/* Background watermark logo */}
      <div 
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(./Logo.jpg)`,
          backgroundSize: 'contain', backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat', opacity: 0.02,
          pointerEvents: 'none', zIndex: 0
        }}
      />

      {/* Header */}
      <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle color="#ef4444" /> Low Stock Alerts
          </h2>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#71717a', marginTop: 4 }}>Raw materials requiring immediate restock</p>
        </div>
        <button onClick={fetchLowStock} style={{ padding: '10px 16px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', color: '#71717a', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RotateCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32, position: 'relative', zIndex: 1 }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} color="#ef4444" className="animate-spin" /></div>
        ) : lowItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, background: '#fff', borderRadius: 24, border: '1.5px solid #e4e4e7', maxWidth: 480, margin: '40px auto shadow-sm' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 20px', justifyContent: 'center' }}>
              <Check size={32} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#09090b', marginBottom: 8 }}>All Stocks Healthy!</h3>
            <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>No raw materials are currently below their safety threshold limits.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {lowItems.map(item => {
              const diff = item.min_alert - item.quantity;
              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1.5px solid #fee2e2', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#09090b' }}>{item.name}</h3>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#71717a', marginTop: 2 }}>Min Alert Limit: {item.min_alert} {item.unit}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                      <AlertTriangle size={12} /> Low
                    </div>
                  </div>

                  <div style={{ background: '#fef2f2', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Stock</p>
                      <p style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', lineHeight: 1, marginTop: 4 }}>
                        {item.quantity} <span style={{ fontSize: 14, fontWeight: 700 }}>{item.unit}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Shortfall</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#71717a', marginTop: 4 }}>
                        +{diff.toFixed(1)} {item.unit}
                      </p>
                    </div>
                  </div>

                  <button onClick={() => openAdjust(item)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(239,68,68,0.15)', marginTop: 'auto' }}>
                    <Plus size={16} /> Quick Restock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <Modal title={`Restock ${targetItem?.name}`} onClose={() => setAdjustModal(false)}>
          <div style={{ background: '#ecfdf5', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
              Current Stock: {targetItem?.quantity} {targetItem?.unit} <br/> Required Minimum: {targetItem?.min_alert} {targetItem?.unit}
            </p>
          </div>
          
          <Input label={`Quantity to Add (${targetItem?.unit})`} type="number" step="any" value={adjustForm.qty} onChange={e => setAdjustForm(p => ({ ...p, qty: e.target.value }))} placeholder="e.g. 10" />
          <Input label="Remarks" value={adjustForm.remarks} onChange={e => setAdjustForm(p => ({ ...p, remarks: e.target.value }))} placeholder="e.g. Restocked" />

          <button onClick={saveAdjustment} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Restock Item
          </button>
        </Modal>
      )}

    </div>
  );
};

export default LowStockAlerts;
