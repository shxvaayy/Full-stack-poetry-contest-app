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
  const { user, logout, dbUser } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  const loadProfilePicture = async () => {
    if (user?.uid) {
      try {
        const firebasePhotoURL = await getProfilePhotoURL(user.uid);
        if (firebasePhotoURL) {
          const cacheBustedUrl = `${firebasePhotoURL}?v=${Date.now()}`;
          setProfilePictureUrl(cacheBustedUrl);
          console.log('Header: Loaded profile picture:', cacheBustedUrl);
        } else {
          setProfilePictureUrl(null);
        }
      } catch (error) {
        console.log('No Firebase photo found or error loading profile picture');
        setProfilePictureUrl(null);
      }
    }
  };

  // Initialize display name from user data
  useEffect(() => {
    if (user) {
      const initialName = dbUser?.name || user.displayName || user.email?.split('@')[0] || 'User';
      setDisplayName(initialName);
      console.log('Header: Initial display name set:', initialName);
    }
  }, [user, dbUser]);

  // Load profile picture on user change
  useEffect(() => {
    if (user?.uid) {
      loadProfilePicture();
    } else {
      setProfilePictureUrl(null);
      setDisplayName('');
    }
  }, [user?.uid]);

  // Listen for profile updates from user-profile page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Header: Profile updated event received:', event.detail);
      const updatedUser = event.detail;

      // Force update profile picture with cache busting
      if (updatedUser.profilePictureUrl) {
        const newUrl = `${updatedUser.profilePictureUrl}?v=${Date.now()}&updated=${Date.now()}`;
        setProfilePictureUrl(newUrl);
        console.log('Header: Updated profile picture URL:', newUrl);
      } else if (updatedUser.profilePictureUrl === null) {
        // Handle case where profile picture was removed
        setProfilePictureUrl(null);
        console.log('Header: Profile picture removed');
      }

      // Update user name display
      if (updatedUser.name) {
        setDisplayName(updatedUser.name);
        console.log('Header: Updated display name:', updatedUser.name);
      }

      // Force re-render by triggering a state update
      setTimeout(() => {
        loadProfilePicture();
      }, 100);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Listen for Firebase storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('Header: Storage change detected, reloading profile picture');
      if (user?.uid) {
        setTimeout(loadProfilePicture, 500); // Small delay to ensure upload is complete
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom Firebase photo update events
    const handleFirebasePhotoUpdate = () => {
      console.log('Header: Firebase photo update event received');
      if (user?.uid) {
        setTimeout(loadProfilePicture, 1000); // Longer delay for Firebase
      }
    };

    window.addEventListener('firebasePhotoUpdated', handleFirebasePhotoUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('firebasePhotoUpdated', handleFirebasePhotoUpdate);
    };
  }, [user]);

  // Check if user is admin
  const isAdmin = user?.email === 'shivaaymehra2@gmail.com' || user?.email === 'bhavyaseth2005@gmail.com';

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
                  className={`
                    relative whitespace-nowrap font-medium text-xs 2xl:text-sm px-1 2xl:px-2 py-1
                    transition-all duration-200 ease-in-out
                    hover:scale-110 hover:-translate-y-1 hover:shadow-lg hover:bg-white/10
                    focus:scale-110 focus:-translate-y-1 focus:shadow-lg focus:bg-white/10
                    ${location === item.href ? "border-b-2 border-white pb-1" : ""}
                  `}
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
                        src={profilePictureUrl} 
                        alt="Profile" 
                        className="w-6 h-6 lg:w-7 lg:h-7 rounded-full object-cover"
                        onError={(e) => {
                          console.log('Header: Profile picture failed to load:', profilePictureUrl);
                          setProfilePictureUrl(null); // Reset to show fallback
                        }}
                        key={`header-profile-${profilePictureUrl}`} // Force re-render on URL change
                      />
                    ) : (
                      <div className="w-6 h-6 lg:w-7 lg:h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="text-green-600" size={14} />
                      </div>
                    )}
                    <span className="text-white text-xs lg:text-sm font-medium max-w-20 lg:max-w-24 truncate">
                      {displayName || dbUser?.name || user.displayName || user.email?.split('@')[0] || 'User'}
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
                className={`block px-3 py-2 text-white hover:bg-green-700 rounded-md transition-all
                  hover:scale-105 hover:-translate-y-1 hover:shadow-lg focus:scale-105 focus:-translate-y-1 focus:shadow-lg
                  ${location === item.href ? "bg-green-700" : ""}
                `}
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
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-7 h-7 rounded-full object-cover"
                        onError={() => setProfilePictureUrl(null)}
                        key={`mobile-profile-${profilePictureUrl}`}
                      />
                    ) : (
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                        <User className="text-green-600" size={14} />
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">
                      {displayName || dbUser?.name || user.displayName || user.email?.split('@')[0] || 'User'}
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