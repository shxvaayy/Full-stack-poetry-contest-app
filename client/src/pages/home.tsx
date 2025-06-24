import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Pen, IdCard, Users, Globe, Star, DollarSign, CheckCircle } from "lucide-react";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function HomePage() {
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
              <span>🏆 Join the Poetry Revolution • ✍️ Share Your Voice • 🌟 Win Amazing Prizes • 📚 Celebrate Literature • 🏆 Join the Poetry Revolution • </span>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-lg md:text-xl text-gray-200 mb-4 max-w-2xl mx-auto">
              Where every word matters, every voice counts, and every poet finds their stage
            </p>
          </div>

          <Link href="/submit">
            <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-4 px-8 text-lg shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-yellow-400/50">
              🚀 Start Your Journey
            </Button>
          </Link>

          <div className="mt-8 flex justify-center space-x-8 text-yellow-200">
            <div className="text-center">
              <div className="text-2xl font-bold">1000+</div>
              <div className="text-sm">Poets Joined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₹50K+</div>
              <div className="text-sm">Prizes Awarded</div>
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
                <h3 className="font-semibold text-gray-900 mb-2">Website Publication</h3>
                <p className="text-gray-600 text-sm">Your poem published on our winners gallery</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Star className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Platform Showcase</h3>
                <p className="text-gray-600 text-sm">Featured in our monthly literary showcase</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <DollarSign className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Cash Prize</h3>
                <p className="text-gray-600 text-sm">Monetary rewards for top-performing poems</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Competition Rules Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4 bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent">
            Competition Rules
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Simple guidelines for a fair and inclusive competition</p>
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">The competition is open to anyone who is 13 years old and above.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Poems must be the original work of the author, and must not have been created using AI.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Poems must be written in English only</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Entries must be the participant's original and unpublished work. Plagiarism will lead to disqualification.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">All entries must be submitted by the announced deadline. Late submissions will not be considered.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Participants retain full rights to their work. Writory may feature selected poems on its website/socials with proper credits.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Any length and style of poetry is welcome.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Poems on any subject are accepted. Our poets are encouraged to take inspiration from wherever they may find it.</p>
                </div>
                <div className="flex items-start bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-green-800 font-medium">🎉 Each participant is allowed 1 free submission. Entry is free! Anyone can join. Winners will get shoutouts and certificates to showcase their talents from us.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">We encourage participants to submit more poems, as it increases the likelihood of winning. Each poem is considered as an individual entry.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Beginners are encouraged to participate.</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">This is an online writing competition. Performance is not required anywhere. Submission has to be made online through our website.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}