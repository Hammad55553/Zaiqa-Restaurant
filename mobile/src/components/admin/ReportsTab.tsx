import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Download, FileText } from 'lucide-react-native';

interface ReportsTabProps {
  stats: {
    totalSales: number;
  };
  onDownloadReport: () => void;
  onPrintReportPDF: () => void;
}

export default function ReportsTab({
  stats,
  onDownloadReport,
  onPrintReportPDF,
}: ReportsTabProps) {
  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.sectionTitle}>Sales & Payment Split Analytics</Text>
      
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsHeader}>Payment Methods Split</Text>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Cash Sales</Text>
          <Text style={styles.paymentValue}>Rs. {stats.totalSales}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#10b981' }]} />
        </View>

        <View style={[styles.paymentRow, { marginTop: 14 }]}>
          <Text style={styles.paymentLabel}>Card/Digital Sales</Text>
          <Text style={styles.paymentValue}>Rs. 0</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '0%', backgroundColor: '#3b82f6' }]} />
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.sectionHeader}>EXPORT & PRINT DATA</Text>
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity style={styles.reportActionBtn} onPress={onDownloadReport} activeOpacity={0.7}>
            <Download size={18} color="#ffffff" />
            <Text style={styles.reportActionBtnText}>Excel / CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: '#10b981' }]} onPress={onPrintReportPDF} activeOpacity={0.7}>
            <FileText size={18} color="#ffffff" />
            <Text style={styles.reportActionBtnText}>Print / PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
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
  analyticsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
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
});
