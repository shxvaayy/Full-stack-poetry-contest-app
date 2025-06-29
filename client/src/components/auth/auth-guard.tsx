import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth";
import videoFile from "@/assets/video.mp4";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Video Splash Component
function VideoSplash({ onVideoEnd }: { onVideoEnd: () => void }) {
  const [videoError, setVideoError] = useState(false);

  const handleVideoEnd = () => {
    setTimeout(onVideoEnd, 500); // Small delay for smooth transition
  };

  const handleVideoError = () => {
    console.error("Video failed to load");
    setVideoError(true);
    onVideoEnd(); // Skip to login if video fails
  };

  if (videoError) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        className="max-w-full max-h-full object-contain"
        style={{ width: 'auto', height: 'auto' }}
      >
        <source src={videoFile} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [showVideo, setShowVideo] = useState(true);
  const [videoWatched, setVideoWatched] = useState(false);

  // Check if user has already watched video in this session
  useEffect(() => {
    const hasWatchedVideo = sessionStorage.getItem('writory-video-watched');
    if (hasWatchedVideo) {
      setShowVideo(false);
      setVideoWatched(true);
    }
  }, []);

  const handleVideoEnd = () => {
    setShowVideo(false);
    setVideoWatched(true);
    sessionStorage.setItem('writory-video-watched', 'true');
  };

  // Show video splash screen first
  if (showVideo && !videoWatched) {
    return <VideoSplash onVideoEnd={handleVideoEnd} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
}