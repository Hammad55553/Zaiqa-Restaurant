import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, 
    Plus, 
    Trash2, 
    Calendar, 
    DollarSign, 
    Filter,
    Search,
    ArrowDownRight,
    ArrowUpRight,
    TrendingDown,
    X,
    FileText,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { API_BASE } from '../../config';

const ExpenseTracker = () => {
    const [expenses, setExpenses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [timeRange, setTimeRange] = useState('All'); // 'All', 'Today', 'Week', 'Month', 'Year'
    const [customCategory, setCustomCategory] = useState(''); // Custom category input
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Toast Notification
    const [toastMessage, setToastMessage] = useState(null);

    const [formData, setFormData] = useState({
        category: 'Utilities',
        amount: '',
        description: '',
        date: new Date().toISOString().substring(0, 10)
    });

    const categories = ['Utilities', 'Rent', 'Salary', 'Marketing', 'Maintenance', 'Others'];

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const fetchExpenses = async () => {
        try {
            const res = await fetch(`${API_BASE}/expenses`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (err) {
            console.error("Failed to fetch expenses", err);
            showToast('Error loading expenses', 'error');
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    // Filter & Search Logic
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const matchesSearch = exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  exp.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
            
            // Time Range Filter (Timezone safe localized calendar calculations)
            let matchesTimeRange = true;
            if (timeRange !== 'All') {
                const expDateObj = new Date(exp.date);
                const today = new Date();
                
                // Get YYYY-MM-DD in local timezone
                const getLocalDateStr = (d) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const expDateStr = getLocalDateStr(expDateObj);
                const todayStr = getLocalDateStr(today);

                if (timeRange === 'Today') {
                    matchesTimeRange = expDateStr === todayStr;
                } else if (timeRange === 'Week') {
                    // within 7 days
                    const expStart = new Date(expDateStr).getTime();
                    const todayStart = new Date(todayStr).getTime();
                    const diffTime = todayStart - expStart;
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    matchesTimeRange = diffDays >= 0 && diffDays < 7;
                } else if (timeRange === 'Month') {
                    matchesTimeRange = expDateObj.getMonth() === today.getMonth() && expDateObj.getFullYear() === today.getFullYear();
                } else if (timeRange === 'Year') {
                    matchesTimeRange = expDateObj.getFullYear() === today.getFullYear();
                }
            }
            
            return matchesSearch && matchesCategory && matchesTimeRange;
        });
    }, [expenses, searchTerm, selectedCategory, timeRange]);

    // KPI Calculations based on filtered results
    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [filteredExpenses]);

    const categoryStats = useMemo(() => {
        const stats = {};
        // Seed default categories
        categories.forEach(cat => stats[cat] = 0);
        
        filteredExpenses.forEach(exp => {
            if (stats[exp.category] === undefined) {
                stats[exp.category] = 0;
            }
            stats[exp.category] += exp.amount;
        });
        return stats;
    }, [filteredExpenses]);

    // Handle Form Submit
    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            return showToast('Please enter a valid amount', 'error');
        }

        const finalCategory = formData.category === 'Others' ? (customCategory.trim() || 'Others') : formData.category;

        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: finalCategory,
                    amount: parseFloat(formData.amount),
                    description: formData.description,
                    date: new Date(formData.date).toISOString()
                })
            });

            if (res.ok) {
                showToast('Expense recorded successfully!');
                setIsAddModalOpen(false);
                setCustomCategory('');
                setFormData({
                    category: 'Utilities',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().substring(0, 10)
                });
                fetchExpenses();
            } else {
                showToast('Failed to record expense', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Delete Expense
    const handleDeleteExpense = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense record?')) return;

        try {
            const res = await fetch(`${API_BASE}/expenses/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                showToast('Expense record deleted');
                fetchExpenses();
            } else {
                showToast('Failed to delete expense', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
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
                backgroundImage: `url(/src/assets/Logo.jpg)`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 0.03,
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Toast Notification */}
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
                            <Wallet size={window.innerWidth <= 480 ? 20 : 28} color="#f97316" />
                        </div>
                        EXPENSE TRACKER
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px', marginBottom: 0 }}>
                        Track daily outlet expenditures and category-wise payouts.
                    </p>
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
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', margin: 0 }}>TOTAL EXPENSES</p>
                        <h4 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.4rem', fontWeight: 950, color: '#f97316', margin: 0 }}>
                            Rs {totalExpenses.toLocaleString()}
                        </h4>
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
                        <Plus size={18} /> NEW EXPENSE
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
                
                {/* LEFT: EXPENSE LIST */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '15px', 
                    flex: 1,
                    overflow: 'hidden' 
                }}>
                    {/* SEARCH & FILTER BAR */}
                    <div style={{ 
                        background: 'white', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        flexShrink: 0,
                        display: 'flex',
                        gap: '12px',
                        flexDirection: window.innerWidth <= 480 ? 'column' : 'row'
                    }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Search by description or category..." 
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={16} color="#64748b" />
                            <select
                                style={{
                                    padding: '10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <select
                                style={{
                                    padding: '10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <option value="All">All Time</option>
                                <option value="Today">Today (Daily)</option>
                                <option value="Week">This Week (Weekly)</option>
                                <option value="Month">This Month (Monthly)</option>
                                <option value="Year">This Year (Yearly)</option>
                            </select>
                        </div>
                    </div>

                    {/* EXPENSES TABLE / GRID */}
                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        padding: '10px'
                    }}>
                        {filteredExpenses.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>DATE</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>CATEGORY</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>DESCRIPTION</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'right' }}>AMOUNT</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'center' }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((exp) => (
                                        <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9', hover: { background: '#f8fafc' } }}>
                                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Calendar size={14} color="#f97316" />
                                                    {new Date(exp.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 800,
                                                    background: '#fff7ed',
                                                    color: '#f97316',
                                                    border: '1px solid #ffedd5'
                                                }}>
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                                {exp.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No description</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', textAlign: 'right' }}>
                                                Rs {exp.amount.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <button 
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    style={{ 
                                                        background: '#fee2e2', 
                                                        color: '#ef4444', 
                                                        border: 'none', 
                                                        padding: '6px 10px', 
                                                        borderRadius: '8px', 
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <p style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>No expense records found</p>
                                <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>Try changing the filters or add a new expense.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: BREAKDOWN PANEL */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    padding: '20px',
                    width: window.innerWidth <= 1024 ? '100%' : '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    flexShrink: 0,
                    boxSizing: 'border-box'
                }}>
                    <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingDown size={18} color="#f97316" />
                            CATEGORY BREAKDOWN
                        </h4>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '2px', marginBottom: 0 }}>
                            Track where the budget is spent.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto' }}>
                        {Object.entries(categoryStats).map(([cat, amount]) => {
                            // Don't show custom categories if they have 0 amount to keep it clean
                            if (amount === 0 && !categories.includes(cat)) return null;
                            const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                            
                            return (
                                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>{cat}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>
                                            Rs {amount.toLocaleString()} ({percentage.toFixed(0)}%)
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${percentage}%`, 
                                            height: '100%', 
                                            background: '#f97316', 
                                            borderRadius: '4px',
                                            transition: 'width 0.5s ease-out'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ADD EXPENSE MODAL */}
            {isAddModalOpen && (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    background: 'rgba(15, 23, 42, 0.7)', 
                    backdropFilter: 'blur(4px)', 
                    zIndex: 1000, 
                    display: 'flex', 
                    alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', 
                    justifyContent: 'center' 
                }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#f97316', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', margin: 0 }}>RECORD NEW EXPENSE</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CATEGORY</label>
                                <select 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', background: 'white' }}
                                    value={formData.category}
                                    onChange={e => {
                                        setFormData({ ...formData, category: e.target.value });
                                        if (e.target.value !== 'Others') setCustomCategory('');
                                    }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.category === 'Others' && (
                                <div style={{ 
                                    animation: 'fadeIn 0.2s ease-out',
                                    background: '#f8fafc',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1'
                                }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f97316', display: 'block', marginBottom: '6px' }}>CUSTOM CATEGORY NAME</label>
                                    <input 
                                        type="text" 
                                        required
                                        autoFocus
                                        placeholder="e.g. Marketing, Bonus, Petty Cash" 
                                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} 
                                        value={customCategory} 
                                        onChange={e => setCustomCategory(e.target.value)} 
                                    />
                                </div>
                            )}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>AMOUNT (Rs)</label>
                                <input 
                                    type="number" 
                                    required 
                                    placeholder="0" 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box' }} 
                                    value={formData.amount} 
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>DATE</label>
                                <input 
                                    type="date" 
                                    required 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} 
                                    value={formData.date} 
                                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>DESCRIPTION / NOTE</label>
                                <textarea 
                                    placeholder="e.g. Electric bill paid for May..." 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', height: '80px', resize: 'none', boxSizing: 'border-box' }} 
                                    value={formData.description} 
                                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                style={{ 
                                    width: '100%', 
                                    padding: '15px', 
                                    background: isSaving ? '#94a3b8' : '#f97316', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    fontWeight: 900, 
                                    fontSize: '1rem', 
                                    cursor: isSaving ? 'not-allowed' : 'pointer', 
                                    marginTop: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px' 
                                }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                {isSaving ? 'RECORDING...' : 'RECORD EXPENSE'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ExpenseTracker;
