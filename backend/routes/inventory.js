// routes/inventory.js
const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const InventoryLog = require('../models/InventoryLog');
const { protect, requireRole } = require('../middleware/auth');

router.patch('/update', protect, requireRole('kitchen', 'admin'), async (req, res) => {
  try {
    const { menuItemId, quantity, type = 'restock', notes = '' } = req.body;
    const item = await Menu.findById(menuItemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const before = item.currentStock;
    item.currentStock = type === 'restock'
      ? Math.min(item.maxStock, item.currentStock + quantity)
      : Math.max(0, item.currentStock - quantity);
    item.isAvailable = item.currentStock > 0;
    await item.save();

    await InventoryLog.create({
      menuItem: menuItemId,
      type,
      quantityBefore: before,
      quantityChange: type === 'restock' ? quantity : -quantity,
      quantityAfter: item.currentStock,
      notes,
      updatedBy: req.user._id,
    });

    req.io?.emit('inventoryUpdate', { menuItemId, currentStock: item.currentStock, isAvailable: item.isAvailable });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
