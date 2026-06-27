import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Pencil, Trash2, X, Check, Search,
  Tag, ChevronDown, Loader2, AlertCircle, UtensilsCrossed, CheckSquare, Square
} from 'lucide-react';
import { API_BASE } from '../../config';

const API = `${API_BASE}/inventory`;

// Pre-defined default images
const DEFAULT_IMAGES = [
  { id: 'karahi', url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80', label: 'Karahi' },
  { id: 'bbq', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80', label: 'BBQ' },
  { id: 'bread', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80', label: 'Bread/Naan' },
  { id: 'fastfood', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80', label: 'Fast Food' },
  { id: 'drink', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', label: 'Drink' },
  { id: 'salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80', label: 'Salad/Raita' },
  { id: 'deal', url: 'https://images.unsplash.com/photo-1555243896-c709bfa0b564?auto=format&fit=crop&w=400&q=80', label: 'Deal/Platter' },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
const Badge = ({ children, color = 'orange' }) => {
  const map = {
    orange: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
    zinc: { background: '#f4f4f5', color: '#3f3f46', border: '1px solid #e4e4e7' },
    green: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    red: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  };
  return (
    <span style={{ ...map[color], padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 999,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }}>
    <div style={{
      background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480,
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

// ─── Main Component ───────────────────────────────────────────────────────────
const InventorySystem = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);
  const [errorToast, setErrorToast] = useState(null);

  const showErrorToast = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const [converterModal, setConverterModal] = useState(null); // { index, unit, name }
  const [converterSourceUnit, setConverterSourceUnit] = useState('gram');
  const [converterValue, setConverterValue] = useState('');

  const getCalculatedConversion = () => {
    const val = parseFloat(converterValue) || 0;
    if (val <= 0) return 0;
    
    if (converterModal?.unit === 'Ltr') {
      if (converterSourceUnit === 'ml') return parseFloat((val / 1000).toFixed(4));
      if (converterSourceUnit === 'spoon') return parseFloat((val * 0.015).toFixed(4));
      if (converterSourceUnit === 'cup') return parseFloat((val * 0.25).toFixed(4));
    } else {
      if (converterSourceUnit === 'gram') return parseFloat((val / 1000).toFixed(4));
      if (converterSourceUnit === 'spoon') return parseFloat((val * 0.01).toFixed(4));
      if (converterSourceUnit === 'cup') return parseFloat((val * 0.2).toFixed(4));
      if (converterSourceUnit === 'piece') return parseFloat((val * 0.1).toFixed(4));
    }
    return val;
  };

  const [stockItems, setStockItems] = useState([]);

  // ── Multi-select state ─────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = (catItems) => {
    const ids = catItems.map(i => i.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const deleteSelected = async () => {
    setBulkDeleting(true);
    await Promise.all([...selected].map(id => fetch(`${API}/${id}`, { method: 'DELETE' })));
    setBulkDeleting(false);
    setShowBulkConfirm(false);
    exitSelectMode();
    fetchAll();
  };

  // Form state
  const [form, setForm] = useState({ name: '', price: '', category_id: '', image: '', ingredients: [], taxRateOverride: '' });
  const [catName, setCatName] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, stockRes] = await Promise.all([
        fetch(`${API}`),
        fetch(`${API}/categories`),
        fetch(`${API_BASE}/stock`),
      ]);
      setItems(await itemsRes.json());
      setCategories(await catsRes.json());
      setStockItems(await stockRes.json());
    } catch {
      // server offline — show empty
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // filtered items
  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || String(i.category_id) === filterCat;
    return matchSearch && matchCat;
  });

  // group by category
  const grouped = categories.reduce((acc, cat) => {
    if (filterCat !== 'all' && String(cat.id) !== filterCat) return acc;
    const catItems = filtered.filter(i => i.category_id === cat.id);
    if (catItems.length > 0) acc[cat.name] = catItems;
    return acc;
  }, {});
  const uncategorized = filtered.filter(i => !i.category_id);
  if (uncategorized.length > 0) grouped['Uncategorized'] = uncategorized;

  const openAdd = () => {
    setForm({ name: '', price: '', category_id: categories[0]?.id || '', image: '', ingredients: [], taxRateOverride: '' });
    setEditTarget(null);
    setModal('addItem');
  };

  const openEdit = (item) => {
    setForm({ 
      name: item.name, 
      price: item.price, 
      category_id: item.category_id || '', 
      image: item.image || '',
      ingredients: item.ingredients || [],
      taxRateOverride: item.taxRateOverride !== undefined && item.taxRateOverride !== null ? String(item.taxRateOverride) : ''
    });
    setEditTarget(item);
    setModal('editItem');
  };

  const saveItem = async () => {
    if (!form.name) {
      showErrorToast("Item Name is required!");
      return;
    }
    if (form.price === '' || form.price === null || form.price === undefined) {
      showErrorToast("Price is required!");
      return;
    }
    const validIngredients = (form.ingredients || []).filter(ing => ing.stock_item_id && parseFloat(ing.quantity_required) > 0);
    if (validIngredients.length === 0) {
      showErrorToast("Recipe ingredients are required! Please add at least one material.");
      return;
    }
    setSaving(true);
    const body = { 
      name: form.name, 
      price: parseFloat(form.price), 
      category_id: form.category_id || null, 
      image: form.image || null,
      ingredients: validIngredients,
      taxRateOverride: form.taxRateOverride !== '' ? parseFloat(form.taxRateOverride) : null
    };
    if (editTarget) {
      await fetch(`${API}/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch(`${API}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setModal(null);
    fetchAll();
  };

  const deleteItem = async (id) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    fetchAll();
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    setSaving(true);
    await fetch(`${API}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: catName }) });
    setSaving(false);
    setCatName('');
    setModal(null);
    fetchAll();
  };

  const deleteCategory = async (id) => {
    await fetch(`${API}/categories/${id}`, { method: 'DELETE' });
    setDeleteCatTarget(null);
    fetchAll();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden', position: 'relative' }}>

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

      {/* ── Header Bar ── */}
      <div className="bg-white p-4 lg:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">

        {/* Title Area */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none">Menu Manager</h2>
            <div className="text-[10px] sm:text-xs text-orange-600 font-bold uppercase tracking-widest mt-1">
              {items.length} Items · {categories.length} Categories
            </div>
          </div>
        </div>

        {/* Responsive Grid for Controls (2x2 on Mobile, Inline on Desktop) */}
        <div className="grid grid-cols-2 md:flex items-center gap-2 md:gap-3 w-full md:w-auto">

          {/* Search */}
          <div className="relative col-span-2 md:col-span-1 md:w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative col-span-2 sm:col-span-1 md:w-40">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="w-full pl-8 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 appearance-none focus:outline-none focus:border-orange-500 focus:bg-white cursor-pointer transition-colors"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Add Category Button */}
          <button onClick={() => setModal('addCat')} className="col-span-1 w-full md:w-auto px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-sm font-bold text-gray-700 flex justify-center items-center gap-2 transition-colors">
            <Plus size={16} /> Category
          </button>

          {/* Select Mode Toggle */}
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={`col-span-1 w-full md:w-auto px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all border ${
              selectMode
                ? 'bg-orange-50 border-orange-400 text-orange-600'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckSquare size={16} /> {selectMode ? 'Cancel' : 'Select'}
          </button>

          {/* Add Item Button */}
          <button onClick={openAdd} className="col-span-1 w-full md:w-auto px-5 py-2.5 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl text-sm font-bold text-white flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20 transition-all">
            <Plus size={16} /> Item
          </button>

        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#a1a1aa' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontWeight: 700 }}>Loading...</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a1a1aa' }}>
            <UtensilsCrossed size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#3f3f46', marginBottom: 8 }}>No items found</div>
            <div style={{ fontSize: 14 }}>Add your first item using the "+ Item" button above</div>
          </div>
        )}

        {/* Categories Section */}
        {!loading && categories.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              Categories ({categories.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: '#fff', border: '1.5px solid #e4e4e7', fontSize: 13, fontWeight: 700, color: '#3f3f46' }}>
                  <Tag size={12} color="#f97316" />
                  {cat.name}
                  <span style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600 }}>
                    ({items.filter(i => i.category_id === cat.id).length})
                  </span>
                  <button onClick={() => setDeleteCatTarget(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0 0 4px', lineHeight: 1 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items grouped by category */}
        {!loading && Object.entries(grouped).map(([catName, catItems]) => {
          const allCatSelected = catItems.every(i => selected.has(i.id));
          return (
            <div key={catName} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {selectMode && (
                  <button
                    onClick={() => toggleSelectAll(catItems)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: allCatSelected ? '#f97316' : '#a1a1aa' }}
                    title="Select all in category"
                  >
                    {allCatSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                )}
                <div style={{ fontSize: 13, fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: 1 }}>{catName}</div>
                <Badge color="orange">{catItems.length} items</Badge>
                <div style={{ flex: 1, height: 1, background: '#f4f4f5' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {catItems.map(item => {
                  const isSelected = selected.has(item.id);
                  return (
                    <div key={item.id}
                      onClick={() => selectMode && toggleSelect(item.id)}
                      style={{
                        background: isSelected ? '#fff7ed' : '#fff',
                        borderRadius: 16, padding: '16px 18px',
                        border: `1.5px solid ${isSelected ? '#f97316' : '#f4f4f5'}`,
                        display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'box-shadow 0.2s, border-color 0.2s, background 0.15s',
                        boxShadow: isSelected ? '0 0 0 3px rgba(249,115,22,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                        cursor: selectMode ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => { if (!selectMode) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#fed7aa'; } }}
                      onMouseLeave={e => { if (!selectMode) { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = isSelected ? '#f97316' : '#f4f4f5'; } }}
                    >
                      {/* Checkbox or Image */}
                      {selectMode ? (
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: isSelected ? '#fff7ed' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${isSelected ? '#f97316' : '#e4e4e7'}` }}>
                          {isSelected ? <Check size={20} color="#f97316" /> : <Square size={18} color="#a1a1aa" />}
                        </div>
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {item.image ? (
                            <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <UtensilsCrossed size={18} color="#f97316" />
                          )}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#ea580c' }}>Rs. {item.price.toLocaleString()}</div>
                          {item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '' && (
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', background: '#e2e8f0', padding: '2px 6px', borderRadius: 6 }}>
                              GST: {item.taxRateOverride}%
                            </div>
                          )}
                        </div>
                      </div>

                      {!selectMode && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} style={{ width: 32, height: 32, borderRadius: 8, background: '#f4f4f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Item Modal ── */}
      {(modal === 'addItem' || modal === 'editItem') && (
        <Modal title={modal === 'editItem' ? 'Edit Item' : 'Add New Item'} onClose={() => setModal(null)}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
            <Input label="Item Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mutton Karahi (Full)" />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ flex: '1 1 150px' }}>
                <Input label="Price (Rs.)" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 3500" />
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <Input label="GST Override (%)" type="number" value={form.taxRateOverride} onChange={e => setForm(p => ({ ...p, taxRateOverride: e.target.value }))} placeholder="e.g. 16 or 0 (Blank for default)" />
              </div>
              <div style={{ flex: '1 1 150px', marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Category</label>
                <select
                  value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600, color: '#09090b', background: '#fafafa', outline: 'none', boxSizing: 'border-box', height: '42px' }}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Ingredients / Recipe Selection */}
            <div style={{ marginBottom: 24, padding: 16, background: '#f8f9fc', borderRadius: 16, border: '1px solid #e4e4e7' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                <span>Recipe / Ingredients (Required) *</span>
                <button 
                  onClick={() => setForm(p => ({ ...p, ingredients: [...p.ingredients, { stock_item_id: '', quantity_required: '' }] }))}
                  style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800 }}
                >
                  <Plus size={14} /> Add
                </button>
              </label>

              {form.ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select
                    value={ing.stock_item_id} 
                    onChange={e => {
                      const newIngs = [...form.ingredients];
                      newIngs[idx].stock_item_id = e.target.value;
                      setForm(p => ({ ...p, ingredients: newIngs }));
                    }}
                    style={{ flex: 2, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e4e4e7', fontSize: 13, background: '#fff', outline: 'none' }}
                  >
                    <option value="">-- Select Material --</option>
                    {stockItems.map(si => <option key={si.id} value={si.id}>{si.name} ({si.unit})</option>)}
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    value={ing.quantity_required}
                    onChange={e => {
                      const newIngs = [...form.ingredients];
                      newIngs[idx].quantity_required = e.target.value;
                      setForm(p => ({ ...p, ingredients: newIngs }));
                    }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e4e4e7', fontSize: 13, outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const selectedStockItem = stockItems.find(si => String(si.id) === String(ing.stock_item_id));
                      const targetUnit = selectedStockItem ? selectedStockItem.unit : 'Kg';
                      setConverterModal({
                        index: idx,
                        unit: targetUnit,
                        name: selectedStockItem ? selectedStockItem.name : 'Ingredient'
                      });
                      setConverterSourceUnit(targetUnit === 'Ltr' ? 'ml' : 'gram');
                      setConverterValue('');
                    }}
                    style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: '#0284c7', padding: '0 10px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
                    title="Convert spoons, grams, cups etc."
                    disabled={!ing.stock_item_id}
                  >
                    ⚖️
                  </button>
                  <button 
                    onClick={() => {
                      const newIngs = form.ingredients.filter((_, i) => i !== idx);
                      setForm(p => ({ ...p, ingredients: newIngs }));
                    }}
                    style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '0 10px', borderRadius: 10, cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {form.ingredients.length === 0 && (
                <div style={{ fontSize: 12, color: '#a1a1aa', textAlign: 'center', padding: '10px 0' }}>No recipe items added.</div>
              )}
            </div>

            {/* Image Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Item Image</label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {DEFAULT_IMAGES.map(img => (
                  <div
                    key={img.id}
                    onClick={() => setForm(p => ({ ...p, image: img.url }))}
                    style={{
                      aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: form.image === img.url ? '3px solid #f97316' : '1px solid #e4e4e7',
                      position: 'relative'
                    }}
                  >
                    <img src={img.url} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {form.image === img.url && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#f97316', borderRadius: '50%', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Input label="Or Enter Custom Image URL" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveItem} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                {modal === 'editItem' ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Category Modal ── */}
      {modal === 'addCat' && (
        <Modal title="Add New Category" onClose={() => setModal(null)}>
          <Input label="Category Name" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Karahi, BBQ, Drinks..." />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
            <button onClick={addCategory} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
              {saving ? 'Saving...' : 'Add Category'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <Modal title="Delete Item?" onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#09090b', marginBottom: 8 }}>"{deleteTarget.name}"</div>
            <div style={{ fontSize: 14, color: '#71717a' }}>This item will be permanently deleted and cannot be recovered.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => deleteItem(deleteTarget.id)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Yes, Delete
            </button>
          </div>
        </Modal>
      )}

      {/* ── Bulk Delete Floating Bar ── */}
      {selectMode && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
          background: '#09090b', borderRadius: 20, padding: '12px 20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          animation: 'slideUp 0.25s ease',
        }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
            {selected.size === 0 ? 'Tap items to select' : `${selected.size} item${selected.size > 1 ? 's' : ''} selected`}
          </div>
          {selected.size > 0 && (
            <>
              <div style={{ width: 1, height: 20, background: '#3f3f46' }} />
              <button
                onClick={() => setSelected(new Set(filtered.map(i => i.id)))}
                style={{ background: '#27272a', border: 'none', color: '#a1a1aa', padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Select All
              </button>
              <button
                onClick={() => setShowBulkConfirm(true)}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={14} /> Delete {selected.size}
              </button>
            </>
          )}
          <button onClick={exitSelectMode} style={{ background: '#27272a', border: 'none', color: '#a1a1aa', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Bulk Delete Confirm Modal ── */}
      {showBulkConfirm && (
        <Modal title="Delete Selected Items?" onClose={() => setShowBulkConfirm(false)}>
          <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#09090b', marginBottom: 8 }}>{selected.size} Items</div>
            <div style={{ fontSize: 14, color: '#71717a' }}>These items will be permanently deleted and cannot be recovered.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowBulkConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
            <button onClick={deleteSelected} disabled={bulkDeleting} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {bulkDeleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
              {bulkDeleting ? 'Deleting...' : `Yes, Delete ${selected.size}`}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
      {/* ── Delete Category Confirm Modal ── */}
      {deleteCatTarget && (
        <Modal title="Delete Category?" onClose={() => setDeleteCatTarget(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#09090b', margin: '0 0 8px' }}>Are you sure?</h4>
            <p style={{ fontSize: 13, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
              You are about to delete the <strong>"{deleteCatTarget.name}"</strong> category.<br/>
              The <strong>{items.filter(i => i.category_id === deleteCatTarget.id).length} items</strong> in this category will become uncategorized.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeleteCatTarget(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => deleteCategory(deleteCatTarget.id)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              Yes, Delete
            </button>
          </div>
        </Modal>
      )}

      {converterModal && (
        <Modal title={`Unit Converter Tool: ${converterModal.name}`} onClose={() => setConverterModal(null)}>
          <div style={{ background: '#f0f9ff', padding: '12px 16px', borderRadius: 12, marginBottom: 16, border: '1px solid #bae6fd' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#0369a1' }}>Target Recipe Unit</span>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#0c4a6e', marginTop: '2px' }}>{converterModal.unit}</div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1.2 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Convert From</label>
              <select 
                value={converterSourceUnit} 
                onChange={e => setConverterSourceUnit(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e4e4e7', fontSize: 14, fontWeight: 600, background: '#fafafa', outline: 'none', boxSizing: 'border-box', height: '42px' }}
              >
                {converterModal.unit === 'Ltr' ? (
                  <>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="spoon">Spoons (🥄)</option>
                    <option value="cup">Cups (🥛)</option>
                  </>
                ) : (
                  <>
                    <option value="gram">Grams (g)</option>
                    <option value="spoon">Spoons (🥄)</option>
                    <option value="cup">Cups (🥛)</option>
                    <option value="piece">Pieces (🧅/🧄)</option>
                  </>
                )}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <Input 
                label="Enter Quantity" 
                type="number" 
                step="any"
                value={converterValue} 
                onChange={e => setConverterValue(e.target.value)} 
                placeholder="e.g. 2 or 150" 
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fc', border: '1.5px dashed #e2e8f0', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>Calculated Decimal Value</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{getCalculatedConversion()} <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>{converterModal.unit}</span></div>
            </div>
            <div style={{ fontSize: '20px' }}>⚖️</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConverterModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 700, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
            <button 
              onClick={() => {
                const calculated = getCalculatedConversion();
                const newIngs = [...form.ingredients];
                newIngs[converterModal.index].quantity_required = calculated;
                setForm(p => ({ ...p, ingredients: newIngs }));
                setConverterModal(null);
              }} 
              style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0284c7, #0369a1)', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 16px rgba(2,132,199,0.3)' }}
            >
              Apply Value
            </button>
          </div>
        </Modal>
      )}

      {errorToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
          background: '#ef4444', color: '#fff', padding: '12px 24px',
          borderRadius: 12, fontWeight: 800, fontSize: 13, textTransform: 'uppercase',
          boxShadow: '0 10px 25px rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideUp 0.25s ease'
        }}>
          <AlertCircle size={16} /> {errorToast}
        </div>
      )}

    </div>
  );
};

export default InventorySystem;
