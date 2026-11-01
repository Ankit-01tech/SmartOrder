import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface PaymentConfig {
  upiId: string;
  qrImage?: string;
  phonePe?: string;
  contactName: string;
  instructions: string;
  razorpayKeyId?: string;
  isRazorpayEnabled?: boolean;
}

const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dispatch } = useCart();

  const stateData = (location.state || {}) as { order?: any; paymentData?: any };
  const initialOrder = stateData.order;

  const [config,        setConfig]        = useState<PaymentConfig | null>(null);
  const [order,         setOrder]         = useState<any>(initialOrder || null);
  const [processing,    setProcessing]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [paymentState,  setPaymentState]  = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [successInfo,   setSuccessInfo]   = useState<{ paymentId: string; amount: number; orderIdDisplay: string } | null>(null);
  const [errorMessage,  setErrorMessage]  = useState('');

  // Dynamically load Razorpay SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    api.get('/payment/config')
      .then(res => setConfig(res.data.config))
      .catch(() => toast.error('Could not load payment configuration'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!initialOrder && !stateData.paymentData) {
      navigate('/cart');
    }
  }, [initialOrder, stateData, navigate]);

  const verifyPaymentServerSide = async (params: {
    localOrderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderIdDisplay: string;
    amount: number;
  }) => {
    setPaymentState('processing');
    setProcessing(true);
    try {
      const res = await api.post('/payment/verify', {
        localOrderId:     params.localOrderId,
        razorpayOrderId:  params.razorpayOrderId,
        razorpayPaymentId:params.razorpayPaymentId,
        razorpaySignature:params.razorpaySignature,
      });

      if (res.data.success) {
        setPaymentState('success');
        setSuccessInfo({
          paymentId:      params.razorpayPaymentId,
          amount:         params.amount,
          orderIdDisplay: params.orderIdDisplay,
        });
        dispatch({ type: 'CLEAR' });
        toast.success('Payment verified & Order confirmed! 🎉');
        setTimeout(() => {
          navigate(`/track/${params.localOrderId}`);
        }, 2200);
      } else {
        setPaymentState('failed');
        setErrorMessage(res.data.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setPaymentState('failed');
      const msg = err?.response?.data?.message || 'Server-side payment verification failed';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayNow = async () => {
    setProcessing(true);
    setPaymentState('processing');
    setErrorMessage('');

    try {
      // 1. Call backend POST /api/payment/create-order
      const createRes = await api.post('/payment/create-order', {
        localOrderId: order?._id,
        items:        order?.items?.map((i: any) => ({ menuItemId: i.menuItem?._id || i.menuItem, quantity: i.quantity })),
        notes:        order?.notes || '',
      });

      const { localOrderId, razorpayOrderId, amount, amountInPaise, currency, keyId, orderIdDisplay } = createRes.data;

      // Update local order reference if created fresh
      if (createRes.data.order) setOrder(createRes.data.order);

      // 2. Open Razorpay Checkout Modal
      if (window.Razorpay) {
        const options = {
          key:         keyId || config?.razorpayKeyId || 'rzp_test_cq2024',
          amount:      amountInPaise,
          currency:    currency || 'INR',
          name:        config?.contactName || 'SmartOrder',
          description: `Payment for Order ${orderIdDisplay}`,
          order_id:    razorpayOrderId,
          prefill: {
            name:  user?.name  || 'Student User',
            email: user?.email || 'student@demo.com',
          },
          theme: { color: '#4F46E5' },
          handler: async function (response: any) {
            // Received response containing razorpay_payment_id, razorpay_order_id, razorpay_signature
            await verifyPaymentServerSide({
              localOrderId,
              razorpayOrderId:   response.razorpay_order_id || razorpayOrderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderIdDisplay,
              amount,
            });
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
              setPaymentState('idle');
              toast.error('Payment cancelled. Your order was not sent to the kitchen.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setProcessing(false);
          setPaymentState('failed');
          const reason = response.error?.description || 'Payment processing failed';
          setErrorMessage(reason);
          toast.error(`Payment failed: ${reason}`);
        });
        rzp.open();
      } else if (import.meta.env.DEV && import.meta.env.VITE_TEST_PAYMENT_MODE === 'true') {
        // Fallback test mode simulation ONLY in development mode with explicit test flag
        console.log('ℹ️ [VITE_TEST_PAYMENT_MODE=true] Simulating gateway checkout callback...');
        const mockPayId = 'pay_' + Math.random().toString(36).substring(2, 14);
        await verifyPaymentServerSide({
          localOrderId,
          razorpayOrderId,
          razorpayPaymentId: mockPayId,
          razorpaySignature: 'simulated_signature',
          orderIdDisplay,
          amount,
        });
      } else {
        setProcessing(false);
        setPaymentState('failed');
        const msg = 'Payment gateway script failed to load. Please disable ad-blocker or refresh the page.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      setProcessing(false);
      setPaymentState('failed');
      const msg = err?.response?.data?.message || 'Could not initiate payment gateway checkout';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!order) return null;

  return (
    <div className="min-h-screen bg-bg p-4 max-w-xl mx-auto page-enter">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💳</div>
          <h1 className="font-poppins font-bold text-2xl text-primary">Razorpay UPI Checkout</h1>
          <p className="text-gray-400 text-xs mt-1">Payment System V3 — Server-Verified Payment Gateway</p>
        </div>

        {/* Success State Screen */}
        {paymentState === 'success' && successInfo && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-green-200 shadow-card p-6 text-center mb-6">
            <div className="text-6xl mb-3">✅</div>
            <h2 className="font-poppins font-bold text-xl text-green-700 mb-1">Payment Successful!</h2>
            <p className="text-sm text-gray-500 mb-4">Order Confirmed — Sent to Kitchen</p>

            <div className="bg-green-50 rounded-2xl p-4 mb-4 text-left text-xs space-y-2 border border-green-100">
              <div className="flex justify-between"><span className="text-gray-500">Order ID:</span><span className="font-mono font-bold text-gray-800">{successInfo.orderIdDisplay}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount Paid:</span><span className="font-bold text-primary text-sm">₹{successInfo.amount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Payment ID:</span><span className="font-mono text-gray-700">{successInfo.paymentId}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Gateway Status:</span><span className="font-bold text-green-600">PAID ✓</span></div>
            </div>

            <div className="text-xs text-gray-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              Redirecting to Order Tracking...
            </div>
          </motion.div>
        )}

        {/* Failed / Error Alert */}
        {paymentState === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-center">
            <div className="text-2xl mb-1">❌</div>
            <div className="font-bold text-sm text-red-700">Payment Failed / Cancelled</div>
            <div className="text-xs text-red-500 mt-1">{errorMessage || 'Your order was not confirmed or sent to the kitchen.'}</div>
          </div>
        )}

        {/* Order Summary Box */}
        {paymentState !== 'success' && (
          <>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-6 mb-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div>
                  <div className="font-poppins font-bold text-base text-gray-800">Order Summary</div>
                  <div className="text-xs text-gray-400">{order.orderId || 'New Order'}</div>
                </div>
                <div className="font-poppins font-bold text-2xl text-primary">₹{order.totalAmount}</div>
              </div>

              <div className="space-y-2 mb-4">
                {(order.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 font-medium">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                    <span className="font-semibold text-gray-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50/70 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Total Payable Amount</span>
                <span className="font-poppins font-bold text-xl text-primary">₹{order.totalAmount}</span>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-6 mb-5">
              <h3 className="font-poppins font-semibold text-sm mb-3 text-gray-800 flex items-center gap-2">
                <span>🛡️</span> Razorpay Verified Gateway
              </h3>
              
              <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Supported methods: GPay, PhonePe, Paytm, BHIM, Cards & NetBanking</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Server-side cryptographic signature & exact amount verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Kitchen receives order automatically upon payment confirmation</span>
                </div>
              </div>

              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-900 leading-relaxed flex items-start gap-2">
                <span className="text-base">🔒</span>
                <div>
                  <strong>Secure payment via Razorpay.</strong> Your order will be confirmed automatically after successful payment verification.
                </div>
              </div>
            </div>

            {/* Pay Now Button */}
            <button
              onClick={handlePayNow}
              disabled={processing}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-60 text-base shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {paymentState === 'processing' ? 'Verifying Payment Server-Side...' : 'Opening Payment Gateway...'}
                </>
              ) : (
                <>🔒 Pay ₹{order.totalAmount} via Razorpay</>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-400 mt-3">
              Protected by Razorpay 256-bit SSL & Server-Side Signature Verification
            </p>

            <button
              onClick={() => navigate('/cart')}
              disabled={processing}
              className="w-full mt-3 text-xs text-gray-400 hover:text-red-500 py-2 transition-all"
            >
              ← Back to Cart
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentPage;
