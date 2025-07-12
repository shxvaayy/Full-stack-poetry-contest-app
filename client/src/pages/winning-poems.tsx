import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Medal, Award, Image } from "lucide-react";
import CountdownTimer from "@/components/ui/countdown-timer";
import { useState, useEffect } from "react";

interface WinnerPhoto {
  id: number;
  position: number;
  contestMonth: string;
  contestYear: number;
  photoUrl: string;
  winnerName?: string;
  poemTitle?: string;
  uploadedBy: string;
  createdAt: string;
}

export default function WinningPoemsPage() {
  const [winnerPhotos, setWinnerPhotos] = useState<WinnerPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current contest month (you can adjust this logic)
  const getCurrentContestMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Load winner photos from database
  useEffect(() => {
    const loadWinnerPhotos = async () => {
      try {
        setLoading(true);
        const contestMonth = getCurrentContestMonth();
        
        const response = await fetch(`/api/winner-photos/${contestMonth}`);
        if (response.ok) {
          const data = await response.json();
          setWinnerPhotos(data.winnerPhotos || []);
        } else {
          console.log('No winner photos found for current contest month');
        }
      } catch (error) {
        console.error('Error loading winner photos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWinnerPhotos();
  }, []);

  // Helper function to get winner photo by position
  const getWinnerPhotoByPosition = (position: number) => {
    return winnerPhotos.find(photo => photo.position === position);
  };

  const WinnerPhotoSection = ({ position }: { position: number }) => {
    const photo = getWinnerPhotoByPosition(position);
    
    if (photo && photo.photoUrl) {
      return (
        <div className="mt-4">
          <img 
            src={photo.photoUrl} 
            alt={`${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place Winner`}
            className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-gray-200 shadow-lg"
          />
          <div className="mt-3">
            <p className="font-semibold text-gray-900">
              {photo.winnerName || `${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place Winner`}
            </p>
            {photo.poemTitle && (
              <p className="text-sm text-gray-600 italic">"{photo.poemTitle}"</p>
            )}
            <p className="text-xs text-gray-500">
              Contest: {photo.contestMonth} {photo.contestYear}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-4">
        <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full mx-auto flex flex-col items-center justify-center">
          <Image className="text-gray-400 mb-2" size={24} />
          <p className="text-xs text-gray-500 text-center px-2">
            {loading ? 'Loading...' : 'Winner photo'}
          </p>
        </div>
        <div className="mt-3">
          <p className="font-semibold text-gray-900">
            {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place Winner
          </p>
          <p className="text-sm text-gray-600">To be announced</p>
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