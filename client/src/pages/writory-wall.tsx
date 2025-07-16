import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Instagram, RefreshCw } from 'lucide-react';

interface WallPost {
  id: number;
  content: string;
  author_name: string;
  author_instagram?: string;
  likes: number;
  status: 'pending' | 'approved' | 'rejected';
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
  const [allPosts, setAllPosts] = useState<WallPost[]>([]);
  const [displayPosts, setDisplayPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all approved posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/wall-posts');
        const data = await response.json();
        const approved = (data.posts || []).filter((p: WallPost) => p.status === 'approved') as WallPost[];
        setAllPosts(approved);
        setDisplayPosts(shuffleArray(approved).slice(0, 5));
      } catch (e) {
        setAllPosts([]);
        setDisplayPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    setDisplayPosts(shuffleArray(allPosts).slice(0, 5));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-cursive">Writory Wall</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-serif">
            Poems penned by hearts like yours.
          </p>
        </div>
        {allPosts.length > 5 && (
          <div className="flex justify-center mb-6">
            <Button onClick={handleRefresh} className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-white font-semibold rounded-full shadow-lg hover:bg-cyan-600 transition">
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
              <div key={post.id} className="break-inside-avoid rounded-2xl bg-white/80 shadow-xl border border-cyan-100 p-6 mb-6 hover:shadow-cyan-200 transition group relative overflow-hidden">
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
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 text-cyan-600 hover:bg-cyan-50 px-2 py-1 rounded-full">
                    <Heart className="w-4 h-4" />
                    <span className="font-semibold">Feel this</span>
                    <span className="ml-1 text-xs text-gray-500">{post.likes}</span>
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