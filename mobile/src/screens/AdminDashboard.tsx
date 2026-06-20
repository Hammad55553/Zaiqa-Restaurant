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
} from 'react-native';
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
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

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

  // Sidebar state & animation
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  // Stock Sub-tab
  const [stockSubTab, setStockSubTab] = useState<'inventory' | 'history'>('inventory');

  // Receipt Slip Modal State
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<any | null>(null);

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
        const matchedItem = currentStock.find((si: any) => si.id === log.item_id);
        return {
          ...log,
          item_name: matchedItem ? matchedItem.name : `Ingredient #${log.item_id}`,
          item_unit: matchedItem ? matchedItem.unit : 'units',
        };
      });
      setStockLogs(mappedLogs);

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

      await Share.share({
        message: csvContent,
        title: 'Daily Sales Report',
      });
      toast.success('Report Shared', 'Sales report generated successfully.');
    } catch {
      toast.error('Export Failed', 'Unable to download report.');
    }
  };

  // Simulate Print handler
  const handlePrint = () => {
    toast.success('Printing Started', 'Sending sales summary to local thermal receipt printer...');
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.hamburgerBtn} onPress={openSidebar} activeOpacity={0.7}>
          <Menu size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>
            {activeTab === 'overview' && 'DASHBOARD'}
            {activeTab === 'tables' && 'TABLE MAP'}
            {activeTab === 'stock' && 'INVENTORY'}
            {activeTab === 'expenses' && 'EXPENSES'}
            {activeTab === 'reports' && 'REPORTS'}
          </Text>
          <Text style={styles.headerSub}>{(name || username || '').toUpperCase()}</Text>
        </View>

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
          {/* TAB OVERVIEW */}
          {activeTab === 'overview' && (
            <View style={styles.contentWrapper}>
              {/* Stats Grid */}
              <View style={styles.gridContainer}>
                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#dcfce7' }]}>
                    <TrendingUp size={20} color="#15803d" />
                  </View>
                  <Text style={styles.gridCardLabel}>Total Sales</Text>
                  <Text style={[styles.gridCardVal, { color: '#16a34a' }]}>Rs. {stats.totalSales}</Text>
                </View>

                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#fee2e2' }]}>
                    <TrendingDown size={20} color="#dc2626" />
                  </View>
                  <Text style={styles.gridCardLabel}>Total Expenses</Text>
                  <Text style={[styles.gridCardVal, { color: '#ef4444' }]}>Rs. {stats.totalExpenses}</Text>
                </View>
              </View>

              <View style={styles.gridContainer}>
                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#dbeafe' }]}>
                    <DollarSign size={20} color="#1d4ed8" />
                  </View>
                  <Text style={styles.gridCardLabel}>Net Profit</Text>
                  <Text style={[styles.gridCardVal, { color: '#3b82f6' }]}>Rs. {stats.netProfit}</Text>
                </View>

                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: '#ffedd5' }]}>
                    <Layers size={20} color="#c2410c" />
                  </View>
                  <Text style={styles.gridCardLabel}>Tables Occupied</Text>
                  <Text style={[styles.gridCardVal, { color: '#f97316' }]}>{stats.occupiedTables} / {tables.length}</Text>
                </View>
              </View>

              {/* Quick Actions Card */}
              <View style={styles.actionsCard}>
                <Text style={styles.sectionHeader}>QUICK REPORTS & EXPORTS</Text>
                <View style={styles.actionButtonContainer}>
                  <TouchableOpacity style={styles.reportActionBtn} onPress={handleDownloadReport} activeOpacity={0.7}>
                    <FileText size={18} color="#ffffff" />
                    <Text style={styles.reportActionBtnText}>Share Report CSV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: '#10b981' }]} onPress={handlePrint} activeOpacity={0.7}>
                    <Printer size={18} color="#ffffff" />
                    <Text style={styles.reportActionBtnText}>Print Summary</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recent Orders List */}
              <Text style={styles.sectionTitle}>Recent Orders ({orders.length})</Text>
              {orders.slice(0, 15).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderItemCard}
                  onPress={() => setSelectedOrderForSlip(order)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderCardTitle}>Order #{order.id}</Text>
                    <Text style={styles.orderCardSub}>Table {order.table_number} • {order.area}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderAmount}>Rs. {order.total_amount}</Text>
                    <Text style={[styles.orderStatus, { color: order.status === 'completed' ? '#16a34a' : '#f97316' }]}>
                      {(order.status || '').toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TAB TABLES */}
          {activeTab === 'tables' && (
            <View style={styles.contentWrapper}>
              <Text style={styles.sectionTitle}>Floor Occupancy Map</Text>
              {tables.length === 0 ? (
                <Text style={styles.emptyText}>No tables configured.</Text>
              ) : (
                tables.map((table) => (
                  <View key={table.id} style={[styles.tableItemCard, { borderLeftColor: table.status === 'dining' ? '#ef4444' : '#16a34a' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tableCardTitle}>Table {table.table_number}</Text>
                      <Text style={styles.tableCardSub}>{table.area} • {table.seats} Seats</Text>
                    </View>
                    <View style={styles.tableCardStatus}>
                      <Text style={[styles.tableStatusLabel, { color: table.status === 'dining' ? '#ef4444' : '#16a34a' }]}>
                        {table.status === 'dining' ? 'OCCUPIED' : 'AVAILABLE'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB STOCK */}
          {activeTab === 'stock' && (
            <View style={styles.contentWrapper}>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentBtn, stockSubTab === 'inventory' && styles.segmentBtnActive]}
                  onPress={() => setStockSubTab('inventory')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, stockSubTab === 'inventory' && styles.segmentTextActive]}>INVENTORY LEVELS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, stockSubTab === 'history' && styles.segmentBtnActive]}
                  onPress={() => setStockSubTab('history')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, stockSubTab === 'history' && styles.segmentTextActive]}>AUDIT LOGS / HISTORY</Text>
                </TouchableOpacity>
              </View>

              {stockSubTab === 'inventory' ? (
                <>
                  <Text style={styles.sectionTitle}>Kitchen Inventory Alert Console</Text>
                  {stockItems.length === 0 ? (
                    <Text style={styles.emptyText}>No stock items configured.</Text>
                  ) : (
                    stockItems.map((stock) => (
                      <View key={stock.id} style={styles.stockItemCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stockCardTitle}>{stock.name}</Text>
                          <Text style={styles.stockCardSub}>Unit: {stock.unit} • Threshold Alert: {stock.min_alert}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={styles.stockCardVal}>{stock.quantity} {stock.unit}</Text>
                          {getStockStatusBadge(stock.quantity, stock.min_alert)}
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Stock Transaction History Logs</Text>
                  {stockLogs.length === 0 ? (
                    <Text style={styles.emptyText}>No stock transaction history found.</Text>
                  ) : (
                    stockLogs.map((log) => (
                      <View key={log.id} style={styles.stockItemCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stockCardTitle}>{log.item_name}</Text>
                          <Text style={styles.stockCardSub}>
                            {new Date(log.created_at || Date.now()).toLocaleString('en-PK', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', hour12: true,
                            })}
                            {log.remarks ? ` • ${log.remarks}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={[styles.stockCardVal, { color: log.action === 'remove' ? '#ef4444' : '#16a34a' }]}>
                            {log.action === 'remove' ? '-' : '+'}{log.qty_changed} {log.item_unit}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: log.action === 'add' ? '#dcfce7' : log.action === 'remove' ? '#fecdd3' : '#e2e8f0' }]}>
                            <Text style={[styles.statusText, { color: log.action === 'add' ? '#15803d' : log.action === 'remove' ? '#be123c' : '#475569' }]}>
                              {log.action.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          )}

          {/* TAB EXPENSES */}
          {activeTab === 'expenses' && (
            <View style={styles.contentWrapper}>
              <Text style={styles.sectionTitle}>Daily Restaurant Expenditures</Text>
              {expenses.length === 0 ? (
                <Text style={styles.emptyText}>No expenses logged.</Text>
              ) : (
                expenses.map((exp) => (
                  <View key={exp.id} style={styles.expenseItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseCardTitle}>{(exp.category || '').toUpperCase()}</Text>
                      <Text style={styles.expenseCardSub}>{exp.remarks || 'No remarks provided'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.expenseAmount}>Rs. {exp.amount}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB REPORTS */}
          {activeTab === 'reports' && (
            <View style={styles.contentWrapper}>
              <Text style={styles.sectionTitle}>Sales & Payment Split Analytics</Text>
              
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsHeader}>Payment Methods Split</Text>
                
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Cash Sales</Text>
                  <Text style={styles.paymentValue}>Rs. {stats.totalSales}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#10b981' }]} />
                </View>

                <View style={[styles.paymentRow, { marginTop: 14 }]}>
                  <Text style={styles.paymentLabel}>Card/Digital Sales</Text>
                  <Text style={styles.paymentValue}>Rs. 0</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '0%', backgroundColor: '#3b82f6' }]} />
                </View>
              </View>

              <View style={styles.actionsCard}>
                <Text style={styles.sectionHeader}>EXPORT DATA</Text>
                <TouchableOpacity style={styles.fullExportBtn} onPress={handleDownloadReport} activeOpacity={0.7}>
                  <Download size={18} color="#ffffff" />
                  <Text style={styles.fullExportBtnText}>Download Full Report CSV</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* SIDEBAR NAVIGATION DRAWER */}
      {sidebarOpen && (
        <View style={styles.sidebarOverlay}>
          <Pressable style={styles.sidebarBackdrop} onPress={closeSidebar} />
          
          <Animated.View style={[styles.sidebarContent, { transform: [{ translateX: sidebarAnim }] }]}>
            <View style={[styles.sidebarHeader, { paddingTop: insets.top + 16 }]}>
              <Image source={require('../../assets/Logo.jpg')} style={styles.sidebarLogo} />
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
                onPress={() => { setActiveTab('overview'); closeSidebar(); }}
              >
                <TrendingUp size={20} color={activeTab === 'overview' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'overview' && styles.navItemTextActive]}>Overview Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'tables' && styles.navItemActive]}
                onPress={() => { setActiveTab('tables'); closeSidebar(); }}
              >
                <Layers size={20} color={activeTab === 'tables' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'tables' && styles.navItemTextActive]}>Tables Floor Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'stock' && styles.navItemActive]}
                onPress={() => { setActiveTab('stock'); closeSidebar(); }}
              >
                <Package size={20} color={activeTab === 'stock' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'stock' && styles.navItemTextActive]}>Kitchen Inventory</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'expenses' && styles.navItemActive]}
                onPress={() => { setActiveTab('expenses'); closeSidebar(); }}
              >
                <TrendingDown size={20} color={activeTab === 'expenses' ? '#f97316' : '#64748b'} />
                <Text style={[styles.navItemText, activeTab === 'expenses' && styles.navItemTextActive]}>Restaurant Expenses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === 'reports' && styles.navItemActive]}
                onPress={() => { setActiveTab('reports'); closeSidebar(); }}
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
      <Modal
        visible={!!selectedOrderForSlip}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderForSlip(null)}
      >
        <View style={styles.slipModalOverlay}>
          <View style={styles.slipCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Logo / Header */}
              <View style={styles.slipCenter}>
                <Image source={require('../../assets/Logo.jpg')} style={styles.slipLogo as any} resizeMode="contain" />
                <Text style={styles.slipTitle}>ZAIQA MAHAL</Text>
                <Text style={styles.slipSub}>
                  Chishtian Road, Near Ali Park{"\n"}
                  Hasilpur, 63000{"\n"}
                  Ph: 0300-3910101
                </Text>
              </View>

              <View style={styles.slipDividerDashed} />

              {/* Stamp (Official Paid/Pending Indicator) */}
              {selectedOrderForSlip && (
                <View style={[
                  styles.slipStamp,
                  {
                    borderColor: selectedOrderForSlip.status === 'completed' ? '#16a34a' : '#dc2626',
                  }
                ]}>
                  <Text style={[
                    styles.slipStampText,
                    { color: selectedOrderForSlip.status === 'completed' ? '#16a34a' : '#dc2626' }
                  ]}>
                    {selectedOrderForSlip.status === 'completed' ? 'PAID' : selectedOrderForSlip.status.toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Order Metadata */}
              {selectedOrderForSlip && (
                <View style={styles.slipMetaContainer}>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipMetaLabel}>DATE:</Text>
                    <Text style={styles.slipMetaVal}>
                      {new Date(selectedOrderForSlip.created_at || Date.now()).toLocaleString('en-PK', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      })}
                    </Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipMetaLabel}>ORDER ID:</Text>
                    <Text style={styles.slipMetaVal}>#{selectedOrderForSlip.id}</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipMetaLabel}>INVOICE NO:</Text>
                    <Text style={styles.slipMetaVal}>INV-{new Date(selectedOrderForSlip.created_at || Date.now()).getFullYear()}{String(new Date(selectedOrderForSlip.created_at || Date.now()).getMonth()+1).padStart(2,'0')}{String(new Date(selectedOrderForSlip.created_at || Date.now()).getDate()).padStart(2,'0')}-{String(selectedOrderForSlip.id).padStart(4,'0')}</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipMetaLabel}>TABLE:</Text>
                    <Text style={styles.slipMetaVal}>{selectedOrderForSlip.table_number} ({selectedOrderForSlip.area})</Text>
                  </View>
                  {selectedOrderForSlip.customer_name && selectedOrderForSlip.customer_name !== 'Walk-in' && (
                    <View style={styles.slipRow}>
                      <Text style={styles.slipMetaLabel}>CUSTOMER:</Text>
                      <Text style={styles.slipMetaVal}>{selectedOrderForSlip.customer_name}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.slipDividerDashed} />

              {/* Itemized Table */}
              <View style={styles.slipTableHeader}>
                <Text style={[styles.slipCol, { flex: 3 }]}>ITEM</Text>
                <Text style={[styles.slipCol, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                <Text style={[styles.slipCol, { flex: 1.5, textAlign: 'right' }]}>PRICE</Text>
                <Text style={[styles.slipCol, { flex: 1.5, textAlign: 'right' }]}>TOTAL</Text>
              </View>

              {selectedOrderForSlip && (() => {
                let parsedItems = [];
                try {
                  if (typeof selectedOrderForSlip.items === 'string') {
                    parsedItems = JSON.parse(selectedOrderForSlip.items);
                  } else if (Array.isArray(selectedOrderForSlip.items)) {
                    parsedItems = selectedOrderForSlip.items;
                  }
                } catch (e) {
                  console.warn('Error parsing order items for slip:', e);
                }

                return parsedItems.map((item: any, idx: number) => (
                  <View key={idx} style={styles.slipItemRow}>
                    <Text style={[styles.slipItemText, { flex: 3 }]} numberOfLines={2}>
                      {item.name || item.item_name}
                    </Text>
                    <Text style={[styles.slipItemText, { flex: 1, textAlign: 'center' }]}>
                      {item.qty || item.quantity}
                    </Text>
                    <Text style={[styles.slipItemText, { flex: 1.5, textAlign: 'right' }]}>
                      {item.price}
                    </Text>
                    <Text style={[styles.slipItemText, { flex: 1.5, textAlign: 'right', fontWeight: '800' }]}>
                      {(item.qty || item.quantity) * item.price}
                    </Text>
                  </View>
                ));
              })()}

              <View style={styles.slipDividerSolid} />

              {/* Totals Summary */}
              {selectedOrderForSlip && (
                <View style={styles.slipTotalsContainer}>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipTotalLabel}>Subtotal</Text>
                    <Text style={styles.slipTotalVal}>Rs. {selectedOrderForSlip.total_amount}</Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipTotalLabel}>GST (0%)</Text>
                    <Text style={styles.slipTotalVal}>Rs. 0</Text>
                  </View>
                  <View style={[styles.slipRow, { marginTop: 6 }]}>
                    <Text style={[styles.slipTotalLabel, { fontSize: 16, fontWeight: '900' }]}>TOTAL AMOUNT</Text>
                    <Text style={[styles.slipTotalVal, { fontSize: 16, fontWeight: '900' }]}>Rs. {selectedOrderForSlip.total_amount}</Text>
                  </View>
                </View>
              )}

              <View style={styles.slipDividerDashed} />

              <View style={styles.slipCenter}>
                <Text style={styles.slipFooterText}>Thank you for dining with us!</Text>
                <Text style={[styles.slipFooterText, { fontSize: 8, color: '#64748b', marginTop: 4 }]}>
                  Powered by Zaiqa Mahal Systems
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.slipActions}>
              <TouchableOpacity
                style={[styles.slipActionBtn, { backgroundColor: '#334155' }]}
                onPress={() => setSelectedOrderForSlip(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.slipActionBtnText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.slipActionBtn, { backgroundColor: '#f97316' }]}
                onPress={async () => {
                  if (!selectedOrderForSlip) return;
                  let parsedItems = [];
                  try {
                    if (typeof selectedOrderForSlip.items === 'string') {
                      parsedItems = JSON.parse(selectedOrderForSlip.items);
                    } else if (Array.isArray(selectedOrderForSlip.items)) {
                      parsedItems = selectedOrderForSlip.items;
                    }
                  } catch (e) {}

                  const itemsStr = parsedItems.map((item: any) => 
                    `${item.qty || item.quantity}x ${item.name || item.item_name} - Rs. ${(item.qty || item.quantity) * item.price}`
                  ).join('\n');

                  const textReceipt = 
`===========================
       ZAIQA MAHAL
===========================
Hasilpur, Ph: 0300-3910101
---------------------------
Order ID: #${selectedOrderForSlip.id}
Table: ${selectedOrderForSlip.table_number} (${selectedOrderForSlip.area})
Date: ${new Date(selectedOrderForSlip.created_at || Date.now()).toLocaleString('en-PK')}
Status: ${selectedOrderForSlip.status.toUpperCase()}
---------------------------
${itemsStr}
---------------------------
Subtotal: Rs. ${selectedOrderForSlip.total_amount}
GST: Rs. 0
TOTAL: Rs. ${selectedOrderForSlip.total_amount}
===========================
Thank you for dining with us!`;

                  try {
                    await Share.share({
                      message: textReceipt,
                      title: `Receipt_Order_${selectedOrderForSlip.id}`,
                    });
                    toast.success('Shared', 'Receipt shared successfully.');
                  } catch (e) {
                    toast.error('Failed', 'Could not share receipt.');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.slipActionBtnText}>Share Slip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    height: 72,
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
    top: '30%',
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 60,
    borderWidth: 3,
    borderRadius: 8,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
    opacity: 0.8,
  },
  slipStampText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
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
  slipFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
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
