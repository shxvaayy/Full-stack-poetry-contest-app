import { Card, CardContent } from "@/components/ui/card";
import { Target, BookOpen, Award, Calendar } from "lucide-react";

export default function AboutPage() {
  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Us</h1>
          <p className="text-xl text-gray-600">Celebrating literary excellence and nurturing emerging voices</p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center mb-4">
              <Target className="mr-3 text-primary" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              WRITORY is dedicated to celebrating literary excellence and nurturing emerging voices. Join our community of poets and share your unique stories with the world. We believe in the power of poetry to inspire, heal, and connect people across boundaries.
            </p>
          </CardContent>
        </Card>

        {/* News Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center mb-6">
              <Calendar className="mr-3 text-primary" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">News</h2>
            </div>

            <div className="space-y-6">
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Inaugural Competition Now Open</h3>
                <p className="text-gray-700 mb-2">
                  We are excited to launch the first-ever POETRY CONTEST in 2025! Submit your original poems in English for a chance to win certificates, recognition, and cash prizes.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to WRITORY</h3>
                <p className="text-gray-700 mb-2">
                  Celebrating the art of poetry and nurturing emerging voices. Our inaugural competition welcomes poets of all backgrounds to share their unique stories with the world.
                </p>
                
              </div>

              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Free First Submission</h3>
                <p className="text-gray-700 mb-2">
                  Every participant gets their first poem submission absolutely free! Additional entries are available at affordable rates to encourage multiple submissions.
                </p>
                
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contest Information */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center mb-6">
              <BookOpen className="mr-3 text-primary" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Contest Information</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Submission Guidelines</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Original poems in English only</li>
                  <li>• Poems of any length are welcome</li>
                  <li>• Submit in .docx or .pdf format</li>
                  <li>• Include author photo</li>
                  <li>• One free submission available</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Judging Criteria</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Originality and creativity</li>
                  <li>• Literary merit and technique</li>
                  <li>• Emotional impact</li>
                  <li>• Language mastery</li>
                  <li>• Overall artistic expression</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
