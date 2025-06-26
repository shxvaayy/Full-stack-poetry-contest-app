import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Pen, Feather, Crown, Upload, QrCode, CheckCircle, AlertTriangle } from "lucide-react";
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
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setPaymentCompleted(false); // Reset payment status
    setPaymentIntentId(null);
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
      setPaymentIntentId('free_submission');
      // Don't automatically submit for free tier, wait for user to click submit
    } else {
      // For paid tiers, go to payment
      setCurrentStep("payment");
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentIntentId(paymentId);
    setPaymentCompleted(true);
    toast({
      title: "Payment Successful!",
      description: "Payment completed successfully. You can now submit your poem.",
    });
    // Return to form with submit button enabled
    setCurrentStep("form");
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
      formDataToSubmit.append('tier', selectedTier!.id);
      formDataToSubmit.append('amount', selectedTier!.price.toString());
      formDataToSubmit.append('userUid', user?.uid || '');
      formDataToSubmit.append('paymentId', paymentIntentId || '');
      
      // Add files
      if (files.poem) {
        formDataToSubmit.append('poemFile', files.poem);
      }
      if (files.photo) {
        formDataToSubmit.append('photoFile', files.photo);
      }

      const response = await fetch('/api/submissions-with-files', {
        method: 'POST',
        body: formDataToSubmit,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log("✅ Submission successful:", result);
      
      toast({
        title: "Success!",
        description: "Your poem has been submitted successfully!",
      });
      
      setCurrentStep("completed");
      refetchStatus();
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      toast({
        title: "Error",
        description: `Failed to submit poem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep("selection");
    setSelectedTier(null);
    setPaymentCompleted(false);
    setPaymentIntentId(null);
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
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600">You need to be logged in to submit poems.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {["selection", "form", ...(selectedTier?.price ? ["payment"] : []), "completed"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step ? 'bg-green-600 text-white' : 
                  paymentCompleted && step === "payment" ? 'bg-green-100 text-green-600' :
                  ["selection", "form"].indexOf(currentStep) > ["selection", "form"].indexOf(step) ? 
                  'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step === "completed" ? <CheckCircle size={16} /> : 
                   step === "payment" && paymentCompleted ? <CheckCircle size={16} /> : index + 1}
                </div>
                {index < 3 && <div className="w-8 h-0.5 bg-gray-300 mx-2" />}
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentStep === "selection" && "Choose Your Tier"}
              {currentStep === "form" && "Submission Details"}
              {currentStep === "payment" && "Complete Payment"}
              {currentStep === "completed" && "Submission Complete"}
            </h1>
          </div>
        </div>

        {/* Content based on current step */}
        {currentStep === "selection" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isFreeUsed = tier.id === "free" && submissionStatus?.freeSubmissionUsed;
              
              return (
                <Card
                  key={tier.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    isFreeUsed 
                      ? 'opacity-50 cursor-not-allowed' 
                      : `hover:scale-105 ${tier.borderClass} border-2`
                  }`}
                  onClick={() => !isFreeUsed && handleTierSelection(tier)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 mx-auto mb-4 rounded-full ${tier.bgClass} flex items-center justify-center`}>
                      <Icon className="text-white" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                    <div className={`text-2xl font-bold ${tier.textClass}`}>
                      {tier.price === 0 ? 'FREE' : `₹${tier.price}`}
                    </div>
                    {isFreeUsed && (
                      <p className="text-red-500 text-xs mt-2">Already used this month</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {currentStep === "form" && (
          <Card>
            <CardContent className="p-8">
              {/* Payment Status Banner for Paid Tiers */}
              {selectedTier && selectedTier.price > 0 && (
                <div className={`mb-6 p-4 rounded-lg border-2 ${
                  paymentCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    {paymentCompleted ? (
                      <>
                        <CheckCircle className="text-green-600 mr-2" size={20} />
                        <div>
                          <p className="text-green-800 font-semibold">Payment Completed Successfully!</p>
                          <p className="text-green-600 text-sm">You can now submit your poem.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="text-yellow-600 mr-2" size={20} />
                        <div>
                          <p className="text-yellow-800 font-semibold">Payment Required: ₹{selectedTier.price}</p>
                          <p className="text-yellow-600 text-sm">Complete payment to enable poem submission.</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Personal Information */}
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

                {/* File Uploads */}
                <div className="space-y-4">
                  <div>
                    <Label>Poem File (PDF, DOC, DOCX) *</Label>
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
                      <Upload className="mr-2" size={16} />
                      {files.poem ? files.poem.name : "Choose Poem File"}
                    </Button>
                  </div>

                  <div>
                    <Label>Photo (JPG, PNG) *</Label>
                    <input
                      ref={photoFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] || null })}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoFileRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2" size={16} />
                      {files.photo ? files.photo.name : "Choose Photo"}
                    </Button>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: !!checked })}
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
                    Back
                  </Button>

                  {/* Payment Button for Paid Tiers (when payment not completed) */}
                  {selectedTier && selectedTier.price > 0 && !paymentCompleted && (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep("payment")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Pay ₹{selectedTier.price}
                    </Button>
                  )}

                  {/* Submit Button (only active when payment completed or free tier) */}
                  <Button
                    type="button"
                    onClick={handleCompleteSubmission}
                    disabled={
                      selectedTier && selectedTier.price > 0 ? !paymentCompleted : false || isSubmitting
                    }
                    className={`flex-1 ${
                      (selectedTier && selectedTier.price > 0 && !paymentCompleted) 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Poem"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep === "payment" && selectedTier && (
          <PaymentForm
            amount={selectedTier.price}
            tier={selectedTier.id}
            email={formData.email}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={() => setCurrentStep("form")}
          />
        )}

        {currentStep === "completed" && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Submission Complete!</h2>
              <p className="text-gray-600 mb-6">
                Your poem has been successfully submitted and uploaded to our system.
              </p>
              <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
                Submit Another Poem
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}