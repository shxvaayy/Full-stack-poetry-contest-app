import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Instagram, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

interface WallPost {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_instagram?: string;
  likes: number;
  status: 'pending' | 'approved' | 'rejected';
  likedBy?: string[]; // for local state
}

function getFirstLines(text: string, lines = 3) {
  return text.split(/\r?\n/).slice(0, lines).join('\n');
}

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function WritoryWall() {
  const { user } = useAuth();
  const userUid = user?.uid;
  const [allPosts, setAllPosts] = useState<WallPost[]>([]);
  const [displayPosts, setDisplayPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState<{ [id: number]: boolean }>({});
  const [likedPosts, setLikedPosts] = useState<{ [id: number]: boolean }>({});

  // Fetch posts helper
  const fetchWallPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wall-posts');
      const data = await response.json();
      const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
      setAllPosts(approved);
      setDisplayPosts(approved);
      // Set liked state for current user
      const liked: { [id: number]: boolean } = {};
      approved.forEach((post: any) => {
        if (post.likedBy && userUid) {
          try {
            const arr = typeof post.likedBy === 'string' ? JSON.parse(post.likedBy) : post.likedBy;
            liked[post.id] = arr.includes(userUid);
          } catch {}
        }
      });
      setLikedPosts(liked);
    } catch (e) {
      setAllPosts([]);
      setDisplayPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all approved posts on mount and when userUid changes
  useEffect(() => {
    fetchWallPosts();
  }, [userUid]);

  // Refresh handler: swap one poem with a new, not-currently-visible, random approved poem
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wall-posts');
      const data = await response.json();
      const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
      // Find poems not currently displayed
      const currentIds = new Set(displayPosts.map((p) => p.id));
      const notShown = approved.filter((p) => !currentIds.has(p.id));
      if (notShown.length === 0) {
        setLoading(false);
        return; // No new poems to swap in
      }
      // Pick a random new poem
      const newPoem = notShown[Math.floor(Math.random() * notShown.length)];
      // Pick a random index to replace in the current display
      const replaceIdx = Math.floor(Math.random() * displayPosts.length);
      const newDisplay = [...displayPosts];
      newDisplay[replaceIdx] = newPoem;
      setDisplayPosts(newDisplay);
      // Update liked state for new poem
      const liked: { [id: number]: boolean } = { ...likedPosts };
      if (newPoem.likedBy && userUid) {
        try {
          const arr = typeof newPoem.likedBy === 'string' ? JSON.parse(newPoem.likedBy) : newPoem.likedBy;
          liked[newPoem.id] = arr.includes(userUid);
        } catch {}
      }
      setLikedPosts(liked);
    } catch (e) {
      // fallback: do nothing
    } finally {
      setLoading(false);
    }
  };

  // Like handler: update like and refetch poems
  const handleLike = async (post: WallPost) => {
    if (!userUid) {
      alert('Please sign in to like poems!');
      return;
    }
    if (likeLoading[post.id]) return;
    setLikeLoading((prev) => ({ ...prev, [post.id]: true }));
    try {
      const res = await fetch(`/api/wall-posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-uid': userUid,
        },
      });
      await res.json();
      // Refetch poems to update like count and state
      fetchWallPosts();
    } catch (e) {
      alert('Failed to like/unlike. Please try again.');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8e1ff] via-[#e0f7fa] to-[#ffe6e6] bg-fixed bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-cyan-700 mb-2 font-cursive drop-shadow-lg tracking-wide uppercase">Writory Wall</h1>
          <p className="text-lg font-bold text-cyan-900 max-w-2xl mx-auto font-serif tracking-widest uppercase">
            POEMS PENNED BY HEARTS LIKE YOURS.
          </p>
        </div>
        {allPosts.length > 5 && (
          <div className="flex justify-center mb-6">
            <Button onClick={handleRefresh} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold rounded-full shadow-lg hover:from-cyan-500 hover:to-purple-500 transition backdrop-blur-md">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
              More voices await…
            </Button>
          </div>
        )}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
          {loading ? (
            <div className="text-center text-gray-400">Loading…</div>
          ) : displayPosts.length === 0 ? (
            <div className="text-center text-gray-400">No ink spilled yet. Be the first to write.</div>
          ) : (
            displayPosts.map((post) => (
              <div
                key={post.id}
                className="break-inside-avoid rounded-3xl bg-white/30 backdrop-blur-xl border-2 border-cyan-300/70 shadow-2xl p-8 mb-6 hover:shadow-cyan-400/40 hover:-translate-y-1 hover:scale-[1.03] transition-all duration-300 group relative overflow-hidden"
                style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}
              >
                <div className="mb-2">
                  <span className="block text-2xl font-extrabold text-cyan-700 font-cursive drop-shadow-sm truncate" title={post.title}>{post.title}</span>
                </div>
                <div className="text-lg font-medium text-gray-900 font-serif whitespace-pre-line mb-4 group-hover:text-cyan-700 transition">
                  {getFirstLines(post.content, 3)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-700">{post.author_name}</span>
                  {post.author_instagram && (
                    <a href={`https://instagram.com/${post.author_instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-500 hover:text-cyan-700">
                      <Instagram className="inline w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-1 text-cyan-700 hover:bg-cyan-100 px-3 py-1 rounded-full font-bold text-base shadow-md border border-cyan-300/60 ${likeLoading[post.id] ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleLike(post)}
                  >
                    {likedPosts[post.id] ? <Heart className="w-5 h-5 fill-cyan-500 text-cyan-500 drop-shadow" /> : <Heart className="w-5 h-5" />}
                    <span className="font-semibold">Feel this</span>
                    <span className="ml-1 text-xs text-cyan-700 font-bold">{post.likes}</span>
                  </Button>
                </div>
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
                  <RefreshCw className="w-5 h-5 text-cyan-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 