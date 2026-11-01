import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { Order } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime } from '../../utils/eta';

const OrderHistoryPage: React.FC = () => {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders/my')
      .then(res => setOrders(res.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading order history..." />;

  return (
    <div className="min-h-screen bg-bg p-4 max-w-3xl mx-auto page-enter">
      <h1 className="font-poppins font-bold text-xl mb-5">📋 Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p>No orders yet. Start ordering!</p>
          <Link to="/menu" className="mt-4 inline-block bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold">
            Browse Menu
          </Link>
        </div>
      ) : (
        <motion.div className="space-y-3" initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
          {orders.map(order => {
            if (!order?._id) return null;
            const itemSummary = Array.isArray(order.items)
              ? order.items.filter(Boolean).map(i => `${i?.name || 'Item'} ×${i?.quantity || 1}`).join(', ')
              : '';
            const isPendingPay = order.status === 'payment_pending';

            return (
              <motion.div key={String(order._id)}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                className={`bg-white rounded-2xl border shadow-glass p-4 ${isPendingPay ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{order.orderId || `#${String(order._id).slice(-4)}`}</div>
                    <div className="text-xs text-gray-400">{formatTime(order.createdAt)}</div>
                  </div>
                  <StatusBadge status={order.status || 'confirmed'} />
                </div>

                {itemSummary && (
                  <div className="text-xs text-gray-500 mb-2 truncate">{itemSummary}</div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary text-sm">₹{order.totalAmount || 0}</span>
                  <div className="flex gap-2">
                    {isPendingPay && (
                      <button onClick={() => navigate('/payment', { state: { order } })}
                        className="text-xs bg-amber-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-amber-600 transition-all">
                        💳 Pay Now
                      </button>
                    )}
                    <Link to={`/track/${order._id}`}
                      className="text-xs text-primary font-medium hover:underline">
                      {['confirmed','preparing','quality_check','ready'].includes(order.status || '')
                        ? 'Track →'
                        : 'View →'}
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
