'use client';

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { X, Navigation, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '@/providers/ConfirmContext';

interface LocationPickerMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  isOpen, onClose, onSelectLocation, initialLat, initialLng
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const geocoderContainerRef = useRef<HTMLDivElement | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const defaultCenter = initialLat && initialLng
    ? { lat: initialLat, lng: initialLng }
    : { lat: 25.2048, lng: 55.2708 }; // Default to Dubai

  const placeMarker = (lat: number, lng: number, map: mapboxgl.Map) => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#2563eb' }).setLngLat([lng, lat]).addTo(map);
    }
  };

  // Initialize map when the modal opens
  useEffect(() => {
    if (!isOpen || mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      setLoadError('Missing Mapbox access token.');
      return;
    }
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 13,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      setPosition({ lat, lng });
      placeMarker(lat, lng, map);
    });

    map.on('load', () => setIsLoaded(true));
    map.on('error', () => setLoadError('Please check that your Mapbox token is valid.'));

    if (geocoderContainerRef.current) {
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        // @ts-expect-error - mapboxgl instance type mismatch between packages, functionally compatible
        mapboxgl,
        marker: false,
        placeholder: 'Search for places...',
      });
      geocoder.on('result', (e: any) => {
        const [lng, lat] = e.result.center;
        setPosition({ lat, lng });
        placeMarker(lat, lng, map);
        map.flyTo({ center: [lng, lat], zoom: 16 });
      });
      geocoderContainerRef.current.innerHTML = '';
      geocoderContainerRef.current.appendChild(geocoder.onAdd(map));
    }

    if (initialLat && initialLng) {
      setPosition({ lat: initialLat, lng: initialLng });
      placeMarker(initialLat, initialLng, map);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setIsLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-locate on first open if no initial position was passed in
  useEffect(() => {
    if (!isOpen || initialLat || initialLng || !isLoaded || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        if (mapRef.current) {
          placeMarker(newPos.lat, newPos.lng, mapRef.current);
          mapRef.current.flyTo({ center: [newPos.lng, newPos.lat], zoom: 16 });
        }
        setIsLocating(false);
      },
      () => setIsLocating(false) // Silent fail for auto-locate
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoaded]);

  const handleConfirm = () => {
    if (position) {
      onSelectLocation(position.lat, position.lng);
    }
    onClose();
  };

  const { alert: customAlert } = useConfirm();

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        if (mapRef.current) {
          placeMarker(newPos.lat, newPos.lng, mapRef.current);
          mapRef.current.flyTo({ center: [newPos.lng, newPos.lat], zoom: 16 });
        }
        setIsLocating(false);
      },
      (err) => {
        alert('Unable to fetch location: ' + err.message);
        setIsLocating(false);
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl relative z-10 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-black text-gray-900">Pinpoint Location</h3>
              <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative">
              {loadError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100/90 text-red-600 p-6 text-center">
                  <p className="font-bold text-lg mb-2">Error Loading Map</p>
                  <p className="text-sm">{loadError}</p>
                </div>
              )}

              {!isLoaded && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center h-full w-full bg-gray-100 z-[5]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}

              <div ref={mapContainerRef} className="absolute inset-0" />

              {isLoaded && (
                <div className="absolute top-4 left-4 right-20 z-[400]">
                  <div className="relative [&_.mapboxgl-ctrl-geocoder]:w-full [&_.mapboxgl-ctrl-geocoder]:max-w-none [&_.mapboxgl-ctrl-geocoder]:rounded-xl [&_.mapboxgl-ctrl-geocoder]:shadow-md [&_.mapboxgl-ctrl-geocoder]:border [&_.mapboxgl-ctrl-geocoder]:border-gray-200">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                    <div ref={geocoderContainerRef} className="[&_input]:!pl-10" />
                  </div>
                </div>
              )}

              <div className="absolute top-4 right-4 z-[400]">
                <button
                  type="button"
                  onClick={handleLocate}
                  disabled={isLocating}
                  className="flex items-center gap-2 px-4 h-12 bg-white rounded-xl shadow-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="My Location"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-sm font-bold text-blue-600">Locating...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-bold text-blue-600 hidden sm:inline-block">Get Current Location</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                {position ? (
                  <>
                    <p className="text-xs font-bold text-slate-500">Selected Coordinates</p>
                    <p className="text-sm font-semibold text-blue-600">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-500">Click on the map to drop a pin</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!position}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20"
              >
                Confirm Location
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LocationPickerMap;
