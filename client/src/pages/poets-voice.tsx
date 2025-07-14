// TODO: Ensure /api/poets-voice endpoint is implemented in backend to return random poems with Instagram handles.
// TODO: Add like, comment, and share features in next steps.
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Instagram, Heart, MessageCircle, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy } from "lucide-react";

interface Poem {
  id: number;
  poemTitle: string;
  poemFileUrl: string;
  poemText?: string;
  firstName: string;
  lastName?: string;
  instagramHandle?: string;
}

interface LikeState {
  [poemId: number]: { count: number; liked: boolean };
}

interface Comment {
  id: number;
  name: string;
  comment: string;
  created_at: string;
}

export default function PoetsVoicePage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeState, setLikeState] = useState<LikeState>({});
  const [commentOpen, setCommentOpen] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentName, setCommentName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPoems() {
      setLoading(true);
      try {
        const res = await fetch("/api/poets-voice");
        const data = await res.json();
        setPoems(data.poems || []);
      } catch (err) {
        setPoems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPoems();
  }, []);

  useEffect(() => {
    // Fetch like counts for all poems
    poems.forEach(async (poem) => {
      const res = await fetch(`/api/poems/${poem.id}/likes`);
      const data = await res.json();
      setLikeState((prev) => ({
        ...prev,
        [poem.id]: { count: data.count, liked: false },
      }));
    });
  }, [poems]);

  const handleLike = async (poemId: number) => {
    const liked = likeState[poemId]?.liked;
    if (!liked) {
      await fetch(`/api/poems/${poemId}/like`, { method: "POST" });
      setLikeState((prev) => ({
        ...prev,
        [poemId]: {
          count: (prev[poemId]?.count || 0) + 1,
          liked: true,
        },
      }));
    } else {
      await fetch(`/api/poems/${poemId}/unlike`, { method: "POST" });
      setLikeState((prev) => ({
        ...prev,
        [poemId]: {
          count: Math.max((prev[poemId]?.count || 1) - 1, 0),
          liked: false,
        },
      }));
    }
  };

  const openComments = async (poemId: number) => {
    setCommentOpen(poemId);
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/poems/${poemId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/poems/${commentOpen}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: commentName, comment: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        setCommentName("");
        // Refresh comments
        const data = await res.json();
        toast({ title: "Comment added!" });
        openComments(commentOpen!);
      } else {
        toast({ title: "Failed to add comment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to add comment", variant: "destructive" });
    } finally {
      setCommentLoading(false);
    }
  };

  // Helper to get poem preview/gist
  const getPoemPreview = (poem: Poem) => {
    if (poem.poemText && poem.poemText.trim().length > 0) {
      const words = poem.poemText.split(" ");
      return words.slice(0, 35).join(" ") + (words.length > 35 ? "..." : "");
    }
    return "Preview not available.";
  };

  const getShareUrl = (poem: Poem) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/poets-voice#poem-${poem.id}`;
  };
  const getShareText = (poem: Poem) => `Check out this poem "${poem.poemTitle}" by ${poem.firstName}${poem.lastName ? ' ' + poem.lastName : ''} on Poet's Voice!`;

  return (
    <section className="py-12 min-h-screen bg-gradient-to-br from-pink-50 to-purple-100">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-purple-800">Poet's Voice</h1>
        <p className="text-center text-lg text-gray-700 mb-4">Discover and celebrate the voices of our community poets. Like, comment, and follow them on Instagram!</p>
        <p className="text-center text-sm text-gray-500 mb-8">Only a preview is shown to protect the poet’s work.</p>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin w-8 h-8 text-purple-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {poems.map((poem, idx) => (
              <motion.div
                key={poem.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="shadow-lg border-2 border-purple-200 bg-white/90">
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div>
                      <CardTitle className="text-xl text-purple-800">{poem.poemTitle}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-medium text-gray-700">{poem.firstName} {poem.lastName}</span>
                        {poem.instagramHandle && (
                          <a
                            href={`https://instagram.com/${poem.instagramHandle.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 flex items-center gap-1 text-pink-600 hover:underline"
                          >
                            <Instagram className="w-4 h-4" />
                            <span>Follow</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-gray-800 whitespace-pre-line text-base mb-4">
                      {getPoemPreview(poem)}
                    </div>
                    <div className="flex items-center gap-6 mt-2">
                      <Button
                        variant={likeState[poem.id]?.liked ? "secondary" : "ghost"}
                        size="icon"
                        className={`hover:bg-pink-100 transition-all ${likeState[poem.id]?.liked ? "bg-pink-100" : ""}`}
                        aria-label="Like"
                        onClick={() => handleLike(poem.id)}
                      >
                        <Heart className={`w-5 h-5 ${likeState[poem.id]?.liked ? "fill-pink-500 text-pink-500" : "text-pink-500"}`} />
                        <span className="ml-1 text-pink-600 font-semibold text-base">{likeState[poem.id]?.count || 0}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-purple-100"
                        aria-label="Comment"
                        onClick={() => openComments(poem.id)}
                      >
                        <MessageCircle className="w-5 h-5 text-purple-500" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-blue-100" aria-label="Share">
                            <Share2 className="w-5 h-5 text-blue-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 space-y-2">
                          <div className="font-semibold text-gray-700 mb-2">Share this poem</div>
                          <Button
                            variant="outline"
                            className="w-full flex items-center gap-2"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(getShareText(poem) + ' ' + getShareUrl(poem))}`)}
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5" /> WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full flex items-center gap-2"
                            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText(poem))}&url=${encodeURIComponent(getShareUrl(poem))}`)}
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Twitter-logo.svg" alt="Twitter" className="w-5 h-5" /> Twitter
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full flex items-center gap-2"
                            onClick={() => window.open(`https://www.instagram.com/stories/create/?url=${encodeURIComponent(getShareUrl(poem))}`)}
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" className="w-5 h-5" /> Instagram Story
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full flex items-center gap-2"
                            onClick={async () => { await navigator.clipboard.writeText(getShareText(poem) + ' ' + getShareUrl(poem)); }}
                          >
                            <Copy className="w-4 h-4" /> Copy Link
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={!!commentOpen} onOpenChange={() => setCommentOpen(null)}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-4 mb-4">
            {commentLoading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-gray-400">No comments yet. Be the first!</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="border-b pb-2">
                  <div className="font-semibold text-purple-700 text-sm">{c.name || "Anonymous"}</div>
                  <div className="text-gray-800 text-base">{c.comment}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Your name (optional)"
              value={commentName}
              onChange={e => setCommentName(e.target.value)}
              disabled={commentLoading}
            />
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={2}
              disabled={commentLoading}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}>
              {commentLoading ? "Posting..." : "Post Comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
} 