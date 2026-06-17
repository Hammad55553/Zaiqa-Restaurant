import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, WS_URL } from '../../config';
import { ChefHat, CheckCircle2 } from 'lucide-react';

export default function CustomerQueueDisplay() {
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

  // Format order ID (e.g. 153 -> 153, maybe pad it)
  const formatOrderId = (id) => {
    return `#${id}`;
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
      {/* Audio element for the bell ring */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Preparing Column (Left) */}
      <div className="w-1/2 flex flex-col border-r-4 border-slate-900 bg-orange-500">
        <div className="py-8 px-10 bg-orange-600 flex items-center gap-6 shadow-xl z-10">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <ChefHat size={48} className="text-white" />
          </div>
          <h1 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-md">Preparing</h1>
        </div>
        
        <div className="flex-1 p-10 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 auto-rows-max">
            {preparing.map(order => (
              <div 
                key={order.id} 
                className="bg-white/10 rounded-3xl p-6 flex items-center justify-center border-4 border-white/20 shadow-lg animate-fade-in"
              >
                <span className="text-6xl font-black text-white tracking-wider">
                  {formatOrderId(order.id)}
                </span>
              </div>
            ))}
            {preparing.length === 0 && (
              <div className="col-span-2 py-20 text-center">
                <span className="text-4xl font-bold text-orange-200/50 uppercase tracking-widest">No Orders</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ready Column (Right) */}
      <div className="w-1/2 flex flex-col bg-green-500">
        <div className="py-8 px-10 bg-green-600 flex items-center gap-6 shadow-xl z-10">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h1 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-md">Please Collect</h1>
        </div>
        
        <div className="flex-1 p-10 overflow-hidden relative">
          <div className="grid grid-cols-2 gap-6 auto-rows-max">
            {ready.map(order => (
              <div 
                key={order.id} 
                className="bg-white rounded-3xl p-6 flex items-center justify-center shadow-2xl animate-pulse ring-8 ring-green-300"
              >
                <span className="text-7xl font-black text-green-600 tracking-wider">
                  {formatOrderId(order.id)}
                </span>
              </div>
            ))}
            {ready.length === 0 && (
              <div className="col-span-2 py-20 text-center">
                <span className="text-4xl font-bold text-green-800/30 uppercase tracking-widest">No Orders</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
