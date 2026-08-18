import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, Layers, FileText, Printer } from 'lucide-react-native';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

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
  // Process data for charts
  const recentCompletedOrders = orders.filter(o => o.status === 'completed').slice(0, 8).reverse();
  const lineData = recentCompletedOrders.map((o, index) => ({
    value: o.total_amount || 0,
    label: `#${o.id}`
  }));

  const barData = [
    { value: stats.totalSales || 0, label: 'Sales', frontColor: '#f97316' },
    { value: stats.totalExpenses || 0, label: 'Expenses', frontColor: '#ef4444' },
    { value: Math.max(0, stats.netProfit || 0), label: 'Profit', frontColor: '#10b981' },
  ];

  // Process pie chart data (Order distribution by area)
  const areaCounts = orders.reduce((acc, order) => {
    const area = order.area || 'Unknown';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieColors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
  const pieDataRaw = Object.keys(areaCounts).map((key, index) => ({
    value: areaCounts[key],
    color: pieColors[index % pieColors.length],
    text: key,
  }));

  // Handle empty state for pie chart
  const pieData = pieDataRaw.length > 0 ? pieDataRaw : [{ value: 1, color: '#e2e8f0', text: 'No Orders' }];

  return (
    <ScrollView style={styles.contentWrapper} showsVerticalScrollIndicator={false}>
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

      {/* Analytics Charts */}
      <Text style={styles.sectionTitle}>Analytics Dashboard</Text>
      
      {/* 1. Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Financial Overview</Text>
        <View style={{ marginLeft: -15, width: '100%', alignItems: 'center' }}>
          <BarChart
            data={barData}
            barWidth={32}
            spacing={40}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
            noOfSections={4}
            barBorderRadius={6}
            isAnimated
            animationDuration={800}
            frontColor="#3b82f6"
          />
        </View>
      </View>

      {/* 2. Line Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Recent Revenue Trend</Text>
        {lineData.length > 0 ? (
          <View style={{ marginLeft: -10, width: '100%', alignItems: 'center' }}>
            <LineChart
              data={lineData}
              areaChart
              curved
              isAnimated
              animationDuration={1000}
              color="#f97316"
              startFillColor="#f97316"
              startOpacity={0.4}
              endFillColor="#ffedd5"
              endOpacity={0.1}
              spacing={40}
              thickness={3}
              hideRules
              hideDataPoints={false}
              dataPointsColor="#ea580c"
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
              noOfSections={4}
            />
          </View>
        ) : (
          <Text style={{ color: '#94a3b8', marginVertical: 20 }}>No completed orders yet.</Text>
        )}
      </View>

      {/* 3. Donut Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Order Area Distribution</Text>
        <View style={{ alignItems: 'center', marginTop: 10, width: '100%' }}>
          <PieChart
            donut
            innerRadius={50}
            radius={80}
            data={pieData}
            centerLabelComponent={() => {
              return (
                <View style={{justifyContent: 'center', alignItems: 'center'}}>
                  <Text style={{fontSize: 22, color: '#0f172a', fontWeight: 'bold'}}>{pieDataRaw.length > 0 ? orders.length : 0}</Text>
                  <Text style={{fontSize: 10, color: '#64748b'}}>Orders</Text>
                </View>
              );
            }}
          />
          {/* Legend */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, gap: 12 }}>
            {pieData.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{item.text}</Text>
              </View>
            ))}
          </View>
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
      <View style={{ height: 40 }} />
    </ScrollView>
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
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  chartStyle: {
    borderRadius: 16,
    paddingRight: 32, // Prevent label cutoff
  }
});
