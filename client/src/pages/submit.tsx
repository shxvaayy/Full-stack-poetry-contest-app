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
    description: "Two free submissions allowed",
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

  // NEW: Check user's submission status for free tier count
  const { data: submissionStatus } = useQuery({
    queryKey: ['/api/users', user?.uid, 'submission-status'],
    queryFn: () => apiRequest(`/api/users/${user?.uid}/submission-status`),
    enabled: !!user?.uid,
  });

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    // NEW: Check if free tier is selected and user has already used 2 free submissions
    if (tier.id === "free" && submissionStatus?.freeSubmissionCount >= 2) {
      toast({
        title: "Free Submissions Exhausted",
        description: "You have already used your 2 free submissions. Please select a paid tier.",
        variant: "destructive",
      });
      return;
    }

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
    console.log('✅ Payment successful, data received:', data);
    
    // Ensure payment data is in the correct format
    const processedPaymentData = {
      ...data,
      payment_method: data.payment_method || 'razorpay',
      amount: selectedTier?.price || 0
    };
    
    console.log('💾 Setting payment data:', processedPaymentData);
    setPaymentData(processedPaymentData);
    setPaymentCompleted(true);
    
    toast({
      title: "Payment Successful!",
      description: "Processing your submission...",
    });

    // Auto-submit with the processed payment data directly
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

  const handleFormSubmitWithPaymentData = async (paymentDataParam?: any) => {
    const actualPaymentData = paymentDataParam || paymentData;
    return await handleFormSubmitInternal(actualPaymentData);
  };

  const handleFormSubmit = async () => {
    return await handleFormSubmitInternal(paymentData);
  };

  const handleFormSubmitInternal = async (actualPaymentData: any) => {
    try {
      setIsSubmitting(true);

      console.log('🚀 Form submission started');
      console.log('Form data:', formData);
      console.log('Payment data:', actualPaymentData);
      console.log('Selected tier:', selectedTier);

      // Validate form
      if (!formData.firstName || !formData.email || !formData.poemTitle) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.termsAccepted) {
        throw new Error('Please accept the terms and conditions');
      }

      // For paid tiers, check if payment is completed
      if (selectedTier?.price && selectedTier.price > 0 && !paymentCompleted && !actualPaymentData) {
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
      if (actualPaymentData) {
        console.log('Adding payment information to submission:', actualPaymentData);
        
        if (actualPaymentData.razorpay_payment_id) {
          submitFormData.append('paymentId', actualPaymentData.razorpay_payment_id);
          submitFormData.append('paymentMethod', 'razorpay');
          submitFormData.append('razorpay_order_id', actualPaymentData.razorpay_order_id || '');
          submitFormData.append('razorpay_signature', actualPaymentData.razorpay_signature || '');
          console.log('✅ Added Razorpay payment data');
        } else if (actualPaymentData.paypal_order_id) {
          submitFormData.append('paymentId', actualPaymentData.paypal_order_id);
          submitFormData.append('paymentMethod', 'paypal');
          console.log('✅ Added PayPal payment data');
        } else if (actualPaymentData.payment_method === 'razorpay' || actualPaymentData.payment_method === 'paypal') {
          // Handle generic payment data
          submitFormData.append('paymentId', actualPaymentData.payment_id || actualPaymentData.id || 'unknown');
          submitFormData.append('paymentMethod', actualPaymentData.payment_method);
          console.log('✅ Added generic payment data');
        }
        
        submitFormData.append('paymentAmount', actualPaymentData.amount?.toString() || selectedTier?.price?.toString() || '0');
        submitFormData.append('paymentStatus', 'completed');
      }

      // Add files
      if (files.poem) {
        submitFormData.append('poem', files.poem);
        console.log('✅ Added poem file:', files.poem.name);
      }
      
      if (files.photo) {
        submitFormData.append('photo', files.photo);
        console.log('✅ Added photo file:', files.photo.name);
      }

      console.log('📤 Submitting form data to /api/submit-poem');
      
      const response = await fetch('/api/submit-poem', {
        method: 'POST',
        body: submitFormData,
      });

      const result = await response.json();
      console.log('📥 Submission response:', result);

      if (!response.ok) {
        throw new Error(result.error || `Submission failed with status: ${response.status}`);
      }

      console.log('✅ Submission successful!');
      setCurrentStep("completed");
      
      toast({
        title: "Submission Successful!",
        description: "Your poem has been submitted successfully. You will receive a confirmation email shortly.",
      });

      // Reset form
      setSelectedTier(null);
      setPaymentCompleted(false);
      setPaymentData(null);
      setSessionId(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: user?.email || "",
        phone: "",
        age: "",
        poemTitle: "",
        termsAccepted: false,
      });
      setFiles({
        poem: null,
        photo: null,
      });

    } catch (error: any) {
      console.error('❌ Form submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600">You need to be logged in to submit a poem.</p>
        </div>
      </div>
    );
  }

  // QR Payment Modal
  if (showQRPayment && qrPaymentData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6">
            <div className="text-center">
              <QrCode className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-bold mb-4">Scan QR Code to Pay</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-2xl font-bold text-green-600">₹{qrPaymentData.amount}</p>
                <p className="text-gray-600">{selectedTier?.name}</p>
              </div>
              
              {/* Payment QR Component */}
              <PaymentForm 
                amount={qrPaymentData.amount}
                orderId={qrPaymentData.orderId}
                tier={qrPaymentData.tier}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                showQROnly={true}
              />
              
              <div className="mt-4 space-y-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowQRPayment(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Selection Step
  if (currentStep === "selection") {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Submit Your Poem</h1>
            <p className="text-xl text-gray-600">Choose your submission tier and share your poetry with the world</p>
            
            {/* NEW: Show submission status */}
            {submissionStatus && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Free Submissions Used:</strong> {submissionStatus.freeSubmissionCount || 0} / 2 | 
                  <strong> Total Submissions:</strong> {submissionStatus.totalSubmissions || 0}
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              // NEW: Check if free tier should be disabled
              const isDisabled = tier.id === "free" && (submissionStatus?.freeSubmissionCount >= 2);
              
              return (
                <Card 
                  key={tier.id} 
                  className={`cursor-pointer transition-all duration-200 ${
                    isDisabled 
                      ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-100" 
                      : `${tier.borderClass} hover:shadow-lg hover:scale-105`
                  }`}
                  onClick={() => !isDisabled && handleTierSelection(tier)}
                >
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      isDisabled ? "bg-gray-300" : tier.bgClass
                    }`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className={`text-2xl font-bold mb-2 ${isDisabled ? "text-gray-500" : tier.textClass}`}>
                      {tier.name}
                      {/* NEW: Show "Limit Reached" for disabled free tier */}
                      {isDisabled && <span className="block text-sm font-normal text-red-500 mt-1">Limit Reached</span>}
                    </h3>
                    
                    <p className={`text-3xl font-bold mb-4 ${isDisabled ? "text-gray-500" : "text-gray-900"}`}>
                      {tier.price === 0 ? "FREE" : `₹${tier.price}`}
                    </p>
                    
                    <p className={`mb-6 ${isDisabled ? "text-gray-400" : "text-gray-600"}`}>
                      {tier.description}
                    </p>
                    
                    <Button 
                      className={`w-full ${
                        isDisabled 
                          ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400" 
                          : `${tier.bgClass} ${tier.hoverClass}`
                      }`}
                      disabled={isDisabled}
                    >
                      {isDisabled ? "Limit Reached" : "Select This Tier"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Form Step
  if (currentStep === "form") {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Poem Submission Form</h1>
            <p className="text-gray-600">Fill in your details and upload your poem</p>
            {selectedTier && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  <strong>Selected:</strong> {selectedTier.name} 
                  {selectedTier.price > 0 && paymentCompleted && <span className="ml-2 text-green-600">✓ Payment Completed</span>}
                </p>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-8">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleFormData('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleFormData('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormData('email', e.target.value)}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleFormData('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      value={formData.age}
                      onChange={(e) => handleFormData('age', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="poemTitle">Poem Title *</Label>
                  <Input
                    id="poemTitle"
                    value={formData.poemTitle}
                    onChange={(e) => handleFormData('poemTitle', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="poem">Upload Poem File *</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <Input
                      id="poem"
                      type="file"
                      ref={poemFileRef}
                      accept=".txt,.doc,.docx,.pdf"
                      onChange={(e) => handleFileChange('poem', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => poemFileRef.current?.click()}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose File</span>
                    </Button>
                    {files.poem && (
                      <span className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {files.poem.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Accepted formats: .txt, .doc, .docx, .pdf</p>
                </div>

                <div>
                  <Label htmlFor="photo">Upload Photo (Optional)</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <Input
                      id="photo"
                      type="file"
                      ref={photoFileRef}
                      accept="image/*"
                      onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoFileRef.current?.click()}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose Photo</span>
                    </Button>
                    {files.photo && (
                      <span className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {files.photo.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Optional: Your photo for the contest</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleFormData('termsAccepted', checked)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I accept the terms and conditions *
                  </Label>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("selection")}
                    className="flex-1"
                  >
                    ← Back to Selection
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={isSubmitting}
                    className={`flex-1 ${selectedTier?.bgClass} ${selectedTier?.hoverClass}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      selectedTier?.price === 0 || paymentCompleted 
                        ? "Submit Poem" 
                        : `Proceed to Payment (₹${selectedTier?.price})`
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Payment Step
  if (currentStep === "payment" && selectedTier && selectedTier.price > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment</h1>
            <p className="text-gray-600">Complete your payment to submit your poem</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Selected Tier: {selectedTier.name}</h3>
                <p className="text-2xl font-bold text-green-600">₹{selectedTier.price}</p>
                <p className="text-gray-600">{selectedTier.description}</p>
              </div>

              <PaymentForm 
                amount={selectedTier.price}
                tier={selectedTier.id}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                userEmail={formData.email}
                userName={formData.firstName + ' ' + formData.lastName}
                userPhone={formData.phone}
              />

              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("form")}
                >
                  ← Back to Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Completed Step
  if (currentStep === "completed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Submission Successful!</h1>
              <p className="text-gray-600 mb-6">
                Your poem has been submitted successfully. You will receive a confirmation email shortly.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Thank you for participating in our poetry contest. We appreciate your creativity and look forward to reading your submission.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => setCurrentStep("selection")}
                  className="w-full"
                >
                  Submit Another Poem
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}