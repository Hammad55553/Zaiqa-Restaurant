import React, { useState, useEffect } from 'react';
import { Search, Plus, UtensilsCrossed, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config';

const Menu = ({ onAddToCart, disabled }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  
  // Data from DB
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom Item Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          fetch(`${API_BASE}/inventory`),
          fetch(`${API_BASE}/inventory/categories`),
        ]);
        if (itemsRes.ok && catsRes.ok) {
          const itemsData = await itemsRes.json();
          const catsData = await catsRes.json();
          
          setItems(itemsData);
          setCategories(catsData);
        }
      } catch (err) {
        console.error("Failed to load menu", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const catNames = ['All', ...categories.map(c => c.name), 'Uncategorized'];

  const filteredItems = items.filter(item => {
    const itemCat = item.category_name || 'Uncategorized';
    const matchesCategory = activeCategory === 'All' || itemCat === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const dropdownItems = customName ? items.filter(i => i.name.toLowerCase().includes(customName.toLowerCase())) : [];

  const handleAddCustomItem = () => {
    if (!customName || !customPrice) return alert("Please enter name and price");
    
    // Check if it exactly matches an existing item
    const existingItem = items.find(i => i.name.toLowerCase() === customName.toLowerCase() && i.price == customPrice);
    
    const item = existingItem ? { ...existingItem } : {
      id: 'custom-' + Date.now(),
      name: customName,
      category_name: 'Custom',
      price: parseFloat(customPrice),
    };
    
    const parsedQty = parseFloat(customQty) || 1;
    onAddToCart(item, parsedQty);
    
    setShowCustomModal(false);
    setCustomName('');
    setCustomPrice('');
    setCustomQty(1);
    setShowDropdown(false);
  };

  return (
    <div className={`flex flex-col h-full relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      
      {/* Background watermark logo */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(./Logo.jpg)`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.03,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Custom Item Modal */}
      {showCustomModal && (
        <div className="absolute inset-0 z-50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-3xl w-full max-w-sm overflow-visible transform scale-100 transition-transform">
            <div className="bg-zinc-950 p-6 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-xl font-display font-bold text-white">Add Custom Item</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="relative">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Item Name</label>
                <input 
                  type="text" 
                  value={customName} 
                  onChange={e => {
                    setCustomName(e.target.value);
                    setShowDropdown(true);
                  }} 
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="e.g. Special Dish" 
                  className="w-full mt-2 px-0 py-2 bg-transparent border-b-2 border-zinc-200 focus:border-orange-500 rounded-none focus:outline-none transition-colors text-lg font-medium text-zinc-800" 
                  autoFocus
                />
                
                {showDropdown && dropdownItems.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-gray-100 shadow-2xl rounded-xl max-h-48 overflow-y-auto z-[60]">
                    {dropdownItems.map(item => (
                      <li 
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCustomName(item.name);
                          setCustomPrice(item.price);
                          setShowDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-orange-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <span className="font-bold text-sm text-gray-800">{item.name}</span>
                        <span className="text-orange-600 font-black text-xs">Rs. {item.price}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Price (Rs)</label>
                  <input type="number" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} placeholder="0" className="w-full mt-2 px-0 py-2 bg-transparent border-b-2 border-zinc-200 focus:border-orange-500 rounded-none focus:outline-none transition-colors text-lg font-medium text-zinc-800"/>
                </div>
                <div className="w-24">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Qty</label>
                  <input type="number" step="any" min="0.1" value={customQty} onChange={e=>setCustomQty(e.target.value)} className="w-full mt-2 px-0 py-2 bg-transparent border-b-2 border-zinc-200 focus:border-orange-500 rounded-none focus:outline-none transition-colors text-lg font-medium text-zinc-800 text-center"/>
                </div>
              </div>
            </div>
            <div className="flex gap-4 p-6 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowCustomModal(false)} className="flex-1 py-3 font-bold text-zinc-500 hover:text-zinc-800 transition-colors">Cancel</button>
              <button onClick={handleAddCustomItem} className="flex-[2] py-3 font-bold text-zinc-950 bg-orange-500 rounded-xl hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/20">Add to Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Search */}
      <div className="p-3 lg:px-5 lg:py-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-white z-10">
        <h2 className="text-lg font-display font-black text-gray-900 shrink-0 tracking-wide">Menu Items</h2>
        <div className="flex w-full sm:w-auto flex-1 max-w-xl items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-xs font-bold"
            />
          </div>

          {/* Animated Category Dropdown */}
          <div className="relative shrink-0 z-20">
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-zinc-900 hover:text-white border border-gray-200 rounded-xl transition-all text-xs font-black uppercase tracking-wider group text-gray-700 hover:border-zinc-800"
            >
              <span>📂 {activeCategory}</span>
              <svg 
                className={`w-3.5 h-3.5 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180 text-orange-500' : 'text-gray-400 group-hover:text-white'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu Overlay with Scale-up, Blur-dissolve Animation */}
            {isCategoryDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsCategoryDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all animate-dropdownScale flex flex-col p-1.5">
                  <style>{`
                    @keyframes dropdownScale {
                      0% { transform: scale(0.95); opacity: 0; filter: blur(4px); }
                      100% { transform: scale(1); opacity: 1; filter: blur(0px); }
                    }
                    .animate-dropdownScale {
                      animation: dropdownScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                  `}</style>
                  {catNames.map(cat => {
                    if (cat === 'Uncategorized' && !items.some(i => !i.category_name)) return null;
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setActiveCategory(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-zinc-950 text-orange-400 shadow-sm'
                            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        <span>{cat}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button 
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="shrink-0 bg-zinc-950 text-white w-9 h-9 flex items-center justify-center rounded-xl font-bold hover:bg-zinc-800 hover:text-orange-500 transition-all shadow-sm group"
            title="Add Custom Item"
          >
            <Plus size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 custom-scrollbar bg-gray-50/50 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <UtensilsCrossed size={48} className="opacity-20 mb-4" />
            <p className="font-bold">No items found</p>
            <p className="text-sm mt-1 opacity-70">Please add new items from the Menu Manager section</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => onAddToCart(item)}
                className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-40 md:h-44 active:scale-95 overflow-hidden group border border-gray-200 relative"
              >
                {/* Item Image */}
                <div className="h-20 md:h-24 w-full bg-orange-50 relative overflow-hidden flex items-center justify-center">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <UtensilsCrossed size={32} className="text-orange-200 group-hover:scale-110 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute top-2 left-2">
                    <span className="text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm border bg-white/90 text-zinc-900 border-white backdrop-blur-md">
                      {item.category_name || 'Uncategorized'}
                    </span>
                  </div>
                </div>

                {/* Item Details */}
                <div className="p-2 md:p-3 flex flex-col justify-between flex-1 bg-white relative">
                  <div className="absolute -top-4 right-2 bg-white px-2 py-1 rounded-lg shadow border border-gray-100 font-display font-black text-orange-600 text-sm">
                    <span className="text-[8px] text-gray-400 mr-0.5 font-sans">RS</span>
                    {item.price}
                  </div>
                  <h3 className="font-bold text-gray-800 text-[12px] md:text-[13px] leading-tight line-clamp-2 pr-10 mt-1">{item.name}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
