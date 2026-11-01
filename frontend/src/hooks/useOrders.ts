import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import { Order } from '../types';

export const useOrders = (orderId?: string) => {
  const [order,   setOrder]   = useState<Order | null>(null);
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      if (orderId) { const r = await api.get(`/orders/${orderId}`); setOrder(r.data.order); }
      const all = await api.get('/orders/my');
      setOrders(all.data.orders);
    } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => {
    fetchOrders();
    if (orderId) {
      const socket = getSocket();
      socket.emit('joinOrder', orderId);
      socket.on('myOrderUpdate', ({ status }: { status: string }) => {
        setOrder(prev => prev ? { ...prev, status: status as Order['status'] } : null);
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: status as Order['status'] } : o));
      });
      return () => { socket.off('myOrderUpdate'); };
    }
  }, [orderId, fetchOrders]);

  return { order, orders, loading, refetch: fetchOrders };
};
