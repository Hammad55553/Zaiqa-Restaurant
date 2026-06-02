import React from 'react';
import { CreditCard } from 'lucide-react';

const OrderConfirmationModal = ({ 
  orderConfirmData, 
  setOrderConfirmData, 
  executePlaceOrder, 
  selectedTable, 
  activeOrderId, 
  confirmStatus, 
  setConfirmStatus 
}) => {
  if (!orderConfirmData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} />
          </div>
          <h2 className="text-2xl font-display font-black text-zinc-900 mb-2">Confirm Order</h2>
          <p className="text-zinc-500 text-sm font-medium mb-6">
            Are you sure you want to place the order for <span className="font-bold text-zinc-900">Table {selectedTable?.number}</span>?
            {activeOrderId && <span className="block mt-1 text-orange-600 font-bold">This will add new items to the existing bill.</span>}
          </p>

          {selectedTable?.status === 'available' && (
            <div className="mb-6 bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-left">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Select Table Status</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmStatus('dining')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${confirmStatus === 'dining' ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-300'}`}
                >
                  Dining
                </button>
                <button 
                  onClick={() => setConfirmStatus('reserved')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${confirmStatus === 'reserved' ? 'bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-900/20' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
                >
                  Reserved
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={() => setOrderConfirmData(null)}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={executePlaceOrder}
              className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-colors"
            >
              Confirm & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
