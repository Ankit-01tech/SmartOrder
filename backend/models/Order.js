const mongoose = require('mongoose');

const genToken = () => {
  const hex = () => Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
  return [hex(),hex(),hex(),hex(),hex(),hex(),hex(),hex()].join('-');
};

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  name:     { type: String },
  price:    { type: Number },
  quantity: { type: Number, required: true, min: 1 },
  prepTime: { type: Number },
});

const orderSchema = new mongoose.Schema(
  {
    orderId:  { type: String, default: () => 'CQ-' + Math.floor(1000 + Math.random() * 9000), unique: true },
    qrToken:  { type: String, default: genToken },
    student:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items:    [orderItemSchema],

    // Payment state — order only enters kitchen queue when paymentStatus === 'paid'
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, default: 'razorpay' },
    paymentRef:    { type: String, default: '' },       // UTR / transaction ref
    paymentPaidAt: { type: Date },

    // Razorpay Gateway V3 fields
    gateway:               { type: String, default: 'razorpay' },
    gatewayOrderId:        { type: String, index: true, default: '' },
    gatewayPaymentId:      { type: String, index: true, default: '' },
    gatewaySignature:      { type: String, default: '' },
    paymentVerifiedAt:     { type: Date },
    paymentAmount:         { type: Number },
    paymentCurrency:       { type: String, default: 'INR' },
    paymentFailureReason:  { type: String, default: '' },

    status: {
      type: String,
      enum: ['payment_pending', 'confirmed', 'preparing', 'quality_check', 'ready', 'picked_up', 'cancelled', 'payment_failed'],
      default: 'payment_pending',
    },
    totalAmount:       { type: Number, required: true },
    estimatedWaitTime: { type: Number, default: 10 },
    actualWaitTime:    { type: Number },
    qrVerified:        { type: Boolean, default: false },
    qrVerifiedAt:      { type: Date },
    qrVerifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes:             { type: String, default: '' },
    statusHistory: [{
      status:    { type: String },
      timestamp: { type: Date, default: Date.now },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
