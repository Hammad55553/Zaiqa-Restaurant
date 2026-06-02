import React, { useState, useEffect } from 'react';

// Live Timer Component to prevent full re-renders
const TableTimer = ({ startTime, endTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const updateTime = () => {
      const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
      const diff = Math.floor((end - start) / 1000); // in seconds
      
      if (diff < 0) {
        setElapsed("00:00:00");
        return;
      }
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setElapsed(`${days} ${days === 1 ? 'Day' : 'Days'} ${remHours} hr${remHours !== 1 ? 's' : ''}`);
      } else {
        const formatted = 
          (hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '') +
          `${minutes.toString().padStart(2, '0')}:` +
          `${seconds.toString().padStart(2, '0')}`;
        setElapsed(formatted);
      }
    };

    updateTime(); // Initial call
    if (endTime) return; // Do not start interval if order is already completed
    
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return <span>{elapsed}</span>;
};

export default TableTimer;
