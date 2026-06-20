import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  TextInput,
  Alert,
  BackHandler,
} from 'react-native';
import { LogOut, Layers, Clock, ArrowLeft, MoreVertical, WifiOff, Settings, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, serverIP, setServerIP } from '../config';
import { useToast } from '../components/Toast';
import { useServerStatus } from '../hooks/useServerStatus';
import NetworkStatusBar from '../components/NetworkStatusBar';

// Import Separated Screens
import TablesScreen from './TablesScreen';
import HistoryScreen from './HistoryScreen';
import OrderingScreen from './OrderingScreen';
import OfflineQueueScreen from './OfflineQueueScreen';
import ChatScreen from './ChatScreen';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Table {
  id: number;
  number: string;
  area: string;
  seats: number;
  status: string;
  startTime?: string;
}

interface MenuItem {
  id: any;
  name: string;
  price: number;
  category_name?: string;
  image?: string;
}
interface CartItem extends MenuItem {
  qty: number;
  notes?: string;
}

interface QueuedOrder {
  id: string;
  table_number: string;
  area: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total_amount: number;
  remarks: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

interface WaiterDashboardProps {
  username: string;
  name?: string;
  permissions?: string[];
  onLogout: () => void;
}

// ─── Three-dot Dropdown Menu ──────────────────────────────────────────────────

interface DotsMenuProps {
  onLogout: () => void;
}

function DotsMenu({ onLogout }: DotsMenuProps) {
  const [open, setOpen] = useState(false);
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [ipInput, setIpInput] = useState(serverIP);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const toast = useToast();

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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function WaiterDashboard({ username, name, permissions, onLogout }: WaiterDashboardProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'tables' | 'history' | 'queue' | 'chat'>('tables');
  
  const chatEnabled = permissions?.includes('chat') || false;

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [initialCartItems, setInitialCartItems] = useState<CartItem[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    const backAction = () => {
      if (selectedTable) {
        handleBackToFloor();
        return true;
      }
      if (activeTab !== 'tables') {
        setActiveTab('tables');
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
  }, [selectedTable, activeTab]);

  const [queue, setQueue] = useState<QueuedOrder[]>([]);
  const [syncingQueue, setSyncingQueue] = useState(false);

  // ── Network Status ──
  const { status: netStatus, ping: pingServer } = useServerStatus({
    pingInterval: 8000,
    onComeOnline: useCallback(() => {
      // Auto-sync queue when connection is restored
      toast.success('Back Online', 'Connection restored!');
    }, []),
    onGoOffline: useCallback(() => {
      toast.warning('No Connection', 'Server unreachable. Orders will be queued offline.');
    }, []),
  });

  // ── Sync all pending/failed orders ──
  const syncOfflineQueue = async () => {
    if (queue.length === 0) return;
    setSyncingQueue(true);
    setQueue(prev => prev.map(o => ({ ...o, status: 'syncing' as const })));
    let successCount = 0;
    const remainingQueue: QueuedOrder[] = [];

    for (const order of queue) {
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: order.table_number,
            area: order.area,
            customer_name: `Table Guest (Offline Sync)`,
            remarks: order.remarks,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            total_amount: order.total_amount,
          }),
        });
        if (res.ok) successCount++;
        else remainingQueue.push({ ...order, status: 'failed' });
      } catch {
        remainingQueue.push({ ...order, status: 'failed' });
      }
    }

    setQueue(remainingQueue);
    setSyncingQueue(false);

    if (successCount > 0) {
      toast.success('Sync Complete', `${successCount} order(s) sent to kitchen.`);
    } else {
      toast.error('Sync Failed', 'Server unreachable. Orders still in queue.');
    }
  };

  // ── Retry a single order ──
  const retryOneOrder = async (order: QueuedOrder) => {
    setQueue(prev => prev.map(o => o.id === order.id ? { ...o, status: 'syncing' } : o));
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: order.table_number,
          area: order.area,
          customer_name: `Table Guest (Offline Sync)`,
          remarks: order.remarks,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          total_amount: order.total_amount,
        }),
      });
      if (res.ok) {
        setQueue(prev => prev.filter(o => o.id !== order.id));
        toast.success('Order Sent!', `Table ${order.table_number} synced to kitchen.`);
      } else {
        setQueue(prev => prev.map(o => o.id === order.id ? { ...o, status: 'failed' } : o));
        toast.error('Retry Failed', 'Server returned an error. Try again.');
      }
    } catch {
      setQueue(prev => prev.map(o => o.id === order.id ? { ...o, status: 'failed' } : o));
      toast.error('No Connection', 'Could not reach server.');
    }
  };

  const handleQueueOfflineOrder = (newQueuedOrder: QueuedOrder) => {
    setQueue(prev => [...prev, newQueuedOrder]);
    // Switch to queue tab to show the stuck order
    setActiveTab('queue');
  };

  const handleDeleteOne = (id: string) => {
    setQueue(prev => prev.filter(o => o.id !== id));
  };

  const handleClearAll = () => {
    setQueue([]);
    toast.info('Queue Cleared', 'All offline orders removed.');
  };

  const handleReorder = (order: any) => {
    const targetTable: Table = {
      id: Math.random(),
      number: order.table_number,
      area: order.area,
      seats: 4,
      status: 'dining',
    };
    const mappedItems: CartItem[] = order.items.map((item: any) => ({
      id: item.inventory_id || item.item_id || Math.random(),
      name: item.item_name,
      price: item.price || (order.total_amount / order.items.length),
      qty: item.quantity,
      category_name: item.category_name || '',
    }));
    setInitialCartItems(mappedItems);
    setSelectedTable(targetTable);
  };

  const handleBackToFloor = () => {
    setSelectedTable(null);
    setInitialCartItems([]);
  };

  const queueCount = queue.length;
  const failedCount = queue.filter(o => o.status === 'failed').length;

  return (
    <View style={styles.container}>
      {/* Background Watermark */}
      <Image
        source={require('../../assets/Logo.jpg')}
        style={styles.backgroundWatermark}
        resizeMode="contain"
      />

      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ── Network Status Bar ── */}
      <NetworkStatusBar
        status={netStatus}
        queueCount={queue.length}
        onRetry={pingServer}
      />


      {/* ── Header ── */}
      {!selectedTable && (
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/Logo.jpg')} style={styles.logoBadgeImage} resizeMode="cover" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>ZAIQA MAHAL</Text>
            <Text style={styles.headerSub}>WAITER WORKSPACE • {(name || username).toUpperCase()}</Text>
          </View>
          <DotsMenu onLogout={onLogout} />
        </View>
      )}

      {/* ── Screen Routing & Footer Tabs ── */}
      {!selectedTable ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            {activeTab === 'tables' ? (
              <TablesScreen
                onSelectTable={setSelectedTable}
                queue={queue}
                syncOfflineQueue={syncOfflineQueue}
                syncingQueue={syncingQueue}
              />
            ) : activeTab === 'history' ? (
              <HistoryScreen username={username} name={name} onReorder={handleReorder} />
            ) : activeTab === 'chat' && chatEnabled ? (
              <ChatScreen username={username} name={name} role="waiter" onBack={() => setActiveTab('tables')} />
            ) : (
              <OfflineQueueScreen
                queue={queue}
                syncingQueue={syncingQueue}
                onSyncAll={syncOfflineQueue}
                onRetryOne={retryOneOrder}
                onDeleteOne={handleDeleteOne}
                onClearAll={handleClearAll}
              />
            )}
          </View>

          {/* ── Footer Navigation Tabs ── */}
          <View style={[styles.mainTabsFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Tables */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => setActiveTab('tables')}
            >
              <Layers size={22} color={activeTab === 'tables' ? '#ea580c' : '#94a3b8'} />
              <Text style={[styles.tabLabel, activeTab === 'tables' && styles.activeTabLabel]}>Tables</Text>
            </TouchableOpacity>

            {/* History */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => setActiveTab('history')}
            >
              <Clock size={22} color={activeTab === 'history' ? '#ea580c' : '#94a3b8'} />
              <Text style={[styles.tabLabel, activeTab === 'history' && styles.activeTabLabel]}>History</Text>
            </TouchableOpacity>

            {/* Offline Queue Tab */}
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => setActiveTab('queue')}
            >
              <WifiOff size={22} color={
                activeTab === 'queue' ? '#ea580c' :
                  queueCount > 0 ? '#f59e0b' : '#94a3b8'
              } />
              <Text style={[
                styles.tabLabel,
                activeTab === 'queue' && styles.activeTabLabel,
                queueCount > 0 && activeTab !== 'queue' && { color: '#f59e0b' },
              ]}>Queue</Text>
              {queueCount > 0 && (
                <View style={[
                  styles.tabBadge,
                  failedCount > 0 && { backgroundColor: '#ef4444' },
                ]}>
                  <Text style={styles.tabBadgeText}>{queueCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Chat Tab */}
            {chatEnabled && (
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => setActiveTab('chat')}
              >
                <Text style={{ fontSize: 18, marginBottom: 2, opacity: activeTab === 'chat' ? 1 : 0.6 }}>💬</Text>
                <Text style={[styles.tabLabel, activeTab === 'chat' && styles.activeTabLabel]}>Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <OrderingScreen
          selectedTable={selectedTable}
          username={username}
          name={name}
          onBack={handleBackToFloor}
          onQueueOfflineOrder={handleQueueOfflineOrder}
          initialCartItems={initialCartItems}
        />
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
            <Text style={styles.exitModalDesc}>Are you sure you want to exit Zaiqa Mahal Ordering App?</Text>
            
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 3,
    borderColor: '#f97316',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoBadgeImage: { width: '100%', height: '100%' },
  backgroundWatermark: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    opacity: 0.035,
    alignSelf: 'center',
    top: '10%',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  dotsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Tabs (Footer)
  mainTabsFooter: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  activeTabBtn: {}, // kept for legacy reference
  queueTabAlert: {}, // kept for legacy reference
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  activeTabLabel: { color: '#ea580c' },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: 4,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },

  // Dropdown
  modalOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 78,
    paddingRight: 16,
  },
  dropdownCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
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
