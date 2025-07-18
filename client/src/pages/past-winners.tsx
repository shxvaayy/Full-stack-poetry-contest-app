import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users, Trophy, Medal, Award, Image } from "lucide-react";
import { useState, useEffect } from "react";
import pastwinnerBg from "@/assets/pastwinner.png";

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

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .hover\\:animate-bounce-slow:hover {
      animation: bounce-slow 0.7s;
    }
  `;
  document.head.appendChild(style);
}

export default function PastWinnersPage() {
  const [winnerPhotos, setWinnerPhotos] = useState<WinnerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<{ contest_launch_date: string | null, submission_deadline: string | null, result_announcement_date: string | null }>({ contest_launch_date: null, submission_deadline: null, result_announcement_date: null });
  // Set the contest month directly to '2025-07' (remove admin endpoint call)
  const [latestMonth] = useState<string>('2025-07');

  // Fetch contest timeline
  useEffect(() => {
    fetch('/api/contest-timeline')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.timeline) setTimeline(data.timeline);
      });
  }, []);

  // Step 2: Fetch winner photos for the latest contestMonth using the public endpoint
  useEffect(() => {
    if (!latestMonth) return;
    const loadWinnerPhotos = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/winner-photos/${latestMonth}`);
        if (response.ok) {
          const data = await response.json();
          setWinnerPhotos(data.winnerPhotos || []);
        } else {
          setWinnerPhotos([]);
        }
      } catch (error) {
        setWinnerPhotos([]);
      } finally {
        setLoading(false);
      }
    };
    loadWinnerPhotos();
  }, [latestMonth]);

  // Helper function to get winner photo by position
  const getWinnerPhotoByPosition = (position: number) => {
    return winnerPhotos.find(photo => photo.position === position);
  };

  const WinnerCard = ({ position, icon: Icon, color, title }: { position: number, icon: any, color: string, title: string }) => {
    const photo = getWinnerPhotoByPosition(position);
    return (
      <div className="text-center">
        <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_32px_8px_rgba(255,215,0,0.6)] hover:animate-bounce-slow group animate-pulse`}>
          <Icon className="text-2xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" size={24} />
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

  // Helper for consistent 12-hour format
  const formatDateTime12h = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short', hour12: true }) : '____';
  const formatDate12h = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'long' }) : '____';

  return (
    <section 
      className="py-16 min-h-screen"
      style={{
        backgroundImage: `url(${pastwinnerBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Past Winners</h1>
          <p className="text-xl text-gray-600">
            WRITORY is in its inaugural cycle for {timeline.result_announcement_date ? new Date(timeline.result_announcement_date).getFullYear() : '____'}. This is our first year of celebrating poetry
            and nurturing emerging voices. Winners from our {timeline.result_announcement_date ? new Date(timeline.result_announcement_date).getFullYear() : '____'} competition will be featured here after results
            are announced on {formatDateTime12h(timeline.result_announcement_date)}.
          </p>
        </div>

        <Card className="text-center mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{timeline.result_announcement_date ? new Date(timeline.result_announcement_date).getFullYear() : '____'} - Our Inaugural Year</h2>
            <p className="text-lg text-gray-700 mb-6">
              We are excited to launch the first-ever POETRY CONTEST in {timeline.result_announcement_date ? new Date(timeline.result_announcement_date).getFullYear() : '____'}. This marks the beginning of our
              journey to celebrate literary excellence and support emerging poets.
            </p>
            <p className="text-gray-600 mb-8">
              Competition results will be announced on {formatDateTime12h(timeline.result_announcement_date)}. Winners will receive certificates,
              recognition, and cash prizes. Their profiles and RESULTS will be featured on this page after the
              announcement.
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              {winnerPhotos.length > 0 ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Voices That Won</h3>
                  <p className="text-gray-600 mb-8">Explore the poets who've earned the spotlight in our previous contests — complete with scores, author profiles, and their winning poems.</p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Coming Soon</h3>
                  <p className="text-gray-600 mb-8">Winner profiles and achievements will be displayed here after {formatDateTime12h(timeline.result_announcement_date)}</p>
                </>
              )}
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
                  <p className="font-semibold text-gray-900">{formatDateTime12h(timeline.contest_launch_date)}</p>
                  <p className="text-gray-600">Contest Launch & Submissions Open</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-semibold text-gray-900">{formatDateTime12h(timeline.submission_deadline)}</p>
                  <p className="text-gray-600">Submission Deadline</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-4"></div>
                <div>
                  <p className="font-semibold text-gray-900">{formatDateTime12h(timeline.result_announcement_date)}</p>
                  <p className="text-gray-600">Results Announcement</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
