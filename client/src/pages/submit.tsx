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

        // Auto-submit after a short delay
        setTimeout(() => {
          handleFormSubmit();
        }, 1000);
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
          description: "Payment completed successfully. Submitting your poem now...",
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
    console.log('💰 Razorpay payment successful:', data);
    console.log('✅ Payment successful, data received:', data);
    
    // Ensure payment data is in the correct format
    const processedPaymentData = {
      ...data,
      payment_method: data.payment_method || 'razorpay',
      amount: selectedTier?.price || 0
    };
    
    console.log('🔧 Processed payment data:', processedPaymentData);
    
    // Set payment data and completion status
    setPaymentData(processedPaymentData);
    setPaymentCompleted(true);
    
    toast({
      title: "Payment Successful!",
      description: "Processing your submission...",
    });

    // Auto-submit with the payment data directly to avoid state timing issues
    setTimeout(async () => {
      try {
        console.log('🔄 Auto-submitting after payment success...');
        await handleFormSubmitWithPaymentData(processedPaymentData);
      } catch (error) {
        console.error('❌ Auto-submission failed:', error);
        toast({
          title: "Submission Error",
          description: "Payment successful but submission failed. Please try submitting again.",
          variant: "destructive",
        });
      }
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

  const handleFormSubmitWithPaymentData = async (directPaymentData?: any) => {
    const paymentDataToUse = directPaymentData || paymentData;
    
    try {
      setIsSubmitting(true);

      console.log('🚀 Form submission started');
      console.log('Form data:', formData);
      console.log('Payment data:', paymentDataToUse);
      console.log('Selected tier:', selectedTier);

      // Validate form
      if (!formData.firstName || !formData.email || !formData.poemTitle) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.termsAccepted) {
        throw new Error('Please accept the terms and conditions');
      }

      // For paid tiers, check if payment is completed
      if (selectedTier?.price && selectedTier.price > 0 && !paymentCompleted && !paymentDataToUse) {
        console.log('Payment required, redirecting to payment step');
        setCurrentStep("payment");
        return;
      }

      // Prepare form data for submission
      const submitFormData = new FormData();
      
      // Add text fields
      submitFormData.append('firstName', formData.firstName);
      submitFormData.append('lastName', formData.lastName || '');
      submitFormData.append('email', formData.email);
      submitFormData.append('phone', formData.phone || '');
      submitFormData.append('age', formData.age || '');
      submitFormData.append('poemTitle', formData.poemTitle);
      submitFormData.append('tier', selectedTier?.id || 'free');
      submitFormData.append('amount', selectedTier?.price?.toString() || '0');
      submitFormData.append('userUid', user?.uid || '');

      // Add payment data if available
      if (paymentDataToUse) {
        console.log('Adding payment information to submission:', paymentDataToUse);
        
        if (paymentDataToUse.razorpay_payment_id) {
          submitFormData.append('paymentId', paymentDataToUse.razorpay_payment_id);
          submitFormData.append('paymentMethod', 'razorpay');
          submitFormData.append('razorpay_order_id', paymentDataToUse.razorpay_order_id || '');
          submitFormData.append('razorpay_signature', paymentDataToUse.razorpay_signature || '');
          console.log('✅ Added Razorpay payment data');
        } else if (paymentDataToUse.paypal_order_id) {
          submitFormData.append('paymentId', paymentDataToUse.paypal_order_id);
          submitFormData.append('paymentMethod', 'paypal');
          console.log('✅ Added PayPal payment data');
        } else if (paymentDataToUse.payment_method === 'razorpay' || paymentDataToUse.payment_method === 'paypal') {
          // Handle generic payment data
          submitFormData.append('paymentId', paymentDataToUse.paymentId || paymentDataToUse.transaction_id || 'paid');
          submitFormData.append('paymentMethod', paymentDataToUse.payment_method);
          if (paymentDataToUse.razorpay_order_id) {
            submitFormData.append('razorpay_order_id', paymentDataToUse.razorpay_order_id);
          }
          if (paymentDataToUse.razorpay_signature) {
            submitFormData.append('razorpay_signature', paymentDataToUse.razorpay_signature);
          }
          console.log('✅ Added generic payment data');
        } else if (paymentDataToUse.payment_method === 'free') {
          submitFormData.append('paymentMethod', 'free');
          submitFormData.append('paymentId', 'free_entry');
          console.log('✅ Added free entry data');
        }
      } else if (selectedTier?.id === 'free') {
        submitFormData.append('paymentMethod', 'free');
        submitFormData.append('paymentId', 'free_entry');
        console.log('✅ Free tier submission');
      } else if (selectedTier?.price && selectedTier.price > 0) {
        // This should not happen - payment is required for paid tiers
        console.error('❌ Missing payment data for paid tier');
        throw new Error('Payment information is missing for paid tier');
      }

      // Add files
      if (files.poem) {
        submitFormData.append('poem', files.poem);
        console.log('Added poem file:', files.poem.name);
      }
      if (files.photo) {
        submitFormData.append('photo', files.photo);
        console.log('Added photo file:', files.photo.name);
      }

      console.log('📤 Sending submission to server...');

      const response = await fetch('/api/submit-poem', {
        method: 'POST',
        body: submitFormData,
      });

      const responseText = await response.text();
      console.log('Server response status:', response.status);
      console.log('Server response body:', responseText);

      if (!response.ok) {
        let errorMessage = 'Submission failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        result = { success: true, message: 'Submission completed' };
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

  const handleFormSubmit = async () => {
    return handleFormSubmitWithPaymentData();
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
                      required
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
                      required
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
                      required
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
                      <li>• Poems must be original work</li>
                      <li>• Maximum 100 lines per poem</li>
                      <li>• File size should not exceed 5MB</li>
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
                  I agree to the <a href="/terms" className="text-green-600 hover:underline">Terms and Conditions</a> and{" "}
                  <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>
                </Label>
              </div>

              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("selection")}
                >
                  Back to Tier Selection
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Poem"
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
                  <div className={`p-4 rounded-lg ${selectedTier.bgClass} text-white`}>
                    <div className="flex items-center justify-between">
                      <selectedTier.icon className="w-6 h-6" />
                      {paymentCompleted && <CheckCircle className="w-6 h-6" />}
                    </div>
                    <h4 className="font-semibold mt-2">{selectedTier.name}</h4>
                    <p className="text-sm opacity-90">{selectedTier.description}</p>
                  </div>
                  
                  <div className="text-center">
                    <span className="text-2xl font-bold">
                      {selectedTier.price === 0 ? "Free" : `₹${selectedTier.price}`}
                    </span>
                  </div>

                  {paymentCompleted && (
                    <div className="flex items-center justify-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Payment Completed
                    </div>
                  )}

                  {selectedTier.price > 0 && !paymentCompleted && (
                    <div className="text-center text-yellow-600 text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Payment Required
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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Payment</h2>
        <p className="text-gray-600">
          Complete the payment to submit your poem for the contest.
        </p>
      </div>

      <PaymentForm
        selectedTier={selectedTier?.id || ""}
        amount={selectedTier?.price || 0}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );

  const renderCompleted = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-green-50 p-8 rounded-lg">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Submission Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your poem has been submitted successfully for the contest. We'll review your submission and notify you of the results.
        </p>
        
        <div className="bg-white p-4 rounded-lg border mb-6">
          <h3 className="font-semibold mb-2">Submission Details</h3>
          <div className="text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Name:</span>
              <span>{formData.firstName} {formData.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Poem Title:</span>
              <span>{formData.poemTitle}</span>
            </div>
            <div className="flex justify-between">
              <span>Tier:</span>
              <span>{selectedTier?.name}</span>
            </div>
            {selectedTier?.price && selectedTier.price > 0 && (
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>₹{selectedTier.price}</span>
              </div>
            )}
          </div>
        </div>

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
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Submit Another Poem
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {renderStepIndicator()}
        
        {currentStep === "selection" && renderTierSelection()}
        {currentStep === "form" && renderForm()}
        {currentStep === "payment" && renderPayment()}
        {currentStep === "completed" && renderCompleted()}
      </div>
    </div>
  );
}