
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getProfilePhotoURL } from "@/lib/firebase";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadProfilePicture();
    }
  }, [user]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('Header: Profile update event received');
      if (user?.uid) {
        // Small delay to ensure Firebase has processed the update
        setTimeout(() => {
          loadProfilePicture();
        }, 1000);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user]);

  const loadProfilePicture = async () => {
    if (!user?.uid) return;

    try {
      // Try to get from Firebase Auth first
      if (user.photoURL) {
        setProfilePictureUrl(user.photoURL);
        return;
      }

      // Try to get from Firebase Storage
      const url = await getProfilePhotoURL(user.uid);
      if (url) {
        setProfilePictureUrl(url);
      }
    } catch (error) {
      console.log('Header: No profile picture found in Firebase Storage');
      setProfilePictureUrl(null);
    }
  };

  // Check if user is admin
  const isAdmin = user?.email === 'shivaaymehra2@gmail.com' || user?.email === 'shiningbhavya.seth@gmail.com';

  const navigation = [
    { name: "HOME", href: "/" },
    { name: "SUBMIT POEM", href: "/submit" },
    { name: "RESULTS", href: "/winning-poems" },
    { name: "PAST WINNERS", href: "/past-winners" },
    { name: "ABOUT US", href: "/about" },
    { name: "CONTACT US", href: "/contact" },
    ...(isAdmin ? [{ name: "ADMIN UPLOAD", href: "/admin-upload" }] : []),
  ];

  const handleLogout = async () => {
    console.log("Header logout clicked");
    await logout();
  };

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center py-2 sm:py-3 lg:py-4">
          {/* Logo Section - Left */}
          <Link href="/" className="flex items-center flex-shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mr-2 sm:mr-3 lg:mr-4 flex-shrink-0">
              <img 
                src={logoImage} 
                alt="WRITORY Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            {/* Title - responsive sizing */}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold whitespace-nowrap truncate">
                WRITORY POETRY CONTEST
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden xl:flex items-center flex-1 justify-center px-4 max-w-4xl">
            <div className="flex items-center space-x-4 2xl:space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`hover:text-gray-200 transition-colors whitespace-nowrap font-medium text-xs 2xl:text-sm px-1 2xl:px-2 py-1 ${
                    location === item.href ? "border-b-2 border-white pb-1" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          {/* User Section - Right */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            {user ? (
              <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
                {/* User Profile Button */}
                <Link href="/profile">
                  <button className="flex items-center space-x-2 bg-green-700 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 hover:bg-green-600 transition-colors">
                    {profilePictureUrl ? (
                      <img 
                        src={`${profilePictureUrl}?v=${Date.now()}`} 
                        alt="Profile" 
                        className="w-6 h-6 lg:w-7 lg:h-7 rounded-full object-cover"
                        onError={(e) => {
                          console.log('Header: Profile picture failed to load:', profilePictureUrl);
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-6 h-6 lg:w-7 lg:h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ display: profilePictureUrl ? 'none' : 'flex' }}
                    >
                      <User className="text-green-600" size={14} />
                    </div>
                    <span className="text-white text-xs lg:text-sm font-medium max-w-20 lg:max-w-24 truncate">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                </Link>
                {/* Logout Button */}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-white border-white px-2 lg:px-3 py-1.5 lg:py-2 bg-transparent hover:bg-white hover:text-primary focus:bg-white focus:text-primary text-xs lg:text-sm"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center">
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-white hover:bg-white hover:text-primary px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="xl:hidden text-white p-1.5 sm:p-2 hover:bg-green-700 rounded-md transition-colors flex-shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-primary border-t border-green-600">
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

            {/* Mobile User Section */}
            {user ? (
              <div className="px-3 py-2 space-y-3 border-t border-green-600 mt-3 pt-4">
                <Link href="/profile">
                  <button 
                    className="flex items-center space-x-2 bg-green-700 rounded-lg px-3 py-2 w-full hover:bg-green-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {profilePictureUrl ? (
                      <img
                        src={`${profilePictureUrl}?v=${Date.now()}`}
                        alt="Profile"
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                        <User className="text-green-600" size={14} />
                      </div>
                    )}
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
                  className="w-full text-white border-white bg-transparent hover:bg-white hover:text-primary focus:bg-white focus:text-primary"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="px-3 py-2 border-t border-green-600 mt-3 pt-4">
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-white border-white hover:bg-white hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
