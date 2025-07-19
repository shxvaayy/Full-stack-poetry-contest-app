
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
// Removed Firebase import - now using Cloudinary URLs from database
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout, dbUser } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  // For EXPLORE Dropdown
  const [exploreOpen, setExploreOpen] = useState(false);
  // For Profile/Admin Dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  // For Notifications Dropdown
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadProfilePicture = async () => {
    if (user?.uid) {
      try {
        const response = await fetch(`/api/users/${user.uid}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData.profilePictureUrl) {
            const cacheBustedUrl = `${userData.profilePictureUrl}?v=${Date.now()}`;
            setProfilePictureUrl(cacheBustedUrl);
            console.log('Header: Loaded Cloudinary profile picture:', cacheBustedUrl);
          } else {
            setProfilePictureUrl(null);
          }
        } else {
          setProfilePictureUrl(null);
        }
      } catch (error) {
        console.log('Error loading profile picture from database:', error);
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
      console.log('Header: Profile update event received:', event.detail);
      if (event.detail) {
        const updatedUser = event.detail;
        setDisplayName(updatedUser.name || user?.displayName || user?.email?.split('@')[0] || 'User');

        if (updatedUser.profilePictureUrl) {
          const cacheBustedUrl = `${updatedUser.profilePictureUrl}?header_v=${Date.now()}`;
          setProfilePictureUrl(cacheBustedUrl);
          console.log('Header: Cloudinary profile picture updated from profile event:', cacheBustedUrl);

          // Double-ensure the update by setting again after a short delay
          setTimeout(() => {
            setProfilePictureUrl(`${updatedUser.profilePictureUrl}?delayed_v=${Date.now()}`);
          }, 50);
        } else if (updatedUser.profilePictureUrl === null) {
          setProfilePictureUrl(null);
          console.log('Header: Profile picture removed');
        }
      }

      // Also reload from database as fallback
      setTimeout(() => {
        if (user?.uid) {
          loadProfilePicture();
        }
      }, 300);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Listen for profile picture changes
  useEffect(() => {
    const handleProfilePictureChange = () => {
      console.log('Header: Profile picture change detected, reloading');
      if (user?.uid) {
        setTimeout(loadProfilePicture, 500); // Small delay to ensure upload is complete
      }
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureChange);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureChange);
    };
  }, [user]);

  // Load notifications
  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    }
  }, [user?.uid]);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'user-uid': user?.uid || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Check if user is admin
  const isAdmin = user?.email === 'shivaaymehra2@gmail.com' || user?.email === 'bhavyaseth2005@gmail.com';

  // Update navigation array: remove ABOUT US, CONTACT US, PAST WINNERS
  const navigation = [
    { name: "HOME", href: "/" },
    { name: "SUBMIT POEM", href: "/submit" },
    { name: "WRITORY WALL", href: "/writory-wall" },
    { name: "RESULTS", href: "/winning-poems" },
    // Explore dropdown will be rendered separately
  ];

  const handleLogout = async () => {
    console.log("Header logout clicked");
    await logout();
  };

  return (
    <header className="bg-black text-white shadow-lg relative">
      <div className="max-w-full mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between py-4 relative">
          {/* Logo Section - Extreme Left */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 flex-shrink-0">
              <img 
                src={logoImage} 
                alt="WRITORY Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-lg font-bold whitespace-nowrap">
              WRITORY POETRY CONTEST
            </h1>
          </Link>

          {/* Desktop Navigation - Perfectly Centered */}
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`hover:bg-gray-800 hover:text-white rounded-xl transition-colors whitespace-nowrap font-medium text-sm px-4 py-2 ${
                    location === item.href ? "border-b-2 border-white pb-1" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {/* Explore Dropdown */}
              <DropdownMenu open={exploreOpen} onOpenChange={setExploreOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none flex items-center gap-2"
                    onClick={() => setExploreOpen((v) => !v)}
                  >
                    EXPLORE
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-gray-900 border-none shadow-xl rounded-xl p-2 min-w-[180px]"
                >
                  <DropdownMenuItem 
                    className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                    onClick={() => {
                      setExploreOpen(false);
                      window.location.href = '/about';
                    }}
                  >
                    About Us
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                    onClick={() => {
                      setExploreOpen(false);
                      window.location.href = '/contact';
                    }}
                  >
                    Contact Us
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                    onClick={() => {
                      setExploreOpen(false);
                      window.location.href = '/past-winners';
                    }}
                  >
                    Past Winners
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>

          {/* User Section - Extreme Right */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {user ? (
              <div className="hidden lg:flex items-center space-x-3">
                {/* Notification Icon */}
                <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none"
                      onClick={() => setNotificationsOpen((v) => !v)}
                    >
                      <Bell className="w-5 h-5 text-white" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="bg-gray-900 border-none shadow-xl rounded-xl p-2 min-w-[320px] max-h-[400px] overflow-y-auto"
                  >
                    <div className="px-3 py-2 border-b border-gray-700">
                      <h3 className="text-white font-semibold">Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-gray-400 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <DropdownMenuItem
                          key={index}
                          className="text-white rounded-lg px-3 py-3 hover:bg-yellow-400 hover:text-black transition-colors focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                        >
                          <div className="w-full">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs opacity-80 mt-1">{notification.message}</p>
                            <p className="text-xs opacity-60 mt-1">{new Date(notification.created_at).toLocaleDateString()}</p>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors focus:outline-none"
                      onClick={() => setProfileOpen((v) => !v)}
                    >
                      {profilePictureUrl ? (
                        <img
                          src={profilePictureUrl}
                          alt="Profile"
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            setProfilePictureUrl(null);
                          }}
                          key={`header-profile-${profilePictureUrl}`}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="text-black" size={14} />
                        </div>
                      )}
                      <span className="text-white text-sm font-medium">
                        {displayName || dbUser?.name || user.displayName || user.email?.split('@')[0] || 'User'}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="bg-gray-900 border-none shadow-xl rounded-xl p-2 min-w-[180px]"
                  >
                    <DropdownMenuItem 
                      className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                      onClick={() => {
                        setProfileOpen(false);
                        window.location.href = '/profile';
                      }}
                    >
                      Profile
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400">
                          Admin
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-gray-900 border-none shadow-xl rounded-xl p-2 min-w-[200px]">
                          <DropdownMenuItem 
                            className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                            onClick={() => setProfileOpen(false)}
                          >
                            <Link href="/admin-settings" className="w-full h-full block">Admin Settings</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                            onClick={() => {
                              setProfileOpen(false);
                              window.location.href = '/admin-upload';
                            }}
                          >
                            Admin Upload
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                            onClick={() => {
                              setProfileOpen(false);
                              window.location.href = '/admin-wall-moderation';
                            }}
                          >
                            Wall Post Moderation
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    <DropdownMenuSeparator className="my-2 bg-gray-700" />
                    <DropdownMenuItem 
                      onClick={() => {
                        handleLogout();
                        setProfileOpen(false);
                      }} 
                      className="text-base font-semibold text-white rounded-lg px-4 py-3 hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2 focus:bg-yellow-400 focus:text-black border-l-4 border-transparent hover:border-yellow-400 focus:border-yellow-400"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden lg:flex items-center">
                <Link href="/auth">
                  <Button
                    className="bg-black text-yellow-400 border-none px-4 py-2 text-sm font-bold rounded shadow hover:bg-gray-900 hover:text-yellow-300 focus:bg-gray-900 focus:text-yellow-300 transition-colors"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="lg:hidden text-white p-2 hover:bg-gray-800 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-black border-t border-gray-600">
          <div className="px-4 pt-4 pb-6 space-y-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium ${
                  location === item.href ? "bg-gray-800" : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile Explore Section */}
            <div className="px-4 py-3 border-t border-gray-600 mt-4 pt-6">
              <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">EXPLORE</h3>
              <div className="space-y-2">
                <Link
                  href="/about"
                  className="block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Us
                </Link>
                <Link
                  href="/contact"
                  className="block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact Us
                </Link>
                <Link
                  href="/past-winners"
                  className="block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Past Winners
                </Link>
              </div>
            </div>

            {/* Mobile User Section */}
            {user ? (
              <div className="px-4 py-3 space-y-4 border-t border-gray-600 mt-4 pt-6">
                <Link href="/profile">
                  <button 
                    className="flex items-center space-x-3 bg-gray-800 rounded-lg px-4 py-3 w-full hover:bg-gray-700 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {profilePictureUrl ? (
                      <img
                        src={profilePictureUrl}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                        onError={() => setProfilePictureUrl(null)}
                        key={`mobile-profile-${profilePictureUrl}`}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <User className="text-black" size={16} />
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">
                      {displayName || dbUser?.name || user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                  </button>
                </Link>

                {/* Mobile Admin Section */}
                {isAdmin && (
                  <div className="space-y-2">
                    <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">ADMIN</h3>
                    <Link
                      href="/admin-settings"
                      className="block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Settings
                    </Link>
                    <Link
                      href="/admin-upload"
                      className="block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin Upload
                    </Link>
                    <Link
                      href="/admin-wall-moderation"
                      className="block px-4 py-3 text-white hover:bg-gray-800 rounded-md transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Wall Post Moderation
                    </Link>
                  </div>
                )}

                <Button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-white border-white bg-transparent hover:bg-white hover:text-black focus:bg-white focus:text-black font-medium"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-600 mt-4 pt-6">
                <Link href="/auth">
                  <Button
                    className="w-full bg-black text-yellow-400 border-none px-4 py-2 text-sm font-bold rounded shadow hover:bg-gray-900 hover:text-yellow-300 focus:bg-gray-900 focus:text-yellow-300 transition-colors"
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
