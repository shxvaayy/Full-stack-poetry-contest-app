
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Search, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Submission {
  id: number;
  name: string;
  email: string;
  poemTitle: string;
  tier: string;
  isWinner: boolean;
  winnerPosition: number | null;
  winnerCategory: string | null;
  score: number | null;
}

export default function AdminWinnerManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);

  // Check if user is admin
  const adminEmails = [
    'shivaaymehra2@gmail.com',
    'shiningbhavya.seth@gmail.com'
  ];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  useEffect(() => {
    if (isAdmin) {
      fetchSubmissions();
    }
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/submissions');
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWinnerStatus = async (submissionId: number, updates: Partial<Submission>) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/update-winner/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update winner status');
      }

      // Update local state
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId ? { ...sub, ...updates } : sub
        )
      );

      toast({
        title: "Success",
        description: "Winner status updated successfully",
      });
    } catch (error) {
      console.error('Error updating winner status:', error);
      toast({
        title: "Error",
        description: "Failed to update winner status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.poemTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalWinners = submissions.filter(sub => sub.isWinner).length;
  const winnersByPosition = submissions.reduce((acc, sub) => {
    if (sub.isWinner && sub.winnerPosition) {
      acc[sub.winnerPosition] = (acc[sub.winnerPosition] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading submissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center">
            <Trophy className="mr-2 text-yellow-500" size={32} />
            Winner Management
          </h1>
          <p className="text-lg text-gray-600">
            Manage winners and their positions
          </p>
        </div>

        {/* Winner Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{totalWinners}</div>
              <div className="text-sm text-gray-600">Total Winners</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-gold-600 mb-2">{winnersByPosition[1] || 0}</div>
              <div className="text-sm text-gray-600">1st Place</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-silver-600 mb-2">{winnersByPosition[2] || 0}</div>
              <div className="text-sm text-gray-600">2nd Place</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-bronze-600 mb-2">{winnersByPosition[3] || 0}</div>
              <div className="text-sm text-gray-600">3rd Place</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or poem title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions ({filteredSubmissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Poem Title</th>
                    <th className="text-left p-3">Tier</th>
                    <th className="text-left p-3">Score</th>
                    <th className="text-left p-3">Winner</th>
                    <th className="text-left p-3">Position</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{submission.name}</td>
                      <td className="p-3">{submission.email}</td>
                      <td className="p-3">{submission.poemTitle}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          submission.tier === 'free' ? 'bg-green-100 text-green-800' :
                          submission.tier === 'single' ? 'bg-blue-100 text-blue-800' :
                          submission.tier === 'double' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {submission.tier}
                        </span>
                      </td>
                      <td className="p-3">{submission.score || 'N/A'}</td>
                      <td className="p-3">
                        <Switch
                          checked={submission.isWinner}
                          onCheckedChange={(checked) => 
                            updateWinnerStatus(submission.id, { 
                              isWinner: checked,
                              winnerPosition: checked ? submission.winnerPosition : null
                            })
                          }
                          disabled={saving}
                        />
                      </td>
                      <td className="p-3">
                        {submission.isWinner && (
                          <Select
                            value={submission.winnerPosition?.toString() || ''}
                            onValueChange={(value) => 
                              updateWinnerStatus(submission.id, { 
                                winnerPosition: value ? parseInt(value) : null 
                              })
                            }
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="Pos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1st</SelectItem>
                              <SelectItem value="2">2nd</SelectItem>
                              <SelectItem value="3">3rd</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3">
                        {submission.isWinner && (
                          <Input
                            value={submission.winnerCategory || ''}
                            onChange={(e) => {
                              setSubmissions(prev => 
                                prev.map(sub => 
                                  sub.id === submission.id 
                                    ? { ...sub, winnerCategory: e.target.value }
                                    : sub
                                )
                              );
                            }}
                            onBlur={() => 
                              updateWinnerStatus(submission.id, { 
                                winnerCategory: submission.winnerCategory 
                              })
                            }
                            placeholder="Category"
                            className="w-32"
                          />
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSubmission(submission)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
