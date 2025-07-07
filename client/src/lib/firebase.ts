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
  updateProfile,
  sendEmailVerification,
  reload,
  applyActionCode,
  checkActionCode,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
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

export const signUpWithEmail = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Store credentials temporarily for auto-login after verification
  localStorage.setItem('signup_email', email);
  localStorage.setItem('signup_password', password);

  // Send email verification with Firebase default action URL for better compatibility
  const actionCodeSettings = {
    url: `${window.location.origin}/__/auth/action`,
    handleCodeInApp: true,
  };

  await sendEmailVerification(userCredential.user, actionCodeSettings);
  return userCredential;
};

// Send email verification
export const sendEmailVerificationToUser = (user: User) => {
  return sendEmailVerification(user);
};

// Check if email is verified
export const checkEmailVerified = async (user: User) => {
  await reload(user);
  return user.emailVerified;
};

// Apply action code for email verification
export const verifyEmailWithCode = (oobCode: string) => {
  return applyActionCode(auth, oobCode);
};

// Check action code validity
export const checkEmailActionCode = (oobCode: string) => {
  return checkActionCode(auth, oobCode);
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

export async function verifyPhoneAndLink(confirmationResult: any, otp: string) {
  try {
    const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
    await linkWithCredential(auth.currentUser!, credential);
    console.log('✅ Phone number linked successfully');
  } catch (error) {
    console.error('❌ Error linking phone number:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string) {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent successfully');
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
}

// --- LOGOUT ---
export const logout = async () => {
  try {
    console.log("Firebase logout starting...");
    localStorage.removeItem('demo-session');

    // Clear pending verification credentials
    localStorage.removeItem('signup_email');
    localStorage.removeItem('signup_password');
    localStorage.removeItem('pending_verification_uid');

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
    localStorage.removeItem('pending_verification_email');
    localStorage.removeItem('pending_verification_password');
    throw error;
  }
};

// --- VERIFICATION CLEANUP ---
export const clearVerificationCredentials = () => {
  localStorage.removeItem('signup_email');
  localStorage.removeItem('signup_password');
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