'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { X, Navigation, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationPickerMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// Define libraries outside component to avoid re-renders
const libraries: ("places")[] = ["places"];

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  isOpen, onClose, onSelectLocation, initialLat, initialLng
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [position, setPosition] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const defaultCenter = initialLat && initialLng 
    ? { lat: initialLat, lng: initialLng } 
    : { lat: 25.2048, lng: 55.2708 }; // Default to Dubai

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition({ lat: initialLat, lng: initialLng });
    } else if (isOpen) {
      // Auto locate on first open if no initial pos
      if (navigator.geolocation) {
         setIsLocating(true);
         navigator.geolocation.getCurrentPosition(
           (pos) => {
             const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
             setPosition(newPos);
             if (map) {
               map.panTo(newPos);
               map.setZoom(16);
             }
             setIsLocating(false);
           },
           () => {
             setIsLocating(false); // Silent fail for auto-locate
           }
         );
      }
    }
  }, [initialLat, initialLng, isOpen, map]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  const handleConfirm = () => {
    if (position) {
      onSelectLocation(position.lat, position.lng);
    }
    onClose();
  };

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        map?.panTo(newPos);
        map?.setZoom(16);
        setIsLocating(false);
      },
      (err) => {
        alert("Unable to fetch location: " + err.message);
        setIsLocating(false);
      }
    );
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setPosition(newPos);
        map?.panTo(newPos);
        map?.setZoom(16);
      }
    }
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
                  <p className="font-bold text-lg mb-2">Error Loading Maps</p>
                  <p className="text-sm">Please check if your API key has billing enabled and the Maps JavaScript API activated.</p>
                </div>
              )}
              {isLoaded ? (
                <>
                  <div className="absolute top-4 left-4 right-20 z-[400]">
                    <Autocomplete
                      onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search for places..."
                          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-md transition-shadow"
                        />
                      </div>
                    </Autocomplete>
                  </div>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={13}
                    onClick={handleMapClick}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                    }}
                  >
                    {position && <Marker position={position} />}
                  </GoogleMap>
                </>
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-gray-100">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
