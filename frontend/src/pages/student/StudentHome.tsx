import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { MenuItem, Order } from '../../types';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

const StudentHome: React.FC = () => {
  const { user }    = useAuth();
  const { dispatch } = useCart();
  const navigate     = useNavigate();

  const [queueLength,   setQueueLength]   = useState(0);
  const [eta,           setEta]           = useState(0);
  const [recs,          setRecs]          = useState<{ item: MenuItem; reason: string }[]>([]);
  const [highlights,    setHighlights]    = useState<MenuItem[]>([]);
  const [activeOrder,   setActiveOrder]   = useState<Order | null>(null);
  const [pendingPayOrder, setPendingPayOrder] = useState<Order | null>(null);
  const [kitchenOnline, setKitchenOnline] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/orders/queue-status'),
      api.get('/recommendations').catch(() => ({ data: { recommendations: [] } })),
      api.get('/menu?available=true'),
      api.get('/orders/my').catch(() => ({ data: { orders: [] } })),
    ]).then(([qRes, recRes, menuRes, ordersRes]) => {
      setQueueLength(qRes.data.queueLength || 0);
      setEta(qRes.data.estimatedWait || 0);
      setKitchenOnline(qRes.data.kitchenOnline !== false);
      setRecs(recRes.data.recommendations?.slice(0, 4) || []);
      const sorted: MenuItem[] = [...(menuRes.data.items || [])].sort(
        (a, b) => b.todayOrderCount - a.todayOrderCount
      );
      setHighlights(sorted.slice(0, 6));
      const orders: Order[] = ordersRes.data.orders || [];
      const active = orders.find(o => ['confirmed','preparing','quality_check','ready'].includes(o.status));
      const pendPay = orders.find(o => o.status === 'payment_pending');
      if (active) setActiveOrder(active);
      if (pendPay) setPendingPayOrder(pendPay);
    }).catch(console.error);

    const socket = getSocket();
    socket.on('queueUpdate', ({ queueLength: q, eta: e }: any) => {
      setQueueLength(q); if (e) setEta(e);
    });
    socket.on('kitchenStatusChange', ({ isOnline }: any) => setKitchenOnline(isOnline));
    socket.on('menuUpdate', ({ type, item, itemId }: any) => {
      setHighlights(prev =>
        type === 'add' ? [item, ...prev].slice(0, 6) :
        type === 'update' ? prev.map(i => i._id === item._id ? item : i) :
        prev.filter(i => i._id !== itemId)
      );
    });

    return () => {
      socket.off('queueUpdate');
      socket.off('kitchenStatusChange');
      socket.off('menuUpdate');
    };
  }, []);

  const addToCart = (item: MenuItem) => {
    if (!kitchenOnline) { toast.error('Kitchen is currently offline'); return; }
    dispatch({ type: 'ADD', item: { menuItemId: item._id, name: item.name, price: item.price, emoji: item.emoji, prepTime: item.prepTime } });
    toast.success(`${item.name} added to cart 🛒`);
  };

  return (
    <div className="min-h-screen bg-bg p-4 max-w-6xl mx-auto page-enter">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 mb-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#06B6D4 100%)' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
        <h1 className="font-poppins text-2xl font-bold mb-1">Hey, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-white/80 text-sm mb-5 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${kitchenOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {kitchenOnline ? 'Kitchen is open · Live updates active' : 'Kitchen is currently offline'}
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Queue',     value: queueLength },
            { label: 'Wait',      value: eta ? `${eta} min` : '—' },
            { label: 'Live Items',value: highlights.length || '—' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xs text-white/65">{s.label}</div>
              <div className="font-poppins text-3xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Kitchen offline banner */}
      {!kitchenOnline && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <div className="font-semibold text-sm text-red-700">Kitchen is offline</div>
            <div className="text-xs text-red-500">New orders are paused. Please check back later.</div>
          </div>
        </div>
      )}

      {/* Pending payment banner */}
      {pendingPayOrder && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-amber-700">💳 Payment pending — {pendingPayOrder.orderId}</div>
            <div className="text-xs text-amber-600 mt-0.5">Complete payment to confirm your order</div>
          </div>
          <button onClick={() => navigate('/payment', { state: { order: pendingPayOrder } })}
            className="bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-amber-600 transition-all">
            Pay Now →
          </button>
        </motion.div>
      )}

      {/* Active order banner */}
      {activeOrder && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white border border-indigo-200 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-glass">
          <div>
            <div className="font-semibold text-sm">
              {activeOrder.orderId} is <span className="text-primary capitalize">{activeOrder.status.replace(/_/g,' ')}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Tap to track live</div>
          </div>
          <Link to={`/track/${activeOrder._id}`}
            className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all">
            Track →
          </Link>
        </motion.div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-poppins font-semibold text-base">✨ Smart Picks for You</h2>
            <span className="text-xs text-gray-400">AI-powered</span>
          </div>
          <motion.div className="flex gap-3 overflow-x-auto pb-2 snap-x" variants={stagger} initial="hidden" animate="show">
            {recs.map(({ item, reason }) => (
              <motion.div key={item._id} variants={fadeUp}
                className={`min-w-[170px] snap-start bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100 rounded-2xl p-3 cursor-pointer card-hover ${!kitchenOnline ? 'opacity-60' : ''}`}
                onClick={() => addToCart(item)}>
                <div className="w-full h-16 rounded-xl overflow-hidden mb-2">
                  <img src={item.image || FALLBACK_IMG} alt={item.name} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
                </div>
                <div className="text-[11px] font-bold text-primary mb-0.5">{reason}</div>
                <div className="text-sm font-semibold leading-snug">{item.name}</div>
                <div className="text-[11px] text-gray-400 mt-1">₹{item.price} · {item.prepTime} min</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Menu highlights */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-poppins font-semibold text-base">🍽️ Menu Highlights</h2>
          <Link to="/menu" className="text-primary text-sm font-semibold hover:underline">View All →</Link>
        </div>
        <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" variants={stagger} initial="hidden" animate="show">
          {highlights.map(item => (
            <motion.div key={item._id} variants={fadeUp}
              className={`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-glass card-hover cursor-pointer relative group ${!item.isAvailable || !kitchenOnline ? 'opacity-55' : ''}`}
              onClick={() => addToCart(item)}>
              <div className="h-24 overflow-hidden">
                <img src={item.image || FALLBACK_IMG} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
              </div>
              {item.todayOrderCount > 20 && (
                <span className="absolute top-1.5 left-1.5 bg-red-100/90 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">🔥 Hot</span>
              )}
              <div className="p-2.5">
                <div className="font-semibold text-xs leading-snug truncate">{item.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-primary font-bold text-xs">₹{item.price}</span>
                  <span className="text-[10px] text-gray-400">⏱{item.prepTime}m</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom CTAs */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link to="/queue" className="bg-white border border-gray-100 shadow-glass rounded-2xl p-4 flex items-center gap-3 card-hover">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-semibold text-sm">Live Queue</div>
            <div className="text-xs text-gray-400">{queueLength} ahead</div>
          </div>
        </Link>
        <Link to="/history" className="bg-white border border-gray-100 shadow-glass rounded-2xl p-4 flex items-center gap-3 card-hover">
          <span className="text-2xl">📋</span>
          <div>
            <div className="font-semibold text-sm">Order History</div>
            <div className="text-xs text-gray-400">View past orders</div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default StudentHome;
