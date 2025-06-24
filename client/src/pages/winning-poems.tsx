import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Medal, Award } from "lucide-react";
import CountdownTimer from "@/components/ui/countdown-timer";

export default function WinningPoemsPage() {
  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">RESULTS</h1>

        {/* Contest Status */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-3xl text-white" size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Winners Yet to Be Announced</h2>
              <p className="text-lg text-gray-600 mb-6">
                Our 2025 inaugural competition is currently in progress. Results will be announced after the submission deadline.
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results will be announced in:</h3>
              <CountdownTimer targetDate="2025-07-31T19:00:00" />
            </div>

            <p className="text-gray-600">Results announcement: July 31st, 2025 at 7 PM</p>
          </CardContent>
        </Card>

        {/* What to Expect */}
        <Card>
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What to Expect</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">First Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Medal className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Second Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Third Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
