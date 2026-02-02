import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Loader2, Satellite, Thermometer } from 'lucide-react';
import { getHotspotDetails } from '../services/api';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// Enhanced Popup Component with GEE Data
function EnhancedPopup({ alert }) {
  const [geeData, setGeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchGeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHotspotDetails(alert.lat, alert.lon, alert.date);
      setGeeData(data);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching GEE data:', err);
      setError(err.message || 'Failed to fetch satellite data');
    } finally {
      setLoading(false);
    }
  };

  // Determine marker label based on verification status
  const getMarkerLabel = () => {
    if (alert.verification) {
      if (alert.verification.status === 'verified_wildfire') return '✅ Verified Fire';
      if (alert.verification.status === 'false_alarm_rejected') return '❌ False Alarm';
      return '⚠️ Unverified Hotspot';
    }
    return '🔥 Fire Hotspot';
  };

  return (
    <div className="min-w-[300px] max-w-[400px]">
      {/* Basic Info */}
      <div className="mb-3">
        <div className="font-bold text-base mb-2">{getMarkerLabel()}</div>
        <div className="space-y-1 text-sm">
          <div>
            <strong>Location:</strong> {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}
          </div>
          <div>
            <strong>Confidence:</strong> <span className="text-orange-600 font-semibold">{alert.confidence}%</span>
          </div>
          <div>
            <strong>Fire Power:</strong> {alert.frp} MW
          </div>
          <div>
            <strong>Date:</strong> {alert.date} {alert.time}
          </div>
        </div>
      </div>

      {/* Fetch Satellite Data Button */}
      {!showDetails && !loading && (
        <button
          onClick={fetchGeeData}
          className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <Satellite className="w-4 h-4" />
          Fetch Satellite Data
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-blue-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Fetching satellite data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
          <strong>Error:</strong> {error}
          <div className="mt-2 text-xs">
            Make sure Google Earth Engine is authenticated on the backend.
          </div>
        </div>
      )}

      {/* GEE Data Display */}
      {showDetails && geeData && !geeData.error && (
        <div className="space-y-3 border-t pt-3">
          <div className="font-semibold text-sm flex items-center gap-2 text-blue-600">
            <Satellite className="w-4 h-4" />
            Satellite Analysis
          </div>

          {/* Temperature Data */}
          {geeData.temperature_data && (
            <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                <strong className="text-sm">Surface Temperature</strong>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {geeData.temperature_data.temperature_celsius}°C
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {geeData.temperature_data.temperature_kelvin}K
              </div>
            </div>
          )}

          {/* Satellite Image */}
          {geeData.satellite_image_url && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Satellite Imagery</div>
              <img
                src={`${API_BASE_URL}${geeData.satellite_image_url}`}
                alt="Satellite view"
                className="w-full rounded-lg border border-gray-300 shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }} className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                Image not available
              </div>
              
              {/* Metadata */}
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <strong>Source:</strong> {geeData.satellite_source || 'Sentinel-2'}
                </div>
                {geeData.cloud_coverage !== null && (
                  <div>
                    <strong>Cloud Coverage:</strong> {geeData.cloud_coverage?.toFixed(1)}%
                  </div>
                )}
                <div>
                  <strong>Acquired:</strong> {geeData.acquisition_date}
                </div>
              </div>
            </div>
          )}

          {/* No imagery available */}
          {!geeData.satellite_image_url && !geeData.temperature_data && (
            <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 text-sm">
              <div className="font-semibold mb-1">ℹ️ No Recent Satellite Data</div>
              <div className="text-xs">
                Satellite imagery is not available for this location/date due to:
                <ul className="list-disc ml-4 mt-1">
                  <li>Cloud coverage (&gt;20%)</li>
                  <li>No recent satellite pass</li>
                  <li>Data processing delay</li>
                </ul>
                <div className="mt-2 italic">This is normal and doesn't affect the fire detection.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GEE Error */}
      {showDetails && geeData && geeData.error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
          <strong>GEE Error:</strong> {geeData.message || geeData.error}
        </div>
      )}
    </div>
  );
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
                      return { color: '#22c55e', fillColor: '#16a34a' };
                    } else if (alert.verification.status === 'false_alarm_rejected') {
                      return { color: '#ef4444', fillColor: '#dc2626' };
                    } else {
                      return { color: '#eab308', fillColor: '#ca8a04' };
                    }
                  }
                  return { color: '#ff4444', fillColor: '#ff0000' };
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
                    <Popup maxWidth={400} minWidth={300}>
                      <EnhancedPopup alert={alert} />
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
