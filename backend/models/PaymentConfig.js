const mongoose = require('mongoose');

/**
 * Singleton — only one payment config per canteen.
 * Admin manages this; students read from it during checkout.
 */
const paymentConfigSchema = new mongoose.Schema(
  {
    upiId:       { type: String, default: 'canteen@upi' },
    qrImage:     { type: String, default: '' },        // base64 QR image uploaded by admin
    phonePe:     { type: String, default: '' },
    contactName: { type: String, default: 'Canteen' },
    instructions:{ type: String, default: 'Secure payment via Razorpay. Your order will be confirmed automatically after successful payment verification.' },
    
    // Razorpay Gateway V3 credentials & configuration
    razorpayKeyId:         { type: String, default: '' },
    razorpayKeySecret:     { type: String, default: '' },
    razorpayWebhookSecret: { type: String, default: '' },
    isRazorpayEnabled:     { type: Boolean, default: true },

    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);
