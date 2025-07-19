import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, AlertCircle, RotateCcw, Upload, Trophy, Trash2, Bell, Send, Users, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminSettings {
  free_tier_enabled: string;
  result_announcement_date?: string;
  contest_launch_date?: string;
  submission_deadline?: string;
}

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
  updatedAt?: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdminSettings>({
    free_tier_enabled: 'true'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Notification management state
  const [notificationType, setNotificationType] = useState<'individual' | 'broadcast'>('individual');
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    userEmail: '',
    targetUser: ''
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [users, setUsers] = useState<Array<{id: string, email: string, name: string}>>([]);
  
  // Winner photo management state
  const [winnerPhotos, setWinnerPhotos] = useState<WinnerPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  // In the uploadForm state, replace poemTitle with score
  const [uploadForm, setUploadForm] = useState({
    position: '1',
    contestMonth: '',
    contestYear: new Date().getFullYear().toString(),
    winnerName: '',
    score: '',
    photoFile: null as File | null
  });

  // Winner poem management state (for 3 winners)
  const [winnerForms, setWinnerForms] = useState([
    {
      position: '1',
      contestMonth: '',
      contestYear: new Date().getFullYear().toString(),
      winnerName: '',
      poemTitle: '',
      instagramHandle: '',
      score: '',
      photoFile: null as File | null,
      poemFile: null as File | null,
    },
    {
      position: '2',
      contestMonth: '',
      contestYear: new Date().getFullYear().toString(),
      winnerName: '',
      poemTitle: '',
      instagramHandle: '',
      score: '',
      photoFile: null as File | null,
      poemFile: null as File | null,
    },
    {
      position: '3',
      contestMonth: '',
      contestYear: new Date().getFullYear().toString(),
      winnerName: '',
      poemTitle: '',
      instagramHandle: '',
      score: '',
      photoFile: null as File | null,
      poemFile: null as File | null,
    },
  ]);

  // Check if user is admin
  const adminEmails = [
    'shivaaymehra2@gmail.com',
    'bhavyaseth2005@gmail.com'
  ];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  // Show error if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-xl">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Admin Settings</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-xl">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">You don't have permission to access admin settings.</p>
              <Button onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Load current settings and winner photos
  useEffect(() => {
    loadSettings();
    loadWinnerPhotos();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      if (!user?.email) {
        console.log('⚠️ User email not available, skipping users load');
        return;
      }

      console.log('🔍 Loading users with email:', user.email);

      const response = await fetch('/api/admin/users', {
        headers: {
          'x-user-email': user.email,
        },
      });

      console.log('📊 Users response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load users');
      }

      const data = await response.json();
      console.log('📊 Users data:', data);
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('❌ Error loading users:', error);
      // Don't show toast for users loading error as it's not critical
      console.log('⚠️ Users loading failed, continuing without user list');
    }
  };

  const sendNotification = async () => {
    try {
      setSendingNotification(true);

      if (!user?.email) {
        throw new Error('Admin email not available');
      }

      if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
        throw new Error('Title and message are required');
      }

      if (notificationType === 'individual' && !notificationForm.userEmail.trim()) {
        throw new Error('User email is required for individual notification');
      }

      console.log('📤 Sending notification:', {
        type: notificationType,
        title: notificationForm.title,
        message: notificationForm.message,
        userEmail: notificationForm.userEmail,
      });

      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email,
        },
        body: JSON.stringify({
          type: notificationType,
          title: notificationForm.title,
          message: notificationForm.message,
          userEmail: notificationForm.userEmail,
        }),
      });

      console.log('📊 Notification response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send notification');
      }

      const result = await response.json();
      console.log('📊 Notification result:', result);

      toast({
        title: "Success",
        description: `Notification sent successfully to ${notificationType === 'individual' ? 'user' : 'all users'}`,
      });

      // Reset form
      setNotificationForm({
        title: '',
        message: '',
        userEmail: '',
        targetUser: ''
      });
    } catch (error: any) {
      console.error('❌ Error sending notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.email) {
        throw new Error('User email not available for authentication');
      }

      console.log('🔐 Loading settings with user email:', user.email);

      const response = await fetch('/api/admin/settings', {
        headers: {
          'x-user-email': user.email,
        },
      });
      const data = await response.json();

      console.log('📊 Load response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings');
      }

      setSettings(data.settings || {});
    } catch (error: any) {
      console.error('❌ Error loading settings:', error);
      setError(error.message || 'Failed to load admin settings');
      toast({
        title: "Error",
        description: "Failed to load admin settings: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load winner photos
  const loadWinnerPhotos = async () => {
    try {
      if (!user?.email) {
        throw new Error('User email not available for authentication');
      }

      const response = await fetch('/api/admin/winner-photos', {
        headers: {
          'x-user-email': user.email,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load winner photos');
      }

      const data = await response.json();
      setWinnerPhotos(data.winnerPhotos || []);
    } catch (error: any) {
      console.error('❌ Error loading winner photos:', error);
      toast({
        title: "Error",
        description: "Failed to load winner photos: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Upload winner photo
  const uploadWinnerPhoto = async () => {
    try {
      setUploadingPhoto(true);

      if (!user?.email) {
        throw new Error('User email not available for authentication');
      }

      if (!uploadForm.photoFile) {
        throw new Error('Please select a photo file');
      }

      if (!uploadForm.contestMonth) {
        throw new Error('Please enter contest month (YYYY-MM format)');
      }

      const formData = new FormData();
      formData.append('winnerPhoto', uploadForm.photoFile);
      formData.append('position', uploadForm.position);
      formData.append('contestMonth', uploadForm.contestMonth);
      formData.append('contestYear', uploadForm.contestYear);
      formData.append('winnerName', uploadForm.winnerName);
      formData.append('score', uploadForm.score);

      const response = await fetch('/api/admin/winner-photos', {
        method: 'POST',
        headers: {
          'x-user-email': user.email,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload winner photo');
      }

      toast({
        title: "Success",
        description: data.message || "Winner photo uploaded successfully!",
      });

      // Reset form and reload photos
      setUploadForm({
        position: '1',
        contestMonth: '',
        contestYear: new Date().getFullYear().toString(),
        winnerName: '',
        score: '',
        photoFile: null
      });
      loadWinnerPhotos();

    } catch (error: any) {
      console.error('❌ Error uploading winner photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload winner photo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete winner photo
  const deleteWinnerPhoto = async (photoId: number) => {
    try {
      setDeletingPhoto(photoId);

      if (!user?.email) {
        throw new Error('User email not available for authentication');
      }

      const response = await fetch(`/api/admin/winner-photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': user.email,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete winner photo');
      }

      toast({
        title: "Success",
        description: "Winner photo deleted successfully!",
      });

      loadWinnerPhotos();

    } catch (error: any) {
      console.error('❌ Error deleting winner photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete winner photo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingPhoto(null);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      if (!user?.email) {
        throw new Error('User email not available for authentication');
      }

      console.log('🔐 Saving settings with user email:', user.email);

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email,
        },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();
      console.log('📊 Save response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }
        toast({
          title: "Success",
          description: "Admin settings updated successfully! Changes are now live.",
        });
        
        // Force a reload of the current settings to ensure UI reflects changes
        setTimeout(() => {
          loadSettings();
        }, 500);
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save admin settings: " + error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof AdminSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value ? 'true' : 'false'
    }));
  };

  const resetFreeTierSubmissions = async () => {
    try {
      setResetting(true);

      if (!user?.email) {
        throw new Error('User email not available for authentication');
      }

      console.log('🔄 Resetting free tier submissions...');

      const response = await fetch('/api/admin/reset-free-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email,
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Reset failed with status:', response.status, errorText);
        throw new Error(`Failed to reset free tier submissions (${response.status})`);
      }

      const data = await response.json();
      console.log('📊 Reset response:', data);

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Free tier submissions have been reset. All users can now submit the form again once.",
        });
      } else {
        throw new Error(data.error || 'Failed to reset free tier submissions');
      }

    } catch (error: any) {
      console.error('❌ Error resetting free tier:', error);
      toast({
        title: "Error",
        description: "Failed to reset free tier submissions: " + error.message,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  // Add handler for uploading all winners
  const handleWinnersUpload = async () => {
    try {
      setUploadingPhoto(true);
      if (!user?.email) throw new Error('User email not available for authentication');
      for (const form of winnerForms) {
        if (
          !form.winnerName.trim() ||
          !form.poemTitle.trim() ||
          !form.instagramHandle.trim() ||
          !form.score.trim() ||
          !(form.photoFile instanceof File) ||
          !(form.poemFile instanceof File)
        ) {
          toast({ title: 'Missing Fields', description: 'Please fill all fields and upload files for each winner.', variant: 'destructive' });
          setUploadingPhoto(false);
          return;
        }
        const formData = new FormData();
        formData.append('winnerPhoto', form.photoFile);
        formData.append('poemFile', form.poemFile);
        formData.append('position', form.position);
        formData.append('contestMonth', form.contestMonth);
        formData.append('contestYear', form.contestYear);
        formData.append('winnerName', form.winnerName);
        formData.append('poemTitle', form.poemTitle);
        formData.append('instagramHandle', form.instagramHandle);
        formData.append('score', form.score);
        const response = await fetch('/api/admin/winner-photos', {
          method: 'POST',
          headers: { 'x-user-email': user.email },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to upload winner');
      }
      toast({ title: 'Success', description: 'All winners uploaded successfully!' });
      loadWinnerPhotos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteAllWinners = async () => {
    if (!window.confirm('Are you sure you want to delete all winner entries for this contest? This cannot be undone.')) return;
    try {
      setUploadingPhoto(true);
      if (!user?.email) throw new Error('User email not available for authentication');
      // Load all winner photos for this contest
      const contestMonth = winnerForms[0].contestMonth;
      const contestYear = winnerForms[0].contestYear;
      const response = await fetch(`/api/admin/winner-photos?contestMonth=${contestMonth}&contestYear=${contestYear}`, {
        headers: { 'x-user-email': user.email },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load winners');
      const ids = (data.winnerPhotos || []).map((w: any) => w.id);
      for (const id of ids) {
        await fetch(`/api/admin/winner-photos/${id}`, {
          method: 'DELETE',
          headers: { 'x-user-email': user.email },
        });
      }
      toast({ title: 'Success', description: 'All winners deleted for this contest.' });
      loadWinnerPhotos();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Helper to format date string for datetime-local input (local time, not UTC)
  function toDatetimeLocal(dateStr?: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading admin settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center">
            <Settings className="mr-2" size={32} />
            Admin Settings
          </h1>
          <p className="text-lg text-gray-600">
            Control platform features and submissions
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Submission Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Free Tier Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="free-tier-toggle" className="text-base font-medium">
                  Free Tier Submissions
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Enable or disable free tier poem submissions for all users
                </p>
              </div>
              <Switch
                id="free-tier-toggle"
                checked={settings.free_tier_enabled === 'true'}
                onCheckedChange={(checked) => handleToggle('free_tier_enabled', checked)}
              />
            </div>

            {/* Contest Timeline */}
            <Card className="shadow-xl mt-6">
              <CardHeader>
                <CardTitle>Contest Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-gray-50 rounded-lg gap-4">
                  <div className="flex-1">
                    <Label htmlFor="contest-launch-date" className="text-base font-medium">
                      Contest Launch Date
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Set the date when the contest launches and submissions open
                    </p>
                  </div>
                  <Input
                    id="contest-launch-date"
                    type="datetime-local"
                    value={toDatetimeLocal(settings.contest_launch_date)}
                    onChange={e => setSettings(prev => ({ ...prev, contest_launch_date: e.target.value }))}
                    className="w-full lg:w-56"
                  />
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-gray-50 rounded-lg gap-4">
                  <div className="flex-1">
                    <Label htmlFor="submission-deadline" className="text-base font-medium">
                      Submission Deadline
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Set the last date for poem submissions
                    </p>
                  </div>
                  <Input
                    id="submission-deadline"
                    type="datetime-local"
                    value={toDatetimeLocal(settings.submission_deadline)}
                    onChange={e => setSettings(prev => ({ ...prev, submission_deadline: e.target.value }))}
                    className="w-full lg:w-56"
                  />
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-gray-50 rounded-lg gap-4">
                  <div className="flex-1">
                    <Label htmlFor="result-announcement-date" className="text-base font-medium">
                      Results Announcement Date & Time
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Set the date and time when contest results will be announced (affects all public pages)
                    </p>
                  </div>
                  <Input
                    id="result-announcement-date"
                    type="datetime-local"
                    value={toDatetimeLocal(settings.result_announcement_date)}
                    onChange={e => setSettings(prev => ({ ...prev, result_announcement_date: e.target.value }))}
                    className="w-full lg:w-56"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status Display */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Current Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Free Tier:</span>
                  <span className={`font-medium ${
                    settings.free_tier_enabled === 'true' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {settings.free_tier_enabled === 'true' ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Contest Launch Date:</span>
                  <span className="font-medium">
                    {settings.contest_launch_date ? new Date(settings.contest_launch_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Submission Deadline:</span>
                  <span className="font-medium">
                    {settings.submission_deadline ? new Date(settings.submission_deadline).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Result Announcement Date:</span>
                  <span className="font-medium">
                    {settings.result_announcement_date ? new Date(settings.result_announcement_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-4">
              {/* Reset Free Tier Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={resetting}
                    className="border-red-200 text-red-700 hover:bg-red-50 w-full sm:w-auto"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Free Tier
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Free Tier Submissions</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reset all Free Tier submissions? All users will be able to submit the form again once.
                      <br /><br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetFreeTierSubmissions}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Reset All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Save Settings Button */}
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="min-w-32 w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Management Card */}
        <Card className="shadow-xl mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Type Selection */}
            <div className="flex items-center space-x-4">
              <Label className="text-base font-medium">Notification Type:</Label>
              <Select value={notificationType} onValueChange={(value: 'individual' | 'broadcast') => setNotificationType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Individual User
                    </div>
                  </SelectItem>
                  <SelectItem value="broadcast">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      All Users
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Individual User Selection */}
            {notificationType === 'individual' && (
              <div className="space-y-2">
                <Label htmlFor="user-email" className="text-base font-medium">
                  Select User:
                </Label>
                <Select 
                  value={notificationForm.userEmail} 
                  onValueChange={(value) => setNotificationForm(prev => ({ ...prev, userEmail: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notification Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="notification-title" className="text-base font-medium">
                  Notification Title:
                </Label>
                <Input
                  id="notification-title"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter notification title..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="notification-message" className="text-base font-medium">
                  Notification Message:
                </Label>
                <Textarea
                  id="notification-message"
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter notification message..."
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>

            {/* Send Notification Button */}
            <div className="flex justify-end">
              <Button
                onClick={sendNotification}
                disabled={sendingNotification || !notificationForm.title.trim() || !notificationForm.message.trim() || (notificationType === 'individual' && !notificationForm.userEmail.trim())}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {sendingNotification ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Winner Details Upload Card */}
        <Card className="shadow-xl mt-8">
          <CardHeader>
            <CardTitle>Upload Winner Details (Photo, Poem, etc.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {winnerForms.map((form, idx) => (
                <div key={form.position} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-bold mb-2">{form.position === '1' ? '1st Place' : form.position === '2' ? '2nd Place' : '3rd Place'} Winner</h3>
                  <div className="mb-2">
                    <Label>Contest Month (YYYY-MM)</Label>
                    <Input value={form.contestMonth} onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].contestMonth = e.target.value;
                      setWinnerForms(updated);
                    }} placeholder="2024-12" />
                  </div>
                  <div className="mb-2">
                    <Label>Contest Year</Label>
                    <Input value={form.contestYear} onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].contestYear = e.target.value;
                      setWinnerForms(updated);
                    }} placeholder="2025" />
                  </div>
                  <div className="mb-2">
                    <Label>Winner Name</Label>
                    <Input value={form.winnerName} onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].winnerName = e.target.value;
                      setWinnerForms(updated);
                    }} placeholder="Poet Name" />
                  </div>
                  <div className="mb-2">
                    <Label>Poem Title</Label>
                    <Input value={form.poemTitle} onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].poemTitle = e.target.value;
                      setWinnerForms(updated);
                    }} placeholder="Poem Title" />
                  </div>
                  <div className="mb-2">
                    <Label>Instagram Handle</Label>
                    <Input value={form.instagramHandle} onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].instagramHandle = e.target.value;
                      setWinnerForms(updated);
                    }} placeholder="@username" />
                  </div>
                  <div className="mb-2">
                    <Label>Score</Label>
                    <Input value={form.score} onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].score = e.target.value;
                      setWinnerForms(updated);
                    }} placeholder="Score" />
                  </div>
                  <div className="mb-2">
                    <Label>Winner Photo</Label>
                    <Input type="file" accept="image/*" onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].photoFile = e.target.files?.[0] || null;
                      setWinnerForms(updated);
                    }} />
                  </div>
                  <div className="mb-2">
                    <Label>Poem File (.txt)</Label>
                    <Input type="file" accept=".txt" onChange={e => {
                      const updated = [...winnerForms];
                      updated[idx].poemFile = e.target.files?.[0] || null;
                      setWinnerForms(updated);
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button 
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" 
                onClick={handleWinnersUpload} 
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All Winners
                  </>
                )}
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                variant="destructive" 
                onClick={handleDeleteAllWinners} 
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All Winners (Reset)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Warning Card */}
        <Card className="shadow-xl mt-6 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Important Notes</h3>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• When free tier is disabled, users cannot submit poems using the free option</li>
                  <li>• Users will see an error message directing them to paid tiers</li>
                  <li>• Existing free submissions will not be affected</li>
                  <li>• Changes take effect immediately after saving</li>
                  <li>• <strong>Reset Free Tier:</strong> Allows all users to submit the free form again, even if they've already submitted</li>
                  <li>• After reset, users can submit once more, then the same restrictions apply</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}