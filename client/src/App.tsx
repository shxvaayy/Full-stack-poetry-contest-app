import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import AuthGuard from "@/components/auth/auth-guard";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HomePage from "@/pages/home";
import SubmitPage from "@/pages/submit";
import WinningPoemsPage from "@/pages/winning-poems";
import PastWinnersPage from "@/pages/past-winners";
import WritoryWallPage from "@/pages/writory-wall";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import UserProfilePage from "@/pages/user-profile";
import AdminUploadPage from "@/pages/admin-upload";
import AdminSettingsPage from "@/pages/admin-settings";
import AdminWallModerationPage from "@/pages/admin-wall-moderation";
import NotFoundPage from "./pages/not-found";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import EmailVerifiedPage from "@/pages/email-verified";
import EmailVerificationHandler from "@/pages/email-verification-handler";
import PasswordResetHandler from "@/pages/password-reset-handler";
import FirebaseActionHandler from "@/pages/__/auth/action";
import { SidebarProvider } from "@/components/ui/sidebar";

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Switch>
          {/* Public routes - accessible without authentication */}
          <Route path="/" component={HomePage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/email-verified" component={EmailVerifiedPage} />
          <Route path="/email-verification-handler" component={EmailVerificationHandler} />
          <Route path="/password-reset-handler" component={PasswordResetHandler} />
          <Route path="/__/auth/action" component={FirebaseActionHandler} />
          <Route path="/writory-wall" component={WritoryWallPage} />
          <Route path="/winning-poems" component={WinningPoemsPage} />
          <Route path="/past-winners" component={PastWinnersPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/profile" component={UserProfilePage} />
          <Route path="/admin-upload" component={AdminUploadPage} />
          <Route path="/admin-settings" component={AdminSettingsPage} />
          <Route path="/admin-wall-moderation" component={AdminWallModerationPage} />
          {/* Protected route - only /submit requires authentication */}
          <Route path="/submit">
            <AuthGuard>
              <SubmitPage />
            </AuthGuard>
          </Route>
          <Route path="/not-found" component={NotFoundPage} />
          <Route path="*">
            <NotFoundPage />
          </Route>
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;