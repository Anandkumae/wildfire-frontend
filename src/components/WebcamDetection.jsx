import React, { useRef, useEffect, useState } from 'react';
import { Video, VideoOff, Play, Square, AlertCircle, Camera, Wifi, Smartphone } from 'lucide-react';
import axios from 'axios';

const WebcamDetection = ({ onFireDetected, isMonitoring, setIsMonitoring }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const imgRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const [cameraMode, setCameraMode] = useState('local'); // 'local' or 'network'
  const [networkCameraUrl, setNetworkCameraUrl] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    framesProcessed: 0,
    fireDetections: 0,
    lastDetection: null,
    fps: 0
  });

  // Start local webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Failed to access webcam. Please grant camera permissions.');
      setHasPermission(false);
    }
  };

  // Start network camera (IP Webcam)
  const startNetworkCamera = () => {
    if (!networkCameraUrl) {
      setError('Please enter a valid camera URL');
      return;
    }

    try {
      // Validate URL
      const url = new URL(networkCameraUrl);
      
      // For IP Webcam, use snapshot endpoint instead of video stream
      // /shot.jpg gives us a single frame instead of continuous MJPEG stream
      let snapshotUrl = networkCameraUrl;
      if (snapshotUrl.includes('/video')) {
        snapshotUrl = snapshotUrl.replace('/video', '/shot.jpg');
      } else {
        snapshotUrl = snapshotUrl.endsWith('/') ? snapshotUrl + 'shot.jpg' : snapshotUrl + '/shot.jpg';
      }

      console.log('🔗 Connecting to network camera (snapshot mode):', snapshotUrl);

      // Use backend proxy to avoid CORS issues
      const proxyUrl = `http://localhost:8000/proxy/camera?url=${encodeURIComponent(snapshotUrl)}`;
      console.log('🔄 Using proxy URL:', proxyUrl);

      if (imgRef.current) {
        let proxyFailed = false;
        
        // Function to refresh the snapshot
        const refreshSnapshot = () => {
          if (imgRef.current && hasPermission) {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            imgRef.current.src = `${proxyUrl}&t=${timestamp}`;
          }
        };
        
        // Add load handler to confirm stream is working
        imgRef.current.onload = () => {
          console.log('✅ Network camera snapshot loaded successfully via proxy!');
          setHasPermission(true);
          setError(null);
          
          // Refresh snapshot every 500ms for smooth video-like experience
          if (!refreshIntervalRef.current) {
            refreshIntervalRef.current = setInterval(refreshSnapshot, 500);
          }
        };

        imgRef.current.onerror = (e) => {
          console.error('❌ Failed to load camera snapshot via proxy:', e);
          
          if (!proxyFailed) {
            proxyFailed = true;
            console.log('🔄 Trying direct connection as fallback...');
            setError('Proxy connection failed. Trying direct connection...');
            
            // Try direct connection as fallback
            imgRef.current.src = snapshotUrl;
            
            // Update error handler for direct connection
            imgRef.current.onerror = (e2) => {
              console.error('❌ Direct connection also failed:', e2);
              setError('Failed to connect to camera. Please check:\n1. IP address is correct\n2. IP Webcam app is running\n3. Phone and laptop are on same WiFi\n4. Try accessing the URL in browser: ' + snapshotUrl);
              setHasPermission(false);
              if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
              }
            };
            
            imgRef.current.onload = () => {
              console.log('✅ Network camera connected via direct connection!');
              console.warn('⚠️ Using direct connection - fire detection may fail due to CORS. If you see canvas errors, the backend proxy needs to be fixed.');
              setHasPermission(true);
              setError(null);
              
              // Refresh snapshot for direct connection too
              if (!refreshIntervalRef.current) {
                refreshIntervalRef.current = setInterval(() => {
                  if (imgRef.current) {
                    const timestamp = new Date().getTime();
                    imgRef.current.src = `${snapshotUrl}?t=${timestamp}`;
                  }
                }, 500);
              }
            };
          }
        };

        // Set the proxy URL first
        imgRef.current.src = proxyUrl;
      }
    } catch (err) {
      console.error('Error connecting to network camera:', err);
      setError('Invalid camera URL. Please check the URL and try again.');
      setHasPermission(false);
    }
  };

  // Stop webcam/camera
  const stopCamera = () => {
    if (cameraMode === 'local') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } else {
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
        imgRef.current.src = '';
      }
      // Clear refresh interval for network camera
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
    setHasPermission(false);
  };

  // Capture frame and send for detection
  const captureAndDetect = async () => {
    if (!canvasRef.current) {
      console.warn('⚠️ Canvas not available');
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    let sourceElement;
    let isReady = false;

    if (cameraMode === 'local' && videoRef.current) {
      sourceElement = videoRef.current;
      // Check if video is ready
      if (sourceElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
        canvas.width = sourceElement.videoWidth || 640;
        canvas.height = sourceElement.videoHeight || 480;
        isReady = true;
      } else {
        console.warn('⚠️ Video not ready yet');
        return;
      }
    } else if (cameraMode === 'network' && imgRef.current) {
      sourceElement = imgRef.current;
      // Check if image is loaded
      if (sourceElement.complete && sourceElement.naturalWidth > 0) {
        canvas.width = sourceElement.naturalWidth;
        canvas.height = sourceElement.naturalHeight;
        isReady = true;
        console.log(`📸 Capturing frame from network camera: ${canvas.width}x${canvas.height}`);
      } else {
        console.warn('⚠️ Network camera image not loaded yet');
        return;
      }
    } else {
      console.warn('⚠️ No valid source element');
      return;
    }

    if (!isReady) {
      console.warn('⚠️ Source not ready for capture');
      return;
    }

    try {
      // Draw current frame to canvas
      context.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 image
      const frameData = canvas.toDataURL('image/jpeg', 0.8);

      console.log(`🎬 Sending frame for detection (${cameraMode} mode)...`);

      // Send frame to backend for detection
      const response = await axios.post('http://localhost:8000/detect/frame', {
        frame: frameData
      });

      const result = response.data;
      
      console.log('🔍 Detection result:', result);

      // Update stats
      setStats(prev => ({
        framesProcessed: prev.framesProcessed + 1,
        fireDetections: result.has_fire ? prev.fireDetections + 1 : prev.fireDetections,
        lastDetection: result.has_fire ? new Date().toLocaleTimeString() : prev.lastDetection,
        fps: prev.fps
      }));

      // Trigger alert if fire detected
      if (result.has_fire && result.detections && result.detections.length > 0) {
        console.log('🔥 FIRE DETECTED in camera frame!', result);
        
        const avgConfidence = result.detections.reduce((sum, d) => sum + d.confidence, 0) / result.detections.length;
        
        const alert = {
          message: `🔥 FIRE DETECTED in ${cameraMode === 'local' ? 'webcam' : 'network camera'}!`,
          details: `${result.detections.length} detection(s) with ${(avgConfidence * 100).toFixed(1)}% confidence`,
          severity: 'high',
          timestamp: new Date().toLocaleString(),
          source: cameraMode === 'local' ? 'webcam' : 'network-camera'
        };

        console.log('⚡ TRIGGERING ALERT:', alert);
        onFireDetected && onFireDetected(alert);
      } else {
        console.log('✅ No fire detected in this frame');
      }
    } catch (err) {
      console.error('❌ Error detecting frame:', err);
      if (err.response) {
        console.error('Backend response:', err.response.data);
      }
    }
  };

  // Start monitoring
  const startMonitoring = () => {
    if (!hasPermission) {
      if (cameraMode === 'local') {
        startWebcam();
      } else {
        startNetworkCamera();
      }
    }
    
    setIsMonitoring(true);
    
    // Capture and detect frames every 1 second (1 FPS)
    intervalRef.current = setInterval(() => {
      captureAndDetect();
    }, 1000);

    // Calculate FPS
    setStats(prev => ({ ...prev, fps: 1 }));
  };

  // Stop monitoring
  const stopMonitoring = () => {
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopMonitoring();
    };
  }, []);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Camera className="w-7 h-7 text-fire-500" />
          Live Camera Detection
        </h2>
        
        {hasPermission && (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm text-gray-400">
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </span>
          </div>
        )}
      </div>

      {/* Camera Mode Selection */}
      {!hasPermission && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setCameraMode('local');
              setError(null);
            }}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              cameraMode === 'local'
                ? 'bg-gradient-to-r from-fire-500 to-fire-600 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <Video className="w-5 h-5" />
            Local Webcam
          </button>
          <button
            onClick={() => {
              setCameraMode('network');
              setError(null);
            }}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              cameraMode === 'network'
                ? 'bg-gradient-to-r from-fire-500 to-fire-600 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            Network Camera
          </button>
        </div>
      )}

      {/* Network Camera URL Input */}
      {cameraMode === 'network' && !hasPermission && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            <Wifi className="w-4 h-4 inline mr-2" />
            IP Webcam URL
          </label>
          <input
            type="text"
            value={networkCameraUrl}
            onChange={(e) => setNetworkCameraUrl(e.target.value)}
            placeholder="http://192.168.1.100:8080"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fire-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            Enter the IP address shown in IP Webcam app (e.g., http://192.168.1.100:8080)
          </p>
        </div>
      )}

      {/* Video Feed */}
      <div className="relative rounded-lg overflow-hidden bg-black mb-4">
        {/* Local webcam video */}
        {cameraMode === 'local' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto max-h-96 object-contain"
          />
        )}

        {/* Network camera stream */}
        {cameraMode === 'network' && (
          <img
            ref={imgRef}
            alt="Network Camera Stream"
            crossOrigin="anonymous"
            className="w-full h-auto max-h-96 object-contain"
            onError={() => {
              if (hasPermission) {
                setError('Failed to load camera stream. Please check the URL and ensure the camera is accessible.');
                setHasPermission(false);
              }
            }}
          />
        )}
        
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay when not active */}
        {!hasPermission && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              {cameraMode === 'local' ? (
                <>
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-white mb-2">Webcam not active</p>
                  <p className="text-sm text-gray-400">Click "Start Camera" to begin</p>
                </>
              ) : (
                <>
                  <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-white mb-2">Network camera not connected</p>
                  <p className="text-sm text-gray-400">Enter URL and click "Connect Camera"</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Monitoring indicator */}
        {isMonitoring && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            LIVE MONITORING
          </div>
        )}

        {/* Camera source indicator */}
        {hasPermission && (
          <div className="absolute top-4 left-4 px-3 py-2 bg-black/60 text-white text-xs font-semibold rounded-lg flex items-center gap-2">
            {cameraMode === 'local' ? (
              <>
                <Video className="w-3 h-3" />
                Local Webcam
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3" />
                Network Camera
              </>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-4">
        {!hasPermission ? (
          <button
            onClick={cameraMode === 'local' ? startWebcam : startNetworkCamera}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {cameraMode === 'local' ? (
              <>
                <Video className="w-5 h-5" />
                Start Webcam
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                Connect Camera
              </>
            )}
          </button>
        ) : (
          <>
            {!isMonitoring ? (
              <button
                onClick={startMonitoring}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Monitoring
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                Stop Monitoring
              </button>
            )}
            
            <button
              onClick={stopCamera}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <VideoOff className="w-5 h-5" />
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* Statistics */}
      {hasPermission && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.framesProcessed}</p>
            <p className="text-xs text-gray-400 mt-1">Frames Processed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-fire-500">{stats.fireDetections}</p>
            <p className="text-xs text-gray-400 mt-1">Fire Detections</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{stats.fps}</p>
            <p className="text-xs text-gray-400 mt-1">FPS</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white truncate">
              {stats.lastDetection || 'None'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Last Detection</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">
          📱 How to use IP Webcam:
        </h3>
        <ol className="text-xs text-gray-300 space-y-2">
          <li><strong>1. Install IP Webcam app</strong> on your Android phone (from Play Store)</li>
          <li><strong>2. Connect phone and laptop</strong> to the same WiFi network</li>
          <li><strong>3. Open IP Webcam app</strong> and scroll down, click "Start Server"</li>
          <li><strong>4. Note the IP address</strong> shown at the bottom (e.g., http://192.168.1.100:8080)</li>
          <li><strong>5. Select "Network Camera"</strong> mode above</li>
          <li><strong>6. Enter the IP address</strong> in the URL field</li>
          <li><strong>7. Click "Connect Camera"</strong> to start streaming</li>
          <li><strong>8. Click "Start Monitoring"</strong> to begin fire detection</li>
        </ol>
      </div>
    </div>
  );
};

export default WebcamDetection;
