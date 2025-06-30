The code has been modified to include a results tab with a modal for score breakdown in the user profile page.
```

```replit_final_file
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, RefreshCw, User, Mail, Phone, Calendar, Clock, Award, Eye, Trophy, Target } from 'lucide-react';
import { Link } from "wouter";

interface Submission {
  id: number;
  name: string;
  poemTitle: string;
  tier: string;
  amount: number;
  submittedAt: string;
  isWinner: boolean;
  winnerPosition: number | null;
}

interface SubmissionStatus {
  freeSubmissionUsed: boolean;
  totalSubmissions: number;
  contestMonth: string;
}

interface UserData {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
}

export default function UserProfilePage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [poemResults, setPoemResults] = useState([]);

  // Ensure user exists in backend storage
  const { 
    data: backendUser, 
    isLoading: userLoading,
    refetch: refetchUser 
  } = useQuery<UserData>({
    queryKey: [`/api/users/${user?.uid}`],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user UID");

      const response = await fetch(`/api/users/${user.uid}`);

      if (response.ok) {
        return response.json();
      }

      if (response.status === 404) {
        const createResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'User',
            phone: user.phoneNumber || null
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create user in backend');
        }

        return createResponse.json();
      }

      throw new Error(`Failed to get user: ${response.status}`);
    },
    enabled: !!user?.uid,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Get user submissions
  const { 
    data: submissions = [], 
    isLoading: submissionsLoading, 
    error: submissionsError,
    refetch: refetchSubmissions 
  } = useQuery({
    queryKey: [`/api/users/${user?.uid}/submissions`, backendUser?.id],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user UID");

      const response = await fetch(`/api/users/${user.uid}/submissions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.uid && !!backendUser?.id,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

    // Get poem results
    const {
      data: resultsData,
      isLoading: resultsLoading,
      error: resultsError,
    } = useQuery({
      queryKey: [`/api/poem-results/${user?.uid}`, backendUser?.id],
      queryFn: async () => {
        if (!user?.uid) throw new Error("No user UID");
  
        const response = await fetch(`/api/poem-results/${user.uid}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch poem results: ${response.status}`);
        }
  
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      },
      enabled: !!user?.uid && !!backendUser?.id,
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 0,
      onSuccess: (data) => {
        setPoemResults(data);
      },
    });

  // Get user submission status
  const { 
    data: submissionStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus 
  } = useQuery<SubmissionStatus>({
    queryKey: [`/api/users/${user?.uid}/submission-status`, backendUser?.id],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user UID");

      const response = await fetch(`/api/users/${user.uid}/submission-status`);
      if (!response.ok) {
        throw new Error(`Failed to fetch submission status: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!user?.uid && !!backendUser?.id,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-green-100 text-green-800 border-green-200';
      case 'single': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'double': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'bulk': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'free': return 'Free Entry';
      case 'single': return '1 Poem';
      case 'double': return '2 Poems';
      case 'bulk': return '5 Poems';
      default: return tier;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await refetchUser();
      await Promise.all([refetchSubmissions(), refetchStatus()]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.uid && !backendUser) {
      refetchUser();
    }
  }, [user?.uid, backendUser, refetchUser]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600">You need to be logged in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Link href="/">
                <Button variant="ghost" className="p-2 hover:bg-gray-100">
                  <ArrowLeft size={20} />
                  <span className="ml-2">Back to Home</span>
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600">Manage your account and view submission history</p>
          </div>
          <Button 
            onClick={refreshData} 
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="ml-2">Refresh Data</span>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Information */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2" size={20} />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <User className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {backendUser?.name || user.displayName || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-gray-500">Poet</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <Mail className="mr-2" size={16} />
                  <span className="text-sm">{user.email}</span>
                </div>

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

                <div className="text-sm text-gray-500">
                  <p>Contest Month</p>
                  <p className="font-mono">{submissionStatus?.contestMonth || 'Not set'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submissions History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2" size={20} />
                    Submission History
                  </div>
                  <Link href="/submit">
                    <Button size="sm">Submit New Poem</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
              <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="status">Contest Status</TabsTrigger>
              </TabsList>
                <TabsContent value="profile" className="space-y-4">
                  {/* Profile content here (if any) */}
                  <div>Profile Content</div>
                </TabsContent>

                <TabsContent value="submissions" className="space-y-4">
                  {submissionsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading submissions...</p>
                    </div>
                  ) : submissionsError ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-red-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Submissions</h3>
                      <p className="text-red-500 mb-4">{submissionsError.message}</p>
                      <Button onClick={refreshData} variant="outline">
                        Try Again
                      </Button>
                    </div>
                  ) : (!submissions || submissions.length === 0) ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {submissionStatus?.totalSubmissions > 0 ? "Submissions Not Displaying" : "No submissions yet"}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {submissionStatus?.totalSubmissions > 0 
                          ? "Your submissions exist but are not displaying properly. This might be a sync issue." 
                          : "Start your poetry journey by submitting your first poem!"
                        }
                      </p>
                      <div className="space-x-2">
                        <Link href="/submit">
                          <Button>
                            {submissionStatus?.totalSubmissions > 0 ? "Submit Another Poem" : "Submit Your First Poem"}
                          </Button>
                        </Link>
                        <Button onClick={refreshData} variant="outline">
                          Refresh Data
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission: Submission) => (
                        <div key={submission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{submission.poemTitle}</h4>
                            <div className="flex items-center space-x-2">
                              {submission.isWinner && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  Winner #{submission.winnerPosition}
                                </Badge>
                              )}
                              <Badge className={getTierColor(submission.tier)}>
                                {getTierName(submission.tier)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <Clock size={14} />
                                <span>{formatDate(submission.submittedAt)}</span>
                              </div>
                              {submission.amount > 0 && (
                                <span className="font-medium">₹{submission.amount}</span>
                              )}
                            </div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              ID: {submission.id}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="text-center pt-4">
                        <Link href="/submit">
                          <Button variant="outline">Submit Another Poem</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    AI Evaluation Results
                  </h3>
                </div>

                {resultsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading results...</span>
                  </div>
                ) : poemResults && poemResults.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Poem Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poemResults.map((result: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{result.title}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={result.status === 'Evaluated' ? 'default' : 'secondary'}
                                className={result.status === 'Evaluated' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {result.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={
                                  result.type === 'Human' ? 'border-green-500 text-green-700' :
                                  result.type === 'AI' ? 'border-blue-500 text-blue-700' :
                                  'border-red-500 text-red-700'
                                }
                              >
                                {result.type || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {result.score ? (
                                <span className="font-semibold text-lg">
                                  {result.score}/100
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {result.score && result.originality !== undefined ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Eye className="w-4 h-4 mr-1" />
                                      Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Score Breakdown: {result.title}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="text-center">
                                        <div className="text-3xl font-bold text-green-600">
                                          {result.score}/100
                                        </div>
                                        <div className="text-sm text-gray-600">Overall Score</div>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                          <span className="font-medium">Originality</span>
                                          <span className="text-lg font-semibold">{result.originality || 0}/25</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                          <span className="font-medium">Emotion</span>
                                          <span className="text-lg font-semibold">{result.emotion || 0}/25</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                          <span className="font-medium">Structure</span>
                                          <span className="text-lg font-semibold">{result.structure || 0}/20</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                          <span className="font-medium">Language</span>
                                          <span className="text-lg font-semibold">{result.language || 0}/20</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                          <span className="font-medium">Theme</span>
                                          <span className="text-lg font-semibold">{result.theme || 0}/10</span>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t">
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">Classification:</span>
                                          <Badge 
                                            variant="outline"
                                            className={
                                              result.type === 'Human' ? 'border-green-500 text-green-700' :
                                              result.type === 'AI' ? 'border-blue-500 text-blue-700' :
                                              'border-red-500 text-red-700'
                                            }
                                          >
                                            {result.type}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <Button size="sm" variant="outline" disabled>
                                  Not Available
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center">
                        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No evaluation results available yet.</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Results will appear here once your poems have been evaluated by our AI system.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

                <TabsContent value="status" className="space-y-4">
                  {/* Status content here (if any) */}
                  <div>Status Content</div>
                </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}