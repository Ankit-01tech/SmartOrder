import React from 'react';
import { motion } from 'framer-motion';
import { MenuItem } from '../../types';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';

interface Props {
  item: MenuItem;
  showBadge?: boolean;
  kitchenOnline?: boolean;
}

const MenuCard: React.FC<Props> = ({ item, showBadge, kitchenOnline = true }) => {
  const { dispatch, state } = useCart();
  const cartItem = state.items.find(i => i.menuItemId === item._id);
  const qty = cartItem?.quantity || 0;
  const pct = Math.round((item.currentStock / Math.max(item.maxStock, 1)) * 100);
  const stockColor = pct > 50 ? '#22C55E' : pct > 20 ? '#F59E0B' : '#EF4444';
  const canAdd = item.isAvailable && kitchenOnline;

  const addItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAdd) return;
    dispatch({ type: 'ADD', item: { menuItemId: item._id, name: item.name, price: item.price, emoji: item.emoji, prepTime: item.prepTime } });
    toast.success(`${item.name} added!`, { icon: '🛒' });
  };

  const removeItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'UPDATE_QTY', id: item._id, qty: qty - 1 });
  };

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-glass relative group ${!item.isAvailable || !kitchenOnline ? 'opacity-60' : ''}`}>

      {/* Image */}
      <div className="h-28 relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50">
        <img
          src={item.image || FALLBACK_IMG}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        {item.isSpecial && (
          <span className="absolute top-2 left-2 bg-amber-100/90 backdrop-blur-sm text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ Special</span>
        )}
        {item.todayOrderCount > 20 && showBadge && !item.isSpecial && (
          <span className="absolute top-2 left-2 bg-red-100/90 backdrop-blur-sm text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">🔥 Hot</span>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Sold Out</span>
          </div>
        )}
        {item.isAvailable && !kitchenOnline && (
          <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Kitchen Offline</span>
          </div>
        )}
        {canAdd && qty === 0 && (
          <button onClick={addItem}
            className="absolute top-2 right-2 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
            +
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="font-semibold text-sm leading-snug mb-0.5 truncate" title={item.name}>{item.name}</div>
        <div className="text-[11px] text-gray-400 mb-2">{item.category} · {item.calories} kcal</div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-primary font-bold text-sm">₹{item.price}</span>
          <span className="text-[11px] text-gray-400">⏱ {item.prepTime}m</span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: stockColor }} />
        </div>
        <div className="text-[10px] mb-2" style={{ color: stockColor }}>
          {item.currentStock === 0 ? 'Out of stock' : item.isLowStock ? `Low: ${item.currentStock} left` : 'In stock'}
        </div>

        {canAdd && (
          qty === 0 ? (
            <button onClick={addItem}
              className="w-full bg-indigo-50 text-primary text-xs font-semibold py-1.5 rounded-xl hover:bg-primary hover:text-white transition-all">
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-2 py-1">
              <button onClick={removeItem} className="w-6 h-6 rounded-lg bg-white text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all">−</button>
              <span className="font-bold text-sm text-primary">{qty}</span>
              <button onClick={addItem} className="w-6 h-6 rounded-lg bg-white text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all">+</button>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};

export default MenuCard;
