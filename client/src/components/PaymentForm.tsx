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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr' | null>(null);
  const [qrData, setQrData] = useState<any>(null);
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

  const handleQRPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('📱 Creating QR payment...');

      const response = await fetch('/api/create-qr-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          tier: selectedTier
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create QR payment');
      }

      const qrPaymentData = await response.json();
      console.log('✅ QR payment created:', qrPaymentData);

      setQrData(qrPaymentData);
      setPaymentMethod('qr');

    } catch (error: any) {
      console.error('❌ QR payment error:', error);
      setError(error.message);
      onPaymentError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRPaymentComplete = () => {
    if (qrData) {
      onPaymentSuccess({
        payment_intent_id: qrData.paymentId,
        amount: amount * 100, // Convert to paise for consistency
        currency: 'INR',
        payment_status: 'captured'
      });
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

  if (paymentMethod === 'qr' && qrData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">UPI QR Payment</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-lg font-semibold">₹{amount}</div>
          
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-sm text-gray-600 mb-2">Scan QR Code or Pay to UPI ID:</div>
            <div className="font-mono text-sm bg-gray-100 p-2 rounded">
              {qrData.upiId}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After completing payment via UPI, click "Payment Complete" below
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button onClick={handleQRPaymentComplete} className="w-full bg-green-600 hover:bg-green-700">
              ✅ Payment Complete
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setPaymentMethod(null);
                setQrData(null);
              }}
              className="w-full"
            >
              ← Back to Payment Options
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
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

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleCardPayment}
            disabled={isProcessing}
            className="flex items-center justify-center space-x-2 h-12 bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing && paymentMethod === 'card' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            <span>Card Payment</span>
          </Button>

          <Button
            onClick={handleQRPayment}
            disabled={isProcessing}
            variant="outline"
            className="flex items-center justify-center space-x-2 h-12 border-green-600 text-green-600 hover:bg-green-50"
          >
            {isProcessing && paymentMethod === 'qr' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            <span>UPI/QR Payment</span>
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>🔒 Secure payment powered by Razorpay</p>
          <p>Supports all major cards and UPI</p>
        </div>
      </CardContent>
    </Card>
  );
}