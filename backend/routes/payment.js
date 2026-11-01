const express       = require('express');
const router        = express.Router();
const PaymentConfig = require('../models/PaymentConfig');
const Order         = require('../models/Order');
const Menu          = require('../models/Menu');
const InventoryLog  = require('../models/InventoryLog');
const KitchenStatus = require('../models/KitchenStatus');
const { protect, requireRole } = require('../middleware/auth');
const upload        = require('../middleware/upload');
const {
  getRazorpayCredentials,
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../utils/razorpay');

const sid = (id) => String(id);

/* ── ETA ENGINE HELPER ── */
const calcETA = async (basePrepTime) => {
  const pending = await Order.countDocuments({
    status: { $in: ['confirmed', 'preparing', 'quality_check'] },
  });
  const load = pending > 15 ? 2.5 : pending > 8 ? 1.5 : 1.0;
  return Math.round(basePrepTime + pending * 0.3 + load);
};

/**
 * Shared Idempotent Payment Fulfillment
 * Only transitions to 'paid' & 'confirmed', deducts stock, and alerts Kitchen ONCE.
 */
const fulfillOrderPayment = async ({ order, gatewayPaymentId, gatewaySignature, io, updatedBy, paymentRef }) => {
  if (order.paymentStatus === 'paid') {
    return { alreadyPaid: true, order };
  }

  order.paymentStatus     = 'paid';
  order.paymentMethod     = 'razorpay';
  order.gatewayPaymentId = gatewayPaymentId || order.gatewayPaymentId || '';
  order.gatewaySignature = gatewaySignature || order.gatewaySignature || '';
  if (paymentRef) order.paymentRef = paymentRef;
  order.paymentPaidAt     = new Date();
  order.paymentVerifiedAt = new Date();
  order.status            = 'confirmed';
  order.statusHistory.push({
    status: 'confirmed',
    updatedBy: updatedBy || order.student,
    timestamp: new Date(),
  });
  await order.save();

  // Deduct inventory stock (only on verified payment confirmation)
  for (const item of order.items) {
    const m = await Menu.findById(item.menuItem);
    if (!m) continue;
    const before = m.currentStock;
    m.currentStock    = Math.max(0, m.currentStock - item.quantity);
    m.orderCount      += item.quantity;
    m.todayOrderCount += item.quantity;
    if (m.currentStock <= 0) m.isAvailable = false;
    await m.save();
    await InventoryLog.create({
      menuItem: item.menuItem,
      type: 'consumed',
      quantityBefore: before,
      quantityChange: -item.quantity,
      quantityAfter: m.currentStock,
      updatedBy: updatedBy || order.student,
    });
  }

  const queueLength = await Order.countDocuments({ status: { $in: ['confirmed', 'preparing'] } });
  const eta = order.estimatedWaitTime;

  // Emit Socket.IO notifications to Kitchen, Student, Admin
  io?.to('kitchen').emit('newOrder', { order, queueLength });
  io?.to(`order_${sid(order._id)}`).emit('myOrderUpdate', {
    orderId: sid(order._id), status: 'confirmed', estimatedWaitTime: eta,
  });
  io?.emit('queueUpdate', { queueLength, eta });
  io?.to('admin').emit('adminOrderUpdate', { type: 'new', orderId: sid(order._id) });

  console.log(`✅ [Payment] Order ${order.orderId} (${sid(order._id)}) successfully verified & confirmed.`);
  return { success: true, order };
};

/* ── GET /api/payment/config — any logged-in user ── */
router.get('/config', protect, async (_req, res) => {
  try {
    let config = await PaymentConfig.findOne();
    if (!config) config = await PaymentConfig.create({});

    const { keyId, keySecret, webhookSecret } = await getRazorpayCredentials();

    // NEVER expose secrets to the frontend!
    const safeConfig = {
      _id:                  config._id,
      upiId:                config.upiId,
      qrImage:              config.qrImage,
      phonePe:              config.phonePe,
      contactName:          config.contactName,
      instructions:         config.instructions,
      isRazorpayEnabled:     config.isRazorpayEnabled !== false,
      razorpayKeyId:         keyId,
      hasKeySecret:          Boolean(keySecret),
      hasWebhookSecret:      Boolean(webhookSecret),
    };

    res.json({ success: true, config: safeConfig });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── PATCH /api/payment/config — admin only ── */
router.patch('/config', protect, requireRole('admin'), upload.single('qrImage'), async (req, res) => {
  try {
    const {
      upiId, phonePe, contactName, instructions,
      razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret, isRazorpayEnabled
    } = req.body;

    let config = await PaymentConfig.findOne();
    if (!config) config = new PaymentConfig();

    if (upiId                 !== undefined) config.upiId                 = upiId;
    if (phonePe               !== undefined) config.phonePe               = phonePe;
    if (contactName           !== undefined) config.contactName           = contactName;
    if (instructions          !== undefined) config.instructions          = instructions;
    if (razorpayKeyId         !== undefined) config.razorpayKeyId         = razorpayKeyId.trim();
    if (razorpayKeySecret     !== undefined && razorpayKeySecret.trim() && !razorpayKeySecret.includes('•')) {
      config.razorpayKeySecret = razorpayKeySecret.trim();
    }
    if (razorpayWebhookSecret !== undefined && razorpayWebhookSecret.trim() && !razorpayWebhookSecret.includes('•')) {
      config.razorpayWebhookSecret = razorpayWebhookSecret.trim();
    }
    if (isRazorpayEnabled     !== undefined) config.isRazorpayEnabled     = isRazorpayEnabled === 'true' || isRazorpayEnabled === true;

    if (req.file) {
      config.qrImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    config.updatedBy = req.user._id;
    await config.save();

    const { keyId, keySecret, webhookSecret } = await getRazorpayCredentials();

    const safeConfig = {
      _id:                  config._id,
      upiId:                config.upiId,
      qrImage:              config.qrImage,
      phonePe:              config.phonePe,
      contactName:          config.contactName,
      instructions:         config.instructions,
      isRazorpayEnabled:     config.isRazorpayEnabled !== false,
      razorpayKeyId:         keyId,
      hasKeySecret:          Boolean(keySecret),
      hasWebhookSecret:      Boolean(webhookSecret),
    };

    res.json({ success: true, config: safeConfig });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── POST /api/payment/create-order — student creates Razorpay Order ── */
router.post('/create-order', protect, requireRole('student'), async (req, res) => {
  try {
    // 1. Verify kitchen status
    const ks = await KitchenStatus.findOne().lean();
    if (ks && !ks.isOnline) {
      return res.status(503).json({
        success: false,
        message: 'Kitchen is currently offline. Please try again later.',
      });
    }

    const { items, notes, localOrderId } = req.body;
    let order;

    if (localOrderId) {
      order = await Order.findById(localOrderId);
      if (!order) return res.status(404).json({ success: false, message: 'Existing order not found' });
      if (sid(order.student) !== sid(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied to this order' });
      }
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ success: false, message: 'Order is already paid' });
      }
    } else {
      if (!items?.length) return res.status(400).json({ success: false, message: 'No items in cart' });

      // Calculate AUTHORITATIVE total price strictly from MongoDB items
      const enrichedItems = [];
      let maxPrepTime = 0;

      for (const item of items) {
        const menuItem = await Menu.findById(item.menuItemId);
        if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });
        if (!menuItem.isAvailable || menuItem.currentStock < item.quantity) {
          return res.status(400).json({ success: false, message: `${menuItem.name} is not available` });
        }
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

      // Create local pending order
      order = await Order.create({
        student:           req.user._id,
        items:             enrichedItems,
        totalAmount,
        estimatedWaitTime: estimatedWait,
        notes:             notes || '',
        status:            'payment_pending',
        paymentStatus:     'pending',
        paymentMethod:     'razorpay',
        statusHistory:     [{ status: 'payment_pending', updatedBy: req.user._id }],
      });
    }

    // 2. Create Razorpay Order
    const { keyId } = await getRazorpayCredentials();
    const amountInPaise = Math.round(order.totalAmount * 100);

    const rzpOrder = await createRazorpayOrder({
      amount:   amountInPaise,
      currency: 'INR',
      receipt:  order.orderId,
      notes: {
        localOrderId: sid(order._id),
        studentId:    sid(req.user._id),
        orderIdDisplay: order.orderId,
      },
    });

    order.gateway          = 'razorpay';
    order.gatewayOrderId   = rzpOrder.id;
    order.paymentAmount    = order.totalAmount;
    order.paymentCurrency  = 'INR';
    await order.save();

    console.log(`💳 [Payment] Created Razorpay order ${rzpOrder.id} for local order ${order.orderId} (₹${order.totalAmount})`);

    res.status(201).json({
      success:          true,
      localOrderId:     sid(order._id),
      orderIdDisplay:   order.orderId,
      razorpayOrderId:  rzpOrder.id,
      amount:           order.totalAmount,
      amountInPaise,
      currency:        'INR',
      keyId,
      order,
    });
  } catch (err) {
    console.error('❌ [Payment] create-order failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Payment order creation failed' });
  }
});

/* ── POST /api/payment/verify — student submits Razorpay payment response ── */
router.post('/verify', protect, requireRole('student'), async (req, res) => {
  try {
    const { localOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!localOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing required payment verification parameters' });
    }

    const order = await Order.findById(localOrderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Validate ownership
    if (sid(order.student) !== sid(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied to this order' });
    }

    // Idempotency check: if already paid, return clean success
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Payment already verified', order });
    }

    // 1. Verify HMAC SHA256 Signature
    const { keySecret } = await getRazorpayCredentials();
    const isValidSignature = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret);

    if (!isValidSignature) {
      console.warn(`⚠️ [Payment Security] Invalid signature attempt for order ${order.orderId}`);
      order.status = 'payment_failed';
      order.paymentStatus = 'failed';
      order.paymentFailureReason = 'Invalid cryptographic signature';
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
    }

    // 2. Fetch payment details from Razorpay API for status & exact amount validation
    const expectedAmountPaise = Math.round(order.totalAmount * 100);
    const payment = await fetchRazorpayPayment(razorpayPaymentId, expectedAmountPaise);

    if (!payment) {
      return res.status(400).json({ success: false, message: 'Payment record not found on Razorpay' });
    }

    // Verify status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      order.status = 'payment_failed';
      order.paymentStatus = 'failed';
      order.paymentFailureReason = `Payment status is ${payment.status}`;
      await order.save();
      return res.status(400).json({ success: false, message: `Payment failed with status: ${payment.status}` });
    }

    // 3. EXACT AMOUNT SECURITY CHECK
    if (payment.amount !== expectedAmountPaise) {
      console.error(`🚨 [Security Alert] Amount mismatch! Order total = ${expectedAmountPaise} paise, Paid = ${payment.amount} paise.`);
      order.status = 'payment_failed';
      order.paymentStatus = 'failed';
      order.paymentFailureReason = `Amount mismatch: Expected ₹${order.totalAmount}, Paid ₹${payment.amount / 100}`;
      await order.save();
      return res.status(400).json({
        success: false,
        message: 'Security verification failed: Payment amount does not match order total.',
      });
    }

    // 4. All checks passed — Fulfill order idempotently
    const result = await fulfillOrderPayment({
      order,
      gatewayPaymentId: razorpayPaymentId,
      gatewaySignature: razorpaySignature,
      io: req.io,
      updatedBy: req.user._id,
      paymentRef: razorpayPaymentId,
    });

    res.json({ success: true, message: 'Payment verified & order confirmed! 🎉', order: result.order });
  } catch (err) {
    console.error('❌ [Payment] verification error:', err);
    res.status(500).json({ success: false, message: err.message || 'Payment verification failed' });
  }
});

/* ── POST /api/payment/webhook — Razorpay webhook handler ── */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const { webhookSecret } = await getRazorpayCredentials();

    if (!signature || !webhookSecret) {
      console.warn('⚠️ Webhook received without signature or webhook secret configured');
      return res.status(400).json({ success: false, message: 'Webhook signature missing or unconfigured' });
    }

    // Raw body verification
    const isValid = verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature, webhookSecret);
    if (!isValid) {
      console.error('❌ [Webhook Security] Invalid webhook signature!');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    console.log(`🔔 [Webhook Received] Event: ${event?.event}`);

    if (event?.event === 'payment.captured' || event?.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const localOrderId = paymentEntity?.notes?.localOrderId;

      let order;
      if (localOrderId) order = await Order.findById(localOrderId);
      if (!order && rzpOrderId) order = await Order.findOne({ gatewayOrderId: rzpOrderId });

      if (order) {
        // Validate exact amount
        const expectedAmountPaise = Math.round(order.totalAmount * 100);
        if (paymentEntity.amount === expectedAmountPaise) {
          await fulfillOrderPayment({
            order,
            gatewayPaymentId: paymentEntity.id,
            gatewaySignature: signature,
            io: req.io,
            updatedBy: order.student,
            paymentRef: paymentEntity.id,
          });
        } else {
          console.error(`🚨 Webhook amount mismatch for order ${order.orderId}`);
        }
      }
    } else if (event?.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const localOrderId = paymentEntity?.notes?.localOrderId;

      let order;
      if (localOrderId) order = await Order.findById(localOrderId);
      if (!order && rzpOrderId) order = await Order.findOne({ gatewayOrderId: rzpOrderId });

      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'failed';
        order.status = 'payment_failed';
        order.paymentFailureReason = paymentEntity?.error_description || 'Payment failed on gateway';
        await order.save();
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('❌ Webhook handler error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
