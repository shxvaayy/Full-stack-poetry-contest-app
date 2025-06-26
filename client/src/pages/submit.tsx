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
  const [paymentData, setPaymentData] = useState<any>(null);
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
        
        setPaymentData({
          paypal_order_id: orderId,
          payment_method: 'paypal',
          payment_status: 'completed',
          amount: 50
        });
        setSessionId(orderId);
        setPaymentCompleted(true);
        setCurrentStep("form");
        
        toast({
          title: "PayPal Payment Successful!",
          description: "Payment completed successfully. You can now submit your poem.",
        });

        // Auto-submit after a short delay
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

  const { data: submissionStatus } = useQuery({
    queryKey: ['/api/users', user?.uid, 'submission-status'],
    queryFn: () => apiRequest(`/api/users/${user?.uid}/submission-status`),
    enabled: !!user?.uid,
  });

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    setSelectedTier(tier);
    setCurrentStep("form");
  };

  const handleFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (fileType: 'poem' | 'photo', file: File | null) => {
    setFiles(prev => ({ ...prev, [fileType]: file }));
  };

  const handlePaymentSuccess = (data: any) => {
    console.log('✅ Payment successful:', data);
    setPaymentData(data);
    setPaymentCompleted(true);
    
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed. Submitting your poem now...",
    });

    // Trigger form submission immediately
    setCurrentStep("form");
    
    // Auto-submit after a short delay to ensure state is updated
    setTimeout(() => {
      handleFormSubmit();
    }, 500);
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

      // Validate form
      if (!formData.firstName || !formData.email || !formData.poemTitle) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.termsAccepted) {
        throw new Error('Please accept the terms and conditions');
      }

      // For paid tiers, check if payment is completed
      if (selectedTier?.price && selectedTier.price > 0 && !paymentCompleted) {
        setCurrentStep("payment");
        return;
      }

      console.log('📤 Starting form submission...');
      console.log('Payment data:', paymentData);

      // Prepare form data for submission
      const submitFormData = new FormData();
      
      // Add text fields
      submitFormData.append('firstName', formData.firstName);
      submitFormData.append('lastName', formData.lastName);
      submitFormData.append('email', formData.email);
      submitFormData.append('phone', formData.phone);
      submitFormData.append('age', formData.age);
      submitFormData.append('poemTitle', formData.poemTitle);
      submitFormData.append('tier', selectedTier?.id || 'free');
      submitFormData.append('amount', selectedTier?.price?.toString() || '0');
      submitFormData.append('userUid', user?.uid || '');

      // Add payment data if available
      if (paymentData) {
        console.log('Adding payment data to submission:', paymentData);
        
        if (paymentData.razorpay_payment_id) {
          submitFormData.append('paymentId', paymentData.razorpay_payment_id);
          submitFormData.append('paymentMethod', 'razorpay');
          submitFormData.append('razorpay_order_id', paymentData.razorpay_order_id || '');
          submitFormData.append('razorpay_signature', paymentData.razorpay_signature || '');
        } else if (paymentData.paypal_order_id) {
          submitFormData.append('paymentId', paymentData.paypal_order_id);
          submitFormData.append('paymentMethod', 'paypal');
        } else if (paymentData.payment_status === 'free') {
          submitFormData.append('paymentMethod', 'free');
          submitFormData.append('paymentId', 'free_entry');
        }
      }

      // Add files
      if (files.poem) {
        submitFormData.append('poem', files.poem);
      }
      if (files.photo) {
        submitFormData.append('photo', files.photo);
      }

      console.log('📤 Submitting poem with payment verification...');

      const response = await fetch('/api/submit-poem', {
        method: 'POST',
        body: submitFormData,
      });

      const responseData = await response.text();
      console.log('Server response status:', response.status);
      console.log('Server response body:', responseData);

      let result;
      try {
        result = JSON.parse(responseData);
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError);
        throw new Error(`Server error: ${responseData}`);
      }

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Submission failed');
      }

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

  // Check for free tier availability
  const canUseFreeEntry = !submissionStatus?.freeSubmissionUsed;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[
          { step: 1, label: "Select Tier", active: currentStep === "selection" },
          { step: 2, label: "Fill Details", active: currentStep === "form" },
          { step: 3, label: "Payment", active: currentStep === "payment" },
          { step: 4, label: "Complete", active: currentStep === "completed" },
        ].map((item, index) => (
          <div key={item.step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                item.active
                  ? "bg-green-600 text-white"
                  : index < ["selection", "form", "payment", "completed"].indexOf(currentStep)
                  ? "bg-green-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {item.step}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">{item.label}</span>
            {index < 3 && <div className="w-12 h-0.5 bg-gray-300 mx-4"></div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTierSelection = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Entry Tier</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select the tier that best fits your poetry submission needs. Each tier offers different benefits and submission allowances.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isDisabled = tier.id === "free" && !canUseFreeEntry;
          
          return (
            <Card
              key={tier.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
              } ${tier.borderClass} border-2`}
              onClick={() => !isDisabled && handleTierSelection(tier)}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${tier.bgClass}`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                <div className="text-2xl font-bold mb-4">
                  {tier.price === 0 ? "Free" : `₹${tier.price}`}
                </div>
                {isDisabled && (
                  <p className="text-red-500 text-sm">Already used this month</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Contest submissions for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Poem Submission Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Personal Information</h3>
                  
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleFormData("firstName", e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleFormData("lastName", e.target.value)}
                      placeholder="Enter your last name"
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleFormData("phone", e.target.value)}
                      placeholder="Enter your phone number"
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
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Poem Details</h3>
                  
                  <div>
                    <Label htmlFor="poemTitle">Poem Title *</Label>
                    <Input
                      id="poemTitle"
                      value={formData.poemTitle}
                      onChange={(e) => handleFormData("poemTitle", e.target.value)}
                      placeholder="Enter your poem title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="poemFile">Upload Poem (PDF, DOC, DOCX)</Label>
                    <div className="mt-2">
                      <input
                        ref={poemFileRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange("poem", e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => poemFileRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {files.poem ? files.poem.name : "Choose File"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="photoFile">Upload Your Photo (JPG, PNG)</Label>
                    <div className="mt-2">
                      <input
                        ref={photoFileRef}
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange("photo", e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => photoFileRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {files.photo ? files.photo.name : "Choose File"}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Submission Guidelines</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Poem should be original work</li>
                      <li>• Maximum 50 lines per poem</li>
                      <li>• File size limit: 10MB</li>
                      <li>• Photo should be clear and recent</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => handleFormData("termsAccepted", checked)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</a> and <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                </Label>
              </div>

              <div className="mt-6 flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("selection")}
                  className="flex-1"
                >
                  Back to Tier Selection
                </Button>
                
                <Button
                  onClick={handleFormSubmit}
                  disabled={isSubmitting || !formData.termsAccepted}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {selectedTier?.price && selectedTier.price > 0 && !paymentCompleted ? "Proceed to Payment" : "Submitting..."}
                    </>
                  ) : (
                    selectedTier?.price && selectedTier.price > 0 && !paymentCompleted ? "Proceed to Payment" : "Submit Poem"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Selected Tier</h3>
              {selectedTier && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTier.bgClass}`}>
                      <selectedTier.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedTier.name}</p>
                      <p className="text-sm text-gray-600">{selectedTier.description}</p>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold">
                        {selectedTier.price === 0 ? "Free" : `₹${selectedTier.price}`}
                      </span>
                    </div>
                  </div>
                  {paymentCompleted && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-800 text-sm font-medium">Payment Completed</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-2xl mx-auto">
      {selectedTier && (
        <PaymentForm
          selectedTier={selectedTier.id}
          amount={selectedTier.price}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}
    </div>
  );

  const renderCompleted = () => (
    <div className="max-w-2xl mx-auto text-center">
      <Card>
        <CardContent className="p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Submission Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your poem has been successfully submitted to the Writory Poetry Contest. 
            We'll review your submission and notify you of the results.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setCurrentStep("selection");
                setSelectedTier(null);
                setPaymentCompleted(false);
                setPaymentData(null);
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
              variant="outline"
              className="mr-4"
            >
              Submit Another Poem
            </Button>
            <Button
              onClick={() => window.location.href = "/dashboard"}
              className="bg-green-600 hover:bg-green-700"
            >
              View My Submissions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderStepIndicator()}
        
        {currentStep === "selection" && renderTierSelection()}
        {currentStep === "form" && renderForm()}
        {currentStep === "payment" && renderPayment()}
        {currentStep === "completed" && renderCompleted()}
      </div>
    </div>
  );
}