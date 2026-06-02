import React from 'react';

const TableSelector = ({ tables, selectedTable, onSelect }) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
      {tables.map(table => {
        const isSelected = selectedTable?.id === table.id;
        
        let bgColor = 'bg-gray-50 border-gray-200 text-gray-700 hover:border-orange-300';
        if (table.status === 'occupied') bgColor = 'bg-red-50 border-red-200 text-red-700 opacity-60 cursor-not-allowed';
        if (table.status === 'reserved') bgColor = 'bg-blue-50 border-blue-200 text-blue-700 opacity-60 cursor-not-allowed';
        if (isSelected) bgColor = 'bg-orange-500 border-orange-600 text-white shadow-md transform scale-105 transition-all';

        return (
          <button
            key={table.id}
            disabled={table.status !== 'available' && !isSelected}
            onClick={() => onSelect(table)}
            className={`min-w-[100px] h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${bgColor}`}
          >
            <span className="font-bold text-xl">{table.number}</span>
            <span className={`text-xs mt-1 ${isSelected ? 'text-orange-100' : 'text-gray-500'}`}>
              {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TableSelector;
