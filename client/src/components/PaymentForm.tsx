import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Smartphone, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentFormProps {
  selectedTier: string;
  amount: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

// Declare Razorpay on window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentForm({ selectedTier, amount, onPaymentSuccess, onPaymentError }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingPayPal, setIsProcessingPayPal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCardPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      console.log('💳 Creating Razorpay order...');

      // Create order
      const orderResponse = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          tier: selectedTier,
          metadata: {
            tier: selectedTier,
            amount: amount.toString()
          }
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();
      console.log('✅ Order created:', orderData);

      // Configure Razorpay options
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Writory Poetry Contest',
        description: `Poetry Contest - ${selectedTier}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log('💰 Payment successful:', response);
          
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/verify-razorpay-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              onPaymentSuccess({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                amount: verifyData.amount,
                currency: verifyData.currency,
                payment_status: 'captured'
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (verifyError) {
            console.error('❌ Payment verification error:', verifyError);
            onPaymentError('Payment verification failed');
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          tier: selectedTier
        },
        theme: {
          color: '#059669'
        },
        modal: {
          ondismiss: function() {
            console.log('💳 Payment cancelled by user');
            setIsProcessing(false);
            onPaymentError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('❌ Card payment error:', error);
      setError(error.message);
      onPaymentError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    try {
      setIsProcessingPayPal(true);
      setError(null);

      console.log('💰 Creating PayPal order...');

      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          tier: selectedTier,
          currency: 'USD'
        }),
      });

      const orderData = await response.json();

      if (orderData.success && orderData.approvalUrl) {
        console.log('✅ Redirecting to PayPal:', orderData.approvalUrl);
        // Redirect to PayPal
        window.location.href = orderData.approvalUrl;
      } else {
        throw new Error(orderData.error || 'Failed to create PayPal order');
      }

    } catch (error: any) {
      console.error('❌ PayPal payment error:', error);
      setError(error.message);
      onPaymentError(error.message);
    } finally {
      setIsProcessingPayPal(false);
    }
  };

  if (selectedTier === 'free') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-600">Free Entry Selected</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Your free entry is ready to submit!</p>
          <Button 
            onClick={() => onPaymentSuccess({ payment_status: 'free' })}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Continue with Free Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Complete Payment - ₹{amount}</CardTitle>
          <p className="text-center text-gray-600">Choose your payment method</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Card Payment - Razorpay */}
          <Button
            onClick={handleCardPayment}
            disabled={isProcessing || isProcessingPayPal}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold"
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <CreditCard className="w-6 h-6 mr-2" />
            )}
            Card Payment
          </Button>

          {/* PayPal Payment */}
          <Button
            onClick={handlePayPalPayment}
            disabled={isProcessing || isProcessingPayPal}
            className="w-full h-16 bg-yellow-500 hover:bg-yellow-600 text-white text-lg font-semibold"
          >
            {isProcessingPayPal ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <span className="w-6 h-6 mr-2 font-bold text-xl">P</span>
            )}
            PayPal
          </Button>

          {/* REMOVED: UPI/QR Payment button */}

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full"
          >
            Back to Form
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>Secure payments powered by Razorpay & PayPal</p>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );
}