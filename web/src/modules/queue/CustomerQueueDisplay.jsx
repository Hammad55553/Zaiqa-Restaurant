import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, WS_URL } from '../../config';
import { ChefHat, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function CustomerQueueDisplay({ onBack }) {
  const [preparing, setPreparing] = useState([]);
  const [ready, setReady] = useState([]);
  const [lastReadyCount, setLastReadyCount] = useState(0);
  const audioRef = useRef(null);
  const wsRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/active`);
      if (res.ok) {
        const data = await res.json();
        
        // Filter orders based on status
        const prep = data.filter(o => o.status === 'preparing' || o.status === 'pending');
        const rdy = data.filter(o => o.status === 'ready');
        
        setPreparing(prep);
        setReady(rdy);

        // Play sound if a NEW ready order appeared
        if (rdy.length > lastReadyCount) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error('Audio play error:', e));
          }
        }
        setLastReadyCount(rdy.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Auto refresh fallback
    const interval = setInterval(fetchOrders, 10000);

    // WebSocket real-time updates
    const connectWS = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYNC_TRIGGER') {
            fetchOrders();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setTimeout(connectWS, 3000);
      };
    };
    connectWS();

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [lastReadyCount]); // Dependency to track changes for sound

  // Format order ID (e.g. 5 -> 05)
  const formatOrderId = (id) => {
    return String(id).padStart(2, '0');
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans select-none relative">
      {/* Audio element for the bell ring */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Floating Back Button */}
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-50 p-4 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-white/10 shadow-2xl cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {/* Preparing Column (Left) */}
      <div className="w-1/2 flex flex-col border-r-4 border-slate-900 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500">
        <div className="py-8 px-10 bg-orange-700/40 backdrop-blur-md flex items-center gap-6 shadow-xl z-10 border-b border-white/10">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner">
            <ChefHat size={48} className="text-white" />
          </div>
          <h1 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-md">Preparing</h1>
        </div>
        
        <div className="flex-1 p-10 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 auto-rows-max">
            {preparing.map(order => (
              <div 
                key={order.id} 
                className="bg-slate-950/40 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center justify-center border-2 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1"
              >
                <span className="text-xs uppercase font-extrabold tracking-widest text-orange-200/60 mb-2">Token</span>
                <span className="text-7xl font-black text-white tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  {formatOrderId(order.id)}
                </span>
              </div>
            ))}
            {preparing.length === 0 && (
              <div className="col-span-2 py-32 text-center">
                <span className="text-4xl font-bold text-orange-100/30 uppercase tracking-widest">No Orders</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ready Column (Right) */}
      <div className="w-1/2 flex flex-col bg-gradient-to-br from-green-600 via-green-500 to-emerald-500">
        <div className="py-8 px-10 bg-green-700/40 backdrop-blur-md flex items-center gap-6 shadow-xl z-10 border-b border-white/10">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h1 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-md">Please Collect</h1>
        </div>
        
        <div className="flex-1 p-10 overflow-hidden relative">
          <div className="grid grid-cols-2 gap-6 auto-rows-max">
            {ready.map(order => (
              <div 
                key={order.id} 
                className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-300 transform hover:-translate-y-1 animate-pulse ring-8 ring-green-300/50"
              >
                <span className="text-xs uppercase font-extrabold tracking-widest text-green-600/70 mb-2">Ready</span>
                <span className="text-8xl font-black text-green-600 tracking-widest">
                  {formatOrderId(order.id)}
                </span>
              </div>
            ))}
            {ready.length === 0 && (
              <div className="col-span-2 py-32 text-center">
                <span className="text-4xl font-bold text-green-950/20 uppercase tracking-widest">No Orders</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
