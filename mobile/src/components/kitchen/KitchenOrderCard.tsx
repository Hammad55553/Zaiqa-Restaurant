import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Clock,
  Flame,
  CheckCircle,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Square,
  CheckSquare,
} from 'lucide-react-native';
import { API_BASE } from '../../config';
import { KitchenOrder, OrderStatus, OrderItem } from '../../screens/kitchen/types';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  bg: string;
  color: string;
  border: string;
  nextStatus: OrderStatus | null;
  nextLabel: string;
  nextBg: string;
}> = {
  pending: {
    label: 'NEW',
    bg: '#fff7ed',
    color: '#f97316',
    border: '#f97316',
    nextStatus: 'preparing',
    nextLabel: 'Start Cooking',
    nextBg: '#1d4ed8',
  },
  preparing: {
    label: 'COOKING',
    bg: '#eff6ff',
    color: '#3b82f6',
    border: '#3b82f6',
    nextStatus: 'ready',
    nextLabel: 'Mark Ready',
    nextBg: '#15803d',
  },
  ready: {
    label: 'READY',
    bg: '#f0fdf4',
    color: '#16a34a',
    border: '#16a34a',
    nextStatus: 'completed',
    nextLabel: 'Complete',
    nextBg: '#374151',
  },
  completed: {
    label: 'DONE',
    bg: '#f8fafc',
    color: '#64748b',
    border: '#cbd5e1',
    nextStatus: null,
    nextLabel: '',
    nextBg: '#374151',
  },
};

// ─── Time Elapsed ─────────────────────────────────────────────────────────────

function useElapsedTime(createdAt: string) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}m ${diff % 60}s`);
      else setElapsed(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return elapsed;
}

// ─── Kitchen Order Card ───────────────────────────────────────────────────────

interface KitchenOrderCardProps {
  order: KitchenOrder;
  onStatusChange: (orderId: number, status: OrderStatus) => void;
  isUpdating: boolean;
}

export default function KitchenOrderCard({
  order,
  onStatusChange,
  isUpdating,
}: KitchenOrderCardProps) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const elapsed = useElapsedTime(order.created_at);
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Group items by batch/round
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, OrderItem[]> = {};
    (order.items || []).forEach(item => {
      if (item.item_name === 'Service Charges') return;
      const ts = item.created_at || order.created_at || 'original';
      if (!groups[ts]) {
        groups[ts] = [];
      }
      groups[ts].push(item);
    });
    return Object.keys(groups).sort().map((ts, idx) => ({
      round: idx + 1,
      timestamp: ts,
      items: groups[ts]
    }));
  }, [order.items, order.created_at]);

  const toggleItemStatus = async (item: OrderItem) => {
    const isReady = item.status === 'ready' || item.status === 'served';
    const newStatus = isReady ? 'preparing' : 'ready';
    try {
      const res = await fetch(`${API_BASE}/orders/items/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
      onStatusChange(order.id, order.status);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse new/updated orders
  useEffect(() => {
    if (order.status === 'pending' || order.has_new_updates) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [order.status, order.has_new_updates]);

  const isOverdue = (Date.now() - new Date(order.created_at).getTime()) > 15 * 60 * 1000; // >15 min

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: config.border,
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
          opacity: fadeAnim,
        },
        order.status === 'completed' && styles.completedCard,
      ]}
    >
      {/* ── Card Header ── */}
      <View style={[styles.cardHeader, { backgroundColor: config.bg }]}>
        <View style={styles.tableInfo}>
          <Text style={styles.orderNumber}>#{order.id}</Text>
          <View style={styles.tableBadge}>
            <Text style={styles.tableNumber}>T {order.table_number}</Text>
          </View>
          <Text style={styles.areaText}>{order.area}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Status Pill */}
          <View style={[styles.statusPill, { backgroundColor: config.bg, borderColor: config.border }]}>
            {order.status === 'pending' && <Flame size={11} color={config.color} />}
            {order.status === 'preparing' && <RefreshCw size={11} color={config.color} />}
            {order.status === 'ready' && <CheckCircle size={11} color={config.color} />}
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>

          {/* Timer */}
          <View style={[styles.timerBadge, isOverdue && styles.timerOverdue]}>
            <Clock size={11} color={isOverdue ? '#ef4444' : '#64748b'} />
            <Text style={[styles.timerText, isOverdue && { color: '#ef4444' }]}>{elapsed}</Text>
          </View>
        </View>
      </View>

      {/* Update alert */}
      {!!order.has_new_updates && (
        <View style={styles.updateAlert}>
          <AlertCircle size={13} color="#f59e0b" />
          <Text style={styles.updateAlertText}>Order Updated by Waiter</Text>
          {order.admin_edit_remark ? (
            <Text style={styles.updateRemark}>"{order.admin_edit_remark}"</Text>
          ) : null}
        </View>
      )}

      {/* ── Items ── */}
      <View style={styles.itemsSection}>
        {groupedItems.map((group) => (
          <View key={group.timestamp} style={styles.roundBox}>
            <View style={styles.roundHeader}>
              <Text style={styles.roundTitle}>ROUND {group.round}</Text>
              <Text style={styles.roundTime}>
                {group.timestamp !== 'original' ? new Date(group.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
              </Text>
            </View>
            {group.items.map((item: OrderItem, idx: number) => {
              const isReady = item.status === 'ready' || item.status === 'served';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    idx < group.items.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  {order.status !== 'completed' && (
                    <TouchableOpacity onPress={() => toggleItemStatus(item)} style={styles.checkboxContainer}>
                      {isReady ? (
                        <CheckSquare size={20} color="#16a34a" />
                      ) : (
                        <Square size={20} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  )}
                  <View style={styles.qtyCircle}>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, isReady && styles.itemNameReady]}>
                      {item.item_name}
                    </Text>
                    {item.notes ? (
                      <View style={styles.itemNotesBox}>
                        <Text style={styles.itemNotes}>⚠️ NOTE: {item.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Remarks ── */}
      {order.remarks ? (
        <View style={styles.remarksRow}>
          <Text style={styles.remarksLabel}>Note: </Text>
          <Text style={styles.remarksText}>{order.remarks}</Text>
        </View>
      ) : null}

      {/* ── Action Button ── */}
      {config.nextStatus && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: config.nextBg }, isUpdating && { opacity: 0.6 }]}
          onPress={() => onStatusChange(order.id, config.nextStatus!)}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>{config.nextLabel}</Text>
          <ChevronRight size={16} color="#ffffff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  completedCard: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tableBadge: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tableNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  areaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  timerOverdue: {
    backgroundColor: '#fff1f2',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
  updateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#fef08a',
  },
  updateAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    flex: 1,
  },
  updateRemark: {
    fontSize: 11,
    color: '#92400e',
    fontStyle: 'italic',
  },
  itemsSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  qtyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '900',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemNotesBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde047',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  itemNotes: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '700',
  },
  remarksRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  remarksLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  remarksText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 0,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  roundBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 10,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
    marginBottom: 6,
  },
  roundTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 1,
  },
  roundTime: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  checkboxContainer: {
    paddingRight: 4,
  },
  itemNameReady: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
});
