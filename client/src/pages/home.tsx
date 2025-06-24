import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Pen, IdCard, Users, Globe, Star, DollarSign, CheckCircle } from "lucide-react";
import logoImage from "@assets/WRITORY_LOGO_edited-removebg-preview_1750599565240.png";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section with Library Background */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="relative z-10 text-center text-white px-4">
          <div className="w-24 h-24 mx-auto mb-6">
            <img 
              src={logoImage} 
              alt="Writory Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">WRITORY</h1>
          <p className="text-xl md:text-2xl mb-8">Write Your Own Victory</p>

          {/* Moving Tagline */}
          <div className="overflow-hidden bg-black bg-opacity-50 rounded-full px-8 py-4 max-w-4xl mx-auto mb-8">
            <div className="whitespace-nowrap text-lg font-medium animate-scroll">
              <span>Write Your Own Victory • Write Your Own Victory • Write Your Own Victory • Write Your Own Victory • Write Your Own Victory • </span>
            </div>
          </div>

          <Link href="/submit">
            <Button size="lg" className="bg-accent hover:bg-blue-600 text-white font-semibold py-4 px-8 text-lg">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </section>

      {/* No Barriers Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">No Barriers or Boundaries</h2>
          <Card>
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                Whether you're a beginner or a seasoned poet, 13 or 63, from a small town or a big city — your words matter. We believe that creativity knows no limits, and every voice deserves to be heard. No fancy degrees, no prior publications — just pure passion and honest expression. So come as you are, write what you feel, and let the world hear your story. Because here, your pen holds the power, and your story knows no borders.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What Our Winners Receive */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">What Our Winners Receive</h2>
          <div className="grid md:grid-cols-5 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <IdCard className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Digital Certificates</h3>
                <p className="text-gray-600 text-sm">Official recognition certificates for your achievement</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Social Recognition</h3>
                <p className="text-gray-600 text-sm">Featured across our social media platforms</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Website Publication</h3>
                <p className="text-gray-600 text-sm">Your poem published on our winners gallery</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-2xl text-white" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Platform Showcase</h3>
                <p className="text-gray-600 text-sm">Featured in our monthly literary showcase</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
      <section className="py-16 bg-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Competition Rules</h2>
          <Card>
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
                <div className="flex items-start bg-green-50 p-4 rounded-lg border border-green-200">
                  <CheckCircle className="text-green-600 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-green-800 font-medium">Each participant is allowed 1 free submission. Entry is free! Anyone can join. Winners will get shoutouts and certificates to showcase their talents from us.</p>
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

      {/* Award Ceremony Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Award Ceremony</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <img
              src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
              alt="Award ceremony with formal recognition"
              className="rounded-xl shadow-lg w-full h-auto"
            />

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Celebrating Literary Excellence</h3>
              <p className="text-gray-700 mb-4">
                Our annual award ceremony brings together poets, literary enthusiasts, and supporters of creative expression. Winners receive their certificates and cash prizes in a celebration of literary achievement.
              </p>
              <p className="text-gray-700 mb-6">
                The ceremony features poetry readings, networking opportunities, and recognition of the diverse voices that make our competition special.
              </p>
              <Link href="/past-winners">
                <Button className="bg-primary hover:bg-green-700 text-white font-semibold py-3 px-6">
                  View Past Winners
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
