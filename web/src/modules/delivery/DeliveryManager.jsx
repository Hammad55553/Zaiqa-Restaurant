import React, { useState, useEffect } from 'react';
import { Phone, User, MapPin, Search, Plus, Trash2, Edit3, ShoppingBag, PhoneCall, Check, UserPlus, X } from 'lucide-react';
import { getOfflineItem, setOfflineItem } from '../../utils/offlineDB';
import { moveToTrash } from '../../utils/trashDB';
import { API_BASE } from '../../config';

const DeliveryManager = ({ navigateTo }) => {
  const [customers, setCustomers] = useState([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [registrySearch, setRegistrySearch] = useState('');
  
  // Registration Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [toast, setToast] = useState(null);
  const [incomingCallSim, setIncomingCallSim] = useState(null);

  // Load registered customers from Server DB with Offline Fallback
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const res = await fetch(`${API_BASE}/customers`);
        if (res.ok) {
          const data = await res.json();
          // Filter to only Client types for delivery
          const filtered = data.filter(c => c.type === 'Client');
          setCustomers(filtered);
          await setOfflineItem('zaiqa_mahal_delivery_customers', filtered);
        } else {
          throw new Error();
        }
      } catch (err) {
        console.warn("Failed to fetch customers from server, using offline cache", err);
        const stored = await getOfflineItem('zaiqa_mahal_delivery_customers');
        if (stored) {
          setCustomers(stored);
        } else {
          await setOfflineItem('zaiqa_mahal_delivery_customers', []);
          setCustomers([]);
        }
      }
    };
    loadRegistry();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Real-time lookup as user types phone number
  const handlePhoneLookup = (val) => {
    setSearchPhone(val);
    if (val.length >= 7) {
      const match = customers.find(c => c.phone.includes(val) || val.includes(c.phone));
      if (match) {
        setLookupResult({ status: 'found', data: match });
      } else {
        setLookupResult({ status: 'new', phone: val });
      }
    } else {
      setLookupResult(null);
    }
  };

  // Add/Register New Customer
  const handleRegister = async (e) => {
    e.preventDefault();
    const phoneNum = newPhone.trim();
    if (!phoneNum || !newAddress.trim()) {
      showToast('Phone and Address are required!', 'error');
      return;
    }

    if (customers.some(c => c.phone === phoneNum)) {
      showToast('Phone number already registered!', 'error');
      return;
    }

    const newCust = {
      phone: phoneNum,
      name: newName.trim() || 'Valued Guest',
      address: newAddress.trim(),
      type: 'Client',
      balance: 0
    };

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust)
      });
      if (res.ok) {
        const saved = await res.json();
        const mapped = { ...saved, ordersCount: 0 };
        const updated = [mapped, ...customers];
        setCustomers(updated);
        await setOfflineItem('zaiqa_mahal_delivery_customers', updated);
        showToast('New Customer Registered Successfully!');
        
        // Auto-fill active search
        setSearchPhone(phoneNum);
        setLookupResult({ status: 'found', data: mapped });
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Server error saving customer', 'error');
      }
    } catch (err) {
      // Offline fallback: save locally
      const offlineCust = { ...newCust, id: `CUST-OFFLINE-${Date.now()}`, ordersCount: 0 };
      const updated = [offlineCust, ...customers];
      setCustomers(updated);
      await setOfflineItem('zaiqa_mahal_delivery_customers', updated);
      showToast('Registered Offline (Saved locally)');
      
      setSearchPhone(phoneNum);
      setLookupResult({ status: 'found', data: offlineCust });
    }

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setIsAddingNew(false);
  };

  // Save changes to edited customer
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCustomer.address.trim()) {
      showToast('Address is required!', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/customers/${editingCustomer.id || editingCustomer.phone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCustomer.name,
          phone: editingCustomer.phone,
          address: editingCustomer.address
        })
      });
      if (res.ok) {
        const updated = customers.map(c => c.phone === editingCustomer.phone ? editingCustomer : c);
        setCustomers(updated);
        await setOfflineItem('zaiqa_mahal_delivery_customers', updated);
        showToast('Customer Profile Updated!');
        
        if (lookupResult?.data?.phone === editingCustomer.phone) {
          setLookupResult({ status: 'found', data: editingCustomer });
        }
      } else {
        showToast('Failed to update customer on server', 'error');
      }
    } catch (err) {
      const updated = customers.map(c => c.phone === editingCustomer.phone ? editingCustomer : c);
      setCustomers(updated);
      await setOfflineItem('zaiqa_mahal_delivery_customers', updated);
      showToast('Updated profile offline (local only)');
      
      if (lookupResult?.data?.phone === editingCustomer.phone) {
        setLookupResult({ status: 'found', data: editingCustomer });
      }
    }
    
    setEditingCustomer(null);
  };

  // Delete Customer (Soft delete to trash bin)
  const handleDelete = async (phone) => {
    const matchedCustomer = customers.find(c => c.phone === phone);
    if (!matchedCustomer) return;

    try {
      const res = await fetch(`${API_BASE}/customers/${matchedCustomer.id || matchedCustomer.phone}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = customers.filter(c => c.phone !== phone);
        setCustomers(updated);
        await setOfflineItem('zaiqa_mahal_delivery_customers', updated);
        showToast('Customer Profile Deleted from Server.');
        if (lookupResult?.data?.phone === phone) {
          setLookupResult(null);
          setSearchPhone('');
        }
      } else {
        showToast('Failed to delete from server', 'error');
      }
    } catch (err) {
      const matchedCustomer = customers.find(c => c.phone === phone);
      if (!matchedCustomer) return;
      const success = await moveToTrash('zaiqa_mahal_delivery_customers', matchedCustomer, 'phone');
      if (success) {
        const updated = customers.filter(c => c.phone !== phone);
        setCustomers(updated);
        showToast('Customer moved to local Trash bin.', 'warning');
        if (lookupResult?.data?.phone === phone) {
          setLookupResult(null);
          setSearchPhone('');
        }
      } else {
        showToast('Failed to delete customer locally.', 'error');
      }
    }
  };

  // Simulate Incoming Call (CRM Integration Simulation)
  const simulateCall = () => {
    const isNew = Math.random() > 0.5;
    if (isNew) {
      const randPhone = '03' + Math.floor(100000000 + Math.random() * 900000000);
      setIncomingCallSim({ phone: randPhone, status: 'new' });
    } else {
      if (customers.length > 0) {
        const randCust = customers[Math.floor(Math.random() * customers.length)];
        setIncomingCallSim({ phone: randCust.phone, status: 'existing', name: randCust.name });
      } else {
        const randPhone = '03' + Math.floor(100000000 + Math.random() * 900000000);
        setIncomingCallSim({ phone: randPhone, status: 'new' });
      }
    }
  };

  // Accept simulation call
  const acceptCall = () => {
    handlePhoneLookup(incomingCallSim.phone);
    if (incomingCallSim.status === 'new') {
      setIsAddingNew(true);
      setNewPhone(incomingCallSim.phone);
    }
    setIncomingCallSim(null);
    showToast('Call connected. Number routed to POS.');
  };

  // Filter Customer Registry List by Search Query
  const filteredCustomers = customers.filter(c => {
    if (!registrySearch) return true;
    const query = registrySearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.address.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] flex flex-col gap-5 p-4 lg:p-6 overflow-hidden relative box-border bg-gray-50/50">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border animate-bounce ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          <span className="font-bold text-xs tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* Simulated Incoming Call Alert Overlay */}
      {incomingCallSim && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-950 text-white px-6 py-4 rounded-3xl border-2 border-orange-500 flex items-center gap-5 shadow-2xl animate-pulse">
          <div className="bg-orange-500 text-white p-3 rounded-full animate-bounce">
            <PhoneCall size={20} />
          </div>
          <div className="text-left">
            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest leading-none">Incoming CRM Call</span>
            <h4 className="text-lg font-black text-white mt-1 leading-tight tracking-tight">{incomingCallSim.phone}</h4>
            <span className="text-[10px] text-zinc-400 font-medium">
              {incomingCallSim.status === 'existing' ? `Known: ${incomingCallSim.name}` : 'Unknown Delivery Caller'}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIncomingCallSim(null)} 
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs hover:text-white transition-colors"
            >
              DECLINE
            </button>
            <button 
              onClick={acceptCall} 
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
            >
              ROUTE
            </button>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <header className="bg-white p-4 lg:p-5 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-sm">
        <div>
          <h2 className="text-lg lg:text-xl font-black text-gray-900 tracking-wide uppercase">Home Delivery Directory</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Log incoming calls, auto-lookup address directories, and dispatch home delivery riders.</p>
        </div>
        <button
          onClick={simulateCall}
          className="flex items-center gap-2 bg-zinc-950 text-orange-500 border border-orange-500/30 hover:border-orange-500 px-5 py-3 rounded-xl text-xs font-black tracking-wider shadow-sm transition-all"
        >
          <PhoneCall size={14} /> SIMULATE CALL
        </button>
      </header>

      {/* Split Content Grid (Scrollable Areas) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
        
        {/* Left Side: Call Lookup & Fast CRM Dispatch (Scrollable Column) */}
        <div className="flex-[1.2] flex flex-col gap-4 overflow-y-auto max-h-full pr-1 custom-scrollbar shrink-0 lg:shrink">
          
          {/* Lookup Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 flex flex-col gap-4 shadow-sm shrink-0">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Caller ID & Dispatcher</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-0.5">
                Enter Calling Phone Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                <input
                  type="text"
                  placeholder="Type number (e.g. 03003910101)..."
                  value={searchPhone}
                  onChange={(e) => handlePhoneLookup(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-black text-zinc-800 placeholder-zinc-400 shadow-sm"
                />
              </div>
            </div>

            {/* Lookup Result Box */}
            {lookupResult && (
              <div className="animate-fadeIn mt-1">
                {lookupResult.status === 'found' ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-3.5">
                    <div className="flex justify-between items-end">
                      <div className="flex-1 mr-4">
                        <span className="text-[7.5px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest inline-block mb-2">
                          Registered Patron
                        </span>
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest pl-0.5">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={lookupResult.data.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setLookupResult({
                                ...lookupResult,
                                data: { ...lookupResult.data, name: newName }
                              });
                              const updated = customers.map(c => 
                                c.phone === lookupResult.data.phone ? { ...c, name: newName } : c
                              );
                              setCustomers(updated);
                              const saveUpdated = async () => {
                                await setOfflineItem('zaiqa_mahal_delivery_customers', updated);
                                try {
                                  const c = lookupResult.data;
                                  await fetch(`${API_BASE}/customers/${c.id || c.phone}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      name: newName,
                                      phone: c.phone,
                                      address: c.address
                                    })
                                  });
                                } catch (err) {}
                              };
                              saveUpdated();
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-zinc-800 focus:outline-none focus:border-orange-500 shadow-sm"
                            placeholder="Name (Optional)"
                          />
                        </div>
                        <span className="text-[10px] font-mono font-black text-emerald-600 tracking-tight mt-1.5 block pl-0.5">{lookupResult.data.phone}</span>
                      </div>
                      <div className="text-right shrink-0 pb-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Orders</span>
                        <h3 className="text-xl font-black text-emerald-600 mt-0.5 leading-none">{lookupResult.data.ordersCount}</h3>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start bg-white/70 p-3 rounded-lg border border-gray-100 shadow-sm">
                      <MapPin size={15} className="text-orange-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none block">Delivery Address</span>
                        <p className="text-xs font-bold text-zinc-700 mt-1 leading-normal pr-1">{lookupResult.data.address}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const runInit = async () => {
                          await setOfflineItem('zaiqa_mahal_active_delivery', lookupResult.data);
                          navigateTo('pos');
                        };
                        runInit();
                      }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ShoppingBag size={14} /> INITIATE HOME DELIVERY BILL
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-3.5">
                    <div className="flex items-center gap-2 text-amber-600">
                      <UserPlus size={18} />
                      <h4 className="font-black text-xs uppercase tracking-wider">NEW CALLER DETECTED</h4>
                    </div>
                    <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                      Phone number <strong className="font-black font-mono">{lookupResult.phone}</strong> is not in the directory. Please register details below to save.
                    </p>
                    <button
                      onClick={() => {
                        setNewPhone(lookupResult.phone);
                        setIsAddingNew(true);
                      }}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus size={13} /> REGISTER CALLER PROFILE
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add / Edit Form Card */}
          {(isAddingNew || editingCustomer) && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm animate-fadeIn shrink-0">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  {isAddingNew ? 'Register New Profile' : 'Modify Client Address'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingCustomer(null);
                  }}
                  className="w-6 h-6 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:text-zinc-800 hover:bg-gray-100 flex items-center justify-center text-xs font-black transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={isAddingNew ? handleRegister : handleUpdate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-0.5">
                    Calling Phone Number (Fixed)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isAddingNew}
                    value={isAddingNew ? newPhone : editingCustomer.phone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-3 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-black text-zinc-800 disabled:text-zinc-400 placeholder-zinc-400 outline-none shadow-sm font-mono"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-0.5">
                    Customer Name (Optional)
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Zahid Iqbal"
                      value={isAddingNew ? newName : editingCustomer.name}
                      onChange={(e) => isAddingNew ? setNewName(e.target.value) : setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-zinc-800 placeholder-zinc-400 outline-none shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-0.5">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-3 text-orange-500" />
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter full home delivery street address..."
                      value={isAddingNew ? newAddress : editingCustomer.address}
                      onChange={(e) => isAddingNew ? setNewAddress(e.target.value) : setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 outline-none shadow-sm resize-none font-sans leading-relaxed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs tracking-wider shadow-lg shadow-orange-500/20 transition-all mt-1"
                >
                  {isAddingNew ? 'SAVE CLIENT PROFILE' : 'SAVE ADDRESS UPDATES'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Registered Client Directory database (Fixed Scrollable Panel) */}
        <div className="flex-[1.5] flex flex-col bg-white p-5 lg:p-6 rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden h-full">
          
          {/* Registry Title and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Active Customer Registry</h3>
              <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Total clients: {customers.length}</p>
            </div>
            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingCustomer(null);
                setNewPhone('');
              }}
              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wide shadow-md transition-all shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus size={14} /> NEW CUSTOMER
            </button>
          </div>

          {/* Proper Registry Search Bar */}
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search registry by Name, Phone, or Address..."
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs font-bold text-zinc-800 placeholder-zinc-400 shadow-sm"
            />
          </div>

          {/* Client List (Scrolls independently in its own container) */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 flex-1">
                <User size={42} className="opacity-20 mb-3" />
                <h4 className="font-black text-zinc-600 text-sm">
                  {registrySearch ? 'No Search Matches' : 'No Customers Registered'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                  {registrySearch ? `No matches found for "${registrySearch}".` : 'Register home delivery customers here to enable fast caller-lookup dispatches.'}
                </p>
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.phone}
                  className="p-4 bg-gray-50/50 border border-gray-200/60 hover:border-orange-500/30 rounded-xl flex justify-between items-center gap-4 hover:bg-white hover:shadow-md transition-all duration-300 relative group"
                >
                  <div className="flex flex-col gap-1 text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-850 text-[13px] tracking-tight truncate max-w-[150px]">{c.name}</span>
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        {c.ordersCount} Orders
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-black text-orange-500 tracking-tight flex items-center gap-1">
                      <Phone size={11} className="shrink-0" /> {c.phone}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold flex gap-1 mt-1 pr-4 leading-normal min-w-0">
                      <MapPin size={11} className="shrink-0 mt-0.5 text-zinc-400/80" /> 
                      <span className="truncate" title={c.address}>{c.address}</span>
                    </span>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSearchPhone(c.phone);
                        setLookupResult({ status: 'found', data: c });
                      }}
                      className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 text-emerald-500 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      title="Load Caller Dispatch"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCustomer(c);
                        setIsAddingNew(false);
                      }}
                      className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 text-blue-500 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      title="Edit Profile"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.phone)}
                      className="w-8 h-8 rounded-lg border border-red-100 bg-white hover:border-red-500 hover:bg-red-50 text-red-500 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                      title="Delete Customer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DeliveryManager;
