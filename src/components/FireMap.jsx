import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to auto-fit map bounds to markers
function FitBounds({ alerts }) {
  const map = useMap();
  
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const bounds = alerts.map(alert => [alert.lat, alert.lon]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [alerts, map]);
  
  return null;
}

const FireMap = ({ alerts }) => {
  // Default center on India
  const defaultCenter = [22, 78];
  const defaultZoom = 5;

  return (
    <div className="glass-card p-4 h-[600px]">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        🗺️ Fire Hotspot Map
        <span className="text-sm font-normal text-gray-400">
          ({alerts?.length || 0} location{alerts?.length !== 1 ? 's' : ''})
        </span>
      </h3>
      
      <div className="h-[calc(100%-3rem)] rounded-lg overflow-hidden border border-white/10">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {alerts && alerts.length > 0 && (
            <>
              <FitBounds alerts={alerts} />
              {alerts.map((alert, index) => {
                // Determine marker color based on verification status
                const getMarkerStyle = () => {
                  if (alert.verification) {
                    if (alert.verification.status === 'verified_wildfire') {
                      return { color: '#22c55e', fillColor: '#16a34a', label: '✅ Verified' };
                    } else if (alert.verification.status === 'false_alarm_rejected') {
                      return { color: '#ef4444', fillColor: '#dc2626', label: '❌ False Alarm' };
                    } else {
                      return { color: '#eab308', fillColor: '#ca8a04', label: '⚠️ Unverified' };
                    }
                  }
                  return { color: '#ff4444', fillColor: '#ff0000', label: '🔥 Fire' };
                };

                const markerStyle = getMarkerStyle();

                return (
                  <CircleMarker
                    key={index}
                    center={[alert.lat, alert.lon]}
                    radius={8}
                    pathOptions={{
                      color: markerStyle.color,
                      fillColor: markerStyle.fillColor,
                      fillOpacity: 0.8,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-bold mb-2">{markerStyle.label}</div>
                        <div><strong>Location:</strong> {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}</div>
                        <div><strong>Confidence:</strong> {alert.confidence}%</div>
                        <div><strong>Fire Power:</strong> {alert.frp} MW</div>
                        <div><strong>Date:</strong> {alert.date}</div>
                        <div><strong>Time:</strong> {alert.time}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </>
          )}
        </MapContainer>
      </div>
      
      {(!alerts || alerts.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-gray-400">Load satellite alerts to see fire locations on map</p>
        </div>
      )}
    </div>
  );
};

export default FireMap;
