const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
    type: { type: String, enum: ['restock', 'consumed', 'adjustment', 'waste'], required: true },
    quantityBefore: { type: Number, required: true },
    quantityChange: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    notes: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
