import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, BellOff, Clock, X, Trash2, Download } from 'lucide-react';

const AlertStatus = ({ alerts = [], onClearAlert }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Auto-dismiss alerts after 30 seconds (mark as read but keep in log)
  const activeAlerts = alerts.filter(alert => {
    const alertTime = new Date(alert.timestamp).getTime();
    const now = new Date().getTime();
    const thirtySeconds = 30 * 1000;
    return (now - alertTime) < thirtySeconds || alert.severity === 'high';
  });

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    if (!notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission();
    }
  };

  const clearAllAlerts = () => {
    if (window.confirm('Clear all alerts? This will remove all alert history.')) {
      alerts.forEach((_, index) => onClearAlert && onClearAlert(index));
    }
  };

  const exportAlerts = () => {
    const dataStr = JSON.stringify(alerts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fire-alerts-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-7 h-7 text-fire-500" />
          Alert Status
          {activeAlerts.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-fire-500 text-white text-xs rounded-full animate-pulse">
              {activeAlerts.length}
            </span>
          )}
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleNotifications}
            className={`p-2 rounded-lg transition-all ${
              notificationsEnabled 
                ? 'bg-fire-500 text-white' 
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
            title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
          >
            {notificationsEnabled ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
          </button>

          {alerts.length > 0 && (
            <>
              <button
                onClick={exportAlerts}
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all"
                title="Export alerts as JSON"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={clearAllAlerts}
                className="p-2 rounded-lg bg-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                title="Clear all alerts"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Alerts Section */}
      {activeAlerts.length === 0 && alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-gray-300">No active alerts</p>
          <p className="text-sm text-gray-500 mt-2">System is monitoring for threats</p>
        </div>
      ) : (
        <>
          {/* Active/Recent Alerts */}
          {activeAlerts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                Active Alerts
              </h3>
              <div className="space-y-3">
                {activeAlerts.map((alert, index) => (
                  <div
                    key={alert.id || index}
                    className={`p-4 rounded-lg border-l-4 animate-in slide-in-from-right ${
                      alert.severity === 'high' 
                        ? 'bg-fire-500/10 border-fire-500' 
                        : 'bg-yellow-500/10 border-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white font-semibold">{alert.message}</p>
                        {alert.details && (
                          <p className="text-sm text-gray-400 mt-1">{alert.details}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {alert.timestamp}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          alert.severity === 'high' 
                            ? 'bg-fire-500 text-white' 
                            : 'bg-yellow-500 text-black'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {onClearAlert && (
                          <button
                            onClick={() => onClearAlert(index)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Dismiss alert"
                          >
                            <X className="w-4 h-4 text-gray-400 hover:text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert History/Log */}
          {alerts.length > activeAlerts.length && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-sm text-gray-400 hover:text-white transition-colors mb-3 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {showAllAlerts ? 'Hide' : 'Show'} Alert History ({alerts.length - activeAlerts.length} older)
              </button>
              
              {showAllAlerts && (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {alerts.slice(activeAlerts.length).map((alert, index) => (
                    <div
                      key={alert.id || index}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-300">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          alert.severity === 'high' 
                            ? 'bg-fire-500/20 text-fire-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-fire-500">{alerts.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {alerts.filter(a => a.severity === 'high').length}
              </p>
              <p className="text-xs text-gray-400 mt-1">High Severity</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertStatus;
