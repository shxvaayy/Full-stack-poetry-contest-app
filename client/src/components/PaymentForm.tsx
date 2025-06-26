import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QrCode } from "lucide-react";
import qrCodeImage from "@assets/WhatsApp Image 2025-06-22 at 16.45.29 (1)_1750599570104.jpeg";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  tier: string;
  email: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

const PaymentFormContent = ({ amount, tier, email, onPaymentSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr'>('card');

  const handleCardPayment = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, tier, email }),
      });

      const { clientSecret, paymentIntentId } = await response.json();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: { email },
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your payment has been processed. You can now submit your poem.",
        });
        onPaymentSuccess(paymentIntent.id);
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Payment - ₹{amount}</CardTitle>
          <p className="text-gray-600">Choose your payment method</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Payment Method Selection */}
            <div className="flex space-x-4">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                className="flex-1"
              >
                Card Payment
              </Button>
              <Button
                variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('qr')}
                className="flex-1"
              >
                <QrCode className="mr-2" size={16} />
                QR Code
              </Button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                      },
                    }}
                  />
                </div>
                <Button
                  onClick={handleCardPayment}
                  disabled={!stripe || isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? "Processing..." : `Pay ₹${amount}`}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="border rounded-lg p-4">
                  <img
                    src={qrCodeImage}
                    alt="Payment QR Code"
                    className="mx-auto max-w-xs"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Scan this QR code to pay ₹{amount}
                  </p>
                </div>
                <Button
                  onClick={() => onPaymentSuccess('manual_payment')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  I have completed the payment
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
}