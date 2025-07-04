import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { User, Calendar, Trophy, FileText, Award, BarChart3, Loader2, Clock, CheckCircle, XCircle, Edit2, Camera, Upload } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface BackendUser {
  id: number;
  email: string;
  name: string | null;
  uid: string;
  phone: string | null;
  createdAt: string;
  profilePictureUrl?: string | null;
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
  submissionUuid: string;
  poems: { id: number; title: string; fileUrl?: string }[];
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (user?.uid) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to fetch user data for:', user?.uid);

      // Set up fallback user data first
      const fallbackUser = {
        uid: user!.uid,
        email: user!.email || '',
        name: user!.displayName || user!.email?.split('@')[0] || 'User',
        phone: user!.phoneNumber || null,
        id: null,
        createdAt: new Date().toISOString(),
        profilePictureUrl: null,
      };

      // Set fallback data immediately to prevent infinite loading
      setBackendUser(fallbackUser);
      setDisplayName(fallbackUser.name);
      setSubmissions([]);
      setSubmissionStatus({
        freeSubmissionUsed: false,
        totalSubmissions: 0,
        contestMonth: new Date().toISOString().slice(0, 7),
        allTimeSubmissions: 0
      });

      // Force loading to false after 2 seconds max
      const forceFinishTimeout = setTimeout(() => {
        console.log('⏰ Force finishing loading after 2 seconds');
        setLoading(false);
      }, 2000);

      try {
        // Try to get user data with longer timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const userResponse = await fetch(`/api/users/${user!.uid}`, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          }
        });

        clearTimeout(timeoutId);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('✅ User data fetched:', userData.email);

          // Update with real data (use Cloudinary URL directly)
          const finalUserData = {
            ...userData,
            profilePictureUrl: userData.profilePictureUrl || null,
          };

          setBackendUser(finalUserData);
          setDisplayName(userData.name || user?.displayName || user?.email?.split('@')[0] || 'User');

          // Load submissions and status sequentially to avoid overwhelming
          try {
            const submissionsRes = await fetch(`/api/users/${user!.uid}/submissions`);
            if (submissionsRes.ok) {
              const submissionsData = await submissionsRes.json();
              const grouped = new Map();

              submissionsData.forEach((sub: any) => {
                const uuid = sub.submissionUuid || `single-${sub.id}`;
                if (!grouped.has(uuid)) {
                  grouped.set(uuid, {
                    id: sub.id,
                    name: sub.name,
                    tier: sub.tier,
                    amount: sub.amount,
                    submittedAt: sub.submittedAt,
                    submissionUuid: uuid,
                    poems: []
                  });
                }
                grouped.get(uuid).poems.push({
                  id: sub.id,
                  title: sub.poemTitle,
                  score: sub.score,
                  status: sub.status,
                  type: sub.type,
                  isWinner: sub.isWinner,
                  winnerPosition: sub.winnerPosition,
                  scoreBreakdown: sub.scoreBreakdown
                });
              });

              setSubmissions(Array.from(grouped.values()));
            }
          } catch (submissionError) {
            console.log('Submissions fetch failed:', submissionError);
          }

          try {
            const statusRes = await fetch(`/api/users/${user!.uid}/submission-status`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setSubmissionStatus(statusData);
            }
          } catch (statusError) {
            console.log('Status fetch failed:', statusError);
          }

        } else {
          console.log('User not in database, using Firebase fallback data');
          // Already set fallback data above
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback data already set above

        toast({
          title: "Connection Issue",
          description: "Using basic profile data. Try refreshing if needed.",
          variant: "destructive",
        });
      }

      // Clear the force finish timeout since we're done
      clearTimeout(forceFinishTimeout);

    } catch (error) {
      console.error('Fetch user data error:', error);
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
    if (user?.uid && !loading) {
      await fetchUserData();
    }
  };

  const updateUserProfile = async () => {
    console.log('Update profile called with:', { 
      editName: editName?.trim(), 
      editEmail: editEmail?.trim(),
      userUid: user?.uid,
      hasProfilePicture: !!profilePicture
    });

    if (!user?.uid || !editName?.trim() || !editEmail?.trim()) {
      toast({
        title: "Error",
        description: "Name and email cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail?.trim() || '')) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Request Timeout",
        description: "The update is taking too long. Please try again.",
        variant: "destructive",
      });
    }, 15000); // 15 second timeout

    try {
      // Prepare FormData for multipart upload
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('email', editEmail.trim());
      
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      console.log('Sending update request to:', `/api/users/${user.uid}/update-profile`);

      // Add timeout for API call
      const controller = new AbortController();
      const apiTimeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for API

      const response = await fetch(`/api/users/${user.uid}/update-profile`, {
        method: 'PUT',
        body: formData, // Use FormData instead of JSON
        credentials: 'same-origin',
        signal: controller.signal
      });

      clearTimeout(apiTimeoutId);
      console.log('Response status:', response.status);

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('Updated user data from server:', updatedUser);

        // Update local state immediately
        setBackendUser(updatedUser);
        setDisplayName(updatedUser.name);

        // Close dialog and reset form
        setIsEditDialogOpen(false);
        setProfilePicture(null);
        setProfilePicturePreview("");

        // Notify header to update
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: updatedUser
        }));

        console.log('✅ Profile update events dispatched');

        toast({
          title: "Profile Updated!",
          description: "Your profile has been successfully updated.",
        });

        // Force a refresh of user data to ensure persistence
        setTimeout(() => {
          fetchUserData();
        }, 500);

      } else {
        let errorData;
        try {
          const responseText = await response.text();
          console.log('Raw response text:', responseText);

          try {
            errorData = JSON.parse(responseText);
          } catch (jsonError) {
            errorData = { error: responseText || `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }

        console.error('Update profile error response:', errorData);

        if (response.status === 400) {
          const errorMessage = errorData.error || errorData.message || "Validation error";

          if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('taken')) {
            toast({
              title: "Email Already Taken",
              description: "This email is already registered to another user. Please use a different email.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Validation Error",
              description: errorMessage,
              variant: "destructive",
            });
          }
          return;
        } else if (response.status === 404) {
          toast({
            title: "User Not Found",
            description: "Creating your profile... Please try again in a moment.",
          });
          return;
        } else if (response.status === 500 || response.status >= 500) {
          toast({
            title: "Server Error",
            description: "There was a server issue. Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(errorData.error || errorData.message || `Failed to update profile (${response.status})`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);

      let errorMessage = "Failed to update profile. Please try again.";

      if (error.name === 'AbortError') {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message && !error.message.includes('Failed to update profile')) {
        errorMessage = error.message;
      }

      toast({
        title: "Update Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId);
      setIsUpdating(false);
    }
  };

  const handleProfilePictureChange = (file: File | null) => {
    setProfilePicture(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePicturePreview("");
    }
  };

  const openEditDialog = () => {
    const currentName = backendUser?.name || user?.displayName || '';
    const currentEmail = backendUser?.email || user?.email || '';

    console.log('Opening edit dialog with:', { currentName, currentEmail });

    setEditName(currentName);
    setEditEmail(currentEmail);
    setProfilePicture(null);
    setProfilePicturePreview(backendUser?.profilePictureUrl || "");
    setIsEditDialogOpen(true);
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

  // ✅ Check if results are announced (only show results if there are winners or evaluated poems with actual scores > 0)
  const hasAnnouncedResults = useMemo(() => 
    submissions.some(s => 
      s.poems.some((p: any) => 
        (p.status === 'Evaluated' && p.score !== undefined && p.score !== null && p.score > 0) || 
        p.isWinner
      )
    ), [submissions]
  );

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
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {backendUser?.profilePictureUrl ? (
                    <img 
                      src={`${backendUser.profilePictureUrl}?t=${Date.now()}`}
                      alt="Profile" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-green-500"
                      loading="lazy"
                      onError={(e) => {
                        console.log('Profile image failed to load');
                        e.currentTarget.style.display = 'none';
                        setBackendUser(prev => prev ? { ...prev, profilePictureUrl: null } : null);
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                      <User className="text-white" size={32} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CardTitle className="text-xl">
                    {backendUser?.name || user?.displayName || 'User'}
                  </CardTitle>
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openEditDialog}
                        className="p-1 h-8 w-8"
                      >
                        <Edit2 size={14} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        {/* Profile Picture Upload */}
                        <div className="space-y-4">
                          <Label>Profile Picture</Label>
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                              {profilePicturePreview ? (
                                <img 
                                  src={profilePicturePreview} 
                                  alt="Profile Preview" 
                                  className="w-full h-full object-cover"
                                  key={`preview-${Date.now()}`}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <User className="text-gray-400" size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleProfilePictureChange(e.target.files?.[0] || null)}
                                className="w-full"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Upload JPG, PNG, or GIF (max 5MB)
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full"
                            placeholder="Enter your email"
                          />
                        </div>
                        <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <p>⚠️ <strong>Important:</strong> Email is used for poem submissions and must be unique. Changing it will affect future submissions.</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditDialogOpen(false)}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={updateUserProfile}
                          disabled={isUpdating || !editName?.trim() || !editEmail?.trim()}
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-gray-600 text-sm">{backendUser?.email || user?.email}</p>
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
                          {submissions.reduce((total, s) => total + s.poems.length, 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total Poems</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {submissions.reduce((count, s) => {
                            const winCount = s.poems.filter((p: any) => p.isWinner === true).length;
                            console.log('Submission:', s.submissionUuid, 'Win count:', winCount, 'Poems:', s.poems.map(p => ({ title: p.title, isWinner: p.isWinner })));
                            return count + winCount;
                          }, 0)}
                        </div>
                        <div className="text-sm text-gray-600">Wins</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {submissions.reduce((count, s) => 
                            count + s.poems.filter((p: any) => 
                              p.status === 'Evaluated' && p.score !== undefined && p.score !== null && p.score > 0
                            ).length, 0
                          )}
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
                        {submissions.slice(0, 5).map((submission) => {
                          return (
                            <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">
                                  {submission.poems && submission.poems.length > 1 
                                    ? `${submission.poems.length} Poems Submission` 
                                    : submission.poems?.[0]?.title || submission.poemTitle || 'Poem Submission'
                                  }
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatDate(submission.submittedAt)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getTierColor(submission.tier)}>
                                  {submission.tier}
                                </Badge>
                                {/* Show individual poem statuses */}
                                {submission.poems && submission.poems.length > 0 ? (
                                  <div className="flex flex-col space-y-1">
                                    {submission.poems.map((poem: any, index: number) => {
                                      // Fix: Only show 'Evaluated' if status is explicitly 'Evaluated' AND has a real score
                                      const actualStatus = (poem.status === 'Evaluated' && 
                                        poem.score !== undefined && 
                                        poem.score !== null && 
                                        poem.score > 0) 
                                        ? 'Evaluated' 
                                        : 'Pending';

                                      return (
                                        <Badge key={index} className={getStatusColor(actualStatus)} size="sm">
                                          {getStatusIcon(actualStatus)}
                                          <span className="ml-1">{actualStatus}</span>
                                          {submission.poems.length > 1 && <span className="ml-1">({index + 1})</span>}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <Badge className={getStatusColor('Pending')}>
                                    {getStatusIcon('Pending')}
                                    <span className="ml-1">Pending</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                          <Card key={submission.submissionUuid} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{submission.poems.length > 1 
                                    ? `${submission.poems.length} Poems Submission` 
                                    : submission.poems[0]?.title || 'Poem Submission'
                                  }</h3>
                                <p className="text-gray-600 text-sm mb-2">
                                  Submitted on {formatDate(submission.submittedAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-green-600">
                                  ₹{submission.amount}
                                </p>
                              </div>
                            </div>

                            {/* Show all poems in this submission */}
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">
                                Poem{submission.poems.length > 1 ? 's' : ''} ({submission.poems.length}):
                              </h4>
                              <div className="space-y-2">
                                {submission.poems.map((poem, index) => (
                                  <div key={poem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-medium">
                                      {index + 1}. {poem.title}
                                    </span>
                                    {poem.fileUrl && (
                                      <a 
                                        href={poem.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        View File
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge className={getTierColor(submission.tier)}>
                                {submission.tier}
                              </Badge>
                            </div>
                          </Card>
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
              <TabsContent value="results" className="space-y-6">
                {hasAnnouncedResults ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Trophy className="mr-2 text-yellow-500" size={20} />
                        Contest Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Winners */}
                      {submissions.some(s => s.poems.some((p: any) => p.isWinner)) && (
                        <div className="mb-6">
                          <h3 className="font-semibold text-lg mb-3">🏆 Your Winning Poems</h3>
                          <div className="space-y-3">
                            {submissions.map(submission => 
                              submission.poems.filter((p: any) => p.isWinner).map((winner: any) => (
                                <div key={winner.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold">{winner.title}</h4>
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
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Evaluated Poems */}
                      {submissions.some(s => s.poems.some((p: any) => p.status === 'Evaluated' && p.score > 0 && !p.isWinner)) && (
                        <div>
                          <h3 className="font-semibold text-lg mb-3">📊 Evaluated Poems</h3>
                          <div className="space-y-3">
                            {submissions.map(submission => 
                              submission.poems.filter((p: any) => p.status === 'Evaluated' && p.score > 0 && !p.isWinner).map((poem: any) => (
                                <div key={poem.id} className="p-4 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold">{poem.title}</h4>
                                      <p className="text-sm text-gray-600">Evaluated</p>
                                      {poem.type && (
                                        <Badge className={getTypeColor(poem.type)} size="sm">
                                          {poem.type}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      {poem.score && (
                                        <div className="text-lg font-bold text-blue-600">
                                          Score: {poem.score}/100
                                        </div>
                                      )}
                                      {poem.scoreBreakdown && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="mt-2">
                                              View Details
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle>Score Breakdown: {poem.title}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-3">
                                              <div className="flex justify-between">
                                                <span>Originality:</span>
                                                <span className="font-medium">{poem.scoreBreakdown.originality}/25</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Emotion:</span>
                                                <span className="font-medium">{poem.scoreBreakdown.emotion}/25</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Structure:</span>
                                                <span className="font-medium">{poem.scoreBreakdown.structure}/20</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Language:</span>
                                                <span className="font-medium">{poem.scoreBreakdown.language}/20</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Theme:</span>
                                                <span className="font-medium">{poem.scoreBreakdown.theme}/10</span>
                                              </div>
                                              <hr />
                                              <div className="flex justify-between font-bold">
                                                <span>Total:</span>
                                                <span>{poem.score}/100</span>
                                              </div>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {!submissions.some(s => s.poems.some((p: any) => p.isWinner || (p.status === 'Evaluated' && p.score !== undefined && p.score > 0))) && (
                        <div className="text-center py-8">
                          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                          <p className="text-gray-600">Results not yet available for your submissions.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Clock className="mx-auto text-gray-400 mb-4" size={48} />
                      <h3 className="text-lg font-semibold mb-2">Results Not Yet Available</h3>
                      <p className="text-gray-600">Contest results will be displayed here once the evaluation process is complete.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}