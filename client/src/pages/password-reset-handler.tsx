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
    // Extra debug logging
    console.log('Password Reset Handler: full URL:', window.location.href);
    const urlParams = new URLSearchParams(window.location.search);
    let mode = urlParams.get('mode');
    let code = urlParams.get('oobCode');

    // Fallback: try hash params
    if (!mode || !code) {
      const hash = window.location.hash;
      if (hash.startsWith('#')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        mode = mode || hashParams.get('mode');
        code = code || hashParams.get('oobCode');
      }
    }
    // Fallback: regex
    if (!mode || !code) {
      const modeRegex = /[?&#]mode=([^&\s]+)/i;
      const codeRegex = /[?&#]oobCode=([^&\s]+)/i;
      const modeMatch = window.location.href.match(modeRegex);
      const codeMatch = window.location.href.match(codeRegex);
      if (modeMatch) mode = mode || decodeURIComponent(modeMatch[1]);
      if (codeMatch) code = code || decodeURIComponent(codeMatch[1]);
    }
    // Fallback: __/auth/action?mode=...&oobCode=...
    if (!mode || !code) {
      const actionMatch = window.location.href.match(/__\/auth\/action\?(.+)/);
      if (actionMatch) {
        const actionParams = new URLSearchParams(actionMatch[1]);
        mode = mode || actionParams.get('mode');
        code = code || actionParams.get('oobCode');
      }
    }
    console.log('Password Reset Handler: mode:', mode, 'oobCode:', code);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Processing...</p>
        </div>
      </div>
    );
  }

  if (isValidCode) {
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

  return null;
} 