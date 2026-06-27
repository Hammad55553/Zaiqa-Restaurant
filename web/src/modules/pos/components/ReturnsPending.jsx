import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Trash2, ShieldAlert, Archive, CheckCircle2, ShoppingBag, Clock, FileText, Ban, ExternalLink, RefreshCw, Send, Check, XCircle, User, Printer } from 'lucide-react';
import { createPortal } from 'react-dom';
import ReceiptSlip from './ReceiptSlip';

import { API_BASE } from '../../../config';

const ReturnsPending = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('returns_pending_initial_tab');
    localStorage.removeItem('returns_pending_initial_tab');
    return saved || 'pending';
  }); // 'pending', 'cancelled', 'waste', 'voided', 'cancel-requests'
  const [orders, setOrders] = useState([]);
  const [wasteList, setWasteList] = useState([]);
  const [outflowList, setOutflowList] = useState([]);
  const [voidedList, setVoidedList] = useState([]);
  const [cancelRequests, setCancelRequests] = useState([]);
  const [tablesList, setTablesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // KOT Print States
  const [selectedKOTOrder, setSelectedKOTOrder] = useState(null);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [lastPrintedOrderId, setLastPrintedOrderId] = useState(null);
  const [printConfirmStatus, setPrintConfirmStatus] = useState('success');
  const [printConfirmReason, setPrintConfirmReason] = useState('paper_roll_empty');
  const [printData, setPrintData] = useState(null);
  const receiptRef = React.useRef(null);

  // KOT Print Status Updater
  const updateKOTStatus = async (orderId, status, reason = null, incrementCount = false) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/kot-print-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status,
          error_reason: reason,
          increment_count: incrementCount
        })
      });
      if (res.ok) {
        fetchData();
        if (selectedKOTOrder && selectedKOTOrder.id === orderId) {
          setSelectedKOTOrder(prev => ({
            ...prev,
            kot_print_status: status,
            kot_print_error_reason: reason,
            kot_print_count: incrementCount ? (prev.kot_print_count || 0) + 1 : prev.kot_print_count
          }));
        }
      } else {
        console.error("Failed to update KOT print status on server");
      }
    } catch (err) {
      console.error("Error updating KOT status:", err);
    }
  };

  // Trigger Reprint KOT
  const triggerKOTReprint = (order) => {
    const nextCount = (order.kot_print_count || 0) + 1;
    const displayItems = (order.items || []).map(item => ({
      qty: item.quantity,
      name: item.item_name,
      price: item.price || 0,
      notes: item.notes || ''
    }));

    const data = {
      isKOT: true,
      orderId: order.id,
      date: order.created_at || new Date().toISOString(),
      table: order.table_number ? `Table ${order.table_number}` : 'Delivery / Walk-in',
      items: displayItems,
      printCount: nextCount,
      kotStatus: order.kot_print_status,
      kotReason: order.kot_print_error_reason
    };

    setPrintData(data);
    setLastPrintedOrderId(order.id);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintData(null);
        updateKOTStatus(order.id, 'success', null, true);
      }, 1000);
    }, 300);
  };

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [refundRaw, setRefundRaw] = useState(true);
  const [logWaste, setLogWaste] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer Cancelled');

  // Sell Waste Item Modal State
  const [sellModalItem, setSellModalItem] = useState(null);
  const [sellQty, setSellQty] = useState(1);

  // Outflow/Discard Waste Item Modal State
  const [outflowModalItem, setOutflowModalItem] = useState(null);
  const [outflowQty, setOutflowQty] = useState(1);
  const [outflowDestination, setOutflowDestination] = useState('Staff Consumed');
  const [outflowNotes, setOutflowNotes] = useState('');

  // Custom Approve/Reject Modal States for Cancel Requests
  const [approveModalReq, setApproveModalReq] = useState(null);
  const [approveRemark, setApproveRemark] = useState('');
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearVoidedLog = async (id) => {
    if (!window.confirm('Delete this voided item log entry?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/voided-items/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Voided log entry deleted', 'success');
        fetchData();
      } else {
        showToast('Failed to delete voided log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting voided log', 'error');
    }
  };

  // Load user role
  let currentUser = { role: 'cashier', username: 'Cashier' };
  try {
    const saved = localStorage.getItem('pos_current_user');
    if (saved) {
      currentUser = JSON.parse(saved);
    }
  } catch (e) {}

  const isAdmin = currentUser.role === 'admin';
  const canApprove = (req) => {
    const role = currentUser.role || 'cashier';
    if (req.order_status === 'ready' || req.order_status === 'completed') return role === 'admin';
    return role === 'cashier' || role === 'admin';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch returns & pending
      const res = await fetch(`${API_BASE}/orders/returns-pending`);
      let fetchedOrders = [];
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        fetchedOrders = data.orders || [];
        setWasteList(data.waste || []);
        setOutflowList(data.outflows || []);
      }

      // 1.1 Fetch voided items
      try {
        const voidedRes = await fetch(`${API_BASE}/orders/voided-items`);
        if (voidedRes.ok) {
          const voidedData = await voidedRes.json();
          setVoidedList(voidedData || []);
        }
      } catch (voidErr) {
        console.error("Failed to fetch voided items:", voidErr);
      }

      // 1.2 Fetch cancel requests
      try {
        const crRes = await fetch(`${API_BASE}/orders/cancel-requests`);
        if (crRes.ok) setCancelRequests(await crRes.json());
      } catch (crErr) {
        console.error("Failed to fetch cancel requests:", crErr);
      }
      
      // 2. Fetch tables list
      const tablesRes = await fetch(`${API_BASE}/tables`);
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        
        // Dynamic status overlay for active dining tables
        const activeOrders = fetchedOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
        activeOrders.forEach(order => {
          if (order.table_number) {
            const t = tablesData.find(tb => tb.table_number === order.table_number);
            if (t) {
              t.status = 'dining';
            }
          }
        });

        setTablesList(tablesData || []);
      }
    } catch (err) {
      console.error('Failed to fetch returns/pending data:', err);
      showToast('Error loading returns/pending data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelOrder = async () => {
    if (!cancelModalOrder) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${cancelModalOrder.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_raw: refundRaw,
          log_waste: logWaste,
          reason: cancelReason
        })
      });

      if (res.ok) {
        showToast('Order successfully cancelled!', 'success');
        setCancelModalOrder(null);
        fetchData();
      } else {
        showToast('Failed to cancel order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error cancelling order', 'error');
    }
  };

  const submitApproval = async () => {
    if (!approveModalReq) return;
    if (!approveRemark.trim()) {
      showToast('Remarks are required to approve cancellation!', 'error');
      return;
    }
    const wasStarted = ['preparing', 'ready', 'completed'].includes(approveModalReq.order_status);
    try {
      const res = await fetch(`${API_BASE}/orders/cancel-requests/${approveModalReq.id}/approve`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resolved_by: currentUser?.username || 'Staff', 
          resolved_role: currentUser?.role || 'cashier', 
          refund_raw: wasStarted, 
          log_waste: wasStarted,
          resolve_remark: approveRemark.trim()
        })
      });
      const d = await res.json();
      if (res.ok) { 
        showToast('Approved & order cancelled', 'success'); 
        setApproveModalReq(null);
        setApproveRemark('');
        fetchData(); 
      }
      else showToast(d.error || 'Failed to approve', 'error');
    } catch {
      showToast('Network error', 'error');
    }
  };

  const submitRejection = async () => {
    if (!rejectModalReq) return;
    try {
      const res = await fetch(`${API_BASE}/orders/cancel-requests/${rejectModalReq.id}/reject`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resolved_by: currentUser?.username || 'Staff', 
          reject_reason: rejectRemark.trim() || 'Rejected by staff' 
        })
      });
      const d = await res.json();
      if (res.ok) { 
        showToast('Request rejected', 'success'); 
        setRejectModalReq(null);
        setRejectRemark('');
        fetchData(); 
      }
      else showToast(d.error || 'Failed to reject', 'error');
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this cancelled order from history?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Order permanently deleted from history', 'success');
        fetchData();
      } else {
        showToast('Failed to delete order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting order', 'error');
    }
  };

  const handleDeleteWasteLog = async (id) => {
    if (!window.confirm('Delete this prepared waste entry?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/prepared-waste/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Waste log entry deleted', 'success');
        fetchData();
      } else {
        showToast('Failed to delete waste log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting waste log', 'error');
    }
  };

  const handleDeleteOutflowLog = async (id) => {
    if (!window.confirm('Delete this waste outflow history record?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/prepared-waste-outflow/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Outflow history record deleted', 'success');
        fetchData();
      } else {
        showToast('Failed to delete outflow log', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting outflow log', 'error');
    }
  };

  const handleConfirmSell = (tableNumber) => {
    if (!sellModalItem) return;
    
    // Save selling item info to local storage
    localStorage.setItem('zaiqa_mahal_pending_waste_sell', JSON.stringify({
      name: sellModalItem.item_name,
      qty: sellQty
    }));

    if (tableNumber) {
      // Save target table to local storage
      localStorage.setItem('zaiqa_mahal_pending_waste_sell_target', JSON.stringify({
        type: 'table',
        tableNumber: tableNumber
      }));
      showToast(`Selling ${sellQty}x ${sellModalItem.item_name} on Table ${tableNumber}...`, 'success');
    } else {
      // New walk-in/delivery order
      localStorage.setItem('zaiqa_mahal_pending_waste_sell_target', JSON.stringify({
        type: 'new'
      }));
      showToast(`Selling ${sellQty}x ${sellModalItem.item_name} as a new order...`, 'success');
    }

    setSellModalItem(null);
    onBack(); // Go back to POS layout
  };

  const handleConfirmOutflow = async () => {
    if (!outflowModalItem) return;
    try {
      const res = await fetch(`${API_BASE}/orders/prepared-waste/${outflowModalItem.id}/outflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: outflowQty,
          destination: outflowDestination,
          notes: outflowNotes
        })
      });

      if (res.ok) {
        showToast('Waste outflow recorded successfully!', 'success');
        setOutflowModalItem(null);
        fetchData();
      } else {
        showToast('Failed to record waste outflow', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error recording waste outflow', 'error');
    }
  };

  const pendingOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  return (
    <div className="absolute inset-0 bg-zinc-950 p-6 flex flex-col overflow-hidden text-zinc-100 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Ban className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" size={28} /> Returns & Pending Bills
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Manage unpaid active bills, cancellations, stock refunds, and prepared food waste logs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all shadow-md active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all border border-zinc-700/50 shadow-lg active:scale-95"
          >
            Back to POS
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold shadow-[0_0_20px_rgba(249,115,22,0.25)]'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          Pending / Unpaid ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 ${
            activeTab === 'cancelled'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          Cancelled & Returned ({cancelledOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('waste')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 ${
            activeTab === 'waste'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          Prepared Waste & Outflow ({wasteList.length})
        </button>
        <button
          onClick={() => setActiveTab('voided')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 ${
            activeTab === 'voided'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-[0_0_20px_rgba(124,58,237,0.25)]'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          Voided Items ({voidedList.length})
        </button>
        <button
          onClick={() => setActiveTab('cancel-requests')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-2 ${
            activeTab === 'cancel-requests'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <AlertTriangle size={12} />
          Cancel Requests ({cancelRequests.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* Security alert for non-admins */}
      {!isAdmin && (
        <div className="mb-4 bg-orange-950/20 border border-orange-500/20 rounded-xl p-3.5 text-xs flex items-center gap-3 text-orange-400 shadow-md">
          <ShieldAlert size={18} className="shrink-0" />
          <span className="font-medium"><strong>Read-Only Mode:</strong> Only System Administrators can process cancellations, adjust raw stock, or delete entries.</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="text-center py-16 text-zinc-500 text-sm font-bold animate-pulse">Loading records...</div>
        ) : activeTab === 'pending' ? (
          pendingOrders.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm font-bold bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-800">No pending unpaid bills.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Order #{order.id}</span>
                        <h3 className="text-sm font-black text-white mt-1 uppercase tracking-wide">
                          {order.table_number ? `Table ${order.table_number}` : 'Delivery / Walk-in'}
                        </h3>
                        <span className="text-[9px] text-zinc-500 font-bold block mt-1">{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        order.status === 'ready' 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                          : 'bg-orange-950/60 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-b border-zinc-800/60 py-3 my-3">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                          <span className="text-zinc-300 font-medium">
                            {item.quantity}x {item.item_name} {item.isFromPreparedWaste && <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/10 rounded uppercase tracking-widest ml-1">prepared stock</span>}
                          </span>
                          <span className="font-extrabold text-zinc-400">Rs. {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 space-y-3">
                    {/* KOT Print Status Badge */}
                    <div className="flex items-center justify-between text-[11px] bg-zinc-950/40 p-2 rounded-xl border border-zinc-850">
                      <span className="text-zinc-400 font-bold">KOT Print Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        order.kot_print_status === 'success' 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' 
                          : order.kot_print_status === 'failed' 
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {order.kot_print_status === 'success' 
                          ? `Printed (${order.kot_print_count || 1}x)` 
                          : order.kot_print_status === 'failed' 
                            ? `Failed: ${order.kot_print_error_reason || 'Unknown'}` 
                            : 'Not Printed'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-black uppercase tracking-wider">TOTAL AMOUNT</span>
                      <span className="text-base font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.2)]">Rs. {order.total_amount}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const orderStatus = order.status;
                          const isPreparing = orderStatus === 'preparing';
                          const isReady = orderStatus === 'ready';
                          const isCompleted = orderStatus === 'completed';
                          const canCancel = !(isReady || isCompleted) || isAdmin;

                          if (!canCancel) {
                            showToast('Access denied. Only Admin can cancel ready or completed orders.', 'error');
                            return;
                          }
                          setCancelModalOrder(order);
                          setCancelReason('Customer Cancelled');
                          setRefundRaw(isPreparing || isReady || isCompleted);
                          setLogWaste(isPreparing || isReady || isCompleted);
                        }}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95 ${
                          (isAdmin || !(order.status === 'ready' || order.status === 'completed')) 
                            ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg hover:brightness-110' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
                        }`}
                      >
                        Cancel Order
                      </button>

                      <button
                        onClick={() => setSelectedKOTOrder(order)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:brightness-110 text-white rounded-xl font-black text-[11px] uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Printer size={13} /> Kitchen Slip
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'cancelled' ? (
          cancelledOrders.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm font-bold bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-800">No cancelled orders.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cancelledOrders.map(order => (
                <div key={order.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between opacity-85 hover:opacity-100 hover:border-zinc-700 transition-all duration-350">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Order #{order.id}</span>
                        <h3 className="text-sm font-black text-zinc-300 mt-1 uppercase tracking-wide">
                          {order.table_number ? `Table ${order.table_number}` : 'Delivery / Walk-in'}
                        </h3>
                        <span className="text-[9px] text-zinc-500 font-medium block mt-1">{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-red-950/40 text-red-500 border border-red-500/10">
                        Cancelled
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-b border-zinc-800/60 py-3 my-3">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-zinc-400 font-medium">
                          <span>{item.quantity}x {item.item_name}</span>
                          <span className="font-bold">Rs. {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-4">
                      <span className="text-zinc-500 font-black uppercase tracking-wider">CANCELLED TOTAL</span>
                      <span className="text-sm font-black text-zinc-400">Rs. {order.total_amount}</span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="w-full py-2 bg-zinc-800 hover:bg-red-950/30 hover:text-red-500 hover:border-red-500/20 text-zinc-400 border border-zinc-750 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Trash2 size={13} /> Delete Log
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'waste' ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Prepared Waste Stock */}
            <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/60 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-amber-500 pl-3">
                  Prepared Waste Items (Available to resell or consume)
                </h2>
              </div>
              {wasteList.length === 0 ? (
                <div className="text-center py-12 bg-zinc-950/45 border border-zinc-850 border-dashed rounded-xl text-zinc-500 text-xs font-bold">
                  No active prepared waste food stock.
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[9px] tracking-wider border-b border-zinc-850">
                      <tr>
                        <th className="p-4 font-black">Item Name</th>
                        <th className="p-4 text-center font-black">Qty Wasted</th>
                        <th className="p-4 font-black">Reason / Notes</th>
                        <th className="p-4 font-black">Logged At</th>
                        <th className="p-4 text-right font-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {wasteList.map(waste => (
                        <tr key={waste.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="p-4 text-white font-extrabold text-xs">{waste.item_name}</td>
                          <td className="p-4 text-center font-black text-amber-500 text-xs">{waste.quantity}x</td>
                          <td className="p-4 text-zinc-400 italic font-medium">{waste.reason || 'N/A'}</td>
                          <td className="p-4 text-zinc-500 font-medium">{new Date(waste.created_at).toLocaleString()}</td>
                          <td className="p-4 text-right flex justify-end items-center gap-2">
                            <button
                              onClick={() => {
                                setSellModalItem(waste);
                                setSellQty(1);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
                            >
                              Sell / Assign
                            </button>
                            <button
                              onClick={() => {
                                setOutflowModalItem(waste);
                                setOutflowQty(1);
                                setOutflowDestination('Staff Consumed');
                                setOutflowNotes('');
                              }}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                            >
                              Log Outflow
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteWasteLog(waste.id)}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete Log"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Outflow History */}
            <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/60 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-zinc-500 pl-3">
                  Waste Outflow & Consumption History
                </h2>
              </div>
              {outflowList.length === 0 ? (
                <div className="text-center py-12 bg-zinc-950/45 border border-zinc-850 border-dashed rounded-xl text-zinc-500 text-xs font-bold">
                  No outflow logs found.
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[9px] tracking-wider border-b border-zinc-850">
                      <tr>
                        <th className="p-4 font-black">Item Name</th>
                        <th className="p-4 text-center font-black">Qty</th>
                        <th className="p-4 font-black">Destination</th>
                        <th className="p-4 font-black">Notes / Remarks</th>
                        <th className="p-4 font-black">Logged At</th>
                        {isAdmin && <th className="p-4 text-right font-black">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {outflowList.map(outflow => (
                        <tr key={outflow.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="p-4 text-white font-extrabold text-xs">{outflow.item_name}</td>
                          <td className="p-4 text-center font-bold text-zinc-300">{outflow.quantity}x</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              outflow.destination === 'Staff Consumed' ? 'bg-blue-950/60 text-blue-400 border border-blue-500/20' :
                              outflow.destination === 'Owner Consumed' || outflow.destination === 'Owner Taken' ? 'bg-purple-950/60 text-purple-400 border border-purple-500/20' :
                              outflow.destination === 'Spoiled/Discarded' ? 'bg-red-950/60 text-red-400 border border-red-500/20' :
                              'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {outflow.destination}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-400 italic font-medium">{outflow.notes || 'N/A'}</td>
                          <td className="p-4 text-zinc-500 font-medium">{new Date(outflow.created_at).toLocaleString()}</td>
                          {isAdmin && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteOutflowLog(outflow.id)}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete Outflow Log"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'voided' ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Voided Items Log */}
            <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/60 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-purple-500 pl-3">
                  Voided Items Audit Trail (Removed from sent orders)
                </h2>
              </div>
              {voidedList.length === 0 ? (
                <div className="text-center py-12 bg-zinc-950/45 border border-zinc-850 border-dashed rounded-xl text-zinc-500 text-xs font-bold">
                  No voided items recorded.
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[9px] tracking-wider border-b border-zinc-850">
                      <tr>
                        <th className="p-4 font-black">Order ID</th>
                        <th className="p-4 font-black">Item Name</th>
                        <th className="p-4 text-center font-black">Qty Removed</th>
                        <th className="p-4 font-black">Price (each)</th>
                        <th className="p-4 font-black">Reason / Admin Remark</th>
                        <th className="p-4 font-black">Voided At</th>
                        {isAdmin && <th className="p-4 text-right font-black">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {voidedList.map(item => (
                        <tr key={item.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="p-4 text-zinc-400 font-extrabold text-xs">#{item.order_id}</td>
                          <td className="p-4 text-white font-extrabold text-xs">{item.item_name}</td>
                          <td className="p-4 text-center font-black text-red-500 text-xs">{item.quantity}x</td>
                          <td className="p-4 text-zinc-300 font-medium">Rs. {item.price}</td>
                          <td className="p-4 text-zinc-400 italic font-medium">{item.admin_remark || 'N/A'}</td>
                          <td className="p-4 text-zinc-500 font-medium">{new Date(item.voided_at).toLocaleString()}</td>
                          {isAdmin && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleClearVoidedLog(item.id)}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete Log Entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* CANCEL REQUESTS TAB (Moved inside scrollable container) */}
        {activeTab === 'cancel-requests' && (
          <div className="grid grid-cols-1 gap-4 animate-fadeIn">
            {cancelRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-800">
                <AlertTriangle size={40} className="mb-3 text-zinc-650" />
                <p className="text-sm font-bold">No cancel requests found</p>
              </div>
            ) : cancelRequests.map(req => {
              const statusColors = {
                pending:  { bg: 'bg-amber-950/40',  text: 'text-amber-400',   border: 'border-amber-500/20', dot: 'bg-amber-500' },
                approved: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
                rejected: { bg: 'bg-red-950/40',     text: 'text-red-400',     border: 'border-red-500/20', dot: 'bg-red-500' },
              };
              const sc = statusColors[req.status] || statusColors.pending;
              const needsAdmin = ['preparing', 'ready', 'completed'].includes(req.order_status);

              return (
                <div key={req.id} className={`bg-zinc-900/60 border ${sc.border} rounded-2xl p-5 hover:border-zinc-700 hover:shadow-2xl transition-all duration-300 flex flex-col lg:flex-row justify-between gap-6`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Order #{req.order_id}</span>
                      <span className="text-zinc-700">•</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-[10px] font-black uppercase ${sc.text}`}>{req.status}</span>
                      </div>
                      {req.order_status && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-lg uppercase">{req.order_status}</span>
                        </>
                      )}
                      {needsAdmin && (
                        <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">Admin Only</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 mb-2">
                      <span className="flex items-center gap-1"><User size={12}/> {req.requested_by} ({req.requested_role})</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {new Date(req.created_at).toLocaleString()}</span>
                    </div>

                    {req.table_number && (
                      <p className="text-xs text-zinc-350 font-black bg-zinc-950/40 px-3 py-1.5 rounded-xl inline-block border border-zinc-850/50">
                        Table {req.table_number} · <span className="text-orange-500">{req.area}</span>
                      </p>
                    )}

                    {req.reason && (
                      <div className="mt-3 bg-zinc-950/40 border-l-2 border-orange-500 rounded-r-xl px-4 py-2.5 text-xs text-zinc-300 italic">
                        "{req.reason}"
                      </div>
                    )}

                    {req.resolved_by && (
                      <div className={`mt-3 p-3 rounded-xl border text-[11px] flex flex-col gap-1.5 ${
                        req.status === 'approved' ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-400' : 'bg-red-950/20 border-red-500/10 text-red-400'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                          <span>{req.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED'} BY:</span>
                          <span className="text-white bg-zinc-800 px-1.5 py-0.5 rounded">{req.resolved_by}</span>
                        </div>
                        {req.resolved_at && <span>Resolved at: {new Date(req.resolved_at).toLocaleString()}</span>}
                        {req.status === 'approved' && req.resolve_remark && <span>Remarks: "{req.resolve_remark}"</span>}
                        {req.status === 'rejected' && req.reject_reason && <span>Reason: "{req.reject_reason}"</span>}
                      </div>
                    )}
                  </div>

                  <div className="w-full lg:w-72 flex flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-zinc-850/60 pt-4 lg:pt-0 lg:pl-6">
                    {req.items && req.items.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-2">Order Items</h4>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                          {req.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-xs">
                              <span className="text-zinc-300 font-medium">{item.item_name} × {item.quantity}</span>
                              <span className="text-zinc-500 font-bold">Rs. {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-850">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Total Bill</span>
                          <span className="text-xs font-black text-orange-500">Rs. {Number(req.total_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {req.status === 'pending' && (isAdmin || canApprove(req)) && (
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => {
                            setApproveRemark('');
                            setApproveModalReq(req);
                          }}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                        >
                          <CheckCircle2 size={12}/> Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectRemark('');
                            setRejectModalReq(req);
                          }}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/10 cursor-pointer"
                        >
                          <XCircle size={12}/> Reject
                        </button>
                      </div>
                    )}

                    {req.status === 'pending' && !isAdmin && !canApprove(req) && (
                      <div className="mt-auto bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider p-2.5 rounded-xl text-center">
                        🔒 Needs Admin Approval
                      </div>
                    )}

                    {req.status === 'rejected' && isAdmin && (
                      <div className="mt-auto">
                        <button
                          onClick={() => {
                            setApproveRemark('');
                            setApproveModalReq(req);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 cursor-pointer border-0"
                        >
                          <CheckCircle2 size={12}/> Override Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sell Modal Dialog */}
      {sellModalItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/85 z-50 p-4 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-3xl max-w-xl w-full p-6 text-zinc-200 flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.7)] animate-zoomIn">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
              Sell / Assign Prepared Item
            </h3>
            <div className="text-xs font-black text-amber-500 mb-5 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 flex justify-between items-center">
              <span>Item: {sellModalItem.item_name}</span>
              <span className="bg-amber-500 text-black px-2 py-0.5 rounded font-black uppercase text-[10px]">Stock: {sellModalItem.quantity}x</span>
            </div>

            {/* Qty Selector */}
            <div className="mb-6">
              <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2.5">
                Quantity to Sell / Assign
              </label>
              <div className="flex flex-wrap gap-2">
                {[...Array(sellModalItem.quantity)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSellQty(i + 1)}
                    className={`px-4 py-2 rounded-xl font-black text-xs border transition-all active:scale-95 cursor-pointer ${
                      sellQty === i + 1
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {i + 1}x
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2.5">
              Select Destination Table or Order
            </label>

            {/* Grid of Tables */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-zinc-800 bg-zinc-950 p-4 rounded-2xl space-y-5 mb-5 shadow-inner">
              <div>
                <button
                  onClick={() => handleConfirmSell(null)}
                  className="w-full p-3 bg-gradient-to-r from-zinc-900 to-zinc-850 hover:from-orange-500 hover:to-amber-500 hover:text-black border border-zinc-805 hover:border-orange-400 text-white rounded-xl text-xs font-black uppercase tracking-wider flex justify-between items-center transition-all cursor-pointer active:scale-[0.98] shadow-md"
                >
                  <span>Create New Order (Walk-in / Delivery)</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* Active Dining tables */}
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block mb-2.5">Active Ongoing Tables</span>
                {tablesList.filter(t => t.status !== 'available').length === 0 ? (
                  <span className="text-[10px] text-zinc-600 block italic pl-1 font-medium">No active tables right now.</span>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {tablesList.filter(t => t.status !== 'available').map(t => {
                      const activeOrd = pendingOrders.find(o => o.table_number === t.table_number);
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleConfirmSell(t.table_number)}
                          className="p-3.5 text-left bg-zinc-900/80 hover:bg-zinc-850 border border-red-500/10 hover:border-orange-500 text-zinc-200 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-md active:scale-95 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                        >
                          <span className="text-xs font-black text-white uppercase">Table {t.table_number}</span>
                          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">Ongoing Order</span>
                          {activeOrd && (
                            <span className="text-[9px] text-zinc-500 font-extrabold mt-1">Bill: Rs. {activeOrd.total_amount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Empty Available tables */}
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block mb-2.5">Empty Available Tables</span>
                {tablesList.filter(t => t.status === 'available').length === 0 ? (
                  <span className="text-[10px] text-zinc-600 block italic pl-1 font-medium">No empty tables available.</span>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {tablesList.filter(t => t.status === 'available').map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleConfirmSell(t.table_number)}
                        className="p-3.5 text-left bg-zinc-900/80 hover:bg-zinc-850 border border-emerald-500/10 hover:border-orange-500 text-zinc-200 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-md active:scale-95 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      >
                        <span className="text-xs font-black text-white uppercase">Table {t.table_number}</span>
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">Start New Bill</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => setSellModalItem(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95 border border-zinc-750 shadow-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outflow Modal Dialog */}
      {outflowModalItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/85 z-50 p-4 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-3xl max-w-md w-full p-6 text-zinc-200 shadow-[0_0_50px_rgba(0,0,0,0.7)] animate-zoomIn">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Archive className="text-zinc-400" /> Log Waste Outflow
            </h3>
            <p className="text-xs text-zinc-400 mb-4 font-medium">
              Record where the prepared waste item went (consumed by staff/owner, spoiled, etc.).
            </p>

            <div className="space-y-4 mb-6">
              {/* Item Info */}
              <div className="text-xs font-bold text-zinc-400 bg-zinc-950 p-3 rounded-2xl border border-zinc-850 flex justify-between items-center">
                <span>Item: <strong className="text-white">{outflowModalItem.item_name}</strong></span>
                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-black text-[10px]">Max: {outflowModalItem.quantity}x</span>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1.5">
                  Quantity Outflowed
                </label>
                <input
                  type="number"
                  min="1"
                  max={outflowModalItem.quantity}
                  value={outflowQty}
                  onChange={(e) => setOutflowQty(Math.min(outflowModalItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-zinc-950 border border-zinc-850 p-2.5 text-xs rounded-xl text-white outline-none focus:border-orange-500 font-extrabold"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1.5">
                  Destination / Outcome
                </label>
                <select
                  value={outflowDestination}
                  onChange={(e) => setOutflowDestination(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 p-2.5 text-xs rounded-xl text-white outline-none focus:border-orange-500 font-extrabold cursor-pointer"
                >
                  <option value="Staff Consumed">Staff Consumed (Worker ate it)</option>
                  <option value="Owner Taken">Owner Taken (Owner/Management took it)</option>
                  <option value="Spoiled/Discarded">Spoiled / Discarded (Thrown away)</option>
                  <option value="Customer Complimentary">Customer Complimentary (Free sample)</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1.5">
                  Notes / Remarks
                </label>
                <textarea
                  value={outflowNotes}
                  onChange={(e) => setOutflowNotes(e.target.value)}
                  rows="2"
                  className="w-full bg-zinc-950 border border-zinc-850 p-2.5 text-xs rounded-xl text-white outline-none focus:border-orange-500 resize-none font-medium"
                  placeholder="e.g. Spoiled due to power cut, worker had it for lunch"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOutflowModalItem(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer border border-zinc-750 transition-all active:scale-95"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmOutflow}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-500/10 hover:brightness-110"
              >
                Log Outflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      {cancelModalOrder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/85 z-50 p-4 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-3xl max-w-md w-full p-6 text-zinc-200 shadow-[0_0_50px_rgba(0,0,0,0.7)] animate-zoomIn">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Ban className="text-red-500" /> Cancel Order #{cancelModalOrder.id}
            </h3>
            <p className="text-xs text-zinc-400 mb-4 font-medium">
              Select how to handle stock deduction and prepared food waste logs.
            </p>

            <div className="space-y-4 mb-6">
              {/* Question 1: Refund raw ingredients */}
              <div className="flex items-start gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-850">
                <input
                  type="checkbox"
                  id="refundRawCheck"
                  checked={refundRaw}
                  onChange={(e) => setRefundRaw(e.target.checked)}
                  className="w-4.5 h-4.5 accent-orange-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <label htmlFor="refundRawCheck" className="text-xs font-black text-white cursor-pointer select-none">
                    Refund Raw Ingredients to Inventory
                  </label>
                  <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                    Recommended if items were NOT cooked. Restores raw ingredients back to stock.
                  </p>
                </div>
              </div>

              {/* Question 2: Log as waste */}
              <div className="flex items-start gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-850">
                <input
                  type="checkbox"
                  id="logWasteCheck"
                  checked={logWaste}
                  onChange={(e) => setLogWaste(e.target.checked)}
                  className="w-4.5 h-4.5 accent-orange-500 rounded mt-0.5 cursor-pointer"
                />
                <div>
                  <label htmlFor="logWasteCheck" className="text-xs font-black text-white cursor-pointer select-none">
                    Log Wasted Prepared Food
                  </label>
                  <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                    Recommended if items were cooked/prepared. Leaves raw stock consumed, and records items to Prepared Waste list.
                  </p>
                </div>
              </div>

              {/* Cancel Reason */}
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1.5">
                  Reason for Cancellation
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 p-2.5 text-xs rounded-xl text-white outline-none focus:border-orange-500 font-semibold"
                  placeholder="e.g. Customer walked out"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95 border border-zinc-750"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-lg shadow-red-500/10"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Remarks Modal */}
      {approveModalReq && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[100] p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-zinc-200 flex flex-col shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1 text-emerald-500">
              Approve Cancellation
            </h3>
            <p className="text-[10px] text-zinc-500 mb-4 font-medium">Order #{approveModalReq.order_id} — Please enter the reason for approval.</p>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white resize-none outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
              rows={3}
              placeholder="Remarks / Reason for approval (Mandatory)..."
              value={approveRemark}
              onChange={e => setApproveRemark(e.target.value)}
            />
            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => setApproveModalReq(null)} 
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all active:scale-95 border border-zinc-750"
              >
                Cancel
              </button>
              <button 
                onClick={submitApproval} 
                disabled={!approveRemark.trim()} 
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-850 disabled:text-zinc-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
              >
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Remarks Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[100] p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-zinc-200 flex flex-col shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1 text-red-500">
              Reject Cancellation
            </h3>
            <p className="text-[10px] text-zinc-500 mb-4 font-medium">Order #{rejectModalReq.order_id} — Please enter the rejection reason.</p>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white resize-none outline-none focus:ring-1 focus:ring-red-500 font-semibold"
              rows={3}
              placeholder="Reason for rejection (optional)..."
              value={rejectRemark}
              onChange={e => setRejectRemark(e.target.value)}
            />
            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => setRejectModalReq(null)} 
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all active:scale-95 border border-zinc-750"
              >
                Cancel
              </button>
              <button 
                onClick={submitRejection} 
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-lg shadow-red-500/10"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedKOTOrder && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl w-full max-w-md shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3 shrink-0">
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Printer className="text-orange-500" size={20} /> Kitchen Slip (KOT)
              </h3>
              <button 
                onClick={() => setSelectedKOTOrder(null)} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle size={22} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-6 flex flex-col w-full">
              {/* Clean Dark Details Container instead of white receipt preview */}
              <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800 w-full space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>ORDER: #{selectedKOTOrder.id}</span>
                  <span>TABLE: {selectedKOTOrder.table_number ? `Table ${selectedKOTOrder.table_number}` : 'Delivery / Walk-in'}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{new Date(selectedKOTOrder.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  {selectedKOTOrder.kot_print_count > 0 && (
                    <span className="text-orange-500 font-extrabold uppercase tracking-wider text-[10px]">
                      {selectedKOTOrder.kot_print_count > 1 ? `REPRINT #${selectedKOTOrder.kot_print_count}` : `ORIGINAL #${selectedKOTOrder.kot_print_count}`}
                    </span>
                  )}
                </div>
                
                <div className="border-t border-zinc-850 my-3" />
                
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <span>Item Name</span>
                    <span>Qty</span>
                  </div>
                  
                  {(selectedKOTOrder.items || []).filter(item => item.item_name !== 'Service Charges').map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>{item.item_name}</span>
                        <span className="text-orange-500 text-sm font-black">{item.quantity}x</span>
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-zinc-400 italic font-medium pl-2 border-l border-orange-500/40">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Status Update / Reprint Config */}
              <div className="w-full mt-6 space-y-4">
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Update Print Status</span>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        await updateKOTStatus(selectedKOTOrder.id, 'success', null, false);
                        showToast("KOT status updated to Success", "success");
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        selectedKOTOrder.kot_print_status === 'success' 
                          ? 'bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-500/20' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Success
                    </button>
                    <button 
                      onClick={() => {
                        setPrintConfirmStatus('failed');
                        setShowPrintConfirm(true);
                        setLastPrintedOrderId(selectedKOTOrder.id);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        selectedKOTOrder.kot_print_status === 'failed' 
                          ? 'bg-rose-500 text-white font-extrabold shadow-lg shadow-rose-500/20' 
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Failed
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-4 border-t border-zinc-800 pt-4 shrink-0">
              <button 
                onClick={() => setSelectedKOTOrder(null)} 
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer border border-zinc-750"
              >
                Close
              </button>
              
              <button 
                onClick={() => {
                  triggerKOTReprint(selectedKOTOrder);
                }}
                className="flex-[2] py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer border-0"
              >
                <Printer size={15} /> Reprint KOT
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintConfirm && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-slideUp">
            <h4 className="text-base font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              ⚠️ Verify KOT Print Status
            </h4>
            <p className="text-xs text-zinc-400 mb-4">Did the kitchen slip print successfully for Order #{lastPrintedOrderId}?</p>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    await updateKOTStatus(lastPrintedOrderId, 'success', null, true);
                    setShowPrintConfirm(false);
                    showToast("Print success recorded!", "success");
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  Yes, Printed
                </button>
                <button 
                  onClick={() => setPrintConfirmStatus('failed')}
                  className={`flex-1 py-3 border font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer ${
                    printConfirmStatus === 'failed' 
                      ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  No, Failed
                </button>
              </div>
              
              {printConfirmStatus === 'failed' && (
                <div className="space-y-3 bg-zinc-950/60 p-4.5 rounded-2xl border border-zinc-800/80 animate-fadeIn">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Select Failure Reason:</label>
                  <select 
                    value={printConfirmReason} 
                    onChange={e => setPrintConfirmReason(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="paper_roll_empty">🧻 Paper Roll Empty / Finished</option>
                    <option value="printer_offline">🔌 Printer Offline / Disconnected</option>
                    <option value="printer_jammed">💥 Printer Jammed</option>
                    <option value="other_reason">❓ Other Hardware Error</option>
                  </select>
                  
                  <button 
                    onClick={async () => {
                      const reasonMap = {
                        paper_roll_empty: 'Paper Roll Empty',
                        printer_offline: 'Printer Offline',
                        printer_jammed: 'Printer Jammed',
                        other_reason: 'Other Error'
                      };
                      await updateKOTStatus(lastPrintedOrderId, 'failed', reasonMap[printConfirmReason] || 'Unknown Error', false);
                      setShowPrintConfirm(false);
                      showToast("Print failure recorded.", "error");
                    }}
                    className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-rose-500 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 mt-2 cursor-pointer"
                  >
                    Confirm Failed Status
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl text-[10px] font-black uppercase border tracking-widest transition-all duration-300 animate-slideUp ${
          toast.type === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-400' : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default ReturnsPending;
