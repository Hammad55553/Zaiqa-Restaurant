import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, Layers, FileText, Printer } from 'lucide-react-native';

interface OverviewTabProps {
  stats: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    occupiedTables: number;
  };
  tablesCount: number;
  orders: any[];
  onDownloadReport: () => void;
  onPrintSummary: () => void;
  onSelectOrder: (order: any) => void;
}

export default function OverviewTab({
  stats,
  tablesCount,
  orders,
  onDownloadReport,
  onPrintSummary,
  onSelectOrder,
}: OverviewTabProps) {
  return (
    <View style={styles.contentWrapper}>
      {/* Stats Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: '#dcfce7' }]}>
            <TrendingUp size={20} color="#15803d" />
          </View>
          <Text style={styles.gridCardLabel}>Total Sales</Text>
          <Text style={[styles.gridCardVal, { color: '#16a34a' }]}>Rs. {stats.totalSales}</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: '#fee2e2' }]}>
            <TrendingDown size={20} color="#dc2626" />
          </View>
          <Text style={styles.gridCardLabel}>Total Expenses</Text>
          <Text style={[styles.gridCardVal, { color: '#ef4444' }]}>Rs. {stats.totalExpenses}</Text>
        </View>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: '#dbeafe' }]}>
            <DollarSign size={20} color="#1d4ed8" />
          </View>
          <Text style={styles.gridCardLabel}>Net Profit</Text>
          <Text style={[styles.gridCardVal, { color: '#3b82f6' }]}>Rs. {stats.netProfit}</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.gridIconCircle, { backgroundColor: '#ffedd5' }]}>
            <Layers size={20} color="#c2410c" />
          </View>
          <Text style={styles.gridCardLabel}>Tables Occupied</Text>
          <Text style={[styles.gridCardVal, { color: '#f97316' }]}>{stats.occupiedTables} / {tablesCount}</Text>
        </View>
      </View>

      {/* Quick Actions Card */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionHeader}>QUICK REPORTS & EXPORTS</Text>
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity style={styles.reportActionBtn} onPress={onDownloadReport} activeOpacity={0.7}>
            <FileText size={18} color="#ffffff" />
            <Text style={styles.reportActionBtnText}>Share Report CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: '#10b981' }]} onPress={onPrintSummary} activeOpacity={0.7}>
            <Printer size={18} color="#ffffff" />
            <Text style={styles.reportActionBtnText}>Print Summary</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders List */}
      <Text style={styles.sectionTitle}>Recent Orders ({orders.length})</Text>
      {orders.slice(0, 15).map((order) => (
        <TouchableOpacity
          key={order.id}
          style={styles.orderItemCard}
          onPress={() => { console.log('Recent order clicked, ID:', order.id); onSelectOrder(order); }}
          activeOpacity={0.75}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.orderCardTitle}>Order #{order.id}</Text>
            <Text style={styles.orderCardSub}>Table {order.table_number} • {order.area}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.orderAmount}>Rs. {order.total_amount}</Text>
            <Text style={[styles.orderStatus, { color: order.status === 'completed' ? '#16a34a' : '#f97316' }]}>
              {(order.status || '').toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  gridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  gridCardVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 12,
    letterSpacing: 0.8,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
  },
  reportActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderStatus: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
});
