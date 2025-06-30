import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users, Trophy, Medal, Award, Image } from "lucide-react";
import { useState, useEffect } from "react";

// Dynamic imports for winner photos with error handling
const getWinnerPhoto = async (position: number) => {
  try {
    const module = await import(`@assets/winner${position}.png`);
    return module.default;
  } catch (error) {
    return null;
  }
};

export default function PastWinnersPage() {
  const [winnerPhotos, setWinnerPhotos] = useState<{[key: number]: string | null}>({
    1: null,
    2: null,
    3: null
  });

  useEffect(() => {
    // Load winner photos on component mount
    const loadWinnerPhotos = async () => {
      const photos: {[key: number]: string | null} = {};

      for (let i = 1; i <= 3; i++) {
        photos[i] = await getWinnerPhoto(i);
      }

      setWinnerPhotos(photos);
    };

    loadWinnerPhotos();
  }, []);

  const WinnerPhotoSection = ({ position }: { position: number }) => {
    const photo = winnerPhotos[position];

    if (photo) {
      return (
        <div className="mt-4">
          <img 
            src={photo} 
            alt={`Winner ${position}`}
            className="w-24 h-24 object-cover rounded-full mx-auto border-4 border-current"
          />
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full mx-auto flex flex-col items-center justify-center">
          <Image className="text-gray-400" size={16} />
        </div>
      </div>
    );
  };

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
{/* Winner Profile Photos Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 border-4 border-yellow-400 rounded-full mx-auto mb-3 flex items-center justify-center">
                    {winnerPhotos[1] ? null : <Trophy className="text-yellow-600" size={32} />}
                  </div>
                  <WinnerPhotoSection position={1} />
                  <h4 className="font-semibold text-gray-900 text-sm">1st Place Winner</h4>
                  <p className="text-xs text-gray-500">Profile photo will appear here</p>
                </div>

                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-400 rounded-full mx-auto mb-3 flex items-center justify-center">
                    {winnerPhotos[2] ? null : <Medal className="text-gray-600" size={32} />}
                  </div>
                  <WinnerPhotoSection position={2} />
                  <h4 className="font-semibold text-gray-900 text-sm">2nd Place Winner</h4>
                  <p className="text-xs text-gray-500">Profile photo will appear here</p>
                </div>

                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 border-4 border-amber-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                    {winnerPhotos[3] ? null : <Award className="text-amber-600" size={32} />}
                  </div>
                  <WinnerPhotoSection position={3} />
                  <h4 className="font-semibold text-gray-900 text-sm">3rd Place Winner</h4>
                  <p className="text-xs text-gray-500">Profile photo will appear here</p>
                </div>
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