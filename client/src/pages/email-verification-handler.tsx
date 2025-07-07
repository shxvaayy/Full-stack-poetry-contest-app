
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function EmailVerificationHandler() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');

        if (mode === 'verifyEmail' && oobCode) {
          // Verify the action code is valid
          await checkActionCode(auth, oobCode);
          
          // Apply the email verification
          await applyActionCode(auth, oobCode);
          
          setVerified(true);
          toast({
            title: "Email Verified!",
            description: "Your email has been successfully verified. You can now sign in.",
          });
        } else {
          throw new Error('Invalid verification link');
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setError(error.message || 'Failed to verify email');
        toast({
          title: "Verification Failed",
          description: error.message || 'Invalid or expired verification link',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    handleEmailVerification();
  }, [toast]);

  const handleContinue = () => {
    setLocation("/?verified=true");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-8 px-6 text-center">
          {verified ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Email Verified Successfully!
              </h1>
              <p className="text-gray-600">
                Your email has been verified. You can now sign in to your account and start submitting poems.
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continue to Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Verification Failed
              </h1>
              <p className="text-gray-600">
                {error || "The verification link is invalid or has expired. Please try signing up again."}
              </p>
              <Button onClick={handleContinue} variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
