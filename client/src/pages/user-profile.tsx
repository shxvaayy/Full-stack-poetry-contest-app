
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { User, Calendar, Trophy, FileText, Award, BarChart3, Loader2 } from 'lucide-react';
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

      // Add cache-busting parameter to force fresh data
      const timestamp = Date.now();

      // Fetch user details
      const userResponse = await fetch(`/api/users/${user!.uid}?t=${timestamp}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setBackendUser(userData);
      }

      // Fetch user submissions with cache-busting
      const submissionsResponse = await fetch(`/api/users/${user!.uid}/submissions?t=${timestamp}`);
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        console.log('📝 Fetched submissions:', submissionsData);
        setSubmissions(submissionsData);
      }

      // Fetch submission status
      const statusResponse = await fetch(`/api/users/${user!.uid}/submission-status?t=${timestamp}`);
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-green-100 text-green-800';
      case 'single': return 'bg-blue-100 text-blue-800';
      case 'multiple': return 'bg-purple-100 text-purple-800';
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Human': return 'bg-green-100 text-green-800';
      case 'AI': return 'bg-orange-100 text-orange-800';
      case 'Copied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
                  <span className="text-sm font-medium">Total Submissions</span>
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
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
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
                            <Badge className={getTierColor(submission.tier)}>
                              {submission.tier}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No submissions yet.</p>
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
                      My Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.length > 0 ? (
                      <div className="space-y-4">
                        {submissions.map((submission) => (
                          <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{submission.poemTitle}</h3>
                                <p className="text-gray-600 text-sm mb-2">
                                  Submitted on {formatDate(submission.submittedAt)}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getTierColor(submission.tier)}>
                                    {submission.tier}
                                  </Badge>
                                  {submission.isWinner && (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      <Award className="mr-1" size={12} />
                                      Winner #{submission.winnerPosition}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                  ₹{submission.amount}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-gray-600">No submissions yet.</p>
                        <Button className="mt-4" onClick={() => window.location.href = '/submit'}>
                          Submit Your First Poem
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="mr-2" size={20} />
                      Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.length > 0 ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Poem Title</th>
                                <th className="text-left p-2">Status</th>
                                <th className="text-left p-2">Type</th>
                                <th className="text-left p-2">Score</th>
                                <th className="text-left p-2">Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {submissions.map((submission) => (
                                <tr key={submission.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-medium">{submission.poemTitle}</td>
                                  <td className="p-2">
                                    <Badge className={getStatusColor(submission.status || 'Pending')}>
                                      {submission.status || 'Pending'}
                                    </Badge>
                                  </td>
                                  <td className="p-2">
                                    <Badge className={getTypeColor(submission.type || 'Human')}>
                                      {submission.type || 'Human'}
                                    </Badge>
                                  </td>
                                  <td className="p-2">
                                    <span className="text-lg font-bold text-green-600">
                                      {submission.score || 0}/100
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          View Breakdown
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>{submission.poemTitle} - Score Breakdown</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="text-center">
                                            <div className="text-3xl font-bold text-green-600">
                                              {submission.score || 0}/100
                                            </div>
                                            <div className="text-gray-600">Overall Score</div>
                                          </div>
                                          <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                              <span>Originality:</span>
                                              <span className="font-bold">
                                                {submission.scoreBreakdown?.originality || 0}/25
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span>Emotion:</span>
                                              <span className="font-bold">
                                                {submission.scoreBreakdown?.emotion || 0}/25
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span>Structure:</span>
                                              <span className="font-bold">
                                                {submission.scoreBreakdown?.structure || 0}/20
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span>Language:</span>
                                              <span className="font-bold">
                                                {submission.scoreBreakdown?.language || 0}/20
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span>Theme:</span>
                                              <span className="font-bold">
                                                {submission.scoreBreakdown?.theme || 0}/10
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Award className="mx-auto text-gray-400 mb-4" size={48} />
                        <p className="text-gray-600 mb-2">No submissions yet.</p>
                        <p className="text-sm text-gray-500">
                          Submit your first poem to see evaluation results here.
                        </p>
                        <Button className="mt-4" onClick={() => window.location.href = '/submit'}>
                          Submit Your First Poem
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
