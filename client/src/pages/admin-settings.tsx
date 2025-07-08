import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
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

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdminSettings>({
    free_tier_enabled: 'true'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  // Load current settings
  useEffect(() => {
    loadSettings();
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
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('📊 Reset response (text):', text);
        data = { message: text };
      }

      console.log('📊 Reset response:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to reset free tier submissions');
      }

      toast({
        title: "Success",
        description: `✅ Free Tier submissions have been reset. All users can now submit the form again once.`,
      });

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

            {/* Reset Information */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Free Tier Reset:</strong> When you disable and then re-enable the free tier, 
                all users will be able to submit the free form again, regardless of their previous submissions.
              </AlertDescription>
            </Alert>

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