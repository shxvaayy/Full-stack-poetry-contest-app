import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Award, Star, Sparkles } from "lucide-react";
import pastwinnerBg from "@/assets/pastwinner.png";

export default function PastWinnersPage() {
  return (
    <div
      style={{
        backgroundImage: `url(${pastwinnerBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Past Winners</h1>
          <p className="text-xl text-gray-600">Celebrating the champions of previous contests</p>
        </div>

        {/* Inaugural Year Message */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 Inaugural Year 2025</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Welcome to the very first year of WRITORY Poetry Contest! This is where literary history begins. 
                We're excited to launch our inaugural competition and discover the extraordinary voices that will 
                shape the future of poetry.
              </p>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">🏆 What's Coming</h3>
                <p className="text-gray-700">
                  Our first winners will be announced soon! They'll receive certificates, recognition, 
                  cash prizes, and the honor of being part of WRITORY's founding legacy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Future Plans */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center mb-6">
              <Star className="mr-3 text-primary" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Our Vision for the Future</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Contests</h3>
                  <p className="text-gray-700">
                    Regular poetry competitions with different themes and challenges to keep creativity flowing.
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Expanded Categories</h3>
                  <p className="text-gray-700">
                    Soon introducing short stories, micro tales, and other creative writing forms.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Reach</h3>
                  <p className="text-gray-700">
                    Expanding to multiple languages and reaching poets from around the world.
                  </p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Building</h3>
                  <p className="text-gray-700">
                    Creating a vibrant community where poets can connect, share, and grow together.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legacy Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Building a Literary Legacy</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Every winner who joins us in this inaugural year becomes part of WRITORY's founding story. 
                Your names will be etched in our history as the first poets who believed in this platform 
                and helped us build something extraordinary.
              </p>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🌟 Be Part of History</h3>
                <p className="text-gray-700">
                  Submit your poem today and become one of the first poets to win in WRITORY's inaugural competition. 
                  Your story could be the beginning of something beautiful.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About Our Winners</h2>
            <p className="text-gray-700 leading-relaxed">
              Our past winners will represent the diverse and talented community of poets who have participated in WRITORY contests. 
              Each winner will demonstrate exceptional creativity, technical skill, and emotional depth in their poetry. 
              We will celebrate their achievements and continue to inspire new generations of poets to share their voices with the world.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
