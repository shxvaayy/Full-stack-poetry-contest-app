import React, { useState } from 'react';
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
      if (window.Razorpay) {
        console.log('✅ Razorpay already loaded');
        resolve(true);
        return;
      }

      console.log('🔄 Loading Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        console.log('✅ Razorpay script loaded');
        resolve(true);
      };
      script.onerror = () => {
        console.error('❌ Razorpay script failed to load');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Handle Razorpay Payment with comprehensive error handling
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingRazorpay(true);
      console.log('🚀 Starting Razorpay payment...');
      console.log('💰 Amount:', amount);
      console.log('🎯 Tier:', tier);

      // Validate inputs
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      if (!tier) {
        throw new Error('Payment tier not specified');
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment system. Please check your internet connection and try again.');
      }

      // Create order with detailed logging and error handling
      console.log('📞 Creating Razorpay order...');
      
      let orderResponse;
      try {
        orderResponse = await fetch('/api/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}_${tier}`,
            tier: tier
          }),
        });
      } catch (networkError) {
        console.error('❌ Network error during order creation:', networkError);
        throw new Error('Network error. Please check your connection and try again.');
      }

      console.log('📡 Order response status:', orderResponse.status);
      console.log('📡 Order response ok:', orderResponse.ok);

      // Handle non-ok responses
      if (!orderResponse.ok) {
        let errorMessage = `Order creation failed (${orderResponse.status})`;
        
        try {
          const errorData = await orderResponse.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('❌ Order creation error details:', errorData);
        } catch (parseError) {
          const errorText = await orderResponse.text();
          console.error('❌ Order creation failed with text response:', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      let orderData;
      try {
        orderData = await orderResponse.json();
        console.log('✅ Order data received:', orderData);
      } catch (parseError) {
        console.error('❌ Failed to parse order response:', parseError);
        throw new Error('Invalid response from payment server. Please try again.');
      }

      // Validate order data
      if (!orderData || !orderData.id) {
        console.error('❌ Invalid order data:', orderData);
        throw new Error('Invalid order data received from server. Please try again.');
      }

      console.log('🎬 Initializing Razorpay checkout with order:', orderData.id);

      // Initialize Razorpay with comprehensive options
      const razorpayOptions = {
        key: 'rzp_test_KmhJU8QZfO04Pu', // Your test key
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Writory Poetry Contest',
        description: `${tier} tier submission (₹${amount})`,
        order_id: orderData.id,
        handler: async (paymentResponse: any) => {
          console.log('🎉 Payment successful:', paymentResponse);
          
          try {
            console.log('🔍 Verifying payment...');
            
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                amount: amount,
                tier: tier
              }),
            });

            if (verifyResponse.ok) {
              const verificationData = await verifyResponse.json();
              console.log('✅ Payment verified successfully:', verificationData);
              
              const finalPaymentData = {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                payment_method: 'razorpay',
                amount: amount,
                tier: tier,
                payment_status: 'completed',
                verified: true
              };
              
              toast({
                title: "Payment Successful!",
                description: "Your payment has been processed successfully.",
              });
              
              setIsProcessingRazorpay(false);
              onSuccess(finalPaymentData);
            } else {
              const errorData = await verifyResponse.json();
              console.error('❌ Payment verification failed:', errorData);
              throw new Error(errorData.error || 'Payment verification failed');
            }
          } catch (verifyError: any) {
            console.error('❌ Verification error:', verifyError);
            setIsProcessingRazorpay(false);
            toast({
              title: "Payment Verification Failed",
              description: "Payment completed but verification failed. Please contact support with your payment ID.",
              variant: "destructive"
            });
            onError('Payment verification failed: ' + verifyError.message);
          }
        },
        modal: {
          ondismiss: () => {
            console.log('💔 Payment modal dismissed by user');
            setIsProcessingRazorpay(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled.",
              variant: "destructive"
            });
          }
        },
        theme: {
          color: '#8B5CF6'
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          tier: tier,
          amount: amount.toString()
        }
      };

      console.log('🎭 Opening Razorpay modal...');
      const rzp = new window.Razorpay(razorpayOptions);
      
      // Handle payment failures
      rzp.on('payment.failed', function (response: any) {
        console.error('💥 Payment failed:', response.error);
        setIsProcessingRazorpay(false);
        
        const errorMessage = response.error?.description || 
                            response.error?.reason || 
                            'Payment failed. Please try again.';
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive"
        });
        onError('Payment failed: ' + errorMessage);
      });

      // Open Razorpay modal
      rzp.open();

    } catch (error: any) {
      console.error('💥 Payment error:', error);
      setIsProcessingRazorpay(false);
      
      const userFriendlyMessage = error.message || 'Payment failed. Please try again.';
      
      toast({
        title: "Payment Error",
        description: userFriendlyMessage,
        variant: "destructive"
      });
      onError(userFriendlyMessage);
    }
  };

  // Handle PayPal Payment (existing implementation)
  const handlePayPalPayment = async () => {
    try {
      setIsProcessingPayPal(true);
      console.log('🔧 Creating PayPal order...');

      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          tier: tier,
          currency: 'USD'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `PayPal order creation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ PayPal order created:', data);

      if (data.approvalUrl || data.approval_url) {
        window.location.href = data.approvalUrl || data.approval_url;
      } else {
        throw new Error('No PayPal approval URL received');
      }

    } catch (error: any) {
      console.error('❌ PayPal error:', error);
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
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
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
                  className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-black disabled:bg-gray-400"
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