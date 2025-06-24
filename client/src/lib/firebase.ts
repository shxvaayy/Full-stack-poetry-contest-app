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
  ConfirmationResult
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// --- GOOGLE AUTH ---
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// --- EMAIL AUTH ---
export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, password, password);
};

// --- LOGOUT ---
export const logout = async () => {
  try {
    console.log("Firebase logout starting...");
    localStorage.removeItem('demo-session');
    await signOut(auth);
    console.log("Firebase logout successful");
  } catch (error) {
    console.error("Firebase logout error:", error);
    localStorage.removeItem('demo-session');
    throw error;
  }
};

// --- AUTH STATE LISTENER ---
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// --- REDIRECT HANDLER ---
export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

// --- PHONE AUTH SETUP ---
export const setUpRecaptcha = (containerId: string): RecaptchaVerifier => {
  const verifier = new RecaptchaVerifier(containerId, {
    size: "invisible", // change to 'normal' if you want the visible box
    callback: (response: any) => {
      console.log("reCAPTCHA solved", response);
    },
    'expired-callback': () => {
      console.warn("reCAPTCHA expired");
    }
  }, auth);
  verifier.render();
  return verifier;
};

export const signInWithPhone = (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};
