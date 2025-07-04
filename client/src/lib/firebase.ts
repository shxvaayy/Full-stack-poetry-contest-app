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
  PhoneAuthProvider,
  linkWithCredential,
  updateProfile
} from "firebase/auth";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "demo-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "demo-measurement-id"
};

// Validate Firebase configuration for storage operations
const validateFirebaseConfig = () => {
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID === "demo-project") {
    console.warn('Firebase Storage: Using demo configuration. Set VITE_FIREBASE_PROJECT_ID for production.');
    return false;
  }
  return true;
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Profile photo upload function
export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  try {
    // Check Firebase configuration
    if (!validateFirebaseConfig()) {
      throw new Error('Firebase Storage not properly configured');
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    const storageRef = ref(storage, `Profile-photo/${userId}.jpg`);
    
    // Upload file
    await uploadBytes(storageRef, file);
    
    // Get download URL with cache buster
    const downloadURL = await getDownloadURL(storageRef);
    return `${downloadURL}?v=${Date.now()}`;
  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    throw error;
  }
};

// Get current profile photo URL
export const getProfilePhotoURL = async (userId: string): Promise<string | null> => {
  try {
    const storageRef = ref(storage, `Profile-photo/${userId}.jpg`);
    const downloadURL = await getDownloadURL(storageRef);
    return `${downloadURL}?v=${Date.now()}`;
  } catch (error) {
    console.log('No profile photo found:', error);
    return null;
  }
};

// Delete profile photo
export const deleteProfilePhoto = async (userId: string): Promise<void> => {
  const storageRef = ref(storage, `Profile-photo/${userId}.jpg`);
  await deleteObject(storageRef);
};

// Update user profile with photo URL
export const updateUserProfile = async (photoURL: string): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, { photoURL });
  }
};

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
  return createUserWithEmailAndPassword(auth, email, password);
};

// --- PHONE AUTH ---
export const setUpRecaptcha = (containerId: string): RecaptchaVerifier => {
  // Clear existing verifier if it exists
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }

  // Clear the container
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  // Create new verifier
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired');
    }
  });

  return window.recaptchaVerifier;
};

export const signInWithPhone = (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};

export const linkPhoneToCurrentUser = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};

export const verifyPhoneAndLink = async (confirmationResult: ConfirmationResult, verificationCode: string) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
  return linkWithCredential(user, credential);
};

// --- LOGOUT ---
export const logout = async () => {
  try {
    console.log("Firebase logout starting...");
    localStorage.removeItem('demo-session');

    // Clear reCAPTCHA verifier on logout
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

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

// Declare global recaptcha verifier
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
  }
}