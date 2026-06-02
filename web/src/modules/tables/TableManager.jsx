import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Users, AlertCircle, LayoutGrid, Check, Copy } from "lucide-react";
import { API_BASE } from "../../config";

const API = `${API_BASE}/tables`;

const Modal = ({ title, children, onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }}>
    <div style={{
      background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420,
      boxShadow: '0 32px 80px rgba(0,0,0,0.18)', overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#09090b' }}>{title}</h3>
        <button onClick={onClose} style={{ background: '#f4f4f5', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>}
    <input
      {...props}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 12,
        border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600,
        color: '#09090b', background: '#fafafa', outline: 'none',
        boxSizing: 'border-box', transition: 'border-color 0.2s',
        ...props.style,
      }}
      onFocus={e => e.target.style.borderColor = '#f97316'}
      onBlur={e => e.target.style.borderColor = '#e4e4e7'}
    />
  </div>
);

const TableManager = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({ number: '', area: 'Male', seats: 4 });

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (res.ok) setTables(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const openAdd = () => {
    setForm({ number: '', area: 'Male', seats: 4 });
    setEditTarget(null);
    setErrorMsg('');
    setModal('add');
  };

  const openEdit = (table) => {
    setForm({ number: table.number, area: table.area, seats: table.seats || 4 });
    setEditTarget(table);
    setErrorMsg('');
    setModal('edit');
  };

  const saveTable = async () => {
    if (!form.number || !form.area) return;
    setSaving(true);
    setErrorMsg('');
    
    const body = { table_number: form.number, area: form.area, seats: parseInt(form.seats, 10) || 4 };
    
    try {
      let res;
      if (editTarget) {
        res = await fetch(`${API}/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to save table');
        setSaving(false);
        return;
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Please try again.');
      setSaving(false);
      return;
    }
    
    setSaving(false);
    setModal(null);
    fetchTables();
  };

  const deleteTable = async (id) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    fetchTables();
  };

  // Pre-fill DB if completely empty (Quick Setup)
  const seedMockTables = async () => {
    const INITIAL = [
      { number: 'M-1', area: 'Male', seats: 4 },
      { number: 'M-2', area: 'Male', seats: 6 },
      { number: 'M-3', area: 'Male', seats: 4 },
      { number: 'M-4', area: 'Male', seats: 2 },
      { number: 'M-5', area: 'Male', seats: 8 },
      { number: 'F-1', area: 'Family', seats: 6 },
      { number: 'F-2', area: 'Family', seats: 8 },
      { number: 'F-3', area: 'Family', seats: 4 },
      { number: 'L-1', area: 'Lawn', seats: 10 },
      { number: 'L-2', area: 'Lawn', seats: 4 },
      { number: 'L-3', area: 'Lawn', seats: 6 },
    ];
    setSaving(true);
    for (const t of INITIAL) {
      await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table_number: t.number, area: t.area, seats: t.seats }) });
    }
    setSaving(false);
    fetchTables();
  };

  // Group tables by area
  const grouped = tables.reduce((acc, t) => {
    if (!acc[t.area]) acc[t.area] = [];
    acc[t.area].push(t);
    return acc;
  }, {});

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden', position: 'relative' }}>
      
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

      {/* Header */}
      <div className="bg-white p-4 lg:p-6 border-b border-gray-100 flex justify-between items-center shrink-0" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <LayoutGrid size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none">Table Manager</h2>
            <div className="text-[10px] sm:text-xs text-orange-600 font-bold uppercase tracking-widest mt-1">
              {tables.length} Active Tables
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {tables.length === 0 && (
            <button onClick={seedMockTables} disabled={saving} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-2">
              <Copy size={16} /> Seed Default
            </button>
          )}
          <button onClick={openAdd} className="px-5 py-2.5 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl text-sm font-bold text-white flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20">
            <Plus size={16} /> Add Table
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        {loading && <div className="text-center text-gray-400 font-bold py-10">Loading tables...</div>}
        
        {!loading && tables.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <LayoutGrid size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-black text-gray-800 mb-2">No Tables Found</h3>
            <p className="text-sm">Click "Add Table" to create one or use "Seed Default" to auto-create.</p>
          </div>
        )}

        {Object.keys(grouped).map(area => (
          <div key={area} className="mb-8">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-[2px] mb-4 flex items-center gap-2">
              <span className="w-8 h-px bg-gray-200"></span>
              {area} Area ({grouped[area].length})
              <span className="flex-1 h-px bg-gray-200"></span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {grouped[area].map(table => (
                <div key={table.id} className="bg-white rounded-2xl p-4 border-[1.5px] border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center text-orange-600 font-black text-lg">
                      {table.number}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(table)} className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-gray-100">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(table)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                    <Users size={14} /> {table.seats} Seats
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? 'Edit Table' : 'Add New Table'} onClose={() => setModal(null)}>
          <Input label="Table Name / Number" value={form.number} onChange={e => { setForm(p => ({ ...p, number: e.target.value })); setErrorMsg(''); }} placeholder="e.g. M-1 or Lawn-5" />
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Area / Section</label>
            <select
              value={form.area} onChange={e => { setForm(p => ({ ...p, area: e.target.value })); setErrorMsg(''); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600, color: '#09090b', background: '#fafafa', outline: 'none' }}
            >
              <option value="Male">Male</option>
              <option value="Family">Family</option>
              <option value="Lawn">Lawn</option>
            </select>
          </div>

          <Input label="Seats (Capacity)" type="number" value={form.seats} onChange={e => { setForm(p => ({ ...p, seats: e.target.value })); setErrorMsg(''); }} placeholder="e.g. 4" />

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          )}

          <button
            onClick={saveTable} disabled={saving}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#ea580c',
              fontSize: 15, fontWeight: 800, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: 8
            }}
          >
            {saving ? 'Saving...' : 'Save Table'}
          </button>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <Modal title="Delete Table?" onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#09090b', margin: '0 0 8px' }}>Are you sure?</h4>
            <p style={{ fontSize: 13, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
              Aap <strong>"{deleteTarget.number}"</strong> ({deleteTarget.area} Area) ko hamesha ke liye delete kar rahe hain.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => deleteTable(deleteTarget.id)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Yes, Delete
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default TableManager;
