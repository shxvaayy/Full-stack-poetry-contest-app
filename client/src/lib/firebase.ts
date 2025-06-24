
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  getRedirectResult,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  linkWithCredential,
  PhoneAuthProvider,
  signInWithRedirect
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "demo-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "demo-measurement-id"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// --- GOOGLE AUTH ---
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const signInWithGoogleRedirect = () => {
  return signInWithRedirect(auth, googleProvider);
};

// --- EMAIL AUTH ---
export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// --- PHONE AUTH SETUP ---
export const setUpRecaptcha = (containerId: string): RecaptchaVerifier => {
  // Clear any existing verifier
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }
  
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: (response: any) => {
      console.log("✅ reCAPTCHA solved", response);
    },
    'expired-callback': () => {
      console.warn("⚠️ reCAPTCHA expired");
    }
  });
  
  window.recaptchaVerifier = verifier;
  return verifier;
};

export const signInWithPhone = (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

export const linkPhoneToCurrentUser = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  if (!auth.currentUser) {
    throw new Error("No user is currently signed in");
  }
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

export const verifyPhoneAndLink = async (confirmationResult: ConfirmationResult, otp: string) => {
  if (!auth.currentUser) {
    throw new Error("No user is currently signed in");
  }
  
  const credential = PhoneAuthProvider.credential(
    confirmationResult.verificationId,
    otp
  );
  
  return linkWithCredential(auth.currentUser, credential);
};

// --- AUTH STATE MANAGEMENT ---
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const logout = () => {
  return signOut(auth);
};

export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

// Declare global recaptcha verifier
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}
