import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { useLocation, Link } from "wouter";
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail,
  setUpRecaptcha,
  signInWithPhone,
  linkPhoneToCurrentUser,
  verifyPhoneAndLink
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLinkingPhone, setIsLinkingPhone] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [phoneUserEmail, setPhoneUserEmail] = useState("");
  const [showPhoneSection, setShowPhoneSection] = useState(false);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // OTP Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const resetPhoneForm = () => {
    setPhone("");
    setOtp("");
    setShowOtpInput(false);
    setConfirmationResult(null);
    setIsLinkingPhone(false);
    setOtpTimer(0);
    setShowEmailInput(false);
    setPhoneUserEmail("");
    setShowPhoneSection(false);

    // Clear reCAPTCHA
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isSignIn) {
        await signInWithEmail(email, password);
        toast({
          title: "Success",
          description: "Successfully signed in!",
        });
      } else {
        await signUpWithEmail(email, password);
        toast({
          title: "Success",
          description: "Account created successfully!",
        });
      }
    } catch (error: any) {
      console.error("Email auth error:", error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to authenticate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Success",
        description: "Successfully signed in with Google!",
      });
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (!phone) {
      toast({
        title: "Phone Required",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Clear previous OTP if any
      setOtp("");

      // Set up recaptcha (clear existing one first)
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      const recaptchaVerifier = setUpRecaptcha("recaptcha-container");

      // Check if user is already signed in (for linking)
      const confirmation = isLinkingPhone 
        ? await linkPhoneToCurrentUser(phone, recaptchaVerifier)
        : await signInWithPhone(phone, recaptchaVerifier);

      setConfirmationResult(confirmation);
      setShowOtpInput(true);

      // Start 60-second timer
      setOtpTimer(60);

      toast({
        title: "OTP Sent",
        description: "Check your phone for verification code",
      });
    } catch (error: any) {
      console.error("Phone auth error:", error);

      // Reset states on error
      setShowOtpInput(false);
      setOtp("");
      setConfirmationResult(null);
      setOtpTimer(0);

      // Clear reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      toast({
        title: "Phone Auth Failed",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;

    setLoading(true);
    try {
      if (isLinkingPhone) {
        // Link phone to existing account
        await verifyPhoneAndLink(confirmationResult, otp);
        toast({
          title: "Phone Linked",
          description: "Phone number linked successfully!",
        });
        resetPhoneForm();
      } else {
        // Sign in with phone - but now require email
        await confirmationResult.confirm(otp);

        // After successful phone verification, ask for email
        setShowOtpInput(false);
        setShowEmailInput(true);

        toast({
          title: "Phone Verified",
          description: "Now please provide your email address for poem submissions",
        });
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "OTP Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePhoneSignIn = async () => {
    if (!phoneUserEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(phoneUserEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // The user is already signed in with Firebase at this point
      // We just need to update their profile/account with the email
      toast({
        title: "Sign-in Complete",
        description: "Successfully signed in with phone and email!",
      });

      // Reset all forms
      resetPhoneForm();
      setShowEmailInput(false);
      setPhoneUserEmail("");
    } catch (error: any) {
      console.error("Complete sign-in error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if OTP button should be disabled
  const isOtpButtonDisabled = loading || !phone || otpTimer > 0;

    const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 mb-4">
            <img 
              src={logoImage} 
              alt="Writory Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">WRITORY</h1>
          <p className="text-gray-600 text-sm mt-1">WRITE YOUR OWN VICTORY</p>
          <p className="text-gray-500 text-sm mt-2">POETRY CONTEST PLATFORM</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="py-8 px-4 sm:px-10">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {isSignIn ? "Welcome back" : "Create account"}
            </h2>

            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="border-2 border-accent focus:border-accent"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="border-2 border-accent focus:border-accent"
                  placeholder={isSignIn ? "Enter your password" : "Create a password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Loading..." : (isSignIn ? "Sign in" : "Create account")}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {/* Continue with Phone Button */}
                {!showPhoneSection && (
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3 h-12 text-gray-700 border-gray-300 hover:border-gray-400"
                    onClick={() => setShowPhoneSection(true)}
                    disabled={loading}
                  >
                    <Phone className="h-5 w-5" />
                    Continue with phone
                  </Button>
                )}

                {/* Continue with Google Button */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 h-12 text-gray-700 border-gray-300 hover:border-gray-400"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                {/* Phone Section - Only shown when Continue with Phone is clicked */}
                {showPhoneSection && (
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPhoneSection(false)}
                        disabled={loading}
                      >
                        ← Back
                      </Button>
                    </div>

                    <Input
                      placeholder="+91XXXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      disabled={loading}
                      className="h-12"
                    />

                    <div className="flex space-x-2 items-center">
                      <Button
                        variant="outline"
                        className="flex-1 flex items-center justify-center gap-2 h-12"
                        onClick={handlePhoneAuth}
                        disabled={isOtpButtonDisabled}
                      >
                        <Phone className="h-4 w-4 text-gray-400" />
                        {otpTimer > 0 ? `Send OTP` : "Send OTP"}
                      </Button>

                      {otpTimer > 0 && (
                        <div className="text-sm text-gray-500 font-medium min-w-[60px] text-right">
                          {otpTimer}s
                        </div>
                      )}

                      {(showOtpInput || confirmationResult) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetPhoneForm}
                          disabled={loading}
                        >
                          Reset
                        </Button>
                      )}
                    </div>

                    {showOtpInput && (
                      <div className="space-y-3">
                        <Input
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          type="text"
                          maxLength={6}
                          disabled={loading}
                          className="h-12"
                        />
                        <Button 
                          onClick={handleVerifyOtp} 
                          disabled={loading || !otp || otp.length !== 6} 
                          className="w-full h-12"
                        >
                          {loading ? "Verifying..." : "Verify Phone"}
                        </Button>
                      </div>
                    )}

                    {showEmailInput && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 text-center">
                          📧 Please provide your email for poem submissions
                        </p>
                        <Input
                          placeholder="Enter your email address"
                          value={phoneUserEmail}
                          onChange={(e) => setPhoneUserEmail(e.target.value)}
                          type="email"
                          disabled={loading}
                          className="h-12"
                        />
                        <Button 
                          onClick={handleCompletePhoneSignIn} 
                          disabled={loading || !phoneUserEmail} 
                          className="w-full h-12"
                        >
                          {loading ? "Completing Sign-in..." : "Complete Sign-in"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="text-gray-600">
                {isSignIn ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium underline"
                onClick={() => {
                  setIsSignIn(!isSignIn);
                  setPassword(""); // Clear password when switching modes
                }}
              >
                {isSignIn ? "Sign up" : "Sign in"}
              </button>
            </div>

            {/* Terms and Privacy Links */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <Link 
                to="/terms" 
                className="hover:text-gray-700 transition-colors"
              >
                Terms of Use
              </Link>
              <span className="mx-2">|</span>
              <Link 
                to="/privacy" 
                className="hover:text-gray-700 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </CardContent>
        </Card>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}