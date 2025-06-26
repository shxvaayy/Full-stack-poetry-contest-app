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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr'>('card');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  // Create payment intent with retry logic
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Payment intent created:', data.paymentIntentId);
        
        setClientSecret(data.clientSecret);
        setRetryCount(0); // Reset retry count on success
        
      } catch (error: any) {
        console.error('❌ Error creating payment intent:', error);
        
        // Retry logic for network errors
        if (retryCount < 2 && (error.message.includes('fetch') || error.message.includes('Network'))) {
          console.log('🔄 Retrying payment intent creation...');
          setRetryCount(prev => prev + 1);
          setTimeout(() => createPaymentIntent(), 1000 * (retryCount + 1));
          return;
        }
        
        setError('Card payment unavailable. Please use QR payment.');
      }
    };

    if (amount > 0 && stripe) {
      createPaymentIntent();
    }
  }, [amount, paymentMethod, stripe, retryCount]);

  // Clear error when switching to QR payment
  useEffect(() => {
    if (paymentMethod === 'qr') {
      setError('');
    }
  }, [paymentMethod]);

  const handleCardPayment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.');
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
        setError(error.message || 'Payment failed. Please try again.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        onPaymentSuccess(paymentIntent.id);
      } else {
        setError('Payment was not completed. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Payment processing error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRPayment = () => {
    // Simple QR payment confirmation with better UX
    const qrPaymentHtml = `
      <div style="text-align: center; padding: 20px;">
        <h3>UPI Payment Details</h3>
        <p><strong>Amount: ₹${amount}</strong></p>
        <p>Pay using any UPI app by scanning QR code or using UPI ID</p>
        <p style="margin: 20px 0;">
          <strong>UPI ID:</strong> your-upi-id@paytm<br>
          <strong>Name:</strong> Your Business Name
        </p>
        <p style="font-size: 12px; color: #666;">
          After completing payment, click "I have paid" below
        </p>
      </div>
    `;

    // You can replace this with actual QR code display
    const confirmed = window.confirm(
      `Please pay ₹${amount} via UPI/QR code and click OK after completing the payment.`
    );
    
    if (confirmed) {
      // Generate a mock payment ID for QR payments
      const mockPaymentId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onPaymentSuccess(mockPaymentId);
    }
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

      {/* Loading State */}
      {paymentMethod === 'card' && !clientSecret && !error && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="animate-spin mr-2">🔄</span>
            Loading payment form...
          </div>
        </div>
      )}

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <form onSubmit={handleCardPayment}>
          <div className="mb-6 p-4 border-2 border-gray-200 rounded-lg focus-within:border-green-500 transition-colors">
            <CardElement options={cardElementOptions} />
          </div>
          
          <button
            type="submit"
            disabled={!stripe || isProcessing || !clientSecret || !!error}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              isProcessing || !stripe || !clientSecret || !!error
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

      {/* QR Payment */}
      {paymentMethod === 'qr' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-4xl mb-2">📱</div>
            <p className="text-sm text-blue-800 mb-2">
              Scan QR code with any UPI app or use UPI ID
            </p>
            <div className="bg-white p-3 rounded border-2 border-dashed border-blue-300 mb-3">
              <p className="font-mono text-lg">₹{amount}</p>
              <p className="text-xs text-gray-600">Amount to pay</p>
            </div>
            <p className="text-xs text-blue-600">
              Pay using PhonePe, Google Pay, Paytm, or any UPI app
            </p>
          </div>
          
          <button
            onClick={handleQRPayment}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            I have completed the payment
          </button>
        </div>
      )}

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        disabled={isProcessing}
        className="w-full mt-4 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        Cancel Payment
      </button>

      {/* Help Text */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>Secure payment powered by Stripe</p>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );
};

// Main PaymentForm component with Stripe Elements wrapper
const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm;