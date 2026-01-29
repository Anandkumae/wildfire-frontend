import React, { useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const VideoPreview = ({ file, isAnalyzing = false }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [videoUrl, setVideoUrl] = React.useState(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      // Auto-play when analyzing
      if (isAnalyzing && videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }

      return () => URL.revokeObjectURL(url);
    }
  }, [file, isAnalyzing]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!file || !file.type.startsWith('video/')) {
    return null;
  }

  return (
    <div className="glass-card p-4">
      <div className="relative rounded-lg overflow-hidden bg-black">
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto max-h-96 object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          loop
        />

        {/* Analyzing Overlay */}
        {isAnalyzing && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-fire-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            Analyzing...
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            <div className="flex-1 text-white text-sm">
              {file.name}
            </div>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-300">
            🔥 Analyzing video for fire detection...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Alerts will appear instantly when fire is detected
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
