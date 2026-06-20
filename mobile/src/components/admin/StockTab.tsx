import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Search, ArrowDownLeft, ArrowUpRight, BarChart2 } from 'lucide-react-native';

interface StockTabProps {
  stockSubTab: 'inventory' | 'history';
  onSetStockSubTab: (tab: 'inventory' | 'history') => void;
  stockItems: any[];
  stockLogs: any[];
}

export default function StockTab({
  stockSubTab,
  onSetStockSubTab,
  stockItems,
  stockLogs,
}: StockTabProps) {
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('all');
  const [filterAction, setFilterAction] = useState<'all' | 'add' | 'remove'>('all');

  const getStockStatusBadge = (qty: number, min: number) => {
    if (qty <= 0) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fecdd3' }]}>
          <Text style={[styles.statusText, { color: '#be123c' }]}>OUT OF STOCK</Text>
        </View>
      );
    }
    if (qty <= min) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#ffedd5' }]}>
          <Text style={[styles.statusText, { color: '#c2410c' }]}>LOW STOCK</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
        <Text style={[styles.statusText, { color: '#15803d' }]}>IN STOCK</Text>
      </View>
    );
  };

  // Get unique item names present in logs for filtering scroller
  const uniqueItemNames = useMemo(() => {
    const names = new Set<string>();
    stockLogs.forEach(log => {
      if (log.item_name) names.add(log.item_name);
    });
    return Array.from(names).sort();
  }, [stockLogs]);

  // Filter logs based on inputs
  const filteredLogs = useMemo(() => {
    return stockLogs.filter(log => {
      // 1. Item Filter
      if (selectedItemName !== 'all' && log.item_name !== selectedItemName) return false;

      // 2. Action Filter
      if (filterAction !== 'all' && log.action !== filterAction) return false;

      // 3. Search Filter (matches item name or remarks)
      if (search) {
        const query = search.toLowerCase();
        const matchesName = log.item_name && log.item_name.toLowerCase().includes(query);
        const matchesRemarks = log.remarks && log.remarks.toLowerCase().includes(query);
        if (!matchesName && !matchesRemarks) return false;
      }

      return true;
    });
  }, [stockLogs, selectedItemName, filterAction, search]);

  // Compute live flow statistics for the filtered logs
  const stats = useMemo(() => {
    let restocked = 0;
    let consumed = 0;
    let unit = 'units';

    // Sum using logs for the selected item (ignoring search queries for stable totals)
    const logsToSum = selectedItemName === 'all'
      ? filteredLogs
      : stockLogs.filter(l => l.item_name === selectedItemName);

    logsToSum.forEach(log => {
      const qty = parseFloat(log.qty_changed) || 0;
      if (log.action === 'add') {
        restocked += qty;
      } else if (log.action === 'remove') {
        consumed += qty;
      }
      if (log.item_unit) {
        unit = log.item_unit;
      }
    });

    return {
      restocked,
      consumed,
      net: restocked - consumed,
      unit,
    };
  }, [selectedItemName, stockLogs, filteredLogs]);

  return (
    <View style={styles.contentWrapper}>
      {/* Top Navigation Segments */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, stockSubTab === 'inventory' && styles.segmentBtnActive]}
          onPress={() => onSetStockSubTab('inventory')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, stockSubTab === 'inventory' && styles.segmentTextActive]}>INVENTORY LEVELS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, stockSubTab === 'history' && styles.segmentBtnActive]}
          onPress={() => onSetStockSubTab('history')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, stockSubTab === 'history' && styles.segmentTextActive]}>AUDIT LOGS / HISTORY</Text>
        </TouchableOpacity>
      </View>

      {stockSubTab === 'inventory' ? (
        <>
          <Text style={styles.sectionTitle}>Kitchen Inventory Alert Console</Text>
          {stockItems.length === 0 ? (
            <Text style={styles.emptyText}>No stock items configured.</Text>
          ) : (
            stockItems.map((stock) => (
              <View key={stock.id} style={styles.stockItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockCardTitle}>{stock.name}</Text>
                  <Text style={styles.stockCardSub}>Unit: {stock.unit} • Threshold Alert: {stock.min_alert}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.stockCardVal}>{stock.quantity} {stock.unit}</Text>
                  {getStockStatusBadge(stock.quantity, stock.min_alert)}
                </View>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Stock Transaction History Logs</Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ingredient or remarks..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Action Filter Pills */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, filterAction === 'all' && styles.filterPillActive]}
              onPress={() => setFilterAction('all')}
            >
              <Text style={[styles.filterPillText, filterAction === 'all' && styles.filterPillTextActive]}>All Actions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, filterAction === 'add' && styles.filterPillActive]}
              onPress={() => setFilterAction('add')}
            >
              <Text style={[styles.filterPillText, filterAction === 'add' && styles.filterPillTextActive]}>Restocked (In)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, filterAction === 'remove' && styles.filterPillActive]}
              onPress={() => setFilterAction('remove')}
            >
              <Text style={[styles.filterPillText, filterAction === 'remove' && styles.filterPillTextActive]}>Used (Out)</Text>
            </TouchableOpacity>
          </View>

          {/* Item Selector Horizontal Scroll */}
          <Text style={styles.subSectionTitle}>Filter By Ingredient</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemScroller} contentContainerStyle={styles.itemScrollerContent}>
            <TouchableOpacity
              style={[styles.itemPill, selectedItemName === 'all' && styles.itemPillActive]}
              onPress={() => setSelectedItemName('all')}
            >
              <Text style={[styles.itemPillText, selectedItemName === 'all' && styles.itemPillTextActive]}>All Items</Text>
            </TouchableOpacity>
            {uniqueItemNames.map(name => (
              <TouchableOpacity
                key={name}
                style={[styles.itemPill, selectedItemName === name && styles.itemPillActive]}
                onPress={() => setSelectedItemName(name)}
              >
                <Text style={[styles.itemPillText, selectedItemName === name && styles.itemPillTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Statistics Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statsCard}>
              <View style={[styles.statsIconWrap, { backgroundColor: '#dcfce7' }]}>
                <ArrowDownLeft size={16} color="#15803d" />
              </View>
              <Text style={styles.statsLabel}>Total Restocked</Text>
              <Text style={[styles.statsVal, { color: '#16a34a' }]}>+{stats.restocked.toFixed(1).replace(/\.0$/, '')} {stats.unit}</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={[styles.statsIconWrap, { backgroundColor: '#fee2e2' }]}>
                <ArrowUpRight size={16} color="#dc2626" />
              </View>
              <Text style={styles.statsLabel}>Total Consumed</Text>
              <Text style={[styles.statsVal, { color: '#ef4444' }]}>-{stats.consumed.toFixed(1).replace(/\.0$/, '')} {stats.unit}</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={[styles.statsIconWrap, { backgroundColor: '#dbeafe' }]}>
                <BarChart2 size={16} color="#1d4ed8" />
              </View>
              <Text style={styles.statsLabel}>Net Flow</Text>
              <Text style={[styles.statsVal, { color: '#2563eb' }]}>{stats.net >= 0 ? '+' : ''}{stats.net.toFixed(1).replace(/\.0$/, '')} {stats.unit}</Text>
            </View>
          </View>

          {/* Log Entry Cards */}
          <Text style={styles.subSectionTitle}>Detailed Logs ({filteredLogs.length})</Text>
          {filteredLogs.length === 0 ? (
            <Text style={styles.emptyText}>No transaction records matched the filters.</Text>
          ) : (
            filteredLogs.map((log) => (
              <View key={log.id} style={styles.stockItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockCardTitle}>{log.item_name}</Text>
                  <Text style={styles.stockCardSub}>
                    {new Date(log.created_at || Date.now()).toLocaleString('en-PK', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })}
                  </Text>
                  {log.remarks && (
                    <Text style={styles.logRemarksText}>{log.remarks}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.stockCardVal, { color: log.action === 'remove' ? '#ef4444' : '#16a34a' }]}>
                    {log.action === 'remove' ? '-' : '+'}{log.qty_changed} {log.item_unit}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: log.action === 'add' ? '#dcfce7' : log.action === 'remove' ? '#fecdd3' : '#e2e8f0' }]}>
                    <Text style={[styles.statusText, { color: log.action === 'add' ? '#15803d' : log.action === 'remove' ? '#be123c' : '#475569' }]}>
                      {log.action.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </>
      )}
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
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
  stockItemCard: {
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
  stockCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  stockCardSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  logRemarksText: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '700',
    marginTop: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stockCardVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#f97316',
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  // History Filters Styling
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  itemScroller: {
    marginBottom: 16,
  },
  itemScrollerContent: {
    gap: 8,
    paddingRight: 16,
  },
  itemPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemPillActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  itemPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'capitalize',
  },
  itemPillTextActive: {
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statsIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statsVal: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
  },
});

