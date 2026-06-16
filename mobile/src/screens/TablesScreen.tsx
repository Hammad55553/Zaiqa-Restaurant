import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';
import TableCard from '../components/TableCard';
import AreaScroller from '../components/AreaScroller';
import LogoLoader from '../components/LogoLoader';

interface Table {
  id: number;
  number: string;
  area: string;
  seats: number;
  status: string;
  startTime?: string;
}

interface MenuItem {
  id: any;
  name: string;
  price: number;
  category_name?: string;
  image?: string;
}

interface CartItem extends MenuItem {
  qty: number;
  notes?: string;
}

interface QueuedOrder {
  id: string;
  table_number: string;
  area: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total_amount: number;
  remarks: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

interface TablesScreenProps {
  onSelectTable: (table: Table) => void;
  queue: QueuedOrder[];
  syncOfflineQueue: () => Promise<void>;
  syncingQueue: boolean;
}

export default function TablesScreen({
  onSelectTable,
  queue,
  syncOfflineQueue,
  syncingQueue
}: TablesScreenProps) {
  const [loadingTables, setLoadingTables] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> => {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
  };

  const fetchTables = async () => {
    try {
      setLoadingTables(true);
      const res = await fetchWithTimeout(`${API_BASE}/tables`);
      if (res.ok) {
        const data: Table[] = await res.json();
        setTables(data);
        
        const pref = ['Male', 'Family', 'Lawn'];
        const uniqueAreas = Array.from(new Set(data.map(t => t.area)));
        uniqueAreas.sort((a, b) => {
          let idxA = pref.indexOf(a);
          let idxB = pref.indexOf(b);
          if (idxA === -1) idxA = 999;
          if (idxB === -1) idxB = 999;
          return idxA - idxB;
        });

        setAreas(uniqueAreas);
        if (uniqueAreas.length > 0) setSelectedArea(uniqueAreas[0]);

        // Save to cache
        await AsyncStorage.setItem('CACHED_TABLES', JSON.stringify(data));
      } else {
        throw new Error('Unreachable');
      }
    } catch (err) {
      console.warn('Failed to fetch tables, trying cache...');
      try {
        const cached = await AsyncStorage.getItem('CACHED_TABLES');
        if (cached) {
          const data: Table[] = JSON.parse(cached);
          setTables(data);
          
          const pref = ['Male', 'Family', 'Lawn'];
          const uniqueAreas = Array.from(new Set(data.map(t => t.area)));
          uniqueAreas.sort((a, b) => {
            let idxA = pref.indexOf(a);
            let idxB = pref.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
          });
          setAreas(uniqueAreas);
          if (uniqueAreas.length > 0) setSelectedArea(uniqueAreas[0]);
          return;
        }
      } catch (cacheErr) {
        console.warn('Failed to load tables from cache:', cacheErr);
      }

      console.warn('Using mock fallback for tables');
      const mockTables: Table[] = [
        { id: 1, number: '1', area: 'Male', seats: 4, status: 'available' },
        { id: 2, number: '2', area: 'Male', seats: 2, status: 'dining', startTime: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
        { id: 3, number: '3', area: 'Male', seats: 6, status: 'available' },
        { id: 4, number: '4', area: 'Male', seats: 4, status: 'reserved' },
        { id: 5, number: '5', area: 'Family', seats: 4, status: 'dining', startTime: new Date(Date.now() - 28 * 60 * 1000).toISOString() },
        { id: 6, number: '6', area: 'Family', seats: 8, status: 'available' },
        { id: 7, number: '7', area: 'Lawn', seats: 4, status: 'available' },
        { id: 8, number: '8', area: 'Lawn', seats: 4, status: 'available' },
        { id: 9, number: '9', area: 'Delivery', seats: 2, status: 'available' }
      ];
      setTables(mockTables);
      setAreas(['Male', 'Family', 'Lawn', 'Delivery']);
      setSelectedArea('Male');
    } finally {
      setLoadingTables(false);
    }
  };

  const filteredTables = tables.filter(t => t.area === selectedArea);

  return (
    <View style={styles.container}>
      {queue.length > 0 && (
        <View style={styles.queueBanner}>
          <Text style={styles.queueBannerText}>
            {queue.length} Offline Order{queue.length > 1 ? 's' : ''} in Sync Queue
          </Text>
          <TouchableOpacity 
            style={styles.syncBannerBtn} 
            onPress={syncOfflineQueue} 
            disabled={syncingQueue}
          >
            {syncingQueue ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.syncBannerBtnText}>SYNC NOW</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modular Floor Areas Selector */}
      <AreaScroller
        areas={areas}
        selectedArea={selectedArea}
        onSelectArea={setSelectedArea}
      />

      {loadingTables ? (
        <View style={styles.centerLoading}>
          <LogoLoader />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tableGrid}>
          {filteredTables.map(table => (
            <TableCard key={table.id} table={table} onPress={onSelectTable} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tableGrid: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  queueBannerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  syncBannerBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncBannerBtnText: {
    color: '#ea580c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
