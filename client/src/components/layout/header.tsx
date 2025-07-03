
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

  // Check if user is admin
  const isAdmin = user?.email === 'shivaaymehra2@gmail.com';

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
