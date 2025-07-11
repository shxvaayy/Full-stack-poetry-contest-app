import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Medal, Award, Image } from "lucide-react";
import CountdownTimer from "@/components/ui/countdown-timer";
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

export default function WinningPoemsPage() {
  const [winnerPhotos, setWinnerPhotos] = useState<{[key: number]: string | null}>({
    1: null,
    2: null,
    3: null
  });

  // Winner data - you can change these names and scores
  const winners = {
    1: { name: "Winner's name", score: 0 },
    2: { name: "Winner's name", score: 0 },
    3: { name: "Winner's name", score: 0 }
  };

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
    const winner = winners[position as keyof typeof winners];
    
    if (photo) {
      return (
        <div className="mt-4">
          <img 
            src={photo} 
            alt={`Winner ${position}`}
            className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-gray-200 shadow-lg"
          />
          <div className="mt-3">
            <p className="font-semibold text-gray-900">{winner.name}</p>
            <p className="text-sm text-gray-600">Score: {winner.score}/100</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-4">
        <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full mx-auto flex flex-col items-center justify-center">
          <Image className="text-gray-400 mb-2" size={24} />
          <p className="text-xs text-gray-500 text-center px-2">Winner photo</p>
        </div>
        <div className="mt-3">
          <p className="font-semibold text-gray-900">{winner.name}</p>
          <p className="text-sm text-gray-600">Score: {winner.score}/100</p>
        </div>
      </div>
    );
  };

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
                {/* 🚀 FIXED: Changed bg-gold to bg-yellow-500 */}
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">First Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
                <WinnerPhotoSection position={1} />
              </div>
              <div>
                <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Medal className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Second Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
                <WinnerPhotoSection position={2} />
              </div>
              <div>
                <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-2xl text-white" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Third Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
                <WinnerPhotoSection position={3} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}