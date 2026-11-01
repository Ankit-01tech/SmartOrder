process.env.NODE_ENV = 'production';
delete process.env.TEST_PAYMENT_MODE;

const {
  isTestModeAllowed,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../utils/razorpay');

console.log('🛡️  Running Security Audit Verification (Production Mode Guard Test)...\n');

// 1. Verify isTestModeAllowed is FALSE in production
const testAllowed = isTestModeAllowed();
console.log(`Guard Check: isTestModeAllowed() in production = ${testAllowed}`);
if (testAllowed === false) {
  console.log('✅ PASS: isTestModeAllowed() is strictly FALSE when NODE_ENV=production.');
} else {
  console.error('❌ FAIL: isTestModeAllowed() returned true in production!');
  process.exit(1);
}

// 2. Verify simulated payment signature is REJECTED in production
const sigResult = verifyPaymentSignature('order_123', 'pay_123', 'simulated_signature', 'my_secret');
console.log(`Signature Check: verifyPaymentSignature('simulated_signature') = ${sigResult}`);
if (sigResult === false) {
  console.log('✅ PASS: "simulated_signature" is strictly REJECTED in production mode.');
} else {
  console.error('❌ FAIL: "simulated_signature" was accepted in production!');
  process.exit(1);
}

// 3. Verify simulated webhook signature is REJECTED in production
const webResult = verifyWebhookSignature('{}', 'simulated_webhook_signature', 'my_secret');
console.log(`Webhook Check: verifyWebhookSignature('simulated_webhook_signature') = ${webResult}`);
if (webResult === false) {
  console.log('✅ PASS: "simulated_webhook_signature" is strictly REJECTED in production mode.');
} else {
  console.error('❌ FAIL: "simulated_webhook_signature" was accepted in production!');
  process.exit(1);
}

console.log('\n🎉 PRODUCTION SECURITY GUARD AUDIT PASSED 100%!\n');
process.exit(0);
