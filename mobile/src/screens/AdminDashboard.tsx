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
  FlatList,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  Share,
} from 'react-native';
import {
  TrendingUp,
  Package,
  Layers,
  DollarSign,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  LogOut,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Download,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  username: string;
  name?: string;
  permissions?: string[];
  onLogout: () => void;
}

// Interfaces
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
  const [onlineMode, setOnlineMode] = useState<boolean>(true); // Default to online (Supabase) mode
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  // Data States
  const [tables, setTables] = useState<Table[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
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

  // Handle Back Button
  useEffect(() => {
    const backAction = () => {
      if (activeTab !== 'overview') {
        setActiveTab('overview');
        return true;
      }
      setShowExitModal(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [activeTab]);

  // Fetch Dashboard Data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (onlineMode) {
        // --- Cloud Supabase Mode ---
        // Fetch Tables
        const { data: dbTables, error: tErr } = await supabase.from('tables').select('*');
        if (tErr) throw tErr;
        setTables(dbTables || []);

        // Fetch Stock
        const { data: dbStock, error: sErr } = await supabase.from('stock_items').select('*');
        if (sErr) throw sErr;
        setStockItems(dbStock || []);

        // Fetch Orders
        const { data: dbOrders, error: oErr } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (oErr) throw oErr;
        setOrders(dbOrders || []);

        // Fetch Expenses
        const { data: dbExpenses, error: eErr } = await supabase.from('expenses').select('*');
        if (eErr) throw eErr;
        setExpenses(dbExpenses || []);
      } else {
        // --- Local Server Mode ---
        // Tables
        const resTables = await fetch(`${API_BASE}/tables`);
        if (!resTables.ok) throw new Error();
        const dataTables = await resTables.json();
        setTables(dataTables || []);

        // Stock
        const resStock = await fetch(`${API_BASE}/stock`);
        if (!resStock.ok) throw new Error();
        const dataStock = await resStock.json();
        setStockItems(dataStock || []);

        // Orders
        const resOrders = await fetch(`${API_BASE}/orders`);
        if (!resOrders.ok) throw new Error();
        const dataOrders = await resOrders.json();
        setOrders(dataOrders || []);

        // Expenses
        const resExpenses = await fetch(`${API_BASE}/expenses`);
        if (!resExpenses.ok) throw new Error();
        const dataExpenses = await resExpenses.json();
        setExpenses(dataExpenses || []);
      }
    } catch (err) {
      toast.error('Sync Error', 'Failed to fetch dashboard data. Please check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onlineMode]);

  // Recalculate statistics when datasets change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Total Sales (Today's orders status: completed)
    const todayOrders = orders.filter(o => o.created_at?.startsWith(today) || !o.created_at);
    const totalSales = orders
      .filter(o => o.status === 'completed')
      .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    // Active Orders (pending, preparing, ready)
    const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;

    // Occupied Tables
    const occupiedTables = tables.filter(t => t.status === 'dining').length;

    // Total Expenses
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
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>ADMIN CONSOLE</Text>
          <Text style={styles.headerSub}>{(name || username || '').toUpperCase()}</Text>
        </View>

        {/* Online/Offline Toggle */}
        <TouchableOpacity
          style={[styles.connectionToggle, { backgroundColor: onlineMode ? '#071526' : '#2a0a0a', borderColor: onlineMode ? '#1e3a8a' : '#ef4444' }]}
          onPress={() => setOnlineMode(!onlineMode)}
          activeOpacity={0.8}
        >
          {onlineMode ? <Wifi size={14} color="#3b82f6" /> : <WifiOff size={14} color="#ef4444" />}
          <Text style={[styles.connectionToggleText, { color: onlineMode ? '#3b82f6' : '#ef4444' }]}>
            {onlineMode ? 'CLOUD (SUPABASE)' : 'LOCAL SERVER'}
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Fetching live metrics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#3b82f6" />}
        >
          {/* TAB OVERVIEW */}
          {activeTab === 'overview' && (
            <View style={styles.contentWrapper}>
              {/* Stats Grid */}
              <View style={styles.gridContainer}>
                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                    <TrendingUp size={20} color="#16a34a" />
                  </View>
                  <Text style={styles.gridCardLabel}>Total Sales</Text>
                  <Text style={[styles.gridCardVal, { color: '#16a34a' }]}>Rs. {stats.totalSales}</Text>
                </View>

                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <TrendingDown size={20} color="#ef4444" />
                  </View>
                  <Text style={styles.gridCardLabel}>Total Expenses</Text>
                  <Text style={[styles.gridCardVal, { color: '#ef4444' }]}>Rs. {stats.totalExpenses}</Text>
                </View>
              </View>

              <View style={styles.gridContainer}>
                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <DollarSign size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.gridCardLabel}>Net Profit</Text>
                  <Text style={[styles.gridCardVal, { color: '#3b82f6' }]}>Rs. {stats.netProfit}</Text>
                </View>

                <View style={styles.gridCard}>
                  <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                    <Layers size={20} color="#f97316" />
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
              {orders.slice(0, 5).map((order) => (
                <View key={order.id} style={styles.orderItemCard}>
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
                </View>
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

      {/* Tab Navigation Menu */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' && styles.activeTabBtn]}
          onPress={() => setActiveTab('overview')}
        >
          <TrendingUp size={18} color={activeTab === 'overview' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabLabel, { color: activeTab === 'overview' ? '#3b82f6' : '#94a3b8' }]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'tables' && styles.activeTabBtn]}
          onPress={() => setActiveTab('tables')}
        >
          <Layers size={18} color={activeTab === 'tables' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabLabel, { color: activeTab === 'tables' ? '#3b82f6' : '#94a3b8' }]}>Tables</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'stock' && styles.activeTabBtn]}
          onPress={() => setActiveTab('stock')}
        >
          <Package size={18} color={activeTab === 'stock' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabLabel, { color: activeTab === 'stock' ? '#3b82f6' : '#94a3b8' }]}>Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'expenses' && styles.activeTabBtn]}
          onPress={() => setActiveTab('expenses')}
        >
          <TrendingDown size={18} color={activeTab === 'expenses' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabLabel, { color: activeTab === 'expenses' ? '#3b82f6' : '#94a3b8' }]}>Expenses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'reports' && styles.activeTabBtn]}
          onPress={() => setActiveTab('reports')}
        >
          <FileText size={18} color={activeTab === 'reports' ? '#3b82f6' : '#94a3b8'} />
          <Text style={[styles.tabLabel, { color: activeTab === 'reports' ? '#3b82f6' : '#94a3b8' }]}>Reports</Text>
        </TouchableOpacity>
      </View>

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
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  connectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 10,
  },
  connectionToggleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 12,
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
    backgroundColor: '#3b82f6',
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
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderCardSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderStatus: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
  tableItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tableCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  tableCardSub: {
    fontSize: 11,
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stockCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  stockCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  stockCardVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
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
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  expenseCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  expenseCardSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
  },
  analyticsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  analyticsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0f172a',
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
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
  },
  fullExportBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  bottomTabs: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeTabBtn: {
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exitModalCard: {
    width: '90%',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  exitIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  exitModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
  },
  exitModalDesc: {
    fontSize: 14,
    color: '#94a3b8',
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
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  exitCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  exitConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exitConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
