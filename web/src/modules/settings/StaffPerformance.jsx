import React, { useState, useEffect } from 'react';
import { User, Shield, Clipboard, CreditCard, Search, Calendar, RefreshCw, Eye, Printer, Award, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { API_BASE } from '../../config';
import ReceiptSlip from '../pos/components/ReceiptSlip';

const StaffPerformance = () => {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'weekly' | 'monthly' | 'all'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      setUsers(usersData);

      // Fetch last 1000 orders for detailed reporting
      const ordersRes = await fetch(`${API_BASE}/reports/orders?limit=1000`);
      const ordersData = ordersRes.ok ? await ordersRes.json() : [];
      setOrders(ordersData);

      if (usersData.length > 0) {
        setSelectedUser(usersData[0]);
      }
    } catch (err) {
      console.error("Failed to load staff performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = (username) => {
    let filtered = orders.filter(o => o.created_by === username);

    // Apply Date Filter
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (dateFilter === 'today') {
      filtered = filtered.filter(o => o.created_at && o.created_at.startsWith(todayStr));
    } else if (dateFilter === 'weekly') {
      filtered = filtered.filter(o => o.created_at && new Date(o.created_at) >= sevenDaysAgo);
    } else if (dateFilter === 'monthly') {
      filtered = filtered.filter(o => o.created_at && new Date(o.created_at) >= thirtyDaysAgo);
    }

    return filtered;
  };

  const getUserMetrics = (username) => {
    const userOrders = getFilteredOrders(username);
    const completedOrders = userOrders.filter(o => o.status === 'completed');
    const totalSales = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const orderCount = userOrders.length;
    const avgOrderValue = orderCount > 0 ? (totalSales / (completedOrders.length || 1)) : 0;

    return {
      totalSales,
      orderCount,
      avgOrderValue
    };
  };

  // Find Top Performing Staff Member
  const getTopPerformer = () => {
    if (users.length === 0) return null;
    let topUser = null;
    let maxSales = -1;

    users.forEach(u => {
      const { totalSales } = getUserMetrics(u.username);
      if (totalSales > maxSales) {
        maxSales = totalSales;
        topUser = u;
      }
    });

    return topUser ? { ...topUser, sales: maxSales } : null;
  };

  const handlePrint = (order) => {
    const data = {
      items: (order.items || []).map(i => ({
        qty: i.quantity || i.qty,
        name: i.item_name || i.name,
        price: i.price
      })),
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      total: order.total_amount || 0,
      orderId: order.id,
      date: order.created_at,
      table: order.table_number ? { number: order.table_number, area: order.area || 'Main' } : 'Delivery',
      customerName: order.customer_name || '',
      paymentMethod: order.payment_method || 'cash',
      remarks: order.remarks || '',
      serviceCharges: (order.items || []).find(item => item.item_name === 'Service Charges' || item.name === 'Service Charges')?.price || 0
    };

    setPrintData(data);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintData(null), 1000);
    }, 250);
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUserOrders = selectedUser ? getFilteredOrders(selectedUser.username) : [];
  const activeUserMetrics = selectedUser ? getUserMetrics(selectedUser.username) : { totalSales: 0, orderCount: 0, avgOrderValue: 0 };
  const topPerformer = getTopPerformer();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px] gap-2 text-gray-500 bg-white rounded-2xl border border-gray-100">
        <RefreshCw size={24} className="animate-spin text-orange-500" />
        <span className="font-bold">Loading staff performance analytics...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-5 p-3 lg:p-6 overflow-y-auto">
      
      {/* Header section */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">Staff Performance Hub</h2>
          <p className="text-xs text-gray-500 font-bold mt-1">Monitor daily activity reports, invoice transactions, and overall sales per staff member.</p>
        </div>
        <div className="flex items-center gap-2">
          {['today', 'weekly', 'monthly', 'all'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${dateFilter === filter ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {filter}
            </button>
          ))}
          <button onClick={fetchData} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors cursor-pointer">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Clipboard size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Staged Orders</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">{orders.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Sales Generated</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">Rs. {orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}</h3>
          </div>
        </div>

        {topPerformer && (
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Seller ({dateFilter})</p>
              <h3 className="text-base font-black text-gray-950 truncate max-w-[200px]">{topPerformer.name || topPerformer.username}</h3>
              <p className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Rs. {topPerformer.sales.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-[500px]">
        
        {/* Left Panel: Staff list */}
        <div className="w-full lg:w-[320px] bg-white rounded-2xl border border-gray-150 flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff members..."
                className="w-full pl-9 pr-4 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-bold">No staff members found.</div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser && selectedUser.id === u.id;
                const { totalSales, orderCount } = getUserMetrics(u.username);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer ${isSelected ? 'bg-orange-50/70 border-orange-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-xs text-gray-900 leading-tight">{u.name || 'Staff User'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold">@{u.username}</p>
                      </div>
                      <span className={`text-[8px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100/60 mt-1">
                      <div className="text-[9px] font-bold text-gray-400">
                        Orders: <strong className="text-gray-700">{orderCount}</strong>
                      </div>
                      <div className="text-[9px] font-extrabold text-orange-600">
                        Rs. {totalSales.toLocaleString()}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Detailed Performance */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-150 flex flex-col shadow-sm overflow-hidden">
          {selectedUser ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Profile Bar */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-none">{selectedUser.name || 'Staff User'}</h3>
                    <p className="text-[11px] text-gray-500 font-bold mt-1">@{selectedUser.username} · Role: <span className="capitalize font-black text-orange-600">{selectedUser.role}</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Sales</p>
                    <p className="text-base font-black text-gray-950">Rs. {activeUserMetrics.totalSales.toLocaleString()}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Orders Count</p>
                    <p className="text-base font-black text-gray-950">{activeUserMetrics.orderCount}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Avg Ticket</p>
                    <p className="text-base font-black text-gray-950">Rs. {Math.round(activeUserMetrics.avgOrderValue).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Orders List Table */}
              <div className="flex-1 overflow-auto">
                {activeUserOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-10 text-gray-400 gap-3">
                    <AlertCircle size={36} className="text-gray-200" />
                    <p className="text-xs font-bold">No orders recorded for this user during this period.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">
                        <th className="p-4">Invoice / ID</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Table & Area</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Total Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                      {activeUserOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50">
                          <td className="p-4 text-orange-600 font-extrabold">#{order.id}</td>
                          <td className="p-4 font-normal text-gray-500">
                            {new Date(order.created_at).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4">
                            Table {order.table_number} <span className="text-[10px] text-gray-400">({order.area})</span>
                          </td>
                          <td className="p-4 font-normal">{order.customer_name || 'Walk-in'}</td>
                          <td className="p-4 font-black text-gray-900">Rs. {order.total_amount.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                title="Preview Invoice"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handlePrint(order)}
                                title="Print Invoice"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-gray-400 gap-3">
              <User size={48} className="text-gray-200" />
              <p className="text-sm font-bold">Select a staff member from the list to view their daily reports.</p>
            </div>
          )}
        </div>

      </div>

      {/* Order Detail Modal popup */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-gray-900 text-base">Invoice Details - Order #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg bg-gray-150 hover:bg-gray-200 text-gray-500 font-black cursor-pointer flex items-center justify-center">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</p>
                  <p className="text-xs font-bold text-gray-950 mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Table Details</p>
                  <p className="text-xs font-bold text-gray-950 mt-1">Table {selectedOrder.table_number} ({selectedOrder.area})</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff Member</p>
                  <p className="text-xs font-bold text-gray-950 mt-1">@{selectedOrder.created_by || 'admin'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                  <p className="text-xs font-bold text-gray-950 mt-1">{selectedOrder.customer_name || 'Walk-in Guest'}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-gray-150 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-150">Order Items</div>
                <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="px-4 py-2.5 flex justify-between items-center text-xs font-bold">
                      <div>
                        <p className="text-gray-800">{item.item_name || item.name}</p>
                        {item.notes && <p className="text-[10px] text-gray-400 font-normal">{item.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">Rs. {((item.price) * (item.quantity || item.qty)).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 font-normal">{item.quantity || item.qty}x @ Rs. {item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex flex-col gap-1.5 text-xs font-bold">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>Rs. {(selectedOrder.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>GST / Tax</span>
                  <span>Rs. {(selectedOrder.tax || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-orange-200 text-sm font-black text-gray-950">
                  <span>Total Bill</span>
                  <span className="text-orange-600">Rs. {(selectedOrder.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.remarks && (
                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-xl text-xs">
                  📝 <strong>Remarks:</strong> {selectedOrder.remarks}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setSelectedOrder(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black uppercase text-[11px] rounded-xl cursor-pointer">Close</button>
              <button onClick={() => handlePrint(selectedOrder)} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[11px] rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20">
                <Printer size={12} /> Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen Receipt printing wrapper */}
      {printData && (
        <div className="print-only" style={{ display: 'none' }}>
          <ReceiptSlip printData={printData} />
        </div>
      )}

    </div>
  );
};

export default StaffPerformance;
