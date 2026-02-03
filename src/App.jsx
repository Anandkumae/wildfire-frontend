import React, { useState, useEffect } from 'react';
import { Flame, Camera, Satellite, Loader2, Shield, Video, StopCircle } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DetectionResult from './components/DetectionResult';
import AlertStatus from './components/AlertStatus';
import DetectionLog from './components/DetectionLog';
import VideoPreview from './components/VideoPreview';
import InstantAlert from './components/InstantAlert';
import WebcamDetection from './components/WebcamDetection';
import FireMap from './components/FireMap';
import { detectFireSmoke, detectFireSmokeStreaming, detectSatelliteFire } from './services/api';
import audioAlert from './utils/audioAlert';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://wildfire-backend-4.onrender.com';

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

  // Satellite alerts state - for NASA FIRMS real-time fire data
  const [satelliteAlerts, setSatelliteAlerts] = useState(null);
  const [loadingSatelliteAlerts, setLoadingSatelliteAlerts] = useState(false);
  const [satelliteFilter, setSatelliteFilter] = useState('all'); // 'all', 'verified', 'unverified', 'false_alarms'

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

  // Load satellite alerts from NASA FIRMS
  const loadSatelliteAlerts = async () => {
    setLoadingSatelliteAlerts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/satellite-alerts`);
      const data = await response.json();
      setSatelliteAlerts(data);
      console.log('🛰️ Satellite alerts loaded:', data);
      
      // 🎯 INTELLIGENT SYSTEM: Trigger enhanced detection if fires detected
      if (data.count > 0) {
        handleSatelliteFireDetected(data);
      }
    } catch (error) {
      console.error('❌ Error loading satellite alerts:', error);
      setSatelliteAlerts({ error: error.message, count: 0, alerts: [] });
    } finally {
      setLoadingSatelliteAlerts(false);
    }
  };

  // 🧠 INTELLIGENT ALERT SYSTEM: Respond to satellite fire detections
  const handleSatelliteFireDetected = (data) => {
    console.log('🚨 SATELLITE FIRE ALERT SYSTEM ACTIVATED');
    console.log(`📊 ${data.count} fire hotspot(s) detected in region`);
    
    // Create high-priority alert
    const satelliteAlert = {
      id: `satellite-alert-${Date.now()}`,
      message: `🛰️ SATELLITE ALERT: ${data.count} fire hotspot(s) detected!`,
      details: `NASA MODIS detected active fires in the region. Enhanced monitoring recommended.`,
      severity: 'critical',
      timestamp: new Date().toLocaleString(),
      source: 'NASA FIRMS'
    };
    
    // Add to alerts list
    setAlerts(prev => [satelliteAlert, ...prev]);
    
    // Show instant popup
    setInstantAlert(satelliteAlert);
    
    // Play audio alert
    audioAlert.playFireAlarm(2000);
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛰️ SATELLITE FIRE ALERT', {
        body: `${data.count} fire hotspot(s) detected by NASA MODIS satellite`,
        icon: '/fire-icon.png',
      });
    }
    
    console.log('✅ Enhanced detection mode activated');
    console.log('📸 Camera systems should increase sensitivity');
    console.log('🚨 Local authorities should be notified');
  };

  // Get filtered alerts based on selected filter
  const getFilteredAlerts = () => {
    if (!satelliteAlerts) return [];
    
    switch (satelliteFilter) {
      case 'all':
        return [
          ...(satelliteAlerts.alerts || []),
          ...(satelliteAlerts.unverified_alerts || []),
          ...(satelliteAlerts.false_alarms || [])
        ];
      case 'verified':
        return satelliteAlerts.alerts || [];
      case 'unverified':
        return satelliteAlerts.unverified_alerts || [];
      case 'false_alarms':
        return satelliteAlerts.false_alarms || [];
      default:
        return satelliteAlerts.alerts || [];
    }
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
      alert(`Error processing file: ${error.message}\n\nPlease ensure the backend server is running at ${API_BASE_URL}`);
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
                {/* File Upload - Only for fire-smoke tab */}
                {activeTab !== 'satellite' && (
                  <>
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
            {/* Satellite Alerts Section - NASA FIRMS Real-time Data */}
            {activeTab === 'satellite' && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Satellite className="w-6 h-6 text-fire-500" />
                    NASA FIRMS Satellite Alerts
                  </h3>
                  <button
                    onClick={loadSatelliteAlerts}
                    disabled={loadingSatelliteAlerts}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingSatelliteAlerts ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Satellite className="w-4 h-4" />
                        Load Real-time Alerts
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                  Fetch near-real-time fire hotspots from NASA MODIS satellite data (India region, last 24 hours)
                  <br />
                  <span className="text-green-400">✨ With intelligent visual verification to reduce false alarms</span>
                </p>

                {/* Satellite Alerts Display */}
                {satelliteAlerts && (
                  <div className="space-y-4">
                    {satelliteAlerts.error ? (
                      <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-red-400">❌ Error: {satelliteAlerts.error}</p>
                      </div>
                    ) : (
                      <>
                        {/* Verification Stats - CLICKABLE */}
                        {satelliteAlerts.verification_stats && (
                          <div className="grid grid-cols-4 gap-3 mb-4">
                            <button
                              onClick={() => setSatelliteFilter('all')}
                              className={`p-3 rounded-lg text-center transition-all cursor-pointer hover:scale-105 ${
                                satelliteFilter === 'all'
                                  ? 'bg-blue-500/30 border-2 border-blue-400 ring-2 ring-blue-400'
                                  : 'bg-blue-500/20 border border-blue-500'
                              }`}
                            >
                              <div className="text-2xl font-bold text-blue-400">
                                {satelliteAlerts.verification_stats.total_hotspots}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">All Hotspots</div>
                            </button>
                            <button
                              onClick={() => setSatelliteFilter('verified')}
                              className={`p-3 rounded-lg text-center transition-all cursor-pointer hover:scale-105 ${
                                satelliteFilter === 'verified'
                                  ? 'bg-green-500/30 border-2 border-green-400 ring-2 ring-green-400'
                                  : 'bg-green-500/20 border border-green-500'
                              }`}
                            >
                              <div className="text-2xl font-bold text-green-400">
                                {satelliteAlerts.count}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">Verified Fires</div>
                            </button>
                            <button
                              onClick={() => setSatelliteFilter('unverified')}
                              className={`p-3 rounded-lg text-center transition-all cursor-pointer hover:scale-105 ${
                                satelliteFilter === 'unverified'
                                  ? 'bg-yellow-500/30 border-2 border-yellow-400 ring-2 ring-yellow-400'
                                  : 'bg-yellow-500/20 border border-yellow-500'
                              }`}
                            >
                              <div className="text-2xl font-bold text-yellow-400">
                                {satelliteAlerts.unverified_count}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">Unverified</div>
                            </button>
                            <button
                              onClick={() => setSatelliteFilter('false_alarms')}
                              className={`p-3 rounded-lg text-center transition-all cursor-pointer hover:scale-105 ${
                                satelliteFilter === 'false_alarms'
                                  ? 'bg-red-500/30 border-2 border-red-400 ring-2 ring-red-400'
                                  : 'bg-red-500/20 border border-red-500'
                              }`}
                            >
                              <div className="text-2xl font-bold text-red-400">
                                {satelliteAlerts.false_alarms_rejected}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">False Alarms</div>
                            </button>
                          </div>
                        )}

                        {/* System Intelligence Badge */}
                        {satelliteAlerts.system_intelligence && (
                          <div className="p-4 bg-purple-500/20 border border-purple-500 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">🧠</div>
                              <div className="flex-1">
                                <div className="font-semibold text-purple-300 mb-1">
                                  Intelligent Verification System
                                </div>
                                <div className="text-sm text-gray-300">
                                  {satelliteAlerts.system_intelligence.description}
                                </div>
                                <div className="text-xs text-purple-400 mt-2">
                                  ⚡ {satelliteAlerts.system_intelligence.accuracy_improvement}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                          <p className="text-blue-400 font-semibold">
                            🛰️ Showing {getFilteredAlerts().length} {
                              satelliteFilter === 'all' ? 'total hotspot(s)' :
                              satelliteFilter === 'verified' ? 'verified fire(s)' :
                              satelliteFilter === 'unverified' ? 'unverified hotspot(s)' :
                              'false alarm(s)'
                            }
                          </p>
                        </div>

                        {getFilteredAlerts().length > 0 && (
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {getFilteredAlerts().map((alert, index) => (
                              <div
                                key={index}
                                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                {/* Verification Badge */}
                                {alert.verification && (
                                  <div className="mb-2">
                                    {alert.verification.status === 'verified_wildfire' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500 rounded text-xs text-green-400">
                                        ✅ Verified (Thermal + Visual)
                                      </span>
                                    )}
                                    {alert.verification.status === 'unverified_no_imagery' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500 rounded text-xs text-yellow-400">
                                        ⚠️ Unverified (High Thermal Only)
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-400">Location:</span>
                                    <span className="text-white ml-2">
                                      {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Confidence:</span>
                                    <span className="text-fire-500 ml-2 font-semibold">
                                      {alert.confidence}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Fire Power (FRP):</span>
                                    <span className="text-white ml-2">{alert.frp} MW</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Detected:</span>
                                    <span className="text-white ml-2">
                                      {alert.date} {alert.time}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {getFilteredAlerts().length === 0 && (
                          <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg">
                            <p className="text-green-400">
                              ✅ No {
                                satelliteFilter === 'all' ? 'hotspots' :
                                satelliteFilter === 'verified' ? 'verified fires' :
                                satelliteFilter === 'unverified' ? 'unverified hotspots' :
                                'false alarms'
                              } in this category
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fire Map - Show map with filtered alerts */}
            {activeTab === 'satellite' && satelliteAlerts && getFilteredAlerts().length > 0 && (
              <FireMap alerts={getFilteredAlerts()} />
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
