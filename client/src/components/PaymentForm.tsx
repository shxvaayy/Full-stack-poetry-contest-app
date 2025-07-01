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
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Load Razorpay script on component mount
  useEffect(() => {
    loadRazorpayScript();
    // Test API connectivity
    testAPIConnectivity();
  }, []);

  // Test API connectivity
  const testAPIConnectivity = async () => {
    try {
      const response = await fetch('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🧪 API Test Response:', data);
        setDebugInfo(data);
      } else {
        console.error('❌ API Test Failed:', response.status);
      }
    } catch (error) {
      console.error('❌ API Test Error:', error);
    }
  };

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.Razorpay) {
        console.log('✅ Razorpay script already loaded');
        setRazorpayLoaded(true);
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        console.log('✅ Razorpay script loaded successfully');
        setRazorpayLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Razorpay script');
        setRazorpayLoaded(false);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Get Razorpay key - FIXED VERSION
  const getRazorpayKey = () => {
    // Try to get from environment variables
    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (publicKey) {
      return publicKey;
    }
    
    // Fallback to test key if not configured
    console.warn('⚠️ NEXT_PUBLIC_RAZORPAY_KEY_ID not found, using test key');
    return 'rzp_test_demo';
  };

  // Handle Razorpay Payment - FIXED VERSION
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingRazorpay(true);
      
      console.log('🚀 Starting Razorpay payment process...');
      console.log('💰 Amount:', amount);
      console.log('🎯 Tier:', tier);

      // Ensure Razorpay script is loaded
      if (!window.Razorpay) {
        console.log('🔄 Razorpay script not loaded, attempting to load...');
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay script. Please check your internet connection.');
        }
      }

      // Create order with detailed logging
      console.log('📝 Creating Razorpay order...');
      console.log('📡 Making request to /api/create-order');
      
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'INR',
          receipt: `receipt_${Date.now()}_${tier}`
        }),
      });

      console.log('📡 Order response status:', orderResponse.status);
      console.log('📡 Order response headers:', Object.fromEntries(orderResponse.headers.entries()));

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ Order creation failed:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          body: errorText
        });
        
        // Try to parse error as JSON, fallback to text
        let errorMessage = 'Order creation failed';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`Order creation failed: ${errorMessage}`);
      }

      const orderData = await orderResponse.json();
      console.log('✅ Order created successfully:', orderData);

      // Validate order data
      if (!orderData.id || !orderData.amount) {
        throw new Error('Invalid order data received from server');
      }

      // ✅ FIXED: Get the correct Razorpay key
      const razorpayKey = getRazorpayKey();
      console.log('🔑 Using Razorpay key:', razorpayKey.substring(0, 12) + '...');

      // Initialize Razorpay with comprehensive options
      const options = {
        key: razorpayKey, // ✅ Use the public key here
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Writory Poetry Contest',
        description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier submission`,
        order_id: orderData.id,
        handler: async (response: any) => {
          console.log('🎉 Payment successful! Response:', response);
          
          try {
            // Verify payment on server
            console.log('🔍 Verifying payment...');
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

            console.log('🔍 Verification response status:', verifyResponse.status);

            if (verifyResponse.ok) {
              const verificationData = await verifyResponse.json();
              console.log('✅ Payment verified successfully:', verificationData);
              
              const paymentData = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_method: 'razorpay',
                amount: amount,
                payment_status: 'completed',
                verified: true
              };
              
              toast({
                title: "Payment Successful!",
                description: "Your payment has been processed successfully.",
              });
              
              onSuccess(paymentData);
            } else {
              const errorText = await verifyResponse.text();
              console.error('❌ Payment verification failed:', errorText);
              throw new Error('Payment verification failed. Please contact support.');
            }
          } catch (verifyError: any) {
            console.error('❌ Payment verification error:', verifyError);
            onError(verifyError.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            console.log('💔 Payment modal dismissed by user');
            setIsProcessingRazorpay(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user.",
              variant: "destructive"
            });
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#8B5CF6'
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 300, // 5 minutes
        remember_customer: false
      };

      console.log('🎬 Opening Razorpay checkout with options:', {
        ...options,
        handler: '[Function]' // Don't log the function
      });

      const rzp = new window.Razorpay(options);
      
      // Add error handling for Razorpay instance
      rzp.on('payment.failed', (response: any) => {
        console.error('💥 Razorpay payment failed:', response.error);
        const errorMessage = response.error.description || response.error.reason || 'Payment failed';
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive"
        });
        
        onError(errorMessage);
        setIsProcessingRazorpay(false);
      });

      rzp.open();

    } catch (error: any) {
      console.error('💥 Razorpay payment error:', error);
      const errorMessage = error.message || 'Payment initialization failed';
      
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      onError(errorMessage);
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  // Handle PayPal Payment
  const handlePayPalPayment = async () => {
    try {
      setIsProcessingPayPal(true);
      console.log('🔧 Creating PayPal order for amount:', amount);

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
        const errorText = await response.text();
        console.error('❌ PayPal order creation failed:', errorText);
        throw new Error(`PayPal order creation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ PayPal order created:', data);

      if (data.approval_url) {
        window.location.href = data.approval_url;
      } else {
        throw new Error('No PayPal approval URL received');
      }

    } catch (error: any) {
      console.error('❌ PayPal payment error:', error);
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
            {/* Debug Info */}
            {debugInfo && (
              <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
                <div className="font-semibold mb-1">Debug Info:</div>
                <div>API: {debugInfo.message}</div>
                <div>Razorpay: {debugInfo.razorpay_configured ? '✅' : '❌'}</div>
                <div>PayPal: {debugInfo.paypal_configured ? '✅' : '❌'}</div>
                <div>Script: {razorpayLoaded ? '✅' : '❌'}</div>
                <div>Key: {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? '✅' : '❌'}</div>
              </div>
            )}

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

              {/* Status Messages */}
              {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-orange-600 text-sm">
                    ⚠️ Razorpay public key not configured. Using test mode.
                  </div>
                </div>
              )}

              {!debugInfo?.razorpay_configured && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-orange-600 text-sm">
                    ⚠️ Razorpay backend configuration issue detected.
                  </div>
                </div>
              )}

              {!razorpayLoaded && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-600 text-sm">
                    ❌ Razorpay script not loaded. Please check your internet connection.
                  </div>
                </div>
              )}

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
                  disabled={isProcessingRazorpay || isProcessingPayPal || !razorpayLoaded}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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