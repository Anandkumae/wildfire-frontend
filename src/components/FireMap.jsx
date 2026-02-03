import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Loader2, Satellite, Thermometer } from 'lucide-react';
import { getHotspotDetails } from '../services/api';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://wildfire-backend-4.onrender.com';

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
  const [showImageModal, setShowImageModal] = useState(false);

  const fetchGeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHotspotDetails(
        alert.lat, 
        alert.lon, 
        alert.date,
        alert.frp,  // Pass FRP from alert
        alert.confidence  // Pass confidence from alert
      );
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
    <div className="min-w-[300px] max-w-[400px] space-y-3">
      {/* Header with verification status */}
      <div className="font-semibold text-lg border-b pb-2">
        {getMarkerLabel()}
      </div>

      {/* Detection Reason - Why this pixel is red */}
      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="font-semibold text-sm text-orange-900 mb-2 flex items-center gap-2">
          🔥 Why This Hotspot Was Detected
        </div>
        <div className="text-xs text-orange-800 space-y-1">
          <div className="flex justify-between">
            <span>Thermal Confidence:</span>
            <span className="font-semibold">{alert.confidence || 'N/A'}%</span>
          </div>
          <div className="flex justify-between">
            <span>Fire Radiative Power:</span>
            <span className="font-semibold">{alert.frp || 'N/A'} MW</span>
          </div>
          {alert.bright_ti4 && (
            <div className="flex justify-between">
              <span>Brightness Temperature:</span>
              <span className="font-semibold">{alert.bright_ti4}K</span>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-orange-200 text-xs italic">
            {alert.confidence >= 80 ? (
              <span className="text-red-700">⚠️ High confidence thermal anomaly detected by NASA satellite</span>
            ) : alert.confidence >= 50 ? (
              <span className="text-orange-700">⚠️ Moderate confidence thermal anomaly detected</span>
            ) : (
              <span className="text-yellow-700">⚠️ Low confidence thermal anomaly - may be false alarm</span>
            )}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="text-sm space-y-1">
        <div><strong>Location:</strong> {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}</div>
        <div><strong>Detected:</strong> {new Date(alert.timestamp || alert.date).toLocaleString()}</div>
        {alert.satellite && <div><strong>Satellite:</strong> {alert.satellite}</div>}
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

      {/* GEE Satellite Data Section */}
      {showDetails && geeData && (
        <div className="space-y-3 border-t pt-3">
          <div className="font-semibold text-sm text-blue-900 flex items-center gap-2">
            🛰️ Satellite Verification Analysis
          </div>

          {/* AI Classification - What caused this hotspot */}
          {geeData.classification && (
            <div className={`p-3 rounded-lg border-2 ${
              geeData.classification.classification.toLowerCase().includes('wildfire') || 
              geeData.classification.classification.toLowerCase().includes('active fire')
                ? 'bg-red-50 border-red-300'
                : geeData.classification.classification.toLowerCase().includes('agricultural')
                ? 'bg-orange-50 border-orange-300'
                : geeData.classification.classification.toLowerCase().includes('industrial') ||
                  geeData.classification.classification.toLowerCase().includes('urban')
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                🤖 AI Classification
              </div>
              <div className="text-base font-bold mb-2">
                {geeData.classification.classification}
              </div>
              <div className="text-xs mb-3 leading-relaxed">
                {geeData.classification.reason}
              </div>
              
              {/* Indicators */}
              {geeData.classification.indicators && geeData.classification.indicators.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs font-semibold mb-1">Supporting Evidence:</div>
                  <ul className="text-xs space-y-1">
                    {geeData.classification.indicators.map((indicator, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-blue-600">•</span>
                        <span>{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Confidence Badge */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  geeData.classification.confidence_level === 'high'
                    ? 'bg-green-100 text-green-800'
                    : geeData.classification.confidence_level === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {geeData.classification.confidence_level.toUpperCase()} CONFIDENCE
                </span>
              </div>
            </div>
          )}

          {/* Surface Temperature from MODIS */}
          {geeData.temperature_data && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-900">Surface Temperature (MODIS)</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {geeData.temperature_data.temperature_celsius}°C
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {geeData.temperature_data.temperature_kelvin}K
              </div>
              <div className="text-xs text-gray-600 mt-2 italic">
                {geeData.temperature_data.temperature_celsius > 40 
                  ? "⚠️ Elevated surface temperature detected"
                  : "✓ Normal surface temperature range"}
              </div>
            </div>
          )}{/* Satellite Image */}
          {geeData.satellite_image_url && (
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Satellite className="w-4 h-4" />
                Sentinel-2 Satellite Imagery
              </div>
              <div 
                className="relative cursor-pointer group"
                onClick={() => setShowImageModal(true)}
                title="Click to view full size"
              >
                <img
                  src={`${API_BASE_URL}${geeData.satellite_image_url}`}
                  alt="Satellite view"
                  className="w-full rounded-lg border-2 border-blue-300 shadow-md hover:shadow-xl transition-shadow"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.nextElementSibling.style.display = 'block';
                  }}
                />
                {/* Overlay hint */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-3 py-1 rounded">
                    🔍 Click to enlarge
                  </span>
                </div>
              </div>
              <div style={{ display: 'none' }} className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                Image not available
              </div>
              
              {/* Metadata */}
              <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
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

      {/* Full-Screen Image Modal */}
      {showImageModal && geeData?.satellite_image_url && (
        <div 
          className="fixed inset-0 z-[10000] bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-6xl max-h-full">
            {/* Close button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              ✕ Close
            </button>
            
            {/* Full-size image */}
            <img
              src={`${API_BASE_URL}${geeData.satellite_image_url}`}
              alt="Full-size satellite view"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
              <div className="text-sm font-semibold mb-1">Sentinel-2 Satellite Imagery</div>
              <div className="text-xs space-x-4">
                <span>📍 {geeData.lat?.toFixed(4)}, {geeData.lon?.toFixed(4)}</span>
                <span>📅 {geeData.acquisition_date}</span>
                {geeData.cloud_coverage !== null && (
                  <span>☁️ {geeData.cloud_coverage?.toFixed(1)}% clouds</span>
                )}
              </div>
            </div>
          </div>
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
