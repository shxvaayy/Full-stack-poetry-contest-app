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

  const handleRazorpayPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      console.log('💳 Creating Razorpay order...');

      // Use the correct endpoint from your working backup
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
        description: `Poetry Contest - ${tier}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log('💰 Razorpay payment successful:', response);
          setIsProcessing(false);

          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully.",
          });

          // Call success with Razorpay data - this will trigger form submission
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
          contact: '',
        },
        notes: {
          tier: tier
        },
        theme: {
          color: '#8B5CF6'
        },
        modal: {
          ondismiss: function() {
            console.log('💳 Razorpay payment cancelled by user');
            setIsProcessing(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user.",
              variant: "destructive"
            });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('❌ Razorpay payment error:', error);
      setError(error.message);
      onError(error.message);
      setIsProcessing(false);

      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePayPalPayment = async () => {
    try {
      setIsProcessingPayPal(true);
      setError(null);
      const testResponse = await fetch('/api/test-paypal');
      const testData = await testResponse.json();
      if (!testData.success || !testData.configured) {
        throw new Error(`PayPal Configuration Issue: ${testData.error || 'PayPal not properly configured'}`);
      }
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          tier: tier,
          currency: 'USD',
        }),
      });
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        const responseText = await response.text();
        throw new Error(`PayPal server error: ${responseText}`);
      }
      if (response.ok && responseData.success && responseData.approvalUrl) {
        window.location.href = responseData.approvalUrl;
      } else {
        const errorMsg = responseData.error || responseData.details || 'Failed to create PayPal order';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      setError(`PayPal Error: ${error.message}`);
      onError(`PayPal Error: ${error.message}`);
      toast({
        title: 'PayPal Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayPal(false);
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
              onClick={onBack}
              variant="outline"
              className="w-full"
              disabled={isProcessing || isProcessingPayPal}
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