import { useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth";
import { auth } from "@/firebase"; // Import Firebase auth

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Check if user signed up with email but hasn't verified
  if (user.providerData.some(provider => provider.providerId === 'password') && !user.emailVerified) {
    // Sign out unverified user
    auth.signOut();
    return <AuthPage />;
  }

  return <>{children}</>;
}