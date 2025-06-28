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
          {/* Logo Section - Left */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <div className="w-12 h-12 mr-3">
              <img 
                src={logoImage} 
                alt="WRITORY Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            {/* Only show title on non-home pages or when on mobile */}
            {location !== "/" && (
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold whitespace-nowrap">WRITORY POETRY CONTEST</h1>
              </div>
            )}
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden lg:flex items-center flex-1 justify-center">
            <div className="flex items-center space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`hover:text-gray-200 transition-colors whitespace-nowrap font-medium text-sm ${
                    location === item.href ? "border-b-2 border-white pb-1" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          {/* User Section - Right */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {user ? (
              <div className="hidden lg:flex items-center space-x-2">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-white border-white hover:bg-white hover:text-primary order-2"
                >
                  Logout
                </Button>
                <Link href="/profile" className="order-1">
                  <button className="flex items-center space-x-2 bg-green-700 rounded-lg px-3 py-2 hover:bg-green-600 transition-colors">
                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                      <User className="text-green-600" size={14} />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                </Link>
              </div>
            ) : (
              <div className="hidden lg:flex items-center">
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-white hover:bg-white hover:text-primary"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="lg:hidden text-white p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-primary border-t border-green-600">
          <div className="px-3 pt-3 pb-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 text-white hover:bg-green-700 rounded-md transition-colors ${
                  location === item.href ? "bg-green-700" : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <div className="px-3 py-2 space-y-3 border-t border-green-600 mt-3 pt-4">
                <Link href="/profile">
                  <button 
                    className="flex items-center space-x-2 bg-green-700 rounded-lg px-3 py-2 w-full hover:bg-green-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                      <User className="text-green-600" size={14} />
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