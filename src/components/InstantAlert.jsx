import React, { useEffect } from 'react';
import { AlertTriangle, X, Flame } from 'lucide-react';

const InstantAlert = ({ alert, onDismiss }) => {
  useEffect(() => {
    // Play alert sound (simple beep)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio playback not supported');
    }

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      onDismiss && onDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className="glass-card p-4 border-l-4 border-fire-500 bg-fire-500/20 backdrop-blur-xl shadow-2xl max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-fire-500 rounded-full flex items-center justify-center animate-pulse">
              <Flame className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-fire-500 animate-pulse" />
              <h3 className="text-lg font-bold text-white">
                🔥 FIRE DETECTED!
              </h3>
            </div>
            <p className="text-white font-medium">{alert.message}</p>
            {alert.details && (
              <p className="text-sm text-gray-300 mt-1">{alert.details}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">{alert.timestamp}</p>
          </div>

          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Progress bar for auto-dismiss */}
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-fire-500 animate-shrink-width" style={{
            animation: 'shrink-width 10s linear forwards'
          }} />
        </div>
      </div>
    </div>
  );
};

export default InstantAlert;
