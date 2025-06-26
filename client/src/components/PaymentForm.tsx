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
  onPaymentSuccess: () => void;
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

  // Create payment intent only for card payments
  useEffect(() => {
    const createPaymentIntent = async () => {
      // Only create payment intent for card payments
      if (paymentMethod !== 'card') {
        setError(''); // Clear any existing errors for QR
        return;
      }

      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            amount: amount * 100,
            currency: 'inr'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
        setError(''); // Clear error on success
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setError('Card payment unavailable. Please use QR payment.');
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount, paymentMethod]);

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
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setError(error.message || 'Payment failed. Please try again.');
      } else if (paymentIntent.status === 'succeeded') {
        onPaymentSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRPayment = () => {
    // Simple QR payment confirmation
    const confirmed = window.confirm(
      `Please confirm you have paid ₹${amount} via UPI/QR code and click OK to proceed.`
    );
    
    if (confirmed) {
      onPaymentSuccess();
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
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
        >
          📱 UPI/QR Payment
        </button>
      </div>

      {/* Error Display - Only show for card payments or general errors */}
      {error && paymentMethod === 'card' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <form onSubmit={handleCardPayment}>
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <CardElement options={cardElementOptions} />
          </div>
          
          <button
            type="submit"
            disabled={!stripe || isProcessing || !clientSecret}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              isProcessing || !stripe || !clientSecret
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isProcessing ? 'Processing...' : `Pay ₹${amount}`}
          </button>
        </form>
      )}

      {/* QR Payment */}
      {paymentMethod === 'qr' && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 rounded-lg mb-4 border">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-semibold mb-2">UPI Payment</h3>
            <p className="text-gray-600 mb-2">
              Pay ₹{amount} using any UPI app
            </p>
            <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300">
              <p className="font-mono text-sm text-gray-700">UPI ID: writory@paytm</p>
              <p className="text-xs text-gray-500 mt-1">Or scan QR from any UPI app</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-700">
              ⚠️ Please pay exactly ₹{amount} and click confirm below
            </p>
          </div>
          
          <button
            onClick={handleQRPayment}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            ✅ I've Completed Payment
          </button>
        </div>
      )}

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="w-full mt-4 py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors"
      >
        Cancel Payment
      </button>
    </div>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm;