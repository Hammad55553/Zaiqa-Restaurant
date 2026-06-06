import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  WifiOff,
  RefreshCw,
  Trash2,
  Clock,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Loader,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id: any;
  name: string;
  price: number;
  qty: number;
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

interface OfflineQueueScreenProps {
  queue: QueuedOrder[];
  syncingQueue: boolean;
  onSyncAll: () => void;
  onRetryOne: (order: QueuedOrder) => void;
  onDeleteOne: (id: string) => void;
  onClearAll: () => void;
}

// ─── Animated Queue Card ──────────────────────────────────────────────────────

function QueueCard({
  order,
  onRetry,
  onDelete,
  syncing,
}: {
  order: QueuedOrder;
  onRetry: () => void;
  onDelete: () => void;
  syncing: boolean;
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (order.status === 'syncing') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [order.status]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const isFailed = order.status === 'failed';
  const isSyncing = order.status === 'syncing';

  const statusColor = isFailed ? '#ef4444' : isSyncing ? '#f59e0b' : '#94a3b8';
  const cardBorderColor = isFailed ? '#ef4444' : '#334155';

  return (
    <Animated.View
      style={[
        styles.card,
        { borderLeftColor: cardBorderColor, transform: [{ translateY: slideAnim }], opacity: fadeAnim },
      ]}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.tableTag}>
          <ShoppingBag size={12} color="#f97316" />
          <Text style={styles.tableTagText}>TABLE {order.table_number}</Text>
        </View>
        <Text style={styles.areaLabel}>{order.area}</Text>

        <View style={[styles.statusPill, { backgroundColor: isFailed ? '#2a0a0a' : '#1c1400' }]}>
          {isSyncing ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Loader size={11} color="#f59e0b" />
            </Animated.View>
          ) : isFailed ? (
            <AlertTriangle size={11} color="#ef4444" />
          ) : (
            <Clock size={11} color="#94a3b8" />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isSyncing ? 'SYNCING' : isFailed ? 'FAILED' : 'PENDING'}
          </Text>
        </View>
      </View>

      {/* Time */}
      <View style={styles.timeRow}>
        <Clock size={11} color="#475569" />
        <Text style={styles.timeText}>Queued at {order.timestamp}</Text>
      </View>

      {/* Items */}
      <View style={styles.itemsList}>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemQty}>×{item.qty}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPrice}>
              Rs. {(item.price * item.qty).toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>Rs. {order.total_amount.toFixed(0)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.retryBtn, isSyncing && { opacity: 0.5 }]}
          onPress={onRetry}
          disabled={isSyncing}
        >
          <RefreshCw size={14} color="#22c55e" />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} disabled={isSyncing}>
          <Trash2 size={14} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OfflineQueueScreen({
  queue,
  syncingQueue,
  onSyncAll,
  onRetryOne,
  onDeleteOne,
  onClearAll,
}: OfflineQueueScreenProps) {
  const failed = queue.filter(o => o.status === 'failed');
  const pending = queue.filter(o => o.status === 'pending' || o.status === 'syncing');

  if (queue.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <CheckCircle2 size={48} color="#22c55e" />
        </View>
        <Text style={styles.emptyTitle}>All Clear!</Text>
        <Text style={styles.emptySub}>
          No stuck or pending orders.{'\n'}All orders are synced with the kitchen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{pending.length}</Text>
          <Text style={styles.summaryLabel}>PENDING</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, failed.length > 0 && { color: '#ef4444' }]}>{failed.length}</Text>
          <Text style={styles.summaryLabel}>FAILED</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{queue.length}</Text>
          <Text style={styles.summaryLabel}>TOTAL</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.syncAllBtn, syncingQueue && { opacity: 0.6 }]}
          onPress={onSyncAll}
          disabled={syncingQueue}
        >
          <RefreshCw size={15} color="#ffffff" />
          <Text style={styles.syncAllText}>{syncingQueue ? 'Syncing...' : 'Sync All Now'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearAllBtn} onPress={onClearAll}>
          <Trash2 size={15} color="#ef4444" />
          <Text style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Failed Orders */}
      {failed.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={14} color="#ef4444" />
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>STUCK ORDERS</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{failed.length}</Text>
            </View>
          </View>
          {failed.map(order => (
            <QueueCard
              key={order.id}
              order={order}
              onRetry={() => onRetryOne(order)}
              onDelete={() => onDeleteOne(order.id)}
              syncing={syncingQueue}
            />
          ))}
        </>
      )}

      {/* Pending Orders */}
      {pending.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Clock size={14} color="#f59e0b" />
            <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>WAITING TO SYNC</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#1c1400' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#f59e0b' }]}>{pending.length}</Text>
            </View>
          </View>
          {pending.map(order => (
            <QueueCard
              key={order.id}
              order={order}
              onRetry={() => onRetryOne(order)}
              onDelete={() => onDeleteOne(order.id)}
              syncing={syncingQueue}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f1f5f9',
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0f2318',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Summary
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    gap: 0,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f8fafc',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#1e293b',
    marginVertical: 4,
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  syncAllBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 13,
  },
  syncAllText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  clearAllText: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 14,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#2a0a0a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tableTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f97316',
    letterSpacing: 0.5,
  },
  areaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
  },
  itemsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f97316',
    width: 28,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f2318',
    borderRadius: 10,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#22c55e',
    fontWeight: '800',
    fontSize: 13,
  },
  deleteBtn: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
});
