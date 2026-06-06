import { useEffect, useState } from 'react';
import { syncService } from '../services/syncService';

/**
 * Hook to subscribe to sync updates
 * Usage: useSync('orders:update', orders => console.log(orders))
 */
export function useSync(eventType, callback) {
  useEffect(() => {
    const unsubscribe = syncService.subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback]);
}

/**
 * Hook to manage synced data
 * Usage: const [orders, setOrders] = useSyncedData('orders:update', [])
 */
export function useSyncedData(eventType, initialState) {
  const [data, setData] = useState(initialState);

  useEffect(() => {
    const unsubscribe = syncService.subscribe(eventType, (newData) => {
      setData(newData);
    });

    return unsubscribe;
  }, [eventType]);

  return [data, setData];
}
