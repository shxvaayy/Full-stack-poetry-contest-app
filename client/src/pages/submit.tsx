import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, ArrowLeft, CheckCircle, AlertCircle, Loader2, CreditCard, QrCode, Camera, Sparkles, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import SpinWheel from "@/components/ui/spin-wheel";
import { getCurrentContestType, getCurrentChallenges } from "@/data/contestChallenges";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gift, Pen, Feather, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import PaymentForm from "@/components/PaymentForm";
import { IS_FIRST_MONTH, FREE_ENTRY_ENABLED, ENABLE_FREE_TIER } from "./coupon-codes";
import { Checkbox } from "@/components/ui/checkbox";

type SubmissionStep = "selection" | "spin" | "form" | "payment" | "completed";

interface SelectedChallenge {
  contestType: string;
  challengeTitle: string;
  description: string;
}

interface PoemData {
  challenge: SelectedChallenge;
  text: string;
  file: File | null;
}

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
    textClass: "text-green-600",
    poems: 1
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
    textClass: "text-blue-600",
    poems: 1
  },
  { 
    id: "double", 
    name: "2 Poems", 
    price: 90, 
    icon: Feather, 
    color: "purple", 
    description: "Submit 2 additional poems",
    borderClass: "border-purple-500",
    bgClass: "bg-purple-500",
    hoverClass: "hover:bg-purple-600", 
    textClass: "text-purple-600",
    poems: 2
  },
  { 
    id: "bulk", 
    name: "5 Poems", 
    price: 230, 
    icon: Crown, 
    color: "yellow", 
    description: "Submit 5 additional poems",
    borderClass: "border-yellow-500",
    bgClass: "bg-yellow-500",
    hoverClass: "hover:bg-yellow-600",
    textClass: "text-yellow-600",
    poems: 5
  },
];

export default function SubmitPage() {
  const [currentStep, setCurrentStep] = useState<SubmissionStep>("selection");
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [selectedPoems, setSelectedPoems] = useState<PoemData[]>([]);
  const [currentContestType] = useState(getCurrentContestType());
  const [currentChallenges] = useState(getCurrentChallenges());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const poemFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, dbUser } = useAuth();
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string>("");
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
  const [freeTierEnabled, setFreeTierEnabled] = useState(true);

  // Store submission details for success page
  const [submissionDetails, setSubmissionDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    poemTitle: "",
    tier: "",
    amount: 0,
  });
  const [files, setFiles] = useState({
    poem: null as File | null,
    photo: null as File | null,
  });

  const [multiplePoems, setMultiplePoems] = useState({
    titles: ["", "", "", "", ""],
    files: [null, null, null, null, null] as (File | null)[],
  });

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

  const { data: userSubmissionStatus, refetch: refetchSubmissionStatus } = useQuery({
    queryKey: ['/api/users', user?.uid, 'submission-status'],
    queryFn: () => apiRequest(`/api/users/${user?.uid}/submission-status`),
    enabled: !!user?.uid,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the result
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: freeTierStatus, refetch: refetchFreeTierStatus } = useQuery({
    queryKey: ['/api/free-tier-status'],
    queryFn: () => apiRequest('/api/free-tier-status'),
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the result
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Check if user has already used free tier
  const hasUsedFreeTier = userSubmissionStatus?.freeSubmissionUsed || false;

  // Refetch when component mounts to ensure fresh data
  useEffect(() => {
    refetchFreeTierStatus();
  }, [refetchFreeTierStatus]);

  // Refetch submission status when free tier status changes
  useEffect(() => {
    if (user?.uid && freeTierStatus) {
      refetchSubmissionStatus();
    }
  }, [freeTierStatus, user?.uid, refetchSubmissionStatus]);

const handleChallengeSelected = (challenge: SelectedChallenge) => {
    // Update the poem with the selected challenge
    const updatedPoems = [...selectedPoems];
    updatedPoems[currentPoemIndex] = {
      challenge,
      text: updatedPoems[currentPoemIndex]?.text || "",
      file: updatedPoems[currentPoemIndex]?.file || null
    };
    setSelectedPoems(updatedPoems);

    // Stay on the same step but show the form instead of spin wheel
    // The form will be shown because the challenge is now selected
  };

  const handleGoToSpin = (poemIndex: number) => {
    setCurrentPoemIndex(poemIndex);
    setCurrentStep("spin");
  };

  const handleUsePreviousChallenge = (poemIndex: number) => {
    if (poemIndex > 0 && selectedPoems[poemIndex - 1]) {
      const updatedPoems = [...selectedPoems];
      updatedPoems[poemIndex] = {
        challenge: selectedPoems[poemIndex - 1].challenge,
        text: updatedPoems[poemIndex]?.text || "",
        file: updatedPoems[poemIndex]?.file || null
      };
      setSelectedPoems(updatedPoems);
    }
  };

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    setSelectedTier(tier);
    setDiscountedAmount(tier.price);
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");

        // Initialize poem slots based on tier
        const initialPoems = Array(tier.poems).fill(null).map(() => ({
          challenge: null,
          text: "",
          file: null
        }));
        setSelectedPoems(initialPoems);
        setCurrentPoemIndex(0);
    setCurrentStep("spin");
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
      console.log('🎫 Validating coupon:', {
        code: couponCode.trim(),
        tier: selectedTier.id,
        amount: selectedTier.price,
        uid: user?.uid,
        email: formData.email || user?.email
      });

      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          tier: selectedTier.id,
          amount: selectedTier.price,
          uid: user?.uid,
          email: formData.email || user?.email
        }),
        credentials: 'same-origin'
      });

      console.log('🔍 Coupon validation response status:', response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Coupon validation data:', data);

      if (data.valid) {
        setCouponApplied(true);
        setCouponDiscount(data.discount);
        const newAmount = Math.max(0, selectedTier.price - data.discount);
        setDiscountedAmount(newAmount);

        toast({
          title: "Coupon Applied Successfully!",
          description: `${data.discountPercentage}% discount applied. ${newAmount === 0 ? "You can now submit for free!" : `New amount: ₹${newAmount}`}`,
        });
      } else {
        setCouponError(data.error || "Invalid coupon code");
        setCouponApplied(false);
        setCouponDiscount(0);
        setDiscountedAmount(selectedTier.price);
      }
    } catch (error: any) {
      console.error('❌ Coupon validation error:', error);

      // Better error messaging
      let errorMessage = "Error validating coupon. Please try again.";
      if (error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('Server error')) {
        errorMessage = "Server error. Please try again in a moment.";
      }

      setCouponError(errorMessage);
      setCouponApplied(false);
      setCouponDiscount(0);
      setDiscountedAmount(selectedTier.price);
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
    // Input validation for phone and age
    if (field === 'phone') {
      // Only allow numeric input and max 10 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setFormData(prev => ({ ...prev, [field]: numericValue }));
      }
      return;
    }

    if (field === 'age') {
      // Only allow numeric input and max 2 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 2) {
        const age = parseInt(numericValue);
        if (isNaN(age) || age <= 99) {
          setFormData(prev => ({ ...prev, [field]: numericValue }));
        }
      }
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (fileType: 'poem' | 'photo', file: File | null) => {
    setFiles(prev => ({ ...prev, [fileType]: file }));
  };

  const handlePaymentSuccess = async (data: any) => {
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
    setIsSubmitting(true);
    setSubmissionStatus("Payment successful! Processing your submission...");

        setCurrentStep("spin");
        toast({
          title: "Payment Successful!",
          description: "Time to spin for your poetry challenges!",
        });

    // Immediately submit after payment success - no delay
    try {
      console.log('🔄 Immediately submitting after payment success...');
      await handleFormSubmitWithPaymentData(processedPaymentData);
      // Submission completed successfully - user will be redirected to completed step
    } catch (error) {
      console.error('❌ Immediate submission failed:', error);
      setIsSubmitting(false);
      setSubmissionStatus("");
      toast({
        title: "Submission Error",
        description: "Payment successful but submission failed. Please contact support.",
        variant: "destructive",
      });
      // Keep user on payment step so they can retry
      setCurrentStep("form");
    }
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
      setSubmissionStatus("Validating your submission...");

      console.log('🚀 Form submission started');
      console.log('Form data:', formData);
      console.log('Payment data:', actualPaymentData);
      console.log('Selected tier:', selectedTier);
      console.log('User:', user);

          if (!selectedTier || selectedPoems.length === 0) return;

          // Basic validation
          if (!formData.firstName || !formData.email ) {
            throw new Error('Please fill in all required fields');
          }

          // Validate that all poems have challenges and files
          for (let i = 0; i < selectedPoems.length; i++) {
            if (!selectedPoems[i].challenge) {
              throw new Error(`Please select a challenge for poem ${i + 1}.`);
            }
            if (!selectedPoems[i].file) {
              throw new Error(`Please upload poem file for poem ${i + 1}.`);
            }
          }

      // Ensure user is authenticated
      if (!user?.uid) {
        throw new Error('User not authenticated. Please sign in and try again.');
      }

      const poemCount = getPoemCount(selectedTier.id);

      // Validate multiple poems if required
      for (let i = 0; i < poemCount; i++) {
        const title = multiplePoems.titles[i];
        const file = multiplePoems.files[i];

        // if (!title) {
        //   throw new Error(`Please enter title for poem ${i + 1}`);
        // }
        // if (!file) {
        //   throw new Error(`Please upload file for poem ${i + 1}`);
        // }
      }

      if (!files.photo) {
        throw new Error('Please upload your photo');
      }

      if (!formData.termsAccepted) {
        throw new Error('Please accept the terms and conditions');
      }

      setSubmissionStatus("Preparing your files for upload...");

      const formDataToSend = new FormData();

      // Add basic form data
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      });

      // Add tier and payment data
      formDataToSend.append('tier', selectedTier.id);
      formDataToSend.append('price', selectedTier.price.toString()); // Use original tier price

      // Add user ID - use user.uid directly
      formDataToSend.append('userUid', user.uid);

      // Add coupon data if applied
      if (couponApplied && couponCode) {
        formDataToSend.append('couponCode', couponCode.trim().toUpperCase());
        formDataToSend.append('couponDiscount', couponDiscount.toString());
        formDataToSend.append('finalAmount', discountedAmount.toString());
      }

      if (actualPaymentData) {
        formDataToSend.append('paymentId', actualPaymentData.razorpay_payment_id || actualPaymentData.paypal_order_id || '');
        formDataToSend.append('paymentMethod', actualPaymentData.payment_method || 'razorpay');
      }
      formDataToSend.append('contestType', currentContestType);

      // Handle single vs multiple poems
      if (selectedPoems.length === 1) {
        // Single poem submission - use challenge title as poem title
        const challengeTitle = selectedPoems[0].challenge.challengeTitle;
        formDataToSend.append('poemTitle', challengeTitle);
        formDataToSend.append('challengeTitle', challengeTitle);
        formDataToSend.append('challengeDescription', selectedPoems[0].challenge.description);
      } else {
        // Multiple poems submission
        const poemTitles = selectedPoems.map(p => p.challenge.challengeTitle);
        formDataToSend.append('poemTitles', JSON.stringify(poemTitles));

        // Add challenge data for each poem
        selectedPoems.forEach((poem, index) => {
          formDataToSend.append(`challengeTitle_${index}`, poem.challenge.challengeTitle);
          formDataToSend.append(`challengeDescription_${index}`, poem.challenge.description);
        });
      }

      // Add multiple poem titles
      const allTitles = [formData.poemTitle];
      for (let i = 1; i < poemCount; i++) {
        allTitles.push(multiplePoems.titles[i] || '');
      }
      //formDataToSend.append('poemTitles', JSON.stringify(allTitles));

      // Add poem files from selectedPoems
      selectedPoems.forEach((poem, index) => {
        if (poem.file) {
          formDataToSend.append('poems', poem.file);
        }
      });

      // Add photo file
      if (files.photo) {
        formDataToSend.append('photo', files.photo);
      }

      setSubmissionStatus("Uploading your files and submitting...");
      console.log('📤 Sending form data to API...');

      const response = await fetch(poemCount > 1 ? '/api/submit-multiple-poems' : '/api/submit-poem', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('📥 API response status:', response.status);

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
        console.log('✅ Submission successful, immediately showing success');

        // IMMEDIATE success feedback - no waiting for background tasks
        setSubmissionStatus("🎉 Submission complete! Processing confirmation email...");

        // Save submission details before clearing form data
        setSubmissionDetails({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          poemTitle: formData.poemTitle,
          tier: selectedTier?.name || "",
          amount: discountedAmount,
        });

        // Clear form data immediately after successful submission
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
        setMultiplePoems({
          titles: ["", "", "", "", ""],
          files: [null, null, null, null, null],
        });
        setSelectedPoems([]);

        // Show immediate success toast
        toast({
          title: "Submission Successful!",
          description: `Your ${poemCount > 1 ? `${poemCount} poems have` : 'poem has'} been successfully submitted!`,
        });

        // Quick transition to completed step (reduced from 1500ms to 800ms)
        setTimeout(() => {
          setCurrentStep("completed");
          setIsSubmitting(false);
          setSubmissionStatus("");
        }, 800);

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
      if (currentStep !== "completed") {
        setIsSubmitting(false);
        setSubmissionStatus("");
      }
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
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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

    // Validate phone number if provided
    if (formData.phone && (formData.phone.length !== 10 || !/^\d{10}$/.test(formData.phone))) {
      return false;
    }

    // Validate age if provided
    if (formData.age && (formData.age.length > 2 || !/^\d+$/.test(formData.age))) {
      return false;
    }

    // Validate that all poems have challenges and files
    for (let i = 0; i < selectedPoems.length; i++) {
      if (!selectedPoems[i]?.challenge || !selectedPoems[i]?.file) {
        return false;
      }
    }

    if (!files.photo) {
      return false;    }

    return true;
  };

  // Checkif submission status
  if (userSubmissionStatus?.hasSubmitted) {
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
                Remember! The more poems you submit, the greater your chances of winning!
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {TIERS.map((tier) => {
              const Icon = tier.icon;

              // Check if free tier should be disabled
              const isFreeTierAdminDisabled = tier.id === 'free' && freeTierStatus?.enabled === false;
              const isFreeTierConfigDisabled = tier.id === 'free' && (!FREE_ENTRY_ENABLED || !ENABLE_FREE_TIER);
              const isFreeTierAlreadyUsed = tier.id === 'free' && hasUsedFreeTier;

              // Hide free tier completely if config disabled
              if (tier.id === 'free' && isFreeTierConfigDisabled && freeTierStatus !== undefined) {
                return null;
              }

              const isDisabled = isFreeTierAdminDisabled || isFreeTierAlreadyUsed;
              const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

              return (
                <div key={tier.id} className="relative">
                  <Card 
                    className={`transition-all duration-300 ${tier.borderClass} border-2 overflow-hidden ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="p-6 text-center bg-white">
                        <div className={`w-16 h-16 mx-auto mb-4 ${tier.bgClass} rounded-full flex items-center justify-center`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{tier.name}</h3>
                        <div className="text-2xl font-bold text-gray-800 mb-2">
                          {tier.price === 0 ? '₹0' : `₹${tier.price}`}
                        </div>
                        <p className="text-gray-600 mb-4">{tier.description}</p>
                      </div>
                      <button
                        onClick={() => !isDisabled && handleTierSelection(tier)}
                        disabled={isDisabled}
                        className={`w-full py-3 px-4 text-white font-medium transition-colors duration-200 ${
                          isDisabled 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : `${tier.bgClass} ${tier.hoverClass}`
                        }`}
                      >
                        {isFreeTierAlreadyUsed && tier.id === 'free' 
                          ? 'Already Used' 
                          : `Submit ${tier.id === 'single' ? '1 Poem' : tier.id === 'double' ? '2 Poems' : tier.id === 'bulk' ? '5 Poems' : 'Free Entry'}`
                        }
                      </button>
                    </CardContent>
                  </Card>

                  {/* Warning messages below cards */}
                  {isFreeTierAdminDisabled && tier.id === 'free' && (
                    <div className="mt-2 text-center">
                      <p className="text-sm text-red-600 font-medium">
                        🚫 Free tier is not available right now.
                      </p>
                    </div>
                  )}

                  {isFreeTierAlreadyUsed && tier.id === 'free' && (
                    <div className="mt-2 text-center">
                      <p className="text-sm text-orange-600 font-medium">
                        ⚠️ You have already used the free trial once.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {(() => {
            // Check if free tier should be hidden and show appropriate message
            const adminDisabled = freeTierStatus?.enabled === false;
            const configDisabled = !FREE_ENTRY_ENABLED || !ENABLE_FREE_TIER;

            if (adminDisabled || (freeTierStatus === undefined && configDisabled)) {
              return (
                <div className="text-center mt-6">
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 inline-block">
                    <p className="text-yellow-800 font-medium">
                      🚫 Free tier submissions are currently disabled{adminDisabled ? ' by admin' : ''}.
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Please choose a paid tier to submit your poem.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="text-center mt-8">
            <p className="text-gray-600">
            No rules, just heart — let your truth unfold, Your words are flames, fierce and bold. At Writory, every voice is gold.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "spin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="shadow-xl">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-bold text-gray-800 text-center">
                Spin the Wheel for Poem {currentPoemIndex + 1}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {/* Navigation Header */}
              <div className="flex justify-between items-center mb-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentPoemIndex > 0) {
                      setCurrentPoemIndex(currentPoemIndex - 1);
                    } else {
                      setCurrentStep("selection");
                    }
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {currentPoemIndex > 0 ? "Previous Poem" : "Back to Tiers"}
                </Button>
                <div className="text-sm text-gray-600">
                  Poem {currentPoemIndex + 1} of {selectedTier?.poems}
                </div>
              </div>

              {/* Display selected challenge if exists */}
              {selectedPoems[currentPoemIndex]?.challenge ? (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800">
                    Selected Challenge: {selectedPoems[currentPoemIndex].challenge.challengeTitle}
                  </h3>
                  <p className="text-green-700 mt-2">
                    {selectedPoems[currentPoemIndex].challenge.description}
                  </p>
                  {currentPoemIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUsePreviousChallenge(currentPoemIndex)}
                      className="mt-4"
                    >
                      Use Previous Challenge
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <SpinWheel
                    challenges={currentChallenges}
                    onChallengeSelected={handleChallengeSelected}
                    poemIndex={currentPoemIndex + 1}
                  />
                  {currentPoemIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUsePreviousChallenge(currentPoemIndex)}
                      className="mt-4"
                    >
                      Use Previous Challenge
                    </Button>
                  )}
                </>
              )}

              {/* Poem File Upload */}
              {selectedPoems[currentPoemIndex]?.challenge && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`poem-file-${currentPoemIndex}`}>Upload Your Poem File * (PDF, DOC, DOCX)</Label>
                    <Input
                      id={`poem-file-${currentPoemIndex}`}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        const updatedPoems = [...selectedPoems];
                        updatedPoems[currentPoemIndex] = {
                          ...updatedPoems[currentPoemIndex],
                          file: file
                        };
                        setSelectedPoems(updatedPoems);
                      }}
                      required
                      className="mt-2"
                    />
                    {selectedPoems[currentPoemIndex]?.file && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {selectedPoems[currentPoemIndex].file.name}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset the challenge for the current poem
                        const updatedPoems = [...selectedPoems];
                        updatedPoems[currentPoemIndex] = {
                          challenge: null,
                          text: ""
                        };
                        setSelectedPoems(updatedPoems);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Spin Again
                    </Button>

                    <Button
                      onClick={() => {
                        // Validate current poem has file
                        const currentPoem = selectedPoems[currentPoemIndex];
                        if (!currentPoem?.file) {
                          toast({
                            title: "Please upload your poem",
                            description: "You need to upload your poem file before proceeding.",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Check if it's the last poem
                        if (currentPoemIndex === selectedTier.poems - 1) {
                          // Move to the form
                          setCurrentStep("form");
                        } else {
                          // Move to the next poem
                          setCurrentPoemIndex(currentPoemIndex + 1);
                        }
                      }}
                      disabled={!selectedPoems[currentPoemIndex]?.file}
                    >
                      {currentPoemIndex === selectedTier.poems - 1 ? "Next: Submit Form" : "Next Poem"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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

            {/* Show selected poem challenges */}
            {selectedPoems.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">Your Selected Challenges:</h3>
                {selectedPoems.map((poem, index) => (
                  poem.challenge && (
                    <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200 shadow-sm">
                      <h4 className="font-semibold text-purple-800">
                        Poem {index + 1}: {poem.challenge.challengeTitle}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {poem.challenge.description}
                      </p>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <Card className="shadow-xl border-2 border-purple-200 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8 bg-gradient-to-br from-white to-purple-50">
              <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-6">
                {/* Selected Poems Display */}
                {selectedPoems.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Your Selected Poems</h2>
                    {selectedPoems.map((poem, index) => (
                      poem.challenge && (
                        <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <h3 className="text-lg font-semibold text-purple-800">
                            Poem {index + 1}: {poem.challenge.challengeTitle}
                          </h3>
                          <p className="text-sm text-gray-600 italic mb-2">
                            {poem.challenge.description}
                          </p>
                          {poem.file && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <FileText className="w-4 h-4" />
                              <span>✓ {poem.file.name}</span>
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}

                {/* Form content */}
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
                        placeholder="Enter 10-digit phone number"
                        type="tel"
                        maxLength={10}
                        inputMode="numeric"
                        className={formData.phone && formData.phone.length > 0 && formData.phone.length !== 10 ? 'border-red-500' : ''}
                      />
                      <p className="text-xs text-gray-500 mt-1">Numbers only, exactly 10 digits</p>
                      {formData.phone && formData.phone.length > 0 && formData.phone.length !== 10 && (
                        <p className="text-xs text-red-500 mt-1">Phone number must be exactly 10 digits</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        value={formData.age}
                        onChange={(e) => handleFormData('age', e.target.value)}
                        placeholder="Enter your age"
                        type="text"
                        maxLength={2}
                        inputMode="numeric"
                        className={formData.age && formData.age.length > 0 && !/^\d+$/.test(formData.age) ? 'border-red-500' : ''}
                      />
                      <p className="text-xs text-gray-500 mt-1">Numbers only, maximum 2 digits</p>
                      {formData.age && formData.age.length > 0 && !/^\d+$/.test(formData.age) && (
                        <p className="text-xs text-red-500 mt-1">Age must be numbers only</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Poem Fields - Dynamic based on tier */}
                {/*{renderPoemFields()}*/}

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
                    <a
                      href="/privacy"
                      target="_blank"
                      className="text-purple-600 hover:underline"
                    >
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
                    onClick={() => setCurrentStep("spin")}
                    className="flex-1"
                  >
                    Back to Spin
                  </Button>

                  {selectedTier && discountedAmount === 0 ? (
                    <Button
                      type="submit"
                      disabled={isSubmitting || !isFormValid()}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Please wait, submitting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Submit for Free
                        </>
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
                            description: "Please complete all required fields and upload your poems",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!isFormValid()}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
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
                  isProcessingPayPal={setIsProcessingPayPal}
                  setIsProcessingPayPal={setIsProcessingPayPal}
                  onBack={() => setCurrentStep("form")}
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

  // Full-screen blocking loader during submission
  if (isSubmitting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Processing Submission</h2>
          <p className="text-gray-600 mb-4">
            {submissionStatus || "Please wait while we process your submission..."}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ CRITICAL WARNING ⚠️
            </p>
            <p className="text-sm text-red-700 mt-2">
              <strong>DO NOT refresh, reload, or close this page!</strong><br/>
              Your poem submission may not be recorded if you navigate away now.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              This process typically takes 10-30 seconds. Please be patient.
            </p>
          </div>
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
                Your poem has been submitted successfully for the contest. A confirmation email will be sent shortly.
              </p>

              {/* Submission Details */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Submission Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span>{submissionDetails.firstName} {submissionDetails.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span>{submissionDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Poem Title:</span>
                    <span>{submissionDetails.poemTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tier:</span>
                    <span>{submissionDetails.tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>₹{submissionDetails.amount}</span>
                  </div>
                </div>
              </div>

              {/* Social Media Section */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Follow us on Social Media</h3>
                <div className="flex justify-center gap-4">
                  <a href="https://x.com/writoryofficial" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-500 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="https://www.facebook.com/people/Writory/61577727639318/?rdid=Qujzx917cNisZLAo&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F16hyCrZbE2%2F" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-125.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/writoryofficial/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-pink-600 transition-colors">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/company/writoryofficial/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-700 transition-colors">
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
};