import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ShoppingBag, RotateCcw } from 'lucide-react-native';
import LogoLoader from './LogoLoader';

interface OrderHistoryProps {
  orderHistory: any[];
  loadingHistory: boolean;
  onReorder: (order: any) => void;
}

export default function OrderHistory({ orderHistory, loadingHistory, onReorder }: OrderHistoryProps) {
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending': return '#f97316';
      case 'preparing': return '#3b82f6';
      case 'ready': return '#10b981';
      case 'completed': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>MY TODAY'S KITCHEN ORDERS</Text>
      
      {loadingHistory ? (
        <View style={styles.centerLoading}>
          <LogoLoader />
        </View>
      ) : orderHistory.length === 0 ? (
        <View style={styles.emptyHistory}>
          <ShoppingBag size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyHistoryText}>You haven't placed any orders today.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.historyList}>
          {orderHistory.map(order => {
            const orderTime = order.created_at
              ? new Date(order.created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            
            const cleanRemark = order.remarks ? order.remarks.replace(/\[Waiter:.*?\]\s*/, '') : '';
            
            return (
              <View key={order.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyOrderId}>ORDER #{order.id}</Text>
                  <View style={[styles.historyStatusBadge, { backgroundColor: getStatusBg(order.status) }]}>
                    <Text style={styles.historyStatusText}>{order.status.toUpperCase()}</Text>
                  </View>
                </View>
                
                <Text style={styles.historyCardTable}>
                  Table {order.table_number} • {order.area.toUpperCase()} AREA
                </Text>
                
                <View style={styles.historyItemsList}>
                  {order.items && order.items.map((item: any, idx: number) => (
                    <Text key={idx} style={styles.historyItemText}>
                      • {item.quantity}x {item.item_name}
                    </Text>
                  ))}
                </View>
                
                {cleanRemark ? (
                  <Text style={styles.historyNotesText}>Notes: {cleanRemark}</Text>
                ) : null}
                
                <View style={styles.historyCardFooter}>
                  <View>
                    <Text style={styles.historyTime}>{orderTime}</Text>
                    <Text style={styles.historyTotal}>Rs. {order.total_amount}</Text>
                  </View>
                  <TouchableOpacity style={styles.reorderBtn} onPress={() => onReorder(order)}>
                    <RotateCcw size={12} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.reorderBtnText}>REPEAT ORDER</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
    marginBottom: 16,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyOrderId: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  historyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  historyCardTable: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 12,
  },
  historyItemsList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 10,
    marginBottom: 10,
    gap: 4,
  },
  historyItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  historyNotesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    marginBottom: 10,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  historyTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 2,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reorderBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
