import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange, logout as firebaseLogout, handleRedirectResult } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbUser: any;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  dbUser: null,
  logout: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      console.log("Starting logout process...");

      // Clear demo session
      localStorage.removeItem('demo-session');

      // Clear states
      setUser(null);
      setDbUser(null);

      // Firebase logout (if not in demo mode)
      const demoMode = !import.meta.env.VITE_FIREBASE_API_KEY;
      if (!demoMode) {
        await firebaseLogout();
      }

      console.log("Logout completed, redirecting...");

      // Force navigation to home/login
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear anyway
      localStorage.removeItem('demo-session');
      setUser(null);
      setDbUser(null);
      window.location.href = '/';
    }
  };

  useEffect(() => {
    console.log("AuthProvider useEffect running...");

    // Check for demo mode (when Firebase keys are not available)
    const demoMode = !import.meta.env.VITE_FIREBASE_API_KEY;

    if (demoMode) {
      console.log("Demo mode detected");

      // Create a demo user for testing
      const demoUser = {
        uid: 'demo-user-123',
        email: 'demo@writory.com',
        displayName: 'Demo User'
      };

      // Check if we have a demo session
      const hasSession = localStorage.getItem('demo-session');
      console.log("Demo session exists:", hasSession);

      if (hasSession) {
        setUser(demoUser as any);
        setDbUser({
          id: 1,
          email: demoUser.email,
          name: demoUser.displayName,
          uid: demoUser.uid,
          phone: '',
          createdAt: new Date()
        });
      }
      setLoading(false);
      return;
    }

    console.log("Firebase mode, setting up auth listener...");

    // Handle redirect result first (in case user was redirected back)
    handleRedirectResult()
      .then((result) => {
        if (result) {
          console.log("Redirect result found:", result.user);
          // The auth state change listener will handle the user
        }
      })
      .catch((error) => {
        console.error("Redirect result error:", error);
      });

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log("Firebase auth state changed:", firebaseUser);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // For phone users, get email from localStorage if it was collected
          let userEmail = firebaseUser.email;
          if (!userEmail && firebaseUser.phoneNumber) {
            userEmail = localStorage.getItem(`phone_user_email_${firebaseUser.uid}`);
          }

          // Create/get user in database
          const response = await apiRequest("POST", "/api/users", {
            uid: firebaseUser.uid,
            email: userEmail,
            name: firebaseUser.displayName || null, // Will be null for phone users
            phone: firebaseUser.phoneNumber,
          });

          if (response.ok) {
            const userData = await response.json();
            setDbUser(userData);
          } else {
            // If API fails, create a local user object
            setDbUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              phone: firebaseUser.phoneNumber,
            });
          }
        } catch (error) {
          console.error("Failed to sync user:", error);
          // If API fails, create a local user object
          setDbUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            phone: firebaseUser.phoneNumber,
          });
        }
      } else {
        setDbUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, dbUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};