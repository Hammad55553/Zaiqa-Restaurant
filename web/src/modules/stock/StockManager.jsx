import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Pencil, Trash2, X, Check, Search,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Layers, Loader2, ListPlus, Clock
} from 'lucide-react';
import { API_BASE } from '../../config';
import StockHistory from './StockHistory';

const API = `${API_BASE}/stock`;

// ─── Reusable Components ───────────────────────────────────────────────────────
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
    <div style={{ position: 'relative', background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em' }}>{title}</h3>
        <button onClick={onClose} style={{ background: '#f4f4f5', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#71717a' }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StockManager = () => {
  const [view, setView] = useState('overview'); // 'overview' | 'history'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [modal, setModal] = useState(null); // 'addItem' | 'editItem' | 'adjustStock' | 'logs'
  const [targetItem, setTargetItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form States
  const [form, setForm] = useState({ name: '', unit: 'Kg', quantity: '', unit_price: '', min_alert: '' });
  const [adjustForm, setAdjustForm] = useState({ action: 'add', qty: '', remarks: '' });
  const [logs, setLogs] = useState([]);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}`);
      if (res.ok) setItems(await res.json());
    } catch {
      // Offline fallback
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  // Setup Add/Edit Modal
  const openAdd = () => {
    setForm({ name: '', unit: 'Kg', quantity: '', unit_price: '', min_alert: '' });
    setTargetItem(null);
    setModal('addItem');
  };

  const openEdit = (item) => {
    setForm({ name: item.name, unit: item.unit, quantity: item.quantity, unit_price: item.unit_price, min_alert: item.min_alert });
    setTargetItem(item);
    setModal('editItem');
  };

  const saveItem = async () => {
    if (!form.name || !form.unit) return;
    setSaving(true);
    
    const body = {
      name: form.name,
      unit: form.unit,
      quantity: parseFloat(form.quantity) || 0,
      unit_price: parseFloat(form.unit_price) || 0,
      min_alert: parseFloat(form.min_alert) || 0
    };

    if (targetItem) {
      await fetch(`${API}/${targetItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch(`${API}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    
    setSaving(false);
    setModal(null);
    fetchStock();
  };

  // Stock Adjustment
  const openAdjust = (item, actionType) => {
    setTargetItem(item);
    setAdjustForm({ action: actionType, qty: '', remarks: '' });
    setModal('adjustStock');
  };

  const saveAdjustment = async () => {
    if (!adjustForm.qty || parseFloat(adjustForm.qty) <= 0) return;
    setSaving(true);
    await fetch(`${API}/${targetItem.id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: adjustForm.action, qty: parseFloat(adjustForm.qty), remarks: adjustForm.remarks })
    });
    setSaving(false);
    setModal(null);
    fetchStock();
  };

  const [deleteItemData, setDeleteItemData] = useState(null);

  const confirmDelete = (item) => {
    setDeleteItemData(item);
  };

  const executeDelete = async () => {
    if (!deleteItemData) return;
    setSaving(true);
    try {
      await fetch(`${API}/${deleteItemData.id}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Delete error", err);
    }
    setSaving(false);
    setDeleteItemData(null);
    fetchStock();
  };

  // View Logs
  const viewLogs = async (item) => {
    setTargetItem(item);
    setModal('logs');
    setLogs([]); // clear old
    const res = await fetch(`${API}/logs/${item.id}`);
    if (res.ok) setLogs(await res.json());
  };

  if (view === 'history') {
    return <StockHistory onBack={() => setView('overview')} />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', position: 'relative' }}>
      
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

      {/* Header */}
      <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers color="#f97316" /> Kitchen Stock (Raw Materials)
          </h2>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#71717a', marginTop: 4 }}>Manage raw materials and inventory</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} color="#a1a1aa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={() => setView('history')} style={{ padding: '0 20px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', color: '#71717a', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
            <Clock size={16} /> View History
          </button>
          <button onClick={openAdd} style={{ padding: '0 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #09090b, #27272a)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <Plus size={18} /> New Item
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32, position: 'relative', zIndex: 1 }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} color="#f97316" className="animate-spin" /></div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Package size={48} color="#e4e4e7" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 800, color: '#a1a1aa' }}>No items found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {filteredItems.map(item => {
              const isLowStock = item.quantity <= item.min_alert;
              const totalValue = item.quantity * item.unit_price;

              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: `1.5px solid ${isLowStock ? '#fee2e2' : '#f4f4f5'}`, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#09090b', letterSpacing: '-0.01em' }}>{item.name}</h3>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Rs. {item.unit_price} / {item.unit}</p>
                    </div>
                    {isLowStock && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                        <AlertTriangle size={12} /> Low Stock
                      </div>
                    )}
                  </div>

                  {/* Stock Quantity BIG */}
                  <div style={{ background: isLowStock ? '#fef2f2' : '#f8f9fc', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: isLowStock ? '#ef4444' : '#09090b', lineHeight: 1 }}>{item.quantity}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isLowStock ? '#f87171' : '#71717a' }}>{item.unit}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 'auto' }}>
                    <button onClick={() => openAdjust(item, 'add')} style={{ padding: '10px', borderRadius: 10, border: 'none', background: '#ecfdf5', color: '#10b981', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ArrowDownRight size={16} /> In (Add)
                    </button>
                    <button onClick={() => openAdjust(item, 'remove')} style={{ padding: '10px', borderRadius: 10, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ArrowUpRight size={16} /> Out (Use)
                    </button>
                  </div>

                  {/* Bottom Bar: Edit / Logs / Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f4f4f5', paddingTop: 16, marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa' }}>Value: <span style={{ color: '#09090b' }}>Rs. {totalValue}</span></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => viewLogs(item)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }} title="History">
                        <ListPlus size={16} />
                      </button>
                      <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }} title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => confirmDelete(item)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit Item Modal ── */}
      {(modal === 'addItem' || modal === 'editItem') && (
        <Modal title={modal === 'editItem' ? 'Edit Item' : 'Add New Item'} onClose={() => setModal(null)}>
          <Input label="Item Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Meat, Ghee, Eggs" />
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Unit</label>
              <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}>
                <option value="Kg">Kg (Kilogram)</option>
                <option value="Ltr">Liters</option>
                <option value="Dozen">Dozens</option>
                <option value="Pack">Packets / Box</option>
                <option value="Pcs">Pieces</option>
              </select>
            </div>
            {modal === 'addItem' && (
               <div style={{ flex: 1 }}>
                 <Input label={`Initial Qty (${form.unit})`} type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
               </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input label={`Price per ${form.unit} (Rs)`} type="number" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} placeholder="e.g. 1500" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Low Stock Alert" type="number" value={form.min_alert} onChange={e => setForm(p => ({ ...p, min_alert: e.target.value }))} placeholder="e.g. 5" />
            </div>
          </div>

          <button onClick={saveItem} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(249,115,22,0.3)', marginTop: 8 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
          </button>
        </Modal>
      )}

      {/* ── Adjust Stock Modal (In/Out) ── */}
      {modal === 'adjustStock' && (
        <Modal title={adjustForm.action === 'add' ? 'Add Stock (IN)' : 'Use Stock (OUT)'} onClose={() => setModal(null)}>
          <div style={{ background: adjustForm.action === 'add' ? '#ecfdf5' : '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: adjustForm.action === 'add' ? '#059669' : '#dc2626' }}>
              Item: <strong>{targetItem?.name}</strong> <br/> Current Stock: {targetItem?.quantity} {targetItem?.unit}
            </p>
          </div>
          
          <Input label={`Amount to ${adjustForm.action === 'add' ? 'add' : 'remove'} (${targetItem?.unit})`} type="number" step="any" value={adjustForm.qty} onChange={e => setAdjustForm(p => ({ ...p, qty: e.target.value }))} placeholder="e.g. 5" />
          <Input label="Remarks (Optional)" value={adjustForm.remarks} onChange={e => setAdjustForm(p => ({ ...p, remarks: e.target.value }))} placeholder="e.g. New stock arrived" />

          <button onClick={saveAdjustment} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: adjustForm.action === 'add' ? '#10b981' : '#ef4444', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Confirm
          </button>
        </Modal>
      )}

      {/* ── Logs Modal (History) ── */}
      {modal === 'logs' && (
        <Modal title={`${targetItem?.name} - History`} onClose={() => setModal(null)}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }} className="custom-scrollbar">
            {logs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#a1a1aa', padding: 20, fontSize: 13, fontWeight: 600 }}>No history found.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f4f4f5' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: log.action === 'add' ? '#ecfdf5' : log.action === 'remove' ? '#fef2f2' : '#f4f4f5', color: log.action === 'add' ? '#10b981' : log.action === 'remove' ? '#ef4444' : '#71717a', textTransform: 'uppercase' }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#09090b' }}>{log.qty_changed} {targetItem?.unit}</span>
                    </div>
                    {log.remarks && <p style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>{log.remarks}</p>}
                  </div>
                  <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>{new Date(log.created_at + 'Z').toLocaleString('en-PK')}</div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
      {/* ── Delete Confirmation Modal ── */}
      {deleteItemData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(9,9,11,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setDeleteItemData(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 12px rgba(239,68,68,0.15)' }}>
              <AlertTriangle size={28} />
            </div>
            
            <h3 style={{ fontSize: 19, fontWeight: 900, color: '#09090b', letterSpacing: '-0.02em', marginBottom: 8 }}>Delete Raw Material?</h3>
            <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to permanently delete <strong style={{ color: '#09090b' }}>{deleteItemData.name}</strong>? This action will remove all related logs and recipe connections and cannot be undone.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button 
                onClick={() => setDeleteItemData(null)}
                style={{ padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', color: '#71717a', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                disabled={saving}
                style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockManager;
