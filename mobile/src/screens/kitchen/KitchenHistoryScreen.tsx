import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { CheckCircle2, Clock, UtensilsCrossed } from 'lucide-react-native';
import { KitchenOrder } from './types';
import LogoLoader from '../../components/LogoLoader';

interface KitchenHistoryScreenProps {
  orders: KitchenOrder[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

function CompletedOrderCard({ order }: { order: KitchenOrder }) {
  const completedAt = new Date(order.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tableBadge}>
          <Text style={styles.tableNumber}>T {order.table_number}</Text>
        </View>
        <Text style={styles.areaText}>{order.area}</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.donePill}>
          <CheckCircle2 size={12} color="#16a34a" />
          <Text style={styles.doneText}>DONE</Text>
        </View>
        <View style={styles.timePill}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.timePillText}>{completedAt}</Text>
        </View>
      </View>

      <View style={styles.itemsSection}>
        {order.items.map((item, idx) => (
          <View key={item.id} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemBorder]}>
            <View style={styles.qtyContainer}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
            </View>
            <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.orderIdText}>Order #{order.id}</Text>
        <Text style={styles.timeLabel}>Prepared</Text>
      </View>
    </View>
  );
}

export default function KitchenHistoryScreen({
  orders,
  loading,
  refreshing,
  onRefresh,
}: KitchenHistoryScreenProps) {
  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <LogoLoader />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <UtensilsCrossed size={44} color="#94a3b8" />
        </View>
        <Text style={styles.emptyTitle}>No completed orders yet</Text>
        <Text style={styles.emptySub}>Completed orders will appear here.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summaryBanner}>
        <CheckCircle2 size={16} color="#15803d" />
        <Text style={styles.summaryText}>{orders.length} orders completed today</Text>
      </View>

      {orders.map(order => (
        <CompletedOrderCard key={order.id} order={order} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  tableBadge: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tableNumber: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  areaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  doneText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timePillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  itemsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderColor: '#f8fafc',
  },
  qtyContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '900',
    color: '#d97706',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  orderIdText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
