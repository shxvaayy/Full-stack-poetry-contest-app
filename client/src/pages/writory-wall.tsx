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
  const [expandedPosts, setExpandedPosts] = useState<{ [id: number]: boolean }>({}); // NEW: Track expanded state

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
    setCardFlipping([true, true, true, true, true]);
    setTimeout(async () => {
      try {
        const response = await fetch('/api/wall-posts');
        const data = await response.json();
        const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
        setDisplayPosts(pickFiveRandom(approved));
      } finally {
        setCardFlipping([false, false, false, false, false]);
      }
    }, 400); // duration of flip out
  };

  // Like handler: update like and update count from backend response
  const handleLike = async (post: WallPost) => {
    if (!userUid) {
      window.location.href = '/auth';
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
      // Optionally, show a toast here if you have a toast system, or do nothing
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
          {displayPosts.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg inline-block">
              <p className="text-black font-semibold">
                No ink spilled yet. Be the first to write.
              </p>
            </div>
          )}
          </div>
        {allPosts.length > 5 && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleRefresh}
              onTouchStart={handleRefresh}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-400 to-purple-400 text-white font-semibold rounded-full shadow-lg hover:from-cyan-500 hover:to-purple-500 transition backdrop-blur-md"
            >
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
              More voices await…
            </Button>
          </div>
        )}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
          {displayPosts.length > 0 && (
            displayPosts.map((post, idx) => (
              <div
                key={post.id}
                className={clsx(
                  'break-inside-avoid p-8 mb-8 group relative overflow-hidden flip-card tilt-card mx-auto max-w-2xl w-full',
                  cardFlipping[idx] && 'flipping'
                )}
                style={{
                  background: cardBgColors[idx % cardBgColors.length],
                  borderRadius: '1.5rem',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
                  transition: 'max-width 0.3s, margin 0.3s',
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const tiltX = ((y - centerY) / centerY) * -10;
                  const tiltY = ((x - centerX) / centerX) * 10;
                  e.currentTarget.style.setProperty('--tilt-x', `${tiltX}deg`);
                  e.currentTarget.style.setProperty('--tilt-y', `${tiltY}deg`);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('--tilt-x', '0deg');
                  e.currentTarget.style.setProperty('--tilt-y', '0deg');
                }}
              >
                <div className="flip-inner">
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
                  <div
                    className={clsx(
                      'text-lg font-medium text-gray-900 font-serif whitespace-pre-line mb-4 group-hover:text-cyan-700 transition',
                      expandedPosts[post.id] && 'max-h-96 overflow-y-auto pr-2'
                    )}
                  >
                    {expandedPosts[post.id]
                      ? post.content
                      : getFirstLines(post.content, 3)}
                    {post.content.split(/\r?\n/).length > 3 && (
                      <button
                        className="ml-2 text-cyan-600 underline text-sm font-semibold hover:text-cyan-800 focus:outline-none"
                        onClick={() => setExpandedPosts((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                      >
                        {expandedPosts[post.id] ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">{post.author_name}</span>
                    {post.author_instagram && (
                      <a href={`https://www.instagram.com/${post.author_instagram.replace(/^@/, '').trim().replace(/[^a-zA-Z0-9._]/g, '').replace(/\/+$/, '')}/`} target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-500 hover:text-cyan-700">
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
                  <div className="absolute right-3 top-3 group-hover:opacity-100 opacity-80 transition cursor-pointer"
                    onClick={() => handleCardRefresh(idx)}
                    onTouchStart={() => handleCardRefresh(idx)}
                  >
                    <RefreshCw className="w-5 h-5 text-cyan-300 hover:text-cyan-600" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .hover\\:animate-bounce-slow:hover {
      animation: bounce-slow 0.7s;
    }
    .tilt-card {
      transform-style: preserve-3d;
      transition: transform 0.3s cubic-bezier(0.4,0.2,0.2,1), box-shadow 0.3s;
    }
    .tilt-card:hover {
      transform: perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(1.02);
    }
    .flip-card {
      perspective: 1200px;
      transition: transform 0.6s cubic-bezier(0.4,0.2,0.2,1), box-shadow 0.6s;
      transform-style: preserve-3d;
    }
    .flip-inner {
      transition: transform 0.6s cubic-bezier(0.4,0.2,0.2,1);
      transform-style: preserve-3d;
    }
    .flipping .flip-inner {
      transform: rotateY(90deg) scale(0.95);
      opacity: 0.5;
    }
  `;
  document.head.appendChild(style);
} 