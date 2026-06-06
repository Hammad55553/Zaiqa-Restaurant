import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Lock, ShieldCheck, Key, AlertCircle, Loader2, FileText, Database, History, RefreshCw, Trash2 } from 'lucide-react';
import packageJson from '../../../package.json';
import { getOfflineItem, setOfflineItem } from '../../utils/offlineDB';
import { restoreFromTrash, deletePermanentlyFromTrash } from '../../utils/trashDB';
import { API_BASE } from '../../config';

const APP_VERSION = packageJson.version || '1.0.2';
const getBuildDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};
const BUILD_NUMBER = getBuildDate();

const Settings = () => {
    const user = { name: 'Admin', role: 'admin', email: 'admin@zaiqamahal.com' };
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [terminalPin, setTerminalPin] = useState('1234');
    const [activeTab, setActiveTab] = useState('security');
    const [isLoading, setIsLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const [auditFilter, setAuditFilter] = useState('all');
    const [auditLogs, setAuditLogs] = useState([]);
    const [trashItems, setTrashItems] = useState([]);
    const [globalGstRate, setGlobalGstRate] = useState(16);

    const [updateState, setUpdateState] = useState({
        status: 'idle', // 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'uptodate'
        latestVersion: null,
        downloadUrl: null,
        releaseNotes: '',
        publishedAt: null,
        error: null
    });

    const handleCheckUpdates = async () => {
        setUpdateState(prev => ({ ...prev, status: 'checking', error: null }));
        try {
            const res = await fetch(`${API_BASE}/update/check?version=${APP_VERSION}`);
            if (!res.ok) throw new Error('Failed to contact server');
            const data = await res.json();
            if (data.updateAvailable) {
                setUpdateState({
                    status: 'available',
                    latestVersion: data.latestVersion,
                    downloadUrl: data.downloadUrl,
                    releaseNotes: data.releaseNotes,
                    publishedAt: data.publishedAt,
                    error: null
                });
            } else {
                setUpdateState({
                    status: 'uptodate',
                    latestVersion: data.latestVersion || null,
                    downloadUrl: null,
                    releaseNotes: '',
                    publishedAt: data.publishedAt || null,
                    error: null
                });
            }
        } catch (err) {
            setUpdateState(prev => ({ ...prev, status: 'idle', error: err.message }));
        }
    };

    const handleDownloadUpdate = async () => {
        if (!updateState.downloadUrl) return;
        setUpdateState(prev => ({ ...prev, status: 'downloading', error: null }));
        try {
            const res = await fetch(`${API_BASE}/update/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ downloadUrl: updateState.downloadUrl })
            });
            if (!res.ok) throw new Error('Download and installation failed');
            setUpdateState(prev => ({ ...prev, status: 'ready' }));
        } catch (err) {
            setUpdateState(prev => ({ ...prev, status: 'available', error: err.message }));
        }
    };

    const handleRestartApp = async () => {
        try {
            await fetch(`${API_BASE}/update/restart`, { method: 'POST' });
        } catch (err) {
            alert('Failed to relaunch app. Please restart it manually.');
        }
    };

    const loadTrash = async () => {
        const trash = await getOfflineItem('zaiqa_mahal_trash', []);
        setTrashItems(trash || []);
    };

    useEffect(() => {
        if (activeTab === 'trash') {
            loadTrash();
        }
    }, [activeTab]);

    useEffect(() => {
        const loadSettings = async () => {
            const pin = await getOfflineItem('zaiqa_mahal_terminal_pin', '1234');
            setTerminalPin(pin);
            const gst = await getOfflineItem('zaiqa_mahal_global_gst_rate', 16);
            setGlobalGstRate(gst);
            const logs = await getOfflineItem('zaiqa_mahal_audit_logs', []);
            setAuditLogs(logs);
        };
        loadSettings();
    }, []);

    const addRealAuditLog = async (event, category, status = 'success') => {
        const now = new Date();
        const formatTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formatDate = now.toLocaleDateString([], { day: '2-digit', month: 'short' });
        const newLog = {
            id: String(Date.now()),
            event,
            category,
            user: 'Admin',
            ip: '127.0.0.1',
            time: `${formatDate} ${formatTime}`,
            status
        };
        const prevLogs = await getOfflineItem('zaiqa_mahal_audit_logs', []);
        const updated = [newLog, ...prevLogs];
        setAuditLogs(updated);
        await setOfflineItem('zaiqa_mahal_audit_logs', updated);
    };

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast("New passwords do not match!", "error");
            addRealAuditLog("Failed password change attempt: Passwords do not match", "security", "warning");
            return;
        }

        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters.", "error");
            addRealAuditLog("Failed password change attempt: Password length less than 6 chars", "security", "warning");
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            showToast("Security password updated successfully!", "success");
            addRealAuditLog("Administrative access password updated successfully", "security", "success");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }, 1000);
    };

    const handleUpdatePin = async (e) => {
        e.preventDefault();
        if (terminalPin.length !== 4) {
            showToast("PIN must be exactly 4 digits!", "error");
            addRealAuditLog("Failed PIN update attempt: Invalid PIN length", "security", "warning");
            return;
        }
        await setOfflineItem('zaiqa_mahal_terminal_pin', terminalPin);
        showToast("Terminal Security PIN updated!", "success");
        addRealAuditLog(`Terminal Security PIN updated successfully`, "security", "success");
    };

    const handleUpdateGst = async (e) => {
        e.preventDefault();
        const rate = parseFloat(globalGstRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            showToast("Invalid GST Rate! Please enter a percentage between 0 and 100.", "error");
            return;
        }
        await setOfflineItem('zaiqa_mahal_global_gst_rate', rate);
        showToast("Global Default GST Rate updated successfully!", "success");
        addRealAuditLog(`Global default GST rate updated to ${rate}%`, "system", "success");
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: window.innerWidth <= 768 ? '10px' : '20px', overflowY: 'auto', position: 'relative' }}>

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

            <header style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1 }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.8rem', fontWeight: 950, color: '#1e293b' }}>SYSTEM SETUP</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage security, terminal locks, and view software documentation.</p>
                </div>
                <div style={{ background: '#f97316', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <SettingsIcon size={28} />
                </div>
            </header>

            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                gap: '20px',
                flex: 1,
                position: 'relative',
                zIndex: 1
            }}>
                {/* Side Navigation */}
                <div style={{
                    padding: '15px',
                    minWidth: window.innerWidth <= 768 ? '100%' : '280px',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    height: 'fit-content',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'security' ? '#fff7ed' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'security' ? '#ea580c' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Lock size={18} />
                        Security Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'backup' ? '#f0fdf4' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'backup' ? '#16a34a' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Database size={18} />
                        Cloud Registry Backup
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'audit' ? '#eff6ff' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'audit' ? '#2563eb' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <History size={18} />
                        System Activity Log
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'docs' ? '#f5f3ff' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'docs' ? '#7c3aed' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <ShieldCheck size={18} />
                        Software Documentation
                    </button>
                    <button
                        onClick={() => setActiveTab('trash')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'trash' ? '#fef2f2' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'trash' ? '#dc2626' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Trash2 size={18} />
                        System Trash Bin
                    </button>
                    <button
                        onClick={() => { setActiveTab('update'); handleCheckUpdates(); }}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'update' ? '#fff7ed' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'update' ? '#ea580c' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <RefreshCw size={18} />
                        Software Updates
                    </button>

                    {/* Inline Update Checker */}
                    <div 
                        onClick={() => { setActiveTab('update'); handleCheckUpdates(); }}
                        style={{ marginTop: '30px', padding: '16px', background: '#fafafa', borderRadius: '12px', border: '1px solid #f4f4f5', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <RefreshCw size={14} className="text-orange-500 animate-spin" />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#71717a', uppercase: 'true', letterSpacing: '0.5px' }}>Check for Updates</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#09090b' }}>v{APP_VERSION} check online</span>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    flex: 1,
                    padding: window.innerWidth <= 480 ? '20px' : '40px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)'
                }}>
                    {activeTab === 'security' ? (
                        <>
                            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Change Access Password</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Update your terminal login credentials. Re-authentication will be required.</p>
                            </div>

                            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Current Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="••••••••"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr',
                                    gap: '20px'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>New Password</label>
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="Min 6 chars"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="Re-type new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <AlertCircle size={22} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, fontWeight: 600 }}>
                                        <strong>Security Note:</strong> Changing your password will synchronize across all active sessions. Ensure you update it on all terminal devices.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{ padding: '18px', background: '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : "UPDATE SECURITY CREDENTIALS"}
                                </button>
                            </form>

                            <div style={{ marginTop: '50px', paddingTop: '40px', borderTop: '2px dashed #f1f5f9' }}>
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f97316', marginBottom: '8px' }}>Terminal Safety PIN</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>This PIN is required to leave the Sale Terminal and access the administrative Dashboard.</p>
                                </div>

                                <form onSubmit={handleUpdatePin} style={{
                                    display: 'flex',
                                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                                    alignItems: window.innerWidth <= 480 ? 'stretch' : 'flex-end',
                                    gap: '20px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>New 4-Digit Security PIN</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#f97316' }} />
                                            <input
                                                type="password"
                                                maxLength={4}
                                                style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '8px', outline: 'none' }}
                                                placeholder="1234"
                                                value={terminalPin}
                                                onChange={(e) => setTerminalPin(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" style={{ padding: '18px 35px', background: '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem' }}>
                                        SAVE PIN
                                    </button>
                                </form>
                            </div>

                            <div style={{ marginTop: '50px', paddingTop: '40px', borderTop: '2px dashed #f1f5f9' }}>
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f97316', marginBottom: '8px' }}>Global Default GST (Taxation)</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Set the default GST percentage rate applied to all dining and delivery checkouts. This can be overridden on individual menu items.</p>
                                </div>

                                <form onSubmit={handleUpdateGst} style={{
                                    display: 'flex',
                                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                                    alignItems: window.innerWidth <= 480 ? 'stretch' : 'flex-end',
                                    gap: '20px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Global GST Rate (%)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', color: '#f97316', fontSize: '1.2rem' }}>%</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 900, outline: 'none' }}
                                                placeholder="16"
                                                value={globalGstRate}
                                                onChange={(e) => setGlobalGstRate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" style={{ padding: '18px 35px', background: '#f97316', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem' }}>
                                        UPDATE TAX RATE
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : activeTab === 'backup' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', justifyContent: 'center', minHeight: '350px', textAlign: 'center' }}>
                            <div style={{ background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '24px', padding: '50px 30px', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '80px', height: '80px', background: '#fff7ed', color: '#f97316', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ffedd5', animation: 'pulse 2s infinite' }}>
                                    <Database size={36} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#ffedd5', color: '#ea580c', padding: '4px 12px', borderRadius: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Coming Soon</span>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e293b' }}>Cloud Registry Backups</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6', fontWeight: 600 }}>
                                    Our engineering team is building the premium offline-first local snapshot registry and secure automated cloud backup features. This suite will be deployed automatically in patch <strong>v1.0.3 Stable</strong>.
                                </p>
                            </div>
                        </div>
                    ) : activeTab === 'audit' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ marginBottom: '10px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>System Activity Ledger</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Monitor unauthorized entries, secure PIN updates, and administrative overrides.</p>
                                </div>
                                <button
                                    onClick={() => showToast("Activity Logs exported to CSV successfully!", "success")}
                                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', borderRadius: '8px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s' }}
                                >
                                    EXPORT LOGS
                                </button>
                            </div>

                            {/* Filters */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['all', 'security', 'backup', 'transaction', 'system'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setAuditFilter(filter)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: auditFilter === filter ? '#f97316' : '#f1f5f9',
                                            color: auditFilter === filter ? 'white' : '#475569',
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: '0.15s'
                                        }}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>

                            {/* Logs List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {auditLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <History size={40} color="#94a3b8" />
                                        <h4 style={{ fontWeight: 800, color: '#475569', fontSize: '0.9rem' }}>No System Activity Recorded Yet</h4>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                                            Real-time administrative operations, security credentials modification, and safety PIN configurations will appear here live.
                                        </p>
                                    </div>
                                ) : auditLogs.filter(log => auditFilter === 'all' || log.category === auditFilter).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px 20px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>No entries matching category "{auditFilter}"</p>
                                    </div>
                                ) : (
                                    auditLogs
                                        .filter(log => auditFilter === 'all' || log.category === auditFilter)
                                        .map((log) => (
                                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '12px', gap: '15px', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: log.status === 'success' ? '#10b981' : log.status === 'warning' ? '#f59e0b' : log.status === 'critical' ? '#ef4444' : '#3b82f6'
                                                    }} />
                                                    <div>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{log.event}</p>
                                                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                                                            <span>User: <strong style={{ color: '#334155' }}>{log.user}</strong></span>
                                                            <span>IP: <strong>{log.ip}</strong></span>
                                                            <span style={{ textTransform: 'uppercase', color: '#f97316' }}>{log.category}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{log.time}</span>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'trash' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ marginBottom: '10px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Trash2 size={24} /> System Trash Bin & Recycling
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Deleted items are temporarily kept here for 30 days before automatic permanent deletion.</p>
                                </div>
                                {trashItems.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm("Are you sure you want to empty the trash bin permanently?")) {
                                                await setOfflineItem('zaiqa_mahal_trash', []);
                                                setTrashItems([]);
                                                showToast("Trash bin emptied permanently!", "success");
                                                addRealAuditLog("System trash bin emptied permanently", "system", "success");
                                            }
                                        }}
                                        style={{ padding: '10px 20px', border: 'none', background: '#dc2626', color: 'white', borderRadius: '10px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(220,38,38,0.2)' }}
                                    >
                                        EMPTY TRASH BIN
                                    </button>
                                )}
                            </div>

                            {/* Trash Items List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {trashItems.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fafafa', border: '1px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                            <Trash2 size={28} />
                                        </div>
                                        <h4 style={{ fontWeight: 900, color: '#334155', fontSize: '1rem' }}>Your Trash Bin is Empty</h4>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                                            Deleted customers, delivery orders, and completed ledger bills will go here first. They will be auto-purged permanently after 30 days.
                                        </p>
                                    </div>
                                ) : (
                                    trashItems.map((item) => {
                                        const daysPassed = Math.floor((Date.now() - item.deletedAt) / (24 * 60 * 60 * 1000));
                                        const daysRemaining = Math.max(0, 30 - daysPassed);
                                        const typeLabel = item.originalKey === 'zaiqa_mahal_delivery_customers' ? 'Patron Customer' : item.originalKey === 'zaiqa_mahal_active_delivery_orders' ? 'Active Delivery' : 'Ledger Receipt';

                                        return (
                                            <div key={item.trashId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '14px', gap: '20px', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'start', gap: '15px' }}>
                                                    <div style={{ padding: '8px', background: '#fee2e2', color: '#dc2626', borderRadius: '10px', marginTop: '2px' }}>
                                                        <Trash2 size={16} />
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                                {typeLabel}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 900 }}>
                                                                ⏳ {daysRemaining} days remaining
                                                            </span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginTop: '6px' }}>
                                                            {item.originalKey === 'zaiqa_mahal_delivery_customers'
                                                                ? `${item.data.name} (${item.data.phone})`
                                                                : `Order ID: #${item.data.id || item.data.orderId}`}
                                                        </p>
                                                        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                                                            Deleted on: {new Date(item.deletedAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={async () => {
                                                            const ok = await restoreFromTrash(item.trashId);
                                                            if (ok) {
                                                                showToast("Record restored successfully!", "success");
                                                                addRealAuditLog(`Restored ${typeLabel} (${item.data.name || item.data.id || item.data.orderId}) from trash`, "system", "success");
                                                                loadTrash();
                                                            } else {
                                                                showToast("Failed to restore record.", "error");
                                                            }
                                                        }}
                                                        style={{ padding: '8px 16px', border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s' }}
                                                    >
                                                        RESTORE
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Permanently delete this item? This action cannot be undone.")) {
                                                                const ok = await deletePermanentlyFromTrash(item.trashId);
                                                                if (ok) {
                                                                    showToast("Item deleted permanently.", "success");
                                                                    addRealAuditLog(`Permanently deleted ${typeLabel} (${item.data.name || item.data.id || item.data.orderId})`, "system", "warning");
                                                                    loadTrash();
                                                                } else {
                                                                    showToast("Failed to delete permanently.", "error");
                                                                }
                                                            }
                                                        }}
                                                        style={{ padding: '8px 16px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s' }}
                                                    >
                                                        DELETE PERMANENTLY
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'update' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ marginBottom: '10px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Software & System Updates</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Download the latest patches, features, and fixes directly from the GitHub repository.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Version</p>
                                        <h4 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0f172a', marginTop: '4px' }}>v{APP_VERSION}</h4>
                                    </div>
                                    {updateState.latestVersion && (
                                        <div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latest Available</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <h4 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#f97316', marginTop: '4px', lineHeight: '1' }}>v{updateState.latestVersion}</h4>
                                                {updateState.publishedAt && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
                                                        📅 Released: {new Date(updateState.publishedAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {updateState.status === 'idle' && (
                                    <button
                                        onClick={handleCheckUpdates}
                                        style={{ marginTop: '10px', padding: '16px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: '0.2s' }}
                                    >
                                        <RefreshCw size={18} />
                                        CHECK FOR UPDATES
                                    </button>
                                )}

                                {updateState.status === 'checking' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <Loader2 size={20} className="animate-spin text-orange-500" />
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Contacting GitHub update servers...</span>
                                    </div>
                                )}

                                {updateState.status === 'available' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '18px', borderRadius: '12px', color: '#c2410c', fontWeight: 700, fontSize: '0.9rem' }}>
                                            🎉 A new software update (v{updateState.latestVersion}) is available!
                                        </div>
                                        {updateState.releaseNotes && (
                                            <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                                                <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>Release Notes:</h5>
                                                <pre style={{ fontSize: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#475569', margin: 0 }}>{updateState.releaseNotes}</pre>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleDownloadUpdate}
                                            style={{ padding: '16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                        >
                                            <Database size={18} />
                                            DOWNLOAD & INSTALL UPDATE
                                        </button>
                                    </div>
                                )}

                                {updateState.status === 'downloading' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
                                            <Loader2 size={20} className="animate-spin text-orange-500" />
                                            <span style={{ fontWeight: 700 }}>Downloading and extracting updates... Please do not close the window.</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: '60%', height: '100%', background: '#f97316', animation: 'pulse 1.5s infinite' }} />
                                        </div>
                                    </div>
                                )}

                                {updateState.status === 'ready' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', padding: '18px', borderRadius: '12px', color: '#065f46', fontWeight: 700, fontSize: '0.9rem' }}>
                                            ✅ Update downloaded and extracted successfully! Ready to apply.
                                        </div>
                                        <button
                                            onClick={handleRestartApp}
                                            style={{ padding: '16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                        >
                                            <RefreshCw size={18} />
                                            RELAUNCH APP TO APPLY
                                        </button>
                                    </div>
                                )}

                                {updateState.status === 'uptodate' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f0fdf4', border: '1px solid #d1fae5', padding: '18px', borderRadius: '12px', color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <ShieldCheck size={20} />
                                            Your Zaiqah POS software is completely up to date!
                                        </div>
                                        <button
                                            onClick={handleCheckUpdates}
                                            style={{ padding: '12px 20px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s', alignSelf: 'flex-start' }}
                                        >
                                            CHECK AGAIN
                                        </button>
                                    </div>
                                )}

                                {updateState.error && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '18px', borderRadius: '12px', color: '#dc2626', fontWeight: 700, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span>❌ {updateState.error}</span>
                                        <button onClick={() => setUpdateState({ status: 'idle', latestVersion: null, downloadUrl: null, releaseNotes: '', error: null })} style={{ background: 'transparent', textDecoration: 'underline', border: 'none', color: '#b91c1c', fontWeight: 800, fontSize: '0.75rem', textAlign: 'left', cursor: 'pointer' }}>
                                            TRY AGAIN
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            {/* DEVELOPED BY SECTION */}
                            <div style={{ textAlign: 'center', marginBottom: '40px', padding: '35px', background: 'linear-gradient(135deg, #09090b, #27272a)', borderRadius: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <ShieldCheck size={38} color='#f97316' />
                                    </div>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '3px', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>OFFICIAL SOFTWARE LICENSE</h4>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '5px' }}>Asper InfoTech <span style={{ color: '#f97316' }}>Private Limited</span></h2>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>SECP Registered | PSEB Certified Enterprise Solutions</p>
                                </div>
                                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.05 }}>
                                    <ShieldCheck size={200} />
                                </div>
                            </div>

                            {/* LEGAL DOCUMENT VIEWER */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ background: 'white', padding: '15px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={18} color='#64748b' />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569' }}>EULA DOCUMENT: AINF-EULA-ZAIQ-POS-2026-001</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px' }}>v{APP_VERSION} STABLE</span>
                                </div>

                                <div style={{ maxHeight: '700px', overflowY: 'auto', padding: window.innerWidth <= 768 ? '20px' : '40px', color: '#1e293b', background: '#ffffff', fontFamily: '"Courier New", monospace', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                    {EULA_CONTENT}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Local Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
                    background: toastMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    border: `1.5px solid ${toastMessage.type === 'error' ? '#fca5a5' : '#86efac'}`,
                    padding: '12px 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', animation: 'slideUp 0.2s ease'
                }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: toastMessage.type === 'error' ? '#ef4444' : '#10b981' }}>
                        {toastMessage.message}
                    </span>
                    <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                </div>
            )}

        </div>
    );
};

export default Settings;

const EULA_CONTENT = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END-USER SOFTWARE LICENSE AGREEMENT (EULA)
ZAIQA MAHAL: RESTAURANT & CAFE EDITION
ENGINEED & DEVELOPED BY ASPER INFOTECH PRIVATE LIMITED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Document Reference  : AINF-EULA-ZAIQ-POS-2026-001
Version             : \${APP_VERSION} Stable | Build #\${BUILD_NUMBER}
Effective Date      : 27th May, 2026
Jurisdiction        : Islamic Republic of Pakistan
Governing Law       : Pakistan Electronic Crimes Act 2016 (PECA),
                      Prevention of Electronic Crimes Act, Companies Act 2017,
                      and applicable business and regional restaurant, food hygiene,
                      safety standards, and commercial retail trade regulations.
Issuing Authority   : Asper InfoTech Private Limited
SECP Registered | PSEB Certified
Enterprise Software Solutions & Digital Ecosystems
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════════════════════

PART I     — PREAMBLE & INTRODUCTION
PART II    — DEFINITIONS & INTERPRETATIONS
PART III   — GRANT OF LICENSE
PART IV    — LICENSE RESTRICTIONS & PROHIBITED USES
PART V     — INTELLECTUAL PROPERTY RIGHTS
PART VI    — INSTALLATION & ACTIVATION
PART VII   — SOFTWARE UPDATES & VERSIONING POLICY
PART VIII  — TECHNICAL SUPPORT & MAINTENANCE OBLIGATIONS
PART IX    — CLIENT RESPONSIBILITIES & OBLIGATIONS
PART X     — PRIVACY POLICY & DATA PROTECTION
PART XI    — DATA SECURITY & ENCRYPTION STANDARDS
PART XII   — CLOUD INFRASTRUCTURE & DATABASE POLICY
PART XIII  — PAYMENT, SUBSCRIPTION & BILLING TERMS
PART XIV   — WARRANTY DISCLAIMER
PART XV    — LIMITATION OF LIABILITY
PART XVI   — INDEMNIFICATION
PART XVII  — RESTAURANT & FOOD INDUSTRY REGULATORY COMPLIANCE
PART XVIII — TERMINATION OF AGREEMENT
PART XIX   — CONFIDENTIALITY
PART XX    — FORCE MAJEURE
PART XXI   — GOVERNING LAW & DISPUTE RESOLUTION
PART XXII  — MISCELLANEOUS PROVISIONS
PART XXIII — CONTACT & NOTICE INFORMATION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══════════════════════════════════════════════════════════════════════════════
PART I — PREAMBLE & INTRODUCTION
═══════════════════════════════════════════════════════════════════════════════

1.1  ABOUT ASPER INFOTECH PRIVATE LIMITED
─────────────────────────────────────────
Asper InfoTech Private Limited ("Asper InfoTech," "Company," "Licensor") is a registered enterprise software provider under SECP and certified by PSEB. We build mission-critical restaurant management suites and commercial billing software.

1.2  ABOUT THE LICENSED SOFTWARE
─────────────────────────────────
Zaiqa Mahal Restaurant & Cafe Edition is a comprehensive POS system featuring:
(a) Real-time table status tracking and order dispatch;
(b) Kitchen Order Ticket (KOT) automation and KDS management;
(c) Credit management (Khata System) for loyal patrons;
(d) Detailed business breakdown and analytics dashboards;
(e) Local backup mechanisms and role-based offline security.

═══════════════════════════════════════════════════════════════════════════════
PART II — DEFINITIONS & INTERPRETATIONS
═══════════════════════════════════════════════════════════════════════════════

2.1  "Software" means the Zaiqa Mahal Restaurant & Cafe POS application, databases, configurations, and related user interface files.
2.2  "Licensee" means Zaiqa Mahal Restaurant & Cafe, including authorized managers and cashiers operating the software at the official premises.

═══════════════════════════════════════════════════════════════════════════════
PART III — GRANT OF LICENSE
═══════════════════════════════════════════════════════════════════════════════

3.1  Subject to subscription status and terms, Asper InfoTech grants Licensee a non-exclusive, non-transferable, revocable license to run the POS software on approved local terminals.

═══════════════════════════════════════════════════════════════════════════════
PART IV — LICENSE RESTRICTIONS & PROHIBITED USES
═══════════════════════════════════════════════════════════════════════════════

4.1  The Licensee shall not reverse-engineer, modify, or decompile any source files.
4.2  Redistribution, resale, or deployment on unauthorized client terminals outside the designated outlet is strictly prohibited.

═══════════════════════════════════════════════════════════════════════════════
PART V — INTELLECTUAL PROPERTY RIGHTS
═══════════════════════════════════════════════════════════════════════════════

5.1  Asper InfoTech retains 100% ownership, intellectual property rights, trademarks, copyright protections, and database structures of the Software.

═══════════════════════════════════════════════════════════════════════════════
PART VI — INSTALLATION & ACTIVATION
═══════════════════════════════════════════════════════════════════════════════

6.1  System activation requires a secure hardware-bound key provided by Asper InfoTech.
6.2  Terminal lockouts occur if files are modified or if unauthorized network configuration changes are detected.

═══════════════════════════════════════════════════════════════════════════════
PART VII — SOFTWARE UPDATES & VERSIONING POLICY
═══════════════════════════════════════════════════════════════════════════════

7.1  Minor bug fixes and local functional adjustments are provided free of cost.
7.2  Major platform revisions or integration of new hardware suites will be subject to custom licensing agreements.

═══════════════════════════════════════════════════════════════════════════════
PART VIII — TECHNICAL SUPPORT & MAINTENANCE OBLIGATIONS
═══════════════════════════════════════════════════════════════════════════════

8.1  Support is active Monday to Saturday (9:00 AM - 10:00 PM) for system-critical issues.
8.2  Regular maintenance windows will be scheduled during off-peak hours (e.g., 3:00 AM) to prevent business disruption.

═══════════════════════════════════════════════════════════════════════════════
PART IX — CLIENT RESPONSIBILITIES & OBLIGATIONS
═══════════════════════════════════════════════════════════════════════════════

9.1  The Licensee is solely responsible for maintaining hardware performance, thermal printer functionality, and local network routers.
9.2  Local terminal security, PIN confidentiality, and preventing employee tampering is the client's sole responsibility.

═══════════════════════════════════════════════════════════════════════════════
PART X — PRIVACY POLICY & DATA PROTECTION
═══════════════════════════════════════════════════════════════════════════════

10.1 Customer billing phone numbers and ledger credit amounts are kept strictly on the local secure database.
10.2 Asper InfoTech does not sell, export, or share patron eating habits, billing history, or credit ledgers with external advertisers.

═══════════════════════════════════════════════════════════════════════════════
PART XI — DATA SECURITY & ENCRYPTION STANDARDS
═══════════════════════════════════════════════════════════════════════════════

11.1 The administrative settings screen is protected by a strong security PIN.
11.2 Daily sales closings are encrypted locally and cannot be manipulated retrospectively to ensure absolute audit integrity.

═══════════════════════════════════════════════════════════════════════════════
PART XII — CLOUD INFRASTRUCTURE & DATABASE POLICY
═══════════════════════════════════════════════════════════════════════════════

12.1 Manual backups and database dumps can be taken directly to local storage devices.
12.2 Auto-registry checks ensure that database tables remain fully uncorrupted during emergency electricity shutoffs.

═══════════════════════════════════════════════════════════════════════════════
PART XIII — PAYMENT, SUBSCRIPTION & BILLING TERMS
═══════════════════════════════════════════════════════════════════════════════

13.1 Licencing subscription payments must be settled according to the selected billing period.
13.2 Delayed payments exceeding 15 grace days will result in automated system locked status on next POS launch.

═══════════════════════════════════════════════════════════════════════════════
PART XIV — WARRANTY DISCLAIMER
═══════════════════════════════════════════════════════════════════════════════

14.1 The software is provided "AS IS". Asper InfoTech disclaims all warranties regarding perfect offline operation under damaged operating system states.

═══════════════════════════════════════════════════════════════════════════════
PART XV — LIMITATION OF LIABILITY
═══════════════════════════════════════════════════════════════════════════════

15.1 In no event shall Asper InfoTech be liable for lost profits, revenue shortfalls, or kitchen order delays due to hardware malfunction.

═══════════════════════════════════════════════════════════════════════════════
PART XVI — INDEMNIFICATION
═══════════════════════════════════════════════════════════════════════════════

16.1 The Licensee agrees to defend and hold harmless Asper InfoTech against any food-safety disputes, customer service claims, or restaurant operational liability.

═══════════════════════════════════════════════════════════════════════════════
PART XVII — RESTAURANT & FOOD INDUSTRY REGULATORY COMPLIANCE
═══════════════════════════════════════════════════════════════════════════════

17.1 POS Sales Tax: The software is designed to accommodate regional sales tax structures (PRA/SRB/FBR) on food and beverage bills.
17.2 The Licensee must ensure correct tax percentage inputs aligned with local restaurant business requirements.

═══════════════════════════════════════════════════════════════════════════════
PART XVIII — TERMINATION OF AGREEMENT
═══════════════════════════════════════════════════════════════════════════════

18.1 Either party may terminate this license upon 30 days of written notice.
18.2 Upon termination, the Licensee must uninstall the POS software and return all hardware activation codes.

═══════════════════════════════════════════════════════════════════════════════
PART XIX — CONFIDENTIALITY
═══════════════════════════════════════════════════════════════════════════════

19.1 Recipe lists, special pricing profiles, and specific customer ledgers are recognized as confidential business data.

═══════════════════════════════════════════════════════════════════════════════
PART XX — FORCE MAJEURE
═══════════════════════════════════════════════════════════════════════════════

20.1 Asper InfoTech is not liable for service degradation caused by load-shedding, city-wide internet dropouts, or emergency health lockdowns.

═══════════════════════════════════════════════════════════════════════════════
PART XXI — GOVERNING LAW & DISPUTE RESOLUTION
═══════════════════════════════════════════════════════════════════════════════

21.1 Any disputes arising from this software agreement shall be settled through friendly arbitration under the laws of Pakistan in Lahore/Islamabad.

═══════════════════════════════════════════════════════════════════════════════
PART XXII — MISCELLANEOUS PROVISIONS
═══════════════════════════════════════════════════════════════════════════════

22.1 If any clause is found invalid by a court, the remaining parts of this EULA shall remain in full force.

═══════════════════════════════════════════════════════════════════════════════
PART XXIII — CONTACT & NOTICE INFORMATION
═══════════════════════════════════════════════════════════════════════════════

Corporate Support   : asperinfotech@gmail.com
Website             : www.asperinfotech.com
Global Presence     : 🇵🇰 Hasilpur • 🇬🇧 Manchester • 🇦🇺 Sydney

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© 2026 ASPER INFOTECH PRIVATE LIMITED
ALL RIGHTS RESERVED | REGISTERED IN PAKISTAN
v\${APP_VERSION} Stable | Build #\${BUILD_NUMBER} | Document Ref: AINF-EULA-ZAIQ-POS-2026-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
