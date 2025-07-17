import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Award, User, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CountdownTimer from "@/components/ui/countdown-timer";
import resultsBg from "@/assets/results.png";

export default function WinningPoemsPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch winner photos from the database
  const { data: winnerPhotos, isLoading } = useQuery({
    queryKey: ['winner-photos'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/winner-photos");
      if (response.ok) {
        return response.json();
      }
      return { winnerPhotos: [] };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Calculate contest deadline (end of current month)
  const getContestDeadline = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return endOfMonth.toISOString();
  };

  // Calculate results announcement date (5 days after deadline)
  const getResultsDate = () => {
    const deadline = new Date(getContestDeadline());
    const resultsDate = new Date(deadline.getTime() + (5 * 24 * 60 * 60 * 1000)); // 5 days after
    return resultsDate.toISOString();
  };

  const contestDeadline = getContestDeadline();
  const resultsDate = getResultsDate();
  const isAfterDeadline = currentTime > new Date(contestDeadline);
  const isResultsTime = currentTime > new Date(resultsDate);

  // Check if we have any winners
  const hasWinners = winnerPhotos?.winnerPhotos?.length > 0;

  return (
    <div
      style={{
        backgroundImage: `url(${resultsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">RESULTS</h1>
          <p className="text-xl text-gray-600">Discover the winning poems from our contests</p>
        </div>

        {/* Contest Status */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Contest Status</h2>
              
              {!isAfterDeadline ? (
                <div>
                  <p className="text-lg text-gray-700 mb-4">Submissions are still open!</p>
                  <p className="text-sm text-gray-600 mb-6">Deadline: {new Date(contestDeadline).toLocaleDateString()}</p>
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <p className="text-green-800 font-semibold">🎯 Submit your poem now!</p>
                  </div>
                </div>
              ) : !isResultsTime ? (
                <div>
                  <p className="text-lg text-gray-700 mb-4">Submissions are closed. Results will be announced in:</p>
                  <CountdownTimer targetDate={resultsDate} />
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mt-4">
                    <p className="text-yellow-800 font-semibold">⏳ Winners will be announced soon!</p>
                  </div>
                </div>
              ) : hasWinners ? (
                <div>
                  <p className="text-lg text-gray-700 mb-4">🎉 Results have been announced!</p>
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <p className="text-green-800 font-semibold">🏆 Check out the winners below!</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-lg text-gray-700 mb-4">Results announcement time has passed</p>
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                    <p className="text-blue-800 font-semibold">📋 Winners will be uploaded by admin soon!</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Winners Display */}
        {hasWinners && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {winnerPhotos.winnerPhotos.map((winner: any) => (
              <Card key={winner.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center">
                    {/* Winner Photo or Placeholder */}
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {winner.photoUrl ? (
                        <img 
                          src={winner.photoUrl} 
                          alt={`${winner.winnerName}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${winner.photoUrl ? 'hidden' : ''}`}>
                        <User className="text-gray-400" size={32} />
                      </div>
                    </div>

                    {/* Position Badge */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      winner.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      winner.position === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                      'bg-gradient-to-br from-orange-400 to-orange-600'
                    }`}>
                      <Trophy className="text-white" size={24} />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {winner.position === 1 ? '1st Place' : 
                       winner.position === 2 ? '2nd Place' : '3rd Place'}
                    </h3>
                    <p className="text-gray-600 mb-2 font-medium">{winner.winnerName}</p>
                    <p className="text-sm text-gray-500 mb-3">"{winner.poemTitle}"</p>
                    
                    {/* Score */}
                    <div className="bg-gray-100 rounded-lg p-2 mb-3">
                      <p className="text-sm font-semibold text-gray-700">Score: {winner.score}/100</p>
                    </div>

                    {/* Instagram Handle */}
                    {winner.instagramHandle && (
                      <p className="text-sm text-blue-600 mb-2">@{winner.instagramHandle}</p>
                    )}

                    <div className="flex items-center justify-center text-sm text-gray-500">
                      <Calendar className="mr-1" size={14} />
                      {new Date(winner.contestMonth).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Winners Yet Message */}
        {!hasWinners && isResultsTime && (
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Winners Yet to Be Announced</h2>
                <p className="text-gray-700 leading-relaxed">
                  Our judges are carefully evaluating all submissions. Winners will be announced soon with their photos and poem details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About Our Results</h2>
            <p className="text-gray-700 leading-relaxed">
              Our contest results showcase the exceptional talent and creativity of poets from around the world. 
              Each winning poem has been carefully selected based on originality, technical skill, emotional impact, 
              and overall artistic expression. We celebrate these achievements and continue to inspire new generations 
              of poets to share their voices with the world.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}