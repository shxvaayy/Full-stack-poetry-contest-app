import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Pen, IdCard, Users, Globe, Star, DollarSign, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@/assets/WRITORY_LOGO_edited-removebg-preview_1750597683371.png";
import ChatbotWidget from "@/components/ChatbotWidget";

export default function HomePage() {
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

  return (
    <div>
      {/* Hero Section with Poetry-themed Background */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/70 to-indigo-900/80"></div>
        <div className="relative z-10 text-center text-white px-4">
          <div className="w-24 h-24 mx-auto mb-6">
            <img 
              src={logoImage} 
              alt="Writory Logo" 
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-300 to-purple-300 bg-clip-text text-transparent">
            WRITORY
          </h1>
          <p className="text-xl md:text-2xl mb-8 font-medium text-yellow-100">Write Your Own Victory</p>

          {/* Moving Tagline */}
          <div className="overflow-hidden bg-black/40 backdrop-blur-sm rounded-full px-8 py-4 max-w-4xl mx-auto mb-8 border border-white/20">
            <div className="whitespace-nowrap text-lg font-medium animate-scroll text-yellow-200">
              <span>Join Poetry Revolution • Write Your Own Victory • Participate Now • Celebrate Literature • Join Poetry Revolution • Write Your Own Victory • Participate Now • Celebrate Literature • </span>
            </div>
          </div>

          <Link href="/submit">
            <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 px-8 text-lg shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-yellow-400/50">
              🚀 Start Your Journey
            </Button>
          </Link>

          <div className="mt-8 flex justify-center space-x-8 text-yellow-200">
            <div className="text-center">
              <div className="text-2xl font-bold">{poetsCount}+</div>
              <div className="text-sm">Poets Joined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">FREE</div>
              <div className="text-sm">Entry Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* No Barriers Section */}
      <section className="py-16 bg-gradient-to-br from-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            No Barriers or Boundaries
          </h2>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/50">
            <CardContent className="p-8">
              <div className="text-6xl mb-6">📝</div>
              <p className="text-lg text-gray-700 leading-relaxed">
                Whether you're a beginner or a seasoned poet, 13 or 63, from a small town or a big city — your words matter. We believe that creativity knows no limits, and every voice deserves to be heard. No fancy degrees, no prior publications — just pure passion and honest expression. So come as you are, write what you feel, and let the world hear your story. Because here, your pen holds the power, and your story knows no borders.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What Our Winners Receive */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            What Our Winners Receive
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Celebrating literary excellence with meaningful rewards</p>
          <div className="grid md:grid-cols-5 gap-6">
            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <IdCard className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Digital Certificates</h3>
                <p className="text-gray-600 text-sm">Official recognition certificates for your achievement</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Social Recognition</h3>
                <p className="text-gray-600 text-sm">Featured across our social media platforms</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Globe className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Global Exposure</h3>
                <p className="text-gray-600 text-sm">Showcase your work to a worldwide audience</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-red-50 to-rose-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Star className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Literary Recognition</h3>
                <p className="text-gray-600 text-sm">Build your reputation in the literary community</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Trophy className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Achievement Badge</h3>
                <p className="text-gray-600 text-sm">Special recognition for your creative excellence</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4 bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent">
            Why Choose Writory?
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Your platform for poetic expression and recognition</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <CheckCircle className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Easy Submission</h3>
                <p className="text-gray-600 leading-relaxed">
                  Simple, user-friendly submission process. Upload your poem in minutes and join our community of passionate poets from around the world.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Users className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Expert Judging</h3>
                <p className="text-gray-600 leading-relaxed">
                  Professional literary experts and published poets evaluate submissions with care, providing fair and insightful assessment of your work.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 border-0 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Globe className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Global Recognition</h3>
                <p className="text-gray-600 leading-relaxed">
                  Winners gain international exposure through our platform and social media, connecting with poetry enthusiasts worldwide.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Tiers Preview */}
      <section className="py-16 bg-gradient-to-br from-slate-900 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Submission Options
          </h2>
          <p className="text-center text-gray-300 mb-12 text-lg">Choose the option that works best for you</p>
          
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Pen className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-green-400 mb-2">FREE Entry</h3>
                <p className="text-3xl font-bold text-white mb-2">₹0</p>
                <p className="text-gray-300 text-sm mb-4">One poem per month</p>
                <div className="text-green-400 text-sm">Perfect for beginners</div>
              </CardContent>
            </Card>

            <Card className="border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Pen className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Single Poem</h3>
                <p className="text-3xl font-bold text-white mb-2">₹50</p>
                <p className="text-gray-300 text-sm mb-4">1 additional poem</p>
                <div className="text-blue-400 text-sm">Great for testing waters</div>
              </CardContent>
            </Card>

            <Card className="border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-violet-900/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Pen className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-purple-400 mb-2">Double Entry</h3>
                <p className="text-3xl font-bold text-white mb-2">₹100</p>
                <p className="text-gray-300 text-sm mb-4">2 additional poems</p>
                <div className="text-purple-400 text-sm">Popular choice</div>
              </CardContent>
            </Card>

            <Card className="border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Trophy className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Bulk Entry</h3>
                <p className="text-3xl font-bold text-white mb-2">₹480</p>
                <p className="text-gray-300 text-sm mb-4">5 additional poems</p>
                <div className="text-yellow-400 text-sm">Best value & most submissions</div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link href="/submit">
              <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 px-8 text-lg shadow-xl transform hover:scale-105 transition-all duration-200">
                Start Submitting Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Share Your Poetry?
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
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
  );
}