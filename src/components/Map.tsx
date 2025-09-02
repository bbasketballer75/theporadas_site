import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import L from 'leaflet';
import { detectBrowser } from '../utils/browserDetection';

// Fix for default markers in react-leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Map: React.FC = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Browser detection for compatibility fixes
  const browserInfo = React.useMemo(() => detectBrowser(), []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    // Browser-specific geolocation options
    const getGeolocationOptions = () => {
      const baseOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      };

      // Adjust options based on browser capabilities
      if (browserInfo.name === 'safari') {
        // Safari has stricter geolocation policies
        return {
          ...baseOptions,
          timeout: 8000, // Longer timeout for Safari
          maximumAge: 600000, // 10 minutes cache
        };
      } else if (browserInfo.name === 'firefox') {
        // Firefox may need different accuracy settings
        return {
          ...baseOptions,
          enableHighAccuracy: browserInfo.isMobile ? false : true, // Disable high accuracy on mobile Firefox
        };
      } else if (browserInfo.isIOS) {
        // iOS devices may need special handling
        return {
          ...baseOptions,
          timeout: 10000, // Longer timeout for iOS
        };
      }

      return baseOptions;
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied by user.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred.');
            break;
        }
        setLoading(false);
      },
      getGeolocationOptions()
    );
  }, [browserInfo]);

  if (loading) {
    return (
      <div role="status" aria-live="polite">
        Loading map...
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-live="assertive">
        Error: {error}
      </div>
    );
  }

  if (!position) {
    return (
      <div role="status" aria-live="polite">
        Unable to retrieve your location.
      </div>
    );
  }

  return (
    <div
      className="map-container"
      aria-label="Interactive map showing your current location"
      role="application"
      data-testid="map"
      data-loading={loading ? "true" : "false"}
    >
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        aria-label="Map display"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position}>
          <Popup>You are here!</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default Map;
