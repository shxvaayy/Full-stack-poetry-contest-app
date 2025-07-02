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
  const [formData, setFormData] = useState(() => {
    // Try to restore from sessionStorage to prevent loss on reload
    const saved = sessionStorage.getItem('writory_form_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          email: user?.email || parsed.email || "",
        };
      } catch (e) {
        console.log('Failed to parse saved form data');
      }
    }
    return {
      firstName: "",
      lastName: "",
      email: user?.email || "",
      phone: "",
      age: "",
      poemTitle: "",
      termsAccepted: false,
    };
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
          description: "Processing your submission...",
        });

        // Immediately submit after payment verification
        try {
          setIsSubmitting(true);
          await handleFormSubmitWithPaymentData({
            stripe_session_id: sessionId,
            payment_method: 'stripe',
            amount: selectedTier?.price || 0
          });
        } catch (error) {
          console.error('❌ Submission after verification failed:', error);
          setIsSubmitting(false);
          toast({
            title: "Submission Error",
            description: "Payment successful but submission failed. Please contact support.",
            variant: "destructive",
          });
        }
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
          description: "Processing your submission...",
        });

        // Immediately submit after PayPal verification
        try {
          setIsSubmitting(true);
          await handleFormSubmitWithPaymentData({
            paypal_order_id: orderId,
            payment_method: 'paypal',
            amount: selectedTier?.price || 0
          });
        } catch (error) {
          console.error('❌ Submission after PayPal verification failed:', error);
          setIsSubmitting(false);
          toast({
            title: "Submission Error",
            description: "Payment successful but submission failed. Please contact support.",
            variant: "destructive",
          });
        }
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

  // FIXED: Enhanced coupon application with proper database validation
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    if (!user) {
      setCouponError('Please log in to use coupon codes');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      // CRITICAL FIX: Server-side validation with database check
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          tier: selectedTier?.id,
          amount: selectedTier?.price || 0,
          uid: user.uid
        }),
      });

      const result = await response.json();

      if (!result.valid) {
        setCouponError(result.error || 'Invalid coupon code');
        setIsApplyingCoupon(false);
        return;
      }

      const discountAmount = result.discount || 0;
      const finalAmount = Math.max(0, (selectedTier?.price || 0) - discountAmount);

      setCouponDiscount(discountAmount);
      setDiscountedAmount(finalAmount);
      setCouponApplied(true);
      
      toast({
        title: "Coupon Applied!",
        description: result.message,
      });
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponError('Failed to validate coupon code. Please try again.');
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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Save to sessionStorage to prevent loss on reload
      try {
        sessionStorage.setItem('writory_form_data', JSON.stringify(updated));
      } catch (e) {
        console.log('Failed to save form data to sessionStorage');
      }
      return updated;
    });
  };

  const handleFileUpload = (type: 'poem' | 'photo', file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const validateForm = () => {
    const { firstName, email, termsAccepted } = formData;
    
    if (!firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!email.trim()) {
      toast({
        title: "Validation Error", 
        description: "Email is required",
        variant: "destructive",
      });
      return false;
    }

    if (!termsAccepted) {
      toast({
        title: "Validation Error",
        description: "Please accept the terms and conditions",
        variant: "destructive",
      });
      return false;
    }

    // Validate based on tier
    const poemCount = getPoemCount(selectedTier?.id || '');
    
    if (poemCount === 1) {
      // Single poem validation
      if (!formData.poemTitle.trim()) {
        toast({
          title: "Validation Error",
          description: "Poem title is required",
          variant: "destructive",
        });
        return false;
      }

      if (!files.poem) {
        toast({
          title: "Validation Error",
          description: "Poem file is required",
          variant: "destructive",
        });
        return false;
      }

      if (!files.photo) {
        toast({
          title: "Validation Error", 
          description: "Photo file is required",
          variant: "destructive",
        });
        return false;
      }
    } else {
      // Multiple poems validation
      const filledTitles = multiplePoems.titles.slice(0, poemCount).filter(title => title.trim());
      const uploadedFiles = multiplePoems.files.slice(0, poemCount).filter(file => file !== null);

      if (filledTitles.length !== poemCount) {
        toast({
          title: "Validation Error",
          description: `Please provide titles for all ${poemCount} poems`,
          variant: "destructive",
        });
        return false;
      }

      if (uploadedFiles.length !== poemCount) {
        toast({
          title: "Validation Error",
          description: `Please upload all ${poemCount} poem files`,
          variant: "destructive",
        });
        return false;
      }

      if (!files.photo) {
        toast({
          title: "Validation Error",
          description: "Photo file is required", 
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleFormSubmitWithPaymentData = async (paymentInfo: any) => {
    if (!validateForm() || !selectedTier) {
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('📝 Submitting form with payment data:', paymentInfo);

      const poemCount = getPoemCount(selectedTier.id);
      let response;

      if (poemCount === 1) {
        // Single poem submission
        const formDataToSend = new FormData();
        
        // Add form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formDataToSend.append(key, value.toString());
          }
        });

        // Add tier and payment info
        formDataToSend.append('tier', selectedTier.id);
        formDataToSend.append('price', discountedAmount.toString());
        formDataToSend.append('uid', user?.uid || '');
        
        // Add payment data
        if (paymentInfo.stripe_session_id) {
          formDataToSend.append('sessionId', paymentInfo.stripe_session_id);
          formDataToSend.append('paymentMethod', 'stripe');
          formDataToSend.append('paymentId', paymentInfo.stripe_session_id);
        } else if (paymentInfo.paypal_order_id) {
          formDataToSend.append('paymentId', paymentInfo.paypal_order_id);
          formDataToSend.append('paymentMethod', 'paypal');
        } else if (paymentInfo.razorpay_payment_id) {
          formDataToSend.append('paymentId', paymentInfo.razorpay_payment_id);
          formDataToSend.append('paymentMethod', 'razorpay');
        }

        // Add coupon info if applied
        if (couponApplied && couponCode) {
          formDataToSend.append('couponCode', couponCode);
          formDataToSend.append('discountAmount', couponDiscount.toString());
        }

        // Add files
        if (files.poem) formDataToSend.append('poemFile', files.poem);
        if (files.photo) formDataToSend.append('photoFile', files.photo);

        console.log('📤 Sending single poem submission...');
        response = await fetch('/api/submit-poem', {
          method: 'POST',
          body: formDataToSend,
          credentials: 'same-origin',
        });
      } else {
        // Multiple poems submission
        const formDataToSend = new FormData();
        
        // Add form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== null && value !== undefined && key !== 'poemTitle') {
            formDataToSend.append(key, value.toString());
          }
        });

        // Add tier and payment info
        formDataToSend.append('tier', selectedTier.id);
        formDataToSend.append('price', discountedAmount.toString());
        formDataToSend.append('uid', user?.uid || '');

        // Add payment data
        if (paymentInfo.stripe_session_id) {
          formDataToSend.append('sessionId', paymentInfo.stripe_session_id);
          formDataToSend.append('paymentMethod', 'stripe');
          formDataToSend.append('paymentId', paymentInfo.stripe_session_id);
        } else if (paymentInfo.paypal_order_id) {
          formDataToSend.append('paymentId', paymentInfo.paypal_order_id);
          formDataToSend.append('paymentMethod', 'paypal');
        } else if (paymentInfo.razorpay_payment_id) {
          formDataToSend.append('paymentId', paymentInfo.razorpay_payment_id);
          formDataToSend.append('paymentMethod', 'razorpay');
        }

        // Add coupon info if applied
        if (couponApplied && couponCode) {
          formDataToSend.append('couponCode', couponCode);
          formDataToSend.append('discountAmount', couponDiscount.toString());
        }

        // Add poem titles
        const relevantTitles = multiplePoems.titles.slice(0, poemCount);
        formDataToSend.append('poemTitles', JSON.stringify(relevantTitles));

        // Add poem files
        multiplePoems.files.slice(0, poemCount).forEach((file, index) => {
          if (file) {
            formDataToSend.append(`poems[${index}]`, file);
          }
        });

        // Add photo file
        if (files.photo) formDataToSend.append('photo', files.photo);

        console.log('📤 Sending multiple poems submission...');
        response = await fetch('/api/submit-multiple-poems', {
          method: 'POST',
          body: formDataToSend,
          credentials: 'same-origin',
        });
      }

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Submission successful:', result);
        
        setCurrentStep("completed");
        
        // Clear form data from session storage
        try {
          sessionStorage.removeItem('writory_form_data');
        } catch (e) {
          console.log('Failed to clear form data from sessionStorage');
        }

        toast({
          title: "Submission Successful!",
          description: "Your poem has been submitted successfully.",
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Submission failed:', errorData);
        throw new Error(errorData.error || 'Submission failed');
      }
    } catch (error: any) {
      console.error('❌ Form submission error:', error);
      toast({
        title: "Submission Error",
        description: error.message || "There was an error submitting your poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('💳 Payment successful:', paymentData);
    setPaymentData(paymentData);
    setPaymentCompleted(true);
    
    // Immediately submit after payment
    setIsSubmitting(true);
    handleFormSubmitWithPaymentData(paymentData);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedTier) return;

    console.log('📝 Form submission started for tier:', selectedTier.id);

    // If free tier or payment already completed, submit directly
    if (discountedAmount === 0 || paymentCompleted) {
      console.log('💰 Free submission or payment already completed');
      setIsSubmitting(true);
      await handleFormSubmitWithPaymentData(paymentData || {});
    } else {
      console.log('💳 Payment required, showing payment form');
      setCurrentStep("payment");
    }
  };

  const canSelectFree = () => {
    if (!IS_FIRST_MONTH) return false;
    return !submissionStatus?.freeSubmissionUsed;
  };

  const renderTierSelection = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Choose Your Submission Tier</h1>
        <p className="text-lg text-gray-600">
          Select the tier that best fits your poetry submission needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isDisabled = tier.id === 'free' && !canSelectFree();
          
          return (
            <Card 
              key={tier.id}
              className={`relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : `hover:shadow-lg ${tier.borderClass} border-2`
              }`}
              onClick={() => !isDisabled && handleTierSelection(tier)}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${tier.bgClass}`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{tier.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">
                    {tier.price === 0 ? 'Free' : `₹${tier.price}`}
                  </div>
                  
                  {isDisabled && (
                    <div className="text-sm text-red-600 font-medium">
                      Free submission already used
                    </div>
                  )}
                </div>
                
                <Button 
                  className={`w-full ${tier.bgClass} ${tier.hoverClass} text-white`}
                  disabled={isDisabled}
                >
                  {isDisabled ? 'Not Available' : 'Select'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {submissionStatus?.freeSubmissionUsed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              You have already used your free submission this month. Choose a paid tier to submit more poems.
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderPoemForm = () => {
    const poemCount = getPoemCount(selectedTier?.id || '');
    
    return (
      <div className="space-y-4">
        <Label htmlFor="poemTitle" className="text-sm font-medium text-gray-700">
          Poem Title *
        </Label>
        <Input
          id="poemTitle"
          value={formData.poemTitle}
          onChange={(e) => handleFormData('poemTitle', e.target.value)}
          placeholder="Enter your poem title"
          required
        />
        
        <div className="space-y-2">
          <Label htmlFor="poemFile" className="text-sm font-medium text-gray-700">
            Upload Poem File (PDF, DOC, DOCX) *
          </Label>
          <div className="flex items-center space-x-4">
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
              <span className="text-sm text-green-600">
                ✓ {files.poem.name}
              </span>
            )}
          </div>
          <input
            ref={poemFileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileUpload('poem', e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
      </div>
    );
  };

  const renderMultiplePoemsForm = () => {
    const poemCount = getPoemCount(selectedTier?.id || '');
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Submit {poemCount} Poems
          </h3>
          <p className="text-sm text-gray-600">
            Please provide title and file for each poem
          </p>
        </div>
        
        {Array.from({ length: poemCount }).map((_, index) => (
          <Card key={index} className="p-4 border border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Poem {index + 1}</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`poem-title-${index}`} className="text-sm font-medium text-gray-700">
                    Poem Title *
                  </Label>
                  <Input
                    id={`poem-title-${index}`}
                    value={multiplePoems.titles[index]}
                    onChange={(e) => handleMultiplePoemData(index, 'title', e.target.value)}
                    placeholder={`Enter title for poem ${index + 1}`}
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Upload Poem File *
                  </Label>
                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          handleMultiplePoemData(index, 'file', file || null);
                        };
                        input.click();
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose File</span>
                    </Button>
                    {multiplePoems.files[index] && (
                      <span className="text-sm text-green-600">
                        ✓ {multiplePoems.files[index]?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderForm = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Submit Your Poem</h1>
        <div className="flex items-center justify-center space-x-4">
          <div className={`px-4 py-2 rounded-full ${selectedTier?.bgClass} text-white`}>
            {selectedTier?.name} - {selectedTier?.price === 0 ? 'Free' : `₹${selectedTier?.price}`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep("selection")}
          >
            Change Tier
          </Button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First Name *
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleFormData('firstName', e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleFormData('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormData('email', e.target.value)}
                placeholder="Enter your email"
                required
                disabled={!!user?.email}
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleFormData('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="age" className="text-sm font-medium text-gray-700">
                Age
              </Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleFormData('age', e.target.value)}
                placeholder="Enter your age"
              />
            </div>
          </div>
        </Card>

        {/* Poem Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Poem Details</h3>
          {getPoemCount(selectedTier?.id || '') === 1 ? renderPoemForm() : renderMultiplePoemsForm()}
        </Card>

        {/* Photo Upload */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Author Photo</h3>
          <div className="space-y-2">
            <Label htmlFor="photoFile" className="text-sm font-medium text-gray-700">
              Upload Your Photo (JPG, PNG) *
            </Label>
            <div className="flex items-center space-x-4">
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
                <span className="text-sm text-green-600">
                  ✓ {files.photo.name}
                </span>
              )}
            </div>
            <input
              ref={photoFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload('photo', e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </Card>

        {/* Coupon Code - Only show for paid tiers */}
        {selectedTier && selectedTier.price > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coupon Code</h3>
            {!couponApplied ? (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    disabled={isApplyingCoupon}
                  />
                  <Button
                    type="button"
                    onClick={applyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
                    className="whitespace-nowrap"
                  >
                    {isApplyingCoupon ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-sm text-red-600">{couponError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Coupon "{couponCode}" applied! Discount: ₹{couponDiscount}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeCoupon}
                >
                  Remove
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Price Summary */}
        {selectedTier && (
          <Card className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Submission Fee ({selectedTier.name}):</span>
                <span>₹{selectedTier.price}</span>
              </div>
              {couponApplied && couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({couponCode}):</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total Amount:</span>
                <span>₹{discountedAmount}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Terms and Conditions */}
        <Card className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={formData.termsAccepted}
              onCheckedChange={(checked) => handleFormData('termsAccepted', checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="terms" className="text-sm font-medium text-gray-700 cursor-pointer">
                I accept the terms and conditions *
              </Label>
              <p className="text-xs text-gray-500">
                By submitting, you agree to our contest rules and privacy policy.
              </p>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep("selection")}
            className="flex-1"
          >
            Back to Tiers
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.termsAccepted}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {paymentCompleted ? 'Submitting...' : 'Processing...'}
              </>
            ) : (
              discountedAmount === 0 ? 'Submit for Free' : `Proceed to Payment (₹${discountedAmount})`
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Complete Payment</h1>
        <div className="flex items-center justify-center space-x-4">
          <div className={`px-4 py-2 rounded-full ${selectedTier?.bgClass} text-white`}>
            {selectedTier?.name} - ₹{discountedAmount}
          </div>
        </div>
      </div>

      {selectedTier && (
        <PaymentForm
          amount={discountedAmount}
          tier={selectedTier.id}
          metadata={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            tier: selectedTier.id,
            uid: user?.uid
          }}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('Payment error:', error);
            toast({
              title: "Payment Error",
              description: error.message || "Payment failed. Please try again.",
              variant: "destructive",
            });
          }}
          setIsProcessing={setIsProcessingPayment}
        />
      )}

      <div className="flex space-x-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep("form")}
          className="flex-1"
          disabled={isProcessingPayment}
        >
          Back to Form
        </Button>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Submission Successful!</h1>
        <p className="text-lg text-gray-600">
          Thank you for submitting your poem. You will receive a confirmation email shortly.
        </p>
      </div>

      <Card className="p-6 text-left">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <span>Your poem has been successfully uploaded and is being processed</span>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <span>You will receive a confirmation email with your submission details</span>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <span>Contest results will be announced at the end of the month</span>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <span>Winners will be contacted via email and announced on our website</span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Button
          onClick={() => {
            setCurrentStep("selection");
            setSelectedTier(null);
            setPaymentCompleted(false);
            setPaymentData(null);
            setCouponApplied(false);
            setCouponCode("");
            setCouponDiscount(0);
            setDiscountedAmount(0);
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
            setMultiplePoems({
              titles: ["", "", "", "", ""],
              files: [null, null, null, null, null],
            });
          }}
          className="w-full"
        >
          Submit Another Poem
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.location.href = '/'}
          className="w-full"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto">
        {currentStep === "selection" && renderTierSelection()}
        {currentStep === "form" && renderForm()}
        {currentStep === "payment" && renderPayment()}
        {currentStep === "completed" && renderCompleted()}
      </div>
    </div>
  );
}