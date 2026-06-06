import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { API_BASE } from '../config';
import OrderHistory from '../components/OrderHistory';

interface HistoryScreenProps {
  username: string;
  onReorder: (order: any) => void;
}

export default function HistoryScreen({ username, onReorder }: HistoryScreenProps) {
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> => {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
  };

  const fetchOrderHistory = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTimeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const fallbackMockOrders = [
      {
        id: 9812,
        table_number: '2',
        area: 'Male',
        status: 'preparing',
        created_at: todayTimeStr,
        remarks: `[Waiter: ${username}] Single plate salad extra Naan`,
        total_amount: 1970,
        items: [
          { item_name: 'Special Chicken Karahi', quantity: 1, price: 1800 },
          { item_name: 'Garlic Naan', quantity: 1, price: 90 },
          { item_name: 'Soft Drink 250ml', quantity: 1, price: 80 }
        ]
      },
      {
        id: 9809,
        table_number: '5',
        area: 'Family',
        status: 'completed',
        created_at: todayTimeStr,
        remarks: `[Waiter: ${username}] Serve hot`,
        total_amount: 1020,
        items: [
          { item_name: 'Chicken Biryani', quantity: 2, price: 450 },
          { item_name: 'Mineral Water (L)', quantity: 1, price: 120 }
        ]
      }
    ];

    try {
      setLoadingHistory(true);
      const [activeRes, completedRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/orders/active`),
        fetchWithTimeout(`${API_BASE}/orders/completed`),
      ]);
      
      let activeOrders = [];
      let completedOrders = [];
      
      if (activeRes.ok) activeOrders = await activeRes.json();
      if (completedRes.ok) completedOrders = await completedRes.json();
      
      const combined = [...activeOrders, ...completedOrders];
      
      // Filter orders placed by this waiter today
      const userOrders = combined.filter((order: any) => {
        const isToday = order.created_at && order.created_at.startsWith(todayStr);
        const isUser = order.remarks && order.remarks.includes(`[Waiter: ${username}]`);
        return isToday && isUser;
      });
      
      // Sort by id descending
      userOrders.sort((a, b) => b.id - a.id);
      
      if (userOrders.length > 0) {
        setOrderHistory(userOrders);
      } else {
        setOrderHistory(fallbackMockOrders);
      }
    } catch (err) {
      console.warn("Failed to fetch order history, using fallback dummy history:", err);
      setOrderHistory(fallbackMockOrders);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <View style={styles.container}>
      <OrderHistory
        orderHistory={orderHistory}
        loadingHistory={loadingHistory}
        onReorder={onReorder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
