import React, { useState, useRef, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface SwipeableNotificationCardProps {
  notification: Notification;
  onDelete: () => void;
}

export default function SwipeableNotificationCard({ notification, onDelete }: SwipeableNotificationCardProps) {
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow left swipe (negative diff)
    if (diff < 0) {
      setSwipeOffset(Math.abs(diff));
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    
    setIsSwiping(false);
    const diff = currentX.current - startX.current;
    
    // If swiped more than 100px to the left, trigger delete
    if (diff < -100) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 300); // Animation duration
    } else {
      // Reset position
      setSwipeOffset(0);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div 
        className="absolute inset-0 bg-red-500 flex items-center justify-center z-10"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>

      {/* Notification card */}
      <div
        ref={cardRef}
        className={`bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200 relative z-20 ${
          isDeleting ? 'transform translate-x-full opacity-0' : ''
        }`}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-start justify-between mb-1">
              <p className="font-semibold text-white text-sm flex-1">{notification.title}</p>
              <p className="text-gray-500 text-xs ml-2">{getTimeAgo(notification.created_at)}</p>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">{notification.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 