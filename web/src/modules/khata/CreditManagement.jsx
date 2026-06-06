import React, { useState, useEffect, useMemo } from 'react';
import Logo from '../../assets/Logo.jpg';
import {
    Trash2,
    Edit3,
    UserPlus,
    Search,
    Phone,
    History,
    ArrowDownCircle,
    ArrowUpCircle,
    User,
    CreditCard,
    Share2,
    FileText,
    Download,
    X,
    MessageCircle,
    HelpCircle,
    Loader2,
    CheckCircle
} from 'lucide-react';
import { API_BASE } from '../../config';

const CreditManagement = ({ initialCustomerId }) => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCust, setSelectedCust] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportPreviewMode, setExportPreviewMode] = useState(null); // 'image', 'pdf', 'excel'
    const [khataType, setKhataType] = useState('Client');
    const [isSaving, setIsSaving] = useState(false);

    // Custom Local Toast
    const [toastMessage, setToastMessage] = useState(null);

    const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '', type: 'Client', balance: '' });
    const [editData, setEditData] = useState({ id: '', name: '', phone: '', email: '', address: '', type: 'Client' });

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_BASE}/customers`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
                // Keep selected customer synchronized if it is open
                if (selectedCust) {
                    const updated = data.find(c => c.id === selectedCust.id);
                    if (updated) setSelectedCust(updated);
                }
            }
        } catch (err) {
            console.error("Failed to fetch customers", err);
            showToast('Error loading customers', 'error');
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (initialCustomerId && customers.length > 0) {
            const initCust = customers.find(c => String(c.id) === String(initialCustomerId));
            if (initCust) {
                setSelectedCust(initCust);
                setKhataType(initCust.type || 'Client');
            }
        }
    }, [initialCustomerId, customers]);

    // Financial Overviews
    const totals = useMemo(() => {
        if (!customers) return { receivable: 0, payable: 0 };
        return customers.reduce((acc, c) => {
            const type = c.type || 'Client';
            if (type === 'Client') acc.receivable += (c.balance || 0);
            else acc.payable += (c.balance || 0);
            return acc;
        }, { receivable: 0, payable: 0 });
    }, [customers]);

    const filtered = useMemo(() => {
        if (!customers) return [];
        return customers.filter(c =>
            (c.type || 'Client') === khataType &&
            (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm))
        ).sort((a, b) => b.balance - a.balance);
    }, [customers, khataType, searchTerm]);

    const [deleteCustData, setDeleteCustData] = useState(null);

    const executeDeleteCustomer = async () => {
        if (!deleteCustData) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/customers/${deleteCustData.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                showToast('Customer account deleted successfully');
                setSelectedCust(null);
                fetchCustomers();
            } else {
                showToast('Failed to delete customer', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
            setDeleteCustData(null);
        }
    };

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        if (!editData.name || !editData.phone) return showToast('Name and phone are required', 'error');

        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/customers/${editData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editData.name,
                    phone: editData.phone,
                    email: editData.email || '',
                    address: editData.address || ''
                })
            });

            if (res.ok) {
                showToast('Customer details updated');
                setIsEditModalOpen(false);
                fetchCustomers();
            } else {
                showToast('Failed to update details', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = async (type) => {
        if (!amount || parseFloat(amount) <= 0) return showToast('Please enter a valid amount', 'error');
        if (!selectedCust) return;

        const finalAmount = parseFloat(amount);
        setIsSaving(true);

        try {
            const res = await fetch(`${API_BASE}/customers/${selectedCust.id}/ledger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    amount: finalAmount,
                    note: note || (type === 'credit' ? 'Manual Credit' : 'Payment Received')
                })
            });

            if (res.ok) {
                showToast(type === 'credit' ? 'Debt recorded successfully!' : 'Payment received successfully!');
                setAmount('');
                setNote('');
                fetchCustomers();
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

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!newCust.name || !newCust.phone) return showToast('Name and Phone are required', 'error');

        setIsSaving(true);
        const customerData = {
            id: `CUST-${Date.now()}`,
            name: newCust.name,
            phone: newCust.phone,
            email: newCust.email || '',
            address: newCust.address || '',
            type: newCust.type,
            balance: parseFloat(newCust.balance) || 0
        };

        try {
            const res = await fetch(`${API_BASE}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });

            if (res.ok) {
                showToast('New account registered in offline database');
                setIsAddModalOpen(false);
                setNewCust({ name: '', phone: '', email: '', address: '', type: 'Client', balance: '' });
                fetchCustomers();
            } else {
                showToast('Registration failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportWhatsApp = (cust) => {
        const text = `*Zaiqa Mahal - Khata Summary*\n\n*Customer:* ${cust.name}\n*Total Balance:* Rs ${cust.balance.toLocaleString()}\n\n*Last Transactions:*\n${cust.history?.slice(0, 5).map(h => `- ${new Date(h.date).toLocaleDateString()}: Rs ${h.amount} (${h.type === 'credit' ? 'Udhaar' : 'Jama'})`).join('\n')}\n\n_Please clear your dues at your earliest convenience._`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/${cust.phone?.replace(/[^0-9]/g, '')}?text=${encodedText}`, '_blank');
    };

    const handlePrintLedger = () => {
        window.print();
    };

    const handleExportExcel = (cust) => {
        const rows = [
            ["Date", "Description", "Type", "Amount"],
            ...(cust.history || []).map(h => [new Date(h.date).toLocaleDateString(), h.note || '—', h.type.toUpperCase(), h.amount])
        ];
        let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${cust.name}_Ledger.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

            {/* Local Toast Notification */}
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
                            <CreditCard size={window.innerWidth <= 480 ? 20 : 28} color="#f97316" />
                        </div>
                        EXECUTIVE KHATA HUB
                    </h2>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '5px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <p style={{ color: '#64748b', margin: 0 }}>Receivables: <span style={{ color: '#ef4444' }}>Rs {totals.receivable.toLocaleString()}</span></p>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <p style={{ color: '#64748b', margin: 0 }}>Payables: <span style={{ color: '#059669' }}>Rs {totals.payable.toLocaleString()}</span></p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setNewCust({ ...newCust, type: khataType });
                        setIsAddModalOpen(true);
                    }}
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
                    <UserPlus size={18} /> REGISTER {khataType.toUpperCase()}
                </button>
            </header>

            {/* TAB SWITCHER */}
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                {['Client', 'Company'].map(t => (
                    <button
                        key={t}
                        onClick={() => {
                            setKhataType(t);
                            setSelectedCust(null);
                        }}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '10px',
                            border: khataType === t ? 'none' : '1px solid #cbd5e1',
                            fontWeight: 900,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            backgroundColor: khataType === t ? '#18181b' : 'white',
                            color: khataType === t ? 'white' : '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t} Accounts
                    </button>
                ))}
            </div>

            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row',
                gap: '20px',
                flex: 1,
                overflow: 'hidden'
            }}>

                {/* Left: Customer Selection Wall */}
                <div style={{
                    display: (window.innerWidth <= 1024 && selectedCust) ? 'none' : 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    width: window.innerWidth <= 1024 ? '100%' : '300px',
                    overflow: 'hidden',
                    flexShrink: 0
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
                                placeholder={`Find ${khataType.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        paddingBottom: '20px'
                    }}>
                        {filtered.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCust(c)}
                                style={{
                                    padding: '15px',
                                    borderRadius: '16px',
                                    border: selectedCust?.id === c.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    backgroundColor: 'white',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>{c.name}</span>
                                    <span style={{ fontWeight: 950, fontSize: '0.9rem', color: c.balance > 0 ? '#ef4444' : '#059669' }}>
                                        Rs {c.balance.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                    <span>📞 {c.phone}</span>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{khataType}</span>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>
                                <User size={48} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>No accounts found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Account Ledger & Actions */}
                <div style={{
                    flex: 1,
                    display: (window.innerWidth <= 1024 && !selectedCust) ? 'none' : 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    minWidth: 0,
                    overflow: 'hidden'
                }}>
                    {selectedCust ? (
                        <>
                            <div style={{
                                background: 'white',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                flex: 1
                            }}>
                                <div style={{
                                    padding: '20px',
                                    background: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px',
                                    flexShrink: 0
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {window.innerWidth <= 1024 && (
                                            <button onClick={() => setSelectedCust(null)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><X size={16} /></button>
                                        )}
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b', margin: 0 }}>{selectedCust.name}</h4>
                                            <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', margin: 0 }}>📞 {selectedCust.phone}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                                            <button onClick={() => { setEditData({ ...selectedCust }); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', padding: '2px' }}><Edit3 size={16} /></button>
                                            <button onClick={() => setDeleteCustData(selectedCust)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', margin: 0 }}>STATEMENT BALANCE</p>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 950, color: selectedCust.balance > 0 ? '#ef4444' : '#059669', margin: 0 }}>
                                            Rs {selectedCust.balance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {selectedCust.address && (
                                    <div style={{ padding: '10px 20px', borderBottom: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#475569', fontWeight: 700, background: '#fcfdfd' }}>
                                        🏠 Address: {selectedCust.address}
                                    </div>
                                )}

                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8fafc' }}>
                                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>Date & Time</th>
                                                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>Note / Details</th>
                                                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                        Debit (+)
                                                        <HelpCircle size={12} color="#f97316" style={{ cursor: 'help' }} onClick={() => showToast("DEBIT (+): Udhaar / Bill amount jo humne lena hai.", "info")} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                        Credit (-)
                                                        <HelpCircle size={12} color="#059669" style={{ cursor: 'help' }} onClick={() => showToast("CREDIT (-): Wasuli / Payment amount jo customer ne jama karwai.", "info")} />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCust.history?.map((h, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                                                        {new Date(h.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                                        {h.note || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#ef4444', fontWeight: 900, fontSize: '0.85rem', textAlign: 'right' }}>
                                                        {h.type === 'credit' ? `Rs ${h.amount.toLocaleString()}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#059669', fontWeight: 900, fontSize: '0.85rem', textAlign: 'right' }}>
                                                        {h.type === 'payment' ? `Rs ${h.amount.toLocaleString()}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!selectedCust.history || selectedCust.history.length === 0) && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>
                                                        <History size={32} style={{ opacity: 0.3, marginBottom: '8px', display: 'inline-block' }} />
                                                        <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>No transaction history found</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Panel */}
                            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', flexShrink: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1.5fr auto auto', gap: '15px', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>AMOUNT (Rs)</label>
                                        <input
                                            type="number"
                                            style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' }}
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>NOTE / DETAILS</label>
                                        <input
                                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 700, outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            placeholder="e.g. Feed purchase, bill payment..."
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleAction('payment')}
                                            disabled={isSaving}
                                            style={{ flex: 1, background: '#059669', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.7rem', padding: '10px 15px' }}
                                        >
                                            <ArrowDownCircle size={18} />
                                            PAYMENT (CREDIT)
                                        </button>
                                        <button
                                            onClick={() => handleAction('credit')}
                                            disabled={isSaving}
                                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.7rem', padding: '10px 15px' }}
                                        >
                                            <ArrowUpCircle size={18} />
                                            DEBT/BILL (DEBIT)
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsExportModalOpen(true);
                                            setExportPreviewMode('pdf');
                                        }}
                                        style={{ background: '#f8fafc', color: '#f97316', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '100%', boxSizing: 'border-box' }}
                                    >
                                        <Share2 size={18} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>SHARE</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                <User size={36} color="#cbd5e1" />
                            </div>
                            <h3 style={{ color: '#1e293b', fontWeight: 900, fontSize: '1rem', margin: 0 }}>Select Account Ledger</h3>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginTop: '8px' }}>
                                Search or click on an account from the left panel to view their statement.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* LEDGER EXPORT MODAL */}
            {isExportModalOpen && selectedCust && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '900px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                        height: window.innerWidth <= 768 ? '95vh' : '80vh'
                    }}>
                        {/* SIDEBAR OPTIONS */}
                        <div style={{
                            width: window.innerWidth <= 768 ? '100%' : '260px',
                            background: '#f8fafc',
                            padding: '25px',
                            borderRight: window.innerWidth <= 768 ? 'none' : '1px solid #e2e8f0',
                            borderBottom: window.innerWidth <= 768 ? '1px solid #e2e8f0' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 950, color: '#0f172a', margin: 0 }}>Export Options</h3>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0' }}>Generate statement invoice for {selectedCust.name}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'row' : 'column', gap: '10px', flexWrap: 'wrap' }}>
                                <button onClick={() => setExportPreviewMode('image')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: exportPreviewMode === 'image' ? '#18181b' : 'white', color: exportPreviewMode === 'image' ? 'white' : '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>
                                    <MessageCircle size={18} color="#10b981" /> WhatsApp
                                </button>
                                <button onClick={() => setExportPreviewMode('pdf')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: exportPreviewMode === 'pdf' ? '#18181b' : 'white', color: exportPreviewMode === 'pdf' ? 'white' : '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>
                                    <FileText size={18} color="#ef4444" /> Print/PDF
                                </button>
                                <button onClick={() => handleExportExcel(selectedCust)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>
                                    <Download size={18} color="#0ea5e9" /> Excel CSV
                                </button>
                            </div>

                            <button onClick={() => setIsExportModalOpen(false)} style={{ width: '100%', padding: '12px', background: '#e2e8f0', border: 'none', borderRadius: '12px', fontWeight: 900, color: '#475569', cursor: 'pointer', marginTop: 'auto' }}>Close Panel</button>
                        </div>

                        {/* PREVIEW AREA */}
                        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#94a3b8', display: 'flex', justifyContent: 'center' }}>
                            <div id="ledger-document" className="receipt-print-wrapper" style={{
                                background: 'white',
                                width: '72mm',
                                minHeight: 'fit-content',
                                color: '#000',
                                fontFamily: "'Courier New', Courier, monospace",
                                fontSize: '11px',
                                lineHeight: '1.55',
                                padding: '5mm 4mm',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                boxSizing: 'border-box'
                            }}>
                                {/* Zaiqa Mahal Logo */}
                                <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
                                    <img src={Logo} alt="logo" style={{ width: '18mm', height: '18mm', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                                </div>

                                {/* Store Header */}
                                <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
                                    <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'serif', lineHeight: '1.2' }}>
                                        ZAIQA MAHAL
                                    </div>
                                    <div style={{ fontSize: '9px', color: '#000', marginTop: '2mm', lineHeight: '1.7' }}>
                                        Chishtian Road, Near Ali Park Hasilpur<br />
                                        Ph: 0300-3910101
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />

                                {/* Title */}
                                <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', marginBottom: '2mm' }}>
                                    KHATA STATEMENT
                                </div>

                                {/* Meta Info */}
                                <div style={{ marginBottom: '1.5mm' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5mm' }}>
                                        <span style={{ fontWeight: '700' }}>Name:</span>
                                        <span>{selectedCust.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5mm' }}>
                                        <span style={{ fontWeight: '700' }}>Phone:</span>
                                        <span>{selectedCust.phone}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5mm' }}>
                                        <span style={{ fontWeight: '700' }}>Type:</span>
                                        <span>{khataType} Account</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5mm' }}>
                                        <span style={{ fontWeight: '700' }}>Date:</span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />

                                {/* Ledger Table Headers */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '1mm' }}>
                                    <span style={{ flex: 1 }}>DATE & NOTE</span>
                                    <span style={{ textAlign: 'right', minWidth: '45px' }}>DR(+)</span>
                                    <span style={{ textAlign: 'right', minWidth: '45px' }}>CR(-)</span>
                                </div>
                                <div style={{ borderTop: '1px solid #000', margin: '1mm 0' }} />

                                {/* Ledger Rows */}
                                <div style={{ marginBottom: '1mm' }}>
                                    {selectedCust.history?.map((h, i) => (
                                        <div key={i} style={{ marginBottom: '2.5mm', fontSize: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: '700' }}>{new Date(h.date).toLocaleDateString()}</span>
                                                <span style={{ textAlign: 'right', minWidth: '45px', color: '#000', fontWeight: h.type === 'credit' ? '900' : 'normal' }}>
                                                    {h.type === 'credit' ? `${h.amount.toFixed(0)}` : '—'}
                                                </span>
                                                <span style={{ textAlign: 'right', minWidth: '45px', color: '#000', fontWeight: h.type === 'payment' ? '900' : 'normal' }}>
                                                    {h.type === 'payment' ? `${h.amount.toFixed(0)}` : '—'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#444' }}>{h.note || 'Manual'}</div>
                                        </div>
                                    ))}
                                    {(!selectedCust.history || selectedCust.history.length === 0) && (
                                        <div style={{ textAlign: 'center', fontSize: '10px', padding: '5px 0', color: '#666' }}>
                                            No transaction entries.
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0' }} />

                                {/* Net Balance */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2mm 0' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px' }}>TOTAL BALANCE</span>
                                    <span style={{ fontSize: '13px', fontWeight: '900' }}>Rs. {selectedCust.balance.toLocaleString()}</span>
                                </div>

                                <div style={{ borderTop: '1px solid #000', margin: '1mm 0' }} />

                                {/* Footer */}
                                <div style={{ textAlign: 'center', marginTop: '4mm' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>ZAIQA MAHAL</div>
                                    <div style={{ fontSize: '9px', marginTop: '1mm' }}>Digitally generated Statement</div>
                                    <div style={{ borderTop: '1px dashed #000', margin: '2.5mm 0 1.5mm' }} />
                                    <div style={{ fontSize: '8px', color: '#666' }}>Powered by Zaiqa Mahal POS</div>
                                </div>

                                <div style={{ borderTop: '2px solid #000', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                                    <button
                                        onClick={() => exportPreviewMode === 'image' ? handleExportWhatsApp(selectedCust) : handlePrintLedger()}
                                        style={{ width: '100%', background: '#f97316', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                                    >
                                        {exportPreviewMode === 'image' ? <MessageCircle size={14} /> : <FileText size={14} />}
                                        {exportPreviewMode === 'image' ? 'SEND WHATSAPP' : 'PRINT LEDGER'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#f97316', padding: '20px', color: 'white', display: 'flex', justifyBetween: 'space-between', alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', margin: 0 }}>REGISTER NEW {khataType.toUpperCase()}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddCustomer} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>FULL NAME</label>
                                <input required style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} placeholder="e.g. Ali Ahmed" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CONTACT PHONE</label>
                                <input required style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} placeholder="e.g. 03001234567" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>EMAIL ADDRESS</label>
                                <input style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} placeholder="e.g. example@mail.com" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>ADDRESS</label>
                                <textarea style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', minHeight: '60px', resize: 'none', boxSizing: 'border-box' }} value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} placeholder="Full address details..." />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>OPENING BALANCE (Rs)</label>
                                <input type="number" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={newCust.balance} onChange={e => setNewCust({ ...newCust, balance: e.target.value })} placeholder="0" />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                style={{ width: '100%', padding: '15px', background: isSaving ? '#94a3b8' : '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                {isSaving ? 'REGISTERING...' : 'REGISTER ACCOUNT'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#f97316', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', margin: 0 }}>UPDATE DETAILS</h3>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateCustomer} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>FULL NAME</label>
                                <input required style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CONTACT PHONE</label>
                                <input required style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>EMAIL ADDRESS</label>
                                <input style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>ADDRESS</label>
                                <textarea style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', minHeight: '60px', resize: 'none', boxSizing: 'border-box' }} value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                style={{ width: '100%', padding: '15px', background: isSaving ? '#94a3b8' : '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                {isSaving ? 'SAVING CHANGES...' : 'SAVE CHANGES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CUSTOMER MODAL */}
            {deleteCustData && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setDeleteCustData(null)} />
                    <div style={{ position: 'relative', background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', textAlign: 'center' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 12px rgba(239,68,68,0.15)' }}>
                            <Trash2 size={28} />
                        </div>
                        
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.02em', marginBottom: '8px', marginTop: 0 }}>Remove Customer?</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', marginTop: 0 }}>
                            Are you sure you want to permanently delete <strong style={{ color: '#1e293b' }}>{deleteCustData.name}</strong> ({deleteCustData.phone})? This action will wipe their account and all ledger history and cannot be undone.
                        </p>

                        {deleteCustData.balance > 0 && (
                            <div style={{ background: '#fff1f1', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', marginBottom: '24px' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', margin: 0, textTransform: 'uppercase' }}>Remaining Balance Dues</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 950, color: '#ef4444', margin: '2px 0 0 0' }}>Rs {deleteCustData.balance.toLocaleString()}</p>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button 
                                type="button"
                                onClick={() => setDeleteCustData(null)}
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={executeDeleteCustomer}
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

export default CreditManagement;
