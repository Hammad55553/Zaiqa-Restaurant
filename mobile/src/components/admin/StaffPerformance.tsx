import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { User, CheckCircle2, XCircle, Wallet, CreditCard, TrendingUp, Receipt, ChevronRight, Clock } from 'lucide-react-native';
import { API_BASE } from '../../config';

const { width } = Dimensions.get('window');

interface StaffPerformanceProps {
  onRefresh?: boolean;
}

export default function StaffPerformance({ onRefresh }: StaffPerformanceProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'weekly' | 'monthly'>('today');

  useEffect(() => {
    fetchData();
  }, [onRefresh, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      setUsers(usersData);

      const ordersRes = await fetch(`${API_BASE}/reports/orders?limit=1000`);
      const ordersData = ordersRes.ok ? await ordersRes.json() : [];
      setOrders(ordersData);

      if (usersData.length > 0 && !selectedUser) {
        setSelectedUser(usersData[0]);
      }
    } catch (err) {
      console.warn('Failed to load staff performance', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = (username: string) => {
    let filtered = orders.filter(o => o.created_by === username);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (dateFilter === 'today') {
      filtered = filtered.filter(o => o.created_at && new Date(o.created_at) >= today);
    } else if (dateFilter === 'weekly') {
      filtered = filtered.filter(o => o.created_at && new Date(o.created_at) >= sevenDaysAgo);
    } else if (dateFilter === 'monthly') {
      filtered = filtered.filter(o => o.created_at && new Date(o.created_at) >= thirtyDaysAgo);
    }

    return filtered;
  };

  const getUserMetrics = (username: string) => {
    const userOrders = getFilteredOrders(username);
    const completedOrders = userOrders.filter(o => o.status === 'completed');
    
    const totalSales = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const orderCount = userOrders.length;
    const avgOrderValue = orderCount > 0 ? (totalSales / (completedOrders.length || 1)) : 0;

    const completedCount = completedOrders.length;
    const cancelledCount = userOrders.filter(o => o.status === 'cancelled').length;
    const pendingCount = userOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;

    const cashSales = completedOrders.filter(o => !o.payment_status || ['PAID', 'CASH ON DELIVERY', 'NONE'].includes(o.payment_status)).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const onlineSales = completedOrders.filter(o => ['ONLINE PAID', 'BANK TRANSFER'].includes(o.payment_status)).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const khataSales = completedOrders.filter(o => o.payment_status === 'PENDING').reduce((sum, o) => sum + (o.total_amount || 0), 0);

    let rank = 'Active Member';
    if (totalSales >= 40000) rank = 'Star Gold Seller';
    else if (totalSales >= 15000) rank = 'Silver Elite';
    else if (totalSales >= 5000) rank = 'Rising Star';

    return { totalSales, orderCount, avgOrderValue, completedCount, cancelledCount, pendingCount, cashSales, onlineSales, khataSales, rank };
  };

  if (loading && users.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  const activeUserMetrics = selectedUser ? getUserMetrics(selectedUser.username) : null;
  const activeUserOrders = selectedUser ? getFilteredOrders(selectedUser.username) : [];

  return (
    <View style={styles.container}>
      
      {/* Top Navigation & Filters */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Performance</Text>
        <View style={styles.filterRow}>
          {(['today', 'weekly', 'monthly'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, dateFilter === filter && styles.filterChipActive]}
              onPress={() => setDateFilter(filter)}
            >
              <Text style={[styles.filterChipText, dateFilter === filter && styles.filterChipTextActive]}>
                {filter === 'today' ? 'Today' : filter === 'weekly' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Horizontal User Strip */}
        <View style={styles.userStripContainer}>
          <Text style={styles.sectionTitle}>Select Staff Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userStrip}>
            {users.map(u => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.userAvatarWrapper, isSelected && styles.userAvatarWrapperActive]}
                  onPress={() => setSelectedUser(u)}
                >
                  <View style={[styles.userAvatar, isSelected && styles.userAvatarActive]}>
                    <User size={24} color={isSelected ? '#ffffff' : '#f97316'} />
                  </View>
                  <Text style={[styles.userAvatarName, isSelected && styles.userAvatarNameActive]} numberOfLines={1}>
                    {u.name?.split(' ')[0] || u.username}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedUser && activeUserMetrics ? (
          <View style={styles.metricsContainer}>
            
            {/* Selected Profile Header */}
            <View style={styles.selectedProfileCard}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{selectedUser.name || selectedUser.username}</Text>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>🏆 {activeUserMetrics.rank}</Text>
                </View>
              </View>
              <Text style={styles.profileSales}>Rs. {activeUserMetrics.totalSales.toLocaleString()}</Text>
              <Text style={styles.profileSalesLabel}>Total Revenue</Text>
            </View>

            {/* Core Stats Grid */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Receipt size={20} color="#f97316" />
                <Text style={styles.statBoxValue}>{activeUserMetrics.orderCount}</Text>
                <Text style={styles.statBoxLabel}>Orders Taken</Text>
              </View>
              <View style={styles.statBox}>
                <TrendingUp size={20} color="#3b82f6" />
                <Text style={styles.statBoxValue}>Rs. {Math.round(activeUserMetrics.avgOrderValue).toLocaleString()}</Text>
                <Text style={styles.statBoxLabel}>Avg. Ticket</Text>
              </View>
            </View>

            {/* Payment Breakdowns */}
            <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breakdownStrip}>
              <View style={[styles.breakdownCard, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
                <Wallet size={18} color="#ea580c" />
                <Text style={styles.breakdownCardValue}>Rs. {activeUserMetrics.cashSales.toLocaleString()}</Text>
                <Text style={styles.breakdownCardLabel}>Cash Sales</Text>
              </View>
              <View style={[styles.breakdownCard, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                <CreditCard size={18} color="#2563eb" />
                <Text style={styles.breakdownCardValue}>Rs. {activeUserMetrics.onlineSales.toLocaleString()}</Text>
                <Text style={styles.breakdownCardLabel}>Online Paid</Text>
              </View>
              <View style={[styles.breakdownCard, { backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }]}>
                <TrendingUp size={18} color="#9333ea" />
                <Text style={styles.breakdownCardValue}>Rs. {activeUserMetrics.khataSales.toLocaleString()}</Text>
                <Text style={styles.breakdownCardLabel}>Khata Udhaar</Text>
              </View>
            </ScrollView>

            {/* Status Breakdowns */}
            <Text style={styles.sectionTitle}>Order Statuses</Text>
            <View style={styles.statusGrid}>
              <View style={[styles.statusBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <CheckCircle2 size={24} color="#16a34a" />
                <Text style={[styles.statusValue, { color: '#16a34a' }]}>{activeUserMetrics.completedCount}</Text>
                <Text style={styles.statusLabel}>Completed</Text>
              </View>
              <View style={[styles.statusBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <XCircle size={24} color="#dc2626" />
                <Text style={[styles.statusValue, { color: '#dc2626' }]}>{activeUserMetrics.cancelledCount}</Text>
                <Text style={styles.statusLabel}>Cancelled</Text>
              </View>
              <View style={[styles.statusBox, { backgroundColor: '#fffbeb', borderColor: '#fef08a' }]}>
                <Clock size={24} color="#ca8a04" />
                <Text style={[styles.statusValue, { color: '#ca8a04' }]}>{activeUserMetrics.pendingCount}</Text>
                <Text style={styles.statusLabel}>Pending</Text>
              </View>
            </View>

            {/* Recent Activity List */}
            <Text style={styles.sectionTitle}>Recent Orders (Top 10)</Text>
            <View style={styles.recentActivityContainer}>
              {activeUserOrders.slice(0, 10).map((o, idx) => (
                <View key={o.id || idx} style={styles.recentItem}>
                  <View style={styles.recentItemLeft}>
                    <Text style={styles.recentItemTitle}>Order #{o.id}</Text>
                    <Text style={styles.recentItemTime}>
                      {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {o.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.recentItemAmount}>Rs. {o.total_amount?.toLocaleString()}</Text>
                </View>
              ))}
              {activeUserOrders.length === 0 && (
                <View style={styles.emptyActivity}>
                  <Text style={styles.emptyActivityText}>No orders recorded for this period.</Text>
                </View>
              )}
            </View>
            
          </View>
        ) : (
          <View style={styles.centerContainer}>
             <User size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
             <Text style={styles.loadingText}>No staff data available.</Text>
             <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>Try refreshing or adding staff members.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  userStripContainer: {
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  userStrip: {
    paddingHorizontal: 12,
    gap: 12,
  },
  userAvatarWrapper: {
    alignItems: 'center',
    width: 64,
  },
  userAvatarWrapperActive: {},
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userAvatarActive: {
    backgroundColor: '#f97316',
    borderColor: '#fed7aa',
  },
  userAvatarName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  userAvatarNameActive: {
    color: '#f97316',
    fontWeight: '800',
  },
  metricsContainer: {
    padding: 16,
  },
  selectedProfileCard: {
    backgroundColor: '#f97316',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileSales: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  profileSalesLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  breakdownStrip: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  breakdownCard: {
    width: width * 0.35,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  breakdownCardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
  },
  breakdownCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statusItemText: {
    marginLeft: 10,
  },
  statusItemLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statusItemValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  emptyOrdersText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  ordersList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderItemLeft: {
    width: 60,
  },
  orderItemId: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  orderItemTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  orderItemMiddle: {
    flex: 1,
    paddingHorizontal: 12,
  },
  orderItemTable: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeSuccess: { backgroundColor: '#dcfce7' },
  statusBadgeError: { backgroundColor: '#fee2e2' },
  statusBadgeWarning: { backgroundColor: '#fef3c7' },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextSuccess: { color: '#16a34a' },
  statusTextError: { color: '#dc2626' },
  statusTextWarning: { color: '#d97706' },
  orderItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderItemAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  statusBox: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  recentActivityContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    justifyContent: 'space-between',
  },
  recentItemLeft: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  recentItemTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },
  recentItemAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyActivityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
