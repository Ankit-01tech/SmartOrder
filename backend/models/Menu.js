const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Dinner'],
      required: true,
    },
    emoji: { type: String, default: '🍽️' },
    image: { type: String, default: '' },
    prepTime: { type: Number, required: true, min: 1 }, // minutes
    calories: { type: Number, default: 0 },
    tags: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isSpecial: { type: Boolean, default: false },
    // Inventory
    currentStock: { type: Number, default: 50, min: 0 },
    maxStock: { type: Number, default: 50 },
    lowStockThreshold: { type: Number, default: 10 },
    // Analytics
    orderCount: { type: Number, default: 0 },
    todayOrderCount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.0, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Virtual: stock percentage
menuSchema.virtual('stockPercentage').get(function () {
  return Math.round((this.currentStock / this.maxStock) * 100);
});

// Virtual: is low stock
menuSchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.lowStockThreshold;
});

menuSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Menu', menuSchema);
