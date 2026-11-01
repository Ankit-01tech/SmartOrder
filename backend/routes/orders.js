const express = require('express');
const router  = express.Router();
const {
  createOrder, getOrderById, updateOrderStatus, verifyQR,
  getMyOrders, getKitchenOrders, getQueueStatus, confirmPayment,
} = require('../controllers/orderController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/queue-status',   getQueueStatus);
router.post('/',              protect, requireRole('student'), createOrder);
router.post('/:id/confirm-payment', protect, requireRole('student'), confirmPayment);
router.get('/my',             protect, getMyOrders);
router.get('/kitchen',        protect, requireRole('kitchen', 'admin'), getKitchenOrders);
router.get('/:id',            protect, getOrderById);
router.patch('/:id/status',   protect, requireRole('kitchen', 'admin'), updateOrderStatus);
router.post('/verify-qr',     protect, requireRole('kitchen', 'admin'), verifyQR);

module.exports = router;
