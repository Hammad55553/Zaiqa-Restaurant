import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  Share,
  Animated,
  Pressable,
  Dimensions,
  Alert,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import {
  TrendingUp,
  Package,
  Layers,
  DollarSign,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingDown,
  Download,
  Menu,
  X,
  User,
  Bell,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNShare from 'react-native-share';
import RNPrint from 'react-native-print';
import { API_BASE } from '../config';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

// Modular Components
import OverviewTab from '../components/admin/OverviewTab';
import TablesTab from '../components/admin/TablesTab';
import StockTab from '../components/admin/StockTab';
import ExpensesTab from '../components/admin/ExpensesTab';
import ReportsTab from '../components/admin/ReportsTab';
import NotificationsModal from '../components/admin/NotificationsModal';
import ReceiptSlipModal from '../components/admin/ReceiptSlipModal';

const toBase64 = (str: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  const utf8Str = unescape(encodeURIComponent(str));
  while (i < utf8Str.length) {
    const char1 = utf8Str.charCodeAt(i++);
    const char2 = utf8Str.charCodeAt(i++);
    const char3 = utf8Str.charCodeAt(i++);
    const byte1 = char1 >> 2;
    const byte2 = ((char1 & 3) << 4) | (char2 >> 4);
    const byte3 = isNaN(char2) ? 64 : ((char2 & 15) << 2) | (char3 >> 6);
    const byte4 = isNaN(char2) || isNaN(char3) ? 64 : char3 & 63;
    result += chars.charAt(byte1) + chars.charAt(byte2) + chars.charAt(byte3) + chars.charAt(byte4);
  }
  return result;
};

const generateReceiptHTML = (order: any, displayItems: any[], cashierName: string, dateFormatted: string, invStr: string, subtotalVal: number, serviceChargesAmt: number, taxAmt: number, stampColor: string, currentPaymentStatus: string) => {
  const itemsHtml = displayItems.map((item: any) => {
    const qty = item.qty || item.quantity || 0;
    const name = item.name || item.item_name || '';
    const price = item.price || 0;
    const total = qty * price;
    return `
      <tr>
        <td style="font-weight: bold;">${qty}x</td>
        <td>${name}<br/><span style="font-size: 10px; color: #444;">Rs. ${price}</span></td>
        <td style="text-align: right; font-weight: bold;">Rs. ${total.toFixed(0)}</td>
      </tr>
    `;
  }).join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 10px;
            color: #000000;
            background-color: #ffffff;
            margin: 0;
          }
          .center { text-align: center; }
          .logo-placeholder {
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 2px;
            letter-spacing: 2px;
          }
          .title { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
          .sub { font-size: 11px; margin-bottom: 8px; line-height: 1.4; font-weight: bold; }
          .divider { border-top: 1px dashed #000000; margin: 8px 0; }
          .divider-solid { border-top: 2px solid #000000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; font-weight: bold; }
          .bold { font-weight: 900; }
          .stamp {
            border: 3px double ${stampColor};
            padding: 6px;
            text-align: center;
            margin: 12px auto;
            width: 140px;
            transform: rotate(-6deg);
            font-size: 13px;
            font-weight: 900;
            background-color: #ffffff;
          }
          .stamp-title { font-size: 8px; font-weight: 900; margin-bottom: 2px; }
          .stamp-main { font-size: 14px; font-weight: 900; text-decoration: underline; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { border-bottom: 1px solid #000000; text-align: left; font-size: 11px; padding: 4px 0; font-weight: 900; }
          td { font-size: 11px; padding: 6px 0; vertical-align: top; }
          .text-right { text-align: right; }
          .totals-container { margin-top: 6px; }
          .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; font-weight: bold; }
          .grand-total { font-size: 16px; font-weight: 900; margin-top: 6px; }
          .footer-disclaimers { font-size: 9px; line-height: 1.3; font-weight: bold; text-align: left; margin-top: 12px; }
          .thank-you { font-size: 12px; font-weight: 900; text-align: center; margin-top: 12px; letter-spacing: 1px; }
          .visit-again { font-size: 11px; font-weight: bold; text-align: center; margin-top: 3px; }
          .developer-credit { font-size: 8px; font-weight: bold; text-align: center; margin-top: 10px; color: #333; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="logo-placeholder">★ ★ ★</div>
          <div class="title">ZAIQA MAHAL</div>
          <div class="sub">
            Chishtian Road, Near Ali Park<br/>
            Hasilpur, 63000<br/>
            Ph: 0300-3910101
          </div>
        </div>
        <div class="divider"></div>
        
        ${currentPaymentStatus && currentPaymentStatus.toUpperCase() !== 'NONE' && currentPaymentStatus.toUpperCase() !== 'WITHOUT STAMP' ? `
        <div class="stamp" style="color: ${stampColor}; border-color: ${stampColor};">
          <div class="stamp-title" style="color: ${stampColor};">ZAIQA MAHAL</div>
          <div class="stamp-main" style="color: ${stampColor};">${currentPaymentStatus}</div>
          <div class="stamp-title" style="color: ${stampColor};">★ OFFICIAL ★</div>
        </div>
        ` : ''}

        <div class="row"><span>DATE:</span><span>${dateFormatted}</span></div>
        <div class="row"><span>ORDER NO:</span><span style="font-size: 13px;">#${order.id}</span></div>
        <div class="row"><span>INVOICE NO:</span><span>${invStr}</span></div>
        ${order.area !== 'Delivery' && order.table_number !== 'Delivery' ? `
        <div class="row"><span>TABLE:</span><span>${order.table_number} (${order.area})</span></div>
        ` : ''}
        <div class="row"><span>CASHIER:</span><span>${cashierName}</span></div>
        <div class="divider"></div>

        ${order.customer_name &&
      order.customer_name !== 'Walk-in Customer' &&
      order.customer_name !== 'Walk-in Guest' &&
      order.customer_name !== 'Table Guest' &&
      order.customer_name !== 'Walk-in' &&
      order.customer_name.trim() !== '' ? `
          <div class="row"><span>CUSTOMER:</span><span>${order.customer_name}</span></div>
          ${order.customer_phone && order.customer_phone !== 'N/A' && order.customer_phone.trim() !== '' ? `
            <div class="row"><span>PHONE:</span><span>${order.customer_phone}</span></div>
          ` : ''}
          <div class="divider"></div>
        ` : ''}

        ${order.area === 'Delivery' || order.table_number === 'Delivery' ? `
          <div class="row" style="font-size: 11px;"><span>DELIVERY DETAILS:</span></div>
          ${order.delivery_address && order.delivery_address !== 'N/A' ? `
            <div style="font-size: 11px; margin: 3px 0; font-weight: bold; padding-left: 8px;">ADDRESS: ${order.delivery_address}</div>
          ` : ''}
          <div class="row" style="padding-left: 8px;"><span>METHOD:</span><span>${order.payment_method === 'online' ? '📱 ONLINE' : order.payment_method === 'khata' ? '💳 KHATA' : '💵 COD'}</span></div>
          ${order.transaction_id ? `<div class="row" style="padding-left: 8px;"><span>TXN ID:</span><span>${order.transaction_id}</span></div>` : ''}
          ${order.rider_name || order.delivered_by ? `<div class="row" style="padding-left: 8px;"><span>RIDER:</span><span>${order.rider_name || order.delivered_by}</span></div>` : ''}
          ${order.remarks && !order.remarks.startsWith('Delivery Order') ? `<div style="font-size: 11px; margin: 3px 0; font-weight: bold; padding-left: 8px;">REMARKS: ${order.remarks}</div>` : ''}
          <div class="divider"></div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">QTY</th>
              <th>ITEM DESCRIPTION</th>
              <th style="text-align: right; width: 80px;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="totals-container">
          <div class="total-row"><span>Subtotal:</span><span>Rs. ${subtotalVal.toFixed(0)}</span></div>
          ${serviceChargesAmt > 0 ? `<div class="total-row"><span>Service Charges:</span><span>Rs. ${serviceChargesAmt.toFixed(0)}</span></div>` : ''}
          ${taxAmt > 0 ? `<div class="total-row"><span>GST / Tax:</span><span>Rs. ${taxAmt.toFixed(0)}</span></div>` : ''}
        </div>
        
        <div class="divider-solid"></div>
        <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${order.total_amount.toFixed(0)}</span></div>
        <div class="divider-solid"></div>
        
        <div class="footer-disclaimers">
          Please check your order and cash change before leaving.<br/>
          Not valid for court. No challenge once checked out.<br/>
          Order once served or prepared cannot be changed.<br/>
          Dues once paid are non-refundable.<br/>
          Instagram: @zaiqamahal.pk
        </div>
        
        <div class="divider"></div>
        <div class="thank-you">THANK YOU</div>
        <div class="visit-again">Please visit again!</div>
        <div class="divider"></div>
        <div class="developer-credit">Software Developed by Asper InfoTech Pvt. Ltd.</div>
      </body>
    </html>
  `;
};

const generateReportHTML = (ordersList: any[], expensesList: any[], statsObj: any) => {
  const ordersHtml = ordersList.map((o: any) => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.table_number} (${o.area})</td>
      <td>${o.customer_name || 'Guest'}</td>
      <td>${o.status.toUpperCase()}</td>
      <td>Rs. ${o.total_amount}</td>
      <td>${new Date(o.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');

  const expensesHtml = expensesList.map((e: any) => `
    <tr>
      <td>${(e.category || '').toUpperCase()}</td>
      <td>${e.remarks || 'N/A'}</td>
      <td>Rs. ${e.amount}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #f97316; margin-bottom: 5px; }
          .sub { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
          .section-title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #f97316; padding-bottom: 5px; }
          .stats-grid { display: flex; gap: 15px; margin-bottom: 20px; }
          .stat-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
          .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .stat-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc; font-weight: bold; }
          .text-right { text-align: right; }
          .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; }
        </style>
      </head>
      <body>
        <h1>ZAIQA MAHAL</h1>
        <div class="sub">DAILY SALES & EXPENSES REPORT - ${new Date().toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Sales</div>
            <div class="stat-val" style="color: #16a34a;">Rs. ${statsObj.totalSales}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Expenses</div>
            <div class="stat-val" style="color: #ef4444;">Rs. ${statsObj.totalExpenses}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Net Profit</div>
            <div class="stat-val" style="color: #3b82f6;">Rs. ${statsObj.netProfit}</div>
          </div>
        </div>
        
        <div class="section-title">Sales Orders Summary</div>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Table/Area</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${ordersHtml || '<tr><td colspan="6" style="text-align:center;">No orders logged today.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Expenses Summary</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Remarks</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expensesHtml || '<tr><td colspan="3" style="text-align:center;">No expenses logged today.</td></tr>'}
          </tbody>
        </table>
        
        <div class="footer">
          Generated automatically by Zaiqa Mahal Console App.<br/>
          &copy; ${new Date().getFullYear()} Zaiqa Mahal. All rights reserved.
        </div>
      </body>
    </html>
  `;
};


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.78;

interface AdminDashboardProps {
  username: string;
  name?: string;
  permissions?: string[];
  onLogout: () => void;
}

interface Table {
  id: number;
  table_number: string;
  area: string;
  seats: number;
  status: string;
}

interface StockItem {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  min_alert: number;
}

interface Order {
  id: number;
  table_number: string;
  area: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  items?: any;
}

interface Expense {
  id: number;
  amount: number;
  category: string;
  remarks: string;
  created_at: string;
}

export default function AdminDashboard({ username, name, onLogout }: AdminDashboardProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'stock' | 'expenses' | 'reports'>('overview');
  const [onlineMode, setOnlineMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  // Stock Sub-tab
  const [stockSubTab, setStockSubTab] = useState<'inventory' | 'history'>('inventory');

  // Receipt Slip Modal State
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<any | null>(null);
  const viewShotRef = useRef<any>(null);


  // Data States
  const [tables, setTables] = useState<Table[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    activeOrders: 0,
    occupiedTables: 0,
    netProfit: 0,
  });

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // Sidebar Controls
  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  };

  // Handle Back Button
  useEffect(() => {
    const backAction = () => {
      if (sidebarOpen) {
        closeSidebar();
        return true;
      }
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        return true;
      }
      setShowExitModal(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeTab, sidebarOpen]);

  // Notifications Effect
  useEffect(() => {
    AsyncStorage.getItem('ZAIQAH_NOTIFICATIONS').then((val) => {
      if (val) {
        try {
          setNotifications(JSON.parse(val));
        } catch (e) { }
      }
    });

    const sub = DeviceEventEmitter.addListener('NEW_NOTIFICATION', (data: any) => {
      setNotifications((prev) => {
        const newNotif = {
          id: String(Date.now()),
          title: data.title || 'Notification',
          desc: data.desc || data.body || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
        };
        const updated = [newNotif, ...prev];
        AsyncStorage.setItem('ZAIQAH_NOTIFICATIONS', JSON.stringify(updated));
        return updated;
      });
    });

    return () => sub.remove();
  }, []);

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    AsyncStorage.setItem('ZAIQAH_NOTIFICATIONS', JSON.stringify(updated));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    AsyncStorage.setItem('ZAIQAH_NOTIFICATIONS', JSON.stringify([]));
  };

  // Fetch Dashboard Data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let currentStock: StockItem[] = [];
      let currentLogs: any[] = [];

      if (onlineMode) {
        // --- Cloud Supabase Mode ---
        const { data: dbTables, error: tErr } = await supabase.from('tables').select('*');
        if (tErr) throw tErr;
        setTables(dbTables || []);

        const { data: dbStock, error: sErr } = await supabase.from('stock_items').select('*');
        if (sErr) throw sErr;
        currentStock = dbStock || [];
        setStockItems(currentStock);

        const { data: dbLogs, error: lErr } = await supabase
          .from('stock_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (lErr) throw lErr;
        currentLogs = dbLogs || [];

        const { data: dbOrders, error: oErr } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (oErr) throw oErr;
        setOrders(dbOrders || []);

        const { data: dbExpenses, error: eErr } = await supabase.from('expenses').select('*');
        if (eErr) throw eErr;
        setExpenses(dbExpenses || []);
      } else {
        // --- Local Server Mode ---
        const resTables = await fetch(`${API_BASE}/tables`);
        if (!resTables.ok) throw new Error();
        const dataTables = await resTables.json();
        setTables(dataTables || []);

        const resStock = await fetch(`${API_BASE}/stock`);
        if (!resStock.ok) throw new Error();
        currentStock = await resStock.json();
        setStockItems(currentStock || []);

        const resLogs = await fetch(`${API_BASE}/stock/history`);
        if (!resLogs.ok) throw new Error();
        currentLogs = await resLogs.json();

        const resOrders = await fetch(`${API_BASE}/orders/all`);
        if (!resOrders.ok) throw new Error();
        const dataOrders = await resOrders.json();
        setOrders(dataOrders || []);

        const resExpenses = await fetch(`${API_BASE}/expenses`);
        if (!resExpenses.ok) throw new Error();
        const dataExpenses = await resExpenses.json();
        setExpenses(dataExpenses || []);
      }

      const mappedLogs = currentLogs.map((log: any) => {
        if (log.item_name && log.item_unit) return log;
        const matchedItem = currentStock.find((si: any) => String(si.id) === String(log.item_id));
        return {
          ...log,
          item_name: matchedItem ? matchedItem.name : `Ingredient #${log.item_id}`,
          item_unit: matchedItem ? matchedItem.unit : 'units',
        };
      });
      setStockLogs(mappedLogs);

      // Auto-generate notifications for low stock items
      setNotifications((prev) => {
        let updated = [...prev];
        let changed = false;

        currentStock.forEach((item) => {
          if (item.quantity <= item.min_alert) {
            const notifTitle = item.quantity <= 0 ? 'Out of Stock Alert' : 'Low Stock Alert';
            const notifDesc = `${item.name} is ${item.quantity <= 0 ? 'out of stock' : `running low (${item.quantity} ${item.unit} left)`}.`;
            const exists = prev.some((n) => n.title === notifTitle && n.desc.startsWith(item.name));
            if (!exists) {
              updated.unshift({
                id: `stock-${item.id}-${Date.now()}`,
                title: notifTitle,
                desc: notifDesc,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false,
              });
              changed = true;
            }
          }
        });

        if (changed) {
          AsyncStorage.setItem('ZAIQAH_NOTIFICATIONS', JSON.stringify(updated));
        }
        return updated;
      });

    } catch (err) {
      toast.error('Sync Error', 'Failed to fetch dashboard data. Please check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onlineMode]);

  // Recalculate statistics when datasets change
  useEffect(() => {
    const totalSales = orders
      .filter(o => o.status === 'completed')
      .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
    const occupiedTables = tables.filter(t => t.status === 'dining').length;
    const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    setStats({
      totalSales,
      totalExpenses,
      activeOrders,
      occupiedTables,
      netProfit: totalSales - totalExpenses,
    });
  }, [tables, stockItems, orders, expenses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Download Report handler
  const handleDownloadReport = async () => {
    try {
      const csvContent = [
        ['Order ID', 'Table Number', 'Area', 'Customer Name', 'Status', 'Total Amount', 'Created At'],
        ...orders.map(o => [o.id, o.table_number, o.area, o.customer_name || 'Guest', o.status, o.total_amount, o.created_at])
      ].map(e => e.join(',')).join('\n');

      const base64Content = toBase64(csvContent);
      await RNShare.open({
        url: `data:text/csv;base64,${base64Content}`,
        filename: `Daily_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`,
        type: 'text/csv',
      });
      toast.success('Report Shared', 'Sales report generated successfully.');
    } catch {
      toast.error('Export Failed', 'Unable to download report.');
    }
  };

  // Print summary report
  const handlePrint = async () => {
    try {
      const htmlContent = generateReportHTML(orders, expenses, stats);
      await RNPrint.print({
        html: htmlContent,
      });
      toast.success('Print Dialog Opened', 'Opening native print/save-as-PDF view...');
    } catch {
      toast.error('Print Failed', 'Unable to open print dialog.');
    }
  };

  const handlePrintReportPDF = async () => {
    try {
      const htmlContent = generateReportHTML(orders, expenses, stats);
      await RNPrint.print({
        html: htmlContent,
      });
      toast.success('Report PDF Generated', 'Opening print/PDF save dialog.');
    } catch {
      toast.error('Export Failed', 'Unable to generate PDF report.');
    }
  };


  const getStockStatusBadge = (qty: number, min: number) => {
    if (qty <= 0) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fecdd3' }]}>
          <Text style={[styles.statusText, { color: '#be123c' }]}>OUT OF STOCK</Text>
        </View>
      );
    }
    if (qty <= min) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#ffedd5' }]}>
          <Text style={[styles.statusText, { color: '#c2410c' }]}>LOW STOCK</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
        <Text style={[styles.statusText, { color: '#15803d' }]}>IN STOCK</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.hamburgerBtn} onPress={openSidebar} activeOpacity={0.7}>
          <Menu size={22} color="#0f172a" />
        </TouchableOpacity>

        {/* Logo and title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 }}>
          <Image source={require('../../assets/Logo.jpg')} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeTab === 'overview' && 'DASHBOARD'}
              {activeTab === 'tables' && 'TABLE MAP'}
              {activeTab === 'stock' && 'INVENTORY'}
              {activeTab === 'expenses' && 'EXPENSES'}
              {activeTab === 'reports' && 'REPORTS'}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>{(name || username || '').toUpperCase()}</Text>
          </View>
        </View>

        {/* Notification Bell Button */}
        <TouchableOpacity
          style={[styles.refreshBtn, { marginRight: 8 }]}
          onPress={() => setShowNotificationsModal(true)}
          activeOpacity={0.7}
        >
          <Bell size={18} color="#0f172a" />
          {notifications.some(n => !n.read) && (
            <View style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#ef4444',
            }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchData(true)} activeOpacity={0.7}>
          <RefreshCw size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Fetching live metrics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: 64 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#f97316" />}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              tablesCount={tables.length}
              orders={orders}
              onDownloadReport={handleDownloadReport}
              onPrintSummary={handlePrint}
              onSelectOrder={setSelectedOrderForSlip}
            />
          )}

          {activeTab === 'tables' && (
            <TablesTab tables={tables} />
          )}

          {activeTab === 'stock' && (
            <StockTab
              stockSubTab={stockSubTab}
              onSetStockSubTab={setStockSubTab}
              stockItems={stockItems}
              stockLogs={stockLogs}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesTab expenses={expenses} />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              stats={stats}
              onDownloadReport={handleDownloadReport}
              onPrintReportPDF={handlePrintReportPDF}
            />
          )}
        </ScrollView>
      )}

      {/* SIDEBAR NAVIGATION DRAWER */}
      {sidebarOpen && (
        <View style={styles.sidebarOverlay}>
          <Pressable style={styles.sidebarBackdrop} onPress={closeSidebar} />

          <Animated.View style={[styles.sidebarContent, { transform: [{ translateX: sidebarAnim }] }]}>
            <View style={[styles.sidebarHeader, { paddingTop: insets.top + 16 }]}>
              <Image source={require('../../assets/Logo.jpg')} style={styles.sidebarLogo as any} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sidebarTitle}>ZAIQA MAHAL</Text>
                <Text style={styles.sidebarSubtitle}>Admin Dashboard</Text>
              </View>
              <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View style={styles.sidebarProfile}>
              <View style={styles.profileAvatar}>
                <User size={20} color="#f97316" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.profileName}>{name || 'Admin'}</Text>
                <Text style={styles.profileRole}>ROLE: ADMINISTRATOR</Text>
              </View>
            </View>

            {/* Navigation Options */}
            <View style={styles.sidebarNav}>
              <TouchableOpacity
                style={[styles.navItem, activeTab === 'overview' && styles.navItemActive]}
                onPress={() => { console.log('👉 [Sidebar] Clicking Overview'); setActiveTab('overview'); closeSidebar(); }}
              >
                <TrendingUp size={20} color={activeTab === 'overview' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'overview' && styles.navItemTextActive]}>Overview Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'tables' && styles.navItemActive]}
                onPress={() => { console.log('👉 [Sidebar] Clicking Tables'); setActiveTab('tables'); closeSidebar(); }}
              >
                <Layers size={20} color={activeTab === 'tables' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'tables' && styles.navItemTextActive]}>Tables Floor Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'stock' && styles.navItemActive]}
                onPress={() => { console.log('👉 [Sidebar] Clicking Stock'); setActiveTab('stock'); closeSidebar(); }}
              >
                <Package size={20} color={activeTab === 'stock' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'stock' && styles.navItemTextActive]}>Kitchen Inventory</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'expenses' && styles.navItemActive]}
                onPress={() => { console.log('👉 [Sidebar] Clicking Expenses'); setActiveTab('expenses'); closeSidebar(); }}
              >
                <TrendingDown size={20} color={activeTab === 'expenses' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'expenses' && styles.navItemTextActive]}>Restaurant Expenses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'reports' && styles.navItemActive]}
                onPress={() => { console.log('👉 [Sidebar] Clicking Reports'); setActiveTab('reports'); closeSidebar(); }}
              >
                <FileText size={20} color={activeTab === 'reports' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'reports' && styles.navItemTextActive]}>Sales Reports</Text>
              </TouchableOpacity>
            </View>

            {/* Sidebar Footer with Status Switch & Logout */}
            <View style={[styles.sidebarFooter, { paddingBottom: insets.bottom + 20 }]}>
              {/* Online/Offline Toggle */}
              <TouchableOpacity
                style={[
                  styles.connectionToggle,
                  {
                    backgroundColor: onlineMode ? '#e0f2fe' : '#fee2e2',
                    borderColor: onlineMode ? '#bae6fd' : '#fecdd3',
                    marginBottom: 16,
                  }
                ]}
                onPress={() => { setOnlineMode(!onlineMode); closeSidebar(); }}
                activeOpacity={0.8}
              >
                {onlineMode ? <Wifi size={14} color="#0284c7" /> : <WifiOff size={14} color="#dc2626" />}
                <Text style={[styles.connectionToggleText, { color: onlineMode ? '#0284c7' : '#dc2626' }]}>
                  {onlineMode ? 'CLOUD (SUPABASE)' : 'LOCAL SERVER'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={() => { closeSidebar(); onLogout(); }} activeOpacity={0.7}>
                <LogOut size={18} color="#ef4444" />
                <Text style={styles.logoutBtnText}>Logout Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* RECEIPT SLIP MODAL */}
      <ReceiptSlipModal
        order={selectedOrderForSlip}
        onClose={() => setSelectedOrderForSlip(null)}
      />

      {/* NOTIFICATIONS MODAL */}
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onClearAll={clearAllNotifications}
        onMarkAllAsRead={markAllNotificationsAsRead}
      />

      {/* EXIT CONFIRMATION MODAL */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalCard}>
            <View style={styles.exitIconCircle}>
              <AlertCircle size={28} color="#f97316" />
            </View>
            <Text style={styles.exitModalTitle}>Exit Application?</Text>
            <Text style={styles.exitModalDesc}>Are you sure you want to exit Zaiqa Mahal Console App?</Text>
            <View style={styles.exitModalActions}>
              <TouchableOpacity style={styles.exitCancelBtn} onPress={() => setShowExitModal(false)} activeOpacity={0.7}>
                <Text style={styles.exitCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitConfirmBtn} onPress={() => BackHandler.exitApp()} activeOpacity={0.7}>
                <Text style={styles.exitConfirmBtnText}>Exit App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  connectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'center',
  },
  connectionToggleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentWrapper: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  gridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  gridCardVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 12,
    letterSpacing: 0.8,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
  },
  reportActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderStatus: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
  tableItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  tableCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  tableCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tableCardStatus: {
    alignItems: 'flex-end',
  },
  tableStatusLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  stockItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  stockCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  stockCardSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  stockCardVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },
  expenseItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  expenseCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
  },
  analyticsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  analyticsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  fullExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
  },
  fullExportBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exitModalCard: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  exitIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  exitModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  exitModalDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  exitModalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  exitCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  exitCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  exitConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exitConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#f97316',
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  slipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  slipCard: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  slipCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  slipLogo: {
    width: 64,
    height: 64,
    marginBottom: 8,
    borderRadius: 32,
  },
  slipTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  slipSub: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  slipDividerDashed: {
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  slipDividerSolid: {
    borderWidth: 1,
    borderColor: '#000000',
    marginVertical: 12,
  },
  slipStamp: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    marginLeft: -48,
    width: 96,
    height: 96,
    borderWidth: 3,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 10,
    opacity: 0.85,
  },
  slipStampInner: {
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 42,
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipStampTextSmall: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  slipStampTextMain: {
    fontSize: 12,
    fontWeight: '900',
    marginVertical: 2,
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  slipMetaContainer: {
    marginVertical: 4,
    gap: 4,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slipMetaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  slipMetaVal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  slipTableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#000000',
    marginBottom: 8,
  },
  slipCol: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  slipItemRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    alignItems: 'center',
  },
  slipItemText: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '600',
  },
  slipTotalsContainer: {
    gap: 4,
    marginVertical: 4,
  },
  slipTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  slipTotalVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  slipFooterDisclaimers: {
    fontSize: 9.5,
    color: '#000000',
    marginBottom: 12,
    lineHeight: 14,
    textAlign: 'left',
    width: '100%',
    fontWeight: '700',
  },
  slipThankYou: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#000000',
    textAlign: 'center',
  },
  slipVisitAgain: {
    fontSize: 11,
    color: '#000000',
    marginTop: 4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slipDeveloperCredit: {
    fontSize: 9,
    color: '#000000',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontWeight: 'bold',
    width: '100%',
  },
  slipActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 16,
  },
  slipActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  // Sidebar Styles
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  sidebarBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sidebarContent: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
    paddingHorizontal: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 16,
  },
  sidebarLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  sidebarSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginVertical: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileRole: {
    fontSize: 9,
    color: '#f97316',
    fontWeight: '800',
    marginTop: 2,
  },
  sidebarNav: {
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#fff7ed',
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  navItemTextActive: {
    color: '#f97316',
    fontWeight: '900',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 16,
  },
  sidebarLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
});
