import React, { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';
import TableTimer from './TableTimer';

const TableCard = ({ table, onClick }) => {
  const isAvailable = table.status === 'available';
  const isOccupied = table.status === 'dining';
  const isReserved = table.status === 'reserved';

  const [theme, setTheme] = useState({ border: '', shadow: '', gradient: '' });

  useEffect(() => {
    const updateTheme = () => {
      if (isReserved) {
        setTheme({ border: 'rgba(59,130,246,0.5)', shadow: '', gradient: 'from-blue-900/30 via-transparent to-blue-900/80' });
        return;
      }
      if (isAvailable || !table.startTime) {
        setTheme({ border: 'transparent', shadow: '', gradient: 'from-black/10 via-transparent to-black/70' });
        return;
      }

      // Occupied Logic
      const diffMinutes = (Date.now() - new Date(table.startTime).getTime()) / 60000;
      
      let r, g, b;
      if (diffMinutes <= 15) {
        // Default Orange (249, 115, 22)
        r = 249; g = 115; b = 22;
      } else if (diffMinutes >= 30) {
        // Luxury Red (190, 18, 60)
        r = 190; g = 18; b = 60;
      } else {
        // Interpolate 15 to 30 mins
        const factor = (diffMinutes - 15) / 15;
        r = Math.round(249 + factor * (190 - 249));
        g = Math.round(115 + factor * (18 - 115));
        b = Math.round(22 + factor * (60 - 22));
      }

      setTheme({
        border: `rgba(${r}, ${g}, ${b}, 0.8)`,
        shadow: `rgba(${r}, ${g}, ${b}, 0.6)`,
        gradient: `linear-gradient(to bottom, rgba(${r},${g},${b},0.3) 0%, transparent 50%, rgba(${Math.max(0,r-50)},${Math.max(0,g-50)},${Math.max(0,b-50)},0.9) 100%)`
      });
    };

    updateTheme();
    // Update color every 10 seconds to ensure smooth transition
    const interval = setInterval(updateTheme, 10000);
    return () => clearInterval(interval);
  }, [table.startTime, isOccupied, isReserved, isAvailable]);

  return (
    <div 
      onClick={() => onClick(table)}
      style={{ borderColor: theme.border, '--radio-color': theme.shadow }}
      className={`group relative h-36 md:h-44 lg:h-48 rounded-2xl md:rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-1000 cursor-pointer transform hover:-translate-y-1 border-2 ${isOccupied ? 'animate-radio-waves' : ''}`}
    >
      <img src="/table.png" alt="Restaurant Table" className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500" />
      
      <div className="absolute inset-0 z-10 transition-colors duration-1000" style={isOccupied ? { background: theme.gradient } : {}} />
      {!isOccupied && <div className={`absolute inset-0 z-10 bg-gradient-to-b ${theme.gradient} transition-colors duration-1000`} />}

      <div className="absolute inset-0 z-20 p-3 md:p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-1">
          <div className={`px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold tracking-widest uppercase shadow-sm backdrop-blur-md flex items-center gap-1 md:gap-1.5 ${
            isAvailable ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-500/30' : 
            isOccupied ? 'bg-white/20 text-white border border-white/30' : 
            'bg-blue-500/30 text-blue-100 border border-blue-500/30'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            <span className="hidden sm:inline">{table.status}</span>
          </div>
          
          <div className="flex items-center gap-1 bg-white shadow-md border border-gray-100 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-zinc-900 text-[10px] md:text-xs font-bold">
            <Users size={12} className="md:w-3.5 md:h-3.5 text-orange-500" /> {table.seats}
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-1 gap-2">
          <div className="shrink-0 min-w-0">
            <p className="text-red-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-[9px] md:text-[10px] font-bold tracking-widest uppercase mb-0.5 truncate">{table.area} Area</p>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white drop-shadow-md group-hover:text-orange-300 transition-colors truncate">
              {table.number}
            </h3>
          </div>
          
          {(isOccupied || isReserved) && table.startTime && (
            <div className="flex items-center gap-1 md:gap-2 text-white text-[9px] md:text-xs font-bold bg-zinc-950/70 backdrop-blur-md px-1.5 py-1 md:px-2 md:py-1.5 rounded-lg md:rounded-xl shadow-lg border border-white/20 whitespace-nowrap shrink-0">
              <Clock size={12} className="text-white shrink-0" /> 
              <TableTimer startTime={table.startTime} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableCard;
