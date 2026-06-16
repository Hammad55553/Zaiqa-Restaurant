import React from 'react';

const fmtDay = (d) => new Date(d).toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtVal = (val) => {
  if (val >= 1000) return `Rs. ${(val / 1000).toFixed(1)}k`;
  if (val > 0) return `Rs. ${val}`;
  return 'Rs. 0';
};

const BarChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center', padding: 20 }}>Koi data nahi</div>;
  const max = Math.max(...data.map(d => d.revenue), 1);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-end', 
      gap: 12, 
      height: 180, 
      padding: '20px 10px 10px',
      background: '#fafafa',
      borderRadius: 16,
      border: '1px solid #f1f5f9',
      position: 'relative'
    }}>
      {/* Background horizontal grid line markers */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '30%', borderTop: '1px dashed #e2e8f0', zIndex: 0 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '60%', borderTop: '1px dashed #e2e8f0', zIndex: 0 }} />

      {data.map((d, i) => {
        const heightPercent = Math.max((d.revenue / max) * 120, d.revenue > 0 ? 8 : 2);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
            <div style={{ 
              fontSize: 10, 
              fontWeight: 800, 
              color: d.revenue > 0 ? '#ea580c' : '#a1a1aa',
              background: d.revenue > 0 ? '#ffedd5' : 'transparent',
              padding: '2px 6px',
              borderRadius: 6,
              transition: 'all 0.3s'
            }}>
              {fmtVal(d.revenue)}
            </div>
            
            <div style={{ 
              width: '100%', 
              background: d.revenue > 0 
                ? 'linear-gradient(to top, #ea580c, #f97316, #fdba74)' 
                : '#e4e4e7', 
              borderRadius: '8px 8px 0 0', 
              height: `${heightPercent}px`, 
              boxShadow: d.revenue > 0 ? '0 4px 10px rgba(234,88,12,0.15)' : 'none',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }} />
            
            <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 800, textAlign: 'center', marginTop: 4 }}>
              {fmtDay(d.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
