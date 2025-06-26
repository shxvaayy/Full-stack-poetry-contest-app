import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentFormProps {
  selectedTier: string;
  amount: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentForm({ selectedTier, amount, onPaymentSuccess, onPaymentError }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingPayPal, setIsProcessingPayPal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert INR to USD (approximate rate)
  const usdAmount = (amount * 0.012).toFixed(2);

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

  const handleRazorpayPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      console.log('💳 Creating Razorpay order...');

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
      console.log('✅ Razorpay order created:', orderData);

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Writory Poetry Contest',
        description: `Poetry Contest - ${selectedTier}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log('💰 Razorpay payment successful:', response);
          setIsProcessing(false);
          
          // Immediately call success with Razorpay data
          onPaymentSuccess({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: amount,
            currency: 'INR',
            payment_status: 'captured',
            payment_method: 'razorpay'
          });
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
            console.log('💳 Razorpay payment cancelled by user');
            setIsProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('❌ Razorpay payment error:', error);
      setError(error.message);
      onPaymentError(error.message);
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

      const responseData = await response.json();
      console.log('PayPal response:', responseData);

      if (response.ok && responseData.success && responseData.approvalUrl) {
        console.log('✅ Redirecting to PayPal:', responseData.approvalUrl);
        window.location.href = responseData.approvalUrl;
      } else {
        throw new Error(responseData.error || 'Failed to create PayPal order');
      }

    } catch (error: any) {
      console.error('❌ PayPal payment error:', error);
      setError(`PayPal Error: ${error.message}`);
      onPaymentError(`PayPal Error: ${error.message}`);
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
            onClick={() => onPaymentSuccess({ payment_status: 'free', payment_method: 'free' })}
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

          {/* Currency conversion info for PayPal */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>PayPal Note:</strong> PayPal charges in USD. ₹{amount} = ~${usdAmount} USD (exchange rates may vary)
            </AlertDescription>
          </Alert>

          {/* Razorpay Payment */}
          <Button
            onClick={handleRazorpayPayment}
            disabled={isProcessing || isProcessingPayPal}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold flex items-center justify-center"
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-6 bg-white rounded mr-3 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">RZP</span>
                  </div>
                  <span>Razorpay</span>
                </div>
                <span className="text-sm opacity-90">₹{amount}</span>
              </div>
            )}
          </Button>

          {/* PayPal Payment */}
          <Button
            onClick={handlePayPalPayment}
            disabled={isProcessing || isProcessingPayPal}
            className="w-full h-16 bg-yellow-500 hover:bg-yellow-600 text-white text-lg font-semibold flex items-center justify-center"
          >
            {isProcessingPayPal ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-6 bg-white rounded mr-3 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">PP</span>
                  </div>
                  <span>PayPal</span>
                </div>
                <span className="text-sm opacity-90">${usdAmount} USD</span>
              </div>
            )}
          </Button>

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
        <p className="mt-2">
          <strong>Razorpay:</strong> Pay in INR (₹{amount}) • <strong>PayPal:</strong> Pay in USD (~${usdAmount})
        </p>
      </div>
    </div>
  );
}