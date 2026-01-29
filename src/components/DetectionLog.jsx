import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Download, Trash2, Filter } from 'lucide-react';

const DetectionLog = ({ detectionHistory = [], onClearLog }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'fire-smoke', 'satellite', 'threats-only'

  const filteredHistory = detectionHistory.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'threats-only') return item.detected;
    return item.type.toLowerCase().includes(filterType);
  });

  const exportLog = () => {
    const dataStr = JSON.stringify(detectionHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection-log-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Type', 'Filename', 'Detected', 'Details'];
    const rows = detectionHistory.map(item => [
      item.timestamp,
      item.type,
      item.filename,
      item.detected ? 'Yes' : 'No',
      item.details ? JSON.stringify(item.details) : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection-log-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearLog = () => {
    if (window.confirm('Clear all detection history? This cannot be undone.')) {
      onClearLog && onClearLog();
    }
  };

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const threatCount = detectionHistory.filter(item => item.detected).length;
  const safeCount = detectionHistory.length - threatCount;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-fire-500" />
          Detection Log
          {detectionHistory.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-white/10 text-gray-300 text-xs rounded-full">
              {detectionHistory.length}
            </span>
          )}
        </h2>

        {detectionHistory.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportLog}
              className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all"
              title="Export as JSON"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={clearLog}
              className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
              title="Clear log"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Options */}
      {detectionHistory.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'all'
                ? 'bg-fire-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            All ({detectionHistory.length})
          </button>
          <button
            onClick={() => setFilterType('threats-only')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'threats-only'
                ? 'bg-fire-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            Threats Only ({threatCount})
          </button>
          <button
            onClick={() => setFilterType('fire-smoke')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'fire-smoke'
                ? 'bg-fire-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            Fire/Smoke
          </button>
          <button
            onClick={() => setFilterType('satellite')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              filterType === 'satellite'
                ? 'bg-fire-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            Satellite
          </button>
        </div>
      )}

      {/* Log Entries */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {detectionHistory.length === 0 
              ? 'No detection history yet' 
              : 'No detections match the current filter'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {detectionHistory.length === 0 
              ? 'Upload files to start detecting fires' 
              : 'Try changing the filter'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {filteredHistory.map((item, index) => (
              <div
                key={item.id || index}
                className="bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 hover:border-fire-500/30"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                        item.detected ? 'bg-fire-500 animate-pulse' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{item.type}</span>
                          {item.detected && (
                            <span className="px-2 py-0.5 bg-fire-500/20 text-fire-400 text-xs rounded">
                              THREAT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 truncate">{item.filename}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                      </div>
                    </div>
                    {expandedIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedIndex === index && item.details && (
                  <div className="px-4 pb-4 border-t border-white/10 mt-2 pt-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Detection Details
                    </h4>
                    <pre className="text-xs text-gray-300 bg-black/20 p-3 rounded overflow-x-auto">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{detectionHistory.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total Scans</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-fire-500">{threatCount}</p>
              <p className="text-xs text-gray-400 mt-1">Threats Found</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{safeCount}</p>
              <p className="text-xs text-gray-400 mt-1">Safe</p>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={exportCSV}
              className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-sm transition-all"
            >
              Export as CSV
            </button>
            <button
              onClick={exportLog}
              className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-sm transition-all"
            >
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DetectionLog;
