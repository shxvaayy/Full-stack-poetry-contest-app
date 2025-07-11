import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Info, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface PaymentFormProps {
  amount: number;
  tier: string;
  userEmail?: string;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
  isProcessing?: boolean;
  setIsProcessing?: (processing: boolean) => void;
  isProcessingPayPal?: boolean;
  setIsProcessingPayPal?: (processing: boolean) => void;
  onQRPayment?: (qrData: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentForm({ 
  amount, 
  tier, 
  userEmail,
  onSuccess, 
  onError, 
  onBack,
  isProcessing: externalIsProcessing,
  setIsProcessing: externalSetIsProcessing,
  isProcessingPayPal: externalIsProcessingPayPal,
  setIsProcessingPayPal: externalSetIsProcessingPayPal,
  onQRPayment
}: PaymentFormProps) {
  const { toast } = useToast();
  const [internalIsProcessing, setInternalIsProcessing] = useState(false);
  const [internalIsProcessingPayPal, setInternalIsProcessingPayPal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const isProcessing = externalIsProcessing !== undefined ? externalIsProcessing : internalIsProcessing;
  const setIsProcessing = externalSetIsProcessing || setInternalIsProcessing;
  const isProcessingPayPal = externalIsProcessingPayPal !== undefined ? externalIsProcessingPayPal : internalIsProcessingPayPal;
  const setIsProcessingPayPal = externalSetIsProcessingPayPal || setInternalIsProcessingPayPal;

  // Convert INR to USD (approximate rate)
  const usdAmount = (amount * 0.012).toFixed(2);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        console.log('✅ Razorpay script already loaded');
        resolve(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        console.log('⏳ Razorpay script already loading, waiting...');
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error('❌ Script loading timeout');
          resolve(false);
        }, 10000);

        existingScript.addEventListener('load', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        existingScript.addEventListener('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
        return;
      }

      console.log('📥 Loading Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      // Add timeout for script loading
      const timeout = setTimeout(() => {
        console.error('❌ Script loading timeout');
        document.head.removeChild(script);
        resolve(false);
      }, 10000);

      script.onload = () => {
        clearTimeout(timeout);
        console.log('✅ Razorpay script loaded successfully');
        resolve(true);
      };
      script.onerror = () => {
        clearTimeout(timeout);
        console.error('❌ Failed to load Razorpay script');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  };

  const handleRazorpayPayment = async (e) => {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      console.log('🔍 Razorpay button clicked!');
      console.log('🔍 Current state:', { 
        isProcessing, 
        isProcessingPayPal, 
        amount, 
        tier 
      });

      if (isProcessing || isProcessingPayPal) {
        console.log('⚠️ Payment already in progress, ignoring click');
        return;
      }
      
      setIsProcessing(true);
      setError(null);

      console.log('💳 Starting Razorpay payment flow...');
      console.log('🔍 Button clicked - processing payment for amount:', amount);
      
      // Load Razorpay script first
      console.log('📥 Loading Razorpay script...');
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script. Please check your internet connection.');
      }

      // Create order
      console.log('💰 Creating Razorpay order...');
      console.log('📤 Sending order request with data:', {
        amount: amount,
        tier: tier,
        metadata: {
          tier: tier,
          amount: amount.toString()
        }
      });

      const orderResponse = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          tier: tier,
          metadata: {
            tier: tier,
            amount: amount.toString()
          }
        }),
      });

      console.log('📥 Order response status:', orderResponse.status);
      console.log('📥 Order response headers:', Object.fromEntries(orderResponse.headers.entries()));

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ Order creation failed with status:', orderResponse.status);
        console.error('❌ Error response:', errorText);
        throw new Error(`Failed to create order: ${orderResponse.status} - ${errorText}`);
      }

      const orderData = await orderResponse.json();
      console.log('📦 Order response data:', orderData);

      if (!orderData.success) {
        console.error('❌ Order creation failed:', orderData.error);
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      if (!orderData.key || !orderData.orderId) {
        console.error('❌ Invalid order data:', orderData);
        throw new Error('Invalid order data received from server');
      }

      // Verify Razorpay is loaded
      if (!window.Razorpay) {
        console.error('❌ Razorpay not available on window object');
        throw new Error('Razorpay not available. Please refresh and try again.');
      }

      console.log('🚀 Opening Razorpay payment modal...');
      console.log('🔑 Using Razorpay key:', orderData.key?.substring(0, 8) + '...');

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Writory Poetry Contest',
        description: `Poetry Contest - ${tier}`,
        order_id: orderData.orderId,
        handler: function (response: any) {
          console.log('✅ Razorpay payment successful:', response);
          setIsProcessing(false);
          
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully.",
          });

          onSuccess({
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
          email: userEmail || '',
          contact: ''
        },
        notes: {
          tier: tier
        },
        theme: {
          color: '#8B5CF6'
        },
        modal: {
          ondismiss: function() {
            console.log('❌ Razorpay payment dismissed');
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled.",
              variant: "destructive"
            });
          }
        }
      };

      console.log('🔧 Razorpay options prepared:', {
        key: options.key?.substring(0, 8) + '...',
        amount: options.amount,
        currency: options.currency,
        order_id: options.order_id
      });

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.error('❌ Razorpay payment failed:', response.error);
        setIsProcessing(false);
        setError(response.error.description || 'Payment failed');
        toast({
          title: "Payment Failed",
          description: response.error.description || "Payment failed. Please try again.",
          variant: "destructive"
        });
      });

      console.log('🎬 Opening Razorpay modal...');
      razorpay.open();

    } catch (error: any) {
      console.error('❌ Razorpay error:', error);
      console.error('❌ Error stack:', error.stack);
      setIsProcessing(false);
      setError(error.message);
      onError(error.message);

      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePayPalPayment = async (e) => {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (isProcessing || isProcessingPayPal) {
        console.log('⚠️ Payment already in progress, ignoring click');
        return;
      }
      
      setIsProcessingPayPal(true);
      setError(null);

      console.log('💰 Starting PayPal payment flow...');

      // Create PayPal order directly without pre-testing
      console.log('📦 Creating PayPal order...');
      const orderResponse = await fetch('/api/create-paypal-order', {
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

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ PayPal order request failed:', errorText);
        throw new Error('Failed to connect to PayPal. Please try again.');
      }

      let responseData;
      try {
        const responseText = await orderResponse.text();
        responseData = JSON.parse(responseText);
        console.log('📦 PayPal order response:', responseData);
      } catch (parseError) {
        console.error('❌ Failed to parse PayPal response');
        throw new Error('Invalid response from PayPal. Please try again.');
      }

      if (responseData.success && responseData.approvalUrl) {
        console.log('✅ PayPal order created, redirecting...');

        toast({
          title: "Redirecting to PayPal",
          description: "Opening PayPal in a moment...",
        });

        // Redirect to PayPal
        setTimeout(() => {
          window.location.href = responseData.approvalUrl;
        }, 500);
      } else {
        const errorMsg = responseData.error || 'Failed to create PayPal order';
        console.error('❌ PayPal order creation failed:', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (error: any) {
      console.error('❌ PayPal error:', error);
      setIsProcessingPayPal(false);
      setError(error.message);
      onError(error.message);

      toast({
        title: "PayPal Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPoemCount = (tier: string): number => {
    const counts = { 'free': 1, 'single': 1, 'double': 2, 'bulk': 5 };
    return counts[tier as keyof typeof counts] || 1;
  };

  if (tier === 'free' || amount === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-600">
            {amount === 0 ? "Free Entry with Coupon" : "Free Entry Selected"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {amount === 0 ? "Your coupon made this submission free!" : "Your free entry is ready to submit!"}
          </p>
          <Button 
            onClick={() => {
              // Show loading state before proceeding
              setIsProcessing?.(true);

              // Add a small delay to show loading state consistently
              setTimeout(() => {
                onSuccess({ 
                  payment_status: 'free', 
                  payment_method: amount === 0 ? 'coupon_free' : 'free' 
                });
              }, 500);
            }}
            disabled={isProcessing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Continue with Free Entry'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const poemCount = getPoemCount(tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Payment</h1>
          <p className="text-lg text-gray-600">Secure payment to submit your poems</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center">Order Summary</CardTitle>
            <div className="text-center space-y-2">
              <div className="flex justify-between items-center">
                <span>Tier:</span>
                <span className="capitalize">{tier.replace('_', ' ')} Poems</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Poems:</span>
                <span>{poemCount}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span>₹{amount}</span>
              </div>
            </div>
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
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold flex items-center justify-center transition-all duration-200"
              type="button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Processing...</span>
                </>
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
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Connecting to PayPal...</span>
                </>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onBack && typeof onBack === 'function') {
                  onBack();
                }
              }}
              variant="outline"
              className="w-full"
              disabled={isProcessing || isProcessingPayPal}
              type="button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Form
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 mt-6">
          <p>🔒 Secure payments powered by Razorpay & PayPal</p>
          <p>Your payment information is encrypted and secure</p>
          <p className="mt-2">
            <strong>Razorpay:</strong> Pay in INR (₹{amount}) • <strong>PayPal:</strong> Pay in USD (~${usdAmount})
          </p>
        </div>
      </div>
    </div>
  );
}

const validateCoupon = async (code: string) => {
      try {
        const response = await fetch('/api/validate-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Coupon validation error:', error);
        return { valid: false, message: 'Network error' };
      }
    };

    const markCouponAsUsed = async (code: string, email: string) => {
      try {
        await fetch('/api/use-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, email }),
        });
      } catch (error) {
        console.error('Error marking coupon as used:', error);
      }
    };