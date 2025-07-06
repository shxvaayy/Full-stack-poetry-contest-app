
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function EmailVerifiedPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsVerified(user.emailVerified);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleContinue = () => {
    setLocation("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-8 px-6 text-center">
          {isVerified ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Email Verified!
              </h1>
              <p className="text-gray-600">
                Your email has been successfully verified. You can now log in to your account.
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continue to Login
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Verification Pending
              </h1>
              <p className="text-gray-600">
                Your email verification is still pending. Please check your email and click the verification link.
              </p>
              <Button onClick={handleContinue} variant="outline" className="w-full">
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
