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
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import UserProfilePage from "@/pages/user-profile";
import AdminUploadPage from "@/pages/admin-upload";
import NotFoundPage from "@/pages/not-found";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";

function AppContent() {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/submit" component={SubmitPage} />
            <Route path="/winning-poems" component={WinningPoemsPage} />
            <Route path="/past-winners" component={PastWinnersPage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/profile" component={UserProfilePage} />
            <Route path="/admin-upload" component={AdminUploadPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route component={NotFoundPage} />
          </Switch>
        </main>
        <Footer />
      </div>
    </AuthGuard>
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