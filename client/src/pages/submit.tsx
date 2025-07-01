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
import { IS_FIRST_MONTH } from "./coupon-codes";

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
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [discountedAmount, setDiscountedAmount] = useState(0);
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

  const [multiplePoems, setMultiplePoems] = useState({
    titles: ["", "", "", "", ""],
    files: [null, null, null, null, null] as (File | null)[],
  });

  const poemFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Get poem count based on tier
  const getPoemCount = (tierId: string): number => {
    const poemCounts = {
      'free': 1,
      'single': 1, 
      'double': 2,
      'bulk': 5
    };
    return poemCounts[tierId as keyof typeof poemCounts] || 1;
  };

  // Handle multiple poem data
  const handleMultiplePoemData = (index: number, field: 'title' | 'file', value: string | File | null) => {
    setMultiplePoems(prev => {
      const updated = { ...prev };
      if (field === 'title') {
        updated.titles[index] = value as string;
      } else if (field === 'file') {
        updated.files[index] = value as File | null;
      }
      return updated;
    });
  };

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
    setDiscountedAmount(tier.price);
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
    setCurrentStep("form");
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    if (!selectedTier) {
      setCouponError("Please select a tier first");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError("");

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          tier: selectedTier.id,
          amount: selectedTier.price,
          uid: user?.uid
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setCouponApplied(true);
        setCouponDiscount(data.discount);
        const newAmount = Math.max(0, selectedTier.price - data.discount);
        setDiscountedAmount(newAmount);
        toast({
          title: "Coupon Applied!",
          description: `${data.discountPercentage}% discount applied. ${newAmount === 0 ? "You can now submit for free!" : `New amount: ₹${newAmount}`}`,
        });
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch (error: any) {
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
    setDiscountedAmount(selectedTier?.price || 0);
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

      if (!selectedTier) {
        throw new Error('Please select a tier');
      }

      const poemCount = getPoemCount(selectedTier.id);

      // Validate multiple poems if required
      for (let i = 0; i < poemCount; i++) {
        const title = i === 0 ? formData.poemTitle : multiplePoems.titles[i];
        const file = i === 0 ? files.poem : multiplePoems.files[i];

        if (!title) {
          throw new Error(`Please enter title for poem ${i + 1}`);
        }
        if (!file) {
          throw new Error(`Please upload file for poem ${i + 1}`);
        }
      }

      if (!files.photo) {
        throw new Error('Please upload your photo');
      }

      if (!formData.termsAccepted) {
        throw new Error('Please accept the terms and conditions');
      }

      const formDataToSend = new FormData();

      // Add basic form data
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      });

      // Add tier and payment data
      formDataToSend.append('tier', selectedTier.id);
      formDataToSend.append('userUid', user?.uid || '');
      if (actualPaymentData) {
        formDataToSend.append('paymentData', JSON.stringify(actualPaymentData));
      }

      // Add multiple poem titles
      const allTitles = [formData.poemTitle];
      for (let i = 1; i < poemCount; i++) {
        allTitles.push(multiplePoems.titles[i] || '');
      }
      formDataToSend.append('multiplePoemTitles', JSON.stringify(allTitles));

      // Add poem files
      if (files.poem) {
        formDataToSend.append('poems', files.poem);
      }
      for (let i = 1; i < poemCount; i++) {
        if (multiplePoems.files[i]) {
          formDataToSend.append('poems', multiplePoems.files[i] as File);
        }
      }

      // Add photo file
      if (files.photo) {
        formDataToSend.append('photo', files.photo);
      }

      console.log('📤 Sending form data to API...');

      const response = await fetch('/api/submit-poem', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('📥 API response status:', response.status);
      console.log('📥 API response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('❌ Non-JSON response received:', responseText);
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}...`);
      }

      const result = await response.json();
      console.log('📥 API response data:', result);

      if (result.success) {
        setCurrentStep("completed");
        toast({
          title: "Submission Successful!",
          description: `Successfully submitted ${result.submissions?.length || poemCount} poem(s)`,
        });
      } else {
        throw new Error(result.error || 'Submission failed');
      }

    } catch (error: any) {
      console.error('❌ Form submission error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('<!DOCTYPE')) {
        errorMessage = 'Server error: Received HTML instead of JSON. Please try again or contact support.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      } else if (error.message.includes('Not Found')) {
        errorMessage = 'API endpoint not found. Please contact support.';
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render dynamic poem fields based on tier
  const renderPoemFields = () => {
    if (!selectedTier) return null;

    const poemCount = getPoemCount(selectedTier.id);
    const fields = [];

    for (let i = 0; i < poemCount; i++) {
      fields.push(
        <div key={i} className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Poem {i + 1}</h3>

          <div>
            <Label htmlFor={`poem-title-${i}`}>Poem Title *</Label>
            <Input
              id={`poem-title-${i}`}
              value={i === 0 ? formData.poemTitle : multiplePoems.titles[i]}
              onChange={(e) => {
                if (i === 0) {
                  handleFormData('poemTitle', e.target.value);
                } else {
                  handleMultiplePoemData(i, 'title', e.target.value);
                }
              }}
              placeholder="Enter your poem title"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`poem-file-${i}`}>Upload Poem File * (PDF, DOC, DOCX)</Label>
            <Input
              id={`poem-file-${i}`}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (i === 0) {
                  handleFileChange('poem', file);
                } else {
                  handleMultiplePoemData(i, 'file', file);
                }
              }}
              required
              className="mt-1"
            />
            {i === 0 && files.poem && (
              <p className="text-sm text-green-600 mt-1">✓ {files.poem.name}</p>
            )}
            {i > 0 && multiplePoems.files[i] && (
              <p className="text-sm text-green-600 mt-1">✓ {multiplePoems.files[i]?.name}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          Submit Your {poemCount > 1 ? `${poemCount} Poems` : 'Poem'}
        </h2>
        {fields}
      </div>
    );
  };

  // Check if form is valid for submission or payment
  const isFormValid = () => {
    if (!selectedTier || !formData.firstName || !formData.email || !formData.termsAccepted) {
      return false;
    }

    const poemCount = getPoemCount(selectedTier.id);

    // Check all poem titles and files
    for (let i = 0; i < poemCount; i++) {
      const title = i === 0 ? formData.poemTitle : multiplePoems.titles[i];
      const file = i === 0 ? files.poem : multiplePoems.files[i];

      if (!title || !file) {
        return false;
      }
    }

    if (!files.photo) {
      return false;
    }

    return true;
  };

  // Check submission status
  if (submissionStatus?.hasSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Already Submitted</h1>
              <p className="text-gray-600 mb-6">
                You have already submitted your entry for this month's contest.
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === "selection") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Submit Your Poetry</h1>
            <p className="text-lg text-gray-600">Choose your submission tier</p>
            {IS_FIRST_MONTH && (
              <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg inline-block">
                <p className="text-yellow-800 font-semibold">
                  No rules, just heart — let your truth unfold,
Your words are flames, fierce and bold.
At Writory, every voice is gold.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card 
                  key={tier.id} 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${tier.borderClass} border-2 hover:shadow-xl`}
                  onClick={() => handleTierSelection(tier)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 ${tier.bgClass} rounded-full flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{tier.name}</h3>
                    <p className="text-gray-600 mb-4">{tier.description}</p>
                    <div className="text-2xl font-bold text-gray-800">
                      {tier.price === 0 ? 'Free' : `₹${tier.price}`}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Remember! The more poems you submit, the greater your chances of winning!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "form") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Submission Form</h1>
            <p className="text-lg text-gray-600">
              {selectedTier?.name} - {selectedTier?.price === 0 ? 'Free' : `₹${selectedTier?.price}`}
            </p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleFormData('firstName', e.target.value)}
                        placeholder="Enter your first name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleFormData('lastName', e.target.value)}
                        placeholder="Enter your last name"
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
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleFormData('phone', e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        value={formData.age}
                        onChange={(e) => handleFormData('age', e.target.value)}
                        placeholder="Enter your age"
                      />
                    </div>
                  </div>
                </div>

                {/* Poem Fields - Dynamic based on tier */}
                {renderPoemFields()}

                {/* Photo Upload */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Photo Upload</h2>
                  <div>
                    <Label htmlFor="photo">Upload Your Photo * (JPG, PNG)</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)}
                      required
                      className="mt-1"
                    />
                    {files.photo && (
                      <p className="text-sm text-green-600 mt-1">✓ {files.photo.name}</p>
                    )}
                  </div>
                </div>

                {/* Coupon Code */}
                {selectedTier && selectedTier.price > 0 && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold">Coupon Code (Optional)</h3>
                    {!couponApplied ? (
                      <div className="flex gap-2">
                        <Input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code"
                          className="flex-1"
                        />
                        <Button 
                          type="button"
                          onClick={applyCoupon}
                          disabled={isApplyingCoupon}
                          variant="outline"
                        >
                          {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-100 rounded-md">
                        <span className="text-green-800">
                          Coupon applied! Discount: ₹{couponDiscount}
                        </span>
                        <Button type="button" onClick={removeCoupon} variant="ghost" size="sm">
                          Remove
                        </Button>
                      </div>
                    )}
                    {couponError && <p className="text-sm text-red-600">{couponError}</p>}
                  </div>
                )}

                {/* Payment Summary */}
                {selectedTier && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Tier:</span>
                        <span>{selectedTier.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Poems:</span>
                        <span>{getPoemCount(selectedTier.id)}</span>
                      </div>
                      {couponApplied && (
                        <>
                          <div className="flex justify-between">
                            <span>Original Price:</span>
                            <span>₹{selectedTier.price}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-₹{couponDiscount}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-semibold text-lg border-t pt-1">
                        <span>Total:</span>
                        <span>₹{discountedAmount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleFormData('termsAccepted', checked)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I accept the{" "}
                    <a href="/terms" target="_blank" className="text-purple-600 hover:underline">
                      terms and conditions
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" className="text-purple-600 hover:underline">
                      privacy policy
                    </a>{" "}
                    *
                  </Label>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("selection")}
                    className="flex-1"
                  >
                    Back to Tiers
                  </Button>

                  {selectedTier && discountedAmount === 0 ? (
                    <Button
                      type="submit"
                      disabled={isSubmitting || !isFormValid()}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        'Submit for Free'
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        if (isFormValid()) {
                          setCurrentStep("payment");
                        } else {
                          toast({
                            title: "Form Incomplete",
                            description: "Please fill in all required fields",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!isFormValid()}
                      className="flex-1"
                    >
                      Proceed to Payment
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === "payment") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment</h1>
            <p className="text-lg text-gray-600">
              Complete your payment to submit your {getPoemCount(selectedTier?.id || 'free') > 1 ? 'poems' : 'poem'}
            </p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              {/* Payment Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Tier:</span>
                    <span>{selectedTier?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Poems:</span>
                    <span>{getPoemCount(selectedTier?.id || 'free')}</span>
                  </div>
                  {couponApplied && (
                    <>
                      <div className="flex justify-between">
                        <span>Original Price:</span>
                        <span>₹{selectedTier?.price}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span>₹{discountedAmount}</span>
                  </div>
                </div>
              </div>

              {/* QR Code Payment Display */}
              {showQRPayment && qrPaymentData && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg text-center">
                  <QrCode className="w-8 h-8 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold mb-4">Scan QR Code to Pay</h3>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img 
                      src={qrPaymentData.qr_code_url} 
                      alt="Payment QR Code" 
                      className="max-w-48 max-h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-4">
                    Scan with your UPI app to complete payment
                  </p>
                  <Button
                    onClick={() => setShowQRPayment(false)}
                    variant="outline"
                    className="mt-4"
                  >
                    Back to Payment Options
                  </Button>
                </div>
              )}

              {/* Payment Form */}
              {!showQRPayment && (
                <PaymentForm
                  amount={discountedAmount}
                  tier={selectedTier?.id || 'free'}
                  userEmail={formData.email}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isProcessing={isProcessingPayment}
                  setIsProcessing={setIsProcessingPayment}
                  isProcessingPayPal={isProcessingPayPal}
                  setIsProcessingPayPal={setIsProcessingPayPal}
                  onQRPayment={(qrData) => {
                    setQrPaymentData(qrData);
                    setShowQRPayment(true);
                  }}
                />
              )}

              <div className="mt-6 flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep("form")}
                  className="flex-1"
                  disabled={isProcessingPayment || isProcessingPayPal}
                >
                  Back to Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Submission Successful!</h1>
              <p className="text-gray-600 mb-6">
                Your poem has been submitted successfully for the contest. You will get a Confirmation mail shortly.
              </p>

              {/* Submission Details */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Submission Details</h3>
                <div className="space-y-2 text-sm">
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
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>₹{discountedAmount}</span>
                  </div>
                </div>
              </div>

              {/* Social Media Section */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Follow us on Social Media</h3>
                <div className="flex justify-center gap-4">
                  <a href="https://twitter.com/writory" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-500 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="https://facebook.com/writory" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://instagram.com/writory" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-pink-600 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.327-1.297C4.198 14.895 3.72 13.70 3.72 12.37c0-1.341.478-2.535 1.402-3.431.924-.895 2.075-1.385 3.327-1.385 1.297 0 2.448.49 3.327 1.385.924.896 1.402 2.09 1.402 3.431 0 1.34-.478 2.525-1.402 3.321-.879.807-2.03 1.297-3.327 1.297zm8.953-8.207c-.315 0-.578-.263-.578-.578s.263-.578.578-.578.578.263.578.578-.263.578-.578.578zm-4.985 6.572c-1.297 0-2.353-1.056-2.353-2.353s1.056-2.353 2.353-2.353 2.353 1.056 2.353 2.353-1.056 2.353-2.353 2.353z"/>
                    </svg>
                  </a>
                  <a href="https://linkedin.com/company/writory" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-700 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button onClick={() => setCurrentStep("selection")} className="w-full bg-green-600 hover:bg-green-700">
                  Submit Another Poem
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
                  Back to Home
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