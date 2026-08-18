import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Download, FileText, Users as UsersIcon, TrendingUp } from 'lucide-react-native';

interface ReportsTabProps {
  stats: {
    totalSales: number;
  };
  /** All orders — used to compute per-staff performance. */
  orders?: any[];
  /** Optional staff list to map usernames -> display names. */
  users?: { username: string; name?: string; role?: string }[];
  onDownloadReport: () => void;
  onPrintReportPDF: () => void;
}

interface StaffStat {
  key: string;
  name: string;
  role?: string;
  total: number;
  completed: number;
  active: number;
  cancelled: number;
  sales: number;
}

export default function ReportsTab({
  stats,
  orders = [],
  users = [],
  onDownloadReport,
  onPrintReportPDF,
}: ReportsTabProps) {
  const staffStats = useMemo<StaffStat[]>(() => {
    const map: Record<string, StaffStat> = {};
    const nameOf = (key: string) => {
      const u = users.find((x) => x.username === key);
      return u?.name || key;
    };
    const roleOf = (key: string) => users.find((x) => x.username === key)?.role;

    orders.forEach((o) => {
      const key = o.created_by || 'Unknown';
      if (!map[key]) {
        map[key] = {
          key,
          name: nameOf(key),
          role: roleOf(key),
          total: 0,
          completed: 0,
          active: 0,
          cancelled: 0,
          sales: 0,
        };
      }
      const s = map[key];
      s.total += 1;
      if (o.status === 'completed') {
        s.completed += 1;
        s.sales += o.total_amount || 0;
      } else if (o.status === 'cancelled') {
        s.cancelled += 1;
      } else {
        s.active += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [orders, users]);

  const maxSales = Math.max(1, ...staffStats.map((s) => s.sales));

  return (
    <View style={styles.contentWrapper}>
      {/* Staff Performance */}
      <View style={styles.titleRow}>
        <UsersIcon size={16} color="#0f172a" />
        <Text style={styles.sectionTitle}>Staff Performance</Text>
      </View>

      {staffStats.length === 0 ? (
        <View style={styles.analyticsCard}>
          <Text style={styles.emptyText}>No order data available yet.</Text>
        </View>
      ) : (
        staffStats.map((s) => (
          <View key={s.key} style={styles.staffCard}>
            <View style={styles.staffHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffName}>{s.name}</Text>
                {s.role ? <Text style={styles.staffRole}>{s.role.toUpperCase()}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.staffSales}>Rs. {s.sales}</Text>
                <Text style={styles.staffSalesLabel}>SALES</Text>
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(s.sales / maxSales) * 100}%`, backgroundColor: '#f97316' },
                ]}
              />
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricNum}>{s.total}</Text>
                <Text style={styles.metricLbl}>Orders</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={[styles.metricNum, { color: '#16a34a' }]}>{s.completed}</Text>
                <Text style={styles.metricLbl}>Done</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={[styles.metricNum, { color: '#f97316' }]}>{s.active}</Text>
                <Text style={styles.metricLbl}>Active</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={[styles.metricNum, { color: '#dc2626' }]}>{s.cancelled}</Text>
                <Text style={styles.metricLbl}>Cancel</Text>
              </View>
            </View>
          </View>
        ))
      )}

      {/* Sales split */}
      <View style={styles.titleRow}>
        <TrendingUp size={16} color="#0f172a" />
        <Text style={styles.sectionTitle}>Sales Analytics</Text>
      </View>

      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsHeader}>Total Completed Sales</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>All Staff Combined</Text>
          <Text style={styles.paymentValue}>Rs. {stats.totalSales}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#10b981' }]} />
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.sectionHeader}>EXPORT & PRINT DATA</Text>
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity style={styles.reportActionBtn} onPress={onDownloadReport} activeOpacity={0.7}>
            <Download size={18} color="#ffffff" />
            <Text style={styles.reportActionBtnText}>Excel / CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reportActionBtn, { backgroundColor: '#10b981' }]}
            onPress={onPrintReportPDF}
            activeOpacity={0.7}
          >
            <FileText size={18} color="#ffffff" />
            <Text style={styles.reportActionBtnText}>Print / PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: { padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  staffCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  staffHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  staffName: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  staffRole: { fontSize: 9, fontWeight: '800', color: '#f97316', marginTop: 2 },
  staffSales: { fontSize: 15, fontWeight: '900', color: '#16a34a' },
  staffSalesLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginTop: 1 },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metricPill: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricNum: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  metricLbl: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
  analyticsCard: {
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
  },
  analyticsHeader: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  paymentLabel: { fontSize: 12, color: '#64748b' },
  paymentValue: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
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
  actionButtonContainer: { flexDirection: 'row', gap: 12 },
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
  reportActionBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
