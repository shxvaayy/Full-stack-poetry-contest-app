import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Pen, Feather, Crown, Upload, QrCode, CheckCircle, AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const TIERS = [
  { 
    id: "free", 
    name: "Free Entry", 
    price: 0, 
    icon: Gift, 
    color: "green", 
    description: "One poem per month",
    borderClass: "border-green-500",
    bgClass: "bg-green-500",
    hoverClass: "hover:bg-green-600",
    textClass: "text-green-600"
  },
  { 
    id: "single", 
    name: "1 Poem", 
    price: 50, 
    icon: Pen, 
    color: "blue", 
    description: "Submit 1 additional poem",
    borderClass: "border-blue-500",
    bgClass: "bg-blue-500", 
    hoverClass: "hover:bg-blue-600",
    textClass: "text-blue-600"
  },
  { 
    id: "double", 
    name: "2 Poems", 
    price: 100, 
    icon: Feather, 
    color: "purple", 
    description: "Submit 2 additional poems",
    borderClass: "border-purple-500",
    bgClass: "bg-purple-500",
    hoverClass: "hover:bg-purple-600", 
    textClass: "text-purple-600"
  },
  { 
    id: "bulk", 
    name: "5 Poems", 
    price: 480, 
    icon: Crown, 
    color: "yellow", 
    description: "Submit 5 additional poems",
    borderClass: "border-yellow-500",
    bgClass: "bg-yellow-500",
    hoverClass: "hover:bg-yellow-600",
    textClass: "text-yellow-600"
  },
];

type SubmissionStep = "selection" | "form" | "payment" | "completed";

export default function SubmitPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SubmissionStep>("selection");
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    age: "",
    poemTitle: "",
    termsAccepted: false,
  });
  const [files, setFiles] = useState({
    poem: null as File | null,
    photo: null as File | null,
  });

  const poemFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Handle payment completion and auto-submission
  useEffect(() => {
    if (paymentCompleted && sessionId && sessionId !== 'free_submission' && !sessionId.startsWith('qr_')) {
      console.log('💳 Payment completed, automatically proceeding to completion...');
      // Move to completed step after payment
      setCurrentStep("completed");
    }
  }, [paymentCompleted, sessionId]);

  // Check user submission status
  const { data: submissionStatus, refetch: refetchStatus } = useQuery({
    queryKey: [`/api/users/${user?.uid}/submission-status`],
    enabled: !!user?.uid,
  });

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    const isFreeUsed = (tier.id === "free" && submissionStatus?.freeSubmissionUsed);
    
    if (isFreeUsed) {
      toast({
        title: "Free trial already used",
        description: "You have already used your free trial. Please switch to other modes to submit poems.",
        variant: "destructive",
      });
      return;
    }

    setSelectedTier(tier);
    setPaymentCompleted(false);
    setSessionId(null);
    setShowQRPayment(false);
    setQrPaymentData(null);
    setCurrentStep("form");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTier || !files.poem || !files.photo) {
      toast({
        title: "Missing required fields",
        description: "Please fill all required fields and upload necessary files.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.termsAccepted) {
      toast({
        title: "Terms acceptance required",
        description: "Please accept the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }

    // For free tier, skip payment
    if (selectedTier.price === 0) {
      setPaymentCompleted(true);
      setSessionId('free_submission');
    } else if (!paymentCompleted) {
      // For paid tiers, show payment options
      setCurrentStep("payment");
    }
  };

  const handleRazorpayPayment = async () => {
    if (!selectedTier) return;

    setIsProcessingPayment(true);
    
    try {
      console.log('💳 Initiating Razorpay Payment for:', {
        amount: selectedTier.price,
        tier: selectedTier.name,
        tier_id: selectedTier.id
      });
      
      const baseUrl = window.location.origin;
      
      // Create Razorpay order
      const response = await fetch(`${baseUrl}/api/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedTier.price,
          tier: selectedTier.name,
          metadata: {
            tier_id: selectedTier.id,
            user_email: formData.email,
            poem_title: formData.poemTitle
          }
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const orderData = await response.json();
      console.log('✅ Razorpay order created:', orderData);

      // Initialize Razorpay payment
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Writory Contest',
        description: `Payment for ${selectedTier.name}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log('✅ Payment successful:', response);
          
          try {
            // Verify payment
            const verifyResponse = await fetch(`${baseUrl}/api/verify-razorpay-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }),
              credentials: 'same-origin',
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              console.log('✅ Payment verified:', verifyData);
              
              // Set payment as completed
              setSessionId(response.razorpay_payment_id);
              setPaymentCompleted(true);
              
              toast({
                title: "Payment Successful!",
                description: "Payment completed successfully. Submitting your poem...",
              });

              // Automatically submit the form after successful payment
              setTimeout(() => {
                handleCompleteSubmission();
              }, 1000);

            } else {
              throw new Error('Payment verification failed');
            }
          } catch (verifyError: any) {
            console.error('❌ Payment verification error:', verifyError);
            toast({
              title: "Payment Verification Failed",
              description: "Payment was successful but verification failed. Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#22c55e'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment cancelled by user');
            setIsProcessingPayment(false);
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled. You can try again.",
              variant: "destructive",
            });
          }
        }
      };

      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        script.onerror = () => {
          throw new Error('Failed to load Razorpay SDK');
        };
        document.body.appendChild(script);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }

    } catch (error: any) {
      console.error('❌ Razorpay error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  const handleQRPayment = async () => {
    if (!selectedTier) return;

    try {
      console.log('🏦 Creating QR payment for:', selectedTier);
      
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/create-qr-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedTier.price,
          tier: selectedTier.name,
        }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ QR payment created:', data);
        setQrPaymentData(data);
        setShowQRPayment(true);
      } else {
        throw new Error('Failed to create QR payment');
      }

    } catch (error: any) {
      console.error('❌ QR payment error:', error);
      toast({
        title: "QR Payment Error",
        description: "Failed to generate QR payment. Please try card payment.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteQRPayment = () => {
    if (qrPaymentData) {
      setSessionId(qrPaymentData.paymentId);
      setPaymentCompleted(true);
      setCurrentStep("form");
      toast({
        title: "Payment Confirmed!",
        description: "QR payment completed. You can now submit your poem.",
      });
    }
  };

  const handleCompleteSubmission = async () => {
    if (isSubmitting) return;

    // Check if payment is required and completed
    if (selectedTier && selectedTier.price > 0 && !paymentCompleted) {
      toast({
        title: "Payment Required",
        description: "Please complete payment before submitting your poem.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log("📤 Starting submission...");
      
      // Create FormData for file uploads
      const formDataToSubmit = new FormData();
      
      // Add all form fields
      formDataToSubmit.append('firstName', formData.firstName);
      formDataToSubmit.append('lastName', formData.lastName);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone', formData.phone);
      formDataToSubmit.append('age', formData.age);
      formDataToSubmit.append('poemTitle', formData.poemTitle);
      formDataToSubmit.append('tier', selectedTier?.id || 'free');
      formDataToSubmit.append('payment_status', paymentCompleted ? 'completed' : 'free');
      
      // Add payment details
      if (sessionId) {
        if (sessionId.startsWith('qr_')) {
          formDataToSubmit.append('payment_intent_id', sessionId);
        } else if (sessionId === 'free_submission') {
          formDataToSubmit.append('razorpay_payment_id', 'free_submission');
        } else {
          formDataToSubmit.append('razorpay_payment_id', sessionId);
        }
      }
      
      // Add files
      if (files.poem) {
        formDataToSubmit.append('poem_file', files.poem);
      }
      if (files.photo) {
        formDataToSubmit.append('photo', files.photo);
      }

      console.log("📋 Form data prepared, making API request...");

      // Make the API request
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/submit-poem`, {
        method: 'POST',
        body: formDataToSubmit,
        credentials: 'same-origin',
      });

      console.log('📡 Submit response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ API Error response:", errorData);
        
        let errorMessage = 'Submission failed';
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.error || parsedError.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} - ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Submission successful:", result);

      toast({
        title: "Poem Submitted Successfully!",
        description: "Your poem has been submitted for the contest.",
      });

      // Move to completed step
      setCurrentStep("completed");
      
      // Refresh submission status
      refetchStatus();

    } catch (error: any) {
      console.error("❌ Submission error:", error);
      
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTierSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Submission Tier</h2>
        <p className="text-lg text-gray-600">Select how many poems you'd like to submit</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isFreeUsed = tier.id === "free" && submissionStatus?.freeSubmissionUsed;
          
          return (
            <Card 
              key={tier.id} 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isFreeUsed ? 'opacity-50 cursor-not-allowed' : `hover:border-2 ${tier.borderClass}`
              }`}
              onClick={() => !isFreeUsed && handleTierSelection(tier)}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 ${tier.bgClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="text-white" size={32} />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                
                <div className="text-3xl font-bold mb-4">
                  {tier.price === 0 ? "Free" : `₹${tier.price}`}
                </div>
                
                {isFreeUsed && (
                  <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm">
                    Already used this month
                  </div>
                )}
                
                {!isFreeUsed && (
                  <Button className={`${tier.bgClass} ${tier.hoverClass} text-white px-8 py-2`}>
                    Select {tier.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Submission Details</h2>
        {selectedTier && (
          <p className="text-lg text-gray-600 mb-4">
            Selected: {selectedTier.name} - {selectedTier.price === 0 ? "Free" : `₹${selectedTier.price}`}
          </p>
        )}
      </div>

      {/* Payment Success Message */}
      {paymentCompleted && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <div className="flex items-center">
            <CheckCircle className="mr-2" size={20} />
            Payment Completed Successfully! You can now submit your poem.
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Age *</Label>
            <Input
              type="number"
              required
              min="5"
              max="100"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
          </div>
          <div>
            <Label>Poem Title *</Label>
            <Input
              required
              value={formData.poemTitle}
              onChange={(e) => setFormData({ ...formData, poemTitle: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Poem File (PDF, DOC, DOCX) *</Label>
          <div className="mt-2">
            <input
              ref={poemFileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFiles({ ...files, poem: e.target.files?.[0] || null })}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => poemFileRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2" size={20} />
              {files.poem ? files.poem.name : "Upload Poem File"}
            </Button>
          </div>
        </div>

        <div>
          <Label>Photo (JPG, PNG) *</Label>
          <div className="mt-2">
            <input
              ref={photoFileRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] || null })}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => photoFileRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2" size={20} />
              {files.photo ? files.photo.name : "Upload Photo"}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={formData.termsAccepted}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, termsAccepted: checked as boolean })
            }
          />
          <Label htmlFor="terms">I accept the terms and conditions *</Label>
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep("selection")}
            className="flex-1"
          >
            Back
          </Button>
          
          {selectedTier && selectedTier.price > 0 && !paymentCompleted ? (
            <Button type="submit" className="flex-1 bg-primary hover:bg-green-700">
              Proceed to Payment
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCompleteSubmission}
              disabled={isSubmitting || !formData.termsAccepted || !files.poem || !files.photo}
              className="flex-1 bg-primary hover:bg-green-700"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Submitting...
                </span>
              ) : (
                "Submit Poem"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Complete Payment</h2>
        {selectedTier && (
          <p className="text-lg text-gray-600 mb-6">
            Complete Payment - ₹{selectedTier.price}
          </p>
        )}
        <p className="text-gray-600 mb-8">Choose your payment method</p>
      </div>

      {!showQRPayment ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            onClick={handleRazorpayPayment}
            disabled={isProcessingPayment}
            className="h-24 bg-[#528FF0] hover:bg-[#4678CC] text-white flex items-center justify-center space-x-3 font-semibold border-0 shadow-lg"
          >
            {isProcessingPayment ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <div className="flex items-center space-x-3">
                <div className="bg-white rounded px-2 py-1">
                  <span className="text-[#528FF0] font-bold text-sm">Razorpay</span>
                </div>
                <CreditCard size={20} />
              </div>
            )}
            <span className="text-lg">Pay with Razorpay</span>
          </Button>

          <Button
            onClick={handleQRPayment}
            variant="outline"
            className="h-24 border-2 border-green-500 text-green-600 hover:bg-green-50 flex items-center justify-center space-x-3"
          >
            <QrCode size={24} />
            <span className="text-lg">UPI/QR Payment</span>
          </Button>
        </div>
      ) : (
        <div className="bg-blue-50 p-8 rounded-lg text-center">
          <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-6">
            <QrCode className="text-white" size={48} />
          </div>
          
          <h3 className="text-xl font-bold mb-4">Scan QR code with any UPI app</h3>
          
          <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg mb-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">₹{selectedTier?.price}</div>
            <div className="text-gray-600">Amount to pay</div>
          </div>
          
          <div className="space-y-2 text-left mb-6">
            <div><strong>UPI ID:</strong> {qrPaymentData?.upiId || 'writorycontest@paytm'}</div>
            <div><strong>Name:</strong> {qrPaymentData?.merchantName || 'Writory Contest'}</div>
          </div>
          
          <p className="text-gray-600 mb-6">Pay using PhonePe, Google Pay, Paytm, or any UPI app</p>
          
          <div className="flex gap-4">
            <Button
              onClick={handleCompleteQRPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              I have completed the payment
            </Button>
            
            <Button
              onClick={() => setShowQRPayment(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel Payment
            </Button>
          </div>
        </div>
      )}

      <div className="text-center">
        <Button
          onClick={() => setCurrentStep("form")}
          variant="outline"
        >
          Back to Form
        </Button>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Secure payment powered by Razorpay</p>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="text-white" size={48} />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900">Submission Completed!</h2>
      <p className="text-lg text-gray-600">
        Your poem has been successfully submitted for the contest.
      </p>
      
      <Button
        onClick={() => {
          setCurrentStep("selection");
          setSelectedTier(null);
          setPaymentCompleted(false);
          setSessionId(null);
          setShowQRPayment(false);
          setQrPaymentData(null);
          setFormData({
            firstName: "",
            lastName: "",
            email: user?.email || "",
            phone: "",
            age: "",
            poemTitle: "",
            termsAccepted: false,
          });
          setFiles({ poem: null, photo: null });
        }}
        className="bg-primary hover:bg-green-700"
      >
        Submit Another Poem
      </Button>
    </div>
  );

  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {[
              { step: 1, label: "Select Tier", current: currentStep === "selection" },
              { step: 2, label: "Fill Details", current: currentStep === "form" },
              { step: 3, label: "Payment", current: currentStep === "payment" },
              { step: 4, label: "Complete", current: currentStep === "completed" },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    item.current
                      ? "bg-primary text-white"
                      : currentStep === "completed" || 
                        (currentStep === "payment" && index < 2) ||
                        (currentStep === "form" && index < 1) ||
                        (paymentCompleted && index < 3)
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {item.step}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-600">
                  {item.label}
                </span>
                {index < 3 && (
                  <div className="w-16 h-0.5 bg-gray-300 ml-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content based on current step */}
        {currentStep === "selection" && renderTierSelection()}
        {currentStep === "form" && renderForm()}
        {currentStep === "payment" && renderPayment()}
        {currentStep === "completed" && renderCompleted()}
      </div>
    </section>
  );
}