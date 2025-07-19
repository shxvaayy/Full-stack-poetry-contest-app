import { Card, CardContent } from "@/components/ui/card";
import { Target, BookOpen, Award, Calendar } from "lucide-react";
import aboutBg from "@/assets/about.png";

export default function AboutPage() {
  return (
    <div
      style={{
        backgroundImage: `url(${aboutBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Us</h1>
          <p className="text-xl font-bold text-black">Celebrating literary excellence and nurturing emerging voices</p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8 transform hover:scale-105 transition-all duration-500 hover:shadow-2xl border-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Target className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Our Mission</h2>
            </div>
            <p className="text-gray-700 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
              WRITORY is dedicated to celebrating literary excellence and nurturing emerging voices. Join our community of poets and share your unique stories with the world. We believe in the power of poetry to inspire, heal, and connect people across boundaries.
            </p>
          </CardContent>
        </Card>

        {/* News Section */}
        <Card className="mb-8 transform hover:scale-105 transition-all duration-500 hover:shadow-2xl border-0 bg-gradient-to-br from-green-50 via-white to-teal-50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Calendar className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">News</h2>
            </div>

            <div className="space-y-6">
              <div className="border-l-4 border-primary pl-6 transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-green-700 transition-colors duration-300">Inaugural Competition Now Open</h3>
                <p className="text-gray-700 mb-2 hover:text-gray-800 transition-colors duration-300">
                  We are excited to launch the first-ever POETRY CONTEST in 2025! Submit your original poems in English for a chance to win certificates, recognition, and cash prizes.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-6 transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-700 transition-colors duration-300">Welcome to WRITORY</h3>
                <p className="text-gray-700 mb-2 hover:text-gray-800 transition-colors duration-300">
                  Celebrating the art of poetry and nurturing emerging voices. Our inaugural competition welcomes poets of all backgrounds to share their unique stories with the world.
                </p>
                
              </div>

              <div className="border-l-4 border-green-500 pl-6 transform hover:scale-105 transition-all duration-300 p-3 rounded-lg hover:bg-teal-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-green-700 transition-colors duration-300">Free First Submission</h3>
                <p className="text-gray-700 mb-2 hover:text-gray-800 transition-colors duration-300">
                  Every participant gets their first poem submission absolutely free! Additional entries are available at affordable rates to encourage multiple submissions.
                </p>
                
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contest Information */}
        <Card className="transform hover:scale-105 transition-all duration-500 hover:shadow-2xl border-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <BookOpen className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Contest Information</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="transform hover:scale-105 transition-all duration-300 p-4 rounded-lg hover:bg-purple-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 hover:text-purple-700 transition-colors duration-300">Submission Guidelines</h3>
                <ul className="text-gray-700 space-y-2">
                  <li className="hover:text-gray-800 transition-colors duration-300">• Original poems in English only</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Poems of any length are welcome</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Submit in .docx or .pdf format</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Include author photo</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• One free submission available</li>
                </ul>
              </div>

              <div className="transform hover:scale-105 transition-all duration-300 p-4 rounded-lg hover:bg-pink-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 hover:text-pink-700 transition-colors duration-300">Judging Criteria</h3>
                <ul className="text-gray-700 space-y-2">
                  <li className="hover:text-gray-800 transition-colors duration-300">• Originality and creativity</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Literary merit and technique</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Emotional impact</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Language mastery</li>
                  <li className="hover:text-gray-800 transition-colors duration-300">• Overall artistic expression</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
