import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Menu from './Menu';
import Cart from './Cart';
import { ArrowLeft, Users, Clock, Edit2, LayoutGrid, CheckCircle, AlertCircle, AlertTriangle, X, Bike, Phone, MapPin, Plus, Trash2, Search, Printer, CreditCard, ShoppingBag, Lock, Unlock, Ban } from 'lucide-react';
import TableCard from './components/TableCard';
import TableTimer from './components/TableTimer';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import CheckoutConfirmationModal from './components/CheckoutConfirmationModal';
import ReceiptSlip from './components/ReceiptSlip';
import Logo from '../../assets/Logo.jpg';
// import { INITIAL_TABLES } from './data/mockTables';
import { API_BASE, WS_URL } from '../../config';
import { syncService } from '../../services/syncService';
import { getOfflineItem, setOfflineItem, removeOfflineItem } from '../../utils/offlineDB';
import { moveToTrash } from '../../utils/trashDB';
import CancelRequestsPanel from './components/CancelRequestsPanel';

const POSLayout = ({ currentUser, globalDirectSelectDeliveryId, onClearGlobalDirectSelectDeliveryId, navigateTo }) => {
  const [view, setView] = useState('floor'); // 'floor', 'order', or 'delivery-order'
  const [selectedTable, setSelectedTable] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [activeArea, setActiveArea] = useState('Male'); // Male, Family, Lawn, Delivery

  // Delivery orders state
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [newDeliveryPhone, setNewDeliveryPhone] = useState('');
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [newDeliveryAddress, setNewDeliveryAddress] = useState('');
  const [deliveryTab, setDeliveryTab] = useState('All');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  const [deliveryRangeFilter, setDeliveryRangeFilter] = useState('all');
  const [duplicateDeliveryPrompt, setDuplicateDeliveryPrompt] = useState(null);

  // Edit states for Order View
  const [editingSeats, setEditingSeats] = useState(false);
  const [seatsValue, setSeatsValue] = useState(0);

  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState('pending');
  const [activeOrderInvoiceNumber, setActiveOrderInvoiceNumber] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelRequestsOpen, setCancelRequestsOpen] = useState(false);
  const [pendingCancelCount, setPendingCancelCount] = useState(0);
  const [adminUnlockRemark, setAdminUnlockRemark] = useState('');
  const [billRequestAlert, setBillRequestAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingTime, setEditingTime] = useState(false);
  const [timeValue, setTimeValue] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState('available');
  const [customStatus, setCustomStatus] = useState('');

  // Confirmation Modal State
  const [orderConfirmData, setOrderConfirmData] = useState(null);
  const [confirmStatus, setConfirmStatus] = useState('dining');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Customer Name Registration States
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderCustomerAddress, setOrderCustomerAddress] = useState('');
  const [orderCustomerEmail, setOrderCustomerEmail] = useState('');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [activeOrderPaymentStatus, setActiveOrderPaymentStatus] = useState(null);
  const [customPaymentStatus, setCustomPaymentStatus] = useState('');
  const [completedInvoices, setCompletedInvoices] = useState([]);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [allDBCustomers, setAllDBCustomers] = useState([]);
  const [suggestedCustomers, setSuggestedCustomers] = useState([]);
  const [suggestedDeliveryCustomers, setSuggestedDeliveryCustomers] = useState([]);
  const [globalGstRate, setGlobalGstRate] = useState(0);
  const [serviceCharges, setServiceCharges] = useState(0);
  const [applyServiceCharges, setApplyServiceCharges] = useState(true);
  const [applyTax, setApplyTax] = useState(false);

  useEffect(() => {
    const loadGlobalSettings = async () => {
      const gst = await getOfflineItem('zaiqa_mahal_global_gst_rate', 0);
      setGlobalGstRate(gst);
      
      const scItem = cartItems.find(i => i.name === 'Service Charges' || i.item_name === 'Service Charges');
      if (scItem) {
        setServiceCharges(scItem.price || scItem.amount || 0);
        setApplyServiceCharges(true);
      } else {
        if (cartItems.length === 0) {
          const defaultSC = parseFloat(await getOfflineItem('zaiqa_mahal_global_service_charges', 0));
          setServiceCharges(defaultSC);
          setApplyServiceCharges(true);
          setApplyTax(false);
        }
      }
    };
    loadGlobalSettings();
  }, [view, cartItems.length === 0]);

  // Synchronize Service Charges item inside cartItems
  useEffect(() => {
    setCartItems(prev => {
      const filtered = prev.filter(i => i.name !== 'Service Charges' && i.item_name !== 'Service Charges');
      if (applyServiceCharges && serviceCharges > 0) {
        return [...filtered, {
          id: 'service-charges-id',
          cartId: 'service-charges-cart-id',
          name: 'Service Charges',
          price: serviceCharges,
          qty: 1,
          sent: true,
          taxRateOverride: 0
        }];
      }
      return filtered;
    });
  }, [applyServiceCharges, serviceCharges]);

  useEffect(() => {
    const loadCustomers = () => {
      fetch(`${API_BASE}/customers`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAllDBCustomers(data))
        .catch(err => console.error("Failed to load customer list for lookup", err));
    };
    loadCustomers();
  }, [view, isNameModalOpen]);

  // Click outside to close suggested customer dropdowns and delivery headers automatically
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.phone-lookup-container')) {
        setSuggestedCustomers([]);
        setSuggestedDeliveryCustomers([]);
      }
      if (!e.target.closest('.delivery-crm-container')) {
        setShowDeliveryCustModal(false);
      }
      if (!e.target.closest('.delivery-payment-container')) {
        setShowPaymentDropdown(false);
      }
      if (!e.target.closest('.delivery-status-container')) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Home Delivery action controls states
  const [showDeliveryCustModal, setShowDeliveryCustModal] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // State for dynamic tables
  const [tables, setTables] = useState([]);

  // Fetch tables and sync with active orders
  useEffect(() => {
    const fetchTablesAndOrders = async () => {
      try {
        // Fetch all tables from DB
        const tablesRes = await fetch(`${API_BASE}/tables`);
        if (!tablesRes.ok) return;
        const dbTables = await tablesRes.json();

        // Fetch active orders
        const ordersRes = await fetch(`${API_BASE}/orders/active`);
        if (ordersRes.ok) {
          const activeOrders = await ordersRes.json();
          if (activeOrders && activeOrders.length > 0) {
            activeOrders.forEach(order => {
              const t = dbTables.find(tb => tb.number === order.table_number);
              if (t) {
                t.status = 'dining';
                t.startTime = order.created_at ? new Date(order.created_at + 'Z').toISOString() : new Date().toISOString();
              }
            });

            // Check if any active order has requested the bill
            const requested = activeOrders.find(o => o.remarks && o.remarks.includes('[BILL REQUESTED]'));
            if (requested) {
              const tbl = dbTables.find(t => t.number === requested.table_number);
              setBillRequestAlert({
                orderId: requested.id,
                tableNumber: requested.table_number,
                area: tbl ? tbl.area : 'Male',
                tableObj: tbl
              });
            } else {
              setBillRequestAlert(null);
            }
          } else {
            setBillRequestAlert(null);
          }

          // Inbound KDS status sync & auto-import for active Delivery orders from SQLite central DB!
          const localDeliveries = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);
          const dbDeliveries = activeOrders.filter(o => o.area === 'Delivery');
          
          let updated = [...localDeliveries];
          let hasChanges = false;
          
          dbDeliveries.forEach(dbDel => {
            // Check if this backend order is already in our local list
            const localMatchIndex = updated.findIndex(o => 
              o.id === dbDel.table_number || 
              String(o.backendOrderId) === String(dbDel.id)
            );
            
            // Extract phone and address dynamically from remarks if stored in standard format
            let phone = '';
            let address = '';
            if (dbDel.remarks) {
              const phoneMatch = dbDel.remarks.match(/Phone:\s*([0-9+]+)/i);
              const addressMatch = dbDel.remarks.match(/Address:\s*([^,\n]+)/i);
              if (phoneMatch) phone = phoneMatch[1];
              if (addressMatch) address = addressMatch[1];
            }
            
            // Map backend status to delivery status
            let syncedStatus = 'pending';
            if (dbDel.status === 'preparing') syncedStatus = 'preparing';
            else if (dbDel.status === 'ready') syncedStatus = 'out_for_delivery';
            else if (dbDel.status === 'completed') syncedStatus = 'delivered';
            
            const mappedOrder = {
              id: dbDel.table_number || `DEL-${dbDel.id}`,
              backendOrderId: dbDel.id,
              phone: phone || dbDel.customer_phone || '',
              name: dbDel.customer_name || '',
              address: address || dbDel.delivery_address || '',
              paymentMethod: dbDel.payment_method || 'cod',
              deliveryStatus: syncedStatus,
              items: dbDel.items ? dbDel.items.map(item => ({
                id: item.item_id,
                name: item.item_name,
                price: item.price,
                qty: item.quantity,
                sent: true
              })) : [],
              startTime: dbDel.created_at ? new Date(dbDel.created_at.replace(' ', 'T') + 'Z').toISOString() : new Date().toISOString()
            };
            
            if (localMatchIndex > -1) {
              // Update existing order status or sync items if changed
              const existing = updated[localMatchIndex];
              if (existing.deliveryStatus !== mappedOrder.deliveryStatus || existing.items.length !== mappedOrder.items.length || !existing.backendOrderId) {
                updated[localMatchIndex] = { 
                  ...existing, 
                  backendOrderId: mappedOrder.backendOrderId,
                  deliveryStatus: mappedOrder.deliveryStatus,
                  items: mappedOrder.items.length > 0 ? mappedOrder.items : existing.items
                };
                hasChanges = true;
              }
            } else {
              // Auto-import active delivery order from backend SQLite database!
              updated.push(mappedOrder);
              hasChanges = true;
            }
          });
          
          if (hasChanges) {
            await setOfflineItem('zaiqa_mahal_active_delivery_orders', updated);
            setDeliveryOrders(updated);
            
            // Sync selectedDelivery state if currently viewed
            if (selectedDelivery) {
              const activeMatch = updated.find(o => o.id === selectedDelivery.id);
              if (activeMatch && activeMatch.deliveryStatus !== selectedDelivery.deliveryStatus) {
                setSelectedDelivery(activeMatch);
              }
            }
          }
        }

        // Fetch completed/historical orders from backend central server reports/orders to sync completedInvoices in real-time
        try {
          const reportsRes = await fetch(`${API_BASE}/reports/orders`);
          if (reportsRes.ok) {
            const allDbOrders = await reportsRes.json();
            const completedDbOrders = allDbOrders.filter(o => o.status === 'completed');
            
            if (completedDbOrders.length > 0) {
              const localInvoices = await getOfflineItem('zaiqa_mahal_completed_invoices', []);
              let hasNewInvoices = false;
              let updatedInvoices = [...localInvoices];
              
              completedDbOrders.forEach(dbOrd => {
                const invoiceId = String(dbOrd.id);
                const exists = updatedInvoices.some(inv => 
                  String(inv.orderId) === invoiceId || 
                  String(inv.orderId) === String(dbOrd.table_number)
                );
                
                if (!exists) {
                  let phone = '';
                  let address = '';
                  if (dbOrd.remarks) {
                    const phoneMatch = dbOrd.remarks.match(/Phone:\s*([0-9+]+)/i);
                    const addressMatch = dbOrd.remarks.match(/Address:\s*([^,\n]+)/i);
                    if (phoneMatch) phone = phoneMatch[1];
                    if (addressMatch) address = addressMatch[1];
                  }
                  
                  const mappedInvoice = {
                    orderId: dbOrd.table_number || String(dbOrd.id),
                    customerPhone: phone || dbOrd.customer_phone || 'N/A',
                    customerName: dbOrd.customer_name || 'Walk-in Guest',
                    deliveryAddress: address || dbOrd.delivery_address || '',
                    table: dbOrd.area === 'Delivery' ? 'Delivery' : { number: dbOrd.table_number, area: dbOrd.area },
                    items: dbOrd.items ? dbOrd.items.map(item => ({
                      name: item.item_name,
                      price: item.price,
                      qty: item.quantity
                    })) : [],
                    subtotal: dbOrd.subtotal,
                    tax: dbOrd.tax,
                    total: dbOrd.total_amount,
                    paymentMethod: dbOrd.payment_method || 'cash',
                    date: dbOrd.created_at ? new Date(dbOrd.created_at.replace(' ', 'T') + 'Z').toISOString() : new Date().toISOString()
                  };
                  
                  updatedInvoices.unshift(mappedInvoice);
                  hasNewInvoices = true;
                }
              });
              
              if (hasNewInvoices) {
                await setOfflineItem('zaiqa_mahal_completed_invoices', updatedInvoices);
                setCompletedInvoices(updatedInvoices);
              }
            }
          }
        } catch (err) {
          console.error("Failed to sync completed reports/orders:", err);
        }

        setTables(dbTables);
      } catch (err) {
        console.error("Failed to sync tables:", err);
      }
    };

    fetchTablesAndOrders();

    // Setup centralized event listeners for real-time synchronization
    const unsubscribeOrders = syncService.subscribe('orders:update', () => {
      console.log("POSLayout: Orders update event received! Refreshing floor states...");
      fetchTablesAndOrders();
    });
    const unsubscribeTables = syncService.subscribe('tables:update', () => {
      console.log("POSLayout: Tables update event received! Refreshing floor states...");
      fetchTablesAndOrders();
    });

    const interval = setInterval(fetchTablesAndOrders, 10000);
    return () => {
      clearInterval(interval);
      unsubscribeOrders();
      unsubscribeTables();
    };
  }, [selectedDelivery, refreshKey]);

  // Poll pending cancel requests for badge
  useEffect(() => {
    const pollCancelRequests = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/cancel-requests?status=pending`);
        if (res.ok) {
          const data = await res.json();
          setPendingCancelCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {}
    };
    pollCancelRequests();
    const interval = setInterval(pollCancelRequests, 10000);
    return () => clearInterval(interval);
  }, [cancelRequestsOpen]);

  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("AudioContext play failed:", e);
    }
  };

  // Play chime periodically if cancel requests are pending
  useEffect(() => {
    if (pendingCancelCount <= 0 || cancelRequestsOpen) return;
    
    // Play chime immediately
    playNotificationChime();
    
    const interval = setInterval(() => {
      if (pendingCancelCount > 0 && !cancelRequestsOpen) {
        playNotificationChime();
      }
    }, 6000); // chime every 6 seconds
    
    return () => clearInterval(interval);
  }, [pendingCancelCount, cancelRequestsOpen]);

  // Load & sync delivery orders from IndexedDB
  const loadDeliveryOrders = async () => {
    const stored = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);
    setDeliveryOrders(stored || []);
  };

  const createNewDeliveryFromCRM = async (cust, existingList = null) => {
    const existing = existingList || await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);
    const newOrder = {
      id: 'DEL-' + Date.now(),
      phone: cust.phone || '',
      name: cust.name || '',
      address: cust.address || '',
      paymentMethod: 'cod',
      deliveryStatus: 'pending',
      startTime: new Date().toISOString(),
      items: [],
      backendOrderId: null
    };
    const updated = [newOrder, ...existing];
    await setOfflineItem('zaiqa_mahal_active_delivery_orders', updated);
    setDeliveryOrders(updated);
    setActiveArea('Delivery');
    setSelectedDelivery(newOrder);
    setCartItems([]);
    setActiveOrderId(null);
    setActiveOrderStatus('pending');
    setAdminUnlockRemark('');
    setView('delivery-order');
  };

  const handleViewActiveOrder = (order) => {
    setSelectedDelivery(order);
    const mapped = order.items || [];
    setCartItems(mapped);
    setActiveOrderId(null);
    setActiveOrderStatus('pending');
    setAdminUnlockRemark('');
    setView('delivery-order');
    setDuplicateDeliveryPrompt(null);
    
    const hasTax = (order.tax > 0);
    const hasServiceCharges = mapped.some(i => i.item_name === 'Service Charges' || i.name === 'Service Charges');
    setApplyTax(hasTax);
    setApplyServiceCharges(hasServiceCharges);
  };

  const handleCreateNewOrderAnyway = async (cust) => {
    setDuplicateDeliveryPrompt(null);
    const existing = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);
    await createNewDeliveryFromCRM(cust, existing);
  };

  useEffect(() => {
    const initDeliveryOrders = async () => {
      await loadDeliveryOrders();
      const invoices = await getOfflineItem('zaiqa_mahal_completed_invoices', []);
      setCompletedInvoices(invoices || []);

      // Check if delivery manager navigated here with a pre-filled customer
      const activeDelivery = await getOfflineItem('zaiqa_mahal_active_delivery');
      if (activeDelivery) {
        const cust = activeDelivery;
        await removeOfflineItem('zaiqa_mahal_active_delivery');

        const existing = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);

        // Look for an existing ACTIVE order (not delivered) for this customer
        const existingActiveOrder = existing.find(o => o.phone === cust.phone && o.deliveryStatus !== 'delivered');

        if (existingActiveOrder) {
          // Active order exists! Trigger choice prompt instead of duplicate creation
          setActiveArea('Delivery');
          setDuplicateDeliveryPrompt({ customer: cust, existingOrder: existingActiveOrder });
        } else {
          // No active order, safely create new one!
          await createNewDeliveryFromCRM(cust, existing);
        }
      }
    };
    
    initDeliveryOrders();
  }, []);

  useEffect(() => {
    if (globalDirectSelectDeliveryId) {
      const selectDeliveryById = async () => {
        const activeList = await getOfflineItem('zaiqa_mahal_active_delivery_orders', []);
        const foundOrder = activeList.find(o => String(o.id) === String(globalDirectSelectDeliveryId));
        if (foundOrder) {
          setActiveArea('Delivery');
          setSelectedDelivery(foundOrder);
          setCartItems(foundOrder.items || []);
          setActiveOrderId(null);
          setActiveOrderStatus('pending');
          setAdminUnlockRemark('');
          setView('delivery-order');
          setDuplicateDeliveryPrompt(null);
        }
        if (onClearGlobalDirectSelectDeliveryId) {
          onClearGlobalDirectSelectDeliveryId();
        }
      };
      selectDeliveryById();
    }
  }, [globalDirectSelectDeliveryId, onClearGlobalDirectSelectDeliveryId]);

  const saveDeliveryOrders = async (orders) => {
    await setOfflineItem('zaiqa_mahal_active_delivery_orders', orders);
    setDeliveryOrders(orders);
  };

  const checkAndAppendPreparedWaste = async (initialCartItems) => {
    const stored = localStorage.getItem('zaiqa_mahal_pending_waste_sell_temp');
    if (stored) {
      try {
        const wasteItem = JSON.parse(stored);
        localStorage.removeItem('zaiqa_mahal_pending_waste_sell_temp');
        
        const menuRes = await fetch(`${API_BASE}/inventory`);
        let matched = null;
        if (menuRes.ok) {
          const menuItems = await menuRes.json();
          matched = menuItems.find(i => i.name.toLowerCase() === wasteItem.name.toLowerCase());
        }
        
        const newItem = matched ? {
          ...matched,
          isFromPreparedWaste: true,
          cartId: matched.id + '-' + Date.now(),
          qty: wasteItem.qty,
          sent: false
        } : {
          id: 'custom-waste-' + Date.now(),
          cartId: 'custom-waste-' + Date.now(),
          name: wasteItem.name,
          price: 0,
          isFromPreparedWaste: true,
          qty: wasteItem.qty,
          sent: false
        };
        
        showToast(`Added ${newItem.name} from prepared waste (stock will not be deducted)`, 'success');
        return [...initialCartItems, newItem];
      } catch (err) {
        console.error("Error parsing/appending waste item:", err);
      }
    }
    return initialCartItems;
  };

  // Start a blank delivery order immediately — no fields required
  const startBlankDeliveryOrder = async () => {
    const newOrder = {
      id: 'DEL-' + Date.now(),
      phone: '',
      name: '',
      address: '',
      paymentMethod: 'cod',        // 'cod' | 'online'
      deliveryStatus: 'pending',   // 'pending' | 'preparing' | 'out_for_delivery' | 'delivered'
      startTime: new Date().toISOString(),
      items: [],
    };
    const items = await checkAndAppendPreparedWaste([]);
    newOrder.items = items;

    const updated = [newOrder, ...deliveryOrders];
    await saveDeliveryOrders(updated);
    setSelectedDelivery(newOrder);
    setCartItems(items);
    setActiveOrderId(null);
    setActiveOrderStatus('pending');
    setAdminUnlockRemark('');
    setView('delivery-order');
  };

  const handleDeliveryCardClick = (order) => {
    setSelectedDelivery(order);
    setCartItems(order.items || []);
    setActiveOrderId(null);
    setActiveOrderStatus('pending');
    setAdminUnlockRemark('');
    setView('delivery-order');
  };

  const removeDeliveryOrder = async (id) => {
    const matchedOrder = deliveryOrders.find(o => o.id === id);
    if (!matchedOrder) return;
    if (window.confirm("Are you sure you want to delete this delivery order?")) {
      const updated = deliveryOrders.filter(o => o.id !== id);
      setDeliveryOrders(updated);
      await setOfflineItem('zaiqa_mahal_active_delivery_orders', updated);
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (message, type = 'error') => {
    setToastMessage({ message, type });
  };

  const handleViewBillRequest = (tableNumber) => {
    const targetTable = tables.find(t => t.number === tableNumber);
    if (targetTable) {
      setActiveArea(targetTable.area);
      handleTableClick(targetTable);
      setBillRequestAlert(null);
    }
  };

  const areaTables = tables.filter(t => t.area === activeArea);

  const handleTableClick = async (table) => {
    setSelectedTable(table);
    setCartItems([]);
    setActiveOrderId(null);
    setActiveOrderStatus('pending');
    setAdminUnlockRemark('');
    setView('order');
    setStatusValue(table.status);
    setCustomStatus('');
    setApplyTax(false);
    setApplyServiceCharges(true);
    
    // Reset customer states
    setOrderCustomerName('');
    setOrderCustomerPhone('');
    setOrderCustomerAddress('');
    setOrderCustomerEmail('');
    setOrderRemarks('');

    // Auto-set the time input value if it exists
    if (table.startTime) {
      const d = new Date(table.startTime);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      setTimeValue(`${hh}:${mm}`);
    } else {
      setTimeValue('');
    }

    setSeatsValue(table.seats || 0);

    // ALWAYS Fetch active order just in case it was placed from another device or local state was wiped
    try {
      const res = await fetch(`${API_BASE}/orders/table/${table.number}`);
      let hasLoadedOrder = false;
      if (res.ok) {
        const order = await res.json();
        if (order) {
          hasLoadedOrder = true;
          setActiveOrderId(order.id);
          setActiveOrderStatus(order.status || 'pending');
          setActiveOrderInvoiceNumber(order.invoice_number || null);
          setActiveOrderPaymentStatus(order.payment_status || null);
          setOrderCustomerName(order.customer_name || '');
          setOrderRemarks(order.remarks || '');
          
          if (order.customer_name) {
            try {
              const custRes = await fetch(`${API_BASE}/customers`);
              if (custRes.ok) {
                const allCusts = await custRes.json();
                const matched = allCusts.find(c => c.name.toLowerCase() === order.customer_name.toLowerCase());
                if (matched) {
                  setOrderCustomerPhone(matched.phone || '');
                  setOrderCustomerAddress(matched.address || '');
                  setOrderCustomerEmail(matched.email || '');
                }
              }
            } catch (err) {
              console.error("Failed to load customer phone info:", err);
            }
          }

          // If we found an order but local table was 'available', fix it!
          if (table.status === 'available') {
            setStatusValue('dining');
            const correctTime = order.created_at ? new Date(order.created_at + 'Z').toISOString() : new Date().toISOString();
            setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'dining', startTime: correctTime } : t));
            if (order.created_at) {
              const d = new Date(correctTime);
              setTimeValue(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
            }
          }
          // Map db items back to cart items
          const mappedItems = order.items.map(i => ({
            ...i,
            id: i.item_id || i.id,
            name: i.item_name,
            qty: i.quantity,
            status: i.status,
            created_at: i.created_at,
            sent: true // Mark as already sent to kitchen
          }));
          
          const finalItems = await checkAndAppendPreparedWaste(mappedItems);
          setCartItems(finalItems);

          const hasTax = (order.tax > 0);
          const hasServiceCharges = order.items.some(i => i.item_name === 'Service Charges' || i.name === 'Service Charges');
          setApplyTax(hasTax);
          setApplyServiceCharges(hasServiceCharges);
        }
      }
      if (!hasLoadedOrder) {
        const finalItems = await checkAndAppendPreparedWaste([]);
        setCartItems(finalItems);
        setActiveOrderInvoiceNumber(null);
        setActiveOrderPaymentStatus(null);
      }
    } catch (err) {
      console.error("Failed to fetch active order:", err);
      const finalItems = await checkAndAppendPreparedWaste([]);
      setCartItems(finalItems);
      setActiveOrderInvoiceNumber(null);
      setActiveOrderPaymentStatus(null);
    }
  };

  const [printData, setPrintData] = useState(null);
  const receiptRef = useRef(null);

  const handleBack = () => {
    if (view === 'delivery-order') {
      // Sync cart back to delivery order
      if (selectedDelivery) {
        const updated = deliveryOrders.map(o =>
          o.id === selectedDelivery.id ? { ...o, items: cartItems } : o
        );
        saveDeliveryOrders(updated);
      }
      setSelectedDelivery(null);
      setActiveArea('Delivery');
    }
    setView('floor');
  };

  const handlePrintBill = () => {
    if (!selectedTable || cartItems.length === 0) return;

    const isServiceCharge = (i) => i.name === 'Service Charges' || i.item_name === 'Service Charges';
    const sub = cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxAmt = applyTax ? cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => {
      const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
        ? Number(item.taxRateOverride)
        : globalGstRate;
      return sum + (item.price * item.qty) * (rate / 100);
    }, 0) : 0;
    const tot = sub + taxAmt + (applyServiceCharges ? Number(serviceCharges || 0) : 0);

    const data = {
      table: selectedTable,
      items: cartItems,
      subtotal: sub,
      tax: taxAmt,
      total: tot,
      serviceCharges: applyServiceCharges ? Number(serviceCharges || 0) : 0,
      orderId: activeOrderId,
      invoiceNumber: activeOrderInvoiceNumber || (activeOrderId ? `INV-${activeOrderId}` : null),
      paymentStatus: activeOrderPaymentStatus || 'PENDING',
      date: new Date().toISOString(),
    };

    setPrintData(data);

    // Render receipt off-screen, then trigger browser print (goes to thermal printer)
    setTimeout(() => {
      window.print();
      // Wait 1.2s after printing starts to clear printData, preventing blank captures in Safari/Chrome
      setTimeout(() => {
        setPrintData(null);
      }, 1200);
    }, 300);
  };

  const handleCheckout = () => {
    if (!activeOrderId || !selectedTable) return;
    setIsCheckoutModalOpen(true);
  };

  const executeCheckout = async (customerPhone = '', paymentStatus = 'PAID', shouldClearTable = true) => {
    try {

      // Calculate totals for invoice record
      const isServiceCharge = (i) => i.name === 'Service Charges' || i.item_name === 'Service Charges';
      const sub = cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => sum + item.price * item.qty, 0);
      const taxAmt = applyTax ? cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => {
        const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
          ? Number(item.taxRateOverride)
          : globalGstRate;
        return sum + (item.price * item.qty) * (rate / 100);
      }, 0) : 0;
      const tot = sub + taxAmt + (applyServiceCharges ? Number(serviceCharges || 0) : 0);

      const invoiceId = activeOrderId || String(Date.now()).slice(-6);

      const response = await fetch(`${API_BASE}/orders/${activeOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', checkout: true, payment_status: paymentStatus, release_table: shouldClearTable })
      });

      let serverInvoiceNum = activeOrderInvoiceNumber || `INV-${invoiceId}`;
      if (response.ok) {
        const resData = await response.json();
        if (resData.invoice_number) {
          serverInvoiceNum = resData.invoice_number;
        }
      }

      const newInvoice = {
        orderId: invoiceId,
        customerPhone: customerPhone.trim() || 'N/A',
        table: selectedTable?.number || 'N/A',
        items: cartItems.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
        subtotal: sub,
        tax: taxAmt,
        serviceCharges: applyServiceCharges ? Number(serviceCharges || 0) : 0,
        total: tot,
        paymentStatus: paymentStatus,
        invoiceNumber: serverInvoiceNum,
        date: new Date().toISOString()
      };

      // Save to IndexedDB registry immediately (robust offline storage)
      const prevInvoices = await getOfflineItem('zaiqa_mahal_completed_invoices', []);
      const updatedInvoices = [newInvoice, ...prevInvoices];
      await setOfflineItem('zaiqa_mahal_completed_invoices', updatedInvoices);
      setCompletedInvoices(updatedInvoices);

      // Auto-trigger printing of invoice upon checkout
      const printDataObj = {
        table: selectedTable,
        items: cartItems,
        subtotal: sub,
        tax: taxAmt,
        total: tot,
        serviceCharges: applyServiceCharges ? Number(serviceCharges || 0) : 0,
        orderId: activeOrderId,
        invoiceNumber: serverInvoiceNum,
        paymentStatus: paymentStatus,
        date: new Date().toISOString(),
      };
      setPrintData(printDataObj);
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setPrintData(null);
        }, 1200);
      }, 300);

      if (response.ok) {
        // Clear local table state conditionally
        let updatedTable;
        if (shouldClearTable) {
          updatedTable = { ...selectedTable, status: 'available' };
          delete updatedTable.startTime;
          // Persist available status to DB so poll doesn't revert
          fetch(`${API_BASE}/tables/${selectedTable.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'available' }),
          }).catch(() => {});
        } else {
          updatedTable = { ...selectedTable, status: 'dining' };
          delete updatedTable.startTime;
          // Table stays occupied but clear startTime so border stops blinking
          fetch(`${API_BASE}/tables/${selectedTable.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'dining' }),
          }).catch(() => {});
        }

        setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
        setSelectedTable(null);
        setCartItems([]);
        setActiveOrderId(null);
        setActiveOrderPaymentStatus(null);
        setView('floor');
        // Do NOT call handleTableClick here — it re-fetches old order and restores startTime
        setIsCheckoutModalOpen(false);
      } else {
        // Offline checkout fallback
        let updatedTable;
        if (shouldClearTable) {
          updatedTable = { ...selectedTable, status: 'available' };
          delete updatedTable.startTime;
        } else {
          updatedTable = { ...selectedTable, status: 'dining' };
          delete updatedTable.startTime;
        }
        setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
        setSelectedTable(null);
        setCartItems([]);
        setActiveOrderId(null);
        setActiveOrderPaymentStatus(null);
        setView('floor');
        setIsCheckoutModalOpen(false);
        showToast('Checkout completed (offline mode).', 'success');
      }
    } catch (err) {
      console.error("Checkout error:", err);
      // Offline fallback
      let updatedTable;
      if (shouldClearTable) {
        updatedTable = { ...selectedTable, status: 'available' };
        delete updatedTable.startTime;
      } else {
        updatedTable = { ...selectedTable, status: 'dining' };
        delete updatedTable.startTime;
      }
      setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
      setSelectedTable(null);
      setCartItems([]);
      setActiveOrderId(null);
      setActiveOrderPaymentStatus(null);
      setView('floor');
      setIsCheckoutModalOpen(false);
      showToast('Checkout completed successfully (Local Registry).', 'success');
    }
  };

  const saveTableEdits = async () => {
    if (!selectedTable) return;

    let finalStatus = selectedTable.status;
    if (editingStatus) {
      finalStatus = statusValue === 'other' ? customStatus : statusValue;
    } else if (selectedTable.status === 'available' && timeValue) {
      finalStatus = 'dining';
    }

    const updatedTable = {
      ...selectedTable,
      status: finalStatus,
      seats: seatsValue,
    };

    if (timeValue) {
      const [hours, mins] = timeValue.split(':');
      const d = new Date();
      d.setHours(parseInt(hours), parseInt(mins), 0, 0);
      updatedTable.startTime = d.toISOString();
    } else if ((finalStatus === 'dining' || finalStatus === 'reserved') && !selectedTable.startTime) {
      updatedTable.startTime = new Date().toISOString();
    } else if (finalStatus === 'available') {
      delete updatedTable.startTime;
    }

    // Update local state immediately
    setTables(tables.map(t => t.id === selectedTable.id ? updatedTable : t));
    setSelectedTable(updatedTable);

    setEditingTime(false);
    setEditingSeats(false);
    setEditingStatus(false);

    // Persist status & seats to server so polling doesn't revert the change
    try {
      await fetch(`${API_BASE}/tables/${selectedTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: finalStatus, seats: seatsValue }),
      });
      showToast(`Table ${selectedTable.number} updated to ${finalStatus}`, 'success');
    } catch (err) {
      console.warn('Could not save table edits to server (offline?):', err);
    }
  };

  const handleSendToKitchen = async () => {
    if (cartItems.length === 0) return;

    const newItems = cartItems.filter(item => !item.sent);
    if (newItems.length === 0) {
      showToast("All items have already been sent to the kitchen!", "info");
      return;
    }

    const isServiceCharge = (i) => i.name === 'Service Charges' || i.item_name === 'Service Charges';
    const subtotal = cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = applyTax ? cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => {
      const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
        ? Number(item.taxRateOverride)
        : globalGstRate;
      return sum + (item.price * item.qty) * (rate / 100);
    }, 0) : 0;
    const total = subtotal + tax + (applyServiceCharges ? Number(serviceCharges || 0) : 0);

    if (view === 'delivery-order') {
      saveCustomerToDirectory();
      let bId = selectedDelivery.backendOrderId;

      try {
        if (bId) {
          const response = await fetch(`${API_BASE}/orders/${bId}/sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, isFromPreparedWaste: i.isFromPreparedWaste || false })),
              subtotal,
              tax,
              total_amount: total,
              remarks: selectedDelivery.remarks || `Delivery Order - Phone: ${selectedDelivery.phone || 'N/A'}, Address: ${selectedDelivery.address || 'N/A'}`
            })
          });
          if (!response.ok) throw new Error('Failed to update order');
        } else {
          const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table_number: selectedDelivery.id,
              area: 'Delivery',
              customer_name: selectedDelivery.name || 'Delivery Guest',
              remarks: selectedDelivery.remarks || `Delivery Order - Phone: ${selectedDelivery.phone || 'N/A'}, Address: ${selectedDelivery.address || 'N/A'}`,
              items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, isFromPreparedWaste: i.isFromPreparedWaste || false })),
              subtotal,
              tax,
              total_amount: total,
              created_by: currentUser?.username || 'admin'
            })
          });
          if (!response.ok) throw new Error('Failed to place order');
          const resData = await response.json();
          bId = resData.orderId;
        }

        const updatedItems = cartItems.map(item => ({ ...item, sent: true }));
        setCartItems(updatedItems);
        
        const updatedOrder = { ...selectedDelivery, items: updatedItems, status: 'active', backendOrderId: bId };
        setSelectedDelivery(updatedOrder);

        const updated = deliveryOrders.map(o =>
          o.id === selectedDelivery.id ? updatedOrder : o
        );
        saveDeliveryOrders(updated);
        showToast('Order successfully sent to kitchen & saved!', 'success');
      } catch (err) {
        console.error("Failed to sync delivery order with KDS:", err);
        showToast('Error sending order. Please check connection.', 'error');
      }
    } else {
      const orderData = {
        subtotal,
        tax,
        total,
        remarks: orderRemarks,
        customerName: orderCustomerName || 'Walk-in Customer'
      };
      
      if (activeOrderId && newItems.length === 0 && !orderRemarks && !adminUnlockRemark) {
        showToast("No changes to save! Please add an item or provide a remark.", "error");
        return;
      }

      setConfirmStatus('dining');
      setOrderConfirmData(orderData);
    }
  };

  const handlePlaceOrder = (orderData) => {
    if (cartItems.length === 0) return;

    const newItems = cartItems.filter(item => !item.sent);

    // If order exists, and we have NO new items, AND NO remarks, AND NO admin override (meaning we didn't edit/delete any old item)
    if (activeOrderId && newItems.length === 0 && !orderData.remarks && !adminUnlockRemark) {
      showToast("No changes to save! Please add an item or provide a remark.", "error");
      return;
    }

    setConfirmStatus('dining'); // Reset default
    // Trigger modal instead of directly placing
    setOrderConfirmData(orderData);
  };

  const executePlaceOrder = async () => {
    if (!orderConfirmData) return;
    const orderData = orderConfirmData;

    const newItems = cartItems.filter(item => !item.sent);

    // Automatically set table to chosen status and start timer if it was available
    let updatedTable = { ...selectedTable };
    if (updatedTable.status === 'available') {
      updatedTable.status = confirmStatus;
      if (!updatedTable.startTime) {
        updatedTable.startTime = new Date().toISOString();
      }
      setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
      setSelectedTable(updatedTable);
    }

    try {
      if (activeOrderId) {
        // Full Cart Sync (Add/Edit/Delete)
        const response = await fetch(`${API_BASE}/orders/${activeOrderId}/sync`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            subtotal: orderData.subtotal,
            tax: orderData.tax,
            total_amount: orderData.total,
            remarks: orderData.remarks,
            admin_edit_remark: adminUnlockRemark
          })
        });

        if (!response.ok) throw new Error('Failed to update order');
      } else {
        // Creating a brand new order
        const response = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: selectedTable.number,
            area: selectedTable.area || 'Main',
            customer_name: orderCustomerName || orderData.customerName || 'Walk-in Customer',
            remarks: orderData.remarks,
            items: cartItems,
            subtotal: orderData.subtotal,
            tax: orderData.tax,
            total_amount: orderData.total,
            created_by: currentUser?.username || 'admin'
          })
        });

        if (!response.ok) throw new Error('Failed to place order');
        const data = await response.json();
        setActiveOrderId(data.orderId);
      }

      // Mark all current cart items as sent so they stay on screen but can't be re-sent
      setCartItems(cartItems.map(item => ({ ...item, sent: true })));
      setOrderConfirmData(null); // Close modal on success
      setAdminUnlockRemark(''); // Reset admin unlock
    } catch (err) {
      console.error(err);
      showToast('Error placing order. Please check backend connection.');
    }
  };

  const addToCart = (item, qty = 1) => {
    setCartItems(prev => {
      const existingUnsent = prev.find(i => i.id === item.id && !i.sent);
      if (existingUnsent) {
        return prev.map(i => (i.id === item.id && !i.sent) ? { ...i, qty: i.qty + qty } : i);
      }
      // Give it a unique Cart ID if it's a new row for an already sent item
      const cartId = item.id + '-' + Date.now();
      return [...prev, { ...item, cartId: cartId, qty: qty, sent: false }];
    });
  };

  useEffect(() => {
    const checkWasteSell = async () => {
      try {
        const stored = localStorage.getItem('zaiqa_mahal_pending_waste_sell');
        const storedTarget = localStorage.getItem('zaiqa_mahal_pending_waste_sell_target');
        
        if (stored) {
          localStorage.setItem('zaiqa_mahal_pending_waste_sell_temp', stored);
          localStorage.removeItem('zaiqa_mahal_pending_waste_sell');
          
          if (storedTarget) {
            localStorage.removeItem('zaiqa_mahal_pending_waste_sell_target');
            const target = JSON.parse(storedTarget);
            if (target.type === 'table') {
              const tbl = tables.find(t => t.table_number === target.tableNumber || t.number === target.tableNumber);
              if (tbl) {
                handleTableClick(tbl);
              }
            } else if (target.type === 'new') {
              startBlankDeliveryOrder();
            }
          }
        }
      } catch (err) {
        console.error("Error checking prepared waste sell:", err);
      }
    };
    checkWasteSell();
  }, [view, tables]);

  const updateQty = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.cartId === id || item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.cartId !== id && item.id !== id));
  };

  // Phone lookup: when phone changes, check directory and auto-fill
  const handlePhoneChange = async (phone) => {
    updateDeliveryField('phone', phone);
    
    if (phone.length >= 3) {
      const localCustomers = await getOfflineItem('zaiqa_mahal_delivery_customers', []);
      const combined = [...allDBCustomers, ...localCustomers];
      
      const unique = [];
      const seen = new Set();
      combined.forEach(c => {
        if (c.phone && !seen.has(c.phone)) {
          seen.add(c.phone);
          unique.push(c);
        }
      });

      const matched = unique.filter(c => c.phone.includes(phone) || phone.includes(c.phone));
      setSuggestedDeliveryCustomers(matched.slice(0, 5));

      const exactMatch = unique.find(c => c.phone === phone);
      if (exactMatch) {
        const updated = { 
          ...selectedDelivery, 
          phone, 
          name: exactMatch.name || '', 
          address: exactMatch.address || '' 
        };
        setSelectedDelivery(updated);
        const updatedOrders = deliveryOrders.map(o => o.id === updated.id ? updated : o);
        saveDeliveryOrders(updatedOrders);
        setSuggestedDeliveryCustomers([]);
      }
    } else {
      setSuggestedDeliveryCustomers([]);
    }
  };

  // Inline edit helpers — update selectedDelivery state + sync to localStorage
  const updateDeliveryField = async (field, value) => {
    if (!selectedDelivery) return;
    const updated = { ...selectedDelivery, [field]: value };
    setSelectedDelivery(updated);
    const updatedOrders = deliveryOrders.map(o => o.id === updated.id ? updated : o);
    saveDeliveryOrders(updatedOrders);

    // Outbound KDS sync: If updating deliveryStatus and backendOrderId exists, patch it to SQLite!
    if (field === 'deliveryStatus' && updated.backendOrderId) {
      let dbStatus = 'pending';
      if (value === 'preparing') dbStatus = 'preparing';
      else if (value === 'out_for_delivery') dbStatus = 'ready';
      else if (value === 'delivered') dbStatus = 'completed';

      try {
        await fetch(`${API_BASE}/orders/${updated.backendOrderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: dbStatus })
        });
      } catch (err) {
        console.error("Failed to sync status change to backend order:", err);
      }
    }
  };

  // Save customer to delivery directory when placing order
  const saveCustomerToDirectory = async () => {
    if (!selectedDelivery || !selectedDelivery.phone) return;
    const customers = await getOfflineItem('zaiqa_mahal_delivery_customers', []);
    const existingIdx = customers.findIndex(c => c.phone === selectedDelivery.phone);
    let targetCustomer = null;
    if (existingIdx >= 0) {
      // Update name/address if provided
      if (selectedDelivery.name) customers[existingIdx].name = selectedDelivery.name;
      if (selectedDelivery.address) customers[existingIdx].address = selectedDelivery.address;
      targetCustomer = customers[existingIdx];
    } else {
      targetCustomer = {
        phone: selectedDelivery.phone,
        name: selectedDelivery.name || 'Delivery Guest',
        address: selectedDelivery.address || '',
        ordersCount: 0,
      };
      customers.unshift(targetCustomer);
    }
    await setOfflineItem('zaiqa_mahal_delivery_customers', customers);

    // Sync with central database SQLite
    try {
      const isExistingInDB = allDBCustomers.some(c => c.phone === selectedDelivery.phone);
      if (isExistingInDB) {
        const dbCust = allDBCustomers.find(c => c.phone === selectedDelivery.phone);
        await fetch(`${API_BASE}/customers/${dbCust.id || dbCust.phone}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: targetCustomer.name,
            phone: targetCustomer.phone,
            address: targetCustomer.address
          })
        });
      } else {
        await fetch(`${API_BASE}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: targetCustomer.name,
            phone: targetCustomer.phone,
            address: targetCustomer.address,
            type: 'Client',
            balance: 0
          })
        });
      }
      
      // Reload customer database list
      fetch(`${API_BASE}/customers`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAllDBCustomers(data))
        .catch(() => {});
    } catch (e) {
      console.warn("Failed to sync customer details to SQLite central registry", e);
    }
  };

  const handleDeliveryCheckout = async (customerPhone = '') => {
    if (!selectedDelivery) return;
    const isServiceCharge = (i) => i.name === 'Service Charges' || i.item_name === 'Service Charges';
    const sub = cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxAmt = applyTax ? cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => {
      const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
        ? Number(item.taxRateOverride)
        : globalGstRate;
      return sum + (item.price * item.qty) * (rate / 100);
    }, 0) : 0;
    const tot = sub + taxAmt + (applyServiceCharges ? Number(serviceCharges || 0) : 0);
    const invoiceId = 'DEL-' + String(Date.now()).slice(-6);

    const newInvoice = {
      orderId: invoiceId,
      customerPhone: selectedDelivery.phone || 'N/A',
      customerName: selectedDelivery.name || 'Delivery Guest',
      deliveryAddress: selectedDelivery.address || 'N/A',
      paymentMethod: selectedDelivery.paymentMethod || 'cod',
      deliveryStatus: selectedDelivery.deliveryStatus || 'delivered',
      table: 'Delivery',
      items: cartItems.map(i => ({ name: i.name, price: i.price, qty: i.qty, taxRateOverride: i.taxRateOverride })),
      subtotal: sub,
      tax: taxAmt,
      total: tot,
      date: new Date().toISOString()
    };

    // Sync with backend API to automatically trigger ingredient and stock deduction in SQLite
    try {
      const bId = selectedDelivery.backendOrderId;
      if (bId) {
        // If already synced, mark the KDS active order as completed (deletes from active list)
        await fetch(`${API_BASE}/orders/${bId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
      } else {
        // If checked out immediately without sending to KDS first, create completed order to deduct stock
        await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: 'Delivery',
            area: 'Delivery',
            customer_name: selectedDelivery.name || 'Delivery Guest',
            remarks: `Delivery Order (Immediate Checkout) - Phone: ${selectedDelivery.phone || 'N/A'}, Address: ${selectedDelivery.address || 'N/A'}`,
            items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
            subtotal: sub,
            tax: taxAmt,
            total_amount: tot,
            created_by: currentUser?.username || 'admin'
          })
        });
      }
    } catch (err) {
      console.error("Failed to complete order on backend:", err);
    }

    const prevInvoices = await getOfflineItem('zaiqa_mahal_completed_invoices', []);
    await setOfflineItem('zaiqa_mahal_completed_invoices', [newInvoice, ...prevInvoices]);

    // Update delivery customer order count
    const customers = await getOfflineItem('zaiqa_mahal_delivery_customers', []);
    const updatedCustomers = customers.map(c =>
      c.phone === selectedDelivery.phone ? { ...c, ordersCount: (c.ordersCount || 0) + 1 } : c
    );
    await setOfflineItem('zaiqa_mahal_delivery_customers', updatedCustomers);

    // Remove delivery order from active list
    removeDeliveryOrder(selectedDelivery.id);
    setSelectedDelivery(null);
    setCartItems([]);
    setActiveArea('Delivery');
    setView('floor');
    setIsCheckoutModalOpen(false);
    showToast('Delivery bill completed!', 'success');
  };

  const handleDeliveryPrint = () => {
    if (!selectedDelivery || cartItems.length === 0) return;
    const isServiceCharge = (i) => i.name === 'Service Charges' || i.item_name === 'Service Charges';
    const sub = cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxAmt = applyTax ? cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => {
      const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
        ? Number(item.taxRateOverride)
        : globalGstRate;
      return sum + (item.price * item.qty) * (rate / 100);
    }, 0) : 0;
    const tot = sub + taxAmt + (applyServiceCharges ? Number(serviceCharges || 0) : 0);
    const fakeTable = { number: selectedDelivery.id, area: 'Delivery' };
    setPrintData({
      table: fakeTable,
      items: cartItems,
      subtotal: sub,
      tax: taxAmt,
      total: tot,
      serviceCharges: applyServiceCharges ? Number(serviceCharges || 0) : 0,
      orderId: selectedDelivery.id,
      date: new Date().toISOString(),
    });
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintData(null);
      }, 1200);
    }, 300);
  };

  // ── Delivery Order View ──────────────────────────────────────────────
  if (view === 'delivery-order' && selectedDelivery) {

    return (
      <div className="flex flex-col h-full bg-[#f8f9fc] p-2 lg:p-4 gap-3 lg:gap-4">
        {/* Delivery Order Header */}
        <div className="bg-zinc-950/90 backdrop-blur-xl p-4 rounded-3xl border border-zinc-800/80 flex flex-wrap items-center justify-between shrink-0 gap-4 z-20 relative shadow-2xl">

          {/* Left: Back button + Info */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-orange-500 hover:text-white rounded-full text-zinc-400 transition-all shadow-md border border-zinc-800"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-extrabold tracking-widest uppercase leading-none">Home Delivery</span>
              <span className="text-[11px] text-orange-400 font-black leading-none mt-1">
                {selectedDelivery.startTime ? new Date(selectedDelivery.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Session'}
              </span>
            </div>
          </div>

          {/* Middle: Sleek, Modular CRM Action Buttons */}
          <div className="flex items-center gap-3.5 flex-1 flex-wrap min-w-0">
            
             {/* 1. Customer Info Dropdown */}
            <div className="relative delivery-crm-container">
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryCustModal(!showDeliveryCustModal);
                  setShowPaymentDropdown(false);
                  setShowStatusDropdown(false);
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-800 rounded-2xl transition-all text-xs font-black uppercase tracking-wider group relative"
              >
                <div className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <Users size={12} />
                </div>
                <span className="max-w-[200px] truncate">
                  {selectedDelivery.name 
                    ? `${selectedDelivery.name} (${selectedDelivery.phone || 'No Phone'})` 
                    : selectedDelivery.phone 
                      ? selectedDelivery.phone 
                      : 'Set Customer Details'}
                </span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${showDeliveryCustModal ? 'rotate-180 text-orange-500' : 'text-zinc-500'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
 
              {showDeliveryCustModal && (
                <>
                  <div className="absolute left-0 mt-2.5 w-80 bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-5 z-40 transform origin-top-left animate-dropdownScale flex flex-col gap-4">
                    <style>{`
                      @keyframes dropdownScale {
                        0% { transform: scale(0.95); opacity: 0; filter: blur(4px); }
                        100% { transform: scale(1); opacity: 1; filter: blur(0px); }
                      }
                      .animate-dropdownScale {
                        animation: dropdownScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      }
                    `}</style>
                    <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Customer CRM Details</h4>
                    
                    {/* Phone field */}
                    <div className="flex flex-col gap-1.5 relative">
                      <span className="text-[8px] font-black text-zinc-400 tracking-widest uppercase">Customer Phone</span>
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 focus-within:border-orange-500/80 px-3 py-2 rounded-xl transition-all">
                        <Phone size={13} className="text-orange-400 shrink-0" />
                        <input
                          type="text"
                          value={selectedDelivery.phone}
                          onChange={e => handlePhoneChange(e.target.value)}
                          placeholder="Enter Phone..."
                          className="text-xs font-bold text-white bg-transparent border-none outline-none placeholder-zinc-600 w-full"
                        />
                      </div>

                      {/* Matching suggestions dropdown */}
                      {suggestedDeliveryCustomers.length > 0 && (
                        <div className="absolute left-0 right-0 top-[100%] mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-36 overflow-y-auto flex flex-col p-1 gap-0.5">
                          {suggestedDeliveryCustomers.map(cust => (
                            <button
                              type="button"
                              key={cust.id || cust.phone}
                              onClick={() => {
                                const updated = { 
                                  ...selectedDelivery, 
                                  phone: cust.phone || '', 
                                  name: cust.name || '', 
                                  address: cust.address || '' 
                                };
                                setSelectedDelivery(updated);
                                const updatedOrders = deliveryOrders.map(o => o.id === updated.id ? updated : o);
                                saveDeliveryOrders(updatedOrders);
                                setSuggestedDeliveryCustomers([]);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg transition-all flex flex-col"
                            >
                              <span className="text-[10px] font-black text-white">{cust.name}</span>
                              <span className="text-[8px] text-orange-400 font-bold font-mono mt-0.5">{cust.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-zinc-400 tracking-widest uppercase">Customer Name</span>
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 focus-within:border-orange-500/80 px-3 py-2 rounded-xl transition-all">
                        <Users size={13} className="text-zinc-500 shrink-0" />
                        <input
                          type="text"
                          value={selectedDelivery.name}
                          onChange={e => updateDeliveryField('name', e.target.value)}
                          placeholder="Enter Name..."
                          className="text-xs font-bold text-white bg-transparent border-none outline-none placeholder-zinc-600 w-full"
                        />
                      </div>
                    </div>

                    {/* Address field */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-zinc-400 tracking-widest uppercase">Delivery Address</span>
                      <div className="flex items-start gap-2 bg-zinc-900 border border-zinc-800 focus-within:border-blue-500/80 px-3 py-2 rounded-xl transition-all w-full">
                        <MapPin size={13} className="text-blue-400 shrink-0 mt-0.5" />
                        <textarea
                          rows="2"
                          value={selectedDelivery.address}
                          onChange={e => updateDeliveryField('address', e.target.value)}
                          placeholder="Enter detailed delivery address..."
                          className="text-xs font-bold text-white bg-transparent border-none outline-none placeholder-zinc-600 w-full resize-none custom-scrollbar"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

             {/* 2. Payment Dropdown */}
            <div className="relative delivery-payment-container">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentDropdown(!showPaymentDropdown);
                  setShowDeliveryCustModal(false);
                  setShowStatusDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-800 rounded-2xl transition-all text-xs font-black uppercase tracking-wider group text-gray-200"
              >
                <span>
                  {(selectedDelivery.paymentMethod || 'cod') === 'online' ? '📱 Online' : '💵 COD'}
                </span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${showPaymentDropdown ? 'rotate-180 text-orange-500' : 'text-zinc-500'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPaymentDropdown && (
                <>
                  <div className="absolute left-0 mt-2.5 w-40 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-40 transform origin-top-left animate-dropdownScale flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateDeliveryField('paymentMethod', 'cod');
                        setShowPaymentDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-between ${
                        (selectedDelivery.paymentMethod || 'cod') === 'cod'
                          ? 'bg-zinc-900 text-amber-500 border border-zinc-800'
                          : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                      }`}
                    >
                      💵 COD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateDeliveryField('paymentMethod', 'online');
                        setShowPaymentDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-between ${
                        selectedDelivery.paymentMethod === 'online'
                          ? 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                          : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                      }`}
                    >
                      📱 Online
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 3. Delivery Status Dropdown */}
            {(() => {
              const current = selectedDelivery.deliveryStatus || 'pending';
              const statusConfig = {
                pending: { label: 'Pending', active: 'bg-zinc-900 text-zinc-400 border-zinc-800' },
                preparing: { label: 'Preparing', active: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                out_for_delivery: { label: 'On the Way', active: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                delivered: { label: 'Delivered', active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
              };
              const activeStyle = statusConfig[current] || statusConfig.pending;

              return (
                 <div className="relative delivery-status-container">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatusDropdown(!showStatusDropdown);
                      setShowDeliveryCustModal(false);
                      setShowPaymentDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all text-xs font-black uppercase tracking-wider border shadow-md ${activeStyle.active}`}
                  >
                    <span>🛵 Status: {activeStyle.label}</span>
                    <svg 
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${showStatusDropdown ? 'rotate-180' : 'opacity-70'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showStatusDropdown && (
                    <>
                      <div className="absolute left-0 mt-2.5 w-44 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-40 transform origin-top-left animate-dropdownScale flex flex-col gap-1">
                        {[
                          { key: 'pending', label: 'Pending', theme: 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white' },
                          { key: 'preparing', label: 'Preparing', theme: 'text-orange-400 hover:bg-orange-950/20 hover:text-orange-300' },
                          { key: 'out_for_delivery', label: 'On the Way', theme: 'text-blue-400 hover:bg-blue-950/20 hover:text-blue-300' },
                          { key: 'delivered', label: 'Delivered', theme: 'text-emerald-400 hover:bg-emerald-950/20 hover:text-emerald-300' },
                        ].map(s => {
                          const isSelected = current === s.key;
                          return (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => {
                                updateDeliveryField('deliveryStatus', s.key);
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                                isSelected
                                  ? 'bg-zinc-900 border border-zinc-800 text-white'
                                  : s.theme
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right: Active Timer + Checkout Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase leading-none">Session Clock</span>
              <div className="flex items-center gap-2 bg-zinc-900 text-orange-400 px-3.5 py-1.5 rounded-xl border border-zinc-800 shadow-sm mt-0.5">
                <Clock size={14} className="text-orange-400/80" />
                <span className="text-xs font-black tracking-widest font-mono text-white">
                  <TableTimer startTime={selectedDelivery.startTime} />
                </span>
              </div>
            </div>

            {cartItems.length > 0 && (
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="text-[8px] font-black text-transparent tracking-widest uppercase leading-none">.</span>
                <button
                  onClick={() => setIsCheckoutModalOpen(true)}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 hover:bg-emerald-600 transition-colors"
                >
                  <CheckCircle size={15} /> Checkout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Menu & Cart */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 overflow-hidden z-10">
          <div className="flex-[2.5] bg-white rounded-2xl shadow-sm border border-gray-200/60 flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden relative">
            <Menu onAddToCart={addToCart} disabled={false} showToast={showToast} />
          </div>
          <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200/60 flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden relative">
            <Cart
              table={{ number: selectedDelivery.id, area: 'Delivery' }}
              items={cartItems}
              onUpdateQty={updateQty}
              onRemove={removeItem}
              onContinueToBill={() => setView('billing')}
              onSendToKitchen={handleSendToKitchen}
              activeOrderStatus={'pending'}
              adminUnlockRemark={adminUnlockRemark}
              onAdminUnlock={(remark) => setAdminUnlockRemark(remark)}
              currentUser={currentUser}
            />
          </div>
        </div>

        {/* Checkout Modal */}
        <CheckoutConfirmationModal
          isCheckoutModalOpen={isCheckoutModalOpen}
          setIsCheckoutModalOpen={setIsCheckoutModalOpen}
          executeCheckout={handleDeliveryCheckout}
          selectedTable={{ number: selectedDelivery.id, area: 'Delivery' }}
        />

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-slideUp">
            <AlertCircle size={18} className={toastMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'} />
            <span className="font-bold text-sm tracking-wide">{toastMessage.message}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
          </div>
        )}

        {printData && createPortal(
          <div ref={receiptRef} className="receipt-print-wrapper" style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}>
            <ReceiptSlip printData={printData} />
          </div>,
          document.body
        )}
      </div>
    );
  }

  if (view === 'billing') {
    const isDelivery = !selectedTable;
    const currentTitle = isDelivery ? `Delivery Session ${selectedDelivery?.id}` : `Dine-in Table ${selectedTable?.number}`;
    const isServiceCharge = (i) => i.name === 'Service Charges' || i.item_name === 'Service Charges';
    const subtotal = cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = applyTax ? cartItems.filter(i => !isServiceCharge(i)).reduce((sum, item) => {
      const rate = (item.taxRateOverride !== undefined && item.taxRateOverride !== null && item.taxRateOverride !== '')
        ? Number(item.taxRateOverride)
        : globalGstRate;
      return sum + (item.price * item.qty) * (rate / 100);
    }, 0) : 0;
    const total = subtotal + tax + (applyServiceCharges ? Number(serviceCharges || 0) : 0);

    // Direct place/save handler for Dine-in Table
    const handleDineInSave = async () => {
      let updatedTable = { ...selectedTable };
      if (updatedTable.status === 'available') {
        updatedTable.status = 'dining';
        if (!updatedTable.startTime) {
          updatedTable.startTime = new Date().toISOString();
        }
        setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
        setSelectedTable(updatedTable);
      }

      try {
        if (activeOrderId) {
          const response = await fetch(`${API_BASE}/orders/${activeOrderId}/sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cartItems,
              subtotal: subtotal,
              tax: tax,
              total_amount: total,
              remarks: orderRemarks,
              admin_edit_remark: adminUnlockRemark
            })
          });
          if (!response.ok) throw new Error('Failed to update order');
        } else {
          const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table_number: selectedTable.number,
              area: selectedTable.area || 'Main',
              customer_name: orderCustomerName || 'Walk-in Customer',
              remarks: orderRemarks,
              items: cartItems,
              subtotal: subtotal,
              tax: tax,
              total_amount: total,
              created_by: currentUser?.username || 'admin'
            })
          });
          if (!response.ok) throw new Error('Failed to place order');
          const data = await response.json();
          setActiveOrderId(data.orderId);
        }

        setCartItems(cartItems.map(item => ({ ...item, sent: true })));
        setAdminUnlockRemark('');
        showToast('Order successfully sent to kitchen & saved!', 'success');
        setView('order');
      } catch (err) {
        console.error(err);
        showToast('Error placing order. Please check connection.');
      }
    };

    // Direct place/save handler for Delivery
    const handleDeliverySave = async () => {
      saveCustomerToDirectory();
      let bId = selectedDelivery.backendOrderId;

      try {
        if (bId) {
          await fetch(`${API_BASE}/orders/${bId}/sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, isFromPreparedWaste: i.isFromPreparedWaste || false })),
              subtotal: subtotal,
              tax: tax,
              total_amount: total,
              remarks: selectedDelivery.remarks || `Delivery Order - Phone: ${selectedDelivery.phone || 'N/A'}, Address: ${selectedDelivery.address || 'N/A'}`
            })
          });
        } else {
          const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table_number: selectedDelivery.id,
              area: 'Delivery',
              customer_name: selectedDelivery.name || 'Delivery Guest',
              remarks: selectedDelivery.remarks || `Delivery Order - Phone: ${selectedDelivery.phone || 'N/A'}, Address: ${selectedDelivery.address || 'N/A'}`,
              items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, isFromPreparedWaste: i.isFromPreparedWaste || false })),
              subtotal: subtotal,
              tax: tax,
              total_amount: total,
              created_by: currentUser?.username || 'admin'
            })
          });
          if (response.ok) {
            const resData = await response.json();
            bId = resData.orderId;
          }
        }
      } catch (err) {
        console.error("Failed to sync delivery order with KDS/Inventory:", err);
      }

      const updatedOrder = { ...selectedDelivery, items: cartItems, status: 'active', backendOrderId: bId };
      setSelectedDelivery(updatedOrder);

      const updated = deliveryOrders.map(o =>
        o.id === selectedDelivery.id ? updatedOrder : o
      );
      saveDeliveryOrders(updated);
      showToast('Delivery order saved & synced successfully!', 'success');
      setView('delivery-order');
    };

    return (
      <div className="flex flex-col h-full bg-[#f8f9fc] p-3 lg:p-6 gap-4 lg:gap-6 overflow-hidden">
        
        {/* Sleek Premium Billing Header */}
        <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView(isDelivery ? 'delivery-order' : 'order')}
              className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-zinc-950 hover:text-orange-400 text-gray-500 rounded-full transition-all border border-gray-100 shadow-sm"
              title="Back to Register"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none block">Checkout Registry</span>
              <h2 className="text-lg font-display font-black text-gray-900 leading-none mt-1">{currentTitle}</h2>
            </div>
          </div>
          <button
            onClick={() => setView(isDelivery ? 'delivery-order' : 'order')}
            className="px-4 py-2 bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all font-bold text-xs rounded-xl flex items-center gap-1.5 border border-gray-200"
          >
            <Plus size={14} /> Add New Items
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 lg:gap-6 min-h-0 overflow-y-auto custom-scrollbar">
          
          {/* Left Side: Customer & Billing Profile Input Panel */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-md p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users size={16} className="text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">Customer & Billing Details</h3>
              </div>

              {/* Autocomplete Phone Section */}
              <div className="relative phone-lookup-container">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Customer Phone Number</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 rounded-xl px-3 py-2.5 transition-all">
                  <Phone size={14} className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={isDelivery ? (selectedDelivery?.phone || '') : orderCustomerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isDelivery) {
                        handlePhoneChange(val);
                      } else {
                        setOrderCustomerPhone(val);
                        if (val.length >= 3) {
                          const matched = allDBCustomers.filter(c => c.phone.includes(val));
                          setSuggestedCustomers(matched.slice(0, 5));
                        } else {
                          setSuggestedCustomers([]);
                        }
                      }
                    }}
                    placeholder="Enter phone number..."
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400"
                  />
                </div>

                {/* Autocomplete dropdown for Dine-in */}
                {!isDelivery && suggestedCustomers.length > 0 && (
                  <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto">
                    {suggestedCustomers.map(cust => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setOrderCustomerName(cust.name || '');
                          setOrderCustomerPhone(cust.phone || '');
                          setOrderCustomerAddress(cust.address || '');
                          setOrderCustomerEmail(cust.email || '');
                          setSuggestedCustomers([]);
                        }}
                        className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-none transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-800">{cust.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold mt-0.5">{cust.phone}</span>
                        </div>
                        {cust.address && <span className="text-[9px] px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-500 truncate max-w-[120px]">{cust.address}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Autocomplete dropdown for Delivery */}
                {isDelivery && suggestedDeliveryCustomers.length > 0 && (
                  <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto">
                    {suggestedDeliveryCustomers.map(cust => (
                      <div
                        key={cust.id || cust.phone}
                        onClick={() => {
                          updateDeliveryField('phone', cust.phone || '');
                          updateDeliveryField('name', cust.name || '');
                          updateDeliveryField('address', cust.address || '');
                          setSuggestedDeliveryCustomers([]);
                        }}
                        className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-none transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-800">{cust.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold mt-0.5">{cust.phone}</span>
                        </div>
                        {cust.address && <span className="text-[9px] px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-500 truncate max-w-[120px]">{cust.address}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Customer Name (Optional)</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 rounded-xl px-3 py-2.5 transition-all">
                  <Users size={14} className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={isDelivery ? (selectedDelivery?.name || '') : orderCustomerName}
                    onChange={(e) => {
                      if (isDelivery) {
                        updateDeliveryField('name', e.target.value);
                      } else {
                        setOrderCustomerName(e.target.value);
                      }
                    }}
                    placeholder="Enter customer name..."
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Delivery Specific Fields */}
              {isDelivery && (
                <>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Delivery Address</label>
                    <div className="flex items-start bg-gray-50 border border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 rounded-xl px-3 py-2.5 transition-all">
                      <MapPin size={14} className="text-gray-400 mr-2 mt-0.5 shrink-0" />
                      <textarea
                        rows={2}
                        value={selectedDelivery?.address || ''}
                        onChange={(e) => updateDeliveryField('address', e.target.value)}
                        placeholder="Enter full home delivery address..."
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400 resize-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method Option Selector */}
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'cod', label: '💵 COD' },
                        { id: 'online', label: '📱 Online' },
                        { id: 'khata', label: '💳 KHATA' }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => updateDeliveryField('paymentMethod', method.id)}
                          className={`py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all border ${
                            selectedDelivery?.paymentMethod === method.id
                              ? 'bg-zinc-950 text-orange-400 border-zinc-950 shadow-md'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Status Selector */}
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Delivery Status</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'pending', label: 'Pending' },
                        { id: 'preparing', label: 'Preparing' },
                        { id: 'out_for_delivery', label: 'On Way' },
                        { id: 'delivered', label: 'Delivered' }
                      ].map(st => (
                        <button
                          key={st.id}
                          onClick={() => updateDeliveryField('deliveryStatus', st.id)}
                          className={`py-2 rounded-lg text-[9px] uppercase font-black transition-all border ${
                            selectedDelivery?.deliveryStatus === st.id
                              ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Special Instructions / Remarks */}
              <div className="mb-3">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Remarks / Special Instructions</label>
                <div className="flex items-start bg-gray-50 border border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 rounded-xl px-3 py-2.5 transition-all">
                  <Edit2 size={14} className="text-gray-400 mr-2 mt-0.5 shrink-0" />
                  <textarea
                    rows={2}
                    value={isDelivery ? (selectedDelivery?.remarks || '') : orderRemarks}
                    onChange={(e) => {
                      if (isDelivery) {
                        updateDeliveryField('remarks', e.target.value);
                      } else {
                        setOrderRemarks(e.target.value);
                      }
                    }}
                    placeholder="E.g. No onions, extra ketchup..."
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400 resize-none"
                  />
                </div>
              </div>

              {/* Bill / Payment Status Selector */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Bill / Payment Status (Stamp)</label>
                <div className="flex gap-2">
                  <select
                    value={['PAID', 'PENDING', 'CASH ON DELIVERY', 'ONLINE PAID', 'IN QUEUE', 'NONE'].includes(activeOrderPaymentStatus) ? activeOrderPaymentStatus : (activeOrderPaymentStatus ? 'CUSTOM' : 'PENDING')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setActiveOrderPaymentStatus(customPaymentStatus || 'CUSTOM');
                      } else {
                        setActiveOrderPaymentStatus(val);
                        if (activeOrderId) {
                          fetch(`${API_BASE}/orders/${activeOrderId}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ payment_status: val })
                          }).catch(err => console.error("Failed to sync payment status", err));
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[11px] text-gray-700 outline-none focus:border-orange-500 transition-all"
                  >
                    <option value="PAID">💵 PAID</option>
                    <option value="PENDING">⏳ PENDING</option>
                    <option value="CASH ON DELIVERY">🚚 CASH ON DELIVERY</option>
                    <option value="ONLINE PAID">📱 ONLINE PAID</option>
                    <option value="IN QUEUE">🔄 IN QUEUE</option>
                    <option value="NONE">🚫 NO STAMP</option>
                    <option value="CUSTOM">✍️ CUSTOM STAMP</option>
                  </select>
                  
                  {(!['PAID', 'PENDING', 'CASH ON DELIVERY', 'ONLINE PAID', 'IN QUEUE', 'NONE'].includes(activeOrderPaymentStatus) || activeOrderPaymentStatus === 'CUSTOM') && (
                    <input
                      type="text"
                      placeholder="Custom stamp text..."
                      value={customPaymentStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomPaymentStatus(val);
                        setActiveOrderPaymentStatus(val);
                        if (activeOrderId) {
                          fetch(`${API_BASE}/orders/${activeOrderId}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ payment_status: val })
                          }).catch(err => console.error("Failed to sync payment status", err));
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-700 outline-none focus:border-orange-500 transition-all"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Realistic Thermal-Style Receipt Summary Card */}
          <div className="xl:col-span-7 flex flex-col gap-4 items-center xl:items-stretch">
            <div className="bg-white rounded-3xl border border-dashed border-gray-300 shadow-xl p-5 md:p-6 font-mono text-zinc-800 text-xs w-full max-w-md xl:max-w-none flex flex-col justify-between select-none relative overflow-hidden bg-[radial-gradient(#faf6f0_1px,transparent_1px)] [background-size:16px_16px]">
              
              {/* Receipt Header */}
              <div>
                <div className="text-center mb-3">
                  <img
                    src={Logo}
                    alt="Zaiqa Mahal Logo"
                    className="w-14 h-14 object-contain mx-auto mb-2 rounded-2xl border border-orange-100 p-0.5 shadow-md bg-white animate-flag-wave"
                  />
                  <div className="text-base font-black tracking-widest uppercase text-zinc-950 font-serif">ZAIQA MAHAL</div>
                  <div className="text-[9px] text-zinc-500 mt-1 leading-tight font-sans">
                    Chishtian Road, Hasilpur<br />
                    Ph: 0300-3910101
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 my-2"></div>

                {/* Session details */}
                <div className="flex flex-col gap-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>DATE: {new Date().toLocaleDateString('en-PK')}</span>
                    <span>TIME: {new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">INVOICE: #{activeOrderId || 'PENDING'}</span>
                    <span className="font-bold uppercase">{isDelivery ? 'SESSION: DELIVERY' : `TABLE: ${selectedTable?.number}`}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 my-2"></div>

                {/* Items headers */}
                <div className="flex justify-between font-black uppercase text-[10px] pb-1 border-b border-gray-200">
                  <span className="w-8">QTY</span>
                  <span className="flex-1 text-left px-2">ITEM</span>
                  <span className="w-16 text-right">TOTAL</span>
                </div>

                {/* Items rows */}
                <div className="space-y-2 py-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {cartItems.filter(item => item.name !== 'Service Charges' && item.item_name !== 'Service Charges').map(item => (
                    <div key={item.cartId || item.id} className="flex justify-between text-[11px] leading-tight">
                      <span className="w-8 font-bold">{item.qty}x</span>
                      <span className="flex-1 text-left px-2 truncate">{item.name}</span>
                      <span className="w-16 text-right font-black">Rs. {item.price * item.qty}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-300 my-2"></div>

                {/* Calculations */}
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span>SUBTOTAL</span>
                    <span className="font-bold">Rs. {subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyTax}
                        onChange={(e) => setApplyTax(e.target.checked)}
                        className="w-3 h-3 accent-orange-500 rounded border-gray-300"
                      />
                      <span>GST / TAX</span>
                    </label>
                    <span className="font-bold">Rs. {tax.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyServiceCharges}
                        onChange={(e) => setApplyServiceCharges(e.target.checked)}
                        className="w-3 h-3 accent-orange-500 rounded border-gray-300"
                      />
                      <span>SERVICE CHARGES</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {serviceCharges === 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const defaultSC = parseFloat(await getOfflineItem('zaiqa_mahal_global_service_charges', 0));
                            if (defaultSC > 0) {
                              setServiceCharges(defaultSC);
                              setApplyServiceCharges(true);
                            }
                          }}
                          className="text-[9px] text-orange-500 hover:text-orange-600 font-black underline cursor-pointer transition-colors"
                        >
                          Apply Default
                        </button>
                      )}
                      <span className="font-bold text-gray-400">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        value={serviceCharges}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setServiceCharges(val);
                          if (val > 0) {
                            setApplyServiceCharges(true);
                          }
                        }}
                        className="w-16 text-right p-0.5 border border-gray-300 rounded font-black text-[10px] outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grand Total & Primary Action Buttons */}
              <div className="mt-4 pt-3 border-t border-dashed border-gray-300">
                <div className="flex justify-between items-baseline mb-5 bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                  <span className="font-black text-zinc-700 text-xs tracking-wider">GRAND TOTAL</span>
                  <span className="text-3xl font-display font-black text-orange-600 leading-none">Rs. {total.toFixed(0)}</span>
                </div>

                {/* Actions container */}
                <div className="flex flex-col sm:flex-row gap-3">
                  
                  {/* Print receipt triggers */}
                  <button
                    onClick={isDelivery ? handleDeliveryPrint : handlePrintBill}
                    className="flex-1 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm"
                  >
                    <Printer size={15} /> Print Bill
                  </button>

                  {/* Place / Save Order */}
                  <button
                    onClick={isDelivery ? handleDeliverySave : handleDineInSave}
                    className="flex-1 py-3.5 bg-zinc-950 hover:bg-zinc-900 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-zinc-950/20"
                  >
                    <ShoppingBag size={15} />
                    {isDelivery ? 'Save Delivery' : (activeOrderId ? 'Update Order' : 'Place Order')}
                  </button>

                  {/* Immediate Checkout */}
                  {((!isDelivery && activeOrderId) || isDelivery) && (
                    <button
                      onClick={() => isDelivery ? handleDeliveryCheckout(selectedDelivery.phone) : handleCheckout()}
                      className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle size={15} /> Checkout Table
                    </button>
                  )}
                </div>

                {/* Cancel Order - danger zone, shown only when order exists */}
                {activeOrderId && (
                  <div className="w-full mt-2">
                    {activeOrderStatus === 'pending' && (
                      // PENDING — everyone can cancel directly
                      <button
                        onClick={() => {
                          if (!window.confirm(`Cancel Order #${activeOrderId}?`)) return;
                          fetch(`${API_BASE}/orders/${activeOrderId}/cancel`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refund_raw: false, log_waste: false, reason: 'Cancelled at POS' })
                          }).then(r => r.json()).then(d => {
                            if (d.success) {
                              setCartItems([]); setActiveOrderId(null); setActiveOrderStatus('pending');
                              showToast('Order cancelled.', 'success'); setRefreshKey(k => k + 1);
                            } else { showToast(d.error || 'Failed to cancel', 'error'); }
                          }).catch(() => showToast('Network error', 'error'));
                        }}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                      >
                        <Ban size={14} /> Cancel Order #{activeOrderId}
                      </button>
                    )}
                    {activeOrderStatus === 'preparing' && currentUser?.role === 'admin' && (
                      // PREPARING — only admin can cancel directly
                      <button
                        onClick={() => {
                          if (!window.confirm(`Cancel Order #${activeOrderId}? Kitchen is preparing — stock will be refunded.`)) return;
                          fetch(`${API_BASE}/orders/${activeOrderId}/cancel`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refund_raw: true, log_waste: true, reason: `Cancelled by ${currentUser?.role}` })
                          }).then(r => r.json()).then(d => {
                            if (d.success) {
                              setCartItems([]); setActiveOrderId(null); setActiveOrderStatus('pending');
                              showToast('Order cancelled. Stock refunded.', 'success'); setRefreshKey(k => k + 1);
                            } else { showToast(d.error || 'Failed to cancel', 'error'); }
                          }).catch(() => showToast('Network error', 'error'));
                        }}
                        className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                      >
                        <Ban size={14} /> Cancel Preparing Order #{activeOrderId}
                      </button>
                    )}
                    {activeOrderStatus === 'preparing' && currentUser?.role === 'cashier' && (
                      <div className="w-full py-3 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold">
                        <AlertTriangle size={13} className="text-amber-500" />
                        Order preparing — Contact Admin to cancel
                      </div>
                    )}
                    {activeOrderStatus === 'ready' && currentUser?.role === 'admin' && (
                      // READY — only admin can cancel
                      <button
                        onClick={() => {
                          if (!window.confirm(`Cancel Order #${activeOrderId}? Food is ready — stock will be refunded and food logged as waste.`)) return;
                          fetch(`${API_BASE}/orders/${activeOrderId}/cancel`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refund_raw: true, log_waste: true, reason: 'Admin force-cancelled (ready)' })
                          }).then(r => r.json()).then(d => {
                            if (d.success) {
                              setCartItems([]); setActiveOrderId(null); setActiveOrderStatus('pending');
                              showToast('Order cancelled. Food logged as waste.', 'success'); setRefreshKey(k => k + 1);
                            } else { showToast(d.error || 'Failed to cancel', 'error'); }
                          }).catch(() => showToast('Network error', 'error'));
                        }}
                        className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                      >
                        <Ban size={14} /> Admin Force-Cancel Order #{activeOrderId}
                      </button>
                    )}
                    {activeOrderStatus === 'ready' && currentUser?.role === 'cashier' && (
                      <div className="w-full py-3 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold">
                        <AlertTriangle size={13} className="text-amber-500" />
                        Order ready — Contact Admin to cancel
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
        {printData && createPortal(
          <div ref={receiptRef} className="receipt-print-wrapper" style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}>
            <ReceiptSlip printData={printData} />
          </div>,
          document.body
        )}
      </div>
    );
  }

  if (view === 'order') {
    return (
      <div className="flex flex-col h-full bg-[#f8f9fc] p-2 lg:p-4 gap-3 lg:gap-4">

        {/* Compact & Professional Order View Header */}
        <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between shrink-0 gap-4 transition-all z-20 relative">

          {/* Left: Table Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-zinc-900 hover:text-orange-500 rounded-full text-gray-400 transition-all shadow-sm border border-gray-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col">
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5 leading-none">{selectedTable?.area} Area</p>
              <h2 className="text-xl font-display font-black text-gray-900 leading-none">Table {selectedTable?.number}</h2>
            </div>
          </div>

          {/* Center Controls (Compact) */}
          <div className="flex items-center gap-3 md:gap-5 flex-1 justify-center max-w-xl">

            {/* Status Editor */}
            <div className="flex items-center">
              {editingStatus ? (
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-md border border-orange-100">
                  <select
                    value={statusValue}
                    onChange={(e) => {
                      setStatusValue(e.target.value);
                      if (e.target.value !== 'other') setCustomStatus('');
                    }}
                    className="p-1.5 text-xs font-bold bg-gray-50 border border-gray-100 rounded-lg outline-none text-gray-700"
                  >
                    <option value="available">Available</option>
                    <option value="dining">Dining</option>
                    <option value="reserved">Reserved</option>
                    <option value="other">Other</option>
                  </select>
                  {statusValue === 'other' && (
                    <input
                      type="text"
                      placeholder="e.g. Cleaning"
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      className="w-24 p-1.5 text-xs font-bold border-b border-orange-500 bg-orange-50/30 outline-none rounded-t-lg"
                      autoFocus
                    />
                  )}
                  <button onClick={saveTableEdits} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-orange-600 transition-colors">
                    Save
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditingStatus(true);
                    const isDefault = ['available', 'dining', 'reserved'].includes(selectedTable?.status);
                    setStatusValue(isDefault ? selectedTable?.status : 'other');
                    setCustomStatus(isDefault ? '' : selectedTable?.status);
                  }}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg font-bold text-[10px] md:text-xs tracking-wider shadow-sm uppercase flex items-center gap-1.5 transition-colors border ${selectedTable?.status === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    selectedTable?.status === 'dining' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      selectedTable?.status === 'reserved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-zinc-900 text-orange-500 border-zinc-800'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {selectedTable?.status}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            {/* Persons Editor */}
            <div className="flex items-center">
              {editingSeats ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={seatsValue}
                    onChange={e => setSeatsValue(parseInt(e.target.value) || 0)}
                    onBlur={saveTableEdits}
                    autoFocus
                    className="w-12 bg-gray-50 px-2 py-1 border border-orange-500 rounded-lg font-bold text-center text-sm focus:outline-none shadow-inner"
                  />
                </div>
              ) : (
                <div
                  className="group flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  onClick={() => setEditingSeats(true)}
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-0.5">Guests</p>
                    <p className="font-bold text-gray-800 text-sm leading-none flex items-center gap-1">
                      {selectedTable?.seats}
                      <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity" />
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            {/* Write Name / Customer Info */}
            <div className="flex items-center">
              <button
                onClick={() => setIsNameModalOpen(true)}
                className="group flex items-center gap-2 cursor-pointer p-1.5 rounded-xl hover:bg-orange-50/50 transition-colors border border-transparent hover:border-orange-100 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors flex items-center justify-center shadow-inner">
                  <Users size={14} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-0.5">Customer</p>
                  <p className="font-bold text-gray-800 text-xs leading-none flex items-center gap-1.5 max-w-[120px] truncate">
                    {orderCustomerName || 'Write Name'}
                    <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity" />
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Right: Arrival Time & Stopwatch (Compact) */}
          <div className="flex items-center gap-4 bg-zinc-950 text-orange-400 px-4 py-2 rounded-xl shadow-sm border border-zinc-900">
            <Clock size={16} className="opacity-80 hidden sm:block" />

            {selectedTable?.status === 'available' && !selectedTable?.startTime ? (
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none">Not Seated</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-start border-r border-zinc-800 pr-3 mr-1">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Arrival</span>
                  {editingTime ? (
                    <input
                      type="time"
                      value={timeValue}
                      onChange={e => setTimeValue(e.target.value)}
                      onBlur={saveTableEdits}
                      autoFocus
                      className="bg-zinc-900 text-white px-1.5 py-0.5 text-xs font-bold rounded focus:outline-none border border-zinc-700"
                    />
                  ) : (
                    <div
                      className="text-xs font-bold cursor-pointer flex items-center gap-1.5 hover:text-white transition-colors leading-none"
                      onClick={() => setEditingTime(true)}
                    >
                      {selectedTable?.startTime ? new Date(selectedTable.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Set"}
                      <Edit2 size={10} className="opacity-50" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Elapsed</span>
                  <span className="text-sm font-black tracking-widest font-mono text-white leading-none">
                    {selectedTable?.startTime ? <TableTimer startTime={selectedTable.startTime} /> : "00:00"}
                  </span>
                </div>
              </>
            )}
          </div>

          {activeOrderId && (
            <button
              onClick={handleCheckout}
              className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 hover:bg-emerald-600 transition-colors shrink-0"
            >
              <CheckCircle size={16} />
              Checkout
            </button>
          )}
        </div>

        {orderRemarks && orderRemarks.includes('[BILL REQUESTED]') && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-red-500 font-extrabold text-lg animate-pulse">⚠️</span>
              <div>
                <p className="text-xs font-black text-red-700 uppercase tracking-wider">Bill Requested by Waiter</p>
                <p className="text-[11px] text-red-600 font-medium">The waiter has requested the checkout bill for Table {selectedTable?.number}. Review details and process checkout.</p>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
            >
              Process Checkout
            </button>
          </div>
        )}

        {/* Menu & Cart Container */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 overflow-hidden z-10">
          {/* Menu Section */}
          <div className="flex-[2.5] bg-white rounded-2xl shadow-sm border border-gray-200/60 flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden relative">
            <Menu onAddToCart={addToCart} disabled={false} showToast={showToast} />
          </div>

          {/* Cart Section */}
          <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200/60 flex flex-col min-h-[50vh] lg:min-h-0 overflow-hidden relative">
            <Cart
              table={selectedTable}
              items={cartItems}
              onUpdateQty={updateQty}
              onRemove={removeItem}
              onContinueToBill={() => setView('billing')}
              onSendToKitchen={handleSendToKitchen}
              activeOrderStatus={activeOrderStatus}
              adminUnlockRemark={adminUnlockRemark}
              onAdminUnlock={(remark) => setAdminUnlockRemark(remark)}
              currentUser={currentUser}
            />
          </div>
        </div>

        {/* Order Confirmation Modal component */}
        <OrderConfirmationModal
          orderConfirmData={orderConfirmData}
          setOrderConfirmData={setOrderConfirmData}
          executePlaceOrder={executePlaceOrder}
          selectedTable={selectedTable}
          activeOrderId={activeOrderId}
          confirmStatus={confirmStatus}
          setConfirmStatus={setConfirmStatus}
        />

        {/* Checkout Confirmation Modal component */}
        <CheckoutConfirmationModal
          isCheckoutModalOpen={isCheckoutModalOpen}
          setIsCheckoutModalOpen={setIsCheckoutModalOpen}
          executeCheckout={executeCheckout}
          selectedTable={selectedTable}
        />

        {/* Customer Registration Modal component */}
        {isNameModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-fadeIn">
            <style>{`
              @keyframes slideUpModal {
                0% { transform: translateY(30px) scale(0.95); opacity: 0; }
                100% { transform: translateY(0) scale(1); opacity: 1; }
              }
              @keyframes fadeInBg {
                0% { opacity: 0; }
                100% { opacity: 1; }
              }
              .animate-slideUpModal {
                animation: slideUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .animate-fadeIn {
                animation: fadeInBg 0.3s ease-out forwards;
              }
            `}</style>
            
            <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-slideUpModal flex flex-col relative">
              {/* Elegant Header */}
              <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-wide">Register Customer</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Dine-in Table {selectedTable?.number}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsNameModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors border border-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Fields */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!orderCustomerName.trim()) return showToast("Customer Name is required.", "error");

                try {
                  // Only save to central directory if phone number is provided
                  if (orderCustomerPhone.trim()) {
                    const customerData = {
                      id: `CUST-${Date.now()}`,
                      name: orderCustomerName.trim(),
                      phone: orderCustomerPhone.trim(),
                      email: orderCustomerEmail.trim() || '',
                      address: orderCustomerAddress.trim() || '',
                      type: 'Client',
                      balance: 0
                    };

                    const isExisting = allDBCustomers.some(c => c.phone === orderCustomerPhone.trim());
                    if (!isExisting) {
                      await fetch(`${API_BASE}/customers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(customerData)
                      });
                    }
                  }

                  // 2. If active order exists, PATCH its customer name in SQLite immediately
                  if (activeOrderId) {
                    const orderRes = await fetch(`${API_BASE}/orders/${activeOrderId}/customer`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customer_name: orderCustomerName.trim() })
                    });
                    if (orderRes.ok) {
                      showToast("Customer details synced & saved to order!", "success");
                    } else {
                      showToast("Customer details registered successfully!", "success");
                    }
                  } else {
                    showToast("Customer registered! Name will be saved when you place the order.", "success");
                  }

                  setIsNameModalOpen(false);
                } catch (err) {
                  console.error("Failed to save customer data:", err);
                  showToast("Network error syncing customer details.", "error");
                }
              }} className="p-6 space-y-4">
                
                {/* Phone Input with Auto-Lookup suggestion dropdown */}
                <div className="relative phone-lookup-container">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Phone Number (Optional)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                    <Phone size={14} className="text-gray-400 mr-2.5 shrink-0" />
                    <input 
                      type="text" 
                      value={orderCustomerPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderCustomerPhone(val);
                        
                        // Auto-lookup matching customers by phone
                        if (val.length >= 3) {
                          const matched = allDBCustomers.filter(c => c.phone.includes(val));
                          setSuggestedCustomers(matched.slice(0, 5));
                        } else {
                          setSuggestedCustomers([]);
                        }
                      }}
                      placeholder="Enter Customer Phone..." 
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400"
                    />
                  </div>

                  {/* Suggestions List Overlay */}
                  {suggestedCustomers.length > 0 && (
                    <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto">
                      {suggestedCustomers.map(cust => (
                        <div 
                          key={cust.id}
                          onClick={() => {
                            setOrderCustomerName(cust.name || '');
                            setOrderCustomerPhone(cust.phone || '');
                            setOrderCustomerAddress(cust.address || '');
                            setOrderCustomerEmail(cust.email || '');
                            setSuggestedCustomers([]);
                          }}
                          className="px-4 py-3 hover:bg-orange-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-none transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-800">{cust.name}</span>
                            <span className="text-[10px] text-gray-400 font-bold mt-0.5">{cust.phone}</span>
                          </div>
                          {cust.address && <span className="text-[9px] px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-500 truncate max-w-[120px]">{cust.address}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Name Input */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Customer Name *</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                    <Users size={14} className="text-gray-400 mr-2.5 shrink-0" />
                    <input 
                      type="text" 
                      required
                      value={orderCustomerName}
                      onChange={(e) => setOrderCustomerName(e.target.value)}
                      placeholder="Enter Customer Name..." 
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Address Input */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Remarks / Location Details</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                    <MapPin size={14} className="text-gray-400 mr-2.5 shrink-0" />
                    <input 
                      type="text" 
                      value={orderCustomerAddress}
                      onChange={(e) => setOrderCustomerAddress(e.target.value)}
                      placeholder="e.g. Near window, family group..." 
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Email Address (Optional)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                    <span className="text-gray-400 text-xs font-black mr-2.5 shrink-0 font-mono">@</span>
                    <input 
                      type="email" 
                      value={orderCustomerEmail}
                      onChange={(e) => setOrderCustomerEmail(e.target.value)}
                      placeholder="Enter Email Address..." 
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-gray-800 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6 bg-gray-50/50 -mx-6 -mb-6 p-6">
                  <button 
                    type="button" 
                    onClick={() => setIsNameModalOpen(false)}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 hover:text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-3 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={15} /> Save & Sync
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-slideUp">
            <AlertCircle size={18} className={toastMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'} />
            <span className="font-bold text-sm tracking-wide">{toastMessage.message}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-zinc-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Print Receipt Portal — hidden off-screen, visible only on print */}
        {printData && createPortal(
          <div
            ref={receiptRef}
            className="receipt-print-wrapper"
            style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}
          >
            <ReceiptSlip printData={printData} />
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {pendingCancelCount > 0 && (currentUser?.role === 'cashier' || currentUser?.role === 'admin') && (
        <div className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white font-black text-[11px] md:text-xs uppercase tracking-wider py-3 px-6 flex items-center justify-between shadow-lg animate-pulse shrink-0 border-b-2 border-red-700 select-none">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span>ATTENTION: {pendingCancelCount} WAITER CANCELLATION REQUESTS PENDING APPROVAL!</span>
          </div>
          <button 
            onClick={() => {
              localStorage.setItem('returns_pending_initial_tab', 'cancel-requests');
              if (navigateTo) navigateTo('returns');
            }}
            className="bg-white text-red-600 hover:bg-zinc-100 active:scale-95 transition-all px-4 py-1.5 rounded-lg text-[10px] font-black shadow-md border-0 uppercase"
          >
            Solve Requests
          </button>
        </div>
      )}
      {/* Area / Tab Selector */}
      <div className="px-6 lg:px-10 pt-8 pb-4 shrink-0 overflow-x-auto custom-scrollbar flex gap-4">
        {['Male', 'Family', 'Lawn'].map(area => (
          <button
            key={area}
            onClick={() => setActiveArea(area)}
            className={`px-8 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 ${activeArea === area
              ? 'bg-zinc-900 text-orange-500 shadow-xl shadow-zinc-900/20'
              : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm border border-gray-100/50'
              }`}
          >
            {activeArea === area && <LayoutGrid size={16} />}
            {area}
          </button>
        ))}

        {/* Delivery Tab */}
        <button
          onClick={() => { setActiveArea('Delivery'); loadDeliveryOrders(); }}
          className={`px-8 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 ${activeArea === 'Delivery'
            ? 'bg-zinc-900 text-orange-500 shadow-xl shadow-zinc-900/20'
            : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm border border-gray-100/50'
            }`}
        >
          {activeArea === 'Delivery' && <Bike size={16} />}
          Delivery
          {deliveryOrders.length > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${activeArea === 'Delivery' ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-900 text-orange-400'
              }`}>
              {deliveryOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Floor Plan Grid — Dine-in Tables */}
      {activeArea !== 'Delivery' && (
        <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-10 pb-10 custom-scrollbar relative">
          <div
            className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url(./Logo.jpg)`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mt-4">
            {areaTables.map(table => (
              <TableCard key={table.id} table={table} onClick={handleTableClick} />
            ))}
          </div>
        </div>
      )}

      {/* ── Delivery Orders Grid ─────────────────────────────────── */}
      {activeArea === 'Delivery' && (
        <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-10 pb-10 custom-scrollbar">

          {/* Start Delivery Order — header with search bar and button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mt-6 mb-5 gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Active Delivery Orders</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{deliveryOrders.length} active order{deliveryOrders.length !== 1 ? 's' : ''} in queue</p>
            </div>

            {/* Real-time Order Search and Track Input */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 max-w-2xl md:mx-6">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Track by Name, Phone, Address or ID..."
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs font-bold text-zinc-800 placeholder-zinc-400 shadow-sm"
                />
              </div>

              {/* Date Filter & Ranges Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={deliveryRangeFilter}
                  onChange={(e) => {
                    setDeliveryRangeFilter(e.target.value);
                    if (e.target.value !== 'custom') {
                      setDeliveryDateFilter(''); // Clear custom date if choosing preset range
                    }
                  }}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-zinc-800 text-xs font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="3months">3 Months</option>
                  <option value="year">This Year</option>
                  <option value="all">All</option>
                  <option value="custom" disabled={!deliveryDateFilter}>Custom Date</option>
                </select>

                <input
                  type="date"
                  value={deliveryDateFilter}
                  onChange={(e) => {
                    setDeliveryDateFilter(e.target.value);
                    if (e.target.value) {
                      setDeliveryRangeFilter('custom');
                    } else {
                      setDeliveryRangeFilter('all');
                    }
                  }}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-zinc-800 text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-sm cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={startBlankDeliveryOrder}
              className="flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-full text-sm font-bold tracking-wide shadow-lg hover:bg-orange-600 transition-all shrink-0 w-full md:w-auto"
            >
              <Bike size={16} /> Start Delivery Order
            </button>
          </div>

          {/* Beautiful modern glassmorphic tabs for filtering delivery statuses */}
          {(() => {
            const completedDeliveries = completedInvoices.filter(inv => 
              inv.table === 'Delivery' || 
              (inv.table && typeof inv.table === 'object' && inv.table.area === 'Delivery')
            );

            // Filter both arrays by the active range/date filter for correct counting
            const todayStr = new Date().toLocaleDateString('sv-SE');
            
            const filterByDate = (orderList, isCompletedInvoice = false) => {
              return orderList.filter(order => {
                if (deliveryRangeFilter === 'all') return true;
                const timeField = isCompletedInvoice ? order.date : order.startTime;
                if (!timeField) return false;
                const orderDateStr = timeField.split('T')[0];
                
                if (deliveryRangeFilter === 'custom' && deliveryDateFilter) {
                  return orderDateStr === deliveryDateFilter;
                }
                if (deliveryRangeFilter === 'today') {
                  return orderDateStr === todayStr;
                }
                
                const orderTime = new Date(timeField).getTime();
                const nowTime = Date.now();
                const diffMs = nowTime - orderTime;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                
                if (deliveryRangeFilter === 'week') {
                  return diffDays <= 7;
                }
                if (deliveryRangeFilter === 'month') {
                  return diffDays <= 30;
                }
                if (deliveryRangeFilter === '3months') {
                  return diffDays <= 90;
                }
                if (deliveryRangeFilter === 'year') {
                  return diffDays <= 365;
                }
                return true; // 'all'
              });
            };

            const dateFilteredDeliveryOrders = filterByDate(deliveryOrders, false);
            const dateFilteredCompletedDeliveries = filterByDate(completedDeliveries, true);

            // Filter delivery orders depending on active tab
            let filteredDeliveries = [];
            if (deliveryTab === 'All') {
              filteredDeliveries = [
                ...dateFilteredDeliveryOrders
              ];
            } else if (deliveryTab === 'Pending') {
              filteredDeliveries = dateFilteredDeliveryOrders.filter(o => (o.deliveryStatus || 'pending') === 'pending');
            } else if (deliveryTab === 'Preparing') {
              filteredDeliveries = dateFilteredDeliveryOrders.filter(o => o.deliveryStatus === 'preparing');
            } else if (deliveryTab === 'On the Way') {
              filteredDeliveries = dateFilteredDeliveryOrders.filter(o => o.deliveryStatus === 'out_for_delivery');
            } else if (deliveryTab === 'Delivered') {
              filteredDeliveries = dateFilteredCompletedDeliveries.map(inv => ({
                id: inv.orderId,
                phone: inv.customerPhone,
                name: inv.customerName,
                address: inv.deliveryAddress,
                paymentMethod: inv.paymentMethod,
                deliveryStatus: 'delivered',
                items: inv.items,
                isCompleted: true,
                startTime: inv.date
              }));
            }

            // Real-time track & search filter
            const searchedDeliveries = filteredDeliveries.filter(order => {
              if (!deliverySearch) return true;
              const query = deliverySearch.toLowerCase();
              return (
                String(order.id).toLowerCase().includes(query) ||
                String(order.name || '').toLowerCase().includes(query) ||
                String(order.phone || '').toLowerCase().includes(query) ||
                String(order.address || '').toLowerCase().includes(query)
              );
            });

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full p-2 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl mb-6 backdrop-blur-md">
                  {[
                    { key: 'All', label: 'All Orders', count: dateFilteredDeliveryOrders.length, activeColor: 'border-orange-500 text-orange-400 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]', inactiveColor: 'border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' },
                    { key: 'Pending', label: 'Pending', count: dateFilteredDeliveryOrders.filter(o => (o.deliveryStatus || 'pending') === 'pending').length, activeColor: 'border-zinc-400 text-white bg-zinc-800/50 shadow-[0_0_15px_rgba(255,255,255,0.08)]', inactiveColor: 'border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' },
                    { key: 'Preparing', label: 'Preparing', count: dateFilteredDeliveryOrders.filter(o => o.deliveryStatus === 'preparing').length, activeColor: 'border-orange-500 text-orange-500 bg-orange-600/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]', inactiveColor: 'border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' },
                    { key: 'On the Way', label: 'On the Way', count: dateFilteredDeliveryOrders.filter(o => o.deliveryStatus === 'out_for_delivery').length, activeColor: 'border-blue-500 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]', inactiveColor: 'border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' },
                    { key: 'Delivered', label: 'Delivered', count: dateFilteredCompletedDeliveries.length, activeColor: 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]', inactiveColor: 'border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDeliveryTab(tab.key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 border ${deliveryTab === tab.key ? tab.activeColor : 'bg-transparent ' + tab.inactiveColor
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black font-mono border ${deliveryTab === tab.key
                        ? 'bg-zinc-950/90 ' + (tab.key === 'All' || tab.key === 'Preparing' ? 'border-orange-500 text-orange-400' : tab.key === 'Pending' ? 'border-zinc-400 text-zinc-300' : tab.key === 'On the Way' ? 'border-blue-500 text-blue-400' : 'border-emerald-500 text-emerald-400')
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                        }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Delivery Order Cards Grid */}
                {searchedDeliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800 shadow-xl">
                      <Bike size={36} className="text-orange-500" />
                    </div>
                    <h4 className="font-black text-gray-700 text-lg">
                      {deliverySearch ? 'No Search Results' : `No ${deliveryTab !== 'All' ? deliveryTab : ''} Deliveries`}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1 max-w-xs">
                      {deliverySearch ? `No orders matched "${deliverySearch}".` : 'There are no orders currently under this status filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center mt-6">
                    {searchedDeliveries.map((order, index) => {
                      const sub = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
                      const dStatus = order.deliveryStatus || 'pending';
                      const pay = order.paymentMethod || 'cod';

                      // Dynamic colors per status
                      const statusConfig = {
                        pending: { label: 'Pending', border: '#a1a1aa', glow: 'rgba(161,161,170,0.25)', dot: '#a1a1aa' },
                        preparing: { label: 'Preparing', border: '#f97316', glow: 'rgba(249,115,22,0.3)', dot: '#f97316' },
                        out_for_delivery: { label: 'On the Way', border: '#3b82f6', glow: 'rgba(59,130,246,0.3)', dot: '#3b82f6' },
                        delivered: { label: 'Delivered', border: '#10b981', glow: 'rgba(16,185,129,0.3)', dot: '#10b981' },
                      };
                      const sc = statusConfig[dStatus] || statusConfig.pending;

                      return (
                        <div
                          key={`${order.id}-${index}`}
                          onClick={() => handleDeliveryCardClick(order)}
                          className="group relative w-[310px] h-[210px] cursor-pointer transform hover:-translate-y-2.5 transition-all duration-300 select-none"
                          style={{
                            filter: `drop-shadow(0 12px 24px ${sc.glow})`,
                          }}
                        >
                          {/* ── Custom Vector Bike SVG (The CARD is the Bike) ── */}
                          <svg
                            width="310"
                            height="210"
                            viewBox="0 0 310 210"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="absolute inset-0 z-0 pointer-events-auto"
                          >
                            <defs>
                              <linearGradient id="headlight-glow" x1="0" y1="0.5" x2="1" y2="0.5">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.65" />
                                <stop offset="40%" stopColor="#d97706" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            {/* Shock absorber (Rendered first so it is layered physically BEHIND the delivery bag) */}
                            <line x1="65" y1="150" x2="90" y2="105" stroke="#71717a" strokeWidth="3.5" />
                            <line x1="68" y1="148" x2="87" y2="108" stroke={sc.dot} strokeWidth="1.5" />

                            {/* Flagpole mounted on top-right of Delivery Bag */}
                            <line x1="100" y1="50" x2="100" y2="15" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="100" cy="13" r="2.5" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 2px #f59e0b)' }} />

                            {/* Status flag waving backwards in the wind (from right to left) - Increased width to fit all text */}
                            <path
                              d="M 100 15 C 75 11, 50 20, 20 15 L 20 35 C 50 39, 75 30, 100 35 Z"
                              fill={sc.dot}
                              className="animate-flag-wave"
                              style={{ filter: `drop-shadow(0 0 5px ${sc.border})` }}
                            />
                            <text
                              x="60"
                              y="27"
                              textAnchor="middle"
                              fontSize="6.2"
                              fontWeight="900"
                              fill="#ffffff"
                              className="animate-flag-wave"
                              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }}
                            >
                              {sc.label.toUpperCase()}
                            </text>

                            {/* 1. Delivery Bag (Holds Customer Name & Phone) - Warm premium zinc-800 & glowing border */}
                            <rect
                              x="20"
                              y="50"
                              width="85"
                              height="75"
                              rx="12"
                              fill="#27272a"
                              stroke={sc.border}
                              strokeWidth="3.5"
                              style={{ filter: `drop-shadow(0 0 8px ${sc.border})`, backdropFilter: 'blur(8px)' }}
                            />

                            {/* Logo & Customer Information inside the Delivery Bag */}
                            <g style={{ pointerEvents: 'auto' }}>
                              <foreignObject x="22" y="52" width="81" height="71">
                                <div className="w-full h-full flex flex-col justify-between items-center text-center px-1 py-1.5">
                                  {/* Small Round Brand Logo Image */}
                                  <div className="w-[30px] h-[30px] rounded-full overflow-hidden border border-amber-400/40 shadow-lg">
                                    <img src="./Logo.jpg" alt="Zaiqah Logo" className="w-full h-full object-cover" />
                                  </div>

                                  {/* Name & Phone Number clustered below the logo */}
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-white leading-tight drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)]">
                                      {order.name || <span className="text-zinc-400 italic">No Name</span>}
                                    </span>
                                    <span className="text-[8px] font-mono font-black text-amber-400 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] tracking-tight">
                                      {order.phone || '—'}
                                    </span>
                                  </div>
                                </div>
                              </foreignObject>
                            </g>



                            {/* 3. Chassis & Proportional Scooter Body with Glowing Neon Stripes */}
                            <path
                              d="M 60 155 L 235 155"
                              stroke="rgba(63, 63, 70, 0.9)"
                              strokeWidth="6"
                              strokeLinecap="round"
                            />



                            {/* Main chassis frame */}
                            <path
                              d="M 105 115 L 205 115 L 235 60 L 228 55"
                              stroke="rgba(63, 63, 70, 0.8)"
                              strokeWidth="4.5"
                              fill="none"
                            />

                            {/* Realistic Dual-Level Leather Seat with Double Stitching */}
                            {/* Under-Seat Metal Mounting Bracket */}
                            <rect x="152" y="93" width="18" height="4" fill="#3f3f46" rx="1" />

                            {/* Thick Bottom Foam Base Cushion */}
                            <path
                              d="M 132 87 C 132 87, 140 76, 162 76 C 178 76, 195 83, 195 83 L 195 96 L 132 96 Z"
                              fill="#09090b"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="1"
                            />

                            {/* Top Premium Leather Seat Cushion */}
                            <path
                              d="M 132 85 C 132 85, 140 74, 162 74 C 178 74, 195 81, 195 81 L 195 88 L 132 90 Z"
                              fill="#27272a"
                              stroke="#18181b"
                              strokeWidth="1"
                            />

                            {/* Double Stitched Leather Seams (Dashed Lines) */}
                            <path d="M 140 81 C 146 79, 152 79, 158 80" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" strokeDasharray="1.5,1.5" fill="none" />
                            <path d="M 166 80 C 173 80, 180 82, 187 84" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="0.8" strokeDasharray="1.5,1.5" fill="none" />

                            {/* Contoured Motorcycle Fuel Tank (Tanky) with Chrome Lid */}
                            <path
                              d="M 195 85 
                           C 195 85, 202 70, 218 70 
                           C 230 70, 236 76, 236 82 
                           L 230 96 
                           C 222 102, 205 102, 195 96
                           Z"
                              fill="#1c1917"
                              stroke={sc.border}
                              strokeWidth="2.8"
                              style={{ filter: `drop-shadow(0 0 5px ${sc.border})` }}
                            />
                            {/* Fuel Tank Glowing Brand Stripe */}
                            <path
                              d="M 200 87 Q 215 76 232 86"
                              stroke={sc.border}
                              strokeWidth="1.8"
                              fill="none"
                              style={{ filter: `drop-shadow(0 0 3px ${sc.border})` }}
                            />
                            {/* Metallic Fuel Cap (Tanky Lid) */}
                            <ellipse cx="216" cy="71" rx="4" ry="1.8" fill="#e4e4e7" stroke="#71717a" strokeWidth="1" />
                            <line x1="216" y1="71" x2="216" y2="72" stroke="#18181b" strokeWidth="1.2" />

                            {/* High-tech body panels under the tank */}
                            <path
                              d="M 130 96 C 145 130, 205 130, 222 96 Z"
                              fill={sc.dot}
                              fillOpacity="0.25"
                              stroke={sc.border}
                              strokeWidth="2.5"
                              strokeLinejoin="round"
                              style={{ filter: `drop-shadow(0 0 4px ${sc.border})` }}
                            />

                            {/* Glowing neon stripe along body curve */}
                            <path
                              d="M 140 102 Q 175 125 215 102"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              fill="none"
                              opacity="0.7"
                            />

                            {/* Floorboard / Front mud shield */}
                            <path
                              d="M 195 115 L 228 115 L 242 75 L 235 75 Z"
                              fill="rgba(20, 20, 23, 0.95)"
                              stroke="rgba(255,255,255,0.08)"
                              strokeWidth="1"
                            />

                            {/* Headlight (Realistic Round Projector Bezel with Curved Soft Dispersion Beam) */}
                            <circle cx="245" cy="52" r="5" fill="#18181b" stroke="#d4d4d8" strokeWidth="1.2" />
                            <circle cx="245" cy="52" r="3.5" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 3px #d97706)' }} />
                            <circle cx="243.5" cy="50.5" r="1" fill="#ffffff" opacity="0.8" />
                            <path d="M 246 52 C 265 42, 280 42, 295 48 C 300 52, 300 52, 295 56 C 280 62, 265 62, 246 52 Z" fill="url(#headlight-glow)" style={{ filter: 'blur(4px)' }} />

                            {/* Speedometer Console / Steering Head */}
                            <rect x="238" y="41" width="10" height="7" rx="2" fill="#18181b" stroke="#a1a1aa" strokeWidth="1" />
                            <line x1="243" y1="41" x2="243" y2="60" stroke="#71717a" strokeWidth="3" />

                            {/* Heavy Front Steering Fork (Physically links Tank/Handlebars to Front Wheel Hub) */}
                            <line x1="243" y1="41" x2="237" y2="150" stroke="#a1a1aa" strokeWidth="3.5" strokeLinecap="round" />
                            {/* Front Suspension Shocks Coil Overlay */}
                            <line x1="241.5" y1="65" x2="238.5" y2="115" stroke={sc.border} strokeWidth="5" strokeDasharray="3,2.5" strokeLinecap="round" />

                            {/* Dual Rearview Mirrors */}
                            {/* Left Mirror */}
                            <line x1="239" y1="42" x2="228" y2="28" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="226" cy="26" r="4.5" fill="#27272a" stroke="#a1a1aa" strokeWidth="1.2" />
                            <circle cx="226" cy="26" r="3" fill="#e4e4e7" opacity="0.8" />

                            {/* Right Mirror (Background/far side) */}
                            <line x1="247" y1="43" x2="254" y2="31" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="256" cy="29" r="3.8" fill="#27272a" stroke="#71717a" strokeWidth="1" />

                            {/* Detailed Handlebar with Rubber Grips & Brake Levers */}
                            {/* Left Handlebar */}
                            <line x1="238" y1="44" x2="224" y2="41" stroke="#a1a1aa" strokeWidth="2.5" />
                            {/* Left Rubber Grip */}
                            <rect x="222" y="39" width="9" height="4.5" rx="1" fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" />
                            {/* Left Brake Lever */}
                            <line x1="223" y1="43" x2="232" y2="44" stroke="#d4d4d8" strokeWidth="1" />

                            {/* Right Handlebar (Angled/far side) */}
                            <line x1="247" y1="44" x2="257" y2="46" stroke="#71717a" strokeWidth="2" />
                            {/* Right Rubber Grip */}
                            <rect x="253" y="44" width="7" height="4" rx="1" fill="#09090b" stroke="#3f3f46" strokeWidth="0.5" />

                            {/* Mudguards with neon highlights */}
                            <path d="M 42 145 C 48 131, 70 131, 76 145" stroke={sc.border} strokeWidth="3" fill="none" style={{ filter: `drop-shadow(0 0 3px ${sc.border})` }} />

                            {/* 3. Highly Detailed Professional Rider Model (Adult Scaled) */}
                            {/* Full-Face Premium Racing Helmet */}
                            {/* Aerodynamic Rear Spoiler Fin */}
                            <path d="M 155 30 Q 145 28, 146 38 C 151 38, 154 36, 155 30 Z" fill="#27272a" stroke={sc.border} strokeWidth="1" />

                            {/* Main Helmet Outer Shell */}
                            <path
                              d="M 155 36 
                           C 155 21, 187 21, 187 36 
                           C 187 42, 184 49, 178 52 
                           L 163 52 
                           C 157 48, 155 42, 155 36 
                           Z"
                              fill="#18181b"
                              stroke={sc.border}
                              strokeWidth="2.8"
                              style={{ filter: `drop-shadow(0 0 3px ${sc.border})` }}
                            />

                            {/* Chin Vent Details */}
                            <rect x="178" y="47" width="4" height="2" rx="0.5" fill="#52525b" />
                            <line x1="179" y1="48" x2="181" y2="48" stroke="#18181b" strokeWidth="0.8" />

                            {/* Streamlined Racing Accent Stripes */}
                            <path d="M 158 26 Q 166 28, 172 51" stroke="rgba(255,255,255,0.15)" strokeWidth="1.8" fill="none" />
                            <path d="M 159 28 Q 167 30, 173 51" stroke={sc.border} strokeWidth="1" fill="none" opacity="0.75" />

                            {/* Visor Hinge Pivot Plate */}
                            <circle cx="166" cy="38" r="3.5" fill="#27272a" stroke="#71717a" strokeWidth="0.8" />
                            <circle cx="166" cy="38" r="1.2" fill="#d4d4d8" />

                            {/* Aerodynamic Pulsing Visor */}
                            <path
                              d="M 172 28 Q 186 28, 186 42 Q 186 46, 178 48 C 172 48, 170 42, 170 36 Z"
                              fill="rgba(15, 23, 42, 0.95)"
                              stroke={sc.border}
                              strokeWidth="2"
                            />
                            {/* Pulsing Iridium Visor Core Glow */}
                            <path
                              d="M 174 29 Q 184 29, 184 41 L 178 45 Z"
                              fill={sc.border}
                              fillOpacity="0.25"
                              className="animate-pulse"
                            />
                            {/* Visor Dual-Layer High-Gloss Glass Reflections */}
                            <path d="M 176 30 Q 182 32, 181 38" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85" />
                            <path d="M 173 33 Q 177 34, 176 43" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />

                            {/* Jacket Collar */}
                            <path d="M 163 56 L 170 50 L 173 56 Z" fill="#27272a" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />

                            {/* Rider's Far Arm (Right Arm) & Glove gripping the Right Handlebar Grip */}
                            <path d="M 178 58 Q 210 66, 252 46" stroke="#141210" strokeWidth="8.5" strokeLinecap="round" fill="none" opacity="0.9" />
                            <path d="M 178 58 Q 210 66, 252 46" stroke="rgba(255,255,255,0.06)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                            <path d="M 178 58 Q 210 66, 252 46" stroke={sc.border} strokeWidth="2" strokeLinecap="round" fill="none" style={{ filter: `drop-shadow(0 0 2px ${sc.border})` }} />
                            <path d="M 249 46 C 248 42, 255 42, 256 46 L 252 49 Z" fill="#09090b" stroke="#3f3f46" strokeWidth="0.8" />

                            {/* Leather Sports Jacket / Torso (Broader & Taller Chest) */}
                            <path
                              d="M 144 95 Q 152 56, 168 56 L 183 58 L 165 95 Z"
                              fill="#1c1917"
                              stroke="rgba(255, 255, 255, 0.15)"
                              strokeWidth="1.5"
                            />
                            {/* Status Neon Racing Stripe down back */}
                            <path
                              d="M 148 88 Q 156 60, 170 58"
                              stroke={sc.border}
                              strokeWidth="2.5"
                              fill="none"
                              style={{ filter: `drop-shadow(0 0 3px ${sc.border})` }}
                            />

                            {/* 4. Near Arm & Glove (Animate Waving "Bye-Bye" every few seconds) */}
                            <g className="animate-rider-wave">
                              {/* Near Arm Sleeve (Thicker Adult Arm) */}
                              <path d="M 170 59 Q 198 52 226 42" stroke="#1c1917" strokeWidth="9" strokeLinecap="round" fill="none" />
                              <path d="M 170 59 Q 198 52 226 42" stroke={sc.border} strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ filter: `drop-shadow(0 0 2px ${sc.border})` }} />

                              {/* Leather Glove gripping handlebar */}
                              <path
                                d="M 222 41 C 220 37, 228 37, 229 42 L 224 45 Z"
                                fill="#27272a"
                                stroke="#3f3f46"
                                strokeWidth="0.8"
                              />
                            </g>

                            {/* Leg & Sports Knee Sliders (Thicker Adult Legs) */}
                            <path d="M 155 95 Q 185 107 194 116" stroke="#1c1917" strokeWidth="11" strokeLinecap="round" fill="none" />
                            <path
                              d="M 182 103 C 185 99, 192 102, 192 107"
                              stroke={sc.border}
                              strokeWidth="2.5"
                              fill="none"
                              style={{ filter: `drop-shadow(0 0 2px ${sc.border})` }}
                            />

                            {/* Detailed Heavy Leather Riding Boot (on Floorboard - Larger) */}
                            <path
                              d="M 191 114 L 204 117 L 204 122 L 188 122 Z"
                              fill="#09090b"
                              stroke="#71717a"
                              strokeWidth="1.2"
                            />
                            <rect x="195" y="117" width="5" height="2" rx="0.5" fill="#a1a1aa" /> {/* Boot Buckle */}

                            {/* Address Decal Floating Above Scooter Seat */}
                            <g style={{ pointerEvents: 'auto' }}>
                              <foreignObject x="90" y="122" width="110" height="28">
                                <div className="w-full h-full flex items-center justify-center text-center">
                                  <span className="text-[7.5px] font-black text-white leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                                    {order.address || '—'}
                                  </span>
                                </div>
                              </foreignObject>
                            </g>

                            {/* Neon Exhaust Flames (Active only when in progress/moving) */}
                            {dStatus !== 'delivered' && (
                              <path
                                d="M 38 145 C 22 140, 25 152, 12 142 C 24 156, 20 148, 38 152 Z"
                                fill={sc.dot}
                                fillOpacity="0.8"
                                className="animate-pulse"
                                style={{ filter: `drop-shadow(0 0 5px ${sc.border})` }}
                              />
                            )}

                            {/* Dynamic scrolling road beneath wheels with status glow */}
                            <line x1="15" y1="184" x2="295" y2="184" stroke={sc.border} strokeWidth="2.5" strokeDasharray="8,6" className="animate-road" opacity="0.8" style={{ filter: `drop-shadow(0 0 3px ${sc.border})` }} />
                            <line x1="15" y1="188" x2="295" y2="188" stroke="rgba(39, 39, 42, 0.25)" strokeWidth="1.2" />
                          </svg>

                          {/* ── Perfectly Centered, Smooth-Spinning HTML Tires ── */}
                          {/* Rear Tire (Holds Active TIMER) */}
                          <div
                            className="absolute left-[34px] top-[125px] w-[50px] h-[50px] rounded-full bg-[#09090b] flex items-center justify-center border-4 shadow-xl overflow-hidden z-20 pointer-events-auto"
                            style={{ borderColor: sc.border }}
                          >
                            {/* Smooth spinning mathematical spokes (Zero wobble) */}
                            <svg className="absolute inset-0 w-full h-full animate-wheel" viewBox="0 0 50 50">
                              <circle cx="25" cy="25" r="16" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
                              {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
                                const rad = (a * Math.PI) / 180;
                                return (
                                  <line
                                    key={a}
                                    x1="25"
                                    y1="25"
                                    x2={25 + 20 * Math.cos(rad)}
                                    y2={25 + 20 * Math.sin(rad)}
                                    stroke="rgba(255, 255, 255, 0.3)"
                                    strokeWidth="1.8"
                                  />
                                );
                              })}
                            </svg>
                            {/* Flat readable timer in center */}
                            <div className="absolute inset-0 flex items-center justify-center z-10 text-center">
                              <span className="text-[9px] font-mono font-black text-white tracking-tighter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)]">
                                <TableTimer startTime={order.startTime} />
                              </span>
                            </div>
                          </div>

                          {/* Yellow License Plate (COD/ONLINE Payment Method) - Rendered over tire to prevent overlapping coverage */}
                          <div className="absolute left-[12px] top-[128px] w-[30px] h-[14px] rounded-[3px] bg-[#fbbf24] border border-[#1e1b4b] flex items-center justify-center font-mono font-black text-[7.5px] text-[#1e1b4b] z-30 shadow-md">
                            {pay.toUpperCase()}
                          </div>

                          {/* Front Tire (Holds Active Rs Subtotal) */}
                          <div
                            className="absolute left-[212px] top-[125px] w-[50px] h-[50px] rounded-full bg-[#09090b] flex items-center justify-center border-4 shadow-xl overflow-hidden z-20 pointer-events-auto"
                            style={{ borderColor: sc.border }}
                          >
                            {/* Smooth spinning mathematical spokes (Zero wobble) */}
                            <svg className="absolute inset-0 w-full h-full animate-wheel" viewBox="0 0 50 50">
                              <circle cx="25" cy="25" r="16" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
                              {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
                                const rad = (a * Math.PI) / 180;
                                return (
                                  <line
                                    key={a}
                                    x1="25"
                                    y1="25"
                                    x2={25 + 20 * Math.cos(rad)}
                                    y2={25 + 20 * Math.sin(rad)}
                                    stroke="rgba(255, 255, 255, 0.3)"
                                    strokeWidth="1.8"
                                  />
                                );
                              })}
                            </svg>
                            {/* Flat readable subtotal inside */}
                            <div className="absolute inset-0 flex items-center justify-center z-10 text-center">
                              <span className="text-[8.5px] font-black text-emerald-400 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)]">
                                {sub > 0 ? `Rs ${sub}` : 'Empty'}
                              </span>
                            </div>
                          </div>

                          {/* Delete button (floating elegantly on top right) */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeDeliveryOrder(order.id);
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-30"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}


          {/* Toast */}
          {toastMessage && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10">
              <AlertCircle size={18} className={toastMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'} />
              <span className="font-bold text-sm tracking-wide">{toastMessage.message}</span>
              <button onClick={() => setToastMessage(null)} className="ml-2 text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
            </div>
          )}

          {/* Bill Request Popup Notification */}
          {billRequestAlert && (
            <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-red-500/30 p-4 rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.2)] flex flex-col gap-3 animate-slideIn">
              <div className="flex items-start gap-3">
                <span className="text-xl text-red-500 animate-pulse mt-0.5">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Bill Requested</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 font-medium">Table {billRequestAlert.tableNumber} ({billRequestAlert.area}) has requested the checkout bill.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewBillRequest(billRequestAlert.tableNumber)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  View Details & Print
                </button>
                <button
                  onClick={() => setBillRequestAlert(null)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {/* Cancel Requests Floating Badge — Cashier & Admin Only */}
          {(currentUser?.role === 'cashier' || currentUser?.role === 'admin') && (
            <button
              onClick={() => {
                localStorage.setItem('returns_pending_initial_tab', 'cancel-requests');
                if (navigateTo) navigateTo('returns');
              }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all font-black text-xs uppercase tracking-wider"
              style={{
                background: pendingCancelCount > 0 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1c1917',
                color: '#fff',
                boxShadow: pendingCancelCount > 0 ? '0 8px 32px rgba(239,68,68,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
                animation: pendingCancelCount > 0 ? 'pulse 2s infinite' : 'none',
              }}
            >
              <AlertTriangle size={14} />
              Cancel Requests
              {pendingCancelCount > 0 && (
                <span className="bg-white text-red-600 font-black text-xs px-2 py-0.5 rounded-full ml-1">{pendingCancelCount}</span>
              )}
            </button>
          )}

          {/* Cancel Requests Panel Modal */}
          {cancelRequestsOpen && (
            <CancelRequestsPanel
              currentUser={currentUser}
              onClose={() => {
                setCancelRequestsOpen(false);
                // Refresh badge count after closing
                fetch(`${API_BASE}/orders/cancel-requests?status=pending`)
                  .then(r => r.json()).then(d => setPendingCancelCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default POSLayout;
