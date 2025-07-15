import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { applyActionCode, checkActionCode, signInWithEmailAndPassword, signOut, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import logoImage from "@/assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function FirebaseActionHandler() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Parse all possible Firebase link formats
  useEffect(() => {
    let foundMode = null;
    let foundCode = null;
    const fullUrl = window.location.href;
    // 1. Query params
    const urlParams = new URLSearchParams(window.location.search);
    foundMode = urlParams.get('mode');
    foundCode = urlParams.get('oobCode');
    // 2. Hash params
    if (!foundMode || !foundCode) {
      const hash = window.location.hash;
      if (hash.startsWith('#')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        foundMode = foundMode || hashParams.get('mode');
        foundCode = foundCode || hashParams.get('oobCode');
      }
    }
    // 3. Regex extraction
    if (!foundMode || !foundCode) {
      const modeRegex = /[?&#]mode=([^&\s]+)/i;
      const codeRegex = /[?&#]oobCode=([^&\s]+)/i;
      const modeMatch = fullUrl.match(modeRegex);
      const codeMatch = fullUrl.match(codeRegex);
      if (modeMatch) foundMode = foundMode || decodeURIComponent(modeMatch[1]);
      if (codeMatch) foundCode = foundCode || decodeURIComponent(codeMatch[1]);
    }
    // 4. __/auth/action? fallback
    if (!foundMode || !foundCode) {
      const actionMatch = fullUrl.match(/__\/auth\/action\?(.+)/);
      if (actionMatch) {
        const actionParams = new URLSearchParams(actionMatch[1]);
        foundMode = foundMode || actionParams.get('mode');
        foundCode = foundCode || actionParams.get('oobCode');
      }
    }
    setMode(foundMode);
    setOobCode(foundCode);
  }, []);

  // Handle action after parsing
  useEffect(() => {
    if (!mode || !oobCode) {
      setError(`Invalid link. Missing required parameters: ${!mode ? 'mode' : ''} ${!oobCode ? 'oobCode' : ''}`);
      setLoading(false);
      return;
    }
    if (mode === 'verifyEmail') {
      // Email verification flow
      (async () => {
        try {
          await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          setVerified(true);
          // Auto-login if possible
          const storedEmail = localStorage.getItem('signup_email');
          const storedPassword = localStorage.getItem('signup_password');
          if (storedEmail && storedPassword) {
            try {
              await signOut(auth);
              await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
              localStorage.removeItem('signup_email');
              localStorage.removeItem('signup_password');
              localStorage.removeItem('pending_verification_uid');
              setAutoLoginAttempted(true);
              toast({ title: "Account Activated!", description: "Your account has been verified and you're now signed in. Welcome to Writory!" });
              setTimeout(() => { window.location.href = "/"; }, 1000);
            } catch (loginError: any) {
              localStorage.removeItem('signup_email');
              localStorage.removeItem('signup_password');
              localStorage.removeItem('pending_verification_uid');
              toast({ title: "Account Activated!", description: "Your account has been verified. Please sign in to continue." });
              setTimeout(() => { window.location.href = "/auth?verified=true"; }, 2000);
            }
          } else {
            toast({ title: "Email Verified!", description: "Your email has been verified. Please sign in to continue." });
            setAutoLoginAttempted(false);
            setTimeout(() => { window.location.href = "/auth?verified=true"; }, 2000);
          }
        } catch (error: any) {
          setError(error.message || 'Failed to verify email');
          localStorage.removeItem('signup_email');
          localStorage.removeItem('signup_password');
          localStorage.removeItem('pending_verification_uid');
          toast({ title: "Verification Failed", description: error.message || 'Invalid or expired verification link', variant: "destructive" });
        } finally {
          setLoading(false);
        }
      })();
    } else if (mode === 'resetPassword') {
      // Password reset flow
      (async () => {
        setIsVerifying(true);
        try {
          const userEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(userEmail);
          setIsValidCode(true);
          toast({ title: "Valid Reset Link", description: "Please enter your new password below." });
        } catch (error: any) {
          setIsValidCode(false);
          setError(error.message || 'Invalid or expired reset link');
          toast({ title: "Invalid or Expired Link", description: error.message || 'This password reset link is invalid or has expired. Please request a new one.', variant: "destructive" });
          setTimeout(() => setLocation('/auth'), 3000);
        } finally {
          setIsVerifying(false);
          setLoading(false);
        }
      })();
    } else {
      setError(`Unknown action mode: ${mode}`);
      setLoading(false);
    }
  }, [mode, oobCode, toast, setLocation]);

  // Password reset form submit
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Invalid Password", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      toast({ title: "Password Reset Successful!", description: "Your password has been updated. You can now sign in with your new password." });
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch (error: any) {
      let errorMessage = "Failed to reset password. Please try again.";
      if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = "Reset link has expired. Please request a new one.";
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = "Invalid reset link. Please request a new one.";
      }
      toast({ title: "Reset Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Processing...</p>
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
              {mode === 'resetPassword' ? 'Password Reset Failed' : 'Verification Failed'}
            </h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <Button onClick={() => {
              // Clear any signup-related localStorage
              localStorage.removeItem('signup_email');
              localStorage.removeItem('signup_password');
              localStorage.removeItem('pending_verification_uid');
              setLocation('/auth');
            }} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset UI
  if (mode === 'resetPassword' && isValidCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 mb-4">
              <img src={logoImage} alt="Writory Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">WRITORY</h1>
            <p className="text-gray-600 text-sm mt-1">WRITE YOUR OWN VICTORY</p>
          </div>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardContent className="py-8 px-4 sm:px-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                Reset Your Password
              </h2>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Resetting password for: <strong>{email}</strong>
                </p>
              </div>
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    minLength={6}
                    className="mt-1 border rounded px-3 py-2 w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={6}
                    className="mt-1 border rounded px-3 py-2 w-full"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Email verification UI
  if (mode === 'verifyEmail' && verified) {
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
                  Email Verified!
                </h1>
                <p className="text-gray-600">
                  Your email has been successfully verified. Please sign in with your credentials to access Writory.
                </p>
                <div className="space-y-3">
                  <Button onClick={() => setLocation('/auth')} className="w-full">
                    Continue to Sign In
                  </Button>
                  <Button onClick={() => setLocation('/')} variant="outline" className="w-full">
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

  return null;
} 