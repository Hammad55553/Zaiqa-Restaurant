import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Truck, ChevronRight, X, ArrowDownRight, ArrowUpRight, Search } from 'lucide-react-native';
import { API_BASE } from '../../config';

interface LedgerEntry {
  id: number;
  date: string;
  type: string;
  amount: number;
  note: string;
}

interface Supplier {
  id: string;
  name: string;
  company: string;
  contact: string;
  balance: number;
  history: LedgerEntry[];
}

interface SuppliersTabProps {
  onRefresh?: boolean;
}

export default function SuppliersTab({ onRefresh }: SuppliersTabProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [onRefresh]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/suppliers`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data || []);
      }
    } catch (err) {
      console.warn('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPayables = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);

  if (loading && suppliers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading suppliers and purchases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Business Payables</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Truck size={24} color="#f97316" />
        </View>
        <View>
          <Text style={styles.summaryLabel}>Total Outstanding Balance</Text>
          <Text style={styles.summaryValue}>Rs. {totalPayables.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Wholesale Suppliers ({suppliers.length})</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {suppliers.length === 0 ? (
          <Text style={styles.emptyText}>No suppliers found in the database.</Text>
        ) : (
          suppliers.map(supplier => (
            <TouchableOpacity 
              key={supplier.id} 
              style={styles.supplierCard}
              activeOpacity={0.7}
              onPress={() => setSelectedSupplier(supplier)}
            >
              <View style={styles.supplierCardHeader}>
                <View>
                  <Text style={styles.supplierName}>{supplier.name}</Text>
                  <Text style={styles.supplierCompany}>{supplier.company} • {supplier.contact}</Text>
                </View>
                <View style={styles.balanceBadge}>
                  <Text style={styles.balanceBadgeText}>Rs. {supplier.balance.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.supplierCardFooter}>
                <Text style={styles.supplierHistoryText}>
                  {supplier.history.length} transaction{supplier.history.length === 1 ? '' : 's'} recorded
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.viewLedgerText}>View Ledger</Text>
                  <ChevronRight size={14} color="#f97316" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Ledger Modal */}
      <Modal visible={!!selectedSupplier} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSupplier && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedSupplier.company}</Text>
                    <Text style={styles.modalSubtitle}>{selectedSupplier.name} • Balance: Rs. {selectedSupplier.balance.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSupplier(null)} style={styles.closeBtn}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.ledgerHeader}>
                  <Text style={styles.ledgerHeaderTitle}>Purchase & Payment History</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                  {selectedSupplier.history.length === 0 ? (
                    <Text style={styles.emptyText}>No transactions found for this supplier.</Text>
                  ) : (
                    selectedSupplier.history.map((entry, idx) => {
                      const isPurchase = entry.type === 'Stock Purchase';
                      return (
                        <View key={entry.id || idx} style={styles.ledgerEntry}>
                          <View style={[styles.ledgerIconWrap, { backgroundColor: isPurchase ? '#fee2e2' : '#dcfce7' }]}>
                            {isPurchase ? <ArrowDownRight size={16} color="#dc2626" /> : <ArrowUpRight size={16} color="#16a34a" />}
                          </View>
                          <View style={styles.ledgerDetails}>
                            <Text style={styles.ledgerType}>{entry.type}</Text>
                            <Text style={styles.ledgerDate}>
                              {new Date(entry.date).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {entry.note ? <Text style={styles.ledgerNote}>{entry.note}</Text> : null}
                          </View>
                          <View style={styles.ledgerAmountWrap}>
                            <Text style={[styles.ledgerAmount, { color: isPurchase ? '#dc2626' : '#16a34a' }]}>
                              {isPurchase ? '+' : '-'}Rs. {entry.amount.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
  supplierCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supplierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  supplierCompany: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  balanceBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#dc2626',
  },
  supplierCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  supplierHistoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  viewLedgerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f97316',
    marginRight: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  ledgerHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ledgerEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  ledgerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ledgerDetails: {
    flex: 1,
  },
  ledgerType: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  ledgerDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  ledgerNote: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  ledgerAmountWrap: {
    alignItems: 'flex-end',
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
});
