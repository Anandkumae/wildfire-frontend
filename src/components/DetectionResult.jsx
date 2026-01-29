import React from 'react';
import { Flame, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const DetectionResult = ({ result, type }) => {
  if (!result) return null;

  const renderFireSmokeResult = () => {
    const detections = result.detections || [];
    const hasDetections = detections.length > 0;

    return (
      <div className={`glass-card p-6 border-l-4 ${
        hasDetections ? 'border-fire-500' : 'border-green-500'
      }`}>
        <div className="flex items-start gap-4">
          {hasDetections ? (
            <AlertTriangle className="w-12 h-12 text-fire-500 animate-pulse" />
          ) : (
            <CheckCircle className="w-12 h-12 text-green-500" />
          )}
          
          <div className="flex-1">
            <h3 className={`text-2xl font-bold mb-2 ${
              hasDetections ? 'text-fire-500' : 'text-green-500'
            }`}>
              {hasDetections ? '🔥 Fire/Smoke Detected!' : '✅ No Threats Detected'}
            </h3>
            
            {hasDetections ? (
              <div className="space-y-3 mt-4">
                <p className="text-white font-medium">Detection Details:</p>
                {detections.map((detection, index) => (
                  <div key={index} className="bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium capitalize">
                        {detection.class}
                      </span>
                      <span className="text-fire-400 font-semibold">
                        {(detection.confidence * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300">
                No fire or smoke detected in the uploaded image. Area appears safe.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSatelliteResult = () => {
    const wildfireProb = result.wildfire || 0;
    const isHighRisk = wildfireProb > 0.5;

    return (
      <div className={`glass-card p-6 border-l-4 ${
        isHighRisk ? 'border-fire-500' : 'border-green-500'
      }`}>
        <div className="flex items-start gap-4">
          {isHighRisk ? (
            <Flame className="w-12 h-12 text-fire-500 animate-pulse" />
          ) : (
            <CheckCircle className="w-12 h-12 text-green-500" />
          )}
          
          <div className="flex-1">
            <h3 className={`text-2xl font-bold mb-2 ${
              isHighRisk ? 'text-fire-500' : 'text-green-500'
            }`}>
              {isHighRisk ? '⚠️ High Wildfire Risk' : '✅ Low Wildfire Risk'}
            </h3>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Wildfire Probability</span>
                <span className={`text-2xl font-bold ${
                  isHighRisk ? 'text-fire-500' : 'text-green-500'
                }`}>
                  {(wildfireProb * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isHighRisk ? 'bg-gradient-to-r from-fire-500 to-fire-600' : 'bg-green-500'
                  }`}
                  style={{ width: `${wildfireProb * 100}%` }}
                />
              </div>
              
              <p className="text-gray-300 mt-4">
                {isHighRisk 
                  ? 'Satellite imagery indicates high wildfire risk in this area. Immediate attention recommended.'
                  : 'Satellite analysis shows low wildfire risk. Continue monitoring.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {type === 'fire-smoke' ? renderFireSmokeResult() : renderSatelliteResult()}
    </div>
  );
};

export default DetectionResult;
