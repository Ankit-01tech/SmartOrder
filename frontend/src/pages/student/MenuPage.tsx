import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { MenuItem } from '../../types';
import MenuCard from '../../components/common/MenuCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getSocket } from '../../utils/socket';

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages'];

const MenuPage: React.FC = () => {
  const [items,    setItems]    = useState<MenuItem[]>([]);
  const [filtered, setFiltered] = useState<MenuItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [cat,      setCat]      = useState('All');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('');
  const [kitchenOnline, setKitchenOnline] = useState(true);

  const fetchMenu = useCallback(() => {
    api.get('/menu').then(res => {
      setItems(res.data.items || []);
      setLoading(false);
    });
    api.get('/orders/queue-status').then(res => {
      setKitchenOnline(res.data.kitchenOnline !== false);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchMenu();

    const socket = getSocket();

    // Real-time menu sync — full item replacement so images always up to date
    socket.on('menuUpdate', ({ type, item, itemId }: any) => {
      setItems(prev => {
        if (type === 'add')    return [...prev, item];
        if (type === 'update') return prev.map(i => i._id === item._id ? item : i);
        if (type === 'delete') return prev.filter(i => i._id !== itemId);
        return prev;
      });
    });

    socket.on('inventoryUpdate', ({ menuItemId, currentStock, isAvailable }: any) => {
      setItems(prev => prev.map(i =>
        i._id === menuItemId ? { ...i, currentStock, isAvailable } : i
      ));
    });

    socket.on('kitchenStatusChange', ({ isOnline }: any) => {
      setKitchenOnline(isOnline);
    });

    return () => {
      socket.off('menuUpdate');
      socket.off('inventoryUpdate');
      socket.off('kitchenStatusChange');
    };
  }, [fetchMenu]);

  useEffect(() => {
    let result = [...items];
    if (cat !== 'All') result = result.filter(i => i.category === cat);
    if (search) result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'price') result.sort((a, b) => a.price - b.price);
    if (sort === 'prep')  result.sort((a, b) => a.prepTime - b.prepTime);
    if (sort === 'pop')   result.sort((a, b) => b.todayOrderCount - a.todayOrderCount);
    setFiltered(result);
  }, [cat, search, sort, items]);

  return (
    <div className="min-h-screen bg-bg p-4 max-w-6xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-poppins font-bold text-xl">🍽️ Full Menu</h1>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} items</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full ${kitchenOnline ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${kitchenOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {kitchenOnline ? 'Kitchen Open' : 'Kitchen Offline'}
        </span>
      </div>

      {!kitchenOnline && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-center">
          <div className="text-2xl mb-1">🔴</div>
          <div className="font-semibold text-red-700 text-sm">Kitchen is currently offline</div>
          <div className="text-xs text-red-500 mt-0.5">Ordering is paused. Please check back later.</div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary transition-all">
          <option value="">Sort by</option>
          <option value="price">Price ↑</option>
          <option value="prep">Fastest first</option>
          <option value="pop">Most popular</option>
        </select>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              cat === c ? 'bg-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-primary hover:text-primary'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner text="Loading menu..." /> : (
        <motion.div
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(item => (
            <motion.div key={item._id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <MenuCard item={item} showBadge kitchenOnline={kitchenOnline} />
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">🍽️</div>
              <div>No items found</div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default MenuPage;
