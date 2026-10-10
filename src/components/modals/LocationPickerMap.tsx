'use client';

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, Loader2, Search, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationPickerMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  radius?: number;
}

// Custom Pin Marker
const createCustomPinIcon = () => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        <svg style="transform: rotate(45deg); width: 16px; height: 16px; color: #ffffff;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <circle cx="12" cy="10" r="3"></circle>
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  isOpen, onClose, onSelectLocation, initialLat, initialLng, radius = 100
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const activeRadius = radius && radius > 0 ? Number(radius) : 100;

  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const defaultCenter = initialLat && initialLng
    ? { lat: initialLat, lng: initialLng }
    : { lat: 25.2048, lng: 55.2708 }; // Dubai default

  const updateMarkerAndCircle = (lat: number, lng: number, map: L.Map) => {
    setPosition({ lat, lng });

    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pinIcon = createCustomPinIcon();
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        setPosition({ lat: newPos.lat, lng: newPos.lng });
        if (circleRef.current) {
          circleRef.current.setLatLng([newPos.lat, newPos.lng]);
        }
      });
    }

    // Update attendance radius circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(activeRadius);
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: activeRadius,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);
    }
  };

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(activeRadius);
    }
  }, [activeRadius]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('click', (e) => {
        updateMarkerAndCircle(e.latlng.lat, e.latlng.lng, map);
      });

      mapRef.current = map;
      setIsLoaded(true);

      if (initialLat && initialLng) {
        updateMarkerAndCircle(initialLat, initialLng, map);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
        setIsLoaded(false);
      }
    };
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setShowResults(true);
      }
    } catch {
      // Ignore network errors on search
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
      mapRef.current.flyTo([lat, lng], 15, { animate: true });
      updateMarkerAndCircle(lat, lng, mapRef.current);
    }
    setShowResults(false);
    setSearchQuery(result.display_name);
  };

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { animate: true });
          updateMarkerAndCircle(lat, lng, mapRef.current);
        }
        setIsLocating(false);
      },
      (err) => {
        alert('Unable to fetch current location: ' + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (position) {
      onSelectLocation(position.lat, position.lng);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl relative z-10 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white z-20">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-tight">Pinpoint Location</h3>
                  <p className="text-[10px] font-bold text-blue-600">Geofence Radius: {activeRadius}m</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Map Canvas */}
            <div className="flex-1 relative">
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center h-full w-full bg-gray-100 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}

              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

              {/* Search Box */}
              <div className="absolute top-4 left-4 right-20 sm:right-52 z-[1000]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    placeholder="Search places, city or street..."
                    className="w-full bg-white/95 backdrop-blur border border-gray-300 rounded-xl pl-10 pr-9 py-2.5 text-xs font-semibold text-gray-900 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {searchQuery && !isSearching && (
                    <button
                      onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showResults && searchResults.length > 0 && (
                  <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="truncate">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Get Current Location Button */}
              <div className="absolute top-4 right-4 z-[1000]">
                <button
                  type="button"
                  onClick={handleLocate}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/95 backdrop-blur rounded-xl shadow-md border border-gray-300 hover:bg-gray-50 transition-colors text-blue-600 font-bold text-xs disabled:opacity-50 cursor-pointer"
                  title="My Location"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Locating...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span className="hidden sm:inline">My Location</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 z-20 flex items-center justify-between">
              <div>
                {position ? (
                  <>
                    <p className="text-xs font-bold text-slate-500">Selected Coordinates</p>
                    <p className="text-sm font-semibold text-blue-600">
                      {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-500">Click on the map or search to drop a pin</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!position}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
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
