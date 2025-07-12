import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users, Trophy, Medal, Award, Image } from "lucide-react";
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
  score?: number; // Added score property
}

export default function PastWinnersPage() {
  const [winnerPhotos, setWinnerPhotos] = useState<WinnerPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all winner photos from database
  useEffect(() => {
    const loadWinnerPhotos = async () => {
      try {
        setLoading(true);
        
        // For past winners, we'll show all available winner photos
        // You can modify this to show specific contest months
        const response = await fetch('/api/admin/winner-photos');
        if (response.ok) {
          const data = await response.json();
          setWinnerPhotos(data.winnerPhotos || []);
        } else {
          console.log('No winner photos found');
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

  // Find the latest contest month with any winner photos (not requiring all 3)
  const groupByMonth: Record<string, WinnerPhoto[]> = {};
  winnerPhotos.forEach(photo => {
    const key = `${photo.contestYear}-${photo.contestMonth}`;
    if (!groupByMonth[key]) groupByMonth[key] = [];
    groupByMonth[key].push(photo);
  });
  const sortedMonths = Object.keys(groupByMonth).sort().reverse();
  let latestSet: WinnerPhoto[] = [];
  for (const month of sortedMonths) {
    if (groupByMonth[month].length > 0) { // Show as soon as any winner photo exists
      latestSet = groupByMonth[month];
      break;
    }
  }

  const WinnerCard = ({ position, icon: Icon, color, title }: { position: number, icon: any, color: string, title: string }) => {
    const photo = latestSet.find(p => p.position === position);
    return (
      <div className="text-center">
        <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className="text-2xl text-white" size={24} />
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        {photo && photo.photoUrl ? (
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
              <p className="text-sm text-gray-600">Score: {photo.score ?? 'N/A'}/100</p>
              <p className="text-xs text-gray-500">
                Contest: {photo.contestMonth} {photo.contestYear}
              </p>
            </div>
          </div>
        ) : (
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
        )}
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
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Coming Soon</h3>
              <p className="text-gray-600 mb-8">Winner profiles and achievements will be displayed here after July 31st, 2025</p>
              
              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map(pos => (
                  <WinnerCard 
                    key={pos}
                    position={pos}
                    icon={pos === 1 ? Trophy : pos === 2 ? Medal : Award}
                    color={pos === 1 ? "bg-yellow-500" : pos === 2 ? "bg-gray-400" : "bg-yellow-600"}
                    title={pos === 1 ? "1st Place Winner" : pos === 2 ? "2nd Place Winner" : "3rd Place Winner"}
                  />
                ))}
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
