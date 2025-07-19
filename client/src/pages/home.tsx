import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Pen, IdCard, Users, Globe, Star, DollarSign, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@/assets/WRITORY_LOGO_edited-removebg-preview_1750597683371.png";
import ChatbotWidget from "@/components/ChatbotWidget";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import homeBg from '@/assets/home-bg.jpg';
import './home-font.css';

// Simple Hero Carousel Component
function HeroCarousel({ children }: { children: React.ReactNode }) {
  return (
    <section 
      className="relative min-h-screen flex items-center justify-center"
      style={{ 
        backgroundImage: `
          url('https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1973&q=80')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-blue-900/60 to-indigo-900/70"></div>
      <div className="absolute inset-0 bg-purple-500/15"></div>
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  );
}

// Simple Carousel Component for Poetry Inspiration
function SimpleCarousel({ slides }: { slides: Array<{ title: string; subtitle: string; gradient: string }> }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative h-96 w-full overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: slide.gradient }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white px-8 max-w-4xl">
              <h3 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl scroll-animate">{slide.title}</h3>
              <p className="text-xl md:text-2xl font-light drop-shadow-lg scroll-animate">{slide.subtitle}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  // Simple scroll-triggered animations - one time only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Global flag to ensure animation runs only once per page load
      if (window.__writory_animations_initialized) {
        return;
      }
      
      const observer = new IntersectionObserver((entries) => {
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

      // Observe all elements with scroll-animateclass
      document.querySelectorAll('.scroll-animate').forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(el);
      });

      // Mark as initialized
      window.__writory_animations_initialized = true;

      return () => {
        observer.disconnect();
      };
    }
  }, []);
  const { toast } = useToast();

  // Check for verification success message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      toast({
        title: "Welcome to Writory!",
        description: "Your email has been verified. You can now submit poems and participate in contests.",
      });
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  // Fetch total submission count for live poets count
  const { data: statsData } = useQuery({
    queryKey: ['/api/submission-count'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/submission-count");
      if (response.ok) {
        const data = await response.json();
        return { totalPoets: data.count || 0 };
      }
      return { totalPoets: 0 };
    },
    refetchInterval: 3000, // Refetch every 30 seconds
  });

  const poetsCount = statsData?.totalPoets || 0;

  const carouselSlides = [
    {
      title: "Words That Dance",
      subtitle: "Let your verses flow like music across the page",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
      title: "Echoes of the Heart",
      subtitle: "Every poem carries the whispers of your soul",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    },
    {
      title: "Nature's Symphony",
      subtitle: "Find inspiration in the rhythm of the natural world",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    },
    {
      title: "Legacy of Words",
      subtitle: "Join the timeless tradition of poetic expression",
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
    }
  ];

  const tiltHandler = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -15;
    const tiltY = ((x - centerX) / centerX) * 15;
    e.currentTarget.style.setProperty('--tilt-x', `${tiltX}deg`);
    e.currentTarget.style.setProperty('--tilt-y', `${tiltY}deg`);
  };
  const resetTiltHandler = (e) => {
    e.currentTarget.style.setProperty('--tilt-x', '0deg');
    e.currentTarget.style.setProperty('--tilt-y', '0deg');
  };
  const tiltTouchHandler = (e) => tiltHandler(e);

  return (
    <div>
      {/* Header remains outside bg */}
      <div
        style={{
          backgroundImage: `url(${homeBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* All main content here, including HeroCarousel and sections */}
        {/* Hero Section with Rotating Carousel */}
        <HeroCarousel>
          <div className="text-center text-white px-4 max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16 relative">
              {/* Logo positioned above WRITORY heading */}
              <div className="flex justify-center">
                <img 
                  src={logoImage} 
                  alt="Writory Logo" 
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                />
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent leading-tight tracking-wide -mt-8 scroll-animate">
                WRITORY
              </h1>

              <p className="text-xl md:text-2xl mb-8 font-medium text-yellow-100 drop-shadow-lg scroll-animate">Write Your Own Victory</p>

              {/* Moving Tagline */}
              <div className="overflow-hidden bg-black/50 backdrop-blur-sm rounded-full px-8 py-4 max-w-4xl mx-auto mb-8 border border-white/30">
                <div className="whitespace-nowrap text-lg font-medium animate-scroll text-yellow-200">
                  <span>Join Poetry Revolution • Write Your Own Victory • Participate Now • Celebrate Literature • Join Poetry Revolution • Write Your Own Victory • Participate Now • Celebrate Literature • </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:gap-4 justify-center mt-8">
                <Link href="/submit" className="w-full md:w-auto">
                  <Button size="md" className="w-full md:w-[220px] h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white font-semibold py-2.5 px-4 md:py-3 md:px-6 text-base md:text-lg rounded-xl transition-transform duration-200 hover:scale-105">
                    🚀 ENTER THE CONTEST
                  </Button>
                </Link>
                <Link href="/writory-wall" className="w-full md:w-auto">
                  <Button size="md" className="w-full md:w-[220px] h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white font-semibold py-2.5 px-4 md:py-3 md:px-6 text-base md:text-lg rounded-xl transition-transform duration-200 hover:scale-105">
                    🏆 WRITORY WALL
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex justify-center space-x-8 text-yellow-200">
                <div className="text-center">
                  <div className="text-2xl font-bold drop-shadow-lg scroll-animate">{poetsCount}+</div>
                  <div className="text-sm drop-shadow-lg scroll-animate">Poets Joined</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold drop-shadow-lg scroll-animate">FREE</div>
                  <div className="text-sm drop-shadow-lg scroll-animate">Entry Available</div>
                </div>
              </div>
            </div>
          </div>
        </HeroCarousel>

        {/* No Barriers Section */}
        <section className="py-16 bg-gradient-to-br from-white to-blue-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent scroll-animate">
              No Barriers or Boundaries
            </h2>
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/50">
              <CardContent className="p-8">
                <div className="text-6xl mb-6">📝</div>
                <p className="text-lg text-gray-700 leading-relaxed scroll-animate">
                  Whether you're a beginner or a seasoned poet, 13 or 63, from a small town or a big city — your words matter. We believe that creativity knows no limits, and every voice deserves to be heard. No fancy degrees, no prior publications — just pure passion and honest expression. So come as you are, write what you feel, and let the world hear your story. Because here, your pen holds the power, and your story knows no borders.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* What Our Winners Receive */}
        <section className="py-16 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent scroll-animate">
              What Our Winners Receive
            </h2>
            <p className="text-center text-gray-600 mb-12 text-lg scroll-animate">Celebrating literary excellence with meaningful rewards</p>
            <div className="grid md:grid-cols-5 gap-6">
              <Card 
                className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-yellow-50 to-orange-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <IdCard className="text-2xl text-white" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 scroll-animate">Digital Certificates</h3>
                  <p className="text-gray-600 text-sm scroll-animate">Official recognition certificates for your achievement</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-green-50 to-emerald-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Users className="text-2xl text-white" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 scroll-animate">Social Recognition</h3>
                  <p className="text-gray-600 text-sm scroll-animate">Featured across our social media platforms</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-blue-50 to-cyan-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Globe className="text-2xl text-white" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 scroll-animate">Global Exposure</h3>
                  <p className="text-gray-600 text-sm scroll-animate">Showcase your work to a worldwide audience</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-red-50 to-rose-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Star className="text-2xl text-white" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 scroll-animate">Literary Recognition</h3>
                  <p className="text-gray-600 text-sm scroll-animate">Build your reputation in the literary community</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-purple-50 to-violet-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Trophy className="text-2xl text-white" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 scroll-animate">Achievement Badge</h3>
                  <p className="text-gray-600 text-sm scroll-animate">Special recognition for your creative excellence</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-gradient-to-br from-gray-50 to-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4 bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent scroll-animate">
              Why Choose Writory?
            </h2>
            <p className="text-center text-gray-600 mb-12 text-lg scroll-animate">Your platform for poetic expression and recognition</p>

            <div className="grid md:grid-cols-4 gap-8">
              <Card 
                className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-emerald-50 to-teal-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <CheckCircle className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 scroll-animate">Easy Submission</h3>
                  <p className="text-gray-600 leading-relaxed scroll-animate">
                    Simple, user-friendly submission process. Upload your poem in minutes and join our community of passionate poets from around the world.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-blue-50 to-indigo-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Users className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 scroll-animate">Expert Judging</h3>
                  <p className="text-gray-600 leading-relaxed scroll-animate">
                    Professional literary experts and published poets evaluate submissions with care, providing fair and insightful assessment of your work.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-purple-50 to-pink-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Globe className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 scroll-animate">Global Recognition</h3>
                  <p className="text-gray-600 leading-relaxed scroll-animate">
                    Winners gain international exposure through our platform and social media, connecting with poetry enthusiasts worldwide.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-orange-50 to-red-50 tilt-card"
                onMouseMove={tiltHandler}
                onMouseLeave={resetTiltHandler}
                onTouchMove={tiltTouchHandler}
                onTouchEnd={resetTiltHandler}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Star className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 scroll-animate">New challenges every month</h3>
                  <p className="text-gray-600 leading-relaxed scroll-animate">
                    Fresh prompts, unique themes, and creative formats are released every month to keep your imagination active and your writing evolving. There's always something new to look forward to!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Poetry Inspiration Carousel */}
        <section className="py-16 bg-gradient-to-br from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 mb-12">
            <h2 className="text-4xl font-bold text-center text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent scroll-animate">
              Poetry Inspiration
            </h2>
          </div>
          <div className="w-full">
            <SimpleCarousel slides={carouselSlides} />
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-32 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white relative overflow-hidden min-h-[60vh]">
          <div className="max-w-4xl mx-auto text-center px-4 flex flex-col justify-center h-full">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 scroll-animate">
              Ready to Share Your Poetry?
            </h2>
            <p className="text-xl text-white/90 mb-8 leading-relaxed scroll-animate">
              Join thousands of poets who have already shared their voices. Your story matters, your words have power, and your poetry deserves to be heard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/submit">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 font-semibold py-4 px-8 text-lg shadow-xl transform hover:scale-105 transition-all duration-200">
                  Submit Your Poem
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-white hover:text-purple-600 font-semibold py-4 px-8 text-lg shadow-xl transform hover:scale-105 transition-all duration-200">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <ChatbotWidget />
      </div>
      {/* Footer remains outside bg */}
    </div>
  );
}