import React from 'react';

const StatusBadge = ({ status }) => {
  const map = {
    completed: { bg: '#f0fdf4', color: '#15803d', label: 'Mukammal' },
    pending:   { bg: '#fff7ed', color: '#c2410c', label: 'Pending' },
    preparing: { bg: '#fefce8', color: '#a16207', label: 'Ban raha' },
    ready:     { bg: '#eff6ff', color: '#1d4ed8', label: 'Tayar' },
  };
  const s = map[status] || { bg: '#f4f4f5', color: '#71717a', label: status };
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
};

export default StatusBadge;
