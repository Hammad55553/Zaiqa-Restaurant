import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clipboard, ArrowLeft } from 'lucide-react-native';
import MenuSection from '../components/MenuSection';
import CartSection from '../components/CartSection';
import { API_BASE, GST_RATE } from '../config';
import { useToast } from '../components/Toast';

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

interface OrderingScreenProps {
  selectedTable: Table;
  username: string;
  name?: string;
  onBack: () => void;
  onQueueOfflineOrder: (order: QueuedOrder) => void;
  initialCartItems?: CartItem[];
}

export default function OrderingScreen({
  selectedTable,
  username,
  name,
  onBack,
  onQueueOfflineOrder,
  initialCartItems
}: OrderingScreenProps) {
  const insets = useSafeAreaInsets();
  // Check screen width for responsiveness
  const { width: windowWidth } = Dimensions.get('window');
  const isTablet = windowWidth > 768;

  // Segmented subtab control for phone layout
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'cart'>('menu');

  // Menu and search states
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart states
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems || []);
  const [remarks, setRemarks] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const toast = useToast();

  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const handleReleaseTable = () => {
    Alert.alert(
      'Vacate Table',
      `Are you sure you want to mark Table ${selectedTable.number} as vacant/available?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Vacate',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/tables/${selectedTable.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'available' }),
              });
              if (res.ok) {
                toast.success('Table Vacated', `Table ${selectedTable.number} is now available.`);
                onBack();
              } else {
                toast.error('Failed', 'Could not vacate table.');
              }
            } catch (err) {
              toast.error('Connection Error', 'Could not reach server.');
            }
          }
        }
      ]
    );
  };

  const handleRequestBill = () => {
    if (!activeOrder) return;
    Alert.alert(
      'Request Bill',
      `Do you want to request the bill for Table ${selectedTable.number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Bill',
          onPress: async () => {
            try {
              setPlacingOrder(true);
              const subtotal = cartTotal;
              const tax = Math.round(subtotal * GST_RATE);
              const total_amount = subtotal + tax;

              const cleanRemarks = remarks.replace(/^\[BILL REQUESTED\]\s*/, '');
              const updatedRemarks = `[BILL REQUESTED] ${cleanRemarks}`;

              const res = await fetch(`${API_BASE}/orders/${activeOrder.id}/sync`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: cartItems.map(item => ({
                    item_id: item.id,
                    item_name: item.name,
                    price: item.price,
                    quantity: item.qty,
                    notes: item.notes || ''
                  })),
                  subtotal,
                  tax,
                  total_amount,
                  remarks: `[Waiter: ${name || username}] ${updatedRemarks}`
                })
              });

              if (res.ok) {
                toast.success('Bill Requested!', 'Notification sent to cashier.');
                onBack();
              } else {
                toast.error('Request Failed', 'Could not sync bill request.');
              }
            } catch (e) {
              toast.error('Network Error', 'Check server connection.');
            } finally {
              setPlacingOrder(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchMenu();
    if (selectedTable.status === 'dining' || selectedTable.status === 'reserved') {
      fetchActiveOrder();
    }
  }, []);

  const fetchActiveOrder = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/table/${selectedTable.number}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setActiveOrder(data);
          if (data.items && data.items.length > 0) {
            const mappedItems = data.items.map((item: any) => ({
              id: item.item_id,
              name: item.item_name,
              price: item.price,
              qty: item.quantity,
              notes: item.notes || '',
              category_name: ''
            }));
            setCartItems(mappedItems);
            if (data.remarks) {
              // Extract original remarks if any
              const cleanRemarks = data.remarks.replace(/^\[Waiter:[^\]]+\]\s*/, '');
              setRemarks(cleanRemarks);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch active order:', e);
    }
  };

  const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> => {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
  };

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      const [itemsRes, catsRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/inventory`),
        fetchWithTimeout(`${API_BASE}/inventory/categories`),
      ]);
      if (itemsRes.ok && catsRes.ok) {
        const items = await itemsRes.json();
        const cats = await catsRes.json();
        const processedCats = ['All', ...cats.map((c: any) => c.name)];
        
        setMenuItems(items);
        setCategories(processedCats);

        // Cache menu items & categories
        await AsyncStorage.setItem('CACHED_MENU_ITEMS', JSON.stringify(items));
        await AsyncStorage.setItem('CACHED_MENU_CATEGORIES', JSON.stringify(processedCats));
      } else {
        throw new Error('Unreachable');
      }
    } catch (err) {
      console.warn('Failed to fetch menu, checking AsyncStorage cache...');
      try {
        const cachedItems = await AsyncStorage.getItem('CACHED_MENU_ITEMS');
        const cachedCats = await AsyncStorage.getItem('CACHED_MENU_CATEGORIES');
        if (cachedItems && cachedCats) {
          setMenuItems(JSON.parse(cachedItems));
          setCategories(JSON.parse(cachedCats));
          return;
        }
      } catch (cacheErr) {
        console.warn('Error reading menu cache:', cacheErr);
      }

      console.warn('Using mock fallback for menu');
      const mockItems: MenuItem[] = [
        { id: 101, name: 'Special Chicken Karahi', price: 1800, category_name: 'Karahi' },
        { id: 102, name: 'Mutton Joint Karahi', price: 3200, category_name: 'Karahi' },
        { id: 103, name: 'Chicken Biryani', price: 450, category_name: 'Rice' },
        { id: 104, name: 'Kabuli Pulao', price: 650, category_name: 'Rice' },
        { id: 105, name: 'Garlic Naan', price: 90, category_name: 'Tandoor' },
        { id: 106, name: 'Roti', price: 30, category_name: 'Tandoor' },
        { id: 107, name: 'Mineral Water (L)', price: 120, category_name: 'Drinks' },
        { id: 108, name: 'Soft Drink 250ml', price: 80, category_name: 'Drinks' }
      ];
      setMenuItems(mockItems);
      setCategories(['All', 'Karahi', 'Rice', 'Tandoor', 'Drinks']);
    } finally {
      setLoadingMenu(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: any, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(i => i.qty > 0));
  };

  const addCustomItem = () => {
    if (!customName || !customPrice) {
      toast.warning('Required', 'Please enter item name and price.');
      return;
    }
    const newItem: MenuItem = {
      id: 'custom-' + Date.now(),
      name: customName,
      price: parseFloat(customPrice),
      category_name: 'Custom'
    };
    addToCart(newItem);
    setCustomName('');
    setCustomPrice('');
    setShowCustomForm(false);
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.warning('Empty Cart', 'Please add items before placing an order.');
      return;
    }

    const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const tax = subtotal * (GST_RATE / 100);
    const total_amount = subtotal + tax;

    try {
      setPlacingOrder(true);

      if (activeOrder) {
        // FULL SYNC / EDIT of existing active order!
        const syncBody = {
          items: cartItems.map(item => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.qty,
            notes: item.notes || ''
          })),
          subtotal,
          tax,
          total_amount,
          remarks: `[Waiter: ${name || username}] ${remarks || ''}`
        };

        const res = await fetch(`${API_BASE}/orders/${activeOrder.id}/sync`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncBody)
        });

        if (res.ok) {
          toast.success('Order Updated!', `Table ${selectedTable.number} ticket updated successfully.`);
          setCartItems([]);
          setRemarks('');
          onBack();
        } else {
          const errData = await res.json();
          toast.error('Update Failed', errData.error || 'Server error.');
        }
      } else {
        // Normal POST for new order
        const orderBody = {
          table_number: selectedTable.number,
          area: selectedTable.area,
          customer_name: `Table Guest`,
          remarks: `[Waiter: ${name || username}] ${remarks || ''}`,
          items: cartItems,
          subtotal,
          tax,
          total_amount
        };

        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderBody)
        });

        if (res.ok) {
          toast.success('Order Placed!', `Table ${selectedTable.number} order sent to kitchen.`);
          setCartItems([]);
          setRemarks('');
          onBack();
        } else {
          const errData = await res.json();
          toast.error('Order Failed', errData.error || 'Check server status.');
        }
      }
    } catch (err) {
      console.warn('Network failed, queueing order offline:', err);
      const newQueuedOrder: QueuedOrder = {
        id: 'queued-' + Date.now(),
        table_number: selectedTable.number,
        area: selectedTable.area,
        items: [...cartItems],
        subtotal,
        tax,
        total_amount,
        remarks: activeOrder 
          ? `[EDIT/SYNC ORDER #${activeOrder.id}] [Waiter: ${name || username}] ${remarks || ''}`
          : `[Waiter: ${name || username}] ${remarks || ''}`,
        timestamp: new Date().toLocaleTimeString(),
        status: 'pending'
      };

      onQueueOfflineOrder(newQueuedOrder);
      toast.warning('Saved Offline', `No connection. Order queued.`);
      setCartItems([]);
      setRemarks('');
      onBack();
    } finally {
      setPlacingOrder(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <View style={styles.orderScreenWrapper}>
      {/* Active Table selection header */}
      <View style={styles.activeTableHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>TABLE {selectedTable.number}</Text>
          <Text style={styles.headerSub}>
            {selectedTable.area.toUpperCase()} AREA • {activeOrder ? 'EDITING ACTIVE ORDER' : 'NEW ORDER'}
          </Text>
        </View>
        {selectedTable.status !== 'available' && (
          <TouchableOpacity 
            style={styles.releaseTableBtn} 
            onPress={handleReleaseTable}
            activeOpacity={0.7}
          >
            <Text style={styles.releaseTableText}>Vacate Table</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Sub Tab selector - only visible on mobile phones */}
      {!isTablet && (
        <View style={styles.subTabBar}>
          <TouchableOpacity 
            style={[styles.subTabBtn, activeSubTab === 'menu' && styles.subTabBtnActive]} 
            onPress={() => setActiveSubTab('menu')}
          >
            <Text style={[styles.subTabLabel, activeSubTab === 'menu' && styles.subTabLabelActive]}>MENU CATALOG</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTabBtn, activeSubTab === 'cart' && styles.subTabBtnActive]} 
            onPress={() => setActiveSubTab('cart')}
          >
            <Text style={[styles.subTabLabel, activeSubTab === 'cart' && styles.subTabLabelActive]}>
              VIEW TICKET ({cartCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Responsive Layout Container */}
      <View style={[styles.orderPanelContainer, !isTablet && styles.orderPanelContainerMobile]}>
        {/* Left: Menu Section (Visible on tablet, or on mobile when activeSubTab is 'menu') */}
        {(isTablet || activeSubTab === 'menu') && (
          <MenuSection
            loadingMenu={loadingMenu}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredItems={filteredItems}
            addToCart={addToCart}
            cartItems={cartItems}
            updateQty={updateQty}
            showCustomForm={showCustomForm}
            setShowCustomForm={setShowCustomForm}
            customName={customName}
            setCustomName={setCustomName}
            customPrice={customPrice}
            setCustomPrice={setCustomPrice}
            addCustomItem={addCustomItem}
          />
        )}

        {/* Right: Cart Section (Visible on tablet, or on mobile when activeSubTab is 'cart') */}
        {(isTablet || activeSubTab === 'cart') && (
          <CartSection
            cartItems={cartItems}
            setCartItems={setCartItems}
            updateQty={updateQty}
            remarks={remarks}
            setRemarks={setRemarks}
            cartTotal={cartTotal}
            handlePlaceOrder={handlePlaceOrder}
            placingOrder={placingOrder}
            activeOrder={activeOrder}
            onRequestBill={handleRequestBill}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orderScreenWrapper: {
    flex: 1,
  },
  activeTableHeader: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 3,
    borderColor: '#f97316',
  },
  releaseTableBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  releaseTableText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  orderPanelContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  orderPanelContainerMobile: {
    flexDirection: 'column',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 4,
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: '#ea580c',
  },
  subTabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  subTabLabelActive: {
    color: '#ffffff',
  },
});
