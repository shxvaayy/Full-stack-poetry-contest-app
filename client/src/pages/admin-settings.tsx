import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, AlertCircle, RotateCcw, Upload, Trophy, Trash2 } from 'lucide-react';
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

interface AdminSettings {
  free_tier_enabled: string;
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
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

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
              </div>
            </div>

            

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              {/* Reset Free Tier Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={resetting}
                    className="border-red-200 text-red-700 hover:bg-red-50"
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
                className="min-w-32"
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

        {/* Winner Details Upload Card */}
        <Card className="shadow-xl mt-8">
          <CardHeader>
            <CardTitle>Upload Winner Details (Photo, Poem, etc.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <Button className="mt-6" onClick={handleWinnersUpload} disabled={uploadingPhoto}>
              {uploadingPhoto ? 'Uploading...' : 'Upload All Winners'}
            </Button>
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