import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  DollarSign,
  Receipt,
  Utensils,
} from 'lucide-react-native';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

interface OrdersTabProps {
  orders: any[];
  /** Change an order's kitchen status. Handled in AdminDashboard (online/offline aware). */
  onChangeStatus: (order: any, newStatus: OrderStatus) => Promise<void> | void;
  /** Cancel (soft-delete / trash) an order. */
  onCancelOrder: (order: any) => Promise<void> | void;
  /** Toggle payment status paid <-> unpaid. */
  onTogglePayment: (order: any, paid: boolean) => Promise<void> | void;
  /** Open the printable receipt slip for an order. */
  onSelectOrder: (order: any) => void;
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'PENDING', color: '#c2410c', bg: '#ffedd5' },
  preparing: { label: 'PREPARING', color: '#a16207', bg: '#fef9c3' },
  ready: { label: 'READY', color: '#1d4ed8', bg: '#dbeafe' },
  completed: { label: 'COMPLETED', color: '#15803d', bg: '#dcfce7' },
  cancelled: { label: 'CANCELLED', color: '#be123c', bg: '#fecdd3' },
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function nextStatusOf(status: string): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(status as OrderStatus);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function isPaid(order: any): boolean {
  const ps = (order.payment_status || '').toString().toLowerCase();
  return ps === 'paid';
}

export default function OrdersTab({
  orders,
  onChangeStatus,
  onCancelOrder,
  onTogglePayment,
  onSelectOrder,
}: OrdersTabProps) {
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<number | string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const runAction = async (id: any, fn: () => Promise<void> | void) => {
    try {
      setBusyId(id);
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = orders.filter((o) =>
    ['pending', 'preparing', 'ready'].includes(o.status),
  ).length;

  return (
    <View style={styles.contentWrapper}>
      {/* Live summary */}
      <View style={styles.liveBanner}>
        <View style={styles.liveDot} />
        <Text style={styles.liveBannerText}>
          {activeCount} active order{activeCount === 1 ? '' : 's'} (live)
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
                {counts[f.key] ? ` (${counts[f.key]})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 && (
        <Text style={styles.emptyText}>Is filter mein koi order nahi.</Text>
      )}

      {filtered.map((order) => {
        const meta = STATUS_META[order.status] || STATUS_META.pending;
        const next = nextStatusOf(order.status);
        const paid = isPaid(order);
        const busy = busyId === order.id;
        const terminal = order.status === 'completed' || order.status === 'cancelled';

        return (
          <View key={order.id} style={styles.orderCard}>
            {/* Top row */}
            <TouchableOpacity
              style={styles.orderHeader}
              activeOpacity={0.7}
              onPress={() => onSelectOrder(order)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>Order #{order.id}</Text>
                <Text style={styles.orderSub}>
                  {order.area === 'Delivery' || order.table_number === 'Delivery'
                    ? '🛵 Delivery'
                    : `Table ${order.table_number} • ${order.area}`}
                  {order.customer_name && order.customer_name.trim() !== ''
                    ? ` • ${order.customer_name}`
                    : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.orderAmount}>Rs. {order.total_amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Payment line */}
            <View style={styles.payRow}>
              <View style={styles.payLeft}>
                <DollarSign size={14} color={paid ? '#16a34a' : '#dc2626'} />
                <Text style={[styles.payText, { color: paid ? '#16a34a' : '#dc2626' }]}>
                  {paid ? 'PAID' : 'UNPAID'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payToggle, { borderColor: paid ? '#fecdd3' : '#bbf7d0' }]}
                disabled={busy}
                onPress={() => runAction(order.id, () => onTogglePayment(order, !paid))}
                activeOpacity={0.75}
              >
                <Text style={[styles.payToggleText, { color: paid ? '#dc2626' : '#16a34a' }]}>
                  {paid ? 'Mark Unpaid' : 'Mark Paid'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              {busy ? (
                <ActivityIndicator color="#f97316" style={{ paddingVertical: 8 }} />
              ) : (
                <>
                  {next && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.advanceBtn]}
                      onPress={() => runAction(order.id, () => onChangeStatus(order, next))}
                      activeOpacity={0.8}
                    >
                      {next === 'preparing' && <ChefHat size={15} color="#fff" />}
                      {next === 'ready' && <Utensils size={15} color="#fff" />}
                      {next === 'completed' && <CheckCircle2 size={15} color="#fff" />}
                      {next === 'pending' && <Clock size={15} color="#fff" />}
                      <Text style={styles.actionBtnText}>
                        {next === 'preparing' && 'Start Preparing'}
                        {next === 'ready' && 'Mark Ready'}
                        {next === 'completed' && 'Complete'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.slipBtn]}
                    onPress={() => onSelectOrder(order)}
                    activeOpacity={0.8}
                  >
                    <Receipt size={15} color="#0f172a" />
                    <Text style={[styles.actionBtnText, { color: '#0f172a' }]}>Slip</Text>
                  </TouchableOpacity>

                  {!terminal && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      onPress={() => runAction(order.id, () => onCancelOrder(order))}
                      activeOpacity={0.8}
                    >
                      <XCircle size={15} color="#dc2626" />
                      <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: { padding: 16 },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  liveBannerText: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  filterChipText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginVertical: 24 },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  orderTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  orderSub: { fontSize: 11, color: '#64748b', marginTop: 3 },
  orderAmount: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  statusBadgeText: { fontSize: 8, fontWeight: '900' },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  payText: { fontSize: 12, fontWeight: '900' },
  payToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  payToggleText: { fontSize: 11, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexGrow: 1,
  },
  advanceBtn: { backgroundColor: '#f97316' },
  slipBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', flexGrow: 0 },
  cancelBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', flexGrow: 0 },
  actionBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
});
