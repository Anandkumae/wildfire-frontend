import React, { useState, useEffect } from 'react';
import { Flame, Camera, Satellite, Loader2, Shield, Video, StopCircle } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DetectionResult from './components/DetectionResult';
import AlertStatus from './components/AlertStatus';
import DetectionLog from './components/DetectionLog';
import VideoPreview from './components/VideoPreview';
import InstantAlert from './components/InstantAlert';
import WebcamDetection from './components/WebcamDetection';
import { detectFireSmoke, detectFireSmokeStreaming, detectSatelliteFire } from './services/api';
import audioAlert from './utils/audioAlert';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('fire-smoke');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false); // For webcam monitoring
  
  // Load from localStorage on mount
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('wildfire-alerts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [detectionHistory, setDetectionHistory] = useState(() => {
    const saved = localStorage.getItem('wildfire-detection-history');
    return saved ? JSON.parse(saved) : [];
  });

  // Instant alert state (for popup notifications)
  const [instantAlert, setInstantAlert] = useState(null);

  // Emergency stop state - stops all monitoring and alerts
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);

  // Save to localStorage whenever alerts or history changes
  useEffect(() => {
    localStorage.setItem('wildfire-alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('wildfire-detection-history', JSON.stringify(detectionHistory));
  }, [detectionHistory]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setDetectionResult(null);
  };




  const handleDetection = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setDetectionResult(null);

    try {
      const isFireSmoke = activeTab === 'fire-smoke';
      const isVideo = selectedFile.type.startsWith('video/');
      
      console.log('🔍 Starting detection...', { 
        activeTab, 
        filename: selectedFile.name,
        isVideo,
        streamingEnabled: isVideo && isFireSmoke
      });

      // Use STREAMING detection for videos (real-time frame-by-frame alerts!)
      if (isVideo && isFireSmoke) {
        console.log('📡 Using STREAMING detection for real-time alerts!');
        
        let allDetections = [];
        let firstFireFrame = null;
        let totalFramesWithFire = 0;

        await detectFireSmokeStreaming(
          selectedFile,
          // onFrameDetection - Called for EACH frame immediately!
          (frameData) => {
            console.log(`🎬 Frame ${frameData.frame}/${frameData.total_frames}:`, frameData);

            // INSTANT ALERT if fire detected in this frame!
            if (frameData.has_fire && frameData.detections.length > 0) {
              totalFramesWithFire++;
              
              // Store first fire frame
              if (!firstFireFrame) {
                firstFireFrame = frameData.frame;
              }

              // Calculate confidence for this frame
              const avgConfidence = frameData.detections.reduce((sum, d) => sum + d.confidence, 0) / frameData.detections.length;

              // Check if emergency stop is active
              if (!isEmergencyStop) {
                // Create INSTANT alert for this frame!
                const alert = {
                  id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `🔥 FIRE DETECTED in frame ${frameData.frame}!`,
                  details: `${frameData.detections.length} detection(s) with ${(avgConfidence * 100).toFixed(1)}% confidence`,
                  severity: 'high',
                  timestamp: new Date().toLocaleString(),
                  frameNumber: frameData.frame
                };

                console.log(`⚡ INSTANT ALERT - Frame ${frameData.frame}:`, alert);
                
                // 🔊 PLAY LOUD AUDIO ALARM (only on first detection to avoid spam)
                if (totalFramesWithFire === 1) {
                  audioAlert.playFireAlarm(3000); // 3 second alarm
                }
                
                // Show instant popup alert!
                setInstantAlert(alert);
                
                // Add to alerts list
                setAlerts(prev => [alert, ...prev]);

                // Browser notification (only for first detection to avoid spam)
                if (totalFramesWithFire === 1 && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification('🔥 FIRE DETECTED!', {
                    body: `Fire found in frame ${frameData.frame} of ${selectedFile.name}!`,
                    icon: '/fire-icon.png',
                  });
                }
              }

              // Store all detections
              allDetections.push(...frameData.detections);
            }
          },
          // onComplete - Called when all frames processed
          () => {
            console.log('✅ Streaming detection complete!');
            console.log(`📊 Summary: ${totalFramesWithFire} frames with fire out of ${allDetections.length} total`);

            // Set final result
            const result = {
              detections: allDetections,
              totalFrames: totalFramesWithFire,
              firstFireFrame: firstFireFrame
            };
            setDetectionResult(result);

            // Add to history
            const historyItem = {
              id: `detection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'Fire & Smoke Detection (Streaming)',
              filename: selectedFile.name,
              timestamp: new Date().toLocaleString(),
              detected: allDetections.length > 0,
              details: {
                detections: allDetections,
                detectionCount: allDetections.length,
                framesWithFire: totalFramesWithFire,
                firstFireFrame: firstFireFrame,
                avgConfidence: allDetections.length > 0 
                  ? allDetections.reduce((sum, d) => sum + d.confidence, 0) / allDetections.length 
                  : 0
              }
            };

            setDetectionHistory(prev => [historyItem, ...prev]);
            setIsLoading(false);
          },
          // onError
          (error) => {
            console.error('❌ Streaming detection error:', error);
            alert(`Error during streaming detection: ${error.message}`);
            setIsLoading(false);
          }
        );

      } else {
        // Use regular detection for images or satellite
        let result;
        
        if (isFireSmoke) {
          result = await detectFireSmoke(selectedFile);
          console.log('🔥 Fire/Smoke detection result:', result);
        } else {
          result = await detectSatelliteFire(selectedFile);
          console.log('🛰️ Satellite detection result:', result);
        }

        setDetectionResult(result);

        // Determine if threat was detected
        const threatDetected = isFireSmoke 
          ? (result.detections && result.detections.length > 0)
          : (result.wildfire && result.wildfire > 0.5);

        console.log('⚠️ Threat detected:', threatDetected);

        // Calculate average confidence for fire/smoke
        let avgConfidence = 0;
        if (isFireSmoke && result.detections && result.detections.length > 0) {
          avgConfidence = result.detections.reduce((sum, d) => sum + d.confidence, 0) / result.detections.length;
        }

        // Add to history
        const historyItem = {
          id: `detection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: isFireSmoke ? 'Fire & Smoke Detection' : 'Satellite Analysis',
          filename: selectedFile.name,
          timestamp: new Date().toLocaleString(),
          detected: threatDetected,
          details: {
            ...(isFireSmoke ? {
              detections: result.detections,
              detectionCount: result.detections?.length || 0,
              avgConfidence: avgConfidence
            } : {
              wildfireProb: result.wildfire,
              riskLevel: result.wildfire > 0.7 ? 'High' : result.wildfire > 0.5 ? 'Medium' : 'Low'
            })
          }
        };
        
        setDetectionHistory(prev => [historyItem, ...prev]);

        // Create alert if threat detected
        if (threatDetected && !isEmergencyStop) {
          const detailsText = isFireSmoke 
            ? `${result.detections.length} detection(s) with ${(avgConfidence * 100).toFixed(1)}% avg confidence`
            : `Wildfire probability: ${(result.wildfire * 100).toFixed(1)}%`;

          const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: isFireSmoke 
              ? `Fire or smoke detected in ${selectedFile.name}!` 
              : `High wildfire risk detected in ${selectedFile.name}!`,
            details: detailsText,
            severity: 'high',
            timestamp: new Date().toLocaleString(),
          };
          
          console.log('🚨 Creating alert:', alert);
          setAlerts(prev => [alert, ...prev]);

          // 🔊 PLAY LOUD AUDIO ALARM
          audioAlert.playFireAlarm(3000); // 3 second alarm

          // INSTANT ALERT - Show popup immediately!
          setInstantAlert(alert);
          console.log('⚡ INSTANT ALERT TRIGGERED!');

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔥 Wildfire Alert', {
              body: `${alert.message}\n${detailsText}`,
              icon: '/fire-icon.png',
            });
          } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('🔥 Wildfire Alert', {
                  body: `${alert.message}\n${detailsText}`,
                  icon: '/fire-icon.png',
                });
              }
            });
          }
        }

        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Detection error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Error processing file: ${error.message}\n\nPlease ensure the backend server is running on http://localhost:8000`);
      setIsLoading(false);
    }
  };

  // Clear functions
  const handleClearAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
  };

  const handleClearLog = () => {
    setDetectionHistory([]);
  };

  // Emergency stop - stops everything!
  const handleEmergencyStop = () => {
    console.log('🛑 EMERGENCY STOP ACTIVATED');
    
    // Stop audio alarm
    audioAlert.stopAlarm();
    
    // Stop webcam monitoring
    setIsMonitoring(false);
    
    // Clear instant alert popup
    setInstantAlert(null);
    
    // Set emergency stop flag
    setIsEmergencyStop(true);
    
    // Stop any ongoing detection
    setIsLoading(false);
    
    console.log('✅ All monitoring and alerts stopped');
  };

  // Resume monitoring after emergency stop
  const handleResumeMonitoring = () => {
    console.log('▶️ Resuming monitoring');
    setIsEmergencyStop(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Flame className="w-12 h-12 text-fire-500 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-fire-400 to-fire-600 bg-clip-text text-transparent">
              Wildfire Detection AI
            </h1>
          </div>
          <p className="text-gray-300 text-lg">
            Advanced AI-powered fire and smoke detection system
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-400 font-medium">System Online</span>
            </div>
            
            {/* Emergency Stop Button */}
            {!isEmergencyStop ? (
              <button
                onClick={handleEmergencyStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-500/50"
                title="Stop all monitoring and silence alarms"
              >
                <StopCircle className="w-5 h-5" />
                Emergency Stop
              </button>
            ) : (
              <button
                onClick={handleResumeMonitoring}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/50 animate-pulse"
                title="Resume monitoring"
              >
                <Shield className="w-5 h-5" />
                Resume Monitoring
              </button>
            )}
          </div>
          
          {/* Emergency Stop Warning */}
          {isEmergencyStop && (
            <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-lg">
              <p className="text-yellow-400 font-semibold text-sm">
                ⚠️ MONITORING STOPPED - All fire detection and alerts are disabled
              </p>
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Detection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Selector */}
            <div className="glass-card p-2 flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('fire-smoke');
                  setSelectedFile(null);
                  setDetectionResult(null);
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'fire-smoke'
                    ? 'bg-gradient-to-r from-fire-500 to-fire-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Camera className="w-5 h-5" />
                Fire & Smoke
              </button>
              <button
                onClick={() => {
                  setActiveTab('satellite');
                  setSelectedFile(null);
                  setDetectionResult(null);
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'satellite'
                    ? 'bg-gradient-to-r from-fire-500 to-fire-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Satellite className="w-5 h-5" />
                Satellite
              </button>
              <button
                onClick={() => {
                  setActiveTab('live-camera');
                  setSelectedFile(null);
                  setDetectionResult(null);
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'live-camera'
                    ? 'bg-gradient-to-r from-fire-500 to-fire-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="w-5 h-5" />
                Live Camera
              </button>
            </div>

            {/* Live Camera Tab Content */}
            {activeTab === 'live-camera' ? (
              <WebcamDetection 
                onFireDetected={(alert) => {
                  // Check if emergency stop is active
                  if (!isEmergencyStop) {
                    // 🔊 PLAY LOUD AUDIO ALARM for live camera detection
                    audioAlert.playFireAlarm(3000); // 3 second alarm
                    // Add alert to list
                    setAlerts(prev => [alert, ...prev]);
                    // Show instant popup
                    setInstantAlert(alert);
                    // Add to history
                    const historyItem = {
                      id: `detection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      type: 'Live Camera Detection',
                      filename: 'Webcam Feed',
                      timestamp: alert.timestamp,
                      detected: true,
                      details: {
                        source: 'webcam',
                        message: alert.message
                      }
                    };
                    setDetectionHistory(prev => [historyItem, ...prev]);
                  }
                }}
                isMonitoring={isMonitoring}
                setIsMonitoring={setIsMonitoring}
              />
            ) : (
              <>
                {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              accept="image/*,video/*"
              maxSize={10}
            />

            {/* Detect Button */}
            {selectedFile && (
              <button
                onClick={handleDetection}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5" />
                    Start Detection
                  </>
                )}
              </button>
            )}

            {/* Video Preview - Shows during analysis */}
            {selectedFile && selectedFile.type.startsWith('video/') && (
              <VideoPreview file={selectedFile} isAnalyzing={isLoading} />
            )}

            {/* Detection Result */}
            {detectionResult && (
              <DetectionResult result={detectionResult} type={activeTab} />
            )}
              </>
            )}
          </div>

          {/* Right Column - Alerts & Log */}
          <div className="space-y-6">
            <AlertStatus 
              alerts={alerts} 
              onClearAlert={handleClearAlert}
            />
            <DetectionLog 
              detectionHistory={detectionHistory} 
              onClearLog={handleClearLog}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm mt-12">
          <p>Powered by YOLO & ResNet AI Models</p>
          <p className="mt-2">© 2026 Wildfire Detection System</p>
        </footer>
      </div>

      {/* Instant Alert Popup - Shows immediately when fire detected */}
      {instantAlert && (
        <InstantAlert 
          alert={instantAlert} 
          onDismiss={() => setInstantAlert(null)} 
        />
      )}
    </div>
  );
}

export default App;
