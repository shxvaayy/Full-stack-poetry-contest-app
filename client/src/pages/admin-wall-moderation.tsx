import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Trash2, Eye, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const AdminWallModerationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, pagination.page]);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/wall-posts/admin?status=${statusFilter}&page=${pagination.page}&limit=${pagination.limit}`, {
        headers: {
          'admin-email': user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
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

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select posts to delete",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedPosts.size} posts? This cannot be undone.`)) {
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch('/api/wall-posts/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admin-email': user?.email || '',
        },
        body: JSON.stringify({
          postIds: Array.from(selectedPosts)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete posts');
      }

      toast({
        title: "Success",
        description: `${selectedPosts.size} posts deleted successfully`,
      });

      setSelectedPosts(new Set());
      fetchPosts();
    } catch (error) {
      console.error('Error bulk deleting posts:', error);
      toast({
        title: "Error",
        description: "Failed to delete posts",
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPosts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select posts to approve",
        variant: "destructive",
      });
      return;
    }
    setBulkLoading(true);
    try {
      const response = await fetch('/api/wall-posts/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admin-email': user?.email || '',
        },
        body: JSON.stringify({
          postIds: Array.from(selectedPosts)
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to approve posts');
      }
      toast({
        title: "Success",
        description: `${selectedPosts.size} posts approved successfully`,
      });
      setSelectedPosts(new Set());
      fetchPosts();
    } catch (error) {
      console.error('Error bulk approving posts:', error);
      toast({
        title: "Error",
        description: "Failed to approve posts",
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(new Set(posts.map(post => post.id)));
    } else {
      setSelectedPosts(new Set());
    }
  };

  const handleSelectPost = (postId: string, checked: boolean) => {
    const newSelected = new Set(selectedPosts);
    if (checked) {
      newSelected.add(postId);
    } else {
      newSelected.delete(postId);
    }
    setSelectedPosts(newSelected);
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

      <div className="flex justify-between items-center mb-6">
        <Select onValueChange={(value) => setStatusFilter(value)} value={statusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {selectedPosts.size > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve All
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete {selectedPosts.size} Selected
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-gray-500">No wall posts to moderate</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Bulk Selection Header */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Checkbox
                checked={selectedPosts.size === posts.length && posts.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedPosts.size > 0 ? `${selectedPosts.size} selected` : 'Select all'}
              </span>
            </div>

            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedPosts.has(post.id)}
                        onCheckedChange={(checked) => handleSelectPost(post.id, checked as boolean)}
                      />
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
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} posts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminWallModerationPage; 