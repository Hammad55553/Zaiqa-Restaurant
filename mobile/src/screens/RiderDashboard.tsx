import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  Animated,
  Pressable,
  AppState,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Bike, LogOut, RefreshCw, Clock, MapPin, Phone, User, FileText, CheckCircle2, MoreVertical, X, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../config';
import { useToast } from '../components/Toast';
import { useServerStatus } from '../hooks/useServerStatus';
import NetworkStatusBar from '../components/NetworkStatusBar';
import LogoLoader from '../components/LogoLoader';

interface OrderItem {
  id: number;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface DeliveryOrder {
  id: number;
  table_number: string;
  area: string;
  customer_name: string;
  remarks?: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  subtotal: number;
  tax: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

interface RiderDashboardProps {
  username: string;
  onLogout: () => void;
}

export default function RiderDashboard({ username, onLogout }: RiderDashboardProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Network Status ──
  const { status: netStatus, ping: pingServer } = useServerStatus({
    pingInterval: 8000,
    onComeOnline: useCallback(() => {
      toast.success('Back Online', 'Rider reconnected to server.');
      fetchOrders(true);
    }, []),
    onGoOffline: useCallback(() => {
      toast.warning('Connection Lost', 'Rider display is offline.');
    }, []),
  });

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(false);
    try {
      const res = await fetch(`${API_BASE}/orders/active`);
      if (!res.ok) throw new Error('Server error');
      const data: DeliveryOrder[] = await res.json();

      // Filter only delivery orders (area === 'Delivery')
      const deliveryOrders = data.filter(o => o.area === 'Delivery');
      setOrders(deliveryOrders);
    } catch (err) {
      console.error(err);
      if (isRefresh) toast.error('Refresh Failed', 'Could not reach server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-poll every 8s
  useEffect(() => {
    fetchOrders();
    pollTimer.current = setInterval(() => fetchOrders(), 8000);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        fetchOrders();
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = setInterval(() => fetchOrders(), 8000);
      } else if (state === 'background') {
        if (pollTimer.current) clearInterval(pollTimer.current);
      }
    });

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      sub.remove();
    };
  }, []);

  const handleUpdateStatus = async (orderId: number, newStatus: 'completed') => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, clear_updates: true }),
      });
      if (!res.ok) throw new Error();

      toast.success('Delivered', `Order #${orderId} marked as delivered successfully.`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error('Update Failed', 'Could not update delivery status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCallCustomer = (phone: string) => {
    if (!phone || phone === 'N/A') return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      toast.error('Failed', 'Could not launch dialer.');
    });
  };

  const pendingDeliveries = orders.filter(o => o.status === 'pending');
  const preparingDeliveries = orders.filter(o => o.status === 'preparing');
  const readyDeliveries = orders.filter(o => o.status === 'ready');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <NetworkStatusBar status={netStatus} onRetry={pingServer} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}>
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/Logo.jpg')} style={styles.logoBadgeImg} resizeMode="cover" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>RIDER PORTAL</Text>
          <Text style={styles.headerSub}>RIDER • {username.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
          <LogOut size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#f97316' }]}>{pendingDeliveries.length}</Text>
          <Text style={styles.statLabel}>NEW</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#3b82f6' }]}>{preparingDeliveries.length}</Text>
          <Text style={styles.statLabel}>PREPARING</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{readyDeliveries.length}</Text>
          <Text style={styles.statLabel}>READY FOR DELIVERY</Text>
        </View>
      </View>

      {/* Deliveries List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <LogoLoader />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Bike size={44} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>No active deliveries</Text>
          <Text style={styles.emptySub}>Home delivery orders ready for delivery will appear here.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#f97316" />}
          showsVerticalScrollIndicator={false}
        >
          {orders.map(order => {
            const isReady = order.status === 'ready';
            const isPreparing = order.status === 'preparing';
            const isPending = order.status === 'pending';

            return (
              <View key={order.id} style={[styles.card, isReady && styles.readyCard]}>
                {/* Header of Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.orderIdBadge}>
                    <Text style={styles.orderIdText}>Order #{order.id}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={[
                    styles.statusPill,
                    isReady ? styles.statusReady : isPreparing ? styles.statusPreparing : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      isReady ? { color: '#16a34a' } : isPreparing ? { color: '#3b82f6' } : { color: '#f97316' }
                    ]}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.customerInfo}>
                  <View style={styles.infoRow}>
                    <User size={14} color="#64748b" />
                    <Text style={styles.customerName}>{order.customer_name || 'Walk-in Guest'}</Text>
                  </View>

                  {order.table_number && order.table_number !== 'Delivery' && (
                    <View style={styles.infoRow}>
                      <Phone size={14} color="#64748b" />
                      <Text style={styles.customerPhone} onPress={() => handleCallCustomer(order.table_number)}>
                        📞 Call Customer: {order.table_number}
                      </Text>
                    </View>
                  )}

                  {order.remarks && (
                    <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                      <MapPin size={14} color="#64748b" style={{ marginTop: 2 }} />
                      <Text style={styles.customerAddress} numberOfLines={2}>
                        {order.remarks || 'No Address Listed'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bill Row */}
                <View style={styles.billSummaryRow}>
                  <Text style={styles.billLabel}>Total Bill:</Text>
                  <Text style={styles.billValue}>Rs. {order.total_amount.toFixed(0)}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => setSelectedOrder(order)}
                    activeOpacity={0.7}
                  >
                    <FileText size={14} color="#64748b" />
                    <Text style={styles.detailBtnText}>View Bill Details</Text>
                  </TouchableOpacity>

                  {isReady ? (
                    <TouchableOpacity
                      style={styles.deliverBtn}
                      onPress={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={updatingId === order.id}
                      activeOpacity={0.8}
                    >
                      {updatingId === order.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <CheckCircle2 size={14} color="#ffffff" />
                          <Text style={styles.deliverBtnText}>Mark Delivered</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.waitBadge}>
                      <Clock size={12} color="#64748b" />
                      <Text style={styles.waitBadgeText}>Waiting for kitchen...</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Bill Detail Modal */}
      {selectedOrder && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bill Invoice #{selectedOrder.id}</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                  <X size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.receiptContainer}>
                  <Text style={styles.receiptTitle}>ZAIQA MAHAL</Text>
                  <Text style={styles.receiptSub}> Hasilpur, Ph: 0300-3910101</Text>
                  <View style={styles.dividerDashed} />

                  {/* Customer Block */}
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptRow}>Customer: {selectedOrder.customer_name}</Text>
                    {selectedOrder.table_number && (
                      <Text style={styles.receiptRow}>Phone: {selectedOrder.table_number}</Text>
                    )}
                    {selectedOrder.remarks && (
                      <Text style={styles.receiptRow}>Address: {selectedOrder.remarks}</Text>
                    )}
                  </View>
                  <View style={styles.dividerDashed} />

                  {/* Items list */}
                  <Text style={styles.receiptHeader}>ITEMS INVOICE</Text>
                  {selectedOrder.items.map((item, idx) => (
                    <View key={idx} style={styles.receiptItem}>
                      <Text style={styles.receiptItemName}>{item.quantity}x {item.item_name}</Text>
                      <Text style={styles.receiptItemPrice}>Rs. {(item.price * item.quantity).toFixed(0)}</Text>
                    </View>
                  ))}
                  <View style={styles.dividerSolid} />

                  {/* Totals */}
                  <View style={styles.receiptItem}>
                    <Text style={styles.receiptItemName}>Subtotal:</Text>
                    <Text style={styles.receiptItemPrice}>Rs. {selectedOrder.subtotal.toFixed(0)}</Text>
                  </View>
                  {selectedOrder.tax > 0 && (
                    <View style={styles.receiptItem}>
                      <Text style={styles.receiptItemName}>GST / Tax:</Text>
                      <Text style={styles.receiptItemPrice}>Rs. {selectedOrder.tax.toFixed(0)}</Text>
                    </View>
                  )}
                  <View style={styles.receiptItem}>
                    <Text style={[styles.receiptItemName, { fontWeight: '900', fontSize: 16 }]}>Grand Total:</Text>
                    <Text style={[styles.receiptItemPrice, { fontWeight: '900', fontSize: 16, color: '#f97316' }]}>
                      Rs. {selectedOrder.total_amount.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Text style={styles.modalCloseText}>Close Bill</Text>
                </TouchableOpacity>
                {selectedOrder.status === 'ready' && (
                  <TouchableOpacity
                    style={styles.modalDeliverBtn}
                    onPress={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                    disabled={updatingId === selectedOrder.id}
                  >
                    <Text style={styles.modalDeliverText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 72, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, backgroundColor: '#0f172a',
    borderBottomWidth: 3, borderColor: '#f97316',
  },
  logoBadge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#ffffff', overflow: 'hidden',
  },
  logoBadgeImg: { width: '100%', height: '100%' },
  headerTitle: {
    fontSize: 17, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 10, color: '#94a3b8', fontWeight: '800', letterSpacing: 1, marginTop: 2,
  },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155',
  },
  statsBar: {
    flexDirection: 'row', backgroundColor: '#0f172a',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#1e293b',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: '#1e293b', marginVertical: 2 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f1f5f9',
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6,
  },
  emptySub: {
    fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  readyCard: {
    borderColor: '#16a34a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderIdBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderIdText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusReady: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  statusPreparing: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statusPending: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  customerInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  customerPhone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  customerAddress: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 16,
  },
  billSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  billLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  billValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f97316',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  deliverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deliverBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  waitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  waitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingBottom: 20,
  },
  receiptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    color: '#000',
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1,
  },
  receiptSub: {
    fontSize: 10,
    color: '#444444',
    textAlign: 'center',
    marginTop: 4,
  },
  dividerDashed: {
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  dividerSolid: {
    borderWidth: 1.2,
    borderColor: '#000000',
    marginVertical: 10,
  },
  receiptSection: {
    gap: 4,
  },
  receiptRow: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '600',
  },
  receiptHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptItemName: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  receiptItemPrice: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCloseBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalDeliverBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 14,
  },
  modalDeliverText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
