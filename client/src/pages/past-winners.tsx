import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Award } from "lucide-react";
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

        {/* Winners Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Winner Card 1 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1st Place Winner</h3>
                <p className="text-gray-600 mb-2">John Doe</p>
                <p className="text-sm text-gray-500 mb-3">"The Silent Echo"</p>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <Calendar className="mr-1" size={14} />
                  December 2024
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Winner Card 2 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2nd Place Winner</h3>
                <p className="text-gray-600 mb-2">Jane Smith</p>
                <p className="text-sm text-gray-500 mb-3">"Whispers of Dawn"</p>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <Calendar className="mr-1" size={14} />
                  December 2024
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Winner Card 3 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3rd Place Winner</h3>
                <p className="text-gray-600 mb-2">Mike Johnson</p>
                <p className="text-sm text-gray-500 mb-3">"Ocean's Heart"</p>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <Calendar className="mr-1" size={14} />
                  December 2024
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About Our Winners</h2>
            <p className="text-gray-700 leading-relaxed">
              Our past winners represent the diverse and talented community of poets who have participated in WRITORY contests. 
              Each winner has demonstrated exceptional creativity, technical skill, and emotional depth in their poetry. 
              We celebrate their achievements and continue to inspire new generations of poets to share their voices with the world.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
