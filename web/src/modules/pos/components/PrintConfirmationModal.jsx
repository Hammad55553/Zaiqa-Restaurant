import React from 'react';
import { Printer } from 'lucide-react';

const PrintConfirmationModal = ({ 
  isPrintModalOpen, 
  setIsPrintModalOpen, 
  executePrint, 
  selectedTable
}) => {
  if (!isPrintModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Printer size={32} />
          </div>
          <h2 className="text-2xl font-display font-black text-zinc-900 mb-2">Print Bill</h2>
          <p className="text-zinc-500 text-sm font-medium mb-6">
            Are you sure you want to print the bill for <span className="font-bold text-zinc-900">Table {selectedTable?.number}</span>?
            <span className="block mt-1 text-blue-600 font-bold">This will generate a receipt slip.</span>
          </p>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsPrintModalOpen(false)}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                executePrint();
                setIsPrintModalOpen(false);
              }}
              className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-colors"
            >
              Confirm Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintConfirmationModal;
