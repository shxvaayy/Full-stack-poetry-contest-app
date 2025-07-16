import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Trash2, Eye } from "lucide-react";

interface WallPost {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  title: string;
  content: string;
  instagram_handle?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  likes: number;
}

const AdminWallModerationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/wall-posts/admin", {
        headers: {
          'admin-email': user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch wall posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (postId: string, action: "approve" | "reject" | "delete") => {
    setActionLoading(postId);
    try {
      const response = await fetch(`/api/wall-posts/${postId}/${action}`, {
        method: "POST",
        headers: {
          'admin-email': user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} post`);
      }

      toast({
        title: "Success",
        description: `Post ${action}d successfully`,
      });

      // Refresh the posts list
      fetchPosts();
    } catch (error) {
      console.error(`Error ${action}ing post:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} post`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wall Post Moderation</h1>
        <p className="text-gray-600">
          Review and moderate user submissions for the Writory Wall
        </p>
      </div>

      <div className="grid gap-6">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-gray-500">No wall posts to moderate</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{post.title}</CardTitle>
                      {getStatusBadge(post.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>By: {post.user_name}</span>
                      <span>•</span>
                      <span>{post.user_email}</span>
                      {post.instagram_handle && (
                        <>
                          <span>•</span>
                          <span>@{post.instagram_handle}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(post.created_at)}</span>
                      <span>•</span>
                      <span>{post.likes} likes</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="prose max-w-none mb-6">
                  <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex items-center gap-3">
                  {post.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleAction(post.id, "approve")}
                        disabled={actionLoading === post.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleAction(post.id, "reject")}
                        disabled={actionLoading === post.id}
                        variant="destructive"
                      >
                        {actionLoading === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={() => handleAction(post.id, "delete")}
                    disabled={actionLoading === post.id}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {actionLoading === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminWallModerationPage; 