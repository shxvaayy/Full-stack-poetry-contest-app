import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Load Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentFormProps {
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({ 
  amount, 
  onPaymentSuccess, 
  onCancel 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr'>('qr'); // Default to QR
  const [clientSecret, setClientSecret] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  // Create payment intent with better error handling
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (paymentMethod !== 'card') {
        setError('');
        return;
      }

      try {
        setError('');
        console.log('🔄 Creating payment intent for amount:', amount);

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ 
            amount: amount,
            currency: 'inr'
          }),
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = JSON.parse(responseText);
        console.log('✅ Payment intent created:', data.paymentIntentId);
        
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setRetryCount(0);
        
      } catch (error: any) {
        console.error('❌ Error creating payment intent:', error);
        
        // Retry logic for network errors
        if (retryCount < 2) {
          console.log('🔄 Retrying payment intent creation...');
          setRetryCount(prev => prev + 1);
          setTimeout(() => createPaymentIntent(), 2000);
          return;
        }
        
        setError('Card payment temporarily unavailable. Please use UPI/QR payment.');
        setPaymentMethod('qr'); // Auto-switch to QR
      }
    };

    if (amount > 0 && stripe && paymentMethod === 'card') {
      createPaymentIntent();
    }
  }, [amount, paymentMethod, stripe, retryCount]);

  const handleCardPayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try UPI/QR payment.');
      return;
    }

    setIsProcessing(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card information not found.');
      setIsProcessing(false);
      return;
    }

    try {
      console.log('💳 Processing card payment...');
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        console.error('❌ Payment error:', error);
        setError(error.message || 'Payment failed. Please try UPI/QR payment.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        onPaymentSuccess(paymentIntent.id);
      } else {
        setError('Payment was not completed. Please try UPI/QR payment.');
      }
    } catch (error: any) {
      console.error('❌ Payment processing error:', error);
      setError('Payment failed. Please try UPI/QR payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRPayment = () => {
    // Generate a unique QR payment ID
    const qrPaymentId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('✅ QR Payment confirmed:', qrPaymentId);
    onPaymentSuccess(qrPaymentId);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#aab7c4',
        },
        iconColor: '#666EE8',
      },
      invalid: {
        color: '#9e2146',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: true,
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">
        Complete Payment - ₹{amount}
      </h2>
      
      <p className="text-gray-600 text-center mb-6">
        Choose your payment method
      </p>

      {/* Payment Method Selection */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPaymentMethod('card')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            paymentMethod === 'card'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          disabled={isProcessing}
        >
          💳 Card Payment
        </button>
        <button
          onClick={() => setPaymentMethod('qr')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            paymentMethod === 'qr'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          disabled={isProcessing}
        >
          📱 UPI/QR Payment
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <div>
          {!clientSecret && !error && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              <div className="flex items-center">
                <span className="animate-spin mr-2">🔄</span>
                Loading payment form...
              </div>
            </div>
          )}

          {clientSecret && (
            <form onSubmit={handleCardPayment}>
              <div className="mb-6 p-4 border-2 border-gray-200 rounded-lg focus-within:border-green-500 transition-colors">
                <CardElement options={cardElementOptions} />
              </div>
              
              <button
                type="submit"
                disabled={!stripe || isProcessing || !clientSecret}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  isProcessing || !stripe || !clientSecret
                    ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">🔄</span>
                    Processing...
                  </span>
                ) : (
                  `Pay ₹${amount}`
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* QR Payment - Enhanced */}
      {paymentMethod === 'qr' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-semibold mb-2">Scan QR code with any UPI app</h3>
            
            {/* Mock QR Code */}
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-blue-300 mb-4 mx-auto w-48 h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <p className="font-mono text-xl font-bold">₹{amount}</p>
                <p className="text-xs text-gray-600 mt-1">Amount to pay</p>
              </div>
            </div>
            
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>UPI ID:</strong> writorycontest@paytm</p>
              <p><strong>Name:</strong> Writory Contest</p>
            </div>
            
            <p className="text-xs text-blue-600 mt-3">
              Pay using PhonePe, Google Pay, Paytm, or any UPI app
            </p>
          </div>

          <button
            onClick={handleQRPayment}
            disabled={isProcessing}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">🔄</span>
                Processing...
              </span>
            ) : (
              'I have completed the payment'
            )}
          </button>
        </div>
      )}

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        disabled={isProcessing}
        className="w-full mt-4 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cancel Payment
      </button>

      {/* Stripe Badge */}
      <div className="text-center mt-4 text-xs text-gray-500">
        <p>Secure payment powered by Stripe</p>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );
};

// Main component with Elements provider
const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm;