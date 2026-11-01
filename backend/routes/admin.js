const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const Menu    = require('../models/Menu');
const User    = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

/* ── GET /api/admin/analytics ── */
router.get('/analytics', protect, requireRole('admin'), async (_req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week  = new Date(today); week.setDate(week.getDate() - 6);

    const [totalToday, revenueToday, topItems, weeklyOrders, studentCount] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today }, status: { $ne: 'cancelled' }, paymentStatus: 'paid' }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Menu.find().sort({ todayOrderCount: -1 }).limit(5).select('name emoji todayOrderCount price'),
      Order.aggregate([
        { $match: { createdAt: { $gte: week }, paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
        { $group: {
          _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count:   { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        }},
        { $sort: { _id: 1 } },
      ]),
      User.countDocuments({ role: 'student' }),
    ]);

    res.json({
      success: true,
      data: {
        todayOrders:  totalToday,
        todayRevenue: revenueToday[0]?.total || 0,
        topItems,
        weeklyOrders,
        studentCount,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── GET /api/admin/users — list all users ── */
router.get('/users', protect, requireRole('admin'), async (_req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── GET /api/admin/kitchen-requests — pending kitchen registrations ── */
router.get('/kitchen-requests', protect, requireRole('admin'), async (_req, res) => {
  try {
    const requests = await User.find({ role: 'kitchen', accountStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── PATCH /api/admin/kitchen-requests/:id — approve or reject ── */
router.patch('/kitchen-requests/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { action } = req.body; // 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'kitchen')
      return res.status(404).json({ success: false, message: 'Kitchen user not found' });

    user.accountStatus = action === 'approve' ? 'approved' : 'rejected';
    await user.save();

    // Notify via socket if possible (the user may not be connected)
    req.io?.emit('kitchenApprovalResult', {
      userId: String(user._id),
      status: user.accountStatus,
    });

    res.json({ success: true, user, message: `Kitchen account ${user.accountStatus}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── DELETE /api/admin/users/:id ── */
router.delete('/users/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
