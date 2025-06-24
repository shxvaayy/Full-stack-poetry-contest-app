import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbUser: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  dbUser: null,
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

  //useEffect(() => {
    // Check for demo mode (when Firebase keys are not available)
    //const demoMode = !import.meta.env.VITE_FIREBASE_API_KEY;
    
    
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Create/get user in database
          const response = await apiRequest("POST", "/api/users", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            phone: firebaseUser.phoneNumber,
          });
          const userData = await response.json();
          setDbUser(userData);
        } catch (error) {
          console.error("Failed to sync user:", error);
        }
      } else {
        setDbUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, dbUser }}>
      {children}
    </AuthContext.Provider>
  );
};
