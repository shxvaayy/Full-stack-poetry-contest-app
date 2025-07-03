import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Twitter, Facebook, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  const { toast } = useToast();

  const handleNotAvailable = () => {
    toast({
      title: "Not Available Yet!",
      description: "This competition is not available at the moment.",
    });
  };

  return (
    <footer className="text-white py-12" style={{
      background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold mb-4">WRITORY</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Celebrating literary excellence and nurturing emerging voices. Join our community of poets and share your unique stories with the world.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/submit" className="text-gray-300 hover:text-white transition-colors">
                  Submit Your Poem
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/past-winners" className="text-gray-300 hover:text-white transition-colors">
                  Past Winners
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Additional Competitions */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Additional Competitions</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={handleNotAvailable} className="text-gray-300 hover:text-white transition-colors">
                  Regional Languages Competition
                </button>
              </li>
              <li>
                <button onClick={handleNotAvailable} className="text-gray-300 hover:text-white transition-colors">
                  Junior Competition
                </button>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-green-400 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex space-x-4 mb-4 md:mb-0">
            <a href="https://x.com/writoryofficial" className="text-gray-300 hover:text-white transition-colors">
              <Twitter size={20} />
            </a>
            <a href="https://www.facebook.com/share/16hyCrZbE2/" className="text-gray-300 hover:text-white transition-colors">
              <Facebook size={20} />
            </a>
            <a href="https://www.instagram.com/writoryofficial/" className="text-gray-300 hover:text-white transition-colors">
              <Instagram size={20} />
            </a>
            <a href="https://www.linkedin.com/company/writoryofficial/" className="text-gray-300 hover:text-white transition-colors">
              <Linkedin size={20} />
            </a>
          </div>
          <p className="text-gray-300 text-sm">© 2025 WRITORY All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}