import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import './map.css';

import { detectBrowser } from '../utils/browserDetection';

// Custom Cached Tile Layer for offline support
class CachedTileLayer extends L.GridLayer {
  private cacheName = 'map-tiles-cache';
  private tileUrlTemplate: string;

  constructor(urlTemplate: string, options?: L.GridLayerOptions) {
    super(options);
    this.tileUrlTemplate = urlTemplate;
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');
    tile.alt = '';
    const url = this.getTileUrl(coords);

    (async () => {
      try {
        const cache = await caches.open(this.cacheName);
        const cached = await cache.match(url);
        if (cached) {
          const blob = await cached.blob();
          tile.src = URL.createObjectURL(blob);
          done(undefined, tile);
          return;
        }
        const resp = await fetch(url);
        if (!resp.ok) {
          done(new Error('Failed to load tile'), tile);
          return;
        }
        cache.put(url, resp.clone());
        const blob = await resp.blob();
        tile.src = URL.createObjectURL(blob);
        done(undefined, tile);
      } catch (error) {
        done(error as Error, tile);
      }
    })();

    return tile;
  }

  getTileUrl(coords: L.Coords): string {
    const subdomains = ['a', 'b', 'c'];
    const subdomain = subdomains[Math.abs(coords.x + coords.y) % subdomains.length];
    return L.Util.template(this.tileUrlTemplate, {
      s: subdomain,
      z: coords.z,
      x: coords.x,
      y: coords.y,
    });
  }
}

// Fix for default markers in react-leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SiteMap: React.FC = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);

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
          enableHighAccuracy: !browserInfo.isMobile, // Disable high accuracy on mobile Firefox
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
      getGeolocationOptions(),
    );
  }, [browserInfo]);

  // Add cached tile layer and search control when map is ready
  useEffect(() => {
    if (map) {
      // Add cached tile layer
      const cachedTileLayer = new CachedTileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      );
      cachedTileLayer.addTo(map);

      // Add search control
      const provider = new OpenStreetMapProvider();
      // GeoSearchControl typings are not exported; instantiate and cast for Leaflet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchControl: any = new (GeoSearchControl as unknown as new (...args: any[]) => any)({
        provider: provider,
        style: 'bar',
        showMarker: true,
        showPopup: false,
        autoClose: true,
        retainZoomLevel: false,
        animateZoom: true,
        keepResult: true,
        searchLabel: 'Enter address or location',
      });

      map.addControl(searchControl);
    }
  }, [map]);

  if (loading) {
    return <output aria-live="polite">Loading map...</output>;
  }

  if (error) {
    return (
      <div role="alert" aria-live="assertive">
        Error: {error}
      </div>
    );
  }

  if (!position) {
    return <output aria-live="polite">Unable to retrieve your location.</output>;
  }

  return (
    <div
      className="map-container"
      aria-label="Interactive map showing your current location"
      role="application"
      data-testid="map"
      data-loading={loading ? 'true' : 'false'}
    >
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        aria-label="Map display"
        whenReady={() => {
          // Map is ready, we can add controls here if needed
        }}
        ref={setMap}
      >
        <Marker position={position}>
          <Popup>You are here!</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default SiteMap;
