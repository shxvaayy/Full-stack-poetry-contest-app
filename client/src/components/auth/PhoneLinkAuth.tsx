import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  signInWithGoogle,
  setUpRecaptcha,
  linkPhoneToCurrentUser,
  verifyPhoneAndLink
} from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function PhoneLinkAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Success",
        description: "Google Sign-In completed",
      });
    } catch (error: any) {
      console.error("Google Sign-In Error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in with Google first",
        variant: "destructive",
      });
      return;
    }

    if (!phone) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const recaptchaVerifier = setUpRecaptcha("recaptcha-container");
      const confirmation = await linkPhoneToCurrentUser(phone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      
      toast({
        title: "OTP Sent",
        description: "Check your phone for verification code",
      });
    } catch (error: any) {
      console.error("OTP Send Error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndLink = async () => {
    if (!otp || !confirmationResult) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneAndLink(confirmationResult, otp);
      toast({
        title: "Success",
        description: "Phone number linked successfully!",
      });
      
      // Reset form
      setOtp("");
      setPhone("");
      setConfirmationResult(null);
    } catch (error: any) {
      console.error("OTP Verification Error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-xl font-bold text-center">Link Phone After Google Sign-In</h2>

        {!user && (
          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-red-500 hover:bg-red-600"
            disabled={loading}
          >
            Continue with Google
          </Button>
        )}

        {user && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Signed in as: {user.email}
            </p>
            
            <Input
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            
            <Button
              onClick={sendOtp}
              className="w-full"
              disabled={loading}
            >
              Send OTP
            </Button>

            {confirmationResult && (
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <Button
                  onClick={verifyOtpAndLink}
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={loading}
                >
                  Verify & Link
                </Button>
              </div>
            )}
          </div>
        )}

        <div id="recaptcha-container"></div>
      </CardContent>
    </Card>
  );
}
