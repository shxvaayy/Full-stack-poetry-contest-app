
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function PasswordResetHandler() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [oobCode, setOobCode] = useState("");
  const [isValidCode, setIsValidCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const code = urlParams.get('oobCode');

    if (mode === 'resetPassword' && code) {
      setOobCode(code);
      verifyCode(code);
    } else {
      toast({
        title: "Invalid Link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation('/auth'), 2000);
    }
  }, []);

  const verifyCode = async (code: string) => {
    try {
      setIsVerifying(true);
      const userEmail = await verifyPasswordResetCode(auth, code);
      setEmail(userEmail);
      setIsValidCode(true);
      toast({
        title: "Valid Reset Link",
        description: "Please enter your new password below.",
      });
    } catch (error: any) {
      console.error('Code verification error:', error);
      setIsValidCode(false);
      toast({
        title: "Invalid or Expired Link",
        description: "This password reset link is invalid or has expired. Please request a new one.",
        variant: "destructive",
      });
      setTimeout(() => setLocation('/auth'), 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      
      toast({
        title: "Password Reset Successful!",
        description: "Your password has been updated. You can now sign in with your new password.",
      });

      // Redirect to home page after successful password reset
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = "Failed to reset password. Please try again.";
      if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = "Reset link has expired. Please request a new one.";
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = "Invalid reset link. Please request a new one.";
      }

      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
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
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardContent className="py-8 px-4 sm:px-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verifying Reset Link
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your password reset link...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isValidCode) {
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
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardContent className="py-8 px-4 sm:px-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Invalid Reset Link
              </h2>
              <p className="text-gray-600 mb-4">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button onClick={() => setLocation('/auth')}>
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setLocation('/auth')}
                className="text-sm"
              >
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
