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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log('🔍 DEBUG:', info);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
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

  // Test API connectivity
  const testAPIConnectivity = async () => {
    try {
      addDebugInfo('Testing API connectivity...');
      const response = await fetch('/api/test');
      const data = await response.json();
      addDebugInfo(`✅ API test successful: ${data.message}`);
      addDebugInfo(`Razorpay configured: ${data.razorpay_configured}`);
      return true;
    } catch (error: any) {
      addDebugInfo(`❌ API connectivity error: ${error.message}`);
      return false;
    }
  };

  // Handle Razorpay Payment with fixed order creation
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingRazorpay(true);
      setDebugInfo([]);
      
      addDebugInfo('🚀 Starting Razorpay payment process...');
      addDebugInfo(`💰 Amount: ₹${amount}`);
      addDebugInfo(`🎯 Tier: ${tier}`);

      // Test API first
      await testAPIConnectivity();

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment system.');
      }

      // Create order with proper error handling
      addDebugInfo('📞 Creating Razorpay order...');
      
      const orderRequestData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${tier}`,
        tier: tier
      };

      addDebugInfo(`📋 Sending order data: ${JSON.stringify(orderRequestData)}`);

      let orderResponse;
      try {
        orderResponse = await fetch('/api/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(orderRequestData),
        });
        
        addDebugInfo(`📡 Order response status: ${orderResponse.status}`);
        addDebugInfo(`📡 Order response headers: ${JSON.stringify(Object.fromEntries(orderResponse.headers))}`);
        
      } catch (fetchError: any) {
        addDebugInfo(`❌ Network error during order creation: ${fetchError.message}`);
        throw new Error(`Network error: ${fetchError.message}`);
      }

      // Handle response
      let responseText;
      try {
        responseText = await orderResponse.text();
        addDebugInfo(`📄 Raw response: ${responseText}`);
      } catch (textError) {
        addDebugInfo(`❌ Failed to read response text: ${textError}`);
        throw new Error('Failed to read server response');
      }

      if (!orderResponse.ok) {
        addDebugInfo(`❌ Order creation failed with status: ${orderResponse.status}`);
        let errorMessage = `Server error: ${orderResponse.status}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          addDebugInfo(`❌ Error details: ${JSON.stringify(errorData)}`);
        } catch (parseError) {
          addDebugInfo(`❌ Could not parse error response: ${responseText}`);
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      let orderData;
      try {
        orderData = JSON.parse(responseText);
        addDebugInfo(`✅ Order created successfully: ${JSON.stringify(orderData)}`);
      } catch (parseError) {
        addDebugInfo(`❌ Failed to parse order response: ${responseText}`);
        throw new Error('Invalid response format from server');
      }

      if (!orderData.id) {
        addDebugInfo(`❌ No order ID in response: ${JSON.stringify(orderData)}`);
        throw new Error('Invalid order data - missing order ID');
      }

      // Initialize Razorpay
      addDebugInfo('🎬 Initializing Razorpay checkout...');

      const razorpayOptions = {
        key: 'rzp_test_KmhJU8QZfO04Pu',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Writory Poetry Contest',
        description: `${tier} tier submission (₹${amount})`,
        order_id: orderData.id,
        handler: async (paymentResponse: any) => {
          addDebugInfo('🎉 Payment successful!');
          addDebugInfo(`Payment ID: ${paymentResponse.razorpay_payment_id}`);
          
          try {
            addDebugInfo('🔍 Verifying payment...');
            
            const verifyData = {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              amount: amount,
              tier: tier
            };

            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(verifyData),
            });

            if (verifyResponse.ok) {
              const verificationResult = await verifyResponse.json();
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
              const errorText = await verifyResponse.text();
              addDebugInfo(`❌ Payment verification failed: ${errorText}`);
              throw new Error('Payment verification failed');
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
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        }
      };

      addDebugInfo('🎭 Opening Razorpay modal...');
      const rzp = new window.Razorpay(razorpayOptions);
      
      rzp.on('payment.failed', function (response: any) {
        addDebugInfo(`💥 Payment failed: ${JSON.stringify(response.error)}`);
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

  const getPoemCount = (tier: string): number => {
    const counts = { 'free': 1, 'single': 1, 'double': 2, 'bulk': 5 };
    return counts[tier as keyof typeof counts] || 1;
  };

  const poemCount = getPoemCount(tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Debug Mode</h1>
          <p className="text-lg text-gray-600">Complete your payment to submit your poems</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <Card className="shadow-xl">
            <CardContent className="p-8">
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

              <div className="space-y-4">
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={isProcessingRazorpay}
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
                  onClick={testAPIConnectivity}
                  variant="outline"
                  className="w-full"
                >
                  🔍 Test API Connection
                </Button>

                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
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
                      <div key={index} className="text-xs font-mono break-all">
                        {info}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;