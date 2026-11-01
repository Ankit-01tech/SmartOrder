const Order         = require('../models/Order');
const Menu          = require('../models/Menu');
const InventoryLog  = require('../models/InventoryLog');
const KitchenStatus = require('../models/KitchenStatus');
const PaymentConfig = require('../models/PaymentConfig');

const sid = (id) => String(id);

/* ── ETA ENGINE ── */
const calcETA = async (basePrepTime) => {
  const pending = await Order.countDocuments({
    status: { $in: ['confirmed', 'preparing', 'quality_check'] },
  });
  const load = pending > 15 ? 2.5 : pending > 8 ? 1.5 : 1.0;
  return Math.round(basePrepTime + pending * 0.3 + load);
};

/* ── GET /orders/queue-status ── */
exports.getQueueStatus = async (_req, res) => {
  try {
    const queueLength = await Order.countDocuments({ status: { $in: ['confirmed', 'preparing'] } });
    const eta = await calcETA(5);
    // Also return kitchen status
    const ks = await KitchenStatus.findOne().lean();
    res.json({
      success: true,
      queueLength,
      estimatedWait: eta,
      confidence: 94,
      kitchenOnline: ks ? ks.isOnline : true,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── POST /orders — creates order in payment_pending state ── */
exports.createOrder = async (req, res) => {
  try {
    // Check kitchen status first
    const ks = await KitchenStatus.findOne().lean();
    if (ks && !ks.isOnline) {
      return res.status(503).json({
        success: false,
        message: 'Kitchen is currently offline. Please try again later.',
      });
    }

    const { items, notes } = req.body;
    if (!items?.length) return res.status(400).json({ success: false, message: 'No items in order' });

    const enrichedItems = [];
    let maxPrepTime = 0;

    for (const item of items) {
      const menuItem = await Menu.findById(item.menuItemId);
      if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });
      if (!menuItem.isAvailable || menuItem.currentStock < item.quantity)
        return res.status(400).json({ success: false, message: `${menuItem.name} is not available` });

      enrichedItems.push({
        menuItem:  menuItem._id,
        name:      menuItem.name,
        price:     menuItem.price,
        quantity:  item.quantity,
        prepTime:  menuItem.prepTime,
      });
      maxPrepTime = Math.max(maxPrepTime, menuItem.prepTime);
    }

    const estimatedWait = await calcETA(maxPrepTime);
    const totalAmount   = enrichedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Order created in payment_pending status — NOT yet sent to kitchen
    const order = await Order.create({
      student:           req.user._id,
      items:             enrichedItems,
      totalAmount,
      estimatedWaitTime: estimatedWait,
      notes:             notes || '',
      status:            'payment_pending',
      paymentStatus:     'pending',
      statusHistory:     [{ status: 'payment_pending', updatedBy: req.user._id }],
    });

    // Fetch payment config for response
    const payConfig = await PaymentConfig.findOne().lean();

    res.status(201).json({ success: true, order, paymentConfig: payConfig });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── POST /orders/:id/confirm-payment (Deprecated/Disabled) ── */
exports.confirmPayment = async (_req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Manual UTR declaration is disabled in Payment System V3. Please complete payment using Razorpay Checkout.',
  });
};

/* ── GET /orders/:id ── */
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.menuItem', 'name emoji image');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (sid(order.student) !== sid(req.user._id) && req.user.role === 'student')
      return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── PATCH /orders/:id/status ── */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['confirmed','preparing','quality_check','ready','picked_up','cancelled'];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Kitchen cannot progress an unpaid order
    if (order.paymentStatus !== 'paid' && status !== 'cancelled')
      return res.status(400).json({ success: false, message: 'Order payment not confirmed yet' });

    order.status = status;
    order.statusHistory.push({ status, updatedBy: req.user._id, timestamp: new Date() });
    if (status === 'picked_up') order.actualWaitTime = Math.round((Date.now() - order.createdAt) / 60000);
    await order.save();

    const orderIdStr = sid(order._id);
    const queueLength = await Order.countDocuments({ status: { $in: ['confirmed','preparing','quality_check'] } });
    const eta = await calcETA(5);

    req.io?.to(`order_${orderIdStr}`).emit('myOrderUpdate', { orderId: orderIdStr, status, estimatedWaitTime: order.estimatedWaitTime });
    req.io?.to('kitchen').emit('kitchenOrderRefresh', { orderId: orderIdStr, status });
    req.io?.to('admin').emit('adminOrderUpdate', { type: 'statusChange', orderId: orderIdStr, status });
    req.io?.emit('queueUpdate', { queueLength, eta });

    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── POST /orders/verify-qr ── */
exports.verifyQR = async (req, res) => {
  try {
    const { qrToken: raw } = req.body;
    if (!raw) return res.status(400).json({ success: false, message: 'QR token required' });

    const qrToken = raw.split('|')[0].trim();
    const order = await Order.findOne({ qrToken }).populate('student', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Invalid QR — order not found' });
    if (order.qrVerified) return res.status(400).json({ success: false, message: 'Already verified' });
    if (order.paymentStatus !== 'paid') return res.status(400).json({ success: false, message: 'Order was not paid' });
    if (!['ready','preparing','quality_check'].includes(order.status))
      return res.status(400).json({ success: false, message: `Order is "${order.status}" — not ready for pickup` });

    order.qrVerified    = true;
    order.qrVerifiedAt  = new Date();
    order.qrVerifiedBy  = req.user._id;
    order.status        = 'picked_up';
    order.actualWaitTime = Math.round((Date.now() - order.createdAt) / 60000);
    order.statusHistory.push({ status: 'picked_up', updatedBy: req.user._id, timestamp: new Date() });
    await order.save();

    const orderIdStr = sid(order._id);
    req.io?.to(`order_${orderIdStr}`).emit('myOrderUpdate', { orderId: orderIdStr, status: 'picked_up' });
    req.io?.to('kitchen').emit('kitchenOrderRefresh', { orderId: orderIdStr, status: 'picked_up' });
    const queueLength = await Order.countDocuments({ status: { $in: ['confirmed','preparing','quality_check'] } });
    req.io?.emit('queueUpdate', { queueLength });

    res.json({ success: true, message: 'Pickup verified! ✅', order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET /orders/my ── */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ student: req.user._id })
      .sort({ createdAt: -1 }).limit(20)
      .populate('items.menuItem', 'name emoji image');
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET /orders/kitchen ── */
exports.getKitchenOrders = async (_req, res) => {
  try {
    // Only show PAID orders to kitchen
    const orders = await Order.find({
      paymentStatus: 'paid',
      status: { $in: ['confirmed','preparing','quality_check','ready'] },
    })
      .sort({ createdAt: 1 })
      .populate('student', 'name studentId')
      .populate('items.menuItem', 'name emoji prepTime image');
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
