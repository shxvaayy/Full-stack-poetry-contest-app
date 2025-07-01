import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentFormProps {
  amount: number;
  tier: string;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  tier,
  onSuccess,
  onError,
  onBack
}) => {
  const { toast } = useToast();
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);
  const [isProcessingPayPal, setIsProcessingPayPal] = useState(false);

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
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

  // Handle Razorpay Payment - WITH YOUR ACTUAL KEY
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingRazorpay(true);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      // Create order
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`
        }),
      });

      if (!orderResponse.ok) {
        throw new Error(`Order creation failed: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();

      // Initialize Razorpay - WITH YOUR ACTUAL KEY
      const options = {
        key: 'rzp_test_KmhJU8QZfO04Pu', // ✅ Your actual Razorpay key
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Writory Poetry Contest',
        description: `${tier} tier submission`,
        order_id: orderData.id,
        handler: async (response: any) => {
          // Verify payment
          try {
            const verifyResponse = await fetch('/api/verify-payment', {
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
              const paymentData = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_method: 'razorpay',
                amount: amount,
                payment_status: 'completed'
              };
              
              toast({
                title: "Payment Successful!",
                description: "Your payment has been processed successfully.",
              });
              
              onSuccess(paymentData);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: any) {
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support.",
              variant: "destructive"
            });
            onError('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingRazorpay(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user.",
              variant: "destructive"
            });
          }
        },
        theme: {
          color: '#8B5CF6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || 'Payment failed',
        variant: "destructive"
      });
      onError(error.message || 'Payment failed');
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  // Handle PayPal Payment
  const handlePayPalPayment = async () => {
    try {
      setIsProcessingPayPal(true);

      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'USD'
        }),
      });

      if (!response.ok) {
        throw new Error(`PayPal order creation failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.approval_url) {
        window.location.href = data.approval_url;
      } else {
        throw new Error('No PayPal approval URL received');
      }

    } catch (error: any) {
      toast({
        title: "PayPal Error",
        description: error.message || 'PayPal payment failed',
        variant: "destructive"
      });
      onError(error.message || 'PayPal payment failed');
    } finally {
      setIsProcessingPayPal(false);
    }
  };

  // Get poem count for display
  const getPoemCount = (tier: string): number => {
    const counts = { 'free': 1, 'single': 1, 'double': 2, 'bulk': 5 };
    return counts[tier as keyof typeof counts] || 1;
  };

  const poemCount = getPoemCount(tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment</h1>
          <p className="text-lg text-gray-600">Complete your payment to submit your poems</p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            {/* Order Summary */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Tier:</span>
                  <span className="capitalize">{tier.replace('_', ' ')} Poems</span>
                </div>
                <div className="flex justify-between">
                  <span>Poems:</span>
                  <span>{poemCount}</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>₹{amount}</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Complete Payment - ₹{amount}
                </h3>
                <p className="text-gray-600">Choose your payment method</p>
              </div>

              {/* PayPal Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-600 text-sm">
                  <strong>PayPal Note:</strong> PayPal charges in USD. ₹{amount} = ~${(amount * 0.012).toFixed(2)} USD (exchange rates may vary)
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="space-y-4">
                {/* Razorpay Button */}
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={isProcessingRazorpay || isProcessingPayPal}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessingRazorpay ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {isProcessingRazorpay ? 'Processing...' : `Pay with Razorpay (₹${amount})`}
                </Button>

                {/* PayPal Button */}
                <Button
                  onClick={handlePayPalPayment}
                  disabled={isProcessingRazorpay || isProcessingPayPal}
                  className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  {isProcessingPayPal ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <div className="flex items-center">
                      <span className="mr-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">PP</span>
                      PayPal
                    </div>
                  )}
                  <span className="ml-auto">${(amount * 0.012).toFixed(2)} USD</span>
                </Button>
              </div>

              {/* Back Button */}
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full"
                disabled={isProcessingRazorpay || isProcessingPayPal}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Form
              </Button>

              {/* Payment Info */}
              <div className="text-center text-sm text-gray-500">
                <p>Secure payments powered by Razorpay & PayPal</p>
                <p>Your payment information is encrypted and secure</p>
                <p className="mt-2">
                  <strong>Razorpay:</strong> Pay in INR (₹{amount}) • <strong>PayPal:</strong> Pay in USD (~${(amount * 0.012).toFixed(2)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentForm;