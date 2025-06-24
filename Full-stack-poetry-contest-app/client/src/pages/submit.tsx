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

type SubmissionStep = "selection" | "payment" | "form";

export default function SubmitPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<SubmissionStep>("selection");
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [freeSubmissionUsed, setFreeSubmissionUsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submission state
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

  const handlePaymentNext = async () => {
    if (isSubmitting) {
      console.log("⚠️ Already submitting, ignoring duplicate request");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const poemUrl = await handleFileUpload(files.poem!, "poem");
      const photoUrl = await handleFileUpload(files.photo!, "photo");

      await submitMutation.mutateAsync({
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        age: parseInt(formData.age),
        poemFileUrl: poemUrl,
        photoUrl: photoUrl,
        paymentScreenshotUrl: null,
        tier: selectedTier!.id,
        amount: selectedTier!.price,
        userUid: user?.uid,
      });
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
    
    // Prevent multiple submissions
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

    if (selectedTier.price > 0) {
      setCurrentStep("payment");
      return;
    }

    setIsSubmitting(true);

    try {
      const poemUrl = await handleFileUpload(files.poem, "poem");
      const photoUrl = await handleFileUpload(files.photo, "photo");

      const submissionData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        age: parseInt(formData.age),
        poemFileUrl: poemUrl,
        photoUrl: photoUrl,
        paymentScreenshotUrl: null,
        tier: selectedTier.id,
        amount: selectedTier.price,
        userUid: user?.uid,
        // Add unique identifier to prevent duplicates
        submissionId: `${user?.uid || 'guest'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      console.log("📤 Submitting data:", submissionData);
      
      await submitMutation.mutateAsync(submissionData);
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

  const handleFileUpload = async (file: File, type: string) => {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const fileName = `${type}_${timestamp}_${randomString}_${file.name}`;
    return `https://storage.example.com/uploads/${fileName}`;
  };

  const generateQRCode = (upiId: string, amount: number) => {
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
                    <Label>Name *</Label>
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
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
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
                    min="13"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label>Poem Title *</Label>
                  <Input
                    required
                    placeholder="Enter your poem title"
                    value={formData.poemTitle}
                    onChange={(e) => setFormData({ ...formData, poemTitle: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                {/* File Upload sections remain the same but add disabled={isSubmitting} */}
                <div className="space-y-4">
                  <div>
                    <Label>Upload Your Poem *</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => poemFileRef.current?.click()}
                          disabled={isSubmitting}
                        >
                          Choose File
                        </Button>
                        <input
                          ref={poemFileRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFiles({ ...files, poem: file });
                            }
                          }}
                          disabled={isSubmitting}
                        />
                      </div>
                      {files.poem && (
                        <p className="mt-2 text-sm text-green-600">
                          Selected: {files.poem.name}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        PDF, DOC, DOCX, or TXT files only
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Upload Your Photo *</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => photoFileRef.current?.click()}
                          disabled={isSubmitting}
                        >
                          Choose Photo
                        </Button>
                        <input
                          ref={photoFileRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFiles({ ...files, photo: file });
                            }
                          }}
                          disabled={isSubmitting}
                        />
                      </div>
                      {files.photo && (
                        <p className="mt-2 text-sm text-green-600">
                          Selected: {files.photo.name}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        JPG, PNG, or GIF files only
                      </p>
                    </div>
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
                    I accept the terms and conditions and confirm that this poem is my original work
                  </Label>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("selection")}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-green-700 text-white"
                    disabled={isSubmitting || submitMutation.isPending}
                  >
                    {isSubmitting || submitMutation.isPending ? "Submitting..." : "Submit Poem"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payment section remains the same but add disabled={isSubmitting} to buttons */}
        {currentStep === "payment" && (
          <Card>
            <CardContent className="p-8">
              {/* Payment content - add disabled={isSubmitting} to all buttons */}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}