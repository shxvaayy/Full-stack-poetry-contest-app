import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Medal, Award, Image } from "lucide-react";
import CountdownTimer from "@/components/ui/countdown-timer";
import { useState, useEffect } from "react";
import resultsBg from "@/assets/results.png";
import './writory-wall-font.css';

interface WinnerPhoto {
  id: number;
  position: number;
  contestMonth: string;
  contestYear: number;
  photoUrl: string;
  winnerName?: string;
  poemTitle?: string;
  poemText?: string; // <-- add this
  instagramHandle?: string; // <-- add this
  uploadedBy: string;
  createdAt: string;
  score?: number;
}

export default function WinningPoemsPage() {
  const [winnerPhotos, setWinnerPhotos] = useState<WinnerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<{ contest_launch_date: string | null, submission_deadline: string | null, result_announcement_date: string | null }>({ contest_launch_date: null, submission_deadline: null, result_announcement_date: null });

  // Fetch contest timeline
  useEffect(() => {
    fetch('/api/contest-timeline')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.timeline) setTimeline(data.timeline);
      });
  }, []);

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
            <p className="font-semibold text-gray-900 text-lg">
              {photo.winnerName || `${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place Winner`}
            </p>
            <p className="text-sm text-gray-600">Score: {photo.score ?? 'N/A'}/100</p>
            {photo.poemTitle && (
              <p className="text-base text-gray-800 font-semibold italic mt-1">"{photo.poemTitle}"</p>
            )}
            <p className="text-xs text-gray-500">
              Contest: {photo.contestMonth} {photo.contestYear}
            </p>
          </div>
          {/* Poem Card */}
          {photo.poemText && (
            <div className="mt-6 bg-gradient-to-br from-yellow-50 via-white to-pink-50 rounded-2xl shadow-xl border border-yellow-200 max-w-xl mx-auto p-8 flex flex-col items-center">
              <h4 className="text-2xl font-extrabold text-yellow-700 mb-2 tracking-wide drop-shadow">{photo.poemTitle}</h4>
              <pre className="whitespace-pre-wrap text-gray-900 text-lg leading-relaxed mb-4 font-serif text-center" style={{fontFamily: 'inherit'}}>{photo.poemText}</pre>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full mt-2">
                <span className="text-gray-800 font-semibold text-base">By: {photo.winnerName}</span>
                {photo.instagramHandle && (
                  <a
                    href={`https://instagram.com/${photo.instagramHandle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold shadow hover:scale-105 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 2.25h9A5.25 5.25 0 0 1 21.75 7.5v9a5.25 5.25 0 0 1-5.25 5.25h-9A5.25 5.25 0 0 1 2.25 16.5v-9A5.25 5.25 0 0 1 7.5 2.25zm0 0V3m9-0.75V3m-9 0A5.25 5.25 0 0 0 2.25 7.5v9a5.25 5.25 0 0 0 7.5 21.75h9A5.25 5.25 0 0 0 21.75 16.5v-9A5.25 5.25 0 0 0 16.5 2.25h-9z" />
                      <circle cx="12" cy="12" r="3.75" />
                    </svg>
                    Follow
                  </a>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600 italic">Score: {photo.score ?? 'N/A'}/100</div>
            </div>
          )}
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

  // Helper for consistent 12-hour format
  const formatDateTime12h = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short', hour12: true }) : '____';

  return (
    <section 
      className="py-16 min-h-screen"
      style={{
        backgroundImage: `url(${resultsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-black mb-8 writory-wall-heading">RESULTS</h1>

        {/* Contest Status */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-3xl text-white" size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Winners Yet to Be Announced</h2>
              <p className="text-lg text-gray-600 mb-6">
                Our {timeline.result_announcement_date ? new Date(timeline.result_announcement_date).getFullYear() : '____'} inaugural competition is currently in progress. Results will be announced after the submission deadline.
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results will be announced in:</h3>
              <CountdownTimer targetDate={timeline.result_announcement_date || ''} />
            </div>

            <p className="text-gray-600">Results announcement: {formatDateTime12h(timeline.result_announcement_date)}</p>
          </CardContent>
        </Card>

        {/* What to Expect */}
        <Card>
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Recognizing the top 3 poets and their celebrated work</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                {/* 🏆 FIXED: Changed bg-gold to bg-yellow-500 */}
                <div className={`w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 hover:shadow-[0_0_24px_4px_rgba(255,215,0,0.4)] hover:animate-bounce-slow group`}>
                  <Trophy className="text-2xl text-white group-hover:drop-shadow-[0_0_8px_gold]" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">First Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
                <WinnerPhotoSection position={1} />
              </div>
              <div>
                <div className={`w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.4)] hover:animate-bounce-slow group`}>
                  <Medal className="text-2xl text-white group-hover:drop-shadow-[0_0_8px_silver]" size={24} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Second Place Winner</h4>
                <p className="text-gray-600 text-sm">Featured poem and author profile</p>
                <WinnerPhotoSection position={2} />
              </div>
              <div>
                <div className={`w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 hover:shadow-[0_0_24px_4px_rgba(255,165,0,0.4)] hover:animate-bounce-slow group`}>
                  <Award className="text-2xl text-white group-hover:drop-shadow-[0_0_8px_orange]" size={24} />
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