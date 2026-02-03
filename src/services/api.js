import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://wildfire-backend-4.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const detectFireSmoke = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/detect/fire-smoke', formData);
  return response.data;
};

export const detectFireSmokeStreaming = async (file, onFrameDetection, onComplete, onError) => {
  /**
   * STREAMING DETECTION - Real-time frame-by-frame alerts!
   * Calls onFrameDetection immediately when fire is detected in ANY frame.
   * 
   * @param {File} file - The video/image file to analyze
   * @param {Function} onFrameDetection - Callback for each frame: (frameData) => {}
   * @param {Function} onComplete - Callback when done: () => {}
   * @param {Function} onError - Callback for errors: (error) => {}
   */
  
  // First, upload the file
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const uploadResponse = await api.post('/detect/fire-smoke/stream', formData, {
      responseType: 'text',
      headers: {
        'Accept': 'text/event-stream',
      },
      // Don't use axios for streaming, we'll use EventSource instead
      adapter: async (config) => {
        // Upload file first
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        
        const uploadUrl = `${API_BASE_URL}/detect/fire-smoke/stream`;
        
        // Use fetch for file upload and streaming
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            onComplete && onComplete();
            break;
          }

          // Decode the chunk
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete events (separated by \n\n)
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer

          for (const event of events) {
            if (event.startsWith('data: ')) {
              const data = event.substring(6); // Remove 'data: ' prefix
              try {
                const frameData = JSON.parse(data);
                
                if (frameData.done) {
                  onComplete && onComplete();
                } else if (frameData.error) {
                  onError && onError(new Error(frameData.error));
                } else {
                  // Call callback immediately for this frame!
                  onFrameDetection && onFrameDetection(frameData);
                }
              } catch (e) {
                console.error('Error parsing frame data:', e);
              }
            }
          }
        }

        return { data: { success: true } };
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Streaming detection error:', error);
    onError && onError(error);
    throw error;
  }
};

export const detectSatelliteFire = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/detect/satellite-fire', formData);
  return response.data;
};

/**
 * Get detailed hotspot analysis from Google Earth Engine
 * Fetches real satellite imagery and temperature data for a specific location
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} date - Optional date in YYYY-MM-DD format
 * @returns {Promise} Hotspot details with satellite imagery and temperature
 */
export const getHotspotDetails = async (lat, lon, date = null, frp = null, confidence = null) => {
  const params = new URLSearchParams({ lat, lon });
  if (date) params.append('date', date);
  if (frp) params.append('frp', frp);
  if (confidence) params.append('confidence', confidence);
  
  const response = await axios.get(`${API_BASE_URL}/api/hotspot-details?${params.toString()}`);
  return response.data;
};
