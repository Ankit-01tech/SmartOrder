import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { calcETA } from '../../utils/eta';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CartPage: React.FC = () => {
  const { state, dispatch, total, maxPrepTime } = useCart();
  const [queueLength,   setQueueLength]   = useState(0);
  const [kitchenOnline, setKitchenOnline] = useState(true);
  const [placing,       setPlacing]       = useState(false);
  const [notes,         setNotes]         = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders/queue-status').then(res => {
      setQueueLength(res.data.queueLength);
      setKitchenOnline(res.data.kitchenOnline !== false);
    }).catch(() => {});
  }, []);

  const eta = calcETA(maxPrepTime || 5, queueLength);

  const proceedToPayment = async () => {
    if (!state.items.length) { toast.error('Your cart is empty!'); return; }
    if (!kitchenOnline) { toast.error('Kitchen is currently offline'); return; }
    setPlacing(true);
    try {
      const payload = {
        items: state.items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        notes,
      };
      const res = await api.post('/orders', payload);
      // Do NOT clear cart yet — clear after payment confirmed
      toast.success('Order created! Complete payment to confirm. 💳');
      navigate('/payment', { state: { order: res.data.order, paymentConfig: res.data.paymentConfig } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create order');
    } finally {
      setPlacing(false);
    }
  };

  if (!state.items.length) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-4">
      <div className="text-6xl">🛒</div>
      <h2 className="font-poppins font-bold text-xl">Your cart is empty</h2>
      <p className="text-gray-400 text-sm">Add items from the menu to get started</p>
      <button onClick={() => navigate('/menu')} className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all">
        Browse Menu
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg p-4 max-w-5xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-poppins font-bold text-xl">🛒 Your Cart</h1>
        <span className="bg-indigo-100 text-primary text-xs font-bold px-3 py-1.5 rounded-full">ETA: ~{eta} min</span>
      </div>

      {/* Kitchen offline banner */}
      {!kitchenOnline && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">🔴</span>
          <div>
            <div className="font-semibold text-sm text-red-700">Kitchen is currently offline</div>
            <div className="text-xs text-red-500 mt-0.5">Orders cannot be placed right now. Please check back later.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3 space-y-3">
          <AnimatePresence>
            {state.items.map(item => (
              <motion.div key={item.menuItemId}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-glass p-4 flex items-center gap-3">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="text-xs text-gray-400">₹{item.price} each • {item.prepTime} min prep</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => dispatch({ type: 'UPDATE_QTY', id: item.menuItemId, qty: item.quantity - 1 })}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-sm font-bold hover:bg-primary hover:text-white hover:border-primary transition-all">−</button>
                  <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                  <button onClick={() => dispatch({ type: 'UPDATE_QTY', id: item.menuItemId, qty: item.quantity + 1 })}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-sm font-bold hover:bg-primary hover:text-white hover:border-primary transition-all">+</button>
                </div>
                <div className="font-bold text-primary text-sm w-14 text-right">₹{item.price * item.quantity}</div>
                <button onClick={() => dispatch({ type: 'REMOVE', id: item.menuItemId })}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-1">✕</button>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <label className="block text-sm font-medium mb-2">📝 Special Instructions (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Less spicy, no onions..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary resize-none transition-all" />
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5 sticky top-20">
            <div className="text-sm font-semibold mb-4">Order Summary</div>
            <div className="space-y-2 mb-4">
              {state.items.map(i => (
                <div key={i.menuItemId} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.name} ×{i.quantity}</span>
                  <span className="font-medium">₹{i.price * i.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 mb-4">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">₹{total}</span>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-3 mb-4 text-xs space-y-1">
              <div className="flex justify-between"><span>Base prep</span><span>{maxPrepTime || 5} min</span></div>
              <div className="flex justify-between"><span>Queue delay ({queueLength})</span><span>{(queueLength * 0.3).toFixed(1)} min</span></div>
              <div className="flex justify-between font-bold text-primary border-t border-indigo-200 pt-1 mt-1">
                <span>AI Estimated Wait</span><span>~{eta} min</span>
              </div>
            </div>

            <button onClick={proceedToPayment} disabled={placing || !kitchenOnline}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 text-sm flex items-center justify-center gap-2">
              {placing
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Order...</>
                : '💳 Proceed to Payment'}
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Pay via UPI → Order confirmed → Kitchen starts cooking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
