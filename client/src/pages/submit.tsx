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
import PaymentForm from "@/components/PaymentForm";

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
  const [isProcessingPayPal, setIsProcessingPayPal] = useState(false);
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

  // Check URL parameters for payment status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancelled = urlParams.get('payment_cancelled');
    const paypalOrderId = urlParams.get('paypal_order_id');
    const paymentError = urlParams.get('payment_error');

    if (sessionId && paymentSuccess === 'true') {
      console.log('🎉 Stripe payment successful, verifying session:', sessionId);
      verifyPayment(sessionId);
    } else if (paypalOrderId && paymentSuccess === 'true') {
      console.log('🎉 PayPal payment successful, verifying order:', paypalOrderId);
      verifyPayPalPayment(paypalOrderId);
    } else if (paymentCancelled === 'true') {
      toast({
        title: "Payment Cancelled",
        description: "Payment was cancelled. You can try again.",
        variant: "destructive",
      });
      setCurrentStep("form");
    } else if (paymentError === 'true') {
      const errorMessage = urlParams.get('message') || 'Payment failed';
      toast({
        title: "Payment Error",
        description: decodeURIComponent(errorMessage),
        variant: "destructive",
      });
      setCurrentStep("form");
    }

    // Clean up URL parameters
    if (sessionId || paymentSuccess || paymentCancelled || paypalOrderId || paymentError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verifyPayment = async (sessionId: string) => {
    try {
      console.log('🔍 Verifying payment session:', sessionId);
      
      const response = await fetch('/api/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Payment verified successfully:', data);
        
        setSessionId(sessionId);
        setPaymentCompleted(true);
        setCurrentStep("form");
        
        toast({
          title: "Payment Successful!",
          description: "Payment completed successfully. You can now submit your poem.",
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Payment verification failed:', errorData);
        throw new Error(errorData.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('❌ Payment verification error:', error);
      toast({
        title: "Payment Verification Failed",
        description: error.message || "There was an issue verifying your payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const verifyPayPalPayment = async (orderId: string) => {
    try {
      console.log('🔍 Verifying PayPal order:', orderId);
      
      const response = await fetch('/api/verify-paypal-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ PayPal payment verified successfully:', data);
        
        setSessionId(orderId);
        setPaymentCompleted(true);
        setCurrentStep("form");
        
        toast({
          title: "PayPal Payment Successful!",
          description: "Payment completed successfully. You can now submit your poem.",
        });

        // Auto-submit the form after PayPal payment
        setTimeout(() => {
          handleFormSubmit();
        }, 1000);

      } else {
        const errorData = await response.json();
        console.error('❌ PayPal payment verification failed:', errorData);
        throw new Error(errorData.error || 'PayPal payment verification failed');
      }
    } catch (error: any) {
      console.error('❌ PayPal payment verification error:', error);
      toast({
        title: "PayPal Payment Verification Failed",
        description: error.message || "There was an issue verifying your PayPal payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  // Get user submission status
  const { data: submissionStatus } = useQuery({
    queryKey: ['submission-status', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      return await apiRequest(`/api/users/${user.uid}/submission-status`);
    },
    enabled: !!user?.uid,
  });

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    console.log('🎯 Tier selected:', tier.name);
    setSelectedTier(tier);
    setCurrentStep("form");
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setSelectedTier(null);
    setPaymentCompleted(false);
    setSessionId(null);
  };

  const handleFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'poem' | 'photo', file: File | null) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('✅ Payment successful:', paymentData);
    setPaymentCompleted(true);
    setSessionId(paymentData.razorpay_payment_id || paymentData.paypal_order_id || 'completed');
    
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed. Submitting your poem now...",
    });

    setCurrentStep("form");
    
    // Auto-submit after payment success
    setTimeout(() => {
      handleFormSubmit();
    }, 1000);
  };

  const handlePaymentError = (error: string) => {
    console.error('❌ Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
    setCurrentStep("form");
  };

  const handleFormSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!formData.firstName.trim()) {
        throw new Error("First name is required");
      }
      if (!formData.email.trim()) {
        throw new Error("Email is required");
      }
      if (!formData.poemTitle.trim()) {
        throw new Error("Poem title is required");
      }
      if (!formData.termsAccepted) {
        throw new Error("Please accept the terms and conditions");
      }

      // Check if payment is required but not completed
      if (selectedTier && selectedTier.price > 0 && !paymentCompleted) {
        console.log('💳 Payment required, redirecting to payment...');
        setCurrentStep("payment");
        return;
      }

      console.log('📤 Submitting poem to server...');

      // Prepare form data
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName.trim());
      submitData.append('lastName', formData.lastName.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('phone', formData.phone.trim());
      submitData.append('age', formData.age.trim());
      submitData.append('poemTitle', formData.poemTitle.trim());
      submitData.append('tier', selectedTier?.id || 'free');
      submitData.append('amount', selectedTier?.price?.toString() || '0');
      submitData.append('userUid', user?.uid || '');

      if (sessionId) {
        submitData.append('paymentId', sessionId);
      }

      // Add files
      if (files.poem) {
        submitData.append('poem', files.poem);
      }
      if (files.photo) {
        submitData.append('photo', files.photo);
      }

      // Submit to server
      const response = await fetch('/api/submit-poem', {
        method: 'POST',
        body: submitData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Submission failed');
      }

      const result = await response.json();
      console.log('✅ Submission successful:', result);

      setCurrentStep("completed");
      
      toast({
        title: "Submission Successful!",
        description: "Your poem has been submitted successfully. Good luck!",
      });

    } catch (error: any) {
      console.error('❌ Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render tier selection
  if (currentStep === "selection") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Submit Your Poem
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your submission tier and share your poetry with the world. 
              Each tier offers different opportunities to showcase your work.
            </p>
          </div>

          {/* Tier Selection Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isFreeTierUsed = tier.id === 'free' && submissionStatus?.freeSubmissionUsed;
              
              return (
                <Card
                  key={tier.id}
                  className={`relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    isFreeTierUsed 
                      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                      : `${tier.borderClass} hover:${tier.bgClass} hover:text-white group`
                  }`}
                  onClick={() => !isFreeTierUsed && handleTierSelection(tier)}
                >
                  {tier.id === 'bulk' && (
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                      Best Value
                    </div>
                  )}
                  
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${tier.bgClass} flex items-center justify-center group-hover:bg-white group-hover:${tier.textClass} transition-colors`}>
                      <Icon className="w-8 h-8 text-white group-hover:text-current" />
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                    <div className="text-3xl font-bold mb-2">
                      {tier.price === 0 ? 'Free' : `₹${tier.price}`}
                    </div>
                    <p className="text-sm text-gray-600 group-hover:text-white mb-4">
                      {tier.description}
                    </p>
                    
                    {isFreeTierUsed && (
                      <div className="text-red-500 text-sm font-semibold">
                        Already Used This Month
                      </div>
                    )}
                    
                    {!isFreeTierUsed && (
                      <Button
                        className={`w-full ${tier.bgClass} ${tier.hoverClass} text-white`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTierSelection(tier);
                        }}
                      >
                        Select {tier.name}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Contest runs monthly. Free tier allows one submission per month.
              Paid tiers allow additional submissions beyond your free entry.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Secure Payment
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Instant Submission
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Monthly Contest
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show progress steps for other screens
  const steps = [
    { number: 1, name: "Select Tier", active: currentStep === "selection" },
    { number: 2, name: "Fill Details", active: currentStep === "form" },
    { number: 3, name: "Payment", active: currentStep === "payment" },
    { number: 4, name: "Complete", active: currentStep === "completed" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step.active
                      ? "bg-green-600 text-white"
                      : currentStep === "completed" || 
                        (currentStep === "payment" && step.number < 3) ||
                        (currentStep === "form" && step.number < 2)
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    step.active ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-gray-300 mx-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Step */}
        {currentStep === "form" && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Poem Submission Details</h2>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Selected Tier</div>
                  <div className={`font-semibold ${selectedTier?.textClass}`}>
                    {selectedTier?.name} - {selectedTier?.price === 0 ? 'Free' : `₹${selectedTier?.price}`}
                  </div>
                  {paymentCompleted && (
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Payment Completed
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleFormData("firstName", e.target.value)}
                      placeholder="Enter your first name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleFormData("lastName", e.target.value)}
                      placeholder="Enter your last name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormData("email", e.target.value)}
                      placeholder="Enter your email"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleFormData("phone", e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleFormData("age", e.target.value)}
                      placeholder="Enter your age"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Poem Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Poem Details</h3>
                  
                  <div>
                    <Label htmlFor="poemTitle">Poem Title *</Label>
                    <Input
                      id="poemTitle"
                      value={formData.poemTitle}
                      onChange={(e) => handleFormData("poemTitle", e.target.value)}
                      placeholder="Enter your poem title"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="poemFile">Upload Poem (PDF, DOC, DOCX)</Label>
                    <div className="mt-1">
                      <Input
                        ref={poemFileRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange('poem', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => poemFileRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {files.poem ? files.poem.name : 'Choose Poem File'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="photoFile">Upload Your Photo (JPG, PNG)</Label>
                    <div className="mt-1">
                      <Input
                        ref={photoFileRef}
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => photoFileRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {files.photo ? files.photo.name : 'Choose Photo'}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Submission Guidelines</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Poem should be original work</li>
                      <li>• Maximum 50 lines per poem</li>
                      <li>• File size limit: 10MB</li>
                      <li>• Photo should be clear and recent</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Terms and Actions */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start space-x-2 mb-6">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleFormData("termsAccepted", checked)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{" "}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      Terms and Conditions
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </Label>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToSelection}
                    className="flex-1"
                  >
                    Back to Tier Selection
                  </Button>
                  
                  <Button
                    onClick={handleFormSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {selectedTier?.price === 0 || paymentCompleted ? 'Submitting...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        {selectedTier?.price === 0 || paymentCompleted ? 'Submit Poem' : 'Proceed to Payment'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Step */}
        {currentStep === "payment" && selectedTier && (
          <PaymentForm
            selectedTier={selectedTier.id}
            amount={selectedTier.price}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        )}

        {/* Completion Step */}
        {currentStep === "completed" && (
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Submission Successful!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your poem has been submitted successfully. Thank you for participating in our poetry contest!
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Your submission will be reviewed by our panel</li>
                  <li>• Contest results will be announced at the end of the month</li>
                  <li>• Winners will be notified via email</li>
                  <li>• You can track your submissions in your dashboard</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View Dashboard
                </Button>
                <Button
                  onClick={handleBackToSelection}
                  variant="outline"
                >
                  Submit Another Poem
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}