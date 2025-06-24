import { useState } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { app } from "@/lib/firebase";

const auth = getAuth(app);

export default function PhoneLinkAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      setGoogleUser(result.user);
      console.log("✅ Google Sign-In Done");
    } catch (err) {
      console.error("❌ Google Sign-In Error", err);
    }
  };

  const sendOtp = async () => {
    if (!googleUser) return alert("Please sign in with Google first");

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        { size: "invisible" },
        auth
      );
    }

    try {
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      console.log("✅ OTP Sent");
    } catch (err) {
      console.error("❌ OTP Send Error", err);
    }
  };

  const verifyOtpAndLink = async () => {
    try {
      const result = await confirmationResult.confirm(otp);
      const phoneCredential = PhoneAuthProvider.credential(result.verificationId, otp);
      await linkWithCredential(googleUser, phoneCredential);
      alert("✅ Phone linked successfully!");
    } catch (err) {
      console.error("❌ OTP Verification Error", err);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-center">Link Phone After Google Sign-In</h2>

      <button
        onClick={handleGoogleSignIn}
        className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
      >
        Continue with Google
      </button>

      <input
        type="tel"
        placeholder="+91XXXXXXXXXX"
        className="w-full border px-4 py-2 rounded"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        onClick={sendOtp}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Send OTP
      </button>

      <input
        type="text"
        placeholder="Enter OTP"
        className="w-full border px-4 py-2 rounded"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <button
        onClick={verifyOtpAndLink}
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
      >
        Verify & Link
      </button>

      <div id="recaptcha-container"></div>
    </div>
  );
}
