import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users } from "lucide-react";

export default function PastWinnersPage() {
  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Past Winners</h1>
          <p className="text-xl text-gray-600">
            WRITORY is in its inaugural cycle for 2025. This is our first year of celebrating poetry
            and nurturing emerging voices. Winners from our 2025 competition will be featured here after results
            are announced on July 31st, 2025.
          </p>
        </div>

        <Card className="text-center mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">2025 - Our Inaugural Year</h2>
            <p className="text-lg text-gray-700 mb-6">
              We are excited to launch the first-ever POETRY CONTEST in 2025. This marks the beginning of our
              journey to celebrate literary excellence and support emerging poets.
            </p>
            <p className="text-gray-600 mb-8">
              Competition results will be announced on July 31st, 2025 at 7 PM. Winners will receive certificates,
              recognition, and cash prizes. Their profiles and RESULTS will be featured on this page after the
              announcement.
            </p>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Coming Soon</h3>
              <p className="text-gray-600">Winner profiles and achievements will be displayed here after July 31st, 2025</p>
            </div>
          </CardContent>
        </Card>

        {/* Contest Timeline */}
        <Card>
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Contest Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-semibold text-gray-900">January 2025</p>
                  <p className="text-gray-600">Contest Launch & Submissions Open</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-semibold text-gray-900">July 30, 2025</p>
                  <p className="text-gray-600">Submission Deadline</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-semibold text-gray-900">July 31, 2025</p>
                  <p className="text-gray-600">Results Announcement at 7 PM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
