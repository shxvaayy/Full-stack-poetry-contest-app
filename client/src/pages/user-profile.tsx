import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { User, Calendar, Trophy, FileText, Award, BarChart3, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface BackendUser {
  id: number;
  email: string;
  name: string | null;
  uid: string;
  phone: string | null;
  createdAt: string;
}

interface Submission {
  id: number;
  name: string;
  poemTitle: string;
  tier: string;
  amount: number;
  submittedAt: string;
  isWinner: boolean;
  winnerPosition: number | null;
  score?: number;
  type?: 'Human' | 'AI' | 'Copied';
  status?: 'Pending' | 'Evaluated' | 'Rejected';
  scoreBreakdown?: {
    originality: number;
    emotion: number;
    structure: number;
    language: number;
    theme: number;
  };
  submissionUuid?: string;
  poemIndex?: number;
  totalPoemsInSubmission?: number;
}

interface SubmissionStatus {
  freeSubmissionUsed: boolean;
  totalSubmissions: number;
  contestMonth: string;
  allTimeSubmissions: number;
}

export default function UserProfile() {
  const { user, dbUser } = useAuth();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user?.uid) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user details
      const userResponse = await fetch(`/api/users/${user!.uid}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setBackendUser(userData);
      }

      // Fetch user submissions
      const submissionsResponse = await fetch(`/api/users/${user!.uid}/submissions`);
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData);
      }

      // Fetch submission status
      const statusResponse = await fetch(`/api/users/${user!.uid}/submission-status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSubmissionStatus(statusData);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const refreshData = async () => {
    if (user?.uid) {
      await fetchUserData();
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-green-100 text-green-800';
      case 'single': return 'bg-blue-100 text-blue-800';
      case 'double': return 'bg-purple-100 text-purple-800';
      case 'bulk': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Evaluated': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Evaluated': return <CheckCircle className="text-green-600" size={16} />;
      case 'Pending': return <Clock className="text-yellow-600" size={16} />;
      case 'Rejected': return <XCircle className="text-red-600" size={16} />;
      default: return <Clock className="text-gray-600" size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Human': return 'bg-green-100 text-green-800';
      case 'AI': return 'bg-orange-100 text-orange-800';
      case 'Copied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ Check if results are announced (only show results if there are winners or evaluated poems)
  const hasAnnouncedResults = submissions.some(s => s.status === 'Evaluated' || s.score !== undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-lg">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-gray-600">You need to be logged in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-white" size={32} />
                </div>
                <CardTitle className="text-xl">
                  {user.displayName || backendUser?.name || 'User'}
                </CardTitle>
                <p className="text-gray-600 text-sm">{user.email}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Calendar className="mr-2" size={16} />
                  <span className="text-sm">
                    Joined {backendUser ? formatDate(backendUser.createdAt) : 'Recently'}
                  </span>
                </div>
                <Button 
                  onClick={refreshData} 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  Refresh Data
                </Button>
              </CardContent>
            </Card>

            {/* Submission Status */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2" size={20} />
                  Submission Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">This Month</span>
                  <span className="text-2xl font-bold text-green-600">
                    {submissionStatus?.totalSubmissions || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Free Entry Used</span>
                  <span className={`text-sm font-medium ${
                    submissionStatus?.freeSubmissionUsed ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {submissionStatus?.freeSubmissionUsed ? 'Used' : 'Available'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">All Time</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {submissionStatus?.allTimeSubmissions || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="submissions">My Submissions</TabsTrigger>
  <TabsTrigger value="results">Results</TabsTrigger>
</TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2" size={20} />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {submissions.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Poems</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {submissions.filter(s => s.isWinner).length}
                        </div>
                        <div className="text-sm text-gray-600">Wins</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {submissions.filter(s => s.status === 'Evaluated').length}
                        </div>
                        <div className="text-sm text-gray-600">Evaluated</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.length > 0 ? (
                      <div className="space-y-3">
                        {submissions.slice(0, 5).map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{submission.poemTitle}</div>
                              <div className="text-sm text-gray-600">
                                {formatDate(submission.submittedAt)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getTierColor(submission.tier)}>
                                {submission.tier}
                              </Badge>
                              <Badge className={getStatusColor(submission.status || 'Pending')}>
                                {getStatusIcon(submission.status || 'Pending')}
                                <span className="ml-1">{submission.status || 'Pending'}</span>
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-gray-600">No submissions yet.</p>
                        <Button 
                          className="mt-4"
                          onClick={() => window.location.href = '/submit'}
                        >
                          Submit Your First Poem
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Submissions Tab */}
              <TabsContent value="submissions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2" size={20} />
                      My Submissions ({submissions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.length > 0 ? (
                      <div className="space-y-4">
                        {submissions.map((submission) => (
                          <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">{submission.poemTitle}</h3>
                                  {submission.poemIndex && submission.totalPoemsInSubmission && submission.totalPoemsInSubmission > 1 && (
                                    <Badge variant="outline" className="text-xs">
                                      Poem {submission.poemIndex} of {submission.totalPoemsInSubmission}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm mb-2">
                                  Submitted on {formatDate(submission.submittedAt)}
                                  {submission.submissionUuid && submission.totalPoemsInSubmission > 1 && (
                                    <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                      Bulk Submission ID: {submission.submissionUuid.slice(-8)}
                                    </span>
                                  )}
                                </p>
                                <div className="flex items-center space-x-2 flex-wrap gap-2">
                                  <Badge className={getTierColor(submission.tier)}>
                                    {submission.tier}
                                  </Badge>
                                  <Badge className={getStatusColor(submission.status || 'Pending')}>
                                    {getStatusIcon(submission.status || 'Pending')}
                                    <span className="ml-1">{submission.status || 'Pending'}</span>
                                  </Badge>
                                  {submission.isWinner && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      <Award className="mr-1" size={12} />
                                      Winner #{submission.winnerPosition}
                                    </Badge>
                                  )}
                                  {submission.score && (
                                    <Badge variant="outline">
                                      Score: {submission.score}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-green-600">
                                  ₹{submission.amount}
                                </p>
                                {submission.poemIndex === 1 && submission.totalPoemsInSubmission > 1 && (
                                  <p className="text-xs text-gray-500">
                                    (Payment for {submission.totalPoemsInSubmission} poems)
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* ✅ Show score breakdown only if evaluated */}
                            {submission.scoreBreakdown && submission.status === 'Evaluated' && (
                              <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium mb-2">Score Breakdown:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                                  <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="font-semibold">{submission.scoreBreakdown.originality}</div>
                                    <div className="text-xs text-gray-600">Originality</div>
                                  </div>
                                  <div className="text-center p-2 bg-red-50 rounded">
                                    <div className="font-semibold">{submission.scoreBreakdown.emotion}</div>
                                    <div className="text-xs text-gray-600">Emotion</div>
                                  </div>
                                  <div className="text-center p-2 bg-green-50 rounded">
                                    <div className="font-semibold">{submission.scoreBreakdown.structure}</div>
                                    <div className="text-xs text-gray-600">Structure</div>
                                  </div>
                                  <div className="text-center p-2 bg-purple-50 rounded">
                                    <div className="font-semibold">{submission.scoreBreakdown.language}</div>
                                    <div className="text-xs text-gray-600">Language</div>
                                  </div>
                                  <div className="text-center p-2 bg-yellow-50 rounded">
                                    <div className="font-semibold">{submission.scoreBreakdown.theme}</div>
                                    <div className="text-xs text-gray-600">Theme</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-gray-600">No submissions yet.</p>
                        <Button 
                          className="mt-4"
                          onClick={() => window.location.href = '/submit'}
                        >
                          Submit Your First Poem
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ✅ Results Tab - Only shown if results are announced */}
              {hasAnnouncedResults && (
                <TabsContent value="results" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Trophy className="mr-2 text-yellow-500" size={20} />
                        Contest Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Winners */}
                      {submissions.filter(s => s.isWinner).length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-semibold text-lg mb-3">🏆 Your Winning Poems</h3>
                          <div className="space-y-3">
                            {submissions.filter(s => s.isWinner).map((winner) => (
                              <div key={winner.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold">{winner.poemTitle}</h4>
                                    <p className="text-sm text-gray-600">Position #{winner.winnerPosition}</p>
                                  </div>
                                  <div className="text-right">
                                    {winner.score && (
                                      <div className="text-lg font-bold text-yellow-600">
                                        Score: {winner.score}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evaluated Poems */}
                      {submissions.filter(s => s.status === 'Evaluated' && !s.isWinner).length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-3">📊 Evaluated Poems</h3>
                          <div className="space-y-3">
                            {submissions.filter(s => s.status === 'Evaluated' && !s.isWinner).map((poem) => (
                              <div key={poem.id} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold">{poem.poemTitle}</h4>
                                    <p className="text-sm text-gray-600">Evaluated</p>
                                  </div>
                                  <div className="text-right">
                                    {poem.score && (
                                      <div className="text-lg font-bold text-blue-600">
                                        Score: {poem.score}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {submissions.filter(s => s.isWinner || s.status === 'Evaluated').length === 0 && (
                        <div className="text-center py-8">
                          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                          <p className="text-gray-600">Results not yet available for your submissions.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}