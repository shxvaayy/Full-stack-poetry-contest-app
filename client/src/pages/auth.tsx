import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Chrome } from "lucide-react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";
import { auth } from "@/lib/firebase";
import firebase from "firebase/compat/app";

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      if (isSignIn) {
        if (!password) {
          toast({
            title: "Error",
            description: "Password is required for sign in",
            variant: "destructive",
          });
          return;
        }
        await signInWithEmail(email, password);
      } else {
        const tempPassword = "123456";
        await signUpWithEmail(email, tempPassword);
      }
    } catch (error: any) {
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
      const recaptcha = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
        size: "invisible",
      });

      const result = await auth.signInWithPhoneNumber(phone, recaptcha);
      setConfirmationResult(result);
      setShowOtpInput(true);
    } catch (error: any) {
      toast({
        title: "Phone Auth Failed",
        description: error.message,
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
      const credential = firebase.auth.PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        otp
      );
      await auth.currentUser?.linkWithCredential(credential);
      toast({
        title: "Phone Linked",
        description: "Phone number linked successfully!",
      });
    } catch (error: any) {
      toast({
        title: "OTP Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('demo-session', 'true');
    toast({
      title: "Demo Mode",
      description: "Accessing platform in demo mode",
    });
    window.location.reload();
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Writory</h1>
          <p className="text-gray-600 text-sm mt-1">Write Your Own Victory</p>
          <p className="text-gray-500 text-sm mt-2">Poetry Contest Platform</p>
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

              {isSignIn && (
                <div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="border-2 border-accent focus:border-accent"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Continue"}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Input
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className="mb-3"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePhoneAuth}
                  disabled={loading}
                >
                  <Phone className="mr-3 h-4 w-4 text-gray-400" />
                  Send OTP
                </Button>

                {showOtpInput && (
                  <>
                    <Input
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      type="text"
                      className="mb-3"
                    />
                    <Button onClick={handleVerifyOtp} disabled={loading} className="w-full">
                      Verify & Link Phone
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <Chrome className="mr-3 h-4 w-4 text-red-500" />
                  Continue with Google
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <span className="text-gray-600">
                {isSignIn ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                className="text-accent hover:text-blue-600 font-medium"
                onClick={() => setIsSignIn(!isSignIn)}
              >
                {isSignIn ? "Sign up" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}
