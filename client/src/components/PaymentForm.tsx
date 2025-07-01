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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Debug function to track issues
  const addDebugInfo = (info: string) => {
    console.log('🔍 DEBUG:', info);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  // Test API connectivity first
  const testAPIConnectivity = async () => {
    try {
      addDebugInfo('Testing API connectivity...');
      
      // Test basic API
      const testResponse = await fetch('/api/test');
      if (testResponse.ok) {
        const testData = await testResponse.json();
        addDebugInfo(`✅ API test successful: ${testData.message}`);
        addDebugInfo(`Razorpay configured: ${testData.razorpay_configured}`);
        return true;
      } else {
        addDebugInfo(`❌ API test failed: ${testResponse.status}`);
        return false;
      }
    } catch (error: any) {
      addDebugInfo(`❌ API connectivity error: ${error.message}`);
      return false;
    }
  };

  // Test Razorpay configuration
  const testRazorpayConfig = async () => {
    try {
      addDebugInfo('Testing Razorpay configuration...');
      
      const response = await fetch('/api/test-razorpay');
      if (response.ok) {
        const data = await response.json();
        addDebugInfo(`✅ Razorpay config: ${data.configured ? 'OK' : 'FAILED'}`);
        if (!data.configured) {
          addDebugInfo(`❌ Razorpay error: ${data.error}`);
        }
        return data.configured;
      } else {
        addDebugInfo(`❌ Razorpay config test failed: ${response.status}`);
        return false;
      }
    } catch (error: any) {
      addDebugInfo(`❌ Razorpay config error: ${error.message}`);
      return false;
    }
  };

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        addDebugInfo('✅ Razorpay already loaded');
        resolve(true);
        return;
      }

      addDebugInfo('🔄 Loading Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        addDebugInfo('✅ Razorpay script loaded');
        resolve(true);
      };
      script.onerror = () => {
        addDebugInfo('❌ Razorpay script failed to load');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Handle Razorpay Payment with extensive debugging
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingRazorpay(true);
      setDebugInfo([]); // Clear previous debug info
      
      addDebugInfo('🚀 Starting Razorpay payment process...');
      addDebugInfo(`💰 Amount: ₹${amount}`);
      addDebugInfo(`🎯 Tier: ${tier}`);

      // Step 1: Test API connectivity
      const apiWorking = await testAPIConnectivity();
      if (!apiWorking) {
        throw new Error('Backend API is not accessible. Please check if server is running.');
      }

      // Step 2: Test Razorpay configuration
      const razorpayConfigured = await testRazorpayConfig();
      if (!razorpayConfigured) {
        throw new Error('Razorpay is not properly configured on the server.');
      }

      // Step 3: Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment system.');
      }

      // Step 4: Create order
      addDebugInfo('📞 Creating Razorpay order...');
      
      const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${tier}`,
        tier: tier
      };

      addDebugInfo(`📋 Order data: ${JSON.stringify(orderData)}`);

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      addDebugInfo(`📡 Order response status: ${orderResponse.status}`);

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        addDebugInfo(`❌ Order creation failed: ${errorText}`);
        throw new Error(`Order creation failed: ${errorResponse.status} - ${errorText}`);
      }

      const order = await orderResponse.json();
      addDebugInfo(`✅ Order created: ${order.id}`);

      if (!order.id) {
        throw new Error('Invalid order data - missing order ID');
      }

      // Step 5: Initialize Razorpay
      addDebugInfo('🎬 Initializing Razorpay checkout...');

      const razorpayOptions = {
        key: 'rzp_test_KmhJU8QZfO04Pu',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Writory Poetry Contest',
        description: `${tier} tier submission (₹${amount})`,
        order_id: order.id,
        handler: async (paymentResponse: any) => {
          addDebugInfo('🎉 Payment successful!');
          
          try {
            addDebugInfo('🔍 Verifying payment...');
            
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
              addDebugInfo('✅ Payment verified successfully');
              
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
              addDebugInfo(`❌ Payment verification failed: ${errorData.error}`);
              throw new Error(errorData.error || 'Payment verification failed');
            }
          } catch (verifyError: any) {
            addDebugInfo(`❌ Verification error: ${verifyError.message}`);
            setIsProcessingRazorpay(false);
            toast({
              title: "Payment Verification Failed",
              description: "Payment completed but verification failed. Please contact support.",
              variant: "destructive"
            });
            onError('Payment verification failed: ' + verifyError.message);
          }
        },
        modal: {
          ondismiss: () => {
            addDebugInfo('💔 Payment modal dismissed by user');
            setIsProcessingRazorpay(false);
          }
        },
        theme: {
          color: '#8B5CF6'
        }
      };

      const rzp = new window.Razorpay(razorpayOptions);
      
      rzp.on('payment.failed', function (response: any) {
        addDebugInfo(`💥 Payment failed: ${response.error?.description || 'Unknown error'}`);
        setIsProcessingRazorpay(false);
        
        toast({
          title: "Payment Failed",
          description: response.error?.description || 'Payment failed',
          variant: "destructive"
        });
        onError('Payment failed: ' + (response.error?.description || 'Unknown error'));
      });

      addDebugInfo('🎭 Opening Razorpay modal...');
      rzp.open();

    } catch (error: any) {
      addDebugInfo(`💥 Payment error: ${error.message}`);
      setIsProcessingRazorpay(false);
      
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive"
      });
      onError(error.message);
    }
  };

  // Handle PayPal Payment (simplified for now)
  const handlePayPalPayment = async () => {
    toast({
      title: "PayPal Temporarily Disabled",
      description: "Please use Razorpay for now while we debug the payment system.",
      variant: "destructive"
    });
  };

  const getPoemCount = (tier: string): number => {
    const counts = { 'free': 1, 'single': 1, 'double': 2, 'bulk': 5 };
    return counts[tier as keyof typeof counts] || 1;
  };

  const poemCount = getPoemCount(tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Debug Mode</h1>
          <p className="text-lg text-gray-600">Complete your payment to submit your poems</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
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

              {/* Payment Buttons */}
              <div className="space-y-4">
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

                <Button
                  onClick={() => testAPIConnectivity()}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessingRazorpay}
                >
                  🔍 Test API Connection
                </Button>

                <Button
                  onClick={() => testRazorpayConfig()}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessingRazorpay}
                >
                  ⚙️ Test Razorpay Config
                </Button>

                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessingRazorpay || isProcessingPayPal}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Form
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debug Information */}
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Debug Information</h2>
              <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
                {debugInfo.length === 0 ? (
                  <p className="text-gray-500">Click "Pay with Razorpay" to see debug information...</p>
                ) : (
                  <div className="space-y-1">
                    {debugInfo.map((info, index) => (
                      <div key={index} className="text-sm font-mono">
                        {info}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Expected Flow:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Test API connectivity</li>
                  <li>Test Razorpay configuration</li>
                  <li>Load Razorpay script</li>
                  <li>Create payment order</li>
                  <li>Open Razorpay modal</li>
                  <li>Process payment</li>
                  <li>Verify payment</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;