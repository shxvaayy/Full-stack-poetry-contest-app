import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { useEffect } from "react";

export default function Footer() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Reset animations for navigation
      document.querySelectorAll('footer .scroll-animate').forEach((el) => {
        el.classList.remove('animated');
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
      });
      
      let observer;
      
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
              entry.target.classList.add('animated');
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
            }
          });
        }, { 
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        });

        // Observe all elements with scroll-animate class in footer
        document.querySelectorAll('footer .scroll-animate').forEach((el) => {
          observer.observe(el);
        });
      }, 100); // 100ms delay

      return () => {
        clearTimeout(timeoutId);
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, []);

  const handleNotAvailable = () => {
    toast({
      title: "Not Available Yet!",
      description: "This competition is not available at the moment.",
    });
  };

  return (
    <footer className="text-white py-12" style={{backgroundColor: '#4a5568'}}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-xl font-bold mb-4 scroll-animate">WRITORY</h3>
            <p className="text-gray-300 text-sm leading-relaxed scroll-animate">
              Celebrating literary excellence and nurturing emerging voices. Join our community of poets and share your unique stories with the world.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 scroll-animate">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li className="scroll-animate">
                <Link href="/submit" className="text-gray-300 hover:text-white transition-colors">
                  Submit Your Poem
                </Link>
              </li>
              <li className="scroll-animate">
                <Link href="/submit#writory-wall-section" className="text-gray-300 hover:text-white transition-colors">
                  Submit for Writory Wall
                </Link>
              </li>
              <li className="scroll-animate">
                <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li className="scroll-animate">
                <Link href="/past-winners" className="text-gray-300 hover:text-white transition-colors">
                  Past Winners
                </Link>
              </li>
              <li className="scroll-animate">
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Additional Competitions */}
          <div>
            <h4 className="text-lg font-semibold mb-4 scroll-animate">Additional Competitions</h4>
            <ul className="space-y-2 text-sm">
              <li className="scroll-animate">
                <button onClick={handleNotAvailable} className="text-gray-300 hover:text-white transition-colors">
                  Regional Languages Competition
                </button>
              </li>
              <li className="scroll-animate">
                <button onClick={handleNotAvailable} className="text-gray-300 hover:text-white transition-colors">
                  Junior Competition
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-black pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
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
          <p className="text-gray-300 text-sm scroll-animate">© 2025 WRITORY All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}