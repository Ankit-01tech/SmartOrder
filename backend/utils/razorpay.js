const crypto = require('crypto');
const PaymentConfig = require('../models/PaymentConfig');

/**
 * Strict Environment Security Guard:
 * Simulated payments, test bypass signatures, and mock API fallbacks are ONLY allowed when:
 * 1) NODE_ENV !== 'production'
 * AND
 * 2) Explicit TEST_PAYMENT_MODE === 'true' flag is set.
 *
 * In Production (NODE_ENV === 'production') or whenever TEST_PAYMENT_MODE !== 'true',
 * all simulated signatures and mock API fallbacks are 100% BLOCKED & REJECTED.
 */
const isTestModeAllowed = () => {
  return process.env.NODE_ENV !== 'production' && process.env.TEST_PAYMENT_MODE === 'true';
};

/**
 * Fetch Razorpay credentials with fallback logic:
 * Database PaymentConfig -> Process Environment Variables -> Default Test Credentials (if in test mode)
 */
const getRazorpayCredentials = async () => {
  let keyId = process.env.RAZORPAY_KEY_ID || (isTestModeAllowed() ? 'rzp_test_cq2024' : '');
  let keySecret = process.env.RAZORPAY_KEY_SECRET || (isTestModeAllowed() ? 'secret_cq2024' : '');
  let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || (isTestModeAllowed() ? 'whsec_cq2024' : '');

  try {
    const config = await PaymentConfig.findOne().lean();
    if (config) {
      if (config.razorpayKeyId) keyId = config.razorpayKeyId;
      if (config.razorpayKeySecret) keySecret = config.razorpayKeySecret;
      if (config.razorpayWebhookSecret) webhookSecret = config.razorpayWebhookSecret;
    }
  } catch (err) {
    console.error('Error loading PaymentConfig for Razorpay:', err.message);
  }

  return { keyId, keySecret, webhookSecret };
};

/**
 * Create Razorpay Order via REST API (with strict test mode guard)
 */
const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes }) => {
  const { keyId, keySecret } = await getRazorpayCredentials();

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
    const errBody = await res.text();
    throw new Error(`Razorpay API returned HTTP ${res.status}: ${errBody}`);
  } catch (err) {
    if (isTestModeAllowed()) {
      console.log(`ℹ️ [TEST_PAYMENT_MODE=true] Generating mock gateway order for ₹${amount / 100} (${receipt})`);
      const mockRzpId = 'order_' + Math.random().toString(36).substring(2, 16);
      return {
        id: mockRzpId,
        entity: 'order',
        amount,
        amount_paid: 0,
        amount_due: amount,
        currency,
        receipt,
        status: 'created',
        notes,
        created_at: Math.floor(Date.now() / 1000),
      };
    }
    console.error('❌ Razorpay order creation failed:', err.message);
    throw err;
  }
};

/**
 * Fetch Payment details from Razorpay (with strict test mode guard)
 */
const fetchRazorpayPayment = async (paymentId, amountExpected) => {
  const { keyId, keySecret } = await getRazorpayCredentials();

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
    const errBody = await res.text();
    throw new Error(`Razorpay API returned HTTP ${res.status}: ${errBody}`);
  } catch (err) {
    if (isTestModeAllowed()) {
      console.log(`ℹ️ [TEST_PAYMENT_MODE=true] Simulating payment verification for ${paymentId}`);
      return {
        id: paymentId,
        entity: 'payment',
        amount: amountExpected,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
        captured: true,
      };
    }
    console.error('❌ Razorpay payment fetch failed:', err.message);
    throw err;
  }
};

/**
 * HMAC-SHA256 Payment Signature Verification (Protected by Environment Guard)
 */
const verifyPaymentSignature = (orderId, paymentId, signature, secret) => {
  if (!orderId || !paymentId || !signature || !secret) return false;
  
  // Test mode signature bypass — STRICTLY DISALLOWED IN PRODUCTION
  if (isTestModeAllowed() && signature === 'simulated_signature') {
    console.log(`ℹ️ [TEST_PAYMENT_MODE=true] Accepting simulated payment signature for testing.`);
    return true;
  }

  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
};

/**
 * HMAC-SHA256 Webhook Signature Verification (Protected by Environment Guard)
 */
const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature || !secret) return false;

  // Test mode webhook signature bypass — STRICTLY DISALLOWED IN PRODUCTION
  if (isTestModeAllowed() && signature === 'simulated_webhook_signature') {
    console.log(`ℹ️ [TEST_PAYMENT_MODE=true] Accepting simulated webhook signature for testing.`);
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');
  return expectedSignature === signature;
};

module.exports = {
  isTestModeAllowed,
  getRazorpayCredentials,
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
