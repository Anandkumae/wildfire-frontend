import React from 'react';
import { History, MapPin, Calendar } from 'lucide-react';

const HistoryPanel = ({ detectionHistory = [] }) => {
  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <History className="w-7 h-7 text-fire-500" />
        Detection History
      </h2>

      {detectionHistory.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No detection history yet</p>
          <p className="text-sm text-gray-500 mt-2">Upload files to start detecting fires</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {detectionHistory.map((item, index) => (
            <div
              key={index}
              className="bg-white/5 hover:bg-white/10 p-4 rounded-lg transition-all cursor-pointer border border-white/5 hover:border-fire-500/30"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    item.detected ? 'bg-fire-500 animate-pulse' : 'bg-green-500'
                  }`} />
                  <span className="text-white font-medium">{item.type}</span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.timestamp}
                </span>
              </div>
              
              <p className="text-sm text-gray-300 mb-2">{item.filename}</p>
              
              {item.location && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </p>
              )}
              
              {item.detected && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <span className="text-xs text-fire-400 font-semibold">
                    ⚠️ Threat detected
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
