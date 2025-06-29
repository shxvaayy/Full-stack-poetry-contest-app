import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Pen, Feather, Crown, Upload, CheckCircle, AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const TIERS = [
  { 
    id: "free", 
    name: "Free Entry", 
    price: 0, 
    priceUSD: 0,
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
    priceUSD: 0.60,
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
    priceUSD: 1.20,
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
    priceUSD: 5.76,
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
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);
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

  // Check user's submission status to see if free entry is available
  const { data: submissionStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: [`/api/users/${user?.uid}/submission-status`],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user UID");
      
      const response = await fetch(`/api/users/${user.uid}/submission-status`);
      if (!response.ok) {
        throw new Error(`Failed to fetch submission status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!user?.uid,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh data
  });

  // Check URL parameters for payment status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancelled = urlParams.get('payment_cancelled');
    const paypalOrderId = urlParams.get('paypal_order_id');
    const paymentError = urlParams.get('payment_error');

    if (paypalOrderId && paymentSuccess === 'true') {
      console.log('🎉 PayPal payment successful, verifying order:', paypalOrderId);
      verifyPayPalPayment(paypalOrderId);
    } else if (paymentCancelled === 'true') {
      toast({
        title: "Payment Cancelled",
        description: "Payment was cancelled. You can try again.",
        variant: "destructive",
      });
      setCurrentStep("payment");
    } else if (paymentError === 'true') {
      const errorMessage = urlParams.get('message') || 'Payment failed';
      toast({
        title: "Payment Error",
        description: decodeURIComponent(errorMessage),
        variant: "destructive",
      });
      setCurrentStep("payment");
    }

    // Clean up URL parameters
    if (paymentSuccess || paymentCancelled || paypalOrderId || paymentError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
        
        setPaymentCompleted(true);
        
        toast({
          title: "Payment Successful!",
          description: "PayPal payment completed successfully. Submitting your poem...",
        });

        // Auto-submit after payment verification
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
        title: "Payment Verification Failed",
        description: error.message || "There was an issue verifying your PayPal payment. Please contact support.",
        variant: "destructive",
      });
      setCurrentStep("payment");
    }
  };

  const handleRazorpayPayment = async () => {
    if (!selectedTier || selectedTier.price === 0) return;

    setIsProcessingRazorpay(true);
    try {
      console.log('💳 Starting Razorpay payment process...');
      
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedTier.price,
          tier: selectedTier.id
        }),
      });

      const data = await response.json();
      
      if (data.orderId) {
        // Load Razorpay script if not already loaded
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          // Initialize Razorpay
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_your_key_here',
            amount: selectedTier.price * 100,
            currency: 'INR',
            name: 'Writory Contest',
            description: `${selectedTier.name} - Poetry Contest`,
            order_id: data.orderId,
            handler: function (response: any) {
              console.log('✅ Razorpay payment successful:', response);
              verifyRazorpayPayment(response);
            },
            prefill: {
              name: formData.firstName + ' ' + formData.lastName,
              email: formData.email,
              contact: formData.phone
            },
            theme: {
              color: '#f59e0b'
            },
            modal: {
              ondismiss: function() {
                setIsProcessingRazorpay(false);
                toast({
                  title: "Payment Cancelled",
                  description: "Payment was cancelled. You can try again.",
                  variant: "destructive",
                });
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        document.head.appendChild(script);
      } else {
        throw new Error(data.error || 'Failed to create payment order');
      }
    } catch (error: any) {
      console.error('❌ Razorpay payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to start payment process",
        variant: "destructive",
      });
      setIsProcessingRazorpay(false);
    }
  };

  const verifyRazorpayPayment = async (paymentData: any) => {
    try {
      console.log('🔍 Verifying Razorpay payment:', paymentData);
      
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: paymentData.razorpay_order_id,
          paymentId: paymentData.razorpay_payment_id,
          signature: paymentData.razorpay_signature
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Razorpay payment verified:', data);
        
        setPaymentCompleted(true);
        setIsProcessingRazorpay(false);
        
        toast({
          title: "Payment Successful!",
          description: "Payment completed successfully. Submitting your poem...",
        });

        // Auto-submit after payment verification
        setTimeout(() => {
          handleFormSubmit();
        }, 1000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('❌ Razorpay payment verification error:', error);
      setIsProcessingRazorpay(false);
      toast({
        title: "Payment Verification Failed",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
      setCurrentStep("payment");
    }
  };

  const handlePayPalPayment = async () => {
    if (!selectedTier || selectedTier.price === 0) return;

    setIsProcessingPayPal(true);
    try {
      console.log('💳 Starting PayPal payment process...');
      
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedTier.priceUSD, // Use USD price for PayPal
          tier: selectedTier.id,
          currency: 'USD'
        }),
      });

      const data = await response.json();
      
      if (data.success && data.approvalUrl) {
        console.log('✅ PayPal order created, redirecting to:', data.approvalUrl);
        window.location.href = data.approvalUrl;
      } else {
        throw new Error(data.error || 'Failed to create PayPal order');
      }
    } catch (error: any) {
      console.error('❌ PayPal payment error:', error);
      toast({
        title: "PayPal Payment Error",
        description: error.message || "Failed to start PayPal payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayPal(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/submit-poem', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Submission successful:', data);
      setCurrentStep("completed");
      // Refetch submission status to update free entry availability
      refetchStatus();
      toast({
        title: "Submission Successful!",
        description: "Your poem has been submitted successfully. Check your email for confirmation.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Submission failed:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your poem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTierSelect = (tier: typeof TIERS[0]) => {
    // Check if free tier is selected and already used
    if (tier.id === "free" && submissionStatus?.freeSubmissionUsed) {
      toast({
        title: "Free Entry Already Used",
        description: "You have already used your free entry for this month. Please select a paid tier.",
        variant: "destructive",
      });
      return;
    }

    setSelectedTier(tier);
    if (tier.price === 0) {
      setPaymentCompleted(true);
    }
    // Always go to form step first (both free and paid)
    setCurrentStep("form");
  };

  const handleFormSubmit = async () => {
    if (!selectedTier) return;

    // Validate form
    if (!formData.firstName || !formData.poemTitle || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.termsAccepted) {
      toast({
        title: "Terms Not Accepted",
        description: "Please accept the terms and conditions.",
        variant: "destructive",
      });
      return;
    }

    if (!files.poem) {
      toast({
        title: "Missing Poem File",
        description: "Please upload your poem file.",
        variant: "destructive",
      });
      return;
    }

    // For paid tiers, check if payment is completed
    if (selectedTier.price > 0 && !paymentCompleted) {
      // Go to payment step
      setCurrentStep("payment");
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('age', formData.age);
      formDataToSend.append('poemTitle', formData.poemTitle);
      formDataToSend.append('tier', selectedTier.id);
      formDataToSend.append('price', selectedTier.price.toString());
      
      // Add files
      if (files.poem) {
        formDataToSend.append('poem', files.poem);
      }
      if (files.photo) {
        formDataToSend.append('photo', files.photo);
      }
      
      // Add payment information
      if (selectedTier.price > 0) {
        formDataToSend.append('paymentCompleted', 'true');
        if (sessionId) {
          formDataToSend.append('sessionId', sessionId);
        }
      }

      await mutation.mutateAsync(formDataToSend);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if free tier should be disabled
  const isFreeEntryDisabled = submissionStatus?.freeSubmissionUsed || false;

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

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading submission status...</p>
        </div>
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
            
            {submissionStatus && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Contest Status:</strong> {submissionStatus.contestMonth} | 
                  <strong> Your Submissions:</strong> {submissionStatus.totalSubmissions} | 
                  <strong> Free Entry:</strong> {isFreeEntryDisabled ? "Already Used" : "Available"}
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isDisabled = tier.id === "free" && isFreeEntryDisabled;
              
              return (
                <Card 
                  key={tier.id} 
                  className={`cursor-pointer transition-all duration-200 ${
                    isDisabled 
                      ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-100" 
                      : `${tier.borderClass} hover:shadow-lg hover:scale-105`
                  }`}
                  onClick={() => !isDisabled && handleTierSelect(tier)}
                >
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      isDisabled ? "bg-gray-300" : tier.bgClass
                    }`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className={`text-2xl font-bold mb-2 ${isDisabled ? "text-gray-500" : tier.textClass}`}>
                      {tier.name}
                      {isDisabled && <span className="block text-sm font-normal text-red-500 mt-1">Already Used</span>}
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
                      {isDisabled ? "Already Used" : "Select This Tier"}
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
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                  <strong>Selected:</strong> {selectedTier.name} 
                  {selectedTier.price > 0 && (
                    <span className="ml-2">
                      (₹{selectedTier.price} / ${selectedTier.priceUSD})
                      {paymentCompleted && <span className="ml-2 text-green-600">✓ Payment Completed</span>}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-8">
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="poemTitle">Poem Title *</Label>
                  <Input
                    id="poemTitle"
                    value={formData.poemTitle}
                    onChange={(e) => setFormData({...formData, poemTitle: e.target.value})}
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
                      onChange={(e) => setFiles({...files, poem: e.target.files?.[0] || null})}
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
                      onChange={(e) => setFiles({...files, photo: e.target.files?.[0] || null})}
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
                    onCheckedChange={(checked) => setFormData({...formData, termsAccepted: checked as boolean})}
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
                    type="submit"
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

  // Payment Step - ONLY Razorpay and PayPal
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
                <p className="text-2xl font-bold text-green-600">₹{selectedTier.price} / ${selectedTier.priceUSD}</p>
                <p className="text-gray-600">{selectedTier.description}</p>
              </div>

              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-4">Choose Payment Method</h3>
                </div>

                {/* Razorpay Payment - Yellow */}
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={isProcessingRazorpay}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white p-4 h-auto"
                >
                  <CreditCard className="w-5 h-5 mr-3" />
                  <div className="text-left flex-1">
                    <div className="font-semibold">Razorpay - ₹{selectedTier.price}</div>
                    <div className="text-sm opacity-90">UPI, Cards, Netbanking, Wallets</div>
                  </div>
                  {isProcessingRazorpay && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                </Button>

                {/* PayPal Payment - Blue */}
                <Button
                  onClick={handlePayPalPayment}
                  disabled={isProcessingPayPal}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto"
                >
                  <div className="w-5 h-5 mr-3 font-bold text-lg">PP</div>
                  <div className="text-left flex-1">
                    <div className="font-semibold">PayPal - ${selectedTier.priceUSD}</div>
                    <div className="text-sm opacity-90">PayPal Balance, Cards</div>
                  </div>
                  {isProcessingPayPal && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                </Button>
              </div>

              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("form")}
                >
                  ← Back to Form
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After successful payment, your poem will be automatically submitted and you'll receive a confirmation email.
                </p>
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Submission Successful!</h2>
              
              <p className="text-gray-600 mb-6">
                Your poem "{formData.poemTitle}" has been submitted successfully. 
                You will receive a confirmation email shortly.
              </p>

              {selectedTier && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Tier:</strong> {selectedTier.name}<br />
                    {selectedTier.price > 0 && (
                      <>
                        <strong>Amount:</strong> ₹{selectedTier.price} / ${selectedTier.priceUSD}<br />
                      </>
                    )}
                    <strong>Status:</strong> <span className="text-green-600">Submitted</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setCurrentStep("selection");
                    setSelectedTier(null);
                    setPaymentCompleted(false);
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
                    refetchStatus();
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
                  Go to Homepage
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