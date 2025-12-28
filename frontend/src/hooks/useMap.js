import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import { placesAPI } from '../services/api';
import { DEFAULTS } from '../constants/travelConstants';

/**
 * useMap Hook
 * Manages Google Maps initialization, markers, and directions
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
export const useMap = ({
  selectedTechnician,
  startingCoordinates,
  startingAddress,
  customers,
  costPreview,
  airportOptions,
  selectedAirports,
  setStartingCoordinates
}) => {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const directionsRendererRef = useRef(null);

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

  // Geocode technician address
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
      logger.error('Map', 'Error geocoding address:', error);
      return null;
    }
  }, []);

  // Load Google Maps script (only once)
  useEffect(() => {
    let isMounted = true;
    let scriptLoaded = false;

    const loadGoogleMaps = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
        setGoogleMapsLoaded(true);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        logger.warn('Map', 'Google Maps API key not found');
        setGoogleMapsLoaded(false);
        return;
      }

      // Check if script is already in the DOM
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        if (scriptLoaded) return;
        scriptLoaded = true;
        
        // Wait for script to load if it's still loading
        if (existingScript.getAttribute('data-loaded') !== 'true') {
          const handleLoad = () => {
            existingScript.setAttribute('data-loaded', 'true');
            if (isMounted) {
              setTimeout(() => {
                if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
                  setGoogleMapsLoaded(true);
                }
              }, 200);
            }
          };
          existingScript.addEventListener('load', handleLoad);
          if (existingScript.readyState === 'complete') {
            handleLoad();
          }
        } else {
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
              setGoogleMapsLoaded(true);
            }
          }, 100);
        }
        return;
      }

      // Create new script
      scriptLoaded = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-loaded', 'false');
      
      script.onload = () => {
        script.setAttribute('data-loaded', 'true');
        if (isMounted) {
          setTimeout(() => {
            if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
              setGoogleMapsLoaded(true);
            }
          }, 200);
        }
      };
      
      script.onerror = () => {
        logger.error('Map', 'Failed to load Google Maps script');
        setGoogleMapsLoaded(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();
    return () => { isMounted = false; };
  }, []);

  // Initialize Map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return;

    // Robust check for Google Maps library
    if (!window.google || 
        !window.google.maps || 
        typeof window.google.maps.Map !== 'function' ||
        !window.google.maps.marker ||
        typeof window.google.maps.marker.AdvancedMarkerElement !== 'function') {
      logger.debug('Map', 'Google Maps library not fully loaded yet, retrying in 200ms...');
      setTimeout(initializeMap, 200);
      return;
    }

    // Validate starting coordinates
    let validStartingCoords = null;
    
    // First, try to use selectedTechnician coordinates
    if (selectedTechnician?.homeCoordinates && isValidCoordinates(selectedTechnician.homeCoordinates)) {
      logger.debug('Map', 'Using technician coordinates:', selectedTechnician.homeCoordinates);
      validStartingCoords = selectedTechnician.homeCoordinates;
    }
    // Then try startingCoordinates state
    else if (startingCoordinates && isValidCoordinates(startingCoordinates)) {
      logger.debug('Map', 'Using starting coordinates:', startingCoordinates);
      validStartingCoords = startingCoordinates;
    }
    // If coordinates are invalid, try to geocode the address
    else if (selectedTechnician?.homeAddress && selectedTechnician.homeAddress.trim()) {
      logger.debug('Map', 'Invalid coordinates, geocoding technician address:', selectedTechnician.homeAddress);
      validStartingCoords = await geocodeTechnicianAddress(selectedTechnician.homeAddress);
      if (validStartingCoords && isValidCoordinates(validStartingCoords)) {
        logger.debug('Map', 'Geocoded coordinates:', validStartingCoords);
        setStartingCoordinates(validStartingCoords);
      }
    }
    else if (startingAddress && startingAddress.trim()) {
      logger.debug('Map', 'Invalid coordinates, geocoding address:', startingAddress);
      validStartingCoords = await geocodeTechnicianAddress(startingAddress);
      if (validStartingCoords && isValidCoordinates(validStartingCoords)) {
        logger.debug('Map', 'Geocoded coordinates:', validStartingCoords);
        setStartingCoordinates(validStartingCoords);
      }
    }
    
    // If still invalid, use default or wait
    if (!isValidCoordinates(validStartingCoords)) {
      logger.warn('Map', 'No valid coordinates found. Technician:', selectedTechnician?.name || 'none', 'Address:', selectedTechnician?.homeAddress || startingAddress || 'none');
      if (!selectedTechnician && !startingAddress) {
        logger.warn('Map', 'No technician or address available, using default location');
        validStartingCoords = DEFAULTS.MAP_CENTER;
      } else {
        logger.debug('Map', 'Waiting for technician coordinates to load...');
        return;
      }
    }

    try {
      if (!mapInstanceRef.current) {
        const mapOptions = {
          center: validStartingCoords,
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true
        };
        
        if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
          mapOptions.mapId = 'TRIP_WIZARD_MAP';
        }
        
        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.setCenter(validStartingCoords);
      }

      const map = mapInstanceRef.current;
      setMapInitialized(true);

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Clear existing directions
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      const activeCustomers = customers.filter(c => c.coordinates && isValidCoordinates(c.coordinates));
      const displayOrder = costPreview?.metadata?.optimized_sequence
        ? costPreview.metadata.optimized_sequence.map(id => activeCustomers.find(c => c.id === id)).filter(Boolean)
        : activeCustomers;

      // Add markers
      const bounds = new window.google.maps.LatLngBounds();

      // Home marker
      const homeMarkerContent = document.createElement('div');
      homeMarkerContent.style.fontSize = '24px';
      homeMarkerContent.innerHTML = '🏠';

      const homeMarker = new window.google.maps.marker.AdvancedMarkerElement({
        position: validStartingCoords,
        map: map,
        title: 'Starting Point',
        content: homeMarkerContent
      });
      markersRef.current.push(homeMarker);
      bounds.extend(validStartingCoords);

      // Customer markers
      displayOrder.forEach((customer, index) => {
        if (!isValidCoordinates(customer.coordinates)) {
          logger.warn('Map', `Invalid coordinates for customer ${customer.id}, skipping marker`);
          return;
        }
        
        const pinElement = new window.google.maps.marker.PinElement({
          glyphText: `${index + 1}`,
          glyphColor: 'white',
          background: '#667eea',
          borderColor: '#5a67d8'
        });

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: customer.coordinates,
          map: map,
          title: customer.name || `Stop ${index + 1}`,
          content: pinElement.element
        });
        markersRef.current.push(marker);
        bounds.extend(customer.coordinates);

        // Add airport markers
        const airports = airportOptions[customer.id];
        const selected = selectedAirports[customer.id];
        
        if (airports) {
          // Origin airports
          airports.origin?.forEach((airport) => {
            if (airport.lat && airport.lng) {
              const isSelected = selected?.origin?.code === airport.code;
              const airportMarkerContent = document.createElement('div');
              airportMarkerContent.style.fontSize = '20px';
              airportMarkerContent.innerHTML = '✈️';
              airportMarkerContent.style.opacity = isSelected ? '1' : '0.5';
              
              const airportMarker = new window.google.maps.marker.AdvancedMarkerElement({
                position: { lat: airport.lat, lng: airport.lng },
                map: map,
                title: `${airport.name} (${airport.code}) - ${isSelected ? 'Selected' : 'Alternative'} Departure`,
                content: airportMarkerContent,
                zIndex: isSelected ? 1000 : 500
              });
              markersRef.current.push(airportMarker);
              bounds.extend({ lat: airport.lat, lng: airport.lng });
            }
          });

          // Destination airports
          airports.destination?.forEach((airport) => {
            if (airport.lat && airport.lng) {
              const isSelected = selected?.destination?.code === airport.code;
              const airportMarkerContent = document.createElement('div');
              airportMarkerContent.style.fontSize = '20px';
              airportMarkerContent.innerHTML = '🛬';
              airportMarkerContent.style.opacity = isSelected ? '1' : '0.5';
              
              const airportMarker = new window.google.maps.marker.AdvancedMarkerElement({
                position: { lat: airport.lat, lng: airport.lng },
                map: map,
                title: `${airport.name} (${airport.code}) - ${isSelected ? 'Selected' : 'Alternative'} Destination`,
                content: airportMarkerContent,
                zIndex: isSelected ? 1000 : 500
              });
              markersRef.current.push(airportMarker);
              bounds.extend({ lat: airport.lat, lng: airport.lng });
            }
          });
        }
      });

      // Draw driving path using Directions API
      if (displayOrder.length > 0 && startingCoordinates && isValidCoordinates(startingCoordinates)) {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#667eea',
            strokeOpacity: 0.8,
            strokeWeight: 5
          }
        });
        directionsRendererRef.current = directionsRenderer;

        const waypoints = displayOrder.map(c => ({
          location: c.coordinates,
          stopover: true
        }));

        directionsService.route(
          {
            origin: startingCoordinates,
            destination: startingCoordinates,
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              directionsRenderer.setDirections(result);
            } else {
              logger.error('Map', 'Directions request failed due to ' + status);
            }
          }
        );
      }

      if (markersRef.current.length > 1) {
        map.fitBounds(bounds, { padding: 50 });
      } else {
        map.setCenter(validStartingCoords);
        map.setZoom(12);
      }
    } catch (error) {
      logger.error('Map', 'Error initializing map:', error);
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
    setStartingCoordinates
  ]);

  // Initialize map when dependencies change
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current) {
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
    googleMapsLoaded,
    initializeMap
  ]);

  return {
    mapRef,
    mapInstanceRef,
    markersRef,
    directionsRendererRef,
    googleMapsLoaded,
    mapInitialized,
    initializeMap
  };
};

export default useMap;

