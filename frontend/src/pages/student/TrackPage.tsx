import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';
import { Order } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime } from '../../utils/eta';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';

const STEPS = [
  { key: 'confirmed',     label: 'Order Confirmed',  icon: '✅', desc: 'Payment verified — kitchen notified' },
  { key: 'preparing',     label: 'Preparing',         icon: '👨‍🍳', desc: 'Chefs are cooking your items' },
  { key: 'quality_check', label: 'Quality Check',     icon: '🔍', desc: 'Final taste & quality check' },
  { key: 'ready',         label: 'Ready for Pickup',  icon: '🎉', desc: 'Head to Counter 2 with your QR code' },
];
const STATUS_ORDER = ['confirmed','preparing','quality_check','ready','picked_up'];

const TrackPage: React.FC = () => {
  const { orderId }  = useParams<{ orderId: string }>();
  const navigate     = useNavigate();
  const { dispatch } = useCart();
  const [order,    setOrder]    = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const joinedRoom = useRef<string>('');

  const fetchData = async () => {
    try {
      if (orderId) {
        const r = await api.get(`/orders/${orderId}`);
        setOrder(r.data.order);
      }
      const all = await api.get('/orders/my');
      setMyOrders(all.data.orders || []);
      if (!orderId && all.data.orders?.length) {
        // Show most recent non-payment_pending order, or the very latest
        const active = all.data.orders.find((o: Order) =>
          ['confirmed','preparing','quality_check','ready'].includes(o.status)
        );
        setOrder(active || all.data.orders[0]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [orderId]); // eslint-disable-line

  useEffect(() => {
    if (!order) return;
    const socket = getSocket();
    const roomId = String(order._id);
    if (joinedRoom.current && joinedRoom.current !== roomId) socket.emit('leaveOrder', joinedRoom.current);
    socket.emit('joinOrder', roomId);
    joinedRoom.current = roomId;

    const handleUpdate = ({ orderId: updId, status }: { orderId: string; status: string }) => {
      if (!updId || updId === roomId) {
        setOrder(prev => prev ? { ...prev, status: status as Order['status'] } : prev);
        setMyOrders(prev => prev.map(o => String(o._id) === roomId ? { ...o, status: status as Order['status'] } : o));
        if (status === 'ready')     toast.success('🎉 Your order is ready! Head to Counter 2');
        if (status === 'preparing') toast('👨‍🍳 Kitchen started preparing your order');
        if (status === 'picked_up') {
          toast.success('📦 Order picked up — enjoy your meal!');
          dispatch({ type: 'CLEAR' }); // clear cart on successful pickup
        }
      }
    };

    socket.on('myOrderUpdate', handleUpdate);
    return () => { socket.off('myOrderUpdate', handleUpdate); };
  }, [order?._id, dispatch]);

  if (loading) return <LoadingSpinner text="Loading order..." />;

  // If order is payment_pending, redirect to payment
  if (order?.status === 'payment_pending') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-5xl">💳</div>
        <h2 className="font-poppins font-bold text-lg">Payment Pending</h2>
        <p className="text-gray-400 text-sm text-center">This order is awaiting payment confirmation.</p>
        <button onClick={() => navigate('/payment', { state: { order } })}
          className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
          Complete Payment →
        </button>
      </div>
    );
  }

  if (!order) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-4">
      <div className="text-5xl">📋</div>
      <h2 className="font-poppins font-bold text-lg">No active orders</h2>
      <Link to="/menu" className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Order Now</Link>
    </div>
  );

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isPickedUp = order.status === 'picked_up';
  const isCancelled = order.status === 'cancelled';
  const qrValue = `${order.qrToken}|${String(order._id)}`;

  return (
    <div className="min-h-screen bg-bg p-4 max-w-5xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-poppins font-bold text-xl">📍 Order Tracking</h1>
          <p className="text-xs text-gray-400 mt-0.5">Live updates via WebSocket</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <span className="live-dot" style={{ width: 6, height: 6 }} /> Live
        </span>
      </div>

      {/* Order selector */}
      {myOrders.filter(o => o.status !== 'payment_pending').length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {myOrders.filter(o => o.status !== 'payment_pending').slice(0, 6).map(o => (
            <Link key={o._id} to={`/track/${o._id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                String(o._id) === String(order._id) ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-500 hover:border-primary'
              }`}>
              {o.orderId}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tracking card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-poppins font-bold text-base">{order.orderId}</div>
              <div className="text-xs text-gray-400">{formatTime(order.createdAt)}</div>
            </div>
            <StatusBadge status={order.status} large />
          </div>

          {!isPickedUp && !isCancelled ? (
            <div className="space-y-1 mb-5">
              {STEPS.map((step, i) => {
                const done   = STATUS_ORDER.indexOf(step.key) < currentIdx;
                const active = step.key === order.status;
                return (
                  <div key={step.key}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={active ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                            done ? 'bg-green-500 text-white' : active ? 'bg-primary text-white shadow-lg shadow-indigo-300' : 'bg-gray-100 text-gray-400'
                          }`}>
                          {done ? '✓' : step.icon}
                        </motion.div>
                        {i < STEPS.length - 1 && (
                          <div className={`w-0.5 h-5 mt-1 transition-colors duration-500 ${done ? 'bg-green-400' : 'bg-gray-100'}`} />
                        )}
                      </div>
                      <div className="pt-1.5">
                        <div className={`text-sm font-semibold ${done ? 'text-green-600' : active ? 'text-primary' : 'text-gray-400'}`}>{step.label}</div>
                        <div className="text-xs text-gray-400">{step.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`rounded-2xl p-4 text-center mb-5 ${isPickedUp ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-3xl mb-1">{isPickedUp ? '🎉' : '❌'}</div>
              <div className={`font-semibold ${isPickedUp ? 'text-green-700' : 'text-red-700'}`}>
                {isPickedUp ? 'Order picked up!' : 'Order cancelled'}
              </div>
            </div>
          )}

          {!isPickedUp && !isCancelled && (
            <div className="bg-indigo-50 rounded-2xl p-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Estimated Pickup</div>
              <div className="font-poppins text-3xl font-bold text-primary">~{order.estimatedWaitTime} min</div>
            </div>
          )}

          {/* Items */}
          <div className="mt-4">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Items</div>
            {(order.items || []).filter(Boolean).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                <span className="font-semibold">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm mt-2 pt-1 border-t border-gray-100 text-primary">
              <span>Total</span><span>₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* QR Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-6 flex flex-col items-center justify-center text-center">
          <div className="text-sm font-semibold mb-1">QR Pickup Code</div>
          <div className="text-xs text-gray-400 mb-5">Show this at the counter to collect your order</div>

          <AnimatePresence mode="wait">
            {isPickedUp ? (
              <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-4">✅</motion.div>
            ) : (
              <motion.div key="qr" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
                className="bg-white p-4 rounded-2xl border-2 border-indigo-100 mb-4 shadow-inner">
                <QRCode value={qrValue} size={160} fgColor="#1E1B4B" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="font-mono text-xl font-bold text-primary tracking-widest mb-1">{order.orderId}</div>
          <div className="font-mono text-[10px] text-gray-400 mb-4 break-all px-4">{order.qrToken}</div>

          {!isPickedUp && (
            <>
              <div className="text-xs text-gray-400 mb-3">Kitchen scans this to confirm pickup</div>
              <button
                onClick={() => { navigator.clipboard?.writeText(qrValue); toast.success('QR token copied!'); }}
                className="text-xs text-primary underline underline-offset-2 hover:no-underline">
                📋 Copy token for manual entry
              </button>
            </>
          )}

          {order.status === 'ready' && (
            <motion.div animate={{ scale: [1, 1.02, 1], opacity: [1, .85, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="w-full mt-4 bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-green-700 font-bold text-sm">
              🎉 Your order is READY! Head to Counter 2 now
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackPage;
