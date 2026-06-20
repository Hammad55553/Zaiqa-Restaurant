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
  DeviceEventEmitter,
  TextInput,
  Alert,
  BackHandler,
} from 'react-native';
import { Bike, LogOut, RefreshCw, Clock, MapPin, Phone, User, FileText, CheckCircle2, MoreVertical, X, AlertCircle, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, serverIP, setServerIP } from '../config';
import { useToast } from '../components/Toast';
import { useServerStatus } from '../hooks/useServerStatus';
import NetworkStatusBar from '../components/NetworkStatusBar';
import LogoLoader from '../components/LogoLoader';
import ChatScreen from './ChatScreen';

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
  name?: string;
  permissions?: string[];
  onLogout: () => void;
}

interface DotsMenuProps {
  onLogout: () => void;
}

function DotsMenu({ onLogout }: DotsMenuProps) {
  const [open, setOpen] = useState(false);
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(serverIP);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showMenu = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const hideMenu = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setOpen(false);
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      cb?.();
    });
  };

  const handleSaveIP = async () => {
    if (!ipInput.trim()) {
      Alert.alert('Required', 'Server IP cannot be empty.');
      return;
    }
    try {
      await setServerIP(ipInput.trim());
      setIpModalVisible(false);
      Alert.alert(
        'Server Config Saved',
        `Server IP successfully updated to: ${ipInput.trim()}\n\nThe app will now connect to the new server IP.`
      );
    } catch (e) {
      Alert.alert('Save Failed', 'Could not update server IP.');
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.dotsBtn} onPress={showMenu} activeOpacity={0.7}>
        <MoreVertical size={20} color="#ffffff" />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="none" onRequestClose={() => hideMenu()}>
        <Pressable style={styles.modalOverlay} onPress={() => hideMenu()}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.dropdownCard,
                { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
              ]}
            >
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: '#334155' }]}
                onPress={() => {
                  hideMenu();
                  setIpInput(serverIP);
                  setIpModalVisible(true);
                }}
              >
                <View style={[styles.menuIcon, { backgroundColor: '#1e3a8a' }]}>
                  <Settings size={16} color="#3b82f6" />
                </View>
                <Text style={styles.menuLabel}>Server Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => hideMenu(onLogout)}>
                <View style={[styles.menuIcon, { backgroundColor: '#2a0a0a' }]}>
                  <LogOut size={16} color="#ef4444" />
                </View>
                <Text style={[styles.menuLabel, { color: '#ef4444' }]}>Logout</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Change IP Modal */}
      <Modal
        visible={ipModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIpModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.6)' }}>
          <View style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 20, width: '85%', borderWidth: 1, borderColor: '#334155' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Server Configuration
            </Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
              Update the server IP address to connect to another terminal.
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f97316', marginBottom: 6, textTransform: 'uppercase' }}>
              Server IP Address
            </Text>
            <TextInput
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
                color: '#ffffff',
                fontWeight: '600',
                marginBottom: 20,
              }}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="e.g. 192.168.100.57"
              placeholderTextColor="#475569"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#334155',
                  alignItems: 'center',
                }}
                onPress={() => setIpModalVisible(false)}
              >
                <Text style={{ color: '#94a3b8', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: '#f97316',
                  alignItems: 'center',
                }}
                onPress={handleSaveIP}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Save Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function RiderDashboard({ username, name, permissions, onLogout }: RiderDashboardProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const chatEnabled = permissions?.includes('chat') || false;
  const [showChat, setShowChat] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rider history report states
  const [activeTab, setActiveTab] = useState<'active' | 'report'>('active');
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    const backAction = () => {
      if (showChat) {
        setShowChat(false);
        return true;
      }
      if (selectedOrder) {
        setSelectedOrder(null);
        return true;
      }
      if (activeTab !== 'active') {
        setActiveTab('active');
        return true;
      }
      setShowExitModal(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [showChat, selectedOrder, activeTab]);

  const fetchRiderReport = useCallback(async () => {
    try {
      setLoadingReport(true);
      const res = await fetch(`${API_BASE}/orders/rider/${username}`);
      if (res.ok) {
        const data = await res.json();
        setCompletedOrders(data);
      }
    } catch (err) {
      console.warn("Failed to fetch rider report:", err);
    } finally {
      setLoadingReport(false);
    }
  }, [username]);

  // ── Network Status ──
  const { status: netStatus, ping: pingServer } = useServerStatus({
    pingInterval: 8000,
    onComeOnline: useCallback(() => {
      toast.success('Back Online', 'Rider reconnected to server.');
      fetchOrders(true);
      if (activeTab === 'report') fetchRiderReport();
    }, [activeTab]),
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

      // Filter only delivery orders (area === 'Delivery') that are ready
      const deliveryOrders = data.filter(o => o.area === 'Delivery' && o.status === 'ready');
      setOrders(deliveryOrders);
    } catch (err) {
      console.error(err);
      if (isRefresh) toast.error('Refresh Failed', 'Could not reach server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-poll every 8s + instant refresh on WebSocket sync trigger
  useEffect(() => {
    fetchOrders();
    pollTimer.current = setInterval(() => fetchOrders(), 8000);

    const syncSub = DeviceEventEmitter.addListener('SYNC_TRIGGER', (event) => {
      if (event && typeof event.url === 'string' && (event.url.includes('/orders') || event.url.includes('/deliveries'))) {
        fetchOrders();
      }
    });

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
      syncSub.remove();
      sub.remove();
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: number, newStatus: 'completed') => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, clear_updates: true, delivered_by: username }),
      });
      if (!res.ok) throw new Error();

      toast.success('Delivered', `Order #${orderId} marked as delivered successfully.`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      // Refresh the report dynamically
      fetchRiderReport();
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
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/Logo.jpg')} style={styles.logoBadgeImg} resizeMode="cover" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>RIDER PORTAL</Text>
          <Text style={styles.headerSub}>RIDER • {(name || username).toUpperCase()}</Text>
        </View>
        {chatEnabled && (
          <TouchableOpacity style={[styles.logoutBtn, { marginRight: 8 }]} onPress={() => setShowChat(true)} activeOpacity={0.7}>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </TouchableOpacity>
        )}
        <DotsMenu onLogout={onLogout} />
      </View>

      {!showChat ? (
        <>
          {/* Sub Tab Bar */}
          <View style={styles.subTabBar}>
            <TouchableOpacity 
              style={[styles.subTabBtn, activeTab === 'active' && styles.subTabBtnActive]} 
              onPress={() => setActiveTab('active')}
            >
              <Text style={[styles.subTabLabel, activeTab === 'active' && styles.subTabLabelActive]}>
                ACTIVE DELIVERIES ({orders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subTabBtn, activeTab === 'report' && styles.subTabBtnActive]} 
              onPress={() => {
                setActiveTab('report');
                fetchRiderReport();
              }}
            >
              <Text style={[styles.subTabLabel, activeTab === 'report' && styles.subTabLabelActive]}>
                MY DAILY REPORT
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'report' ? (
            loadingReport ? (
              <View style={styles.centerLoading}>
                <LogoLoader />
              </View>
            ) : completedOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <FileText size={44} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>No deliveries completed today</Text>
                <Text style={styles.emptySub}>Your delivered home orders will show up here as a daily summary.</Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loadingReport} onRefresh={fetchRiderReport} tintColor="#f97316" />}
                showsVerticalScrollIndicator={false}
              >
                {/* Rider Stats Summary */}
                <View style={styles.reportSummaryCard}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryVal}>{completedOrders.length}</Text>
                    <Text style={styles.summaryLabel}>TOTAL DELIVERED</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <Text style={[styles.summaryVal, { color: '#16a34a' }]}>
                      Rs. {completedOrders.reduce((acc, o) => acc + o.total_amount, 0).toFixed(0)}
                    </Text>
                    <Text style={styles.summaryLabel}>CASH COLLECTED</Text>
                  </View>
                </View>

                {completedOrders.map(order => (
                  <View key={order.id} style={[styles.card, styles.completedOrderCard]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.orderIdBadge, { backgroundColor: '#1e293b' }]}>
                        <Text style={styles.orderIdText}>Order #{order.id}</Text>
                      </View>
                      <Text style={styles.completedTimeText}>
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View style={styles.customerInfo}>
                      <View style={styles.infoRow}>
                        <User size={14} color="#64748b" />
                        <Text style={styles.customerName}>{order.customer_name}</Text>
                      </View>
                      {order.remarks && (
                        <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                          <MapPin size={14} color="#64748b" style={{ marginTop: 2 }} />
                          <Text style={styles.customerAddress}>{order.remarks}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.billSummaryRow}>
                      <Text style={styles.billLabel}>Delivered Total:</Text>
                      <Text style={[styles.billValue, { color: '#16a34a' }]}>Rs. {order.total_amount.toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          ) : (
            /* ACTIVE DELIVERIES LIST */
            loading ? (
              <View style={styles.centerLoading}>
                <LogoLoader />
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Bike size={44} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>No ready deliveries</Text>
                <Text style={styles.emptySub}>Orders marked as READY by the kitchen will appear here for you to deliver.</Text>
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

                  return (
                    <View key={order.id} style={[styles.card, isReady && styles.readyCard]}>
                      {/* Header of Card */}
                      <View style={styles.cardHeader}>
                        <View style={styles.orderIdBadge}>
                          <Text style={styles.orderIdText}>Order #{order.id}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <View style={[styles.statusPill, styles.statusReady]}>
                          <Text style={[styles.statusPillText, { color: '#16a34a' }]}>
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
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )
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
        </>
      ) : (
        <ChatScreen username={username} name={name} role="rider" onBack={() => setShowChat(false)} />
      )}

      {/* EXIT CONFIRMATION MODAL */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalCard}>
            <View style={styles.exitIconCircle}>
              <AlertCircle size={28} color="#f97316" />
            </View>
            
            <Text style={styles.exitModalTitle}>Exit Application?</Text>
            <Text style={styles.exitModalDesc}>Are you sure you want to exit Zaiqa Mahal Rider Portal?</Text>
            
            <View style={styles.exitModalActions}>
              <TouchableOpacity 
                style={styles.exitCancelBtn} 
                onPress={() => setShowExitModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.exitCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exitConfirmBtn} 
                onPress={() => BackHandler.exitApp()}
                activeOpacity={0.7}
              >
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
  dotsBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 20,
  },
  dropdownCard: {
    width: 180,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
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
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 4,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: '#ea580c',
  },
  subTabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  subTabLabelActive: {
    color: '#ffffff',
  },
  reportSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  summaryDivider: {
    width: 1.5,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  completedOrderCard: {
    borderColor: '#cbd5e1',
    opacity: 0.85,
  },
  completedTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
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
