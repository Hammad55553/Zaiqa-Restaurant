import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, LayoutGrid, Package, FileText, Settings, Bell, Search, Menu as MenuIcon, X, Printer, Truck, Wallet, CreditCard, ChefHat, Utensils, BookOpen, Layers, Phone, Bike, Shield, LogOut } from 'lucide-react';
import POSLayout from './modules/pos/POSLayout';
import KitchenDisplay from './modules/kds/KitchenDisplay';
import SplashScreen from './components/SplashScreen';
import ReceiptPreview from './modules/pos/components/ReceiptPreview';
import InventorySystem from './modules/inventory/InventorySystem';
import StockManager from './modules/stock/StockManager';
import ReportsDashboard from './modules/reports/ReportsDashboard';
import TableManager from './modules/tables/TableManager';
import SupplierManagement from './modules/suppliers/SupplierManagement';
import ExpenseTracker from './modules/expenses/ExpenseTracker';
import CreditManagement from './modules/khata/CreditManagement';
import SettingsView from './modules/settings/Settings';
import DeliveryManager from './modules/delivery/DeliveryManager';
import UserManager from './modules/users/UserManager';
import { API_BASE } from './config';
import { getOfflineItem, setOfflineItem, removeOfflineItem } from './utils/offlineDB';
import { purgeExpiredTrash } from './utils/trashDB';
import { syncService } from './services/syncService';
import { useSyncedData } from './hooks/useSync';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Skip coin splash if already loaded this session (prevents re-show on refresh)
  const [isLoaded, setIsLoaded] = useState(() => {
    try { return sessionStorage.getItem('pos_session_loaded') === 'true'; }
    catch { return false; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('pos'); // 'pos', 'kds', 'inventory', 'reports'

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('pos_current_user', JSON.stringify(data.user));
        const perms = data.user.permissions || [];
        if (perms.length > 0 && !perms.includes(currentView)) {
          setCurrentView(perms[0]);
        }
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Could not connect to authentication server');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pos_current_user');
  };
  
  // Global Search System
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSelectedInvoiceId, setGlobalSelectedInvoiceId] = useState(null);
  const [globalSelectedCustomerId, setGlobalSelectedCustomerId] = useState(null);
  const [globalSelectedDeliveryId, setGlobalSelectedDeliveryId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [khataCustomers, setKhataCustomers] = useState([]);
  const [offlineInvoices, setOfflineInvoices] = useState([]);
  const [offlineDeliveries, setOfflineDeliveries] = useState([]);
  const [notifiedReadyOrderIds, setNotifiedReadyOrderIds] = useState([]);
  const lastNotifiedStockTimesRef = useRef({});

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'System Boot Completed', desc: 'Local IndexedDB synchronized successfully.', time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }), read: false, type: 'info' }
  ]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playNote(659.25, now, 0.4); // E5
      playNote(783.99, now + 0.15, 0.5); // G5
    } catch (e) {
      console.error("Audio Context is blocked or not supported:", e);
    }
  };

  // Unified Auto-Poller: Low Stock Levels & Kitchen KDS Ready Orders
  useEffect(() => {
    const runBackgroundPoller = async () => {
      // 1. Check Low Stock Levels
      try {
        const res = await fetch(`${API_BASE}/stock`);
        if (res.ok) {
          const items = await res.json();
          const lowItems = items.filter(item => item.quantity <= item.min_alert);
          if (lowItems.length > 0) {
            setNotifications(prev => {
              let updated = [...prev];
              let addedNew = false;
              
              lowItems.forEach(item => {
                const lastTime = lastNotifiedStockTimesRef.current[item.id];
                const oneHour = 60 * 60 * 1000;
                
                // Trigger notification if never notified in this session or last notified > 1 hour ago
                if (!lastTime || (Date.now() - lastTime > oneHour)) {
                  const exists = updated.some(n => n.itemId === item.id && n.type === 'warning');
                  if (!exists) {
                    updated.unshift({
                      id: 'stock-' + item.id + '-' + Date.now(),
                      itemId: item.id,
                      title: `Low Stock: ${item.name}`,
                      desc: `Only ${item.quantity} ${item.unit} remaining (Threshold: ${item.min_alert}). Please restock!`,
                      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
                      read: false,
                      type: 'warning'
                    });
                    addedNew = true;
                    lastNotifiedStockTimesRef.current[item.id] = Date.now();
                  }
                }
              });
              if (addedNew) playNotificationSound();
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Stock notification poller error:", err);
      }

      // 2. Check Kitchen Ready Orders
      try {
        const res = await fetch(`${API_BASE}/orders/active`);
        if (res.ok) {
          const activeOrders = await res.json();
          const readyOrders = activeOrders.filter(order => order.status === 'ready');
          
          if (readyOrders.length > 0) {
            setNotifiedReadyOrderIds(prevNotified => {
              let newlyNotified = [...prevNotified];
              let addedNewNotification = false;
              
              setNotifications(prevNotifications => {
                let updatedNotifications = [...prevNotifications];
                
                readyOrders.forEach(order => {
                  const alreadyNotified = newlyNotified.includes(order.id);
                  if (!alreadyNotified) {
                    updatedNotifications.unshift({
                      id: 'ready-order-' + order.id + '-' + Date.now(),
                      orderId: order.id,
                      title: `Order Ready: Table ${order.table_number}`,
                      desc: `Order #${order.id} is prepared and ready to serve! Please pick it up.`,
                      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
                      read: false,
                      type: 'success'
                    });
                    newlyNotified.push(order.id);
                    addedNewNotification = true;
                  }
                });
                
                if (addedNewNotification) {
                  playNotificationSound();
                }
                return updatedNotifications;
              });
              
              return newlyNotified;
            });
          }
        }
      } catch (err) {
        console.error("Kitchen ready orders poller error:", err);
      }
    };

    setTimeout(runBackgroundPoller, 3000);
    // Poll every 8 seconds for real-time responsiveness
    const interval = setInterval(runBackgroundPoller, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initAppOfflineData = async () => {
      await purgeExpiredTrash();

      // Proactive migration layer: Migrate legacy localStorage records to high-capacity IndexedDB
      const localInvoicesStr = localStorage.getItem('zaiqa_mahal_completed_invoices');
      const dbInvoices = await getOfflineItem('zaiqa_mahal_completed_invoices');
      if ((!dbInvoices || (Array.isArray(dbInvoices) && dbInvoices.length === 0)) && localInvoicesStr) {
        try {
          const parsed = JSON.parse(localInvoicesStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await setOfflineItem('zaiqa_mahal_completed_invoices', parsed);
          }
        } catch (err) {
          console.error("Migration error for completed invoices:", err);
        }
      }

      const localDeliveriesStr = localStorage.getItem('zaiqa_mahal_active_delivery_orders');
      const dbDeliveries = await getOfflineItem('zaiqa_mahal_active_delivery_orders');
      if ((!dbDeliveries || (Array.isArray(dbDeliveries) && dbDeliveries.length === 0)) && localDeliveriesStr) {
        try {
          const parsed = JSON.parse(localDeliveriesStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await setOfflineItem('zaiqa_mahal_active_delivery_orders', parsed);
          }
        } catch (err) {
          console.error("Migration error for active deliveries:", err);
        }
      }

      const localCustomersStr = localStorage.getItem('zaiqa_mahal_delivery_customers');
      const dbCustomers = await getOfflineItem('zaiqa_mahal_delivery_customers');
      if ((!dbCustomers || (Array.isArray(dbCustomers) && dbCustomers.length === 0)) && localCustomersStr) {
        try {
          const parsed = JSON.parse(localCustomersStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await setOfflineItem('zaiqa_mahal_delivery_customers', parsed);
          }
        } catch (err) {
          console.error("Migration error for delivery customers:", err);
        }
      }

      const invoices = await getOfflineItem('zaiqa_mahal_completed_invoices', []);
      setOfflineInvoices(invoices || []);
      const deliveries = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);
      setOfflineDeliveries(deliveries || []);
    };
    initAppOfflineData();
  }, [globalSearchQuery, currentView]);

  useEffect(() => {
    if (!isLoaded) return;
    const fetchSearchData = async () => {
      try {
        const menuRes = await fetch(`${API_BASE}/inventory`);
        if (menuRes.ok) {
          const data = await menuRes.json();
          setMenuItems(data);
        }
      } catch (err) {
        console.error("Failed to load inventory for search", err);
      }
      try {
        const custRes = await fetch(`${API_BASE}/customers`);
        if (custRes.ok) {
          const data = await custRes.json();
          setKhataCustomers(data);
        }
      } catch (err) {
        console.error("Failed to load customers for search", err);
      }
    };
    fetchSearchData();
  }, [isLoaded]);

  // Initialize real-time sync service when app loads
  useEffect(() => {
    if (!isLoaded || !currentUser) return;
    
    console.log('🚀 Starting real-time sync service for multi-device support');
    syncService.startSync();
    
    return () => {
      syncService.stopSync();
    };
  }, [isLoaded, currentUser]);

  if (!isLoaded) {
    return <SplashScreen onComplete={() => {
      try { sessionStorage.setItem('pos_session_loaded', 'true'); } catch {}
      setIsLoaded(true);
    }} />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/[0.02] border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 space-y-8 relative z-10">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-orange-500/30 shadow-lg shadow-orange-500/10">
              <img src="./Logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-wide">ZAIQA MAHAL</h2>
              <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mt-1">POS Gate</p>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-center">
              <p className="text-xs text-red-400 font-bold">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="Enter staff username..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-orange-500 text-white font-medium text-sm transition-all placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Access Key</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-orange-500 text-white font-medium text-sm transition-all placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-55"
            >
              {loginLoading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navigateTo = (view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#f8f9fc] overflow-hidden flex-col md:flex-row font-sans relative magic-reveal-dashboard">
      <style>{`
        @keyframes magicReveal {
          0% {
            opacity: 0;
            transform: scale(0.97) translateY(12px);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0px);
          }
        }
        .magic-reveal-dashboard {
          animation: magicReveal 2.0s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: center center;
        }
      `}</style>
      {/* Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 8-Star Luxury Drawer Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] bg-zinc-950 border-r border-zinc-900 z-50 flex flex-col justify-between transform transition-transform duration-500 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {/* Logo Section */}
          <div className="h-24 flex items-center justify-between px-6 border-b border-zinc-900/80 bg-zinc-950/50 shrink-0">
            <div className="flex items-center gap-3">
              <img src="./Logo.jpg" alt="Zaiqa Mahal Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg border border-orange-500/30" />
              <span className="font-display font-black text-2xl tracking-widest text-white">
                ZAIQA
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-orange-500 transition-colors p-2 bg-zinc-900/50 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex flex-col gap-6 px-4 overflow-y-auto max-h-[calc(100vh-280px)] hide-scrollbar pb-6">
            {/* Section 1: FOH & Kitchen Operations */}
            {(currentUser.username === 'admin' || currentUser.permissions.some(p => ['pos', 'delivery', 'tables', 'kds'].includes(p))) && (
              <div>
                <p className="text-orange-500/70 text-[9px] font-black uppercase tracking-widest px-4 mb-2.5">Operations</p>
                <div className="flex flex-col gap-1.5">
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('pos')) && (
                    <NavItem icon={<LayoutGrid size={20} />} label="Point of Sale" active={currentView === 'pos'} onClick={() => navigateTo('pos')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('delivery')) && (
                    <NavItem icon={<Phone size={20} />} label="Home Delivery" active={currentView === 'delivery'} onClick={() => navigateTo('delivery')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('tables')) && (
                    <NavItem icon={<Utensils size={20} />} label="Table Manager" active={currentView === 'tables'} onClick={() => navigateTo('tables')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('kds')) && (
                    <NavItem icon={<ChefHat size={20} />} label="Kitchen Display" active={currentView === 'kds'} onClick={() => navigateTo('kds')} />
                  )}
                </div>
              </div>
            )}

            {/* Section 2: Management & Stock */}
            {(currentUser.username === 'admin' || currentUser.permissions.some(p => ['inventory', 'stock', 'suppliers'].includes(p))) && (
              <div>
                <p className="text-orange-500/70 text-[9px] font-black uppercase tracking-widest px-4 mb-2.5">Management</p>
                <div className="flex flex-col gap-1.5">
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('inventory')) && (
                    <NavItem icon={<BookOpen size={20} />} label="Menu Manager" active={currentView === 'inventory'} onClick={() => navigateTo('inventory')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('stock')) && (
                    <NavItem icon={<Layers size={20} />} label="Kitchen Stock" active={currentView === 'stock'} onClick={() => navigateTo('stock')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('suppliers')) && (
                    <NavItem icon={<Truck size={20} />} label="Suppliers" active={currentView === 'suppliers'} onClick={() => navigateTo('suppliers')} />
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Accounts & Reports */}
            {(currentUser.username === 'admin' || currentUser.permissions.some(p => ['khata', 'expenses', 'reports'].includes(p))) && (
              <div>
                <p className="text-orange-500/70 text-[9px] font-black uppercase tracking-widest px-4 mb-2.5">Accounts</p>
                <div className="flex flex-col gap-1.5">
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('khata')) && (
                    <NavItem icon={<CreditCard size={20} />} label="Khata Hub" active={currentView === 'khata'} onClick={() => navigateTo('khata')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('expenses')) && (
                    <NavItem icon={<Wallet size={20} />} label="Expenses" active={currentView === 'expenses'} onClick={() => navigateTo('expenses')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('reports')) && (
                    <NavItem icon={<FileText size={20} />} label="Financial Reports" active={currentView === 'reports'} onClick={() => navigateTo('reports')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('pos')) && (
                    <NavItem icon={<Printer size={20} />} label="Receipt Preview" active={currentView === 'receipt'} onClick={() => navigateTo('receipt')} />
                  )}
                </div>
              </div>
            )}
            
            {/* Section 4: System Administration */}
            {(currentUser.username === 'admin' || currentUser.permissions.some(p => ['settings', 'users'].includes(p))) && (
              <div>
                <p className="text-orange-500/70 text-[9px] font-black uppercase tracking-widest px-4 mb-2.5">System</p>
                <div className="flex flex-col gap-1.5">
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('settings')) && (
                    <NavItem icon={<Settings size={20} />} label="Settings" active={currentView === 'settings'} onClick={() => navigateTo('settings')} />
                  )}
                  {(currentUser.username === 'admin' || currentUser.permissions.includes('users')) && (
                    <NavItem icon={<Shield size={20} />} label="User Manager" active={currentView === 'users'} onClick={() => navigateTo('users')} />
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>

        <div className="p-6 mb-2 border-t border-zinc-900/80 bg-zinc-950/50 flex flex-col gap-4">
          <div className="flex items-center gap-4 p-1.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 shadow-inner">
            <div className="w-12 h-12 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <img src="./Logo.jpg" alt="User" className="w-11 h-11 rounded-full object-cover border-2 border-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white tracking-wide truncate">{currentUser.username}</p>
              <p className="text-[11px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-xs font-black text-red-400 uppercase tracking-widest rounded-xl hover:bg-red-950/20 hover:border-red-900/50 transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative w-full transition-all duration-300 bg-[#f8f9fc]">

        {/* Luxury Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-40 shrink-0">

          <div className="flex items-center gap-4 lg:gap-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 bg-zinc-950 rounded-xl shadow-lg shadow-zinc-900/20 text-white hover:bg-zinc-800 hover:text-orange-400 transition-colors group"
            >
              <MenuIcon size={24} className="group-hover:scale-110 transition-transform" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-black text-gray-900">
                {currentView === 'pos' && 'Dashboard'}
                {currentView === 'delivery' && 'Home Delivery'}
                {currentView === 'kds' && 'Kitchen'}
                {currentView === 'inventory' && 'Menu Manager'}
                {currentView === 'stock' && 'Stock Inventory'}
                {currentView === 'suppliers' && 'Suppliers'}
                {currentView === 'tables' && 'Table Manager'}
                {currentView === 'reports' && 'Reports'}
                {currentView === 'expenses' && 'Expense Tracker'}
                {currentView === 'khata' && 'Executive Khata Hub'}
                {currentView === 'settings' && 'System Settings'}
                {currentView === 'users' && 'Staff Directory'}
              </h1>
              <p className="text-xs text-orange-600 font-bold tracking-widest uppercase hidden sm:block mt-1">
                {currentView === 'pos' && 'Point of Sale'}
                {currentView === 'delivery' && 'Home Delivery CRM & Directory'}
                {currentView === 'kds' && 'Kitchen Display System'}
                {currentView === 'inventory' && 'POS Items Management'}
                {currentView === 'stock' && 'Raw Materials & Supply'}
                {currentView === 'reports' && 'Financial Reports'}
                {currentView === 'expenses' && 'Outlet Expenditures'}
                {currentView === 'khata' && 'Client & Company Credit Ledger'}
                {currentView === 'settings' && 'App Configuration & Security'}
                {currentView === 'users' && 'User Role & Permissions Control'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center bg-gray-50 px-4 py-3 rounded-2xl border border-gray-200 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-inner relative">
              <Search size={18} className="text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Global search..." 
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm font-medium w-56 text-gray-700" 
              />
              {globalSearchQuery && (
                <button 
                  onClick={() => setGlobalSearchQuery('')}
                  className="text-gray-400 hover:text-orange-500 transition-colors ml-2"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-600 hover:text-orange-600 hover:border-orange-300 transition-all hover:shadow-md"
              >
                <Bell size={22} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-500 text-white rounded-full border border-white flex items-center justify-center text-[9px] font-black leading-none animate-pulse shadow-md">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl z-[99999] overflow-hidden animate-slideUp text-left">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell size={14} className="text-orange-500" /> Notifications ({notifications.filter(n => !n.read).length})
                    </h4>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        className="text-[10px] font-black text-orange-600 uppercase hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <Bell size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-bold">All caught up!</p>
                        <p className="text-[10px] mt-0.5">No notifications right now.</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                          }}
                          className={`p-3 text-left transition-all hover:bg-gray-50/60 cursor-pointer relative ${!n.read ? 'bg-orange-50/10' : ''}`}
                        >
                          {!n.read && <span className="absolute left-2 top-4 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>}
                          <div className="pl-3.5">
                            <div className="text-xs font-black text-gray-800 flex justify-between gap-2">
                              <span className="truncate">{n.title}</span>
                              <span className="text-[9px] text-gray-400 font-bold flex-shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold mt-1 leading-relaxed">{n.desc}</p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifications(prev => prev.filter(item => item.id !== n.id));
                              }}
                              className="text-[9px] font-bold text-red-500 uppercase mt-1.5 hover:underline block"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="p-2 border-t border-gray-100 text-center bg-gray-50/30">
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[10px] font-black text-red-500 uppercase hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 min-h-0 relative">
          {currentView === 'pos' && (
            <POSLayout 
              globalDirectSelectDeliveryId={globalSelectedDeliveryId}
              onClearGlobalDirectSelectDeliveryId={() => setGlobalSelectedDeliveryId(null)}
            />
          )}
          {currentView === 'delivery' && <DeliveryManager navigateTo={navigateTo} />}
          {currentView === 'kds' && <KitchenDisplay />}
          {currentView === 'receipt' && <ReceiptPreview onClose={() => navigateTo('pos')} initialInvoiceId={globalSelectedInvoiceId} />}
          {currentView === 'inventory' && <InventorySystem />}
          {currentView === 'stock' && <StockManager />}
          {currentView === 'suppliers' && <SupplierManagement />}
          {currentView === 'tables' && <TableManager />}
          {currentView === 'reports' && <ReportsDashboard />}
          {currentView === 'expenses' && <ExpenseTracker />}
          {currentView === 'khata' && <CreditManagement initialCustomerId={globalSelectedCustomerId} />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'users' && <UserManager />}
        </div>
      </main>

      {/* Premium Glassmorphic Global Search Overlay */}
      {globalSearchQuery && (() => {
        const query = globalSearchQuery.toLowerCase();
        
        // 1. Completed Invoices
        const matchedInvoices = offlineInvoices.filter(inv => 
          String(inv.orderId).toLowerCase().includes(query) ||
          String(inv.customerName || '').toLowerCase().includes(query) ||
          String(inv.customerPhone || '').toLowerCase().includes(query) ||
          String(inv.total || '').includes(query)
        ).slice(0, 5);

        // 2. Active Delivery Orders
        const matchedDeliveries = offlineDeliveries.filter(del => 
          String(del.id).toLowerCase().includes(query) ||
          String(del.backendOrderId || '').toLowerCase().includes(query) ||
          String(del.name || '').toLowerCase().includes(query) ||
          String(del.phone || '').toLowerCase().includes(query) ||
          String(del.address || '').toLowerCase().includes(query) ||
          String(del.riderName || '').toLowerCase().includes(query)
        ).slice(0, 5);

        // 3. Khata Customers
        const matchedKhata = khataCustomers.filter(cust => 
          String(cust.name || '').toLowerCase().includes(query) ||
          String(cust.phone || '').toLowerCase().includes(query) ||
          String(cust.address || '').toLowerCase().includes(query)
        ).slice(0, 5);

        // 4. Menu Items
        const matchedMenu = menuItems.filter(item => 
          String(item.name || '').toLowerCase().includes(query) ||
          String(item.category || '').toLowerCase().includes(query) ||
          String(item.price || '').includes(query)
        ).slice(0, 5);

        const hasResults = matchedInvoices.length > 0 || matchedDeliveries.length > 0 || matchedKhata.length > 0 || matchedMenu.length > 0;

        return (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                    <Search size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Global Search Results</h3>
                    <p className="text-xs text-gray-500 font-bold">Matching records for "{globalSearchQuery}"</p>
                  </div>
                </div>
                <button 
                  onClick={() => setGlobalSearchQuery('')}
                  className="p-2.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 rounded-xl transition-all font-bold flex items-center gap-1 text-xs"
                >
                  <X size={16} /> Close Search
                </button>
              </div>

              {/* Results Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {!hasResults ? (
                  <div className="text-center py-16">
                    <div className="text-gray-300 mb-4 flex justify-center"><Search size={48} /></div>
                    <h4 className="text-base font-bold text-gray-800">No matching records found</h4>
                    <p className="text-xs text-gray-400 mt-1">Try typing another order ID, customer name, phone number, or food item.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Category: Completed Bills */}
                    {matchedInvoices.length > 0 && (
                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          📄 Completed Invoices ({matchedInvoices.length})
                        </h4>
                        <div className="space-y-2.5">
                          {matchedInvoices.map(inv => (
                            <div 
                              key={inv.orderId}
                              onClick={() => {
                                setGlobalSelectedInvoiceId(inv.orderId);
                                setGlobalSearchQuery('');
                                navigateTo('receipt');
                              }}
                              className="bg-white p-3.5 rounded-xl border border-gray-200/60 shadow-sm hover:border-orange-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                            >
                              <div>
                                <div className="text-xs font-black text-gray-800 group-hover:text-orange-600">Bill #{inv.orderId}</div>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                  {inv.customerName || 'Walk-in Customer'} · {inv.customerPhone || 'No Phone'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-zinc-900">Rs. {inv.total?.toFixed(0)}</div>
                                <div className="text-[9px] text-orange-500 font-bold uppercase tracking-wider mt-0.5">View Slip</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category: Active Delivery Orders */}
                    {matchedDeliveries.length > 0 && (
                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          🏍️ Active Deliveries ({matchedDeliveries.length})
                        </h4>
                        <div className="space-y-2.5">
                          {matchedDeliveries.map(del => (
                            <div 
                              key={del.id}
                              onClick={() => {
                                setGlobalSelectedDeliveryId(del.id);
                                setGlobalSearchQuery('');
                                navigateTo('pos');
                              }}
                              className="bg-white p-3.5 rounded-xl border border-gray-200/60 shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                            >
                              <div>
                                <div className="text-xs font-black text-gray-800 group-hover:text-blue-600">
                                  Order #{del.backendOrderId || del.id.substring(4, 10)}
                                </div>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                  {del.name || 'Anonymous'} · {del.phone}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  del.deliveryStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {del.deliveryStatus}
                                </span>
                                <div className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mt-1">Open Order</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category: Khata Accounts */}
                    {matchedKhata.length > 0 && (
                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          💳 Khata Accounts ({matchedKhata.length})
                        </h4>
                        <div className="space-y-2.5">
                          {matchedKhata.map(cust => (
                            <div 
                              key={cust.id}
                              onClick={() => {
                                setGlobalSelectedCustomerId(cust.id);
                                setGlobalSearchQuery('');
                                navigateTo('khata');
                              }}
                              className="bg-white p-3.5 rounded-xl border border-gray-200/60 shadow-sm hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                            >
                              <div>
                                <div className="text-xs font-black text-gray-800 group-hover:text-emerald-600">{cust.name}</div>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                  Phone: {cust.phone || 'N/A'} · {cust.type || 'Client'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-gray-900">Rs. {cust.balance?.toLocaleString()}</div>
                                <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Open Ledger</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category: Menu Items */}
                    {matchedMenu.length > 0 && (
                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          🍔 Menu Items ({matchedMenu.length})
                        </h4>
                        <div className="space-y-2.5">
                          {matchedMenu.map(item => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setGlobalSearchQuery('');
                                navigateTo('inventory');
                              }}
                              className="bg-white p-3.5 rounded-xl border border-gray-200/60 shadow-sm hover:border-amber-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                            >
                              <div>
                                <div className="text-xs font-black text-gray-800 group-hover:text-amber-600">{item.name}</div>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                  Category: {item.category || 'Food'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-gray-900">Rs. {item.price}</div>
                                <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Edit Item</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Mobile Bottom Navigation - Frosted Glass */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-center h-16 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
        <MobileNavItem icon={<LayoutGrid size={22} />} label="POS" active={currentView === 'pos'} onClick={() => navigateTo('pos')} />
        <MobileNavItem icon={<Package size={22} />} label="KDS" active={currentView === 'kds'} onClick={() => navigateTo('kds')} />
        <MobileNavItem icon={<ShoppingCart size={22} />} label="Menu" active={currentView === 'inventory'} onClick={() => navigateTo('inventory')} />
        <MobileNavItem icon={<Settings size={22} />} label="Stock" active={currentView === 'stock'} onClick={() => navigateTo('stock')} />
        <MobileNavItem icon={<FileText size={22} />} label="Reports" active={currentView === 'reports'} onClick={() => navigateTo('reports')} />
      </div>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 group ${active
      ? 'bg-orange-500 text-zinc-950 shadow-[0_4px_20px_rgba(249,115,22,0.3)]'
      : 'text-zinc-400 hover:bg-zinc-900 hover:text-orange-500'
      }`}>
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="font-bold tracking-wide text-sm">{label}</span>
  </button>
);
const MobileNavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${active ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
      }`}
  >
    {icon}
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);

export default App;
