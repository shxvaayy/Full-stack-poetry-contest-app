import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Pen, Feather, Crown, Upload, QrCode, CheckCircle, AlertTriangle, CreditCard, Loader2, Clock, Shield, RefreshCcw, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import PaymentForm from "@/components/PaymentForm";
import { IS_FIRST_MONTH } from "../coupon-codes";

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
  
  // Enhanced loading states
  const [submissionProgress, setSubmissionProgress] = useState("");
  const [showReloadWarning, setShowReloadWarning] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);
  const [isProcessingCoupon, setIsProcessingCoupon] = useState(false);
  
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

  // CRITICAL: Prevent page unload during submission
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting || isProcessingPayment || isUploadingFiles || isCreatingSubmission) {
        e.preventDefault();
        e.returnValue = 'Your submission is in progress. Are you sure you want to leave?';
        return 'Your submission is in progress. Are you sure you want to leave?';
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && (isSubmitting || isProcessingPayment)) {
        console.warn('⚠️ User navigated away during submission');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSubmitting, isProcessingPayment, isUploadingFiles, isCreatingSubmission]);

  // Show reload warning when any critical process is active
  useEffect(() => {
    setShowReloadWarning(isSubmitting || isProcessingPayment || isUploadingFiles || isCreatingSubmission);
  }, [isSubmitting, isProcessingPayment, isUploadingFiles, isCreatingSubmission]);

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
      setSubmissionProgress("Verifying payment...");
      verifyPayment(sessionId);
    } else if (paypalOrderId && paymentSuccess === 'true') {
      console.log('🎉 PayPal payment successful, verifying order:', paypalOrderId);
      setSubmissionProgress("Verifying PayPal payment...");
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
      setIsProcessingPayment(true);
      setSubmissionProgress("Verifying your payment...");
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
        setSubmissionProgress("Payment verified! Processing submission...");

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
          setIsProcessingPayment(false);
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
      setIsProcessingPayment(false);
      toast({
        title: "Payment Verification Failed",
        description: error.message || "There was an issue verifying your payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const verifyPayPalPayment = async (orderId: string) => {
    try {
      setIsProcessingPayment(true);
      setSubmissionProgress("Verifying PayPal payment...");
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
        setSubmissionProgress("PayPal payment verified! Processing submission...");

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
          setIsProcessingPayment(false);
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
      setIsProcessingPayment(false);
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

  // Back to tier selection
  const handleBackToTiers = () => {
    setCurrentStep("selection");
    setSelectedTier(null);
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
    setPaymentCompleted(false);
    setPaymentData(null);
    setSessionId(null);
  };

  // Enhanced coupon application with better loading states
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
    setIsProcessingCoupon(true);
    setCouponError('');
    setSubmissionProgress("Validating coupon code...");

    try {
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
        setIsProcessingCoupon(false);
        setSubmissionProgress("");
        return;
      }

      const discountAmount = result.discount || 0;
      const finalAmount = Math.max(0, (selectedTier?.price || 0) - discountAmount);

      setCouponDiscount(discountAmount);
      setDiscountedAmount(finalAmount);
      setCouponApplied(true);
      setSubmissionProgress("");
      
      toast({
        title: "Coupon Applied!",
        description: result.message,
      });
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponError('Failed to validate coupon code. Please try again.');
      setSubmissionProgress("");
    } finally {
      setIsApplyingCoupon(false);
      setIsProcessingCoupon(false);
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

  // Enhanced form submission with detailed progress tracking
  const handleFormSubmitWithPaymentData = async (paymentInfo: any) => {
    if (!validateForm() || !selectedTier) {
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('📝 Submitting form with payment data:', paymentInfo);
      setIsSubmitting(true);
      setIsUploadingFiles(true);
      setSubmissionProgress("Preparing your submission...");

      const poemCount = getPoemCount(selectedTier.id);
      let response;

      if (poemCount === 1) {
        // Single poem submission
        setSubmissionProgress("Uploading poem and photo files...");
        
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

        setIsUploadingFiles(false);
        setIsCreatingSubmission(true);
        setSubmissionProgress("Creating your submission...");
        
        console.log('📤 Sending single poem submission...');
        response = await fetch('/api/submit-poem', {
          method: 'POST',
          body: formDataToSend,
          credentials: 'same-origin',
        });
      } else {
        // Multiple poems submission
        setSubmissionProgress(`Uploading ${poemCount} poem files and photo...`);
        
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

        setIsUploadingFiles(false);
        setIsCreatingSubmission(true);
        setSubmissionProgress("Creating your submissions...");
        
        console.log('📤 Sending multiple poems submission...');
        response = await fetch('/api/submit-multiple-poems', {
          method: 'POST',
          body: formDataToSend,
          credentials: 'same-origin',
        });
      }

      setSubmissionProgress("Finalizing submission...");

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Submission successful:', result);
        
        setSubmissionProgress("Success! Redirecting...");
        
        // Small delay to show success message
        setTimeout(() => {
          setCurrentStep("completed");
          setSubmissionProgress("");
        }, 1000);
        
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
      setSubmissionProgress("");
      toast({
        title: "Submission Error",
        description: error.message || "There was an error submitting your poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsProcessingPayment(false);
      setIsUploadingFiles(false);
      setIsCreatingSubmission(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('💳 Payment successful:', paymentData);
    setPaymentData(paymentData);
    setPaymentCompleted(true);
    
    // Immediately submit after payment
    setIsSubmitting(true);
    setSubmissionProgress("Payment successful! Processing submission...");
    handleFormSubmitWithPaymentData(paymentData);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedTier) return;

    console.log('📝 Form submission started for tier:', selectedTier.id);

    // If free tier or payment already completed, submit directly
    if (discountedAmount === 0 || paymentCompleted) {
      console.log('💰 Free submission or payment already completed');
      setSubmissionProgress("Processing your submission...");
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

  // Reload Warning Component
  const ReloadWarning = () => {
    if (!showReloadWarning) return null;

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-center">
            <span className="font-semibold">⚠️ SUBMISSION IN PROGRESS</span>
            <span className="ml-2">
              Do not refresh or close this page! Your submission may be lost.
            </span>
          </div>
          <Shield className="w-5 h-5 flex-shrink-0" />
        </div>
      </div>
    );
  };

  // Enhanced Loading Overlay
  const LoadingOverlay = () => {
    if (!isSubmitting && !isProcessingPayment && !isUploadingFiles && !isCreatingSubmission) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 backdrop-blur-sm">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
              {isUploadingFiles && (
                <Upload className="w-6 h-6 text-green-600 absolute top-5 left-1/2 transform -translate-x-1/2" />
              )}
              {isCreatingSubmission && (
                <CheckCircle className="w-6 h-6 text-green-600 absolute top-5 left-1/2 transform -translate-x-1/2" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {isProcessingPayment ? "Processing Payment" : "Submitting Your Poem"}
              </h3>
              
              {submissionProgress && (
                <p className="text-gray-600">{submissionProgress}</p>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Please wait - Do not close this page!</p>
                    <p>Your submission is being processed...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 1: Tier Selection
  if (currentStep === "selection") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
        <ReloadWarning />
        <LoadingOverlay />
        
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Submit Your Poetry
            </h1>
            <p className="text-xl text-gray-600">
              Choose your submission tier and join our poetry contest
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const canSelectThisTier = tier.id === "free" ? canSelectFree() : true;
              
              return (
                <Card
                  key={tier.id}
                  className={`relative transition-all duration-300 hover:scale-105 cursor-pointer ${
                    canSelectThisTier
                      ? `${tier.borderClass} hover:shadow-lg`
                      : "border-gray-300 opacity-50 cursor-not-allowed"
                  }`}
                  onClick={() => canSelectThisTier && handleTierSelection(tier)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${tier.bgClass} mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {tier.name}
                    </h3>
                    
                    <p className="text-gray-600 mb-4">
                      {tier.description}
                    </p>
                    
                    <div className="text-3xl font-bold text-gray-900 mb-4">
                      {tier.price === 0 ? "Free" : `₹${tier.price}`}
                    </div>
                    
                    {!canSelectThisTier && tier.id === "free" && (
                      <p className="text-red-500 text-sm">
                        Free submission already used
                      </p>
                    )}
                    
                    <Button
                      className={`w-full ${tier.bgClass} ${tier.hoverClass}`}
                      disabled={!canSelectThisTier}
                    >
                      {canSelectThisTier ? "Select" : "Unavailable"}
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

  // Step 2: Form (with BACK BUTTON)
  if (currentStep === "form") {
    const poemCount = getPoemCount(selectedTier?.id || '');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
        <ReloadWarning />
        <LoadingOverlay />
        
        <div className="max-w-2xl mx-auto px-4">
          {/* FIXED: Add Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToTiers}
              className="flex items-center space-x-2"
              disabled={isSubmitting || isProcessingPayment}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tier Selection</span>
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Submit Your Entry
            </h1>
            <p className="text-gray-600">
              Selected: {selectedTier?.name} - {discountedAmount === 0 ? "Free" : `₹${discountedAmount}`}
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleFormData("firstName", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleFormData("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormData("email", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleFormData("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleFormData("age", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Poem Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {poemCount === 1 ? "Poem Details" : `Poems Details (${poemCount} poems)`}
                </h3>
                
                {poemCount === 1 ? (
                  <>
                    <div className="mb-4">
                      <Label htmlFor="poemTitle">Poem Title *</Label>
                      <Input
                        id="poemTitle"
                        value={formData.poemTitle}
                        onChange={(e) => handleFormData("poemTitle", e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="poemFile">Upload Poem File (PDF, DOC, DOCX) *</Label>
                      <div className="mt-2">
                        <input
                          ref={poemFileRef}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileUpload("poem", e.target.files?.[0] || null)}
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
                  </>
                ) : (
                  <div className="space-y-6">
                    {Array.from({ length: poemCount }, (_, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Poem {index + 1}</h4>
                        
                        <div className="mb-3">
                          <Label htmlFor={`poemTitle${index}`}>Title *</Label>
                          <Input
                            id={`poemTitle${index}`}
                            value={multiplePoems.titles[index]}
                            onChange={(e) => handleMultiplePoemData(index, 'title', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor={`poemFile${index}`}>Upload File *</Label>
                          <div className="mt-2">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => handleMultiplePoemData(index, 'file', e.target.files?.[0] || null)}
                              className="hidden"
                              id={`fileInput${index}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById(`fileInput${index}`)?.click()}
                              className="w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {multiplePoems.files[index] ? multiplePoems.files[index]!.name : "Choose File"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Label htmlFor="photoFile">Upload Your Photo *</Label>
                  <div className="mt-2">
                    <input
                      ref={photoFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload("photo", e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoFileRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {files.photo ? files.photo.name : "Choose Photo"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coupon Code */}
            {selectedTier && selectedTier.price > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold">Have a Coupon Code?</h3>
                  </div>
                  
                  {!couponApplied ? (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={isApplyingCoupon}
                      />
                      <Button
                        type="button"
                        onClick={applyCoupon}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isApplyingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-800 font-medium">
                            Coupon "{couponCode}" applied!
                          </p>
                          <p className="text-green-600">
                            Discount: ₹{couponDiscount}
                          </p>
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
                    </div>
                  )}
                  
                  {couponError && (
                    <div className="mt-2 flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">{couponError}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Tier: {selectedTier?.name}</span>
                    <span>₹{selectedTier?.price}</span>
                  </div>
                  
                  {couponApplied && couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({couponCode})</span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}
                  
                  <hr />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{discountedAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Submit */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleFormData("termsAccepted", checked)}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I accept the{" "}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      terms and conditions
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-blue-600 hover:underline">
                      privacy policy
                    </a>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                  disabled={isSubmitting || isProcessingPayment || !formData.termsAccepted}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </div>
                  ) : discountedAmount === 0 ? (
                    "Submit Entry (Free)"
                  ) : (
                    `Proceed to Payment (₹${discountedAmount})`
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    );
  }

  // Step 3: Payment
  if (currentStep === "payment") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
        <ReloadWarning />
        <LoadingOverlay />
        
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("form")}
              className="flex items-center space-x-2"
              disabled={isProcessingPayment}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Form</span>
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Payment
            </h1>
            <p className="text-gray-600">
              Amount to pay: ₹{discountedAmount}
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <PaymentForm
                amount={discountedAmount}
                tier={selectedTier?.id || ''}
                onSuccess={handlePaymentSuccess}
                userDetails={formData}
                isProcessing={isProcessingPayment}
                setIsProcessing={setIsProcessingPayment}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 4: Success
  if (currentStep === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Submission Successful!
            </h1>
            
            <p className="text-xl text-gray-600 mb-6">
              Thank you for submitting your poetry. We'll review your entry and notify you of the results.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                <strong>What's next?</strong>
              </p>
              <ul className="text-green-700 text-left mt-2 space-y-1">
                <li>• You'll receive a confirmation email shortly</li>
                <li>• Contest results will be announced on our website</li>
                <li>• Winners will be contacted via email</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                  setMultiplePoems({
                    titles: ["", "", "", "", ""],
                    files: [null, null, null, null, null],
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Submit Another Entry
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}