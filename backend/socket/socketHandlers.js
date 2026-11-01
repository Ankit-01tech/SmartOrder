const Order         = require('../models/Order');
const KitchenStatus = require('../models/KitchenStatus');

const initSocketHandlers = (io) => {

  const broadcastQueue = async () => {
    const queueLength = await Order.countDocuments({
      status: { $in: ['confirmed','preparing','quality_check'] },
      paymentStatus: 'paid',
    });
    const load = queueLength > 15 ? 2.5 : queueLength > 8 ? 1.5 : 1.0;
    const eta  = Math.round(5 + queueLength * 0.3 + load);
    io.emit('queueUpdate', { queueLength, eta });
    return { queueLength, eta };
  };

  io.on('connection', (socket) => {
    console.log(`🔌 Connected  ${socket.id}`);

    socket.on('joinOrder', (orderId) => {
      socket.join(`order_${String(orderId)}`);
    });
    socket.on('leaveOrder', (orderId) => {
      socket.leave(`order_${String(orderId)}`);
    });
    socket.on('joinKitchen', () => socket.join('kitchen'));
    socket.on('joinAdmin',   () => socket.join('admin'));

    socket.on('getQueueStatus', async () => {
      try {
        const result = await broadcastQueue();
        const ks = await KitchenStatus.findOne().lean();
        socket.emit('queueStatus', { ...result, kitchenOnline: ks ? ks.isOnline : true });
      } catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected ${socket.id}`);
    });
  });

  // Heartbeat every 8 s
  setInterval(async () => {
    try { await broadcastQueue(); } catch (_) {}
  }, 8000);
};

module.exports = { initSocketHandlers };
