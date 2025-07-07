
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { applyActionCode, checkActionCode, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function EmailVerificationHandler() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');

        if (mode === 'verifyEmail' && oobCode) {
          // First, verify the action code is valid
          await checkActionCode(auth, oobCode);
          
          // Apply the email verification
          await applyActionCode(auth, oobCode);
          setVerified(true);

          // Get stored credentials for auto-login
          const storedEmail = localStorage.getItem('pending_verification_email');
          const storedPassword = localStorage.getItem('pending_verification_password');

          if (storedEmail && storedPassword) {
            try {
              // Sign out any current user first (if any)
              await signOut(auth);
              
              // Auto-login with stored credentials
              const userCredential = await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
              
              // Clean up stored credentials
              localStorage.removeItem('pending_verification_email');
              localStorage.removeItem('pending_verification_password');
              localStorage.removeItem('pending_verification_uid');
              
              setAutoLoginAttempted(true);
              
              toast({
                title: "Account Activated!",
                description: "Your account has been verified and you're now signed in. Welcome to Writory!",
              });

              // Redirect to home page immediately
              setTimeout(() => {
                window.location.href = "/";
              }, 1000);

            } catch (loginError: any) {
              console.error('Auto-login failed:', loginError);
              // Clean up credentials even if login fails
              localStorage.removeItem('pending_verification_email');
              localStorage.removeItem('pending_verification_password');
              localStorage.removeItem('pending_verification_uid');
              
              toast({
                title: "Account Activated!",
                description: "Your account has been verified. Please sign in to continue.",
              });
              
              // Redirect to auth page with verified flag
              setTimeout(() => {
                window.location.href = "/?verified=true";
              }, 2000);
            }
          } else {
            // No stored credentials - just show verification success
            toast({
              title: "Email Verified!",
              description: "Your email has been verified. Please sign in to continue.",
            });
            
            // Redirect to auth page with verified flag
            setTimeout(() => {
              window.location.href = "/?verified=true";
            }, 2000);
          }
        } else {
          throw new Error('Invalid verification link');
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setError(error.message || 'Failed to verify email');
        
        // Clean up any stored credentials on error
        localStorage.removeItem('pending_verification_email');
        localStorage.removeItem('pending_verification_password');
        localStorage.removeItem('pending_verification_uid');
        
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
  }, [toast, setLocation]);

  const handleManualSignIn = () => {
    setLocation("/?verified=true");
  };

  const handleGoToHome = () => {
    setLocation("/");
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 px-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <Button onClick={handleManualSignIn} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-8 px-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {autoLoginAttempted ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Account Activated!
              </h1>
              <p className="text-gray-600">
                Your account has been successfully activated and you're now signed in. Redirecting to the homepage...
              </p>
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Account Activated!
              </h1>
              <p className="text-gray-600">
                Your account has been successfully activated. You can now sign in to access Writory.
              </p>
              <div className="space-y-3">
                <Button onClick={handleManualSignIn} className="w-full">
                  Continue to Sign In
                </Button>
                <Button onClick={handleGoToHome} variant="outline" className="w-full">
                  Go to Home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
