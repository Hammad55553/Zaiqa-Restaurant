import React from 'react';

const StatCard = ({ icon, label, value, sub, color = '#f97316', bg = '#fff7ed', onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      background: '#fff', 
      borderRadius: 20, 
      padding: '20px 22px', 
      border: '1.5px solid #f4f4f5', 
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 16,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      ':hover': onClick ? { transform: 'translateY(-2px)', boxSpread: '0 6px 20px rgba(0,0,0,0.06)' } : {}
    }}
  >
    <div style={{ width: 52, height: 52, borderRadius: 16, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {React.cloneElement(icon, { size: 24, color })}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#09090b', lineHeight: 1.2, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#71717a', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>{sub}</div>}
    </div>
  </div>
);

export default StatCard;
