import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, FileText, Trophy, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
