import React, { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard, Printer, CheckCircle, Lock, Unlock, X } from 'lucide-react';

const Cart = ({ 
  table, 
  items, 
  onUpdateQty, 
  onRemove, 
  onContinueToBill,
  onSendToKitchen,
  activeOrderStatus = 'pending', 
  adminUnlockRemark, 
  onAdminUnlock,
  currentUser
}) => {
  const [showUnlock, setShowUnlock] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin';


  const isLocked = activeOrderStatus !== 'pending' && !adminUnlockRemark;

  const handleUnlockSubmit = () => {
    if (!unlockReason) return alert("Reason is required to unlock.");
    onAdminUnlock(unlockReason);
    setShowUnlock(false);
    setUnlockReason('');
  };

  const groupedItems = React.useMemo(() => {
    const groups = {};
    items.forEach(item => {
      if (item.name === 'Service Charges' || item.item_name === 'Service Charges') return;
      const ts = item.created_at || 'new';
      if (!groups[ts]) {
        groups[ts] = [];
      }
      groups[ts].push(item);
    });
    // Group 'new' items last
    return Object.keys(groups).sort((a, b) => {
      if (a === 'new') return 1;
      if (b === 'new') return -1;
      return a.localeCompare(b);
    }).map((ts, idx) => ({
      round: ts === 'new' ? 'New Additions' : `Round ${idx + 1}`,
      timestamp: ts,
      items: groups[ts]
    }));
  }, [items]);

  return (
    <div className="flex flex-col h-full bg-white relative z-10 rounded-2xl">
      
      {/* Compact Cart Header */}
      <div className="p-3 lg:p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
            <ShoppingBag size={16} />
          </div>
          <div>
            <h2 className="text-base font-display font-black text-gray-900 tracking-wide leading-none">Current Order</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 leading-none">{table ? `Table ${table.number}` : 'No Table'}</p>
          </div>
        </div>
        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">
          {items.length} Items
        </span>
      </div>

      {/* Compact Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 custom-scrollbar bg-gray-50/50">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
            <ShoppingBag size={32} className="text-gray-200" />
            <p className="text-xs font-bold">Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedItems.map(group => (
              <div key={group.timestamp} className="bg-white/60 border border-gray-100 rounded-xl p-2.5 space-y-2.5 shadow-sm">
                <div className="flex justify-between items-center pb-1.5 border-b border-gray-150">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">
                    {group.round}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400">
                    {group.timestamp !== 'new' && group.timestamp !== 'original' ? new Date(group.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div key={item.cartId || item.id} className={`group p-2.5 rounded-xl shadow-xs border relative bg-white transition-colors ${item.sent ? 'border-gray-100 opacity-80' : 'border-gray-200 hover:border-orange-300'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800 text-[12px] leading-tight">{item.name}</h3>
                            {item.sent && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                item.status === 'served' ? 'bg-gray-100 text-gray-500' : item.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {item.status === 'served' ? 'Served' : item.status === 'ready' ? 'Ready' : 'Cooking'}
                              </span>
                            )}
                          </div>
                          <p className="text-orange-600 font-extrabold text-xs mt-0.5">Rs. {item.price}</p>
                          {item.notes && <p className="text-[9px] font-bold text-orange-500 mt-1">⚠️ Note: {item.notes}</p>}
                        </div>
                        {(!item.sent || !isLocked) && (
                          <button 
                            onClick={() => onRemove(item.cartId || item.id)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100">
                        <div className={`flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5 shadow-inner ${(item.sent && isLocked) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <button 
                            onClick={() => onUpdateQty(item.cartId || item.id, -1)}
                            disabled={item.sent && isLocked}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-black text-gray-800 text-xs">{item.qty}</span>
                          <button 
                            onClick={() => onUpdateQty(item.cartId || item.id, 1)}
                            disabled={item.sent && isLocked}
                            className="w-6 h-6 flex items-center justify-center bg-orange-500 rounded shadow-sm text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        
                        <div className="font-display font-black text-gray-900 text-sm">
                          Rs. {item.price * item.qty}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacious Clean Footer */}
      <div className="bg-white border-t border-gray-100 p-3 lg:p-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-20 rounded-b-2xl">
        {showUnlock ? (
          <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200 mb-2">
            <p className="text-[10px] font-bold text-orange-600 uppercase mb-2">Admin Override Reason:</p>
            <input 
              type="text" value={unlockReason} onChange={e => setUnlockReason(e.target.value)}
              placeholder="e.g. Customer changed mind"
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-orange-200 rounded-xl focus:outline-none mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowUnlock(false)} className="flex-1 py-2 bg-gray-200 text-gray-600 font-bold text-xs rounded-xl">Cancel</button>
              <button onClick={handleUnlockSubmit} className="flex-1 py-2 bg-orange-500 text-white font-bold text-xs rounded-xl">Unlock</button>
            </div>
          </div>
        ) : (
          <>
            {isLocked && (
              <div className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-xl border border-red-100 mb-3">
                <div className="flex items-center gap-1.5 text-red-600">
                  <Lock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Order is Preparing</span>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowUnlock(true)} className="text-[10px] font-black uppercase text-white bg-red-500 px-2.5 py-1 rounded-lg hover:bg-red-600 transition-colors">
                    Admin Edit
                  </button>
                )}
              </div>
            )}
            
            {adminUnlockRemark && (
              <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100 mb-3">
                <Unlock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">Unlocked: {adminUnlockRemark}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={onSendToKitchen}
                disabled={!table || items.length === 0 || !items.some(item => !item.sent)}
                className="flex-1 py-3 bg-orange-500 text-white font-black uppercase tracking-wider rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 text-[11px]"
              >
                Send to Kitchen
              </button>
              <button 
                type="button"
                onClick={onContinueToBill}
                disabled={!table || items.length === 0}
                className="flex-1 py-3 bg-zinc-950 text-white font-black uppercase tracking-wider rounded-xl hover:bg-zinc-900 hover:text-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-zinc-900/20 text-[11px]"
              >
                <CreditCard size={12} />
                Continue to Bill
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default Cart;
