import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, FileText, Trophy, Clock, ArrowLeft } from "lucide-react";
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

export default function UserProfilePage() {
  const { user } = useAuth();

  // Get user submissions with better error handling
  const { 
    data: submissions = [], 
    isLoading: submissionsLoading, 
    error: submissionsError,
    refetch: refetchSubmissions 
  } = useQuery({
    queryKey: [`/api/users/${user?.uid}/submissions`],
    enabled: !!user?.uid,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
  });

  // Get user submission status
  const { 
    data: submissionStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus 
  } = useQuery<SubmissionStatus>({
    queryKey: [`/api/users/${user?.uid}/submission-status`],
    enabled: !!user?.uid,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
  });

  // Debug logging
  console.log("🔍 Profile Debug:", {
    userUid: user?.uid,
    submissionsLoading,
    submissionsError: submissionsError?.message,
    submissionsCount: submissions?.length,
    submissions,
    submissionStatus
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
    await Promise.all([refetchSubmissions(), refetchStatus()]);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="mr-2" size={16} />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600">Manage your account and view submission history</p>
            </div>
            <Button onClick={refreshData} variant="outline" size="sm">
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2" size={20} />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <User className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-gray-500">Poet</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail size={16} />
                  <span className="text-sm">{user.email}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar size={16} />
                  <span className="text-sm">
                    Joined {new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Submission Status Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2" size={20} />
                  Submission Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Submissions</span>
                      <Badge variant="secondary">{submissionStatus?.totalSubmissions || 0}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Free Entry Used</span>
                      <Badge variant={submissionStatus?.freeSubmissionUsed ? "destructive" : "secondary"}>
                        {submissionStatus?.freeSubmissionUsed ? "Used" : "Available"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Contest Month</span>
                      <span className="text-sm font-medium">{submissionStatus?.contestMonth}</span>
                    </div>

                    <div className="text-xs text-gray-400 pt-2 border-t">
                      <p>User ID: {user.uid}</p>
                      <p>Last Updated: {new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}
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
                    <Button onClick={refetchSubmissions} variant="outline">
                      Try Again
                    </Button>
                  </div>
                ) : (!submissions || submissions.length === 0) ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {submissionStatus?.totalSubmissions > 0 ? "Submissions Not Showing" : "No submissions yet"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {submissionStatus?.totalSubmissions > 0 
                        ? "Your submissions are not displaying properly. Please refresh or contact support." 
                        : "Start your poetry journey by submitting your first poem!"
                      }
                    </p>
                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-gray-400">Debug Info:</p>
                      <p className="text-xs text-gray-400">Total from status: {submissionStatus?.totalSubmissions || 0}</p>
                      <p className="text-xs text-gray-400">Submissions array length: {submissions?.length || 0}</p>
                      <p className="text-xs text-gray-400">Error: {submissionsError?.message || 'None'}</p>
                    </div>
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
                                🏆 Winner #{submission.winnerPosition}
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