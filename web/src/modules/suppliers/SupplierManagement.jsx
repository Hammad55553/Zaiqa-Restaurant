import React, { useState, useEffect } from 'react';
import { 
    Truck, 
    Plus, 
    Search, 
    Building2, 
    History, 
    ArrowUpRight, 
    ArrowDownRight, 
    Trash2, 
    X, 
    CheckCircle,
    UserPlus,
    Loader2
} from 'lucide-react';
import { API_BASE } from '../../config';

// Local Toast Implementation (assuming POSLayout has a global one, but we can use a simple custom one here if needed, or just browser alert for simplicity unless we add a local state toast)
// We will use a local toast state for this module to keep it independent
const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState('purchase'); // purchase or payment
    const [isSaving, setIsSaving] = useState(false);
    
    // Local Toast
    const [toastMessage, setToastMessage] = useState(null);

    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', company: '', balance: '' });
    
    // Added stock_item_id and quantity for inventory sync
    const [actionData, setActionData] = useState({ amount: '', note: '', stock_item_id: '', quantity: '' });

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(`${API_BASE}/suppliers`);
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data);
                // Update selected supplier if it exists
                if (selectedSupplier) {
                    const updated = data.find(s => s.id === selectedSupplier.id);
                    if (updated) setSelectedSupplier(updated);
                }
            }
        } catch (err) {
            console.error("Failed to fetch suppliers", err);
            showToast('Error loading suppliers', 'error');
        }
    };

    const fetchStockItems = async () => {
        try {
            const res = await fetch(`${API_BASE}/stock`);
            if (res.ok) {
                const data = await res.json();
                setStockItems(data);
            }
        } catch (err) {
            console.error("Failed to fetch stock", err);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchStockItems();
    }, []);

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOutstanding = suppliers.reduce((acc, s) => acc + s.balance, 0);

    // --- ADD SUPPLIER ---
    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (!newSupplier.name || !newSupplier.company) return showToast('Name and Company are required', 'error');
        
        setIsSaving(true);
        const supplierData = {
            id: `SUP-${Date.now()}`,
            name: newSupplier.name,
            contact: newSupplier.contact,
            company: newSupplier.company,
            balance: parseFloat(newSupplier.balance) || 0,
            history: newSupplier.balance > 0 ? [{
                date: new Date().toISOString(),
                type: 'Opening Balance',
                amount: parseFloat(newSupplier.balance),
                note: 'Account Created'
            }] : []
        };

        try {
            const res = await fetch(`${API_BASE}/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplierData)
            });
            
            if (res.ok) {
                showToast('Supplier Profile Created!');
                setNewSupplier({ name: '', contact: '', company: '', balance: '' });
                setIsAddModalOpen(false);
                fetchSuppliers();
            } else {
                showToast('Failed to create supplier', 'error');
            }
        } catch (err) {
            console.error("Fatal Error Add Supplier:", err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- UPDATE BALANCE (Purchase/Payment) ---
    const handleAction = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (!actionData.amount) return showToast('Enter amount', 'error');
        if (actionType === 'purchase' && actionData.stock_item_id && !actionData.quantity) {
            return showToast('Enter quantity for the stock item', 'error');
        }
        
        setIsSaving(true);
        const amount = parseFloat(actionData.amount);
        const type = actionType === 'purchase' ? 'Stock Purchase' : 'Payment Made';

        try {
            const res = await fetch(`${API_BASE}/suppliers/${selectedSupplier.id}/ledger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    amount,
                    note: actionData.note,
                    stock_item_id: actionData.stock_item_id || null,
                    quantity: actionData.quantity || null
                })
            });
            
            if (res.ok) {
                showToast('Transaction Recorded Successfully');
                setIsActionModalOpen(false);
                setActionData({ amount: '', note: '', stock_item_id: '', quantity: '' });
                fetchSuppliers(); // Refresh to get updated balance and history
            } else {
                showToast('Failed to record transaction', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const [deleteSupplierData, setDeleteSupplierData] = useState(null);

    const executeDeleteSupplier = async () => {
        if (!deleteSupplierData) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/suppliers/${deleteSupplierData.id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Supplier deleted');
                setSelectedSupplier(null);
                fetchSuppliers();
            } else {
                showToast('Failed to delete', 'error');
            }
        } catch (err) {
            console.error("Fatal Error Delete:", err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
            setDeleteSupplierData(null);
        }
    };

    return (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: window.innerWidth <= 480 ? '15px' : '20px', 
            padding: window.innerWidth <= 480 ? '15px' : '25px', 
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            
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

            {/* Global Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: '12px', background: '#09090b', color: 'white',
                    padding: '12px 20px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: toastMessage.type === 'error' ? '#ef4444' : '#10b981' }}>
                        {toastMessage.message}
                    </span>
                    <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* HEADER */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'stretch' : 'center', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px 20px' : '20px 25px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                gap: '15px',
                flexShrink: 0
            }}>
                <div>
                    <h2 style={{ 
                        fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.6rem', 
                        fontWeight: 950, 
                        color: '#1e293b', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        margin: 0
                    }}>
                        <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '10px' }}>
                            <Truck size={window.innerWidth <= 480 ? 20 : 28} color="#f97316" />
                        </div>
                        SUPPLIER NETWORK
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px', marginBottom: 0 }}>Procurement Khata & Settlement History.</p>
                </div>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                    gap: '15px', 
                    alignItems: window.innerWidth <= 480 ? 'stretch' : 'center' 
                }}>
                    <div style={{ 
                        textAlign: window.innerWidth <= 480 ? 'left' : 'right', 
                        paddingRight: window.innerWidth <= 480 ? '0' : '20px', 
                        borderRight: window.innerWidth <= 480 ? 'none' : '1px solid #e2e8f0',
                        borderBottom: window.innerWidth <= 480 ? '1px solid #f1f5f9' : 'none',
                        paddingBottom: window.innerWidth <= 480 ? '10px' : '0'
                    }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', margin: 0 }}>TOTAL OUTSTANDING</p>
                        <h4 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.2rem', fontWeight: 950, color: '#ef4444', margin: 0 }}>Rs {totalOutstanding.toLocaleString()}</h4>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ 
                            background: '#f97316', 
                            color: 'white', 
                            border: 'none', 
                            padding: '12px 20px', 
                            borderRadius: '10px', 
                            fontWeight: 800, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.85rem'
                        }}
                    >
                        <UserPlus size={18} /> NEW SUPPLIER
                    </button>
                </div>
            </header>

            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row',
                gap: '20px', 
                flex: 1, 
                overflow: 'hidden' 
            }}>
                
                {/* SUPPLIER LIST */}
                <div style={{ 
                    display: (window.innerWidth <= 1024 && selectedSupplier) ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    gap: '15px', 
                    flex: 1,
                    overflow: 'hidden' 
                }}>
                    <div style={{ 
                        background: 'white', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                    }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Find supplier or company..." 
                                style={{ 
                                    width: '100%', 
                                    padding: '10px 15px 10px 40px', 
                                    border: '1px solid #cbd5e1', 
                                    borderRadius: '8px', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 600,
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        display: 'grid', 
                        gridTemplateColumns: window.innerWidth <= 640 ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '15px', 
                        paddingBottom: '20px',
                        alignContent: 'start'
                    }}>
                        {filteredSuppliers.map((sup) => (
                            <div 
                                key={sup.id}
                                onClick={() => setSelectedSupplier(sup)}
                                style={{ 
                                    background: 'white', 
                                    padding: '15px', 
                                    borderRadius: '16px', 
                                    border: selectedSupplier?.id === sup.id ? '2px solid #f97316' : '1px solid #e2e8f0', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={18} />
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', margin: 0 }}>PAYABLE</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 950, color: sup.balance > 0 ? '#ef4444' : '#059669', margin: 0 }}>Rs {sup.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px', marginTop: 0 }}>{sup.name}</h3>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                                    <Building2 size={12} /> {sup.company}
                                </p>
                                
                                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(sup); setActionType('purchase'); setIsActionModalOpen(true); }}
                                        style={{ flex: 1, padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', color: '#1e293b' }}
                                    >+ PURCHASE</button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(sup); setActionType('payment'); setIsActionModalOpen(true); }}
                                        style={{ flex: 1, padding: '8px', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    >PAYMENT</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DETAILS PANEL */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: window.innerWidth <= 1024 ? '16px' : '24px', 
                    border: '1px solid #e2e8f0', 
                    display: (window.innerWidth <= 1024 && !selectedSupplier) ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    width: window.innerWidth <= 1024 ? '100%' : '400px',
                    flexShrink: 0
                }}>
                    {selectedSupplier ? (
                        <>
                            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {window.innerWidth <= 1024 && (
                                            <button onClick={() => setSelectedSupplier(null)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                <X size={16} />
                                            </button>
                                        )}
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b', margin: 0 }}>{selectedSupplier.name}</h4>
                                            <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', margin: 0 }}>{selectedSupplier.company}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setDeleteSupplierData(selectedSupplier)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', margin: 0 }}>CONTACT</p>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', margin: 0 }}>{selectedSupplier.contact || 'N/A'}</p>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', margin: 0 }}>TOTAL BALANCE</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 950, color: selectedSupplier.balance > 0 ? '#ef4444' : '#059669', margin: 0 }}>Rs {selectedSupplier.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                                <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', marginBottom: '15px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={16} /> LEDGER HISTORY
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {selectedSupplier.history?.map((h, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: h.type.includes('Payment') ? '#ecfdf5' : '#fff1f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {h.type.includes('Payment') ? <ArrowDownRight size={16} color="#059669" /> : <ArrowUpRight size={16} color="#ef4444" />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{h.type}</p>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 950, color: h.type.includes('Payment') ? '#059669' : '#ef4444' }}>
                                                        {h.type.includes('Payment') ? '-' : '+'} Rs {h.amount.toLocaleString()}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, margin: '2px 0 0 0' }}>{h.note || 'Manual'}</p>
                                                <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', marginBottom: 0 }}>{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedSupplier.history || selectedSupplier.history.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>
                                            <History size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>No entries.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                <Truck size={36} color="#cbd5e1" />
                            </div>
                            <h3 style={{ color: '#1e293b', fontWeight: 900, fontSize: '1rem', margin: 0 }}>Supplier Details</h3>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginTop: '8px' }}>Select a vendor from the list to view procurement history.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD SUPPLIER MODAL */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#f97316', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', margin: 0 }}>REGISTER NEW SUPPLIER</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddSupplier} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>FULL NAME / OWNER</label>
                                <input required style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="Owner Name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>COMPANY / DISTRIBUTOR</label>
                                <input required style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newSupplier.company} onChange={e => setNewSupplier({...newSupplier, company: e.target.value})} placeholder="Company Name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CONTACT</label>
                                <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newSupplier.contact} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})} placeholder="Phone Number" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>OPENING BALANCE (Rs)</label>
                                <input type="number" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newSupplier.balance} onChange={e => setNewSupplier({...newSupplier, balance: e.target.value})} placeholder="0" />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                style={{ width: '100%', padding: '15px', background: isSaving ? '#94a3b8' : '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                {isSaving ? 'REGISTERING...' : 'REGISTER SUPPLIER'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ACTION MODAL (PURCHASE/PAYMENT) */}
            {isActionModalOpen && selectedSupplier && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: actionType === 'purchase' ? '#ef4444' : '#059669', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', margin: 0 }}>{actionType === 'purchase' ? 'RECORD PURCHASE' : 'RECORD PAYMENT'}</h3>
                            <button onClick={() => setIsActionModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAction} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', margin: 0 }}>VENDOR: {selectedSupplier.company}</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', margin: '4px 0 0 0' }}>Balance: Rs {selectedSupplier.balance.toLocaleString()}</p>
                            </div>
                            
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT (Rs)</label>
                                <input 
                                    type="number"
                                    required
                                    autoFocus
                                    placeholder="0" 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950, color: actionType === 'purchase' ? '#ef4444' : '#059669', outline: 'none', boxSizing: 'border-box' }}
                                    value={actionData.amount}
                                    onChange={(e) => setActionData({ ...actionData, amount: e.target.value })}
                                />
                            </div>

                            {/* INVENTORY SYNC FOR PURCHASES */}
                            {actionType === 'purchase' && (
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f97316', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Plus size={14} /> ADD TO INVENTORY (OPTIONAL)
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>SELECT ITEM</label>
                                            <select 
                                                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}
                                                value={actionData.stock_item_id}
                                                onChange={(e) => setActionData({ ...actionData, stock_item_id: e.target.value })}
                                            >
                                                <option value="">No Inventory Sync</option>
                                                {stockItems.map(item => (
                                                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>QUANTITY</label>
                                            <input 
                                                type="number"
                                                step="any"
                                                placeholder="Qty"
                                                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                                                value={actionData.quantity}
                                                onChange={(e) => setActionData({ ...actionData, quantity: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>INVOICE / NOTES</label>
                                <input 
                                    placeholder="Reference..." 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                                    value={actionData.note}
                                    onChange={(e) => setActionData({ ...actionData, note: e.target.value })}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                style={{ width: '100%', padding: '15px', background: isSaving ? '#94a3b8' : (actionType === 'purchase' ? '#ef4444' : '#059669'), color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                {isSaving ? 'PROCESSING...' : (actionType === 'purchase' ? 'RECORD PURCHASE' : 'RECORD PAYMENT')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE SUPPLIER MODAL */}
            {deleteSupplierData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setDeleteSupplierData(null)} />
                    <div style={{ position: 'relative', background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 12px rgba(239,68,68,0.15)' }}>
                            <Trash2 size={28} />
                        </div>
                        
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.02em', marginBottom: '8px', marginTop: 0 }}>Remove Supplier?</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', marginTop: 0 }}>
                            Are you sure you want to permanently delete <strong style={{ color: '#1e293b' }}>{deleteSupplierData.name}</strong> from <strong style={{ color: '#1e293b' }}>{deleteSupplierData.company}</strong>? This will clear their ledger history.
                        </p>

                        {deleteSupplierData.balance > 0 && (
                            <div style={{ background: '#fff1f1', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', marginBottom: '24px' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', margin: 0, textTransform: 'uppercase' }}>Attention: Outstanding Balance</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 950, color: '#ef4444', margin: '2px 0 0 0' }}>Rs {deleteSupplierData.balance.toLocaleString()}</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button 
                                type="button"
                                onClick={() => setDeleteSupplierData(null)}
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={executeDeleteSupplier}
                                disabled={isSaving}
                                style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierManagement;
