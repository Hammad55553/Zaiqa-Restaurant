import React, { useState } from 'react';
import { CheckCircle, Phone } from 'lucide-react';

const CheckoutConfirmationModal = ({ 
  isCheckoutModalOpen, 
  setIsCheckoutModalOpen, 
  executeCheckout, 
  selectedTable
}) => {
  const [phone, setPhone] = useState('');

  if (!isCheckoutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-display font-black text-zinc-900 mb-2">Checkout Table</h2>
          <p className="text-zinc-500 text-sm font-medium mb-4">
            Are you sure you want to checkout and clear <span className="font-bold text-zinc-900">Table {selectedTable?.number}</span>?
          </p>

          {/* Customer Phone Input */}
          <div className="mb-6 text-left">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-1.5 pl-1">
              Customer Phone Number
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="e.g. 03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => {
                setIsCheckoutModalOpen(false);
                setPhone('');
              }}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                executeCheckout(phone);
                setIsCheckoutModalOpen(false);
                setPhone('');
              }}
              className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-colors animate-pulse"
            >
              Confirm & Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutConfirmationModal;
