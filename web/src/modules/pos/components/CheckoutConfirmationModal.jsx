import React, { useState } from 'react';
import { CheckCircle, Phone, BookUser, Search } from 'lucide-react';

const CheckoutConfirmationModal = ({
  isCheckoutModalOpen,
  setIsCheckoutModalOpen,
  executeCheckout,
  selectedTable,
  customers = [],        // dine-in khata customers (allDBCustomers)
  billTotal = 0          // current bill amount, used for khata credit
}) => {
  const [phone, setPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('NONE');
  const [customStatus, setCustomStatus] = useState('');
  const [releaseTable, setReleaseTable] = useState(true);
  const [printMode, setPrintMode] = useState('single');

  // Khata (dine-in credit) state
  const [khataOn, setKhataOn] = useState(false);
  const [khataSearch, setKhataSearch] = useState('');
  const [khataCustomer, setKhataCustomer] = useState(null);

  const resetAll = () => {
    setPhone(''); setPaymentStatus('NONE'); setCustomStatus('');
    setReleaseTable(true); setPrintMode('single');
    setKhataOn(false); setKhataSearch(''); setKhataCustomer(null);
  };

  // Exclude delivery-only customers from dine-in khata list; match by name/phone.
  const khataMatches = khataSearch.trim().length > 0
    ? customers.filter(c => {
        const q = khataSearch.toLowerCase();
        return (c.name && c.name.toLowerCase().includes(q)) ||
               (c.phone && String(c.phone).includes(khataSearch));
      }).slice(0, 6)
    : [];

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
          <div className="mb-4 text-left">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-1.5 pl-1">
              Select Bill Status / Stamp
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
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

          {/* Print Mode Selection */}
          <div className="mb-4 text-left">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-1.5 pl-1">
              Select Print Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '🚫 No Print', value: 'none' },
                { label: '📄 Single', value: 'single' },
                { label: '📄📄 Double', value: 'double' }
              ].map(opt => {
                const isSelected = printMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrintMode(opt.value)}
                    className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl border text-center transition-all ${
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
          </div>

          {/* Khata (Dine-in Credit / Udhaar) */}
          <div className="mb-4 text-left bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="text-left flex items-center gap-2">
                <BookUser size={16} className="text-blue-600" />
                <div>
                  <label className="block text-xs font-extrabold text-zinc-800 uppercase tracking-wide">
                    Add to Khata Ledger
                  </label>
                  <span className="text-[9px] text-zinc-400 font-bold block leading-tight mt-0.5">
                    Add bill to customer's credit ledger
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setKhataOn(!khataOn); setKhataCustomer(null); setKhataSearch(''); }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${khataOn ? 'bg-blue-600 justify-end' : 'bg-zinc-300 justify-start'}`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300"></span>
              </button>
            </div>

            {khataOn && (
              <div className="mt-3">
                {khataCustomer ? (
                  <div className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-3 py-2">
                    <div className="text-left">
                      <p className="text-xs font-black text-zinc-800">{khataCustomer.name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold">{khataCustomer.phone} · Balance: {Number(khataCustomer.balance || 0).toFixed(0)}</p>
                    </div>
                    <button type="button" onClick={() => setKhataCustomer(null)} className="text-[10px] font-black text-blue-600 uppercase">Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search customer by name or phone"
                      value={khataSearch}
                      onChange={(e) => setKhataSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                    />
                    {khataMatches.length > 0 && (
                      <div className="mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
                        {khataMatches.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setKhataCustomer(c); setKhataSearch(''); }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-zinc-100 last:border-0"
                          >
                            <p className="text-xs font-bold text-zinc-800">{c.name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold">{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {khataSearch.trim().length > 0 && khataMatches.length === 0 && (
                      <p className="text-[10px] text-zinc-400 font-bold mt-1 pl-1">No customer found. Register them in Khata Hub first.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Release Table Animated Toggle Switch */}
          <div className="mb-6 flex items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-150">
            <div className="text-left">
              <label className="block text-xs font-extrabold text-zinc-800 uppercase tracking-wide">
                Free Up Table
              </label>
              <span className="text-[9px] text-zinc-400 font-bold block leading-tight mt-0.5">
                Make table available (green) after checkout
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReleaseTable(!releaseTable)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                releaseTable ? 'bg-emerald-500 justify-end' : 'bg-zinc-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300"></span>
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsCheckoutModalOpen(false);
                resetAll();
              }}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (khataOn && !khataCustomer) {
                  alert('Select a customer for Khata first, or turn off the Khata toggle.');
                  return;
                }
                // If khata is on, force the bill stamp to PENDING (udhaar).
                const baseStatus = paymentStatus === 'CUSTOM' ? (customStatus.trim() || 'PAID') : paymentStatus;
                const finalStatus = khataOn ? 'PENDING' : baseStatus;
                const khataInfo = khataOn && khataCustomer
                  ? { customerId: khataCustomer.id, customerName: khataCustomer.name, amount: billTotal }
                  : null;
                executeCheckout(phone, finalStatus, releaseTable, printMode, khataInfo);
                setIsCheckoutModalOpen(false);
                resetAll();
              }}
              className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-colors"
            >
              {khataOn ? 'Confirm & Khata' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutConfirmationModal;
