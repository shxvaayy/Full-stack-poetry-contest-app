import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "HOME", href: "/" },
    { name: "SUBMIT POEM", href: "/submit" },
    { name: "RESULTS", href: "/winning-poems" },
    { name: "PAST WINNERS", href: "/past-winners" },
    { name: "ABOUT US", href: "/about" },
    { name: "CONTACT US", href: "/contact" },
  ];

  const handleLogout = async () => {
    console.log("Header logout clicked");
    await logout();
  };

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center">
            <div className="w-12 h-12 mr-4">
              <img 
                src={logoImage} 
                alt="WRITORY Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">WRITORY POETRY CONTEST</h1>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`hover:text-gray-200 transition-colors ${
                  location === item.href ? "border-b-2 border-white" : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <div className="flex items-center space-x-3">
                <Link href="/profile">
                  <button className="flex items-center space-x-2 bg-green-700 rounded-lg px-3 py-2 hover:bg-green-600 transition-colors">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <User className="text-green-600" size={16} />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-white border-white hover:bg-white hover:text-primary"
                >
                  Logout
                </Button>
              </div>
            )}
          </nav>

          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-primary border-t border-green-600">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-white hover:bg-green-700 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <div className="px-3 py-2 space-y-2">
                <Link href="/profile">
                  <button 
                    className="flex items-center space-x-2 bg-green-700 rounded-lg px-3 py-2 w-full hover:bg-green-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <User className="text-green-600" size={16} />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                </Link>
                <Button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-white border-white hover:bg-white hover:text-primary"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}