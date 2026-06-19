import React, { useState } from 'react';
import { CheckCircle, Phone } from 'lucide-react';

const CheckoutConfirmationModal = ({ 
  isCheckoutModalOpen, 
  setIsCheckoutModalOpen, 
  executeCheckout, 
  selectedTable
}) => {
  const [phone, setPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [customStatus, setCustomStatus] = useState('');

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
          <div className="mb-4 text-left">
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
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Payment Status Selection */}
          <div className="mb-6 text-left">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-1.5 pl-1">
              Select Bill Status / Stamp
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: '💵 Paid', value: 'PAID' },
                { label: '⏳ Pending', value: 'PENDING' },
                { label: '🚚 COD', value: 'CASH ON DELIVERY' },
                { label: '📱 Online Paid', value: 'ONLINE PAID' },
                { label: '🔄 In Queue', value: 'IN QUEUE' },
                { label: '🚫 No Stamp', value: 'NONE' },
                { label: '✍️ Custom', value: 'CUSTOM' }
              ].map(opt => {
                const isSelected = paymentStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentStatus(opt.value)}
                    className={`py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-orange-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            
            {paymentStatus === 'CUSTOM' && (
              <input
                type="text"
                placeholder="Enter custom status (e.g. Card Paid)"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-inner"
              />
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => {
                setIsCheckoutModalOpen(false);
                setPhone('');
                setPaymentStatus('PAID');
                setCustomStatus('');
              }}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const finalStatus = paymentStatus === 'CUSTOM' ? (customStatus.trim() || 'PAID') : paymentStatus;
                executeCheckout(phone, finalStatus);
                setIsCheckoutModalOpen(false);
                setPhone('');
                setPaymentStatus('PAID');
                setCustomStatus('');
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
