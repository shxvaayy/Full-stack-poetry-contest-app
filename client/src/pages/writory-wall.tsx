import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Heart, Instagram, User, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WallPost {
  id: number;
  title: string;
  content: string;
  category?: string;
  author_name: string;
  author_instagram?: string;
  author_profile_picture?: string;
  likes: number;
  liked_by?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function WritoryWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [myPosts, setMyPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    instagramHandle: ''
  });

  // Fetch wall posts
  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/wall-posts`);
      const data = await response.json();
      
      setPosts(data.posts);
      setHasMore(false); // No pagination needed since we only show 5 posts
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's own posts
  const fetchMyPosts = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/wall-posts/my-posts', {
        headers: {
          'user-uid': user.uid
        }
      });
      const data = await response.json();
      setMyPosts(data.posts);
    } catch (error) {
      console.error('Error fetching my posts:', error);
    }
  };

  // Submit new post
  const handleSubmit = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "Please log in to submit a post",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/wall-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-uid': user.uid
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category || null,
          instagramHandle: formData.instagramHandle || null
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: data.message
        });
        setShowSubmitDialog(false);
        setFormData({ title: '', content: '', category: '', instagramHandle: '' });
        fetchMyPosts(); // Refresh user's posts
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      toast({
        title: "Error",
        description: "Failed to submit post",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Like/unlike post
  const handleLike = async (postId: number) => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "Please log in to like posts",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/wall-posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'user-uid': user.uid
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update posts state
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes: data.likes, liked_by: data.liked ? JSON.stringify([...(JSON.parse(post.liked_by || '[]')), user.uid]) : JSON.stringify(JSON.parse(post.liked_by || '[]').filter((uid: string) => uid !== user.uid)) }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Check if user liked a post
  const isLiked = (post: WallPost) => {
    if (!user?.uid || !post.liked_by) return false;
    try {
      const likedBy = JSON.parse(post.liked_by);
      return likedBy.includes(user.uid);
    } catch {
      return false;
    }
  };

  // Load more posts
  const loadMore = () => {
    // No pagination needed - only 5 posts total
    return;
  };

  useEffect(() => {
    fetchPosts();
    fetchMyPosts();
  }, [user?.uid]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Writory Wall</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the top 5 most recent approved poems from our community. 
            Each piece is a window into someone's soul.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mb-8">
          <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Submit for Writory Wall
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Your Writing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <Input
                    placeholder="Give your piece a title..."
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content *</label>
                  <Textarea
                    placeholder="Share your poetry or writing here..."
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category (Optional)</label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poetry">Poetry</SelectItem>
                        <SelectItem value="prose">Prose</SelectItem>
                        <SelectItem value="haiku">Haiku</SelectItem>
                        <SelectItem value="sonnet">Sonnet</SelectItem>
                        <SelectItem value="free-verse">Free Verse</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Instagram Handle (Optional)</label>
                    <Input
                      placeholder="@username"
                      value={formData.instagramHandle}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagramHandle: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Pieces Section (for logged-in users) */}
        {user && myPosts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Pieces</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myPosts.map((post) => (
                <Card key={post.id} className="border-l-4 border-purple-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                      <Badge className={getStatusColor(post.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(post.status)}
                          {post.status}
                        </div>
                      </Badge>
                    </div>
                    {post.category && (
                      <Badge variant="secondary" className="w-fit">
                        {post.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4 line-clamp-3">{post.content}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No submissions message */}
        {user && myPosts.length === 0 && (
          <div className="mb-8 text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-600 mb-4">Submit your writings below to see them here.</p>
          </div>
        )}

        {/* Public Wall */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Wall (Top 5 Poems)</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-600">No posts available yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                      {post.category && (
                        <Badge variant="secondary" className="ml-2">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                    
                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                      {post.author_profile_picture ? (
                        <img 
                          src={post.author_profile_picture} 
                          alt={post.author_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{post.author_name}</p>
                        {post.author_instagram && (
                          <a 
                            href={`https://instagram.com/${post.author_instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                          >
                            <Instagram className="w-4 h-4" />
                            Follow
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Engagement */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
                            isLiked(post) 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked(post) ? 'fill-current' : ''}`} />
                          <span>{post.likes}</span>
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Load More Button - Removed since we only show 5 posts total */}
        </div>
      </div>
    </div>
  );
} 