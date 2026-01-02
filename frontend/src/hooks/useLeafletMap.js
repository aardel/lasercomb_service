import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logger } from '../utils/logger';
import { placesAPI } from '../services/api';
import { DEFAULTS } from '../constants/travelConstants';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * useLeafletMap Hook
 * Manages Leaflet (OpenStreetMap) map initialization, markers, and routes
 * FREE ALTERNATIVE to Google Maps JavaScript API
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.selectedTechnician - Currently selected technician
 * @param {Object} options.startingCoordinates - Starting location coordinates
 * @param {string} options.startingAddress - Starting address
 * @param {Array} options.customers - List of customers with coordinates
 * @param {Object} options.costPreview - Cost preview data with optimized sequence
 * @param {Object} options.airportOptions - Airport options per customer
 * @param {Object} options.selectedAirports - Selected airports per customer
 * @param {Function} options.setStartingCoordinates - Function to update starting coordinates
 *
 * @returns {Object} Map state and refs
 */
export const useLeafletMap = ({
  selectedTechnician,
  startingCoordinates,
  startingAddress,
  customers,
  costPreview,
  airportOptions,
  selectedAirports,
  setStartingCoordinates
}) => {
  const [mapLoaded, setMapLoaded] = useState(true); // Leaflet is always available (client-side library)
  const [mapInitialized, setMapInitialized] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);

  // Helper to validate coordinates
  const isValidCoordinates = useCallback((coords) => {
    return coords &&
           typeof coords.lat === 'number' &&
           typeof coords.lng === 'number' &&
           !isNaN(coords.lat) &&
           !isNaN(coords.lng) &&
           coords.lat >= -90 && coords.lat <= 90 &&
           coords.lng >= -180 && coords.lng <= 180;
  }, []);

  // Geocode technician address using backend API
  const geocodeTechnicianAddress = useCallback(async (address) => {
    if (!address || !address.trim()) return null;

    try {
      const response = await placesAPI.autocomplete(address);
      if (response.data.success && response.data.data.length > 0) {
        const place = response.data.data[0];
        const detailsResponse = await placesAPI.getDetails(place.place_id);
        if (detailsResponse.data.success && detailsResponse.data.data) {
          const details = detailsResponse.data.data;
          if (details.latitude && details.longitude) {
            return {
              lat: details.latitude,
              lng: details.longitude
            };
          }
        }
      }
      return null;
    } catch (error) {
      logger.error('LeafletMap', 'Error geocoding address:', error);
      return null;
    }
  }, []);

  // Custom icon creator
  const createCustomIcon = useCallback((type, label) => {
    const iconHtml = type === 'home'
      ? '<div style="font-size: 24px;">🏠</div>'
      : type === 'airport-origin'
      ? '<div style="font-size: 20px;">✈️</div>'
      : type === 'airport-destination'
      ? '<div style="font-size: 20px;">🛬</div>'
      : `<div style="background: #667eea; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #5a67d8; font-weight: bold;">${label}</div>`;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });
  }, []);

  // Initialize Map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return;

    // Validate starting coordinates
    let validStartingCoords = null;

    // First, try to use selectedTechnician coordinates
    if (selectedTechnician?.homeCoordinates && isValidCoordinates(selectedTechnician.homeCoordinates)) {
      logger.debug('LeafletMap', 'Using technician coordinates:', selectedTechnician.homeCoordinates);
      validStartingCoords = selectedTechnician.homeCoordinates;
    }
    // Then try startingCoordinates state
    else if (startingCoordinates && isValidCoordinates(startingCoordinates)) {
      logger.debug('LeafletMap', 'Using starting coordinates:', startingCoordinates);
      validStartingCoords = startingCoordinates;
    }
    // If coordinates are invalid, try to geocode the address
    else if (selectedTechnician?.homeAddress && selectedTechnician.homeAddress.trim()) {
      logger.debug('LeafletMap', 'Invalid coordinates, geocoding technician address:', selectedTechnician.homeAddress);
      validStartingCoords = await geocodeTechnicianAddress(selectedTechnician.homeAddress);
      if (validStartingCoords && isValidCoordinates(validStartingCoords)) {
        logger.debug('LeafletMap', 'Geocoded coordinates:', validStartingCoords);
        setStartingCoordinates(validStartingCoords);
      }
    }
    else if (startingAddress && startingAddress.trim()) {
      logger.debug('LeafletMap', 'Invalid coordinates, geocoding address:', startingAddress);
      validStartingCoords = await geocodeTechnicianAddress(startingAddress);
      if (validStartingCoords && isValidCoordinates(validStartingCoords)) {
        logger.debug('LeafletMap', 'Geocoded coordinates:', validStartingCoords);
        setStartingCoordinates(validStartingCoords);
      }
    }

    // If still invalid, use default or wait
    if (!isValidCoordinates(validStartingCoords)) {
      logger.warn('LeafletMap', 'No valid coordinates found. Technician:', selectedTechnician?.name || 'none', 'Address:', selectedTechnician?.homeAddress || startingAddress || 'none');
      if (!selectedTechnician && !startingAddress) {
        logger.warn('LeafletMap', 'No technician or address available, using default location');
        validStartingCoords = DEFAULTS.MAP_CENTER;
      } else {
        logger.debug('LeafletMap', 'Waiting for technician coordinates to load...');
        return;
      }
    }

    try {
      // Initialize map if not already initialized
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [validStartingCoords.lat, validStartingCoords.lng],
          zoom: 12,
          zoomControl: true
        });

        // Add OpenStreetMap tiles (FREE)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapInitialized(true);
      } else {
        mapInstanceRef.current.setView([validStartingCoords.lat, validStartingCoords.lng], 12);
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Clear existing route
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }

      const activeCustomers = customers.filter(c => c.coordinates && isValidCoordinates(c.coordinates));
      const displayOrder = costPreview?.metadata?.optimized_sequence
        ? costPreview.metadata.optimized_sequence.map(id => activeCustomers.find(c => c.id === id)).filter(Boolean)
        : activeCustomers;

      // Add markers
      const bounds = L.latLngBounds([]);

      // Home marker
      const homeMarker = L.marker([validStartingCoords.lat, validStartingCoords.lng], {
        icon: createCustomIcon('home')
      }).addTo(map);
      homeMarker.bindPopup('Starting Point');
      markersRef.current.push(homeMarker);
      bounds.extend([validStartingCoords.lat, validStartingCoords.lng]);

      // Customer markers
      displayOrder.forEach((customer, index) => {
        if (!isValidCoordinates(customer.coordinates)) {
          logger.warn('LeafletMap', `Invalid coordinates for customer ${customer.id}, skipping marker`);
          return;
        }

        const marker = L.marker([customer.coordinates.lat, customer.coordinates.lng], {
          icon: createCustomIcon('customer', index + 1)
        }).addTo(map);
        marker.bindPopup(customer.name || `Stop ${index + 1}`);
        markersRef.current.push(marker);
        bounds.extend([customer.coordinates.lat, customer.coordinates.lng]);

        // Add airport markers
        const airports = airportOptions[customer.id];
        const selected = selectedAirports[customer.id];

        if (airports) {
          // Origin airports
          airports.origin?.forEach((airport) => {
            if (airport.lat && airport.lng) {
              const isSelected = selected?.origin?.code === airport.code;
              const airportMarker = L.marker([airport.lat, airport.lng], {
                icon: createCustomIcon('airport-origin'),
                opacity: isSelected ? 1 : 0.5,
                zIndexOffset: isSelected ? 1000 : 500
              }).addTo(map);
              airportMarker.bindPopup(`${airport.name} (${airport.code})<br/>${isSelected ? 'Selected' : 'Alternative'} Departure`);
              markersRef.current.push(airportMarker);
              bounds.extend([airport.lat, airport.lng]);
            }
          });

          // Destination airports
          airports.destination?.forEach((airport) => {
            if (airport.lat && airport.lng) {
              const isSelected = selected?.destination?.code === airport.code;
              const airportMarker = L.marker([airport.lat, airport.lng], {
                icon: createCustomIcon('airport-destination'),
                opacity: isSelected ? 1 : 0.5,
                zIndexOffset: isSelected ? 1000 : 500
              }).addTo(map);
              airportMarker.bindPopup(`${airport.name} (${airport.code})<br/>${isSelected ? 'Selected' : 'Alternative'} Destination`);
              markersRef.current.push(airportMarker);
              bounds.extend([airport.lat, airport.lng]);
            }
          });
        }
      });

      // Draw route using simple polyline (for free alternative)
      // Note: For production routing, you could use OpenRouteService routing API
      if (displayOrder.length > 0 && startingCoordinates && isValidCoordinates(startingCoordinates)) {
        const routePoints = [
          [validStartingCoords.lat, validStartingCoords.lng],
          ...displayOrder.map(c => [c.coordinates.lat, c.coordinates.lng]),
          [validStartingCoords.lat, validStartingCoords.lng] // Return to start
        ];

        const routeLayer = L.polyline(routePoints, {
          color: '#667eea',
          weight: 5,
          opacity: 0.8
        }).addTo(map);

        routeLayerRef.current = routeLayer;
      }

      // Fit bounds with padding
      if (markersRef.current.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        map.setView([validStartingCoords.lat, validStartingCoords.lng], 12);
      }

      logger.info('LeafletMap', 'Map initialized successfully with', markersRef.current.length, 'markers');
    } catch (error) {
      logger.error('LeafletMap', 'Error initializing map:', error);
    }
  }, [
    selectedTechnician,
    startingCoordinates,
    startingAddress,
    customers,
    costPreview,
    airportOptions,
    selectedAirports,
    isValidCoordinates,
    geocodeTechnicianAddress,
    setStartingCoordinates,
    createCustomIcon
  ]);

  // Initialize map when dependencies change
  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      initializeMap();
    }, 100);

    return () => clearTimeout(timer);
  }, [
    selectedTechnician?.homeCoordinates,
    selectedTechnician?.homeAddress,
    startingCoordinates,
    initializeMap
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return {
    mapRef,
    mapInstanceRef,
    markersRef,
    routeLayerRef,
    mapLoaded,
    mapInitialized,
    initializeMap
  };
};

export default useLeafletMap;
