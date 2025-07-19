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
  const [cardFlipStates, setCardFlipStates] = useState<{ flipping: boolean, content: WallPost }[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<{ [id: number]: boolean }>({}); // NEW: Track expanded state
  const [flipKey, setFlipKey] = useState(0); // NEW

  // Helper to initialize cardFlipStates
  function initCardFlipStates(posts: WallPost[]): { flipping: boolean, content: WallPost }[] {
    return posts.slice(0, 5).map((p) => ({ flipping: false, content: p }));
  }

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
      setCardFlipStates(initCardFlipStates(approved));
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
      setCardFlipStates([]);
    } finally {
      setLoading(false);
    }
  };

  // On mount and userUid change, fetch and show 5 random poems
  useEffect(() => {
    fetchWallPosts();
  }, [userUid]);

  // Main refresh: flip all cards
  const handleRefresh = async () => {
    setCardFlipStates((prev) => prev.map((c) => ({ ...c, flipping: true })));
    setTimeout(async () => {
      try {
        const response = await fetch('/api/wall-posts');
        const data = await response.json();
        const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
        const newStates = prev => prev.map((c, i) => ({ ...c, content: approved[i % approved.length] }));
        setCardFlipStates(newStates);
      } finally {
        setTimeout(() => setCardFlipStates((prev) => prev.map((c) => ({ ...c, flipping: false }))), 350);
      }
    }, 350);
  };

  // Like handler: update like and update count from backend response
  const handleLike = async (post: WallPost) => {
    if (!userUid) {
      window.location.href = '/auth';
      return;
    }
    if (likeLoading[post.id]) return;
    setLikeLoading((prev: { [id: number]: boolean }) => ({ ...prev, [post.id]: true }));
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
      setDisplayPosts((prev: WallPost[]) => prev.map((p: WallPost) => p.id === post.id ? { ...p, likes: data.likes } : p));
      setLikedPosts((prev: { [id: number]: boolean }) => ({ ...prev, [post.id]: data.liked }));
    } catch (e) {
      // Optionally, show a toast here if you have a toast system, or do nothing
    } finally {
      setLikeLoading((prev: { [id: number]: boolean }) => ({ ...prev, [post.id]: false }));
    }
  };

  // Per-card refresh handler
  const handleCardRefresh = async (replaceIdx: number) => {
    setCardFlipStates((prev) => prev.map((c, i) => i === replaceIdx ? { ...c, flipping: true } : c));
    setTimeout(async () => {
      try {
        const response = await fetch('/api/wall-posts');
        const data = await response.json();
        const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
        const currentIds = new Set(cardFlipStates.map((c) => c.content.id));
        const notShown = approved.filter((p) => !currentIds.has(p.id));
        if (notShown.length === 0) {
          setCardFlipStates((prev) => prev.map((c, i) => i === replaceIdx ? { ...c, flipping: false } : c));
          return;
        }
        const newPoem = notShown[Math.floor(Math.random() * notShown.length)];
        setCardFlipStates((prev) => prev.map((c, i) => i === replaceIdx ? { ...c, content: newPoem } : c));
      } finally {
        setTimeout(() => setCardFlipStates((prev) => prev.map((c, i) => i === replaceIdx ? { ...c, flipping: false } : c)), 350);
      }
    }, 350);
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
          {cardFlipStates.length > 0 && (
            cardFlipStates.map((card, idx) => (
              <div
                key={card.content.id}
                className={clsx(
                  'break-inside-avoid p-8 mb-8 group relative overflow-hidden flip-card tilt-card mx-auto max-w-2xl w-full',
                  card.flipping && 'flipping'
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
                  const tiltX = ((y - centerY) / centerY) * -15;
                  const tiltY = ((x - centerX) / centerX) * 15;
                  e.currentTarget.style.setProperty('--tilt-x', `${tiltX}deg`);
                  e.currentTarget.style.setProperty('--tilt-y', `${tiltY}deg`);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('--tilt-x', '0deg');
                  e.currentTarget.style.setProperty('--tilt-y', '0deg');
                }}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = touch.clientX - rect.left;
                  const y = touch.clientY - rect.top;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const tiltX = ((y - centerY) / centerY) * -15;
                  const tiltY = ((x - centerX) / centerX) * 15;
                  e.currentTarget.style.setProperty('--tilt-x', `${tiltX}deg`);
                  e.currentTarget.style.setProperty('--tilt-y', `${tiltY}deg`);
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.setProperty('--tilt-x', '0deg');
                  e.currentTarget.style.setProperty('--tilt-y', '0deg');
                }}
              >
                <div className="flip-content">
                  <div
                    className="mb-2"
                    style={{
                      color: cardHeadingColors[idx % cardHeadingColors.length],
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      textShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    {card.content.title}
                  </div>
                  <div
                    className={clsx(
                      'text-lg font-medium text-gray-900 font-serif whitespace-pre-line mb-4 group-hover:text-cyan-700 transition',
                      expandedPosts[card.content.id] && 'max-h-96 overflow-y-auto pr-2'
                    )}
                  >
                    {expandedPosts[card.content.id]
                      ? card.content.content
                      : getFirstLines(card.content.content, 3)}
                    {card.content.content.split(/\r?\n/).length > 3 && (
                      <button
                        className="ml-2 text-cyan-600 underline text-sm font-semibold hover:text-cyan-800 focus:outline-none"
                        onClick={() => setExpandedPosts((prev) => ({ ...prev, [card.content.id]: !prev[card.content.id] }))}
                      >
                        {expandedPosts[card.content.id] ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">{card.content.author_name}</span>
                    {card.content.author_instagram && (
                      <a href={`https://www.instagram.com/${card.content.author_instagram.replace(/^@/, '').trim().replace(/[^a-zA-Z0-9._]/g, '').replace(/\/+$/, '')}/`} target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-500 hover:text-cyan-700">
                        <Instagram className="inline w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex items-center gap-1 text-cyan-700 hover:bg-cyan-100 px-3 py-1 rounded-full font-bold text-base shadow-md border border-cyan-300/60 ${likeLoading[card.content.id] ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => handleLike(card.content)}
                    >
                      {likedPosts[card.content.id] ? <Heart className="w-5 h-5 fill-cyan-500 text-cyan-500 drop-shadow" /> : <Heart className="w-5 h-5" />}
                      <span className="font-semibold">Feel this</span>
                      <span className="ml-1 text-xs text-cyan-700 font-bold">{typeof card.content.likes === 'number' ? card.content.likes : 0}</span>
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
