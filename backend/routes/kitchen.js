const express       = require('express');
const router        = express.Router();
const KitchenStatus = require('../models/KitchenStatus');
const { protect, requireRole } = require('../middleware/auth');

/* ── GET /api/kitchen/status ── public so student page can check */
router.get('/status', async (_req, res) => {
  try {
    let ks = await KitchenStatus.findOne();
    if (!ks) ks = await KitchenStatus.create({ isOnline: true });
    res.json({ success: true, isOnline: ks.isOnline, offlineReason: ks.offlineReason, updatedAt: ks.updatedAt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

/* ── PATCH /api/kitchen/status — kitchen or admin only ── */
router.patch('/status', protect, requireRole('kitchen', 'admin'), async (req, res) => {
  try {
    const { isOnline, offlineReason = '' } = req.body;
    if (typeof isOnline !== 'boolean')
      return res.status(400).json({ success: false, message: 'isOnline must be boolean' });

    let ks = await KitchenStatus.findOne();
    if (!ks) ks = new KitchenStatus();
    ks.isOnline      = isOnline;
    ks.offlineReason = isOnline ? '' : offlineReason;
    ks.updatedBy     = req.user._id;
    await ks.save();

    // Broadcast to all connected clients
    req.io?.emit('kitchenStatusChange', { isOnline, offlineReason: ks.offlineReason });

    res.json({ success: true, isOnline, offlineReason: ks.offlineReason });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
