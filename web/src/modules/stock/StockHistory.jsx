import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Search, Layers, Clock, ArrowDownRight, ArrowUpRight, CheckCircle2, RefreshCw, BarChart2, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../config';

const StockHistory = ({ onBack }) => {
  const [logs, setLogs] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all'); // 'all' | 'add' | 'remove'
  const [filterDate, setFilterDate] = useState('all'); // 'today' | 'week' | 'all'
  const [selectedItemName, setSelectedItemName] = useState('all');
  const [itemSearch, setItemSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, stockRes] = await Promise.all([
        fetch(`${API_BASE}/stock/history`),
        fetch(`${API_BASE}/stock`)
      ]);
      if (historyRes.ok) setLogs(await historyRes.json());
      if (stockRes.ok) setStockItems(await stockRes.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Compute unique items list with log count
  const uniqueItems = useMemo(() => {
    const counts = {};
    logs.forEach(log => {
      counts[log.item_name] = (counts[log.item_name] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({
      name,
      count: counts[name]
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const filteredItemsList = useMemo(() => {
    return uniqueItems.filter(item => 
      item.name.toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [uniqueItems, itemSearch]);

  // Apply filters to log entries
  const filteredLogs = logs.filter(log => {
    // Item Filter
    if (selectedItemName !== 'all' && log.item_name !== selectedItemName) return false;

    // Action Filter
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    
    // Search Filter
    if (search && !log.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Date Filter
    if (filterDate !== 'all') {
      const logDate = new Date(log.created_at + 'Z');
      const today = new Date();
      if (filterDate === 'today') {
        if (logDate.toDateString() !== today.toDateString()) return false;
      } else if (filterDate === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        if (logDate < lastWeek) return false;
      }
    }
    
    return true;
  });

  // Calculate live statistics for selected item or filtered set
  const stats = useMemo(() => {
    let restocked = 0;
    let consumed = 0;
    let unit = '';
    
    // Calculate stats based on currently visible logs for the selected item
    const logsToSum = selectedItemName === 'all' 
      ? filteredLogs 
      : logs.filter(l => l.item_name === selectedItemName);

    logsToSum.forEach(log => {
      const qty = parseFloat(log.qty_changed) || 0;
      if (log.action === 'add') {
        restocked += qty;
      } else if (log.action === 'remove') {
        consumed += qty;
      }
      if (!unit && log.item_unit) {
        unit = log.item_unit;
      }
    });

    return {
      restocked,
      consumed,
      net: restocked - consumed,
      unit: unit || 'units'
    };
  }, [selectedItemName, logs, filteredLogs]);

  // Detect critical shortage / low stock par levels dynamically!
  const lowStockAlert = useMemo(() => {
    if (selectedItemName === 'all') {
      const lowItems = stockItems.filter(item => item.quantity <= item.min_alert);
      return lowItems.length > 0 ? { isLow: true, count: lowItems.length } : null;
    } else {
      const matched = stockItems.find(item => item.name.toLowerCase() === selectedItemName.toLowerCase());
      if (matched && matched.quantity <= matched.min_alert) {
        return { isLow: true, item: matched };
      }
    }
    return null;
  }, [selectedItemName, stockItems]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden' }}>
      
      {/* Header */}
      <div className="bg-white p-4 lg:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none flex items-center gap-2">
              <Clock size={20} className="text-orange-500" /> Stock History
            </h2>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
              Detailed logs of ins and outs
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button 
            onClick={fetchLogs} 
            className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw size={16} />
          </button>

          <div className="relative flex-1 md:w-48">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search item..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>
          
          <select 
            value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white appearance-none"
          >
            <option value="all">All Actions</option>
            <option value="add">Restock (In)</option>
            <option value="remove">Used (Out)</option>
          </select>

          <select 
            value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-orange-500 focus:bg-white appearance-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Content Layout */}
      <div className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Panel: Item Navigation */}
        <div className="w-full md:w-64 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden shrink-0 shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-black text-gray-700 mb-2.5 uppercase tracking-wider">Filter By Item</h3>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" placeholder="Search specific item..." 
                value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <button
              onClick={() => setSelectedItemName('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                selectedItemName === 'all' 
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="truncate">All Items Combined</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                selectedItemName === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {logs.length}
              </span>
            </button>
            
            {filteredItemsList.map(item => (
              <button
                key={item.name}
                onClick={() => setSelectedItemName(item.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                  selectedItemName === item.name 
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="truncate capitalize">{item.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  selectedItemName === item.name ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.count}
                </span>
              </button>
            ))}
            
            {filteredItemsList.length === 0 && (
              <div className="text-center text-[10px] text-gray-400 font-bold py-6">No matching items</div>
            )}
          </div>
        </div>

        {/* Right Panel: Detailed Logs & Live Analytics */}
        <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-gray-100 flex flex-col shadow-sm">
          
          {/* Real-time Analytics Cards */}
          {!loading && filteredLogs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/50 border-b border-gray-100 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <ArrowDownRight size={18} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Restocked</div>
                  <div className="text-base font-black text-emerald-600 mt-0.5 flex items-baseline gap-0.5">
                    +{stats.restocked.toFixed(1).replace(/\.0$/, '')}
                    <span className="text-[10px] font-bold text-gray-400 ml-0.5">{stats.unit}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 text-red-500">
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Consumed</div>
                  <div className="text-base font-black text-red-500 mt-0.5 flex items-baseline gap-0.5">
                    -{stats.consumed.toFixed(1).replace(/\.0$/, '')}
                    <span className="text-[10px] font-bold text-gray-400 ml-0.5">{stats.unit}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stats.net >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  <BarChart2 size={18} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Net Stock Flow</div>
                  <div className={`text-base font-black mt-0.5 flex items-baseline gap-0.5 ${stats.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {stats.net >= 0 ? '+' : ''}{stats.net.toFixed(1).replace(/\.0$/, '')}
                    <span className="text-[10px] font-bold text-gray-400 ml-0.5">{stats.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Critical Shortage Banner */}
          {!loading && lowStockAlert && (
            <div className="mx-4 lg:mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between shadow-sm animate-pulse shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 text-white rounded-lg">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="text-[11px] font-black text-red-800 uppercase tracking-wide">
                    {selectedItemName === 'all' 
                      ? 'CRITICAL STOCK ALERT: INSUFFICIENT RAW MATERIALS' 
                      : `CRITICAL INVENTORY ALERT: ${selectedItemName.toUpperCase()} IS RUNNING LOW`}
                  </div>
                  <div className="text-[10px] font-bold text-red-500 mt-0.5">
                    {selectedItemName === 'all'
                      ? `There are currently ${lowStockAlert.count} raw items below their set low-stock threshold levels.`
                      : `Current quantity is ${lowStockAlert.item.quantity} ${lowStockAlert.item.unit} (Alert set at ${lowStockAlert.item.min_alert} ${lowStockAlert.item.unit}).`}
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-black bg-red-600 text-white px-2.5 py-1 rounded-md">
                RESTOCK REQUIRED
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-400 font-bold py-20 flex-1 flex items-center justify-center">Loading history...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-400 flex-1 flex flex-col items-center justify-center">
              <Clock size={48} className="mx-auto mb-4 opacity-30 text-orange-500" />
              <h3 className="text-lg font-black text-gray-800 mb-1">No Records Found</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Try changing filter parameters</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-6">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <th className="py-3.5 px-6">Date & Time</th>
                      <th className="py-3.5 px-6">Item Name</th>
                      <th className="py-3.5 px-6">Action</th>
                      <th className="py-3.5 px-6 text-right">Quantity</th>
                      <th className="py-3.5 px-6">Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="text-xs font-bold text-gray-900">{new Date(log.created_at + 'Z').toLocaleDateString('en-PK')}</div>
                          <div className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(log.created_at + 'Z').toLocaleTimeString('en-PK', {hour: '2-digit', minute:'2-digit'})}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="text-xs font-extrabold text-gray-900 capitalize">{log.item_name}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          {log.action === 'add' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wide">
                              <ArrowDownRight size={10} /> Restock
                            </span>
                          ) : log.action === 'remove' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-extrabold uppercase tracking-wide">
                              <ArrowUpRight size={10} /> Used
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-extrabold uppercase tracking-wide">
                              <CheckCircle2 size={10} /> Setup
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className={`text-sm font-extrabold ${log.action === 'remove' ? 'text-red-500' : 'text-emerald-500'}`}>
                            {log.action === 'remove' ? '-' : '+'}{log.qty_changed}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 ml-1">{log.item_unit}</span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="text-xs text-gray-600 font-semibold leading-relaxed">
                            {log.remarks || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockHistory;
