const mongoose = require('mongoose');

/**
 * Singleton document — only one record ever exists.
 * Represents the global kitchen online/offline state.
 */
const kitchenStatusSchema = new mongoose.Schema(
  {
    isOnline:     { type: Boolean, default: true },
    offlineReason:{ type: String, default: '' },
    updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KitchenStatus', kitchenStatusSchema);
