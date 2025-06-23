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
  { id: "free", name: "Free Entry", price: 0, icon: Gift, color: "green", description: "One poem per month" },
  { id: "single", name: "1 Poem", price: 50, icon: Pen, color: "blue", description: "Submit 1 additional poem" },
  { id: "double", name: "2 Poems", price: 100, icon: Feather, color: "green", description: "Submit 2 additional poems" },
  { id: "bulk", name: "5 Poems", price: 480, icon: Crown, color: "yellow", description: "Submit 5 additional poems" },
];

type SubmissionStep = "selection" | "payment" | "form";

export default function SubmitPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SubmissionStep>("selection");
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [freeSubmissionUsed, setFreeSubmissionUsed] = useState(false); // Local state to track free submission
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
      const response = await apiRequest("POST", "/api/submissions", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "Your poem has been submitted successfully. You will receive a confirmation email shortly.",
      });
      
      // If this was a free submission, mark it as used
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit poem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTierSelection = (tier: typeof TIERS[0]) => {
    // Check if free submission is already used (either from API or local state)
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
    setCurrentStep("form"); // Always go to form first
  };

  const handlePaymentNext = async () => {
    if (!files.paymentScreenshot) {
      toast({
        title: "Payment screenshot required",
        description: "Please upload your payment screenshot to proceed.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload payment screenshot
      const paymentScreenshotUrl = await handleFileUpload(files.paymentScreenshot, "payment");

      // Proceed with the actual submission after payment
      const poemUrl = await handleFileUpload(files.poem!, "poem");
      const photoUrl = await handleFileUpload(files.photo!, "photo");

      await submitMutation.mutateAsync({
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        age: parseInt(formData.age),
        poemFileUrl: poemUrl,
        photoUrl: photoUrl,
        paymentScreenshotUrl,
        tier: selectedTier!.id,
        price: selectedTier!.price,
        userUid: user?.uid,
      });
    } catch (error) {
      console.error("Submission error after payment:", error);
      toast({
        title: "Error",
        description: "Failed to process payment and submit poem. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Double-check free submission limit before proceeding
    if (selectedTier.id === "free" && (submissionStatus?.freeSubmissionUsed || freeSubmissionUsed)) {
      toast({
        title: "Free trial already used",
        description: "You have already used your free trial. Please switch to other modes to submit poems.",
        variant: "destructive",
      });
      setCurrentStep("selection");
      return;
    }

    // If it's a paid tier, go to payment step after form submission
    if (selectedTier.price > 0) {
      setCurrentStep("payment");
      return;
    }

    // For free tier, directly submit the form
    try {
      const poemUrl = await handleFileUpload(files.poem, "poem");
      const photoUrl = await handleFileUpload(files.photo, "photo");

      await submitMutation.mutateAsync({
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        age: parseInt(formData.age),
        poemFileUrl: poemUrl,
        photoUrl: photoUrl,
        paymentScreenshotUrl: null, // No payment for free tier
        tier: selectedTier.id,
        price: selectedTier.price,
        userUid: user?.uid,
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit poem. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File, type: string) => {
    // In production, this would upload to cloud storage
    // For now, return a placeholder URL
    return `https://storage.example.com/uploads/${Date.now()}-${file.name}`;
  };

  const generateQRCode = (upiId: string, amount: number) => {
    // In production, use a QR code generation library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}&am=${amount}&cu=INR`;
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isDisabled = tier.id === "free" && (submissionStatus?.freeSubmissionUsed || freeSubmissionUsed);

              return (
                <Card key={tier.id} className={`${isDisabled ? "opacity-50" : "hover:shadow-lg"} transition-shadow border-2 border-${tier.color}-500`}>
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 bg-${tier.color}-500 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="text-2xl text-white" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                    <p className={`text-3xl font-bold text-${tier.color}-600 mb-4`}>
                      ₹{tier.price}
                    </p>
                    <p className="text-gray-600 mb-6">{tier.description}</p>
                    <Button
                      className={`w-full bg-${tier.color}-500 hover:bg-${tier.color}-600 text-white font-semibold py-3 px-4`}
                      onClick={() => handleTierSelection(tier)}
                      disabled={isDisabled || submitMutation.isPending}
                    >
                      {tier.id === "free" ? (isDisabled ? "Free Trial Used" : "Submit for FREE") : `Submit ${tier.name}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {currentStep === "selection" && (
          <p className="text-center text-lg text-gray-700 mt-4">
            Remember! The more poems you submit, the greater your chances of winning!
          </p>
        )}

        {/* Submission Form */}
        {currentStep === "form" && (
          <Card>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Poem Submission Form</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Name</Label>
                    <Input
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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

                <div>
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    required
                    min="13"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Author Bio *</Label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Tell us about yourself as a poet..."
                    value={formData.authorBio}
                    onChange={(e) => setFormData({ ...formData, authorBio: e.target.value })}
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

                <div>
                  <Label>Upload Poem (.docx/.pdf, max 5MB) *</Label>
                  <Input
                    type="file"
                    required
                    accept=".docx,.pdf"
                    ref={poemFileRef}
                    onChange={(e) => setFiles({ ...files, poem: e.target.files?.[0] || null })}
                  />
                </div>

                <div>
                  <Label>Upload Your Photograph *</Label>
                  <Input
                    type="file"
                    required
                    accept="image/*"
                    ref={photoFileRef}
                    onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] || null })}
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: checked as boolean })}
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the terms and conditions and declare that this is my original work in English language.
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-green-700 text-white font-bold py-4 px-6 text-lg"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Poem"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payment Section */}
        {currentStep === "payment" && selectedTier && (
          <Card className="mb-12">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Complete Payment</h3>

              <div className="grid md:grid-cols-2 gap-8">
                {/* QR Code Section */}
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Scan QR Code to Pay</h4>
                  <div className="w-48 h-48 border-2 border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <img
                      src={qrCodeImage}
                      alt="Payment QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-600">UPI ID: 9667102405@pthdfc</p>
                  <p className="text-xl font-bold text-primary mt-2">₹{selectedTier.price}</p>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h4>
                  <div className="space-y-4">
                    <div>
                      <Label>UPI ID</Label>
                      <Input value="9667102405@pthdfc" readOnly className="bg-gray-50" />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input value={`₹${selectedTier.price}`} readOnly className="bg-gray-50" />
                    </div>
                    <div>
                      <Label>Upload Payment Screenshot *</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={paymentFileRef}
                        onChange={(e) => setFiles({ ...files, paymentScreenshot: e.target.files?.[0] || null })}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-primary hover:bg-green-700 text-white font-semibold py-3 px-4"
                    onClick={handlePaymentNext}
                  >
                    Proceed to Submission
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}



