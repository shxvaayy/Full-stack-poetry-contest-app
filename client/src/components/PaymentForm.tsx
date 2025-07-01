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

  // Load Razorpay script with better error handling
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Remove existing script if any
      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.remove();
        addDebugInfo('🔄 Removed existing Razorpay script');
      }

      if (window.Razorpay) {
        delete window.Razorpay;
        addDebugInfo('🔄 Cleared existing Razorpay object');
      }

      addDebugInfo('🔄 Loading fresh Razorpay script...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        addDebugInfo('✅ Razorpay script loaded successfully');
        // Wait a bit for script to initialize
        setTimeout(() => {
          if (window.Razorpay) {
            addDebugInfo('✅ Razorpay object available');
            resolve(true);
          } else {
            addDebugInfo('❌ Razorpay object not available after loading');
            resolve(false);
          }
        }, 500);
      };
      
      script.onerror = (error) => {
        addDebugInfo('❌ Razorpay script failed to load: ' + error);
        resolve(false);
      };
      
      document.head.appendChild(script);

      // Timeout fallback
      setTimeout(() => {
        if (!window.Razorpay) {
          addDebugInfo('❌ Razorpay script loading timeout');
          resolve(false);
        }
      }, 10000);
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

  // Handle Razorpay Payment with enhanced modal handling
  const handleRazorpayPayment = async () => {
    try {
      setIsProcessingRazorpay(true);
      setDebugInfo([]);
      
      addDebugInfo('🚀 Starting Razorpay payment process...');
      addDebugInfo(`💰 Amount: ₹${amount}`);
      addDebugInfo(`🎯 Tier: ${tier}`);

      // Test API first
      await testAPIConnectivity();

      // Load Razorpay script with better handling
      addDebugInfo('🔄 Loading Razorpay script...');
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment system. Please refresh and try again.');
      }

      // Create order
      addDebugInfo('📞 Creating Razorpay order...');
      
      const orderRequestData = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${tier}`,
        tier: tier
      };

      addDebugInfo(`📋 Sending order data: ${JSON.stringify(orderRequestData)}`);

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(orderRequestData),
      });

      addDebugInfo(`📡 Order response status: ${orderResponse.status}`);

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`Order creation failed: ${errorText}`);
      }

      const orderData = await orderResponse.json();
      addDebugInfo(`✅ Order created: ${orderData.id}`);

      if (!orderData.id) {
        throw new Error('Invalid order data - missing order ID');
      }

      // Enhanced Razorpay initialization
      addDebugInfo('🎬 Initializing Razorpay checkout...');

      // Test Razorpay constructor
      if (typeof window.Razorpay !== 'function') {
        addDebugInfo('❌ Razorpay constructor not available');
        throw new Error('Razorpay payment system not properly loaded');
      }

      const razorpayOptions = {
        key: 'rzp_test_KmhJU8QZfO04Pu',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Writory Poetry Contest',
        description: `${tier} tier submission (₹${amount})`,
        image: '', // Add your logo URL here if needed
        order_id: orderData.id,
        handler: async (paymentResponse: any) => {
          addDebugInfo('🎉 Payment completed successfully!');
          addDebugInfo(`💳 Payment ID: ${paymentResponse.razorpay_payment_id}`);
          
          try {
            addDebugInfo('🔍 Verifying payment with server...');
            
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
                title: "Payment Successful! 🎉",
                description: "Your payment has been processed. Proceeding to submit your poems...",
                duration: 3000
              });
              
              setIsProcessingRazorpay(false);
              
              // Call onSuccess to proceed to next step
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
              description: "Payment completed but verification failed. Please contact support with your payment ID.",
              variant: "destructive",
              duration: 5000
            });
            onError('Payment verification failed: ' + verifyError.message);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          tier: tier,
          amount: amount.toString()
        },
        theme: {
          color: '#8B5CF6',
          backdrop_color: 'rgba(0,0,0,0.5)'
        },
        modal: {
          ondismiss: () => {
            addDebugInfo('💔 Payment modal dismissed by user');
            setIsProcessingRazorpay(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled. You can try again.",
              variant: "destructive"
            });
          },
          escape: true,
          backdropclose: false
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      addDebugInfo('🔧 Razorpay options configured');
      addDebugInfo(`🔧 Options: ${JSON.stringify(razorpayOptions, null, 2)}`);

      let rzp;
      try {
        rzp = new window.Razorpay(razorpayOptions);
        addDebugInfo('✅ Razorpay instance created successfully');
      } catch (constructorError: any) {
        addDebugInfo(`❌ Razorpay constructor error: ${constructorError.message}`);
        throw new Error('Failed to initialize Razorpay: ' + constructorError.message);
      }
      
      // Add event listeners before opening
      rzp.on('payment.failed', function (response: any) {
        addDebugInfo(`💥 Payment failed: ${JSON.stringify(response.error)}`);
        setIsProcessingRazorpay(false);
        
        const errorMessage = response.error?.description || 
                            response.error?.reason || 
                            'Payment failed. Please try again.';
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 5000
        });
        onError('Payment failed: ' + errorMessage);
      });

      // Try to open the modal with error handling
      try {
        addDebugInfo('🎭 Opening Razorpay modal...');
        rzp.open();
        addDebugInfo('✅ Modal opened successfully');
      } catch (openError: any) {
        addDebugInfo(`❌ Modal open error: ${openError.message}`);
        throw new Error('Failed to open payment modal: ' + openError.message);
      }

    } catch (error: any) {
      addDebugInfo(`💥 Payment process error: ${error.message}`);
      setIsProcessingRazorpay(false);
      
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
        duration: 5000
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Payment</h1>
          <p className="text-lg text-gray-600">Secure payment to submit your poems</p>
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
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessingRazorpay ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {isProcessingRazorpay ? 'Processing Payment...' : `Pay ₹${amount} with Razorpay`}
                </Button>

                <div className="text-xs text-gray-500 text-center">
                  🔒 Secure payment powered by Razorpay
                </div>

                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessingRazorpay}
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
              <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Progress</h2>
              <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
                {debugInfo.length === 0 ? (
                  <p className="text-gray-500">Click "Pay with Razorpay" to start payment process...</p>
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
              
              {isProcessingRazorpay && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-800">Processing your payment...</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;