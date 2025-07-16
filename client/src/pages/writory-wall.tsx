import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Instagram, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import brickWallBg from '@/assets/brick-wall-bg.jpg';
import './writory-wall-font.css';
import { clsx } from 'clsx';

interface WallPost {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_instagram?: string;
  likes: number;
  status: 'pending' | 'approved' | 'rejected';
  likedBy?: string[]; // for local state
  authorProfilePicture?: string; // Added for profile picture
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
  const [isFlipping, setIsFlipping] = useState(false);
  const [cardFlipping, setCardFlipping] = useState<boolean[]>([false, false, false, false, false]);

  // Helper to pick 5 unique random poems from a pool
  function pickFiveRandom(posts: WallPost[]): WallPost[] {
    if (posts.length <= 5) return posts;
    const shuffled = [...posts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }

  // Fetch posts helper
  const fetchWallPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wall-posts');
      const data = await response.json();
      const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
      setAllPosts(approved);
      setDisplayPosts(pickFiveRandom(approved));
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

  // On mount and userUid change, fetch and show 5 random poems
  useEffect(() => {
    fetchWallPosts();
  }, [userUid]);

  // Main refresh: pick 5 new random poems
  const handleRefresh = async () => {
    setIsFlipping(true);
    setTimeout(async () => {
      try {
        const response = await fetch('/api/wall-posts');
        const data = await response.json();
        const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
        setDisplayPosts(pickFiveRandom(approved));
      } finally {
        setIsFlipping(false);
      }
    }, 400); // duration of flip out
  };

  // Like handler: update like and update count from backend response
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
          'user-uid': userUid,
        },
        // No body, no Content-Type
      });
      const data = await res.json();
      console.log('Like API response:', data); // Debug
      // Update like count and liked state for this poem in displayPosts
      setDisplayPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes: data.likes } : p));
      setLikedPosts((prev) => ({ ...prev, [post.id]: data.liked }));
    } catch (e) {
      alert('Failed to like/unlike. Please try again.');
    } finally {
      setLikeLoading((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  // Per-card refresh handler: replace only the selected poem
  const handleCardRefresh = async (replaceIdx: number) => {
    setCardFlipping((prev) => prev.map((v, i) => (i === replaceIdx ? true : v)));
    setTimeout(async () => {
      try {
        const response = await fetch('/api/wall-posts');
        const data = await response.json();
        const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
        // Find poems not currently displayed
        const currentIds = new Set(displayPosts.map((p) => p.id));
        const notShown = approved.filter((p) => !currentIds.has(p.id));
        if (notShown.length === 0) {
          setCardFlipping((prev) => prev.map((v, i) => (i === replaceIdx ? false : v)));
          return; // No new poems to swap in
        }
        // Pick a random new poem
        const newPoem = notShown[Math.floor(Math.random() * notShown.length)];
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
        setCardFlipping((prev) => prev.map((v, i) => (i === replaceIdx ? false : v)));
      }
    }, 400); // duration of flip out
  };

  const cardBgColors = [
    '#ffe4ec', // Light Pink
    '#e0f0ff', // Light Blue
    '#e6ffed', // Light Green
    '#f2f2f2', // Light Grey
    '#ffe5e5', // Light Red
  ];
  const cardHeadingColors = [
    '#d63384', // Dark Pink
    '#0056b3', // Dark Blue
    '#218739', // Dark Green
    '#444444', // Dark Grey
    '#c0392b', // Dark Red
  ];

  return (
    <div
      className="min-h-screen py-8"
      style={{
        backgroundImage: `url(${brickWallBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-extrabold mb-2 drop-shadow-lg tracking-wide writory-wall-heading"
            // Removed uppercase for graffiti style
            style={{ letterSpacing: '0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.10)' }}
          >
            Writory Wall
          </h1>
          <p className="writory-wall-subtitle max-w-2xl mx-auto font-serif">
            Poems penned by hearts like yours.
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
          {displayPosts.length === 0 ? (
            <div className="text-center text-gray-400">No ink spilled yet. Be the first to write.</div>
          ) : (
            displayPosts.map((post, idx) => (
              <div
                key={post.id}
                className={clsx(
                  'break-inside-avoid p-8 mb-6 group relative overflow-hidden flip-card',
                  isFlipping && 'flipping',
                  cardFlipping[idx] && 'flipping'
                )}
                style={{
                  background: cardBgColors[idx % cardBgColors.length],
                  borderRadius: '1.5rem',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
                }}
              >
                <div
                  className="mb-2"
                  style={{
                    color: cardHeadingColors[idx % cardHeadingColors.length],
                    fontWeight: 'bold',
                    fontSize: '1.25rem',
                    textShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {post.title}
                </div>
                <div className="text-lg font-medium text-gray-900 font-serif whitespace-pre-line mb-4 group-hover:text-cyan-700 transition">
                  {getFirstLines(post.content, 3)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-700">{post.author_name}</span>
                  {post.author_instagram && (
                    <a href={`https://instagram.com/${encodeURIComponent(post.author_instagram.replace(/^@/, '').trim())}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-500 hover:text-cyan-700">
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
                    <span className="ml-1 text-xs text-cyan-700 font-bold">{typeof post.likes === 'number' ? post.likes : 0}</span>
                  </Button>
                </div>
                <div className="absolute right-3 top-3 group-hover:opacity-100 opacity-80 transition cursor-pointer" onClick={() => handleCardRefresh(idx)}>
                  <RefreshCw className="w-5 h-5 text-cyan-300 hover:text-cyan-600" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 