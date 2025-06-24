import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Medal, Award, User } from "lucide-react";
import CountdownTimer from "@/components/ui/countdown-timer";

// Import winner photos from root attached_assets folder
import winner1Photo from "../../attached_assets/winner1.png";
import winner2Photo from "../../attached_assets/winner2.png";
import winner3Photo from "../../attached_assets/winner3.png";

const getWinnerPhoto = (position: number) => {
  switch (position) {
    case 1: return winner1Photo;
    case 2: return winner2Photo;
    case 3: return winner3Photo;
    default: return null;
  }
};

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
              {/* First Place Winner */}
              <div>
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">First Place Winner</h4>
                <p className="text-gray-600 text-sm mb-4">Featured poem and author profile</p>
                
                {/* Winner Photo */}
                <div className="mt-4">
                  {getWinnerPhoto(1) ? (
                    <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden shadow-lg border-4 border-yellow-400">
                      <img 
                        src={getWinnerPhoto(1)} 
                        alt="First Place Winner" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("Failed to load winner 1 photo");
                          // Hide the image and show placeholder
                          const container = e.currentTarget.closest('.w-32.h-32');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-32 h-32 mx-auto rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <div class="text-center">
                                  <svg class="text-gray-400 mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                  <p class="text-xs text-gray-500">Winner photo will be uploaded here</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <User className="text-gray-400 mx-auto mb-2" size={24} />
                        <p className="text-xs text-gray-500">Winner photo will be uploaded here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Second Place Winner */}
              <div>
                <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Medal className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Second Place Winner</h4>
                <p className="text-gray-600 text-sm mb-4">Featured poem and author profile</p>
                
                {/* Winner Photo */}
                <div className="mt-4">
                  {getWinnerPhoto(2) ? (
                    <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden shadow-lg border-4 border-gray-400">
                      <img 
                        src={getWinnerPhoto(2)} 
                        alt="Second Place Winner" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("Failed to load winner 2 photo");
                          const container = e.currentTarget.closest('.w-32.h-32');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-32 h-32 mx-auto rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <div class="text-center">
                                  <svg class="text-gray-400 mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                  <p class="text-xs text-gray-500">Winner photo will be uploaded here</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <User className="text-gray-400 mx-auto mb-2" size={24} />
                        <p className="text-xs text-gray-500">Winner photo will be uploaded here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Third Place Winner */}
              <div>
                <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Third Place Winner</h4>
                <p className="text-gray-600 text-sm mb-4">Featured poem and author profile</p>
                
                {/* Winner Photo */}
                <div className="mt-4">
                  {getWinnerPhoto(3) ? (
                    <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden shadow-lg border-4 border-yellow-600">
                      <img 
                        src={getWinnerPhoto(3)} 
                        alt="Third Place Winner" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("Failed to load winner 3 photo");
                          const container = e.currentTarget.closest('.w-32.h-32');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-32 h-32 mx-auto rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <div class="text-center">
                                  <svg class="text-gray-400 mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                  <p class="text-xs text-gray-500">Winner photo will be uploaded here</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 mx-auto rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <User className="text-gray-400 mx-auto mb-2" size={24} />
                        <p className="text-xs text-gray-500">Winner photo will be uploaded here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}