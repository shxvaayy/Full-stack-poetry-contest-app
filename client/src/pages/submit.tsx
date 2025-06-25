import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Pen, Feather, Crown, Upload, QrCode } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import qrCodeImage from "@assets/WhatsApp Image 2025-06-22 at 16.45.29 (1)_1750599570104.jpeg";

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

type SubmissionStep = "selection" | "form" | "payment";

export default function SubmitPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SubmissionStep>("selection");
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [freeSubmissionUsed, setFreeSubmissionUsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    age: "",
    authorBio: "",
    poemTitle: "",
    termsAccepted: false,
  });
  const [files, setFiles] = useState({
    poem: null as File | null,
    photo: null as File | null,
    paymentScreenshot: null as File | null,
  });

  const poemFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const paymentFileRef = useRef<HTMLInputElement>(null);

  // Check user submission status
  const { data: submissionStatus, refetch: refetchStatus } = useQuery({
    queryKey: [`/api/users/${user?.uid}/submission-status`],
    enabled: !!user?.uid,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("🚀 Starting submission mutation with data:", data);
      const response = await apiRequest("POST", "/api/submissions", data);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ Submission successful:", data);
      setIsSubmitting(false);
      
      toast({
        title: "Success!",
        description: "Your poem has been submitted successfully. You will receive a confirmation email shortly. Stay in the loop — follow us for updates, contests, and a daily dose of inspiration!",
      });
      
      if (selectedTier?.id === "free") {
        setFreeSubmissionUsed(true);
      }
      
      // Reset form
      setCurrentStep("selection");
      setSelectedTier(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: user?.email || "",
        phone: "",
        age: "",
        authorBio: "",
        poemTitle: "",
        termsAccepted: false,
      });
      setFiles({
        poem: null,
        photo: null,
        paymentScreenshot: null,
      });
      refetchStatus();
    },
    onError: (error) => {
      console.error("❌ Submission failed:", error);
      setIsSubmitting(false);
      
      toast({
        title: "Error",
        description: "Failed to submit poem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    const isFreeUsed = (tier.id === "free" && (submissionStatus?.freeSubmissionUsed || freeSubmissionUsed));
    
    if (isFreeUsed) {
      toast({
        title: "Free trial already used",
        description: "You have already used your free trial. Please switch to other modes to submit poems.",
        variant: "destructive",
      });
      return;
    }

    setSelectedTier(tier);
    setCurrentStep("form");
  };

  const handleCompleteSubmission = async () => {
    if (isSubmitting) {
      console.log("⚠️ Already submitting, ignoring duplicate request");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData for file uploads
      const formDataToSubmit = new FormData();
      
      // Add form fields
      formDataToSubmit.append('firstName', formData.firstName);
      formDataToSubmit.append('lastName', formData.lastName);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone', formData.phone);
      formDataToSubmit.append('age', formData.age);
      formDataToSubmit.append('poemTitle', formData.poemTitle);
      formDataToSubmit.append('tier', selectedTier!.id);
      formDataToSubmit.append('amount', selectedTier!.price.toString());
      formDataToSubmit.append('userUid', user?.uid || '');
      
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Your poem has been submitted successfully. Files uploaded to Google Drive and data saved to Google Sheets.",
      });
      
      // Reset form
      setCurrentStep("selection");
      setSelectedTier(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: user?.email || "",
        phone: "",
        age: "",
        authorBio: "",
        poemTitle: "",
        termsAccepted: false,
      });
      setFiles({
        poem: null,
        photo: null,
        paymentScreenshot: null,
      });
      refetchStatus();
      
    } catch (error) {
      console.error("❌ Submission error after payment:", error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to process payment and submit poem. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || submitMutation.isPending) {
      console.log("⚠️ Already submitting, ignoring duplicate request");
      return;
    }

    console.log("📝 Form submission started");

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

    if (selectedTier.id === "free" && (submissionStatus?.freeSubmissionUsed || freeSubmissionUsed)) {
      toast({
        title: "Free trial already used",
        description: "You have already used your free trial. Please switch to other modes to submit poems.",
        variant: "destructive",
      });
      setCurrentStep("selection");
      return;
    }

    // For paid tiers, go to payment page
    if (selectedTier.price > 0) {
      setCurrentStep("payment");
      return;
    }

    // For free tier, submit directly
    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const formDataToSubmit = new FormData();
      
      // Add form fields
      formDataToSubmit.append('firstName', formData.firstName);
      formDataToSubmit.append('lastName', formData.lastName);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone', formData.phone);
      formDataToSubmit.append('age', formData.age);
      formDataToSubmit.append('poemTitle', formData.poemTitle);
      formDataToSubmit.append('tier', selectedTier.id);
      formDataToSubmit.append('amount', selectedTier.price.toString());
      formDataToSubmit.append('userUid', user?.uid || '');
      
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Your poem has been submitted successfully. Files uploaded to Google Drive and data saved to Google Sheets.",
      });
      
      // Reset form
      setCurrentStep("selection");
      setSelectedTier(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: user?.email || "",
        phone: "",
        age: "",
        authorBio: "",
        poemTitle: "",
        termsAccepted: false,
      });
      setFiles({
        poem: null,
        photo: null,
        paymentScreenshot: null,
      });
      refetchStatus();
      
    } catch (error) {
      console.error("❌ Submission error:", error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to submit poem. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (type: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles({ ...files, [type]: file });
    }
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setSelectedTier(null);
  };

  const handleBackToForm = () => {
    setCurrentStep("form");
  };

  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Submit Your Poem</h1>
          <p className="text-xl text-gray-600">Choose your submission tier and share your literary voice</p>
        </div>

        {/* Tier Selection */}
        {currentStep === "selection" && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                const isDisabled = tier.id === "free" && (submissionStatus?.freeSubmissionUsed || freeSubmissionUsed);

                return (
                  <Card key={tier.id} className={`${isDisabled ? "opacity-50" : "hover:shadow-lg"} transition-shadow border-2 ${tier.borderClass}`}>
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 ${tier.bgClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="text-2xl text-white" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                      <p className={`text-3xl font-bold ${tier.textClass} mb-4`}>
                        ₹{tier.price}
                      </p>
                      <p className="text-gray-600 mb-6">{tier.description}</p>
                      <Button
                        className={`w-full ${tier.bgClass} ${tier.hoverClass} text-white font-semibold py-3 px-4`}
                        onClick={() => handleTierSelection(tier)}
                        disabled={isDisabled || isSubmitting}
                      >
                        {tier.id === "free" ? (isDisabled ? "Free Trial Used" : "Submit for FREE") : `Submit ${tier.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-center text-lg text-gray-700 mt-4">
              Remember! The more poems you submit, the greater your chances of winning!
            </p>
          </>
        )}

        {/* Submission Form */}
        {currentStep === "form" && (
          <Card>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Poem Submission Form</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label>Poem Title *</Label>
                  <Input
                    required
                    value={formData.poemTitle}
                    onChange={(e) => setFormData({ ...formData, poemTitle: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label>Upload Poem File (PDF/DOC/DOCX) *</Label>
                  <div className="mt-2">
                    <input
                      ref={poemFileRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange("poem")}
                      className="hidden"
                      required
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => poemFileRef.current?.click()}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      <Upload className="mr-2" size={16} />
                      {files.poem ? files.poem.name : "Choose Poem File"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Upload Photo (JPG/PNG) *</Label>
                  <div className="mt-2">
                    <input
                      ref={photoFileRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleFileChange("photo")}
                      className="hidden"
                      required
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoFileRef.current?.click()}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      <Upload className="mr-2" size={16} />
                      {files.photo ? files.photo.name : "Choose Photo"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, termsAccepted: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I accept the terms and conditions *
                  </Label>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToSelection}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Back to Tiers
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-green-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : selectedTier?.price === 0 ? "Submit Poem" : "Proceed to Payment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payment Page */}
        {currentStep === "payment" && selectedTier && (
          <Card>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Complete Payment</h3>
              
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold mb-2">{selectedTier.name}</h4>
                  <p className="text-3xl font-bold text-primary">₹{selectedTier.price}</p>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-6">
                  <h5 className="font-semibold mb-3 text-center">Scan QR Code to Pay</h5>
                  <div className="flex justify-center mb-4">
                    <img 
                      src={qrCodeImage} 
                      alt="Payment QR Code" 
                      className="w-48 h-48 object-contain border border-gray-300 rounded"
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    <p>UPI ID: <span className="font-mono">9667102405@pthdfc</span></p>
                    <p className="mt-2">Amount: ₹{selectedTier.price}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    After making the payment, click "Complete Submission" below.
                  </p>
                  
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToForm}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Back to Form
                    </Button>
                    <Button
                      onClick={handleCompleteSubmission}
                      className="flex-1 bg-primary hover:bg-green-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Processing..." : "Complete Submission"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}