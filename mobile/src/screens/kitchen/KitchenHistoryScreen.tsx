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
            <Text style={styles.itemQty}>×{item.quantity}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.orderIdText}>Order #{order.id}</Text>
        <Text style={styles.totalAmount}>Rs. {order.total_amount.toFixed(0)}</Text>
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
          <UtensilsCrossed size={44} color="#64748b" />
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
        <CheckCircle2 size={18} color="#16a34a" />
        <Text style={styles.summaryText}>{orders.length} orders completed today</Text>
      </View>

      {orders.map(order => (
        <CompletedOrderCard key={order.id} order={order} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 14, paddingBottom: 40, gap: 10 },
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
    backgroundColor: '#f1f5f9',
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableBadge: {
    backgroundColor: '#0f172a',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tableNumber: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  areaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  doneText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  timePillText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  itemsSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
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
    fontWeight: '600',
    color: '#374151',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderIdText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
});
