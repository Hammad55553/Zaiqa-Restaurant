import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  Animated,
  Pressable,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import { Flame, CheckCircle2, LogOut, MoreVertical, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../../config';
import { useToast } from '../../components/Toast';
import { useServerStatus } from '../../hooks/useServerStatus';
import NetworkStatusBar from '../../components/NetworkStatusBar';
import KitchenLiveScreen from './KitchenLiveScreen';
import KitchenHistoryScreen from './KitchenHistoryScreen';
import { KitchenOrder, OrderStatus } from './types';
import ChatScreen from '../ChatScreen';

interface KitchenDashboardProps {
  username: string;
  name?: string;
  permissions?: string[];
  onLogout: () => void;
}

// ─── Dots Menu ────────────────────────────────────────────────────────────────

interface DotsMenuProps {
  onLogout: () => void;
  onRefresh: () => void;
}

function DotsMenu({ onLogout, onRefresh }: DotsMenuProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <TouchableOpacity style={styles.dotsBtn} onPress={showMenu} activeOpacity={0.7}>
        <MoreVertical size={20} color="#ffffff" />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="none" onRequestClose={() => hideMenu()}>
        <Pressable style={styles.modalOverlay} onPress={() => hideMenu()}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[styles.dropdownCard, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => hideMenu(onRefresh)}>
                <View style={[styles.menuIcon, { backgroundColor: '#071526' }]}>
                  <RefreshCw size={16} color="#3b82f6" />
                </View>
                <Text style={styles.menuLabel}>Refresh Orders</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />

              <View style={styles.menuDivider} />

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
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function KitchenDashboard({ username, name, permissions, onLogout }: KitchenDashboardProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const chatEnabled = permissions?.includes('chat') || false;
  const [showChat, setShowChat] = useState(false);

  // ── Network Status ──
  const { status: netStatus, ping: pingServer } = useServerStatus({
    pingInterval: 8000,
    onComeOnline: useCallback(() => {
      toast.success('Back Online', 'Kitchen reconnected to server.');
      fetchLive(true);
    }, []),
    onGoOffline: useCallback(() => {
      toast.warning('Connection Lost', 'Kitchen display is offline.');
    }, []),
  });

  const [liveOrders, setLiveOrders] = useState<KitchenOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<KitchenOrder[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderIds = useRef<Set<number>>(new Set());

  // ── Fetch live orders ──
  const fetchLive = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingLive(true);
    try {
      const res = await fetch(`${API_BASE}/orders/active`);
      if (!res.ok) throw new Error('Server error');
      const data: KitchenOrder[] = await res.json();

      // Detect new orders for toast notification
      const newIds = new Set(data.map(o => o.id));
      const brandNew = data.filter(o => !prevOrderIds.current.has(o.id) && !loadingLive);
      if (brandNew.length > 0) {
        toast.info(
          `${brandNew.length} New Order${brandNew.length > 1 ? 's' : ''}!`,
          brandNew.map(o => `Table ${o.table_number}`).join(', ')
        );
      }
      prevOrderIds.current = newIds;
      setLiveOrders(data);
    } catch {
      if (isRefresh) toast.error('Refresh Failed', 'Could not reach server.');
    } finally {
      setLoadingLive(false);
      setRefreshingLive(false);
    }
  }, []);

  // ── Fetch completed orders ──
  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingHistory(true);
    else setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/orders/completed?limit=50`);
      if (!res.ok) throw new Error();
      const data: KitchenOrder[] = await res.json();
      setCompletedOrders(data);
    } catch {
      if (isRefresh) toast.error('Refresh Failed', 'Could not reach server.');
    } finally {
      setLoadingHistory(false);
      setRefreshingHistory(false);
    }
  }, []);

  // Auto-poll every 8s + instant refresh on WebSocket sync trigger
  useEffect(() => {
    fetchLive();
    pollTimer.current = setInterval(() => fetchLive(), 8000);

    const syncSub = DeviceEventEmitter.addListener('SYNC_TRIGGER', (event) => {
      if (event.url.includes('/orders')) {
        fetchLive();
      }
    });

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        fetchLive();
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = setInterval(() => fetchLive(), 8000);
      } else if (state === 'background') {
        if (pollTimer.current) clearInterval(pollTimer.current);
      }
    });

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      syncSub.remove();
      sub.remove();
    };
  }, [fetchLive]);

  // Load history when switching tabs
  useEffect(() => {
    if (activeTab === 'history' && completedOrders.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  // ── Change order status ──
  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, clear_updates: true }),
      });
      if (!res.ok) throw new Error();

      if (newStatus === 'completed') {
        setLiveOrders(prev => prev.filter(o => o.id !== orderId));
        // Refresh history tab if open
        if (activeTab === 'history') fetchHistory(true);
        toast.success('Order Completed', `Order #${orderId} marked done.`);
      } else {
        setLiveOrders(prev =>
          prev.map(o => o.id === orderId ? { ...o, status: newStatus, has_new_updates: 0 } : o)
        );
        const labels: Record<string, string> = { preparing: 'Cooking Started', ready: 'Ready to Serve' };
        toast.success(labels[newStatus] || 'Updated', `Order #${orderId} status updated.`);
      }
    } catch {
      toast.error('Update Failed', 'Could not update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = liveOrders.filter(o => o.status === 'pending').length;
  const preparingCount = liveOrders.filter(o => o.status === 'preparing').length;
  const readyCount = liveOrders.filter(o => o.status === 'ready').length;

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/Logo.jpg')} style={styles.watermark} resizeMode="contain" />
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ── Network Status Bar ── */}
      <NetworkStatusBar status={netStatus} onRetry={pingServer} />



      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Image source={require('../../../assets/Logo.jpg')} style={styles.logoBadgeImg} resizeMode="cover" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>KITCHEN DISPLAY</Text>
          <Text style={styles.headerSub}>CHEF • {(name || username).toUpperCase()}</Text>
        </View>
        {chatEnabled && (
          <TouchableOpacity style={[styles.dotsBtn, { marginRight: 8 }]} onPress={() => setShowChat(true)} activeOpacity={0.7}>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </TouchableOpacity>
        )}
        <DotsMenu onLogout={onLogout} onRefresh={() => fetchLive(true)} />
      </View>

      {!showChat ? (
        <>

      {/* ── Live Stats Bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#f97316' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>NEW</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#3b82f6' }]}>{preparingCount}</Text>
          <Text style={styles.statLabel}>COOKING</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{readyCount}</Text>
          <Text style={styles.statLabel}>READY</Text>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'live' && styles.activeTabBtn]}
          onPress={() => setActiveTab('live')}
        >
          <Flame size={16} color={activeTab === 'live' ? '#ffffff' : '#94a3b8'} />
          <Text style={[styles.tabLabel, activeTab === 'live' && styles.activeTabLabel]}>LIVE ORDERS</Text>
          {liveOrders.length > 0 && (
            <View style={[styles.tabBadge, pendingCount > 0 && { backgroundColor: '#f97316' }]}>
              <Text style={styles.tabBadgeText}>{liveOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.activeTabBtn]}
          onPress={() => setActiveTab('history')}
        >
          <CheckCircle2 size={16} color={activeTab === 'history' ? '#ffffff' : '#94a3b8'} />
          <Text style={[styles.tabLabel, activeTab === 'history' && styles.activeTabLabel]}>COMPLETED</Text>
        </TouchableOpacity>
      </View>

      {/* ── Screens ── */}
      {activeTab === 'live' ? (
        <KitchenLiveScreen
          orders={liveOrders}
          loading={loadingLive}
          refreshing={refreshingLive}
          onRefresh={() => fetchLive(true)}
          onStatusChange={handleStatusChange}
          updatingId={updatingId}
        />
      ) : (
        <KitchenHistoryScreen
          orders={completedOrders}
          loading={loadingHistory}
          refreshing={refreshingHistory}
          onRefresh={() => fetchHistory(true)}
        />
      )}
        </>
      ) : (
        <ChatScreen username={username} name={name} role="kitchen" onBack={() => setShowChat(false)} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  watermark: {
    position: 'absolute', width: '80%', height: '80%',
    opacity: 0.03, alignSelf: 'center', top: '10%', zIndex: -1,
  },
  header: {
    height: 72, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, backgroundColor: '#0f172a',
    borderBottomWidth: 3, borderColor: '#16a34a',
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
  dotsBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155',
  },
  statsBar: {
    flexDirection: 'row', backgroundColor: '#0f172a',
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#1e293b',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: '#1e293b', marginVertical: 2 },
  mainTabs: {
    flexDirection: 'row', backgroundColor: '#0f172a', padding: 5,
    borderRadius: 14, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, gap: 6, borderRadius: 10,
  },
  activeTabBtn: { backgroundColor: '#15803d' },
  tabLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  activeTabLabel: { color: '#ffffff' },
  tabBadge: {
    backgroundColor: '#374151', borderRadius: 8, minWidth: 18,
    height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  tabBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  modalOverlay: { flex: 1, alignItems: 'flex-end', paddingTop: 78, paddingRight: 16 },
  dropdownCard: {
    backgroundColor: '#1e293b', borderRadius: 16, minWidth: 200,
    borderWidth: 1, borderColor: '#334155', shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5,
    shadowRadius: 24, elevation: 16, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', flex: 1 },
  menuDivider: { height: 1, backgroundColor: '#334155', marginHorizontal: 12 },
});
