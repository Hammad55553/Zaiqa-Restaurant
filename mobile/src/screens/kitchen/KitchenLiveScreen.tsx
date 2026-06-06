import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Flame, Loader, CheckCircle, Coffee } from 'lucide-react-native';
import KitchenOrderCard from '../../components/kitchen/KitchenOrderCard';
import { KitchenOrder, OrderStatus } from './types';
import LogoLoader from '../../components/LogoLoader';

interface KitchenLiveScreenProps {
  orders: KitchenOrder[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onStatusChange: (orderId: number, status: OrderStatus) => void;
  updatingId: number | null;
}

export default function KitchenLiveScreen({
  orders,
  loading,
  refreshing,
  onRefresh,
  onStatusChange,
  updatingId,
}: KitchenLiveScreenProps) {
  const pending = orders.filter(o => o.status === 'pending');
  const preparing = orders.filter(o => o.status === 'preparing');
  const ready = orders.filter(o => o.status === 'ready');

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
          <Coffee size={44} color="#f97316" />
        </View>
        <Text style={styles.emptyTitle}>Kitchen is clear!</Text>
        <Text style={styles.emptySub}>No active orders right now.{'\n'}New orders will appear here instantly.</Text>
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
      {/* ── NEW ORDERS ── */}
      {pending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Flame size={15} color="#f97316" />
            <Text style={[styles.sectionTitle, { color: '#f97316' }]}>NEW ORDERS</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#fff7ed' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#f97316' }]}>{pending.length}</Text>
            </View>
          </View>
          <View style={styles.cardList}>
            {pending.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onStatusChange={onStatusChange}
                isUpdating={updatingId === order.id}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── COOKING ── */}
      {preparing.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Loader size={15} color="#3b82f6" />
            <Text style={[styles.sectionTitle, { color: '#3b82f6' }]}>COOKING</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#eff6ff' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#3b82f6' }]}>{preparing.length}</Text>
            </View>
          </View>
          <View style={styles.cardList}>
            {preparing.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onStatusChange={onStatusChange}
                isUpdating={updatingId === order.id}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── READY ── */}
      {ready.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle size={15} color="#16a34a" />
            <Text style={[styles.sectionTitle, { color: '#16a34a' }]}>READY TO SERVE</Text>
            <View style={[styles.sectionBadge, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#16a34a' }]}>{ready.length}</Text>
            </View>
          </View>
          <View style={styles.cardList}>
            {ready.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onStatusChange={onStatusChange}
                isUpdating={updatingId === order.id}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 14, paddingBottom: 40, gap: 20 },
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
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    flex: 1,
  },
  sectionBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardList: { gap: 10 },
});
