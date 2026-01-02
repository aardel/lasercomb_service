import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { tripsAPI, placesAPI, hotelsAPI, flightsAPI, distanceAPI } from '../services/api';
import { getSettings, getActiveTechnician, setActiveTechnician, updateTechnician } from '../services/settingsStorage';
import { saveCustomer, searchCustomers, getCustomerByPlace } from '../services/customerStorage';
import { formatTime, formatHoursToTime, isEuropeanAirport, generateAirTravelLegs, logger, getAirlineName } from '../utils';
import { TRAVEL_THRESHOLDS, API_NAMES, API_OPTION_NAMES, AI_OPTIONS, TIMEOUTS, FLIGHT_SEARCH_LIMITS, DEFAULTS } from '../constants/travelConstants';
import { useMapProvider as useMap } from '../hooks/useMapProvider';
import { useFlightSearch } from '../hooks/useFlightSearch';
import { useCostCalculation } from '../hooks/useCostCalculation';
import {
  FlightsModal,
  TollDetailsModal,
  DateWarningModal,
  ApiStatusModal,
  AIPromptModal,
  SegmentFlightModal
} from '../components/trip';
import TripDetailsSection from '../components/trip/TripDetailsSection';
import RoutePlanningSection from '../components/trip/RoutePlanningSection';
import CostPreviewSection from '../components/trip/CostPreviewSection';
import RouteVisualization from '../components/trip/RouteVisualization';
import DashboardHeader from '../components/trip/DashboardHeader';
import LoadingIndicator from '../components/trip/LoadingIndicator';
import BackendStatusNotification from '../components/BackendStatusNotification';
import './TripWizardPage.css';

const API_URL = import.meta.env.VITE_API_URL || DEFAULTS.API_URL;

function TripWizardPage() {
  // Log page initialization
  useEffect(() => {
    logger.info('UI', 'TripWizardPage component mounted');
  }, []);
  const navigate = useNavigate();

  // Initialize with 1 customer slot
  const [customers, setCustomers] = useState([
    {
      id: `customer-${Date.now()}`,
      name: '',
      address: '',
      time_hours: '',
      coordinates: null,
      place_id: null,
      city: '',
      country: ''
    }
  ]);
  
  // Travel mode between customers: { segmentIndex: 'fly' | 'drive' }
  // segmentIndex 0 = Base → Customer 1, segmentIndex 1 = Customer 1 → Customer 2, etc.
  const [travelModes, setTravelModes] = useState({});
  
  // Transfer info between customers: { segmentIndex: { time: minutes, distance: km } }
  const [transferInfo, setTransferInfo] = useState({});
  
  // Route optimization state
  const [isOptimized, setIsOptimized] = useState(false);
  
  // AI Prompt Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [selectedOption, setSelectedOption] = useState(AI_OPTIONS.OPTION1);
  
  // Flights Selection Modal state
  const [showFlightsModal, setShowFlightsModal] = useState(false);
  const [flightsModalCustomerId, setFlightsModalCustomerId] = useState(null);
  const [selectedSearchApi, setSelectedSearchApi] = useState(API_NAMES.ALL);
  // searchingWithApi is now provided by useFlightSearch hook

  // Toll Details Modal state
  const [showTollDetailsModal, setShowTollDetailsModal] = useState(false);
  const [tollDetails, setTollDetails] = useState([]);
  const [totalTollCost, setTotalTollCost] = useState(0);
  
  // Date Warning Modal state
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [dateWarningMessage, setDateWarningMessage] = useState('');

  // Initialize starting address - will be loaded from API in useEffect
  const [startingAddress, setStartingAddress] = useState('');
  const [startingCoordinates, setStartingCoordinates] = useState(null);
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [suggestions, setSuggestions] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState({}); // { customerId: [hotels] }
  const [loadingHotels, setLoadingHotels] = useState({}); // { customerId: boolean }
  
  // Multi-segment flight selection for multi-customer trips
  // Structure: { segmentIndex: { flight: {...}, mode: 'fly'|'drive', searchResults: [...] } }
  // Segment 0 = Base → Customer 1, Segment 1 = Customer 1 → Customer 2, etc.
  const [segmentFlights, setSegmentFlights] = useState({});
  const [activeSegmentModal, setActiveSegmentModal] = useState(null); // Which segment's modal is open
  const [loadingSegmentFlights, setLoadingSegmentFlights] = useState({}); // { segmentIndex: boolean }
  
  // API Status Tracking
  const [apiStatuses, setApiStatuses] = useState({
    groq: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
    amadeus: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
    serpapi: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
    googleMaps: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
    tollApi: { status: 'unknown', message: 'Not tested yet', lastChecked: null }
  });
  const [showApiStatusModal, setShowApiStatusModal] = useState(false);
  const [testingApis, setTestingApis] = useState(false);
  
  // Cost calculation is now managed by useCostCalculation hook
  // Collapsible section states
  const [collapsedSections, setCollapsedSections] = useState({});
  // Technician selection
  const [allTechnicians, setAllTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  // Airport options: { customerId: { origin: [airports], destination: [airports] } }
  const [airportOptions, setAirportOptions] = useState({});
  // Selected airports: { customerId: { origin: airport, destination: airport } }
  const [selectedAirports, setSelectedAirports] = useState({});
  const [loadingAirports, setLoadingAirports] = useState({}); // { customerId: boolean }
  // Selected departure and return airports (from technician's airports)
  const [selectedDepartureAirport, setSelectedDepartureAirport] = useState(null);
  const [selectedReturnAirport, setSelectedReturnAirport] = useState(null);
  // Nearest airport for each customer: { customerId: airport }
  const [customerNearestAirports, setCustomerNearestAirports] = useState({});
  const [loadingCustomerAirports, setLoadingCustomerAirports] = useState({}); // { customerId: boolean }

  // Ref to track last flight search to prevent duplicate calls
  const lastFlightSearchRef = useRef({});

  // State for selected flight and rental car (managed locally, passed to hooks)
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedRentalCar, setSelectedRentalCar] = useState(null);

  // New trip-level fields for quote form
  const [einsatzart, setEinsatzart] = useState(''); // Type of deployment
  const [auftrag, setAuftrag] = useState(''); // Order/Job number
  const [reisekostenpauschale, setReisekostenpauschale] = useState(null); // Travel cost flat rate
  const [useFlatRate, setUseFlatRate] = useState(false); // Use flat rate flag
  const [partsText, setPartsText] = useState(''); // Parts text field
  const [excessBaggage, setExcessBaggage] = useState({ cost: 0, description: '' }); // Excess baggage (flight-related)

  // Machine info per customer (customer-related)
  // Structure: { customerId: { masch_typ: string, seriennr: string, job_task: string } }
  const [customerMachineInfo, setCustomerMachineInfo] = useState({});

  // Update API status based on response or error
  const updateApiStatus = useCallback((apiName, response, error = null) => {
    setApiStatuses(prev => {
      const newStatus = { ...prev };
      const now = new Date().toISOString();
      
      if (error) {
        // Check for specific error types
        const errorMessage = error.message || error.toString();
        if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
          newStatus[apiName] = { status: 'rate_limited', message: 'Rate limit exceeded', lastChecked: now };
        } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.toLowerCase().includes('unauthorized')) {
          newStatus[apiName] = { status: 'auth_error', message: 'Authentication failed', lastChecked: now };
        } else if (errorMessage.toLowerCase().includes('disabled')) {
          newStatus[apiName] = { status: 'disabled', message: 'API disabled in settings', lastChecked: now };
        } else {
          newStatus[apiName] = { status: 'error', message: errorMessage.substring(0, 50), lastChecked: now };
        }
      } else if (response) {
        // Check response for success
        if (response.success === false || response.error) {
          const msg = response.error || 'Request failed';
          if (msg.includes('rate limit') || msg.includes('429')) {
            newStatus[apiName] = { status: 'rate_limited', message: 'Rate limit exceeded', lastChecked: now };
          } else {
            newStatus[apiName] = { status: 'warning', message: msg.substring(0, 50), lastChecked: now };
          }
        } else {
          newStatus[apiName] = { status: 'ok', message: 'Working', lastChecked: now };
        }
      }
      
      return newStatus;
    });
  }, []);
  
  // Get overall API health status
  const getOverallApiHealth = useCallback(() => {
    const statuses = Object.values(apiStatuses);
    const hasError = statuses.some(s => s.status === 'error' || s.status === 'auth_error');
    const hasRateLimit = statuses.some(s => s.status === 'rate_limited');
    const hasWarning = statuses.some(s => s.status === 'warning');
    const allUnknown = statuses.every(s => s.status === 'unknown');
    
    if (hasError) return 'error';
    if (hasRateLimit) return 'rate_limited';
    if (hasWarning) return 'warning';
    if (allUnknown) return 'unknown';
    return 'ok';
  }, [apiStatuses]);

  // Test all APIs to check their status
  const testAllApis = useCallback(async () => {
    setTestingApis(true);
    const now = new Date().toISOString();
    
    // Update all to "testing" status
    setApiStatuses({
      groq: { status: 'testing', message: 'Testing...', lastChecked: now },
      amadeus: { status: 'testing', message: 'Testing...', lastChecked: now },
      serpapi: { status: 'testing', message: 'Testing...', lastChecked: now },
      googleMaps: { status: 'testing', message: 'Testing...', lastChecked: now },
      tollApi: { status: 'testing', message: 'Testing...', lastChecked: now }
    });
    
    try {
      // Test flight APIs with a round-trip search (use return date to avoid SerpAPI issues)
      const testOrigin = { code: 'STR', lat: 48.6879, lng: 9.2207 };
      const testDest = { code: 'MXP', lat: 45.6306, lng: 8.7281 };
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 30); // 30 days from now
      const testDateStr = testDate.toISOString().split('T')[0];
      const returnDate = new Date(testDate);
      returnDate.setDate(returnDate.getDate() + 1);
      const returnDateStr = returnDate.toISOString().split('T')[0];
      
      const settings = getSettings();
      const apiPreferences = settings.apiSettings?.flightApis || null;
      
      // Check if each API is enabled/disabled
      const groqEnabled = apiPreferences?.groq?.enabled !== false;
      const amadeusEnabled = apiPreferences?.amadeus?.enabled !== false;
      const serpEnabled = apiPreferences?.googleFlights?.enabled !== false;
      
      // Test flight search
      try {
        const response = await flightsAPI.search({
          origin: testOrigin,
          destination: testDest,
          departureDate: testDateStr,
          returnDate: returnDateStr, // Include return date
          limit: 1,
          apiPreferences
        });
        
        const responseNow = new Date().toISOString();
        const data = response.data || {};
        // Check both 'source' and 'provider' fields (backend uses 'provider')
        const source = (data.source || data.provider || '').toLowerCase();
        const errorMsg = (data.error || '').toLowerCase();
        const searchDetails = data.search_details || {};
        
        logger.debug('API', 'Response source/provider:', source, 'error:', errorMsg, 'options:', data.options?.length);
        
        // Determine status based on source and results
        if (source.includes('groq')) {
          if (data.options?.length > 0) {
            setApiStatuses(prev => ({ ...prev, groq: { status: 'ok', message: `${data.options.length} results`, lastChecked: responseNow } }));
          } else {
            setApiStatuses(prev => ({ ...prev, groq: { status: 'warning', message: 'No results', lastChecked: responseNow } }));
          }
        } else if (!groqEnabled) {
          setApiStatuses(prev => ({ ...prev, groq: { status: 'disabled', message: 'Disabled', lastChecked: responseNow } }));
        } else if (errorMsg.includes('groq') && (errorMsg.includes('rate') || errorMsg.includes('429'))) {
          setApiStatuses(prev => ({ ...prev, groq: { status: 'rate_limited', message: 'Rate limited', lastChecked: responseNow } }));
        } else {
          setApiStatuses(prev => ({ ...prev, groq: { status: 'warning', message: 'Not used', lastChecked: responseNow } }));
        }
        
        if (source.includes('amadeus')) {
          if (data.options?.length > 0) {
            setApiStatuses(prev => ({ ...prev, amadeus: { status: 'ok', message: `${data.options.length} results`, lastChecked: responseNow } }));
          } else {
            setApiStatuses(prev => ({ ...prev, amadeus: { status: 'warning', message: 'No results', lastChecked: responseNow } }));
          }
        } else if (!amadeusEnabled) {
          setApiStatuses(prev => ({ ...prev, amadeus: { status: 'disabled', message: 'Disabled', lastChecked: responseNow } }));
        } else if (errorMsg.includes('amadeus') && (errorMsg.includes('rate') || errorMsg.includes('429'))) {
          setApiStatuses(prev => ({ ...prev, amadeus: { status: 'rate_limited', message: 'Rate limited', lastChecked: responseNow } }));
        } else {
          setApiStatuses(prev => ({ ...prev, amadeus: { status: 'warning', message: 'Not used', lastChecked: responseNow } }));
        }
        
        if (source.includes('serp') || source.includes('google')) {
          if (data.options?.length > 0) {
            setApiStatuses(prev => ({ ...prev, serpapi: { status: 'ok', message: `${data.options.length} results`, lastChecked: responseNow } }));
          } else {
            setApiStatuses(prev => ({ ...prev, serpapi: { status: 'warning', message: 'No results', lastChecked: responseNow } }));
          }
        } else if (!serpEnabled) {
          setApiStatuses(prev => ({ ...prev, serpapi: { status: 'disabled', message: 'Disabled', lastChecked: responseNow } }));
        } else if (errorMsg.includes('serp') && (errorMsg.includes('rate') || errorMsg.includes('429'))) {
          setApiStatuses(prev => ({ ...prev, serpapi: { status: 'rate_limited', message: 'Rate limited', lastChecked: responseNow } }));
        } else {
          setApiStatuses(prev => ({ ...prev, serpapi: { status: 'warning', message: 'Not used', lastChecked: responseNow } }));
        }
        
      } catch (flightError) {
        logger.error('API', 'Flight API error:', flightError);
        const errMsg = (flightError.message || '').toLowerCase();
        const responseNow = new Date().toISOString();
        
        const status = errMsg.includes('429') || errMsg.includes('rate') ? 'rate_limited' : 'error';
        const message = status === 'rate_limited' ? 'Rate limited' : 'Error';
        
        setApiStatuses(prev => ({ 
          ...prev, 
          groq: groqEnabled ? { status, message, lastChecked: responseNow } : { status: 'disabled', message: 'Disabled', lastChecked: responseNow },
          amadeus: amadeusEnabled ? { status, message, lastChecked: responseNow } : { status: 'disabled', message: 'Disabled', lastChecked: responseNow },
          serpapi: serpEnabled ? { status, message, lastChecked: responseNow } : { status: 'disabled', message: 'Disabled', lastChecked: responseNow }
        }));
      }
      
      // Test Google Maps (check if loaded)
      const mapsNow = new Date().toISOString();
      if (window.google && window.google.maps) {
        setApiStatuses(prev => ({ ...prev, googleMaps: { status: 'ok', message: 'Loaded', lastChecked: mapsNow } }));
      } else {
        setApiStatuses(prev => ({ ...prev, googleMaps: { status: 'warning', message: 'Not loaded', lastChecked: mapsNow } }));
      }
      
      // Test Toll API via health endpoint
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const healthResponse = await axios.get(`${API_URL}/api/health`);
        const tollNow = new Date().toISOString();
        if (healthResponse.data?.status === 'ok') {
          setApiStatuses(prev => ({ ...prev, tollApi: { status: 'ok', message: 'Backend OK', lastChecked: tollNow } }));
        } else {
          setApiStatuses(prev => ({ ...prev, tollApi: { status: 'ok', message: 'Connected', lastChecked: tollNow } }));
        }
      } catch (tollError) {
        // Suppress logging for health check failures (expected when backend is down)
        const tollNow = new Date().toISOString();
        setApiStatuses(prev => ({ ...prev, tollApi: { status: 'warning', message: 'Backend unavailable', lastChecked: tollNow } }));
      }
      
    } catch (error) {
      logger.error('API', 'General error:', error);
    } finally {
      setTestingApis(false);
    }
  }, []);

  // Auto-run API test on first page load
  useEffect(() => {
    // Small delay to let the page render first
    const timer = setTimeout(() => {
      logger.info('API', 'Running automatic API health check on page load...');
      logger.info('UI', 'TripWizardPage initialized');
      testAllApis();
    }, 2000); // 2 second delay after page load
    
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use a ref to store the hook's fetchTravelOptionsWithAirports function
  const fetchTravelOptionsWithAirportsRef = useRef(null);

  // Handle airport selection - defined early for useFlightSearch hook
  const handleAirportSelect = useCallback(async (customerId, type, airport, event) => {
    // Prevent any event propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    logger.debug('Airport', `Airport selected: ${type} - ${airport.code} (${airport.name})`);
    
    // Update state first - preserve distance_km from the airport object
    const updatedSelection = {
      ...selectedAirports[customerId],
      [type]: {
        ...airport,
        // Ensure all required fields are present, preserve distance_km
        code: airport.code,
        name: airport.name,
        lat: airport.lat || airport.latitude,
        lng: airport.lng || airport.longitude,
        distance_km: airport.distance_km !== undefined ? airport.distance_km : (airport.distance_km || 0)
      }
    };
    
    setSelectedAirports(prev => ({
      ...prev,
      [customerId]: updatedSelection
    }));

    // Re-trigger flight search with selected airports immediately
    // Use the updated selection directly instead of waiting for state
    const customer = customers.find(c => c.id === customerId);
    if (customer?.coordinates && fetchTravelOptionsWithAirportsRef.current) {
      // Temporarily use the updated selection for the search
      const tempSelectedAirports = {
        ...selectedAirports,
        [customerId]: updatedSelection
      };
      
      // Call fetchTravelOptions with the updated airports using the hook's function
      await fetchTravelOptionsWithAirportsRef.current(customerId, customer.coordinates, tempSelectedAirports);
    }
  }, [customers, selectedAirports]);

  // Use the useFlightSearch hook for flight search functionality
  const {
    flights,
    loadingFlights,
    rentalCars,
    loadingRentalCars,
    searchingWithApi,
    setFlights,
    setLoadingFlights,
    setRentalCars,
    fetchTravelOptions,
    fetchTravelOptionsWithAirports
  } = useFlightSearch({
    updateApiStatus,
    setSelectedTechnician,
    setDateWarningMessage,
    setShowDateWarningModal,
    setSelectedFlight,
    setSelectedRentalCar,
    setAirportOptions,
    setSelectedAirports,
    handleAirportSelect,
    selectedTechnician,
    selectedAirports,
    airportOptions,
    selectedFlight,
    customers,
    tripDate,
    startingCoordinates,
    startingAddress
  });

  // Store the hook's function in a ref for handleAirportSelect to use
  useEffect(() => {
    fetchTravelOptionsWithAirportsRef.current = fetchTravelOptionsWithAirports;
  }, [fetchTravelOptionsWithAirports]);

  // Use the useCostCalculation hook for cost calculation functionality
  // Must be called before useMap since useMap needs costPreview
  const {
    costPreview,
    loadingCostPreview,
    fetchCostPreview
  } = useCostCalculation({
    customers,
    startingCoordinates,
    startingAddress,
    tripDate,
    selectedFlight,
    selectedRentalCar,
    segmentFlights,
    selectedTechnician,
    setSelectedTechnician,
    airportOptions,
    selectedAirports
  });

  // Use the useMap hook for Google Maps management
  // Must be called after useCostCalculation since it needs costPreview
  const {
    mapRef,
    mapInstanceRef,
    markersRef,
    directionsRendererRef,
    googleMapsLoaded,
    mapInitialized,
    initializeMap
  } = useMap({
    selectedTechnician,
    startingCoordinates,
    startingAddress,
    customers,
    costPreview,
    airportOptions,
    selectedAirports,
    setStartingCoordinates
  });

  // isEuropeanAirport imported from '../utils/airportUtils'
  // generateAirTravelLegs imported from '../utils/travelUtils'

  // Helper to validate coordinates
  const isValidCoordinates = (coords) => {
    return coords && 
           typeof coords.lat === 'number' && 
           typeof coords.lng === 'number' &&
           !isNaN(coords.lat) && 
           !isNaN(coords.lng) &&
           coords.lat >= -90 && coords.lat <= 90 &&
           coords.lng >= -180 && coords.lng <= 180;
  };

  // Geocode technician address using Google Places API
  const geocodeTechnicianAddress = async (address) => {
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
    } catch (error) {
      logger.error('Map', 'Error geocoding technician address:', error);
    }
    return null;
  };

  // Load technicians from API on mount and geocode addresses
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        // Load all technicians from API
        const { getAllTechnicians } = await import('../services/settingsStorage');
        const technicians = await getAllTechnicians();
        setAllTechnicians(technicians);
        
        // Load active technician from API
        const { getActiveTechnician } = await import('../services/settingsStorage');
        const activeTech = await getActiveTechnician();
        setSelectedTechnician(activeTech);
        
        // Update starting address from technician
        if (activeTech) {
          setStartingAddress(activeTech.homeAddress || '');
          
          // Set default departure and return airports (first airport from technician's airports)
          // Filter out invalid airports
          const validAirports = (activeTech.airports || []).filter(a => a && a.code);
          if (validAirports.length > 0) {
            setSelectedDepartureAirport(validAirports[0]);
            setSelectedReturnAirport(validAirports[0]);
            logger.info('Technician', 'Loaded airports:', validAirports.map(a => a.code).join(', '));
          } else {
            logger.warn('Technician', 'No valid airports found');
          }
          
          // Validate existing coordinates or geocode the address
          if (activeTech.homeCoordinates && isValidCoordinates(activeTech.homeCoordinates)) {
            logger.debug('Technician', 'Using cached coordinates:', activeTech.homeCoordinates);
            setStartingCoordinates(activeTech.homeCoordinates);
          } else if (activeTech.homeAddress) {
            // Geocode the address to get correct coordinates
            logger.debug('Technician', 'Geocoding address:', activeTech.homeAddress);
            const coords = await geocodeTechnicianAddress(activeTech.homeAddress);
            if (coords && isValidCoordinates(coords)) {
              logger.debug('Technician', 'Geocoded coordinates:', coords);
              setStartingCoordinates(coords);
              // Update technician's coordinates in storage
              if (activeTech.id) {
                updateTechnician(activeTech.id, { homeCoordinates: coords });
              }
            } else {
              logger.warn('Technician', 'Failed to geocode address:', activeTech.homeAddress);
            }
          } else {
            logger.warn('Technician', 'No coordinates or address for technician:', activeTech.name);
          }
        }
      } catch (error) {
        logger.error('Technician', 'Error loading technicians:', error);
      }
    };
    
    loadTechnicians();
  }, []);

  // Map initialization is now handled by useMap hook

  // Update starting address when technician changes
  const handleTechnicianChange = async (techId) => {
    const tech = allTechnicians.find(t => t.id === techId);
    if (tech) {
      setSelectedTechnician(tech);
      setActiveTechnician(techId);
      setStartingAddress(tech.homeAddress);
      
      // Set default departure and return airports
      if (tech.airports && tech.airports.length > 0) {
        setSelectedDepartureAirport(tech.airports[0]);
        setSelectedReturnAirport(tech.airports[0]);
      } else {
        setSelectedDepartureAirport(null);
        setSelectedReturnAirport(null);
      }
      
      // Validate or geocode coordinates
      if (tech.homeCoordinates && isValidCoordinates(tech.homeCoordinates)) {
        setStartingCoordinates(tech.homeCoordinates);
      } else if (tech.homeAddress) {
        // Geocode the address to get correct coordinates
        const coords = await geocodeTechnicianAddress(tech.homeAddress);
        if (coords && isValidCoordinates(coords)) {
          setStartingCoordinates(coords);
          // Update technician's coordinates in storage
          updateTechnician(techId, { homeCoordinates: coords });
        }
      }
    }
  };

  // Map initialization is now handled by useMap hook - removed old code

  // Map initialization is now handled by useMap hook

  // Geocode starting address (only if coordinates are not already set from technician)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!startingAddress.trim()) return;
      
      // If coordinates are already set and match the selected technician's address, don't geocode
      if (selectedTechnician?.homeAddress === startingAddress && selectedTechnician?.homeCoordinates) {
        // Address matches technician's address - use technician's coordinates
        if (!startingCoordinates || 
            startingCoordinates.lat !== selectedTechnician.homeCoordinates.lat || 
            startingCoordinates.lng !== selectedTechnician.homeCoordinates.lng) {
          setStartingCoordinates(selectedTechnician.homeCoordinates);
        }
        return; // Don't geocode if we have technician coordinates
      }
      
      // Only geocode if we don't have coordinates or address doesn't match technician
      try {
        const response = await placesAPI.autocomplete(startingAddress);
        if (response.data.success && response.data.data.length > 0) {
          const place = response.data.data[0];
          const detailsResponse = await placesAPI.getDetails(place.place_id);
          if (detailsResponse.data.success && detailsResponse.data.data) {
            const details = detailsResponse.data.data;
            if (details.latitude && details.longitude) {
              setStartingCoordinates({
                lat: details.latitude,
                lng: details.longitude
              });
            }
          }
        }
      } catch (error) {
        logger.error('Map', 'Error geocoding starting address:', error);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [startingAddress, selectedTechnician]);

  // Cost calculation is now managed by useCostCalculation hook
  // The fetchCostPreview function and related useEffect hooks are now in the hook

  // AUTO-SEARCH: Trigger searches when customer coordinates are resolved OR date changes
  // 5. Automated searches when customer location is set
  // For multi-customer trips: Only search flights for first (outbound) and last (return) customers
  // Merged useEffect: Fetch travel options when customer data or trip basics change
  // This replaces the previous TWO duplicate useEffect hooks that were causing infinite loops
  useEffect(() => {
    const activeCustomers = customers.filter(c => c.coordinates && c.name && c.address);
    const isMultiCustomer = activeCustomers.length > 1;

    if (!startingCoordinates) {
      return; // Don't fetch until we have starting coordinates
    }

    activeCustomers.forEach((customer, index) => {
      if (customer.coordinates) {
        // Always fetch airports for all customers (needed for map display)
        fetchAirports(customer.id, startingCoordinates, customer.coordinates);

        // Always fetch hotels for all customers
        fetchNearbyHotels(customer.id, customer.coordinates);

        // Flight searches: Only for first customer (outbound) and last customer (return) in multi-customer trips
        // For single customer: search round-trip
        // Create a search key to prevent duplicate searches
        const searchKey = `${customer.id}-${customer.coordinates.lat}-${customer.coordinates.lng}-${tripDate}`;
        const lastSearch = lastFlightSearchRef.current[customer.id];
        const hasRecentSearch = lastSearch && (Date.now() - lastSearch.timestamp < 5000) && lastSearch.key === searchKey;

        // Only fetch if we don't already have flight data for this customer AND haven't searched recently
        const hasExistingFlights = flights[customer.id]?.options?.length > 0;

        if (!hasExistingFlights && !hasRecentSearch) {
          // Mark this search as in progress
          lastFlightSearchRef.current[customer.id] = { key: searchKey, timestamp: Date.now() };

          if (!isMultiCustomer) {
            // Single customer: Round-trip flight search
            fetchTravelOptions(customer.id, customer.coordinates);
          } else {
            // Multi-customer:
            // - First customer: Outbound flight (Base → First Customer)
            // - Last customer: Return flight (Last Customer → Base)
            // - Intermediate customers: No flight search (reached by ground travel)
            const isFirstCustomer = index === 0;
            const isLastCustomer = index === activeCustomers.length - 1;

            if (isFirstCustomer) {
              // Search outbound flight: Base → First Customer
              fetchTravelOptions(customer.id, customer.coordinates, false, true, false); // outboundOnly = true
            } else if (isLastCustomer) {
              // Search return flight: Last Customer → Base
              fetchTravelOptions(customer.id, customer.coordinates, false, false, true); // returnOnly = true
            }
            // Intermediate customers: No flight search needed
          }
        }
      }
    });
  }, [
    // Only re-run when these specific values change
    JSON.stringify(customers.map(c => ({
      id: c.id,
      lat: c.coordinates?.lat,
      lng: c.coordinates?.lng,
      address: c.address,
      time: c.time_hours
    }))),
    startingCoordinates?.lat,
    startingCoordinates?.lng,
    tripDate
    // NOTE: fetchTravelOptions is intentionally NOT in dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);




  // Get active customers (non-empty)
  const getActiveCustomers = () => {
    return customers.filter(c => c.name || c.address);
  };
  
  // Fetch nearest airport for a customer
  const fetchCustomerNearestAirport = async (customerId, coordinates, country = null) => {
    if (!coordinates || !coordinates.lat || !coordinates.lng) return;
    
    setLoadingCustomerAirports(prev => ({ ...prev, [customerId]: true }));
    try {
      const response = await placesAPI.getNearbyAirports(coordinates.lat, coordinates.lng, 1, country);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const nearestAirport = response.data.data[0];
        setCustomerNearestAirports(prev => ({ ...prev, [customerId]: nearestAirport }));
      }
    } catch (error) {
      logger.error('Airport', 'Error fetching nearest airport for customer:', error);
    } finally {
      setLoadingCustomerAirports(prev => ({ ...prev, [customerId]: false }));
    }
  };

  // Calculate distance and time between two points
  const calculateSegmentDistance = async (from, to) => {
    if (!from?.coordinates || !to?.coordinates) return null;
    
    try {
      const response = await distanceAPI.calculate(from.coordinates, to.coordinates);
      if (response.data.success && response.data.data) {
        return {
          distance_km: response.data.data.distance_km,
          time_minutes: response.data.data.duration_minutes
        };
      }
    } catch (error) {
      logger.error('Distance', 'Error calculating distance:', error);
    }
    return null;
  };
  
  // Analyze and set travel modes for all segments
  const analyzeTravelModes = async () => {
    const activeCustomers = getActiveCustomers();
    if (activeCustomers.length === 0) return;
    
    const newTravelModes = {};
    const newTransferInfo = {};
    const DRIVING_TIME_THRESHOLD_HOURS = TRAVEL_THRESHOLDS.DRIVING_TIME_HOURS;
    const DRIVING_DISTANCE_THRESHOLD_KM = TRAVEL_THRESHOLDS.DRIVING_DISTANCE_KM;
    
    // Base → First Customer
    if (startingCoordinates && activeCustomers[0].coordinates) {
      const segmentInfo = await calculateSegmentDistance(
        { coordinates: startingCoordinates },
        activeCustomers[0]
      );
      if (segmentInfo) {
        const drivingTimeHours = segmentInfo.time_minutes / 60;
        const shouldFly = drivingTimeHours > DRIVING_TIME_THRESHOLD_HOURS || 
                         segmentInfo.distance_km > DRIVING_DISTANCE_THRESHOLD_KM;
        newTravelModes[0] = shouldFly ? 'fly' : 'drive';
        newTransferInfo[0] = segmentInfo;
      }
    }
    
    // Between customers
    for (let i = 0; i < activeCustomers.length - 1; i++) {
      const segmentInfo = await calculateSegmentDistance(
        activeCustomers[i],
        activeCustomers[i + 1]
      );
      if (segmentInfo) {
        const drivingTimeHours = segmentInfo.time_minutes / 60;
        const shouldFly = drivingTimeHours > DRIVING_TIME_THRESHOLD_HOURS || 
                         segmentInfo.distance_km > DRIVING_DISTANCE_THRESHOLD_KM;
        newTravelModes[i + 1] = shouldFly ? 'fly' : 'drive';
        newTransferInfo[i + 1] = segmentInfo;
      }
    }
    
    setTravelModes(newTravelModes);
    setTransferInfo(newTransferInfo);
  };
  
  // Optimize route order (TSP-like optimization)
  const optimizeRoute = async () => {
    const activeCustomers = getActiveCustomers();
    if (activeCustomers.length < 2) return;
    
    // Calculate distances between all customer pairs
    const distances = {};
    for (let i = 0; i < activeCustomers.length; i++) {
      for (let j = i + 1; j < activeCustomers.length; j++) {
        const dist = await calculateSegmentDistance(activeCustomers[i], activeCustomers[j]);
        if (dist) {
          distances[`${i}-${j}`] = dist.distance_km;
          distances[`${j}-${i}`] = dist.distance_km;
        }
      }
    }
    
    // Simple nearest neighbor algorithm
    const optimized = [0]; // Start with first customer
    const remaining = Array.from({ length: activeCustomers.length - 1 }, (_, i) => i + 1);
    
    let current = 0;
    while (remaining.length > 0) {
      let nearest = remaining[0];
      let nearestDist = distances[`${current}-${nearest}`] || Infinity;
      
      for (const candidate of remaining) {
        const dist = distances[`${current}-${candidate}`] || Infinity;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = candidate;
        }
      }
      
      optimized.push(nearest);
      remaining.splice(remaining.indexOf(nearest), 1);
      current = nearest;
    }
    
    // Reorder customers based on optimization
    const reorderedCustomers = [...customers];
    const activeIndices = customers.map((c, idx) => 
      c.name || c.address ? idx : -1
    ).filter(idx => idx !== -1);
    
    optimized.forEach((newIdx, order) => {
      const oldIdx = activeIndices[newIdx];
      if (oldIdx !== undefined) {
        reorderedCustomers[oldIdx] = activeCustomers[order];
      }
    });
    
    setCustomers(reorderedCustomers);
    setIsOptimized(true);
    
    // Re-analyze travel modes after reordering
    setTimeout(() => analyzeTravelModes(), TIMEOUTS.STATE_UPDATE_DELAY);
  };

  // Generate AI prompt for route optimization
  const generateAIPrompt = () => {
    const activeCustomers = getActiveCustomers();
    
    if (activeCustomers.length === 0) {
      alert('Please add at least one customer before generating the AI prompt.');
      return;
    }

    // Build base/technician information
    const baseInfo = {
      address: startingAddress || selectedTechnician?.homeAddress || 'Not set',
      coordinates: startingCoordinates ? {
        lat: startingCoordinates.lat,
        lng: startingCoordinates.lng
      } : null,
      nearestAirports: selectedTechnician?.airports || [],
      transportToAirport: selectedTechnician?.transportToAirport || 'taxi',
      taxiCost: selectedTechnician?.taxiCost || 0,
      parkingCostPerDay: selectedTechnician?.parkingCostPerDay || 0,
      timeToAirport: selectedTechnician?.timeToAirport || 45
    };

    // Build customer information with actual flight data
    const customerInfo = activeCustomers.map((customer, index) => {
      const segmentIndex = index; // segmentIndex 0 = Base → Customer 1
      const travelMode = travelModes[segmentIndex] || 'not determined';
      const transfer = transferInfo[segmentIndex] || null;
      
      // Get actual flight search results for this customer
      const flightData = flights[customer.id];
      const flightOptions = [];
      
      if (flightData && flightData.options && flightData.options.length > 0) {
        // Include top 3 flight options with real pricing
        flightData.options.slice(0, 3).forEach((flight, idx) => {
          const outbound = flight.outbound_flight;
          const returnFlight = flight.return_flight;
          const totalPrice = parseFloat(flight.total_price) || 0;
          const totalDuration = flight.total_duration_minutes || 0;
          
          flightOptions.push({
            option_number: idx + 1,
            price_eur: totalPrice.toFixed(2),
            total_duration_minutes: totalDuration,
            total_duration_formatted: formatTime(totalDuration),
            outbound: outbound ? {
              airline: outbound.airline,
              flight_number: outbound.flight_number,
              departure_airport: outbound.from,
              arrival_airport: outbound.to,
              departure_time: outbound.departure_time,
              arrival_time: outbound.arrival_time,
              duration_minutes: outbound.duration_minutes
            } : null,
            return_flight: returnFlight ? {
              airline: returnFlight.airline,
              flight_number: returnFlight.flight_number,
              departure_airport: returnFlight.from,
              arrival_airport: returnFlight.to,
              departure_time: returnFlight.departure_time,
              arrival_time: returnFlight.arrival_time,
              duration_minutes: returnFlight.duration_minutes
            } : null,
            is_one_way: !returnFlight
          });
        });
      }
      
      return {
        index: index + 1,
        name: customer.name || 'Unnamed Customer',
        address: customer.address || 'Address not set',
        coordinates: customer.coordinates ? {
          lat: customer.coordinates.lat,
          lng: customer.coordinates.lng
        } : null,
        city: customer.city || '',
        country: customer.country || '',
        workHours: parseFloat(customer.time_hours) || 0,
        workHoursFormatted: formatHoursToTime(parseFloat(customer.time_hours) || 0),
        nearestAirport: customerNearestAirports[customer.id] ? {
          code: customerNearestAirports[customer.id].code,
          name: customerNearestAirports[customer.id].name,
          distance_km: customerNearestAirports[customer.id].distance_to_home_km
        } : null,
        travelFromBase: segmentIndex === 0 ? {
          mode: travelMode,
          distance_km: transfer?.distance_km || null,
          time_minutes: transfer?.time_minutes || null,
          time_formatted: transfer ? formatTime(transfer.time_minutes) : null
        } : null,
        travelToNext: segmentIndex < activeCustomers.length - 1 ? {
          mode: travelModes[segmentIndex + 1] || 'not determined',
          distance_km: transferInfo[segmentIndex + 1]?.distance_km || null,
          time_minutes: transferInfo[segmentIndex + 1]?.time_minutes || null,
          time_formatted: transferInfo[segmentIndex + 1] ? formatTime(transferInfo[segmentIndex + 1].time_minutes) : null
        } : null,
        availableFlights: flightOptions.length > 0 ? flightOptions : null,
        flightSearchStatus: flightData ? (flightData.options?.length > 0 ? 'available' : 'no_flights_found') : 'not_searched'
      };
    });

    // Calculate totals
    const totalWorkHours = activeCustomers.reduce((sum, c) => sum + (parseFloat(c.time_hours) || 0), 0);
    const totalDistance = Object.values(transferInfo).reduce((sum, info) => sum + (info?.distance_km || 0), 0);
    const totalTravelTime = Object.values(transferInfo).reduce((sum, info) => sum + (info?.time_minutes || 0), 0);

    // Build the prompt
    const prompt = `You are a travel route optimization expert for a service technician trip planning system. Analyze and optimize this multi-customer service trip:

## BASE LOCATION (DEPARTURE POINT)
- Address: ${baseInfo.address}
- Coordinates: ${baseInfo.coordinates ? `${baseInfo.coordinates.lat}, ${baseInfo.coordinates.lng}` : 'Not geocoded'}
- Nearest Airports: ${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports.map(a => `${a.name} (${a.code}) - ${a.distance_to_home_km}km`).join(', ') : 'None cached'}
- Transport to Airport: ${baseInfo.transportToAirport === 'taxi' ? `Taxi (€${baseInfo.taxiCost} round-trip, ${baseInfo.timeToAirport} min)` : `Personal Car (€${baseInfo.parkingCostPerDay}/day parking, ${baseInfo.timeToAirport} min)`}

## TRIP DATE
- Departure Date: ${tripDate || 'Not set'}

## CUSTOMERS TO VISIT (${activeCustomers.length} customer${activeCustomers.length > 1 ? 's' : ''})

${customerInfo.map(c => {
  let customerText = `### Customer ${c.index}: ${c.name}
- Address: ${c.address}
- Location: ${c.coordinates ? `${c.coordinates.lat}, ${c.coordinates.lng}` : 'Coordinates not available'}
- City: ${c.city || 'Not specified'}
- Country: ${c.country || 'Not specified'}
- Work Required: ${c.workHoursFormatted} (${c.workHours} hours)
- Nearest Airport: ${c.nearestAirport ? `${c.nearestAirport.name} (${c.nearestAirport.code}) - ${c.nearestAirport.distance_km}km away` : 'Not determined'}
${c.travelFromBase ? `- Travel from Base: ${c.travelFromBase.mode === 'fly' ? '✈️ FLY' : '🚗 DRIVE'} (${c.travelFromBase.distance_km ? `${c.travelFromBase.distance_km}km` : 'distance unknown'}, ${c.travelFromBase.time_formatted || 'time unknown'})` : ''}
${c.travelToNext ? `- Travel to Next Customer: ${c.travelToNext.mode === 'fly' ? '✈️ FLY' : '🚗 DRIVE'} (${c.travelToNext.distance_km ? `${c.travelToNext.distance_km}km` : 'distance unknown'}, ${c.travelToNext.time_formatted || 'time unknown'})` : ''}`;

  // Add actual flight options if available
  if (c.availableFlights && c.availableFlights.length > 0) {
    // Check if flights have valid prices (not €0.00)
    const validFlights = c.availableFlights.filter(f => parseFloat(f.price_eur) > 0);
    
    if (validFlights.length > 0) {
      customerText += `\n- **AVAILABLE FLIGHTS** (Real-time pricing for ${tripDate}):`;
      validFlights.forEach((flight, idx) => {
        customerText += `\n  **Option ${flight.option_number}**: €${flight.price_eur} | ${flight.total_duration_formatted} total`;
        if (flight.outbound) {
          customerText += `\n    Outbound: ${flight.outbound.departure_airport} → ${flight.outbound.arrival_airport} | ${flight.outbound.airline} ${flight.outbound.flight_number} | ${flight.outbound.departure_time} - ${flight.outbound.arrival_time} (${formatTime(flight.outbound.duration_minutes)})`;
        }
        if (flight.return_flight) {
          customerText += `\n    Return: ${flight.return_flight.departure_airport} → ${flight.return_flight.arrival_airport} | ${flight.return_flight.airline} ${flight.return_flight.flight_number} | ${flight.return_flight.departure_time} - ${flight.return_flight.arrival_time} (${formatTime(flight.return_flight.duration_minutes)})`;
        }
      });
    } else {
      // Flights exist but prices are €0.00 - need to search
      customerText += `\n- **AVAILABLE FLIGHTS**: Flight search returned no pricing data. YOU MUST search the web for current flight prices and schedules for ${tripDate}.`;
    }
  } else if (c.flightSearchStatus === 'no_flights_found') {
    customerText += `\n- **FLIGHT SEARCH**: No flights found for this route. YOU MUST search the web to verify availability and find alternative airports if needed.`;
  } else if (c.flightSearchStatus === 'not_searched') {
    customerText += `\n- **FLIGHT SEARCH**: Not yet searched. YOU MUST search the web for flights from base airports (${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports.map(a => a.code).join(', ') : 'search for nearest airports'}) to ${c.nearestAirport ? c.nearestAirport.code : 'customer airport'} for ${tripDate}.`;
  }
  
  return customerText;
}).join('\n')}

## CURRENT ROUTE SUMMARY
- Total Work Hours: ${formatHoursToTime(totalWorkHours)} (${totalWorkHours} hours)
- Total Travel Distance: ${totalDistance.toFixed(1)} km
- Total Travel Time: ${formatTime(totalTravelTime)}
- Current Route Order: ${customerInfo.map(c => `Customer ${c.index} (${c.name})`).join(' → ')}

## OPTIMIZATION CONSTRAINTS & RULES
1. **Travel Mode Decision:**
   - DRIVE if: Distance < 300km AND travel time < 4 hours
   - FLY if: Distance ≥ 300km OR travel time ≥ 4 hours
   - Consider country borders: International trips typically require flights

2. **Route Optimization Goals:**
   - Minimize total travel distance
   - Minimize total travel time
   - Minimize number of flights (flights are more expensive)
   - Group customers in same country/city when possible
   - Consider work hours: If a customer needs 8+ hours, plan a full day

3. **Multi-Customer Considerations:**
   - First customer: Can be reached by flight from base (if >4h drive)
   - Between customers: Use ground transport (rental car) if <4h drive, otherwise consider flight
   - Last customer: Return flight to base (if >4h drive from last customer to base)
   - Intermediate customers: Typically reached by ground transport from previous customer

4. **Cost Factors (PRICE-AWARE DECISIONS REQUIRED):**
   - **Flights**: 
     * ALWAYS search for ROUND-TRIP flights first (typically 30-50% cheaper than 2 one-way tickets)
     * Use ACTUAL flight prices from your web search or provided above
     * Include TOTAL cost: round-trip flight + airport transfers (taxi/car) + rental car at destination
     * Compare alternative airports - sometimes flying to a nearby airport saves €50-100
     * Factor in transfer costs: if alternative airport adds 30km drive but saves €80 on flight, it's worth it
   - **Ground travel**: Include fuel/mileage + tolls + rental car costs
   - **Work time**: Calculate based on hourly rate × total work hours
   - **Daily allowances**: Based on country rates for meals/accommodation
   - **Hotel costs**: Based on country-specific rates

5. **Flight Selection Guidance (MANDATORY):**
   - **ROUND-TRIP PREFERENCE**: Always recommend round-trip flights unless:
     * Round-trip is >50% more expensive than two one-way tickets
     * Round-trip flights are unavailable for the dates
     * Multi-city trip requires different return airport
   - **Price Comparison**: When multiple options exist:
     * Calculate TOTAL cost: flight + transfers + rental car
     * Example: Flight A (€100) + 50km transfer (€30) = €130 vs Flight B (€80) + 100km transfer (€60) = €140 → Choose Flight A
   - **Alternative Airports**: Always check if nearby airports offer better prices:
     * Base: ${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports.map(a => `${a.code}`).join(', ') : 'Search for nearest airports'}
     * Customer airports: Use the "Nearest Airport" codes provided for each customer
   - **Time vs Cost Trade-off**: 
     * If flight saves <2 hours but costs >€150 more than driving, recommend driving
     * If flight saves >4 hours and costs <€200 more than driving, recommend flying
   - **If no flights available**: Recommend ground transport and explain why

## YOUR TASK - PROVIDE TWO ROUTE OPTIONS

You MUST provide TWO complete route analyses:

### OPTION 1: MIXED MODE (FLIGHTS + GROUND TRANSPORT)
Analyze the route using flights where appropriate (>4h drive) and ground transport for shorter segments.

### OPTION 2: CAR-ONLY ROUTE (NO FLIGHTS)
Analyze the route using ONLY ground transport (car/rental car) for ALL segments, even if it means longer driving times.

For EACH option, provide:

1. **OPTIMIZED ROUTE ORDER**: The best sequence to visit customers (array of customer indices, starting from 1)
   - Consider: distance, time, country grouping, work hours distribution

2. **TRAVEL MODE FOR EACH SEGMENT**: For each segment (Base→Customer1, Customer1→Customer2, etc.), specify:
   - Mode: "drive" or "fly" (for Option 1) / "drive" only (for Option 2)
   - Reasoning: Why this mode/route is optimal
   - Estimated distance and time for each segment

3. **ROUTE EXPLANATION**: 
   - Why this route order is optimal
   - What factors influenced the decision
   - Any trade-offs considered
   - Total distance and time for the entire trip

4. **COST ESTIMATION** (if possible):
   - Total travel distance
   - Total travel time
   - Number of flights (if any) vs. ground segments
   - Estimated work days required
   - Rough cost comparison between the two options

5. **COMPARISON**: 
   - Compare Option 1 (Mixed) vs Option 2 (Car-Only)
   - Pros and cons of each approach
   - When would each option be preferred?

## OUTPUT FORMAT
Please provide your analysis in a clear, structured format with both options clearly separated. Focus on:
- Logical route ordering for both scenarios
- Efficient travel mode selection (mixed vs. car-only)
- Cost-effective decisions
- Practical considerations for a service technician
- Clear comparison between the two approaches

---

Note: This is a service trip where a technician needs to visit multiple customers to perform work. The goal is to provide both a mixed-mode route (with flights) and a car-only route option, so the user can compare and choose the best approach for their needs.

## FLIGHT SEARCH INSTRUCTIONS
**CRITICAL**: You MUST search for flights using the ACTUAL airports provided above. Do NOT hardcode or assume airports.

**When searching for flights:**
1. **Use ONLY the airports provided in the customer/base information above**:
   - Base departure: Use airports from "Nearest Airports" section in PRIORITY ORDER (closest first):
     ${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports.map((a, idx) => `${idx + 1}. ${a.code} (${a.name}) - ${a.distance_to_home_km}km from base`).join('\n     ') : 'Search for nearest airports to base location'}
   - Customer destinations: Use airports from each customer's "Nearest Airport" field
   - **AIRPORT PRIORITY**: Always try the CLOSEST airport to base FIRST (${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports[0].code : 'nearest airport'}), only use alternatives if:
     * No flights available from closest airport
     * Flights are significantly more expensive (>€100 difference)
     * Connecting flights from alternative airport save >€150 total
   
2. **ALWAYS search for ROUND-TRIP flights** when possible (cheaper than 2 one-way tickets):
   - Outbound: Base airport → Customer airport (departure date: ${tripDate})
   - Return: Customer airport → Base airport (return date: estimate based on work hours + travel time)
   - Only use one-way flights if round-trip is significantly more expensive or unavailable
   
3. **CONNECTING FLIGHTS ARE REQUIRED**:
   - **FIRST**: Search for DIRECT flights from closest base airport
   - **SECOND**: If no direct flights, search for CONNECTING flights (1 stop) from closest base airport
   - **THIRD**: If connecting flights from closest airport are too expensive (>€100 more), try alternative base airports
   - **ALWAYS** search connecting flights - they are often available when direct flights are not
   - Include connection details: connection airport, layover time, total journey time
   - Compare connecting flight total time vs driving time to determine if it's worth it
   
4. **Price awareness is CRITICAL**:
   - Always compare round-trip vs two one-way tickets
   - Compare direct flights vs connecting flights (connecting may be cheaper)
   - Consider alternative airports if they offer better prices (e.g., MUC vs FRA vs STR)
   - Factor in total cost: flight price + airport transfers + rental car + layover time cost
   - Include ground_transfer_details showing cost to reach departure airport from base
   - Recommend the most cost-effective option, not just the fastest
   
5. **Search parameters**:
   - Trip date: ${tripDate}
   - Return date: Estimate based on work hours (${totalWorkHours.toFixed(1)} hours = approximately ${Math.ceil(totalWorkHours / 8)} day(s))
   - Compare multiple airlines and booking sites
   - **Search strategy**:
     * Step 1: Direct flights from ${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports[0].code : 'closest airport'}
     * Step 2: Connecting flights (1 stop) from ${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports[0].code : 'closest airport'}
     * Step 3: Direct/connecting flights from alternative airports (${baseInfo.nearestAirports.length > 1 ? baseInfo.nearestAirports.slice(1).map(a => a.code).join(', ') : 'if needed'})
   - Check if routes are seasonal (some routes only available in summer/winter)
   
6. **Include in your response**:
   - Round-trip price (preferred) or one-way prices
   - Flight type: "direct" or "connecting" (with connection details)
   - If connecting: connection airport code, layover time, total journey time
   - Flight durations and schedules for both outbound and return
   - Alternative airports if they offer better value (with reasoning)
   - Total cost comparison (flight + transfers + rental car + layover costs)
   - ground_transfer_details object showing:
     * base_to_departure_airport: distance, time, cost estimate
     * destination_airport_to_customer: distance, time, cost estimate
   - price_comparison object showing round-trip savings
   - Airport priority reasoning: Why you chose this departure airport over alternatives

## RESPONSE FORMAT (REQUIRED - JSON ONLY)
**CRITICAL**: You MUST provide your response EXCLUSIVELY in valid JSON format. Do NOT include any explanatory text, markdown formatting, or prose outside the JSON object. The system can only parse JSON format.

**REQUIRED JSON STRUCTURE**:
\`\`\`json
{
  "option1": {
    "name": "Mixed Mode (Flights + Ground Transport)",
    "route_order": [1, 3, 2, 4],
    "segments": [
      {
        "from": "base",
        "to": 1,
        "mode": "fly",
        "reasoning": "Distance > 300km, international border crossing",
        "estimated_distance_km": 450,
        "estimated_time_minutes": 90,
        "flight_details": {
          "origin_airport_code": "STR",
          "destination_airport_code": "BGY",
          "alternative_airports": ["MXP", "LIN"],
          "recommended_airport": "MXP",
          "airline": "Eurowings",
          "flight_number": "EW1234",
          "departure_time": "06:50",
          "arrival_time": "08:00",
          "duration_minutes": 70,
          "price_eur": 50.00,
          "is_direct": true,
          "search_source": "web_search"
        },
        "recommended_flight_option": 1,
        "flight_price_eur": 50.00
      },
      {
        "from": 1,
        "to": 3,
        "mode": "drive",
        "reasoning": "Short distance, same country",
        "estimated_distance_km": 120,
        "estimated_time_minutes": 90
      }
    ],
    "total_distance_km": 1200,
    "total_time_minutes": 480,
    "explanation": "This route minimizes travel time by using flights for long distances..."
  },
  "option2": {
    "name": "Car-Only Route",
    "route_order": [1, 2, 3, 4],
    "segments": [
      {
        "from": "base",
        "to": 1,
        "mode": "drive",
        "reasoning": "All segments by car",
        "estimated_distance_km": 450,
        "estimated_time_minutes": 300
      }
    ],
    "total_distance_km": 1500,
    "total_time_minutes": 720,
    "explanation": "This route uses only ground transport..."
  },
  "comparison": {
    "recommendation": "option1",
    "pros_option1": ["Faster", "Less driving fatigue"],
    "cons_option1": ["More expensive", "Airport transfers"],
    "pros_option2": ["Lower cost", "More flexible"],
    "cons_option2": ["Longer travel time", "Driver fatigue"]
  }
}
\`\`\`

**JSON FORMAT RULES**:
1. Start your response with \`{\` and end with \`}\`
2. Do NOT include any text before or after the JSON object
3. Do NOT use markdown code blocks (\`\`\`json) - just provide raw JSON
4. route_order: Array of customer indices (1-based) in optimized order, e.g., [1, 3, 2] means visit Customer 1, then Customer 3, then Customer 2
5. segments: Array of travel segments
   - "from": Use "base" for base location, or customer index number (1, 2, 3, etc.)
   - "to": Customer index number (1, 2, 3, etc.)
   - "mode": Must be exactly "fly" or "drive" (lowercase)
   - "estimated_distance_km": Number in kilometers
   - "estimated_time_minutes": Number in minutes
6. Use customer indices from the customer list above (Customer 1 = index 1, Customer 2 = index 2, etc.)
7. **Flight Details** (REQUIRED if mode is "fly"):
   - **CRITICAL**: Use ONLY airports from the information provided above. Do NOT hardcode airports.
   - **ROUND-TRIP PREFERENCE**: Always search for and recommend round-trip flights unless significantly more expensive
   
   - **If flight options are provided above WITH VALID PRICES (>€0)**: Use "recommended_flight_option" (1, 2, or 3) and "flight_price_eur"
   
   - **If NO flight options provided above OR prices show €0.00**: You MUST search the web and include "flight_details" object with:
     * "origin_airport_code": Use airport code from base's "Nearest Airports" (${baseInfo.nearestAirports.length > 0 ? baseInfo.nearestAirports.map(a => a.code).join(' or ') : 'search for nearest airport to base'})
     * "destination_airport_code": Use airport code from customer's "Nearest Airport" field
     * "alternative_airports": Array of alternative airports if they offer better prices (e.g., ["MXP", "LIN"] if BGY is expensive)
     * "recommended_airport": Best airport considering price + transfer cost
     * "ticket_type": "round_trip" (preferred) or "one_way" (only if round-trip is >50% more expensive)
     * "flight_type": "direct" or "connecting" (REQUIRED - always search for connecting flights if direct unavailable)
     * "outbound": Object with airline, flight_number, departure_time, arrival_time, duration_minutes, price_eur
       - If connecting: Include "connection" object with connection_airport, layover_minutes, second_flight details
     * "return": Object with same structure (REQUIRED if ticket_type is "round_trip")
       - If connecting: Include "connection" object with connection_airport, layover_minutes, second_flight details
     * "total_price_eur": Total price for round-trip OR sum of two one-way tickets
     * "is_direct": true/false
     * "connection_details": If connecting flight, include: connection_airport, layover_minutes, total_journey_minutes
     * "airport_priority_reasoning": Why this departure airport was chosen (e.g., "STR chosen as closest to base (27km) despite no direct flights, connecting via FRA available")
     * "search_source": "web_search"
     * "price_comparison": Object showing round_trip_price, two_one_way_price, savings_eur, recommendation
   
   - **Always include "flight_price_eur"** at segment level (use total_price_eur from flight_details for round-trip)

**EXAMPLE OF CORRECT FORMAT**:
Your entire response should look like this (no extra text):

**If flights are already provided above:**
{
  "option1": { 
    "route_order": [1], 
    "segments": [
      {
        "from": "base", 
        "to": 1, 
        "mode": "fly",
        "recommended_flight_option": 1,
        "flight_price_eur": 250.50
      }
    ] 
  },
  "option2": { 
    "route_order": [1], 
    "segments": [
      {
        "from": "base", 
        "to": 1, 
        "mode": "drive"
      }
    ] 
  }
}

**If you need to search for flights (no flights provided above):**
{
  "option1": { 
    "route_order": [1], 
    "segments": [
      {
        "from": "base", 
        "to": 1, 
        "mode": "fly",
        "reasoning": "Round-trip flight €100 vs driving €200+, saves 4 hours",
        "flight_details": {
          "origin_airport_code": "STR",
          "destination_airport_code": "MXP",
          "alternative_airports": ["LIN", "BGY"],
          "recommended_airport": "MXP",
          "ticket_type": "round_trip",
          "outbound": {
            "airline": "Eurowings",
            "flight_number": "EW1234",
            "departure_time": "06:50",
            "arrival_time": "08:00",
            "duration_minutes": 70,
            "price_eur": 50.00
          },
          "return": {
            "airline": "Eurowings",
            "flight_number": "EW1235",
            "departure_time": "18:30",
            "arrival_time": "19:40",
            "duration_minutes": 70,
            "price_eur": 50.00
          },
          "total_price_eur": 100.00,
          "is_direct": true,
          "flight_type": "direct",
          "search_source": "web_search",
          "airport_priority_reasoning": "STR chosen as closest airport to base (27km), direct flights available",
          "price_comparison": {
            "round_trip_price": 100.00,
            "two_one_way_price": 150.00,
            "savings_eur": 50.00,
            "recommendation": "round_trip"
          }
        },
        "flight_price_eur": 100.00
      }
    ] 
  },
  "option2": { 
    "route_order": [1], 
    "segments": [
      {
        "from": "base", 
        "to": 1, 
        "mode": "drive",
        "reasoning": "Driving cost €180 vs flight €250, only 1 hour longer"
      }
    ] 
  }
}

**Example with CONNECTING flight (when direct not available):**
{
  "option1": { 
    "route_order": [1], 
    "segments": [
      {
        "from": "base", 
        "to": 1, 
        "mode": "fly",
        "reasoning": "Connecting flight from STR (closest airport) via FRA, €150 round-trip",
        "flight_details": {
          "origin_airport_code": "STR",
          "destination_airport_code": "MLA",
          "alternative_airports": ["MUC", "FRA"],
          "recommended_airport": "STR",
          "ticket_type": "round_trip",
          "flight_type": "connecting",
          "outbound": {
            "airline": "Lufthansa",
            "flight_number": "LH123",
            "departure_time": "08:00",
            "arrival_time": "09:15",
            "duration_minutes": 75,
            "price_eur": 75.00,
            "connection": {
              "connection_airport": "FRA",
              "layover_minutes": 90,
              "second_flight": {
                "airline": "Lufthansa",
                "flight_number": "LH1924",
                "departure_time": "10:45",
                "arrival_time": "13:05",
                "duration_minutes": 140
              }
            }
          },
          "return": {
            "airline": "Lufthansa",
            "flight_number": "LH1925",
            "departure_time": "15:30",
            "arrival_time": "17:50",
            "duration_minutes": 140,
            "price_eur": 75.00,
            "connection": {
              "connection_airport": "FRA",
              "layover_minutes": 60,
              "second_flight": {
                "airline": "Lufthansa",
                "flight_number": "LH456",
                "departure_time": "18:50",
                "arrival_time": "20:05",
                "duration_minutes": 75
              }
            }
          },
          "total_price_eur": 150.00,
          "is_direct": false,
          "flight_type": "connecting",
          "connection_details": {
            "connection_airport": "FRA",
            "layover_minutes_outbound": 90,
            "layover_minutes_return": 60,
            "total_journey_minutes": 485
          },
          "airport_priority_reasoning": "STR chosen as closest to base (27km). No direct flights to MLA, but connecting via FRA available. Alternative MUC (213km) has direct flights but adds 186km extra drive.",
          "search_source": "web_search",
          "price_comparison": {
            "round_trip_price": 150.00,
            "two_one_way_price": 200.00,
            "savings_eur": 50.00,
            "recommendation": "round_trip"
          }
        },
        "flight_price_eur": 150.00
      }
    ] 
  }
}`;

    // Set prompt and show modal
    setAiPrompt(prompt);
    setShowAIModal(true);
  };
  
  // Parse text format response (fallback)
  const parseTextResponse = (text) => {
    const activeCustomers = getActiveCustomers();
    const result = {
      option1: { name: 'Mixed Mode (Flights + Ground Transport)', route_order: [], segments: [] },
      option2: { name: 'Car-Only Route', route_order: [], segments: [] }
    };
    
    // Extract route orders - handle various formats
    const routeOrderMatch1 = text.match(/OPTION\s*1[^]*?Route\s*Order:\s*\[([^\]]+)\]/is);
    const routeOrderMatch2 = text.match(/OPTION\s*2[^]*?Route\s*Order:\s*\[([^\]]+)\]/is);
    
    if (routeOrderMatch1) {
      const orderStr = routeOrderMatch1[1];
      const order = orderStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0);
      result.option1.route_order = order.length > 0 ? order : [1];
    } else {
      // Default: keep original order
      result.option1.route_order = activeCustomers.map((_, idx) => idx + 1);
    }
    
    if (routeOrderMatch2) {
      const orderStr = routeOrderMatch2[1];
      const order = orderStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0);
      result.option2.route_order = order.length > 0 ? order : [1];
    } else {
      // Default: keep original order
      result.option2.route_order = activeCustomers.map((_, idx) => idx + 1);
    }
    
    // Extract segments for Option 1
    const option1Text = text.match(/OPTION\s*1[^]*?(?=OPTION\s*2|$)/is)?.[0] || '';
    
    // Look for Base→Customer segments
    const baseToCustomer1 = option1Text.match(/Base[→→-]\s*Customer[^]*?(FLY|DRIVE|FLIGHT)/is);
    if (baseToCustomer1) {
      const mode = baseToCustomer1[1].toUpperCase().includes('FLY') ? 'fly' : 'drive';
      result.option1.segments.push({
        from: 'base',
        to: result.option1.route_order[0] || 1,
        mode: mode,
        reasoning: 'Extracted from text response'
      });
    }
    
    // Look for Customer→Base segments
    const customerToBase1 = option1Text.match(/Customer[→→-]\s*Base[^]*?(FLY|DRIVE|FLIGHT|RETURN)/is);
    if (customerToBase1 && result.option1.route_order.length > 0) {
      const mode = customerToBase1[1].toUpperCase().includes('FLY') ? 'fly' : 'drive';
      // Return segment (last customer to base)
      const lastCustomer = result.option1.route_order[result.option1.route_order.length - 1];
      result.option1.segments.push({
        from: lastCustomer,
        to: 'base',
        mode: mode,
        reasoning: 'Return journey extracted from text'
      });
    }
    
    // Extract segments for Option 2
    const option2Text = text.match(/OPTION\s*2[^]*?$/is)?.[0] || '';
    
    // Look for Base→Customer segments
    const baseToCustomer2 = option2Text.match(/Base[→→-]\s*Customer[^]*?(FLY|DRIVE|DRIVE)/is);
    if (baseToCustomer2) {
      const mode = baseToCustomer2[1].toUpperCase().includes('FLY') ? 'fly' : 'drive';
      result.option2.segments.push({
        from: 'base',
        to: result.option2.route_order[0] || 1,
        mode: mode,
        reasoning: 'Extracted from text response'
      });
    }
    
    // Look for Customer→Base segments
    const customerToBase2 = option2Text.match(/Customer[→→-]\s*Base[^]*?(FLY|DRIVE|DRIVE|RETURN)/is);
    if (customerToBase2 && result.option2.route_order.length > 0) {
      const mode = customerToBase2[1].toUpperCase().includes('FLY') ? 'fly' : 'drive';
      const lastCustomer = result.option2.route_order[result.option2.route_order.length - 1];
      result.option2.segments.push({
        from: lastCustomer,
        to: 'base',
        mode: mode,
        reasoning: 'Return journey extracted from text'
      });
    }
    
    // If no segments found, infer from keywords
    if (result.option1.segments.length === 0) {
      if (option1Text.toUpperCase().includes('FLY') || option1Text.toUpperCase().includes('FLIGHT')) {
        result.option1.segments.push({ 
          from: 'base', 
          to: result.option1.route_order[0] || 1, 
          mode: 'fly',
          reasoning: 'Inferred from text keywords'
        });
      } else {
        result.option1.segments.push({ 
          from: 'base', 
          to: result.option1.route_order[0] || 1, 
          mode: 'drive',
          reasoning: 'Inferred from text keywords'
        });
      }
    }
    
    if (result.option2.segments.length === 0) {
      // Option 2 is always car-only, but check for flights just in case
      if (option2Text.toUpperCase().includes('FLY') || option2Text.toUpperCase().includes('FLIGHT')) {
        result.option2.segments.push({ 
          from: 'base', 
          to: result.option2.route_order[0] || 1, 
          mode: 'fly',
          reasoning: 'Inferred from text keywords'
        });
      } else {
        result.option2.segments.push({ 
          from: 'base', 
          to: result.option2.route_order[0] || 1, 
          mode: 'drive',
          reasoning: 'Inferred from text keywords (car-only option)'
        });
      }
    }
    
    return result;
  };
  
  // Parse and apply AI response
  const parseAIResponse = () => {
    if (!aiResponse.trim()) {
      alert('Please paste the AI response first.');
      return;
    }
    
    let data = null;
    let usedTextParser = false;
    
    try {
      // Try to extract JSON from markdown code blocks
      let jsonText = aiResponse.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
        try {
          data = JSON.parse(jsonText);
        } catch (e) {
          // JSON parse failed, try text parser
          logger.warn('AI', 'JSON parse failed, trying text parser:', e);
          data = parseTextResponse(aiResponse);
          usedTextParser = true;
        }
      } else {
        // No JSON found, use text parser
        data = parseTextResponse(aiResponse);
        usedTextParser = true;
      }
      
      // Get the selected option
      const option = data[selectedOption] || data[AI_OPTIONS.OPTION1] || data[AI_OPTIONS.OPTION2];
      
      if (!option || !option.route_order || !Array.isArray(option.route_order)) {
        throw new Error('Invalid response format: missing route_order array');
      }
      
      // Filter out return journey segments (from customer to "base") if they're part of round-trip tickets
      // These are typically already included in the round-trip flight_details
      if (option.segments && Array.isArray(option.segments)) {
        option.segments = option.segments.filter(segment => {
          // Keep segments that are not return journeys, or return journeys that don't have round-trip flight_details
          if (segment.from && typeof segment.from === 'number' && segment.to === 'base') {
            // Check if there's a round-trip flight for the outbound segment
            const outboundSegment = option.segments.find(s => 
              s.from === 'base' && s.to === segment.from && s.mode === 'fly' && s.flight_details?.ticket_type === 'round_trip'
            );
            if (outboundSegment) {
              logger.debug('AI', `Skipping return segment ${segment.from}→base (included in round-trip ticket)`);
              return false; // Skip this return segment as it's part of round-trip
            }
          }
          return true; // Keep all other segments
        });
      }
      
      const activeCustomers = getActiveCustomers();
      if (option.route_order.length !== activeCustomers.length) {
        throw new Error(`Route order length (${option.route_order.length}) doesn't match number of customers (${activeCustomers.length})`);
      }
      
      // Reorder customers based on AI suggestion
      const reorderedCustomers = option.route_order.map((customerIndex) => {
        // customerIndex is 1-based, convert to 0-based
        const originalIndex = customerIndex - 1;
        if (originalIndex < 0 || originalIndex >= activeCustomers.length) {
          throw new Error(`Invalid customer index: ${customerIndex}`);
        }
        return activeCustomers[originalIndex];
      });
      
      // Update customers array (preserve empty slots)
      const newCustomers = [...customers];
      let activeIndex = 0;
      for (let i = 0; i < newCustomers.length; i++) {
        if (newCustomers[i].name || newCustomers[i].address) {
          if (activeIndex < reorderedCustomers.length) {
            newCustomers[i] = reorderedCustomers[activeIndex];
            activeIndex++;
          }
        }
      }
      
      setCustomers(newCustomers);
      
      // Apply travel modes from segments and handle flight details
      if (option.segments && Array.isArray(option.segments)) {
        const newTravelModes = { ...travelModes };
        const airportUpdates = {};
        
        option.segments.forEach((segment) => {
          if (segment.from === 'base' && segment.to && segment.mode && segment.to !== 'base') {
            // Base to first customer (segmentIndex 0)
            newTravelModes[0] = segment.mode === 'fly' ? 'fly' : 'drive';
            
            // Handle flight details - update airports if provided AND create flight object
            if (segment.mode === 'fly' && segment.flight_details) {
              const customerIndex = segment.to - 1; // Convert to 0-based
              const customer = reorderedCustomers[customerIndex];
              if (customer?.id) {
                const flightDetails = segment.flight_details;
                // Use recommended_airport if provided, otherwise use destination_airport_code
                const recommendedAirport = flightDetails.recommended_airport || flightDetails.destination_airport_code;
                // Use origin_airport_code, or check alternative_airports if origin is different from base
                const originAirport = flightDetails.origin_airport_code;
                
                // Update airport selection for this customer
                airportUpdates[customer.id] = {
                  origin: originAirport,
                  destination: recommendedAirport,
                  flightDetails: flightDetails,
                  // Store ground transfer details if provided
                  ground_transfer_details: segment.ground_transfer_details
                };
                
                // Create a synthetic flight object from Claude's flight_details for backend cost calculation
                // This matches the format expected by the backend cost calculator
                const outboundFlightObj = flightDetails.outbound ? {
                  from: flightDetails.origin_airport_code,
                  to: flightDetails.recommended_airport || flightDetails.destination_airport_code,
                  airline: flightDetails.outbound.airline,
                  flight_number: flightDetails.outbound.flight_number,
                  departure_time: flightDetails.outbound.departure_time,
                  arrival_time: flightDetails.outbound.arrival_time,
                  duration_minutes: flightDetails.outbound.duration_minutes,
                  price: flightDetails.outbound.price_eur || (flightDetails.total_price_eur ? flightDetails.total_price_eur / 2 : 0),
                  total_price: flightDetails.total_price_eur || 0, // For round-trip, backend will split this
                  routing: flightDetails.flight_type === 'connecting' && flightDetails.outbound.connection 
                    ? `${flightDetails.origin_airport_code} → ${flightDetails.outbound.connection.connection_airport} → ${flightDetails.recommended_airport || flightDetails.destination_airport_code}`
                    : `${flightDetails.origin_airport_code} → ${flightDetails.recommended_airport || flightDetails.destination_airport_code}`
                } : null;
                
                const returnFlightObj = flightDetails.return ? {
                  from: flightDetails.recommended_airport || flightDetails.destination_airport_code,
                  to: flightDetails.origin_airport_code,
                  airline: flightDetails.return.airline,
                  flight_number: flightDetails.return.flight_number,
                  departure_time: flightDetails.return.departure_time,
                  arrival_time: flightDetails.return.arrival_time,
                  duration_minutes: flightDetails.return.duration_minutes,
                  price: flightDetails.return.price_eur || (flightDetails.total_price_eur ? flightDetails.total_price_eur / 2 : 0),
                  total_price: flightDetails.total_price_eur || 0, // For round-trip, backend will split this
                  routing: flightDetails.flight_type === 'connecting' && flightDetails.return.connection
                    ? `${flightDetails.recommended_airport || flightDetails.destination_airport_code} → ${flightDetails.return.connection.connection_airport} → ${flightDetails.origin_airport_code}`
                    : `${flightDetails.recommended_airport || flightDetails.destination_airport_code} → ${flightDetails.origin_airport_code}`
                } : null;
                
                // Extract price from Claude's response - check multiple locations
                // Priority: segment.flight_price_eur > flightDetails.total_price_eur > calculate from outbound/return
                let flightPrice = segment.flight_price_eur || flightDetails.total_price_eur || 0;
                
                // If price is still 0, try to calculate from outbound/return prices
                if (flightPrice === 0) {
                  const outboundPrice = flightDetails.outbound?.price_eur || 0;
                  const returnPrice = flightDetails.return?.price_eur || 0;
                  if (outboundPrice > 0 || returnPrice > 0) {
                    flightPrice = outboundPrice + returnPrice;
                  }
                }
                
                logger.debug('AI Parser', 'Creating synthetic flight for customer', customer.id);
                logger.debug('AI Parser', 'Flight price sources:', {
                  'segment.flight_price_eur': segment.flight_price_eur,
                  'flightDetails.total_price_eur': flightDetails.total_price_eur,
                  'outbound.price_eur': flightDetails.outbound?.price_eur,
                  'return.price_eur': flightDetails.return?.price_eur,
                  'calculated_sum': (flightDetails.outbound?.price_eur || 0) + (flightDetails.return?.price_eur || 0),
                  'final_price': flightPrice
                });
                
                if (flightPrice === 0) {
                  logger.warn('AI', 'WARNING: Flight price is 0! Claude response may be missing price information.');
                }
                
                const syntheticFlight = {
                  id: `ai-flight-${customer.id}-${Date.now()}`,
                  price: flightPrice,
                  total_price: flightPrice,
                  is_round_trip: flightDetails.ticket_type === 'round_trip',
                  // Backend expects 'outbound' and 'return' (not 'outbound_flight' and 'return_flight')
                  outbound: outboundFlightObj,
                  return: returnFlightObj,
                  // Also include underscore versions for compatibility
                  outbound_flight: outboundFlightObj,
                  return_flight: returnFlightObj,
                  // Store Claude's flight details for reference
                  ai_flight_details: flightDetails,
                  source: 'ai_recommendation'
                };
                
                logger.debug('AI Parser', 'Synthetic flight object created:', {
                  id: syntheticFlight.id,
                  price: syntheticFlight.price,
                  total_price: syntheticFlight.total_price,
                  has_outbound: !!syntheticFlight.outbound,
                  has_return: !!syntheticFlight.return
                });
                
                // Store synthetic flight in flights state so it can be displayed
                setFlights(prev => ({
                  ...prev,
                  [customer.id]: {
                    ...prev[customer.id],
                    options: prev[customer.id]?.options ? [...prev[customer.id].options, syntheticFlight] : [syntheticFlight],
                    origin_airport: { code: originAirport },
                    destination_airport: { code: recommendedAirport },
                    departure_date: tripDate,
                    statistics: {
                      cheapest: syntheticFlight.price,
                      median: syntheticFlight.price,
                      most_expensive: syntheticFlight.price
                    }
                  }
                }));
                
                // Set this as the selected flight so backend can use it for cost calculation
                setSelectedFlight(syntheticFlight);
                
                logger.debug('AI', `Created synthetic flight object for customer ${customer.id} with price €${syntheticFlight.price}`);
                logger.debug('AI', `Setting airports for customer ${customer.id}: ${originAirport} → ${recommendedAirport}`);
              }
            }
            
            // Handle recommended flight option from existing flights
            if (segment.mode === 'fly' && segment.recommended_flight_option && !segment.flight_details) {
              const customerIndex = segment.to - 1;
              const customer = reorderedCustomers[customerIndex];
              if (customer?.id && flights[customer.id] && flights[customer.id].options) {
                const flightIndex = segment.recommended_flight_option - 1; // Convert to 0-based
                if (flights[customer.id].options[flightIndex]) {
                  setSelectedFlight(flights[customer.id].options[flightIndex]);
                }
              }
            }
          } else if (typeof segment.from === 'number' && typeof segment.to === 'number' && segment.mode) {
            // Between customers: segmentIndex = segment.to (since segmentIndex 0 is base->customer1, segmentIndex 1 is customer1->customer2)
            const segmentIndex = segment.to;
            newTravelModes[segmentIndex] = segment.mode === 'fly' ? 'fly' : 'drive';
            
            // Handle flight details for inter-customer flights
            if (segment.mode === 'fly' && segment.flight_details) {
              const customerIndex = segment.to - 1;
              const customer = reorderedCustomers[customerIndex];
              if (customer?.id) {
                const flightDetails = segment.flight_details;
                airportUpdates[customer.id] = {
                  origin: flightDetails.origin_airport_code,
                  destination: flightDetails.recommended_airport || flightDetails.destination_airport_code,
                  flightDetails: flightDetails,
                  ground_transfer_details: segment.ground_transfer_details
                };
              }
            }
          } else if (segment.from && typeof segment.from === 'number' && segment.to === 'base' && segment.mode === 'fly') {
            // Return journey (customer->base) - this is typically included in round-trip ticket
            // Just log it, don't create a separate segment as it's handled by the round-trip flight
            logger.debug('AI', `Return journey from customer ${segment.from} to base - handled by round-trip ticket`);
          }
          // Note: Return journeys (customer->base) are typically included in round-trip tickets
        });
        
        setTravelModes(newTravelModes);
        
        // Update airport selections if flight details were provided
        if (Object.keys(airportUpdates).length > 0) {
          setSelectedAirports(prev => ({
            ...prev,
            ...airportUpdates
          }));
          
          // Trigger flight search for customers with new airport selections
          Object.keys(airportUpdates).forEach(customerId => {
            const customer = newCustomers.find(c => c.id === customerId);
            if (customer?.coordinates) {
              // Small delay to ensure state is updated
              setTimeout(() => {
                fetchTravelOptionsWithAirports(customerId, customer.coordinates, { [customerId]: airportUpdates[customerId] });
              }, 500);
            }
          });
        }
      }
      
      setIsOptimized(true);
      setShowAIModal(false);
      setAiResponse('');
      
      // Re-analyze travel modes after applying changes
      setTimeout(() => {
        analyzeTravelModes();
      }, TIMEOUTS.STATE_UPDATE_DELAY);
      
      const successMessage = usedTextParser 
        ? `✅ Route optimized using ${option.name || selectedOption}!\n\nNote: Parsed from text format. For better results, ask the AI to provide JSON format.`
        : `✅ Route optimized using ${option.name || selectedOption}!`;
      alert(successMessage);
    } catch (error) {
      logger.error('AI', 'Error parsing AI response:', error);
      alert(`Error parsing AI response: ${error.message}\n\nPlease ensure the response includes:\n- Route Order: [1, 2, 3...]\n- Segments with travel modes (FLY or DRIVE)\n\nOr ask the AI to provide valid JSON format.`);
    }
  };
  
  // Copy prompt to clipboard
  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(aiPrompt).then(() => {
      alert('✅ Prompt copied to clipboard!');
    }).catch(err => {
      logger.error('UI', 'Failed to copy:', err);
      alert('Failed to copy prompt. Please select and copy manually.');
    });
  };
  
  // Handle travel mode change (mutually exclusive - using radio buttons)
  const handleTravelModeChange = (segmentIndex, mode) => {
    setTravelModes(prev => ({
      ...prev,
      [segmentIndex]: mode
    }));
  };
  
  // Drag and drop handlers
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e, index) => {
    e.preventDefault();
  };
  
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newCustomers = [...customers];
    const draggedCustomer = newCustomers[draggedIndex];
    newCustomers.splice(draggedIndex, 1);
    newCustomers.splice(dropIndex, 0, draggedCustomer);
    
    setCustomers(newCustomers);
    setDraggedIndex(null);
    setIsOptimized(false);
    
    // Re-analyze after reordering
    setTimeout(() => analyzeTravelModes(), TIMEOUTS.STATE_UPDATE_DELAY);
  };

  const handleCustomerSearch = async (id, input) => {
    setSearchQueries({ ...searchQueries, [id]: input });
    if (input.length < 2) {
      setSuggestions({ ...suggestions, [id]: [] });
      setShowSuggestions({ ...showSuggestions, [id]: false });
      return;
    }

    try {
      // First, get saved customers that match the query
      const savedCustomers = await searchCustomers(input);
      
      // Then, get Google Places suggestions
      const response = await placesAPI.autocomplete(input);
      const googleSuggestions = response.data.success ? response.data.data : [];
      
      // Combine saved customers (marked) with Google suggestions
      const combinedSuggestions = [
        // Saved customers first (most used)
        ...savedCustomers.map(customer => ({
          ...customer,
          description: customer.address,
          place_id: customer.place_id,
          structured_formatting: {
            main_text: customer.name || customer.address.split(',')[0],
            secondary_text: customer.address
          },
          isSaved: true, // Flag to indicate this is a saved customer
          savedCustomer: customer // Store full customer object
        })),
        // Then Google suggestions (filter out duplicates by place_id)
        ...googleSuggestions.filter(gs => 
          !savedCustomers.some(sc => sc.place_id === gs.place_id)
        )
      ];
      
      setSuggestions({ ...suggestions, [id]: combinedSuggestions });
      setShowSuggestions({ ...showSuggestions, [id]: true });
    } catch (error) {
      logger.error('Customer', 'Autocomplete error:', error);
    }
  };

  // Handle delete customer from database
  const handleDeleteCustomer = async (customerId) => {
    try {
      const { deleteCustomer } = await import('../services/customerStorage');
      await deleteCustomer(customerId);
      
      // Refresh suggestions for all customer inputs to remove deleted customer
      const activeCustomers = getActiveCustomers();
      for (const customer of activeCustomers) {
        const query = searchQueries[customer.id] || '';
        if (query.length >= 2) {
          await handleCustomerSearch(customer.id, query);
        }
      }
      
      alert('Customer deleted successfully');
    } catch (error) {
      logger.error('Customer', 'Error deleting customer:', error);
      alert('Failed to delete customer: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSelectCustomer = async (id, suggestion) => {
    // Hide suggestions immediately when customer is selected
    setShowSuggestions({ ...showSuggestions, [id]: false });
    
    try {
      let details, newCoordinates, customerData;
      
      // If this is a saved customer, use cached data if available
      if (suggestion.isSaved && suggestion.savedCustomer) {
        const savedCustomer = suggestion.savedCustomer;
        customerData = {
          name: savedCustomer.name || suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0],
          address: savedCustomer.address || suggestion.description,
          coordinates: savedCustomer.coordinates || null,
          place_id: savedCustomer.place_id || suggestion.place_id,
          city: savedCustomer.city || '',
          country: savedCustomer.country || '',
          nearest_airport_code: savedCustomer.nearest_airport_code || null,
          nearest_airport: savedCustomer.nearest_airport || null
        };
        
        // If we have coordinates, use them; otherwise fetch details
        if (customerData.coordinates) {
          newCoordinates = customerData.coordinates;
        } else {
          const response = await placesAPI.getDetails(suggestion.place_id);
          if (response.data.success) {
            details = response.data.data;
            newCoordinates = { lat: details.latitude, lng: details.longitude };
            customerData.coordinates = newCoordinates;
            customerData.city = details.city || customerData.city;
            customerData.country = details.country || customerData.country;
          }
        }
      } else {
        // New customer from Google Places - fetch details
        const response = await placesAPI.getDetails(suggestion.place_id);
        if (response.data.success) {
          details = response.data.data;
          newCoordinates = { lat: details.latitude, lng: details.longitude };
          customerData = {
            name: suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0],
            address: suggestion.description,
            coordinates: newCoordinates,
            place_id: suggestion.place_id,
            city: details.city || 'Unknown',
            country: details.country || 'Unknown'
          };
        }
      }
      
      // Ensure city and country are not empty
      if (!customerData.city || customerData.city.trim() === '') {
        customerData.city = 'Unknown';
      }
      if (!customerData.country || customerData.country.trim() === '') {
        customerData.country = 'Unknown';
      }
      
      if (customerData && newCoordinates) {
        // Clear old flight and rental car data for this customer when address changes
        const oldCustomer = customers.find(c => c.id === id);
        const addressChanged = oldCustomer?.address !== customerData.address;
        
        if (addressChanged) {
          // Clear flight and rental car data for this customer
          setFlights(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
          setRentalCars(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
          // Clear selected flight/rental car if they were for this customer
          if (selectedFlight && selectedFlight.customerId === id) {
            setSelectedFlight(null);
          }
          if (selectedRentalCar && selectedRentalCar.customerId === id) {
            setSelectedRentalCar(null);
          }
        }
        
        // Auto-save customer to database (only if not already saved)
        let savedCustomer = null;
        if (suggestion.isSaved && suggestion.savedCustomer) {
          // Customer is already saved - use existing data
          savedCustomer = suggestion.savedCustomer;
          logger.debug('Customer', 'Using existing saved customer:', savedCustomer.id);
        } else {
          // Check if customer already exists before saving
          // Priority: place_id > (name + city + address) > (name + city) > address only
          try {
            const { getCustomerByPlace } = await import('../services/customerStorage');
            let existingCustomer = null;
            
            // First try: Check by place_id (most reliable)
            if (customerData.place_id) {
              try {
                existingCustomer = await getCustomerByPlace(customerData.place_id, customerData.address, customerData.name, customerData.city);
                if (existingCustomer) {
                  logger.debug('Customer', 'Found existing customer by place_id, preventing duplicate:', existingCustomer.id);
                }
              } catch (err) {
                logger.debug('Customer', 'Place_id lookup failed (non-critical):', err.message);
              }
            }
            
            // Second try: Check by name + city + address (allows same company in different cities)
            if (!existingCustomer && customerData.name && customerData.city && customerData.address) {
              try {
                existingCustomer = await getCustomerByPlace(null, customerData.address, customerData.name, customerData.city);
                if (existingCustomer) {
                  logger.debug('Customer', 'Found existing customer by name+city+address, preventing duplicate:', existingCustomer.id);
                }
              } catch (err) {
                logger.debug('Customer', 'Name+city+address lookup failed (non-critical):', err.message);
              }
            }
            
            // Third try: Check by name + city (fallback if address not available)
            if (!existingCustomer && customerData.name && customerData.city) {
              try {
                existingCustomer = await getCustomerByPlace(null, null, customerData.name, customerData.city);
                if (existingCustomer) {
                  logger.debug('Customer', 'Found existing customer by name+city, preventing duplicate:', existingCustomer.id);
                }
              } catch (err) {
                logger.debug('Customer', 'Name+city lookup failed (non-critical):', err.message);
              }
            }
            
            if (existingCustomer) {
              savedCustomer = existingCustomer;
            }
          } catch (lookupError) {
            // Non-critical error - just log and continue
            logger.debug('Customer', 'Customer lookup error (non-critical, will create new):', lookupError.message || lookupError);
          }
          
          // Only save if customer doesn't already exist
          if (!savedCustomer) {
            try {
              savedCustomer = await saveCustomer({
                id: `customer-${id}`,
                ...customerData
              });
              logger.info('Customer', 'Saved new customer:', savedCustomer?.id);
            } catch (error) {
              logger.warn('Customer', 'Could not save customer to database:', error);
              // If customer already exists (409), try to look it up by multiple methods
              if (error.response?.status === 409) {
                try {
                  const { getCustomerByPlace } = await import('../services/customerStorage');
                  // Try place_id first
                  if (customerData.place_id) {
                    savedCustomer = await getCustomerByPlace(customerData.place_id, customerData.address, customerData.name, customerData.city);
                  }
                  // Try name + city + address
                  if (!savedCustomer && customerData.name && customerData.city && customerData.address) {
                    savedCustomer = await getCustomerByPlace(null, customerData.address, customerData.name, customerData.city);
                  }
                  // Try name + city
                  if (!savedCustomer && customerData.name && customerData.city) {
                    savedCustomer = await getCustomerByPlace(null, null, customerData.name, customerData.city);
                  }
                  if (savedCustomer) {
                    logger.debug('Customer', 'Found existing customer after 409 error:', savedCustomer.id);
                  }
                } catch (lookupError) {
                  logger.warn('Customer', 'Could not lookup existing customer:', lookupError);
                }
              }
              // Fallback to customerData if save/lookup fails
              if (!savedCustomer) {
                savedCustomer = {
                  ...customerData,
                  nearest_airport: customerData.nearest_airport || null
                };
              }
            }
          }
        }
        
        // Update customer in state with saved customer's UUID (if available)
        // This ensures we use the database UUID instead of the temporary ID
        const finalCustomerId = savedCustomer?.id || id;
        
        // If customer ID changed (from temp ID to UUID), migrate all state that uses the old ID
        if (finalCustomerId !== id) {
          // Migrate flights state
          setFlights(prev => {
            if (prev[id]) {
              const newFlights = { ...prev };
              newFlights[finalCustomerId] = prev[id];
              delete newFlights[id];
              return newFlights;
            }
            return prev;
          });
          
          // Migrate rental cars state
          setRentalCars(prev => {
            if (prev[id]) {
              const newRentalCars = { ...prev };
              newRentalCars[finalCustomerId] = prev[id];
              delete newRentalCars[id];
              return newRentalCars;
            }
            return prev;
          });
          
          // Migrate loading states
          setLoadingFlights(prev => {
            if (prev[id] !== undefined) {
              const newLoading = { ...prev };
              newLoading[finalCustomerId] = prev[id];
              delete newLoading[id];
              return newLoading;
            }
            return prev;
          });
          
          // Migrate customer machine info
          setCustomerMachineInfo(prev => {
            if (prev[id]) {
              const newInfo = { ...prev };
              newInfo[finalCustomerId] = prev[id];
              delete newInfo[id];
              return newInfo;
            }
            return prev;
          });
        }
        
        setCustomers(customers.map(c => {
          if (c.id === id) {
            return {
              ...c,
              ...customerData,
              id: finalCustomerId, // Use saved customer's UUID
              coordinates: newCoordinates // Explicitly set coordinates
            };
          }
          return c;
        }));
        setSearchQueries({ ...searchQueries, [finalCustomerId]: customerData.address });
        setShowSuggestions(prev => {
          const newSuggestions = { ...prev };
          newSuggestions[finalCustomerId] = false;
          if (finalCustomerId !== id) {
            delete newSuggestions[id];
          }
          return newSuggestions;
        });
        
        // Fetch nearest airport for this customer
        fetchCustomerNearestAirport(finalCustomerId, newCoordinates, customerData.country);
        
          // Fetch airports for this customer (or use cached if available)
          if (startingCoordinates) {
            // If we have cached airport, use it; otherwise fetch
            if (savedCustomer && savedCustomer.nearest_airport) {
              // Use cached airport data
              const cachedAirport = savedCustomer.nearest_airport;
              setAirportOptions(prev => {
                const newOptions = { ...prev };
                // Migrate from old ID to new UUID if ID changed
                if (finalCustomerId !== id && prev[id]) {
                  newOptions[finalCustomerId] = prev[id];
                  delete newOptions[id];
                }
                return {
                  ...newOptions,
                  [finalCustomerId]: {
                    origin: newOptions[finalCustomerId]?.origin || [],
                    destination: [cachedAirport, ...(newOptions[finalCustomerId]?.destination?.filter(a => a.code !== cachedAirport.code) || [])]
                  }
                };
              });
              setSelectedAirports(prev => {
                const newSelected = { ...prev };
                // Migrate from old ID to new UUID if ID changed
                if (finalCustomerId !== id && prev[id]) {
                  newSelected[finalCustomerId] = prev[id];
                  delete newSelected[id];
                }
                return {
                  ...newSelected,
                  [finalCustomerId]: {
                    ...newSelected[finalCustomerId],
                    destination: cachedAirport
                  }
                };
              });
            } else {
              // Fetch airports
              await fetchAirports(finalCustomerId, startingCoordinates, newCoordinates);
            }
            
            // Trigger flight search for this customer after coordinates are updated
            // Small delay to ensure state is updated
            setTimeout(() => {
              // Calculate customer position using the updated customer data
              // We need to check the current state to determine if single or multi-customer
              setCustomers(prevCustomers => {
                const updatedCustomers = prevCustomers.map(c => c.id === finalCustomerId ? {
                  ...c,
                  ...customerData,
                  coordinates: newCoordinates // Ensure coordinates are set
                } : c);
                
                const activeCustomers = updatedCustomers.filter(c => c.name || c.address);
                const isMultiCustomer = activeCustomers.length > 1;
                const customerIndex = activeCustomers.findIndex(c => c.id === finalCustomerId);
                const isFirstCustomer = customerIndex === 0;
                const isLastCustomer = customerIndex === activeCustomers.length - 1;
                
                // Open flight selection modal instead of searching in background
                setTimeout(() => {
                  if (!isMultiCustomer) {
                    // Single customer: Open modal to select flights
                    logger.debug('Customer', `Opening flight selection modal for customer ${finalCustomerId} with new coordinates:`, newCoordinates);
                  setFlightsModalCustomerId(finalCustomerId);
                  setShowFlightsModal(true);
                  // Trigger search when modal opens (handled by useEffect)
                } else {
                  // Multi-customer: Only search for first (outbound) and last (return) customers
                  if (isFirstCustomer) {
                    logger.debug('Customer', `Opening flight selection modal for outbound (first customer ${finalCustomerId})`);
                    setFlightsModalCustomerId(finalCustomerId);
                    setShowFlightsModal(true);
                  } else if (isLastCustomer) {
                    logger.debug('Customer', `Opening flight selection modal for return (last customer ${finalCustomerId})`);
                    setFlightsModalCustomerId(finalCustomerId);
                    setShowFlightsModal(true);
                  }
                }
              }, 100);
              
              return updatedCustomers;
            });
          }, 300);
        }
      }
    } catch (error) {
      logger.error('Customer', 'Error getting place details:', error);
    }
  };

  const handleCustomerTimeChange = (id, value) => {
    setCustomers(customers.map(c => c.id === id ? { ...c, time_hours: value } : c));
  };
  
  // Fetch nearest airports for customers that have coordinates but no airport yet
  useEffect(() => {
    const activeCustomers = getActiveCustomers();
    activeCustomers.forEach(customer => {
      if (customer.coordinates && !customerNearestAirports[customer.id] && !loadingCustomerAirports[customer.id]) {
        fetchCustomerNearestAirport(customer.id, customer.coordinates, customer.country);
      }
    });
  }, [customers]);
  
  // Refresh flights modal when customer changes or technician airports change (if modal is open)
  // FIXED: Removed problematic dependencies that were causing infinite loops
  useEffect(() => {
    if (showFlightsModal && flightsModalCustomerId) {
      const customer = customers.find(c => c.id === flightsModalCustomerId);
      // If customer coordinates exist and not already loading
      if (customer?.coordinates && !loadingFlights[flightsModalCustomerId]) {
        // Check if we already have flight data for this customer
        const hasExistingFlights = flights[flightsModalCustomerId]?.options?.length > 0;

        // Only refresh if NO flight data exists
        // (The user can manually refresh using the refresh button if needed)
        if (!hasExistingFlights) {
          logger.debug('FlightSearch', 'Modal opened for customer with no flights, searching...');

          // Simple async fetch without complex technician refresh logic
          // (Technician refresh happens in the main useEffect)
          fetchTravelOptions(flightsModalCustomerId, customer.coordinates, false, false, false, false)
            .catch(error => {
              logger.error('FlightSearch', 'Error fetching flights for modal:', error);
            });
        } else {
          logger.debug('FlightSearch', 'Modal opened - using existing flight data');
        }
      } else if (!customer?.coordinates) {
        logger.warn('FlightSearch', `Customer ${flightsModalCustomerId} has no coordinates, cannot search flights`);
      }
    }
    // CRITICAL: Only depend on modal state changes, NOT on data that updates during fetch
    // flights, customers, selectedTechnician etc. are intentionally EXCLUDED to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightsModalCustomerId, showFlightsModal]);

  // Analyze travel modes when customers or coordinates change
  useEffect(() => {
    const activeCustomers = getActiveCustomers();
    if (activeCustomers.length > 0 && startingCoordinates) {
      // Check if all active customers have coordinates
      const allHaveCoordinates = activeCustomers.every(c => c.coordinates);
      if (allHaveCoordinates) {
        analyzeTravelModes();
      }
    }
  }, [customers, startingCoordinates]);

  const fetchNearbyHotels = async (customerId, coordinates, cityName = null) => {
    if (!coordinates) return;
    setLoadingHotels(prev => ({ ...prev, [customerId]: true }));
    try {
      // Extract city name from customer if not provided
      let city = cityName;
      if (!city) {
        const customer = customers.find(c => c.id === customerId);
        if (customer?.address) {
          // Try to extract city from address (last part before country)
          const addressParts = customer.address.split(',').map(p => p.trim());
          if (addressParts.length >= 2) {
            city = addressParts[addressParts.length - 2]; // City is usually second to last
          }
        }
      }

      logger.debug('Hotel', 'Hotel search - city:', city, 'coordinates:', coordinates);
      const response = await hotelsAPI.searchNearby(coordinates.lat, coordinates.lng, 5, city);
      setHotels(prev => ({ ...prev, [customerId]: response.data.data }));
    } catch (error) {
      logger.error('Hotel', 'Error fetching hotels:', error);
    } finally {
      setLoadingHotels(prev => ({ ...prev, [customerId]: false }));
    }
  };

  // Fetch airports for origin and destination
  const fetchAirports = async (customerId, originCoords, destinationCoords) => {
    if (!originCoords || !destinationCoords) return;
    
    setLoadingAirports(prev => ({ ...prev, [customerId]: true }));
    
    try {
      const customer = customers.find(c => c.id === customerId);
      const customerCountry = customer?.country;
      
      const [originResponse, destResponse] = await Promise.all([
        placesAPI.getNearbyAirports(originCoords.lat, originCoords.lng, 2),
        placesAPI.getNearbyAirports(destinationCoords.lat, destinationCoords.lng, 2, customerCountry)
      ]);

      const originAirports = originResponse.data.success ? originResponse.data.data : [];
      const destAirports = destResponse.data.success ? destResponse.data.data : [];

      setAirportOptions(prev => ({
        ...prev,
        [customerId]: {
          origin: originAirports,
          destination: destAirports
        }
      }));

      // Auto-select first airport for each if not already selected
      // Use a unique key (code + coordinates) to identify airports uniquely
      setSelectedAirports(prev => {
        const current = prev[customerId] || {};
        const getAirportKey = (airport) => airport ? `${airport.code}-${airport.lat}-${airport.lng}` : null;
        const currentOriginKey = getAirportKey(current.origin);
        const currentDestKey = getAirportKey(current.destination);
        
        // Only auto-select if no airport is currently selected
        return {
          ...prev,
          [customerId]: {
            origin: currentOriginKey ? current.origin : (originAirports[0] || null),
            destination: currentDestKey ? current.destination : (destAirports[0] || null)
          }
        };
      });
    } catch (error) {
      logger.error('Airport', 'Error fetching airports:', error);
    } finally {
      setLoadingAirports(prev => ({ ...prev, [customerId]: false }));
    }
  };
  // Flight search functions are now provided by useFlightSearch hook
  // The old fetchTravelOptionsWithAirports and fetchTravelOptions functions have been removed
  // All calls now use the hook's functions: fetchTravelOptions and fetchTravelOptionsWithAirports

  // ===========================================
  // MULTI-SEGMENT FLIGHT SEARCH FUNCTIONS
  // ===========================================
  
  // Generate segments for a multi-customer trip
  // Returns array: [{ from, to, segmentIndex, label, date }, ...]
  const generateTripSegments = () => {
    const activeCustomers = customers.filter(c => c.coordinates && c.name && c.address);
    if (activeCustomers.length === 0) return [];

    // Get technician's primary airport
    const techAirport = selectedTechnician?.airports?.[0] || null;

    // Helper to get customer's airport from airportOptions
    const getCustomerAirport = (customerId) => {
      const customerAirports = airportOptions[customerId];
      const selected = selectedAirports[customerId];
      // Use selected destination airport, or first from options
      return selected?.destination || customerAirports?.destination?.[0] || null;
    };

    // Helper to calculate segment date
    const calculateSegmentDate = (segmentIndex) => {
      let date = tripDate;
      if (segmentIndex > 0) {
        // Estimate: add work hours from previous customers
        const previousCustomers = activeCustomers.slice(0, segmentIndex);
        const previousWorkHours = previousCustomers.reduce((sum, c) => sum + (parseFloat(c.time_hours) || 0), 0);
        const daysToAdd = Math.ceil(previousWorkHours / (TRAVEL_THRESHOLDS.WORK_HOURS_PER_DAY || 8));
        const dateObj = new Date(tripDate);
        dateObj.setDate(dateObj.getDate() + daysToAdd);
        date = dateObj.toISOString().split('T')[0];
      }
      return date;
    };

    const segments = [];

    // Segment 0: Base → Customer 1
    const firstCustomerAirport = getCustomerAirport(activeCustomers[0].id);
    segments.push({
      segmentIndex: 0,
      date: calculateSegmentDate(0),
      from: {
        type: 'base',
        label: 'Base',
        address: selectedTechnician?.homeAddress || startingAddress,
        coordinates: startingCoordinates,
        airport: techAirport,
        airportCode: techAirport?.code || null,
        icon: '🏠'
      },
      to: {
        type: 'customer',
        label: activeCustomers[0].name || 'Customer 1',
        address: activeCustomers[0].address,
        coordinates: activeCustomers[0].coordinates,
        airport: firstCustomerAirport,
        airportCode: firstCustomerAirport?.code || null,
        icon: '📍'
      },
      label: `Base → ${activeCustomers[0].name || 'Customer 1'}`
    });

    // Segments between customers
    for (let i = 0; i < activeCustomers.length - 1; i++) {
      const fromCustomer = activeCustomers[i];
      const toCustomer = activeCustomers[i + 1];
      const fromAirport = getCustomerAirport(fromCustomer.id);
      const toAirport = getCustomerAirport(toCustomer.id);

      segments.push({
        segmentIndex: i + 1,
        date: calculateSegmentDate(i + 1),
        from: {
          type: 'customer',
          label: fromCustomer.name || `Customer ${i + 1}`,
          address: fromCustomer.address,
          coordinates: fromCustomer.coordinates,
          airport: fromAirport,
          airportCode: fromAirport?.code || null,
          icon: '📍'
        },
        to: {
          type: 'customer',
          label: toCustomer.name || `Customer ${i + 2}`,
          address: toCustomer.address,
          coordinates: toCustomer.coordinates,
          airport: toAirport,
          airportCode: toAirport?.code || null,
          icon: '📍'
        },
        label: `${fromCustomer.name || `Customer ${i + 1}`} → ${toCustomer.name || `Customer ${i + 2}`}`
      });
    }

    return segments;
  };
  
  // Search flights for a specific segment
  const searchSegmentFlights = async (segment) => {
    const { segmentIndex, from, to } = segment;
    
    setLoadingSegmentFlights(prev => ({ ...prev, [segmentIndex]: true }));
    
    try {
      // Determine origin and destination airports
      const originAirport = from.airport || from.coordinates;
      const destAirport = to.airport || to.coordinates;
      
      // Calculate departure date for this segment
      // For first segment, use trip date
      // For subsequent segments, estimate based on previous segments
      let departureDate = tripDate;
      if (segmentIndex > 0) {
        // Estimate: add work hours from previous customers
        const previousCustomers = customers.slice(0, segmentIndex);
        const previousWorkHours = previousCustomers.reduce((sum, c) => sum + (parseFloat(c.time_hours) || 0), 0);
        const daysToAdd = Math.ceil(previousWorkHours / TRAVEL_THRESHOLDS.WORK_HOURS_PER_DAY);
        const date = new Date(tripDate);
        date.setDate(date.getDate() + daysToAdd);
        departureDate = date.toISOString().split('T')[0];
      }
      
      const response = await flightsAPI.search({
        origin: originAirport,
        destination: destAirport,
        departureDate: departureDate,
        returnDate: null, // One-way for segments
        limit: FLIGHT_SEARCH_LIMITS.MAX_RESULTS,
        apiPreferences: null // Use default API preferences
      });
      
      if (response.data.success && response.data.options) {
        setSegmentFlights(prev => ({
          ...prev,
          [segmentIndex]: {
            ...prev[segmentIndex],
            searchResults: response.data.options,
            mode: prev[segmentIndex]?.mode || 'fly'
          }
        }));
      }
    } catch (error) {
      logger.error('SegmentFlight', `Error searching flights for segment ${segmentIndex}:`, error);
    } finally {
      setLoadingSegmentFlights(prev => ({ ...prev, [segmentIndex]: false }));
    }
  };
  
  // Select a flight for a segment
  // Note: setActiveSegmentModal is provided by useState hook (line 97)
  const selectSegmentFlight = (segmentIndex, flight) => {
    logger.debug('SegmentSelect', `Selecting flight for segment ${segmentIndex}:`, flight?.id);
    setSegmentFlights(prev => ({
      ...prev,
      [segmentIndex]: {
        ...prev[segmentIndex],
        flight: flight,
        mode: 'fly'
      }
    }));
    setActiveSegmentModal(null);
    
    // Trigger cost recalculation
    setTimeout(() => fetchCostPreview(), TIMEOUTS.COST_RECALC_DELAY);
  };
  
  // Set segment to drive mode (no flight)
  const setSegmentDrive = (segmentIndex) => {
    logger.debug('SegmentSelect', `Setting segment ${segmentIndex} to drive mode`);
    setSegmentFlights(prev => ({
      ...prev,
      [segmentIndex]: {
        ...prev[segmentIndex],
        flight: null,
        mode: 'drive'
      }
    }));
    setActiveSegmentModal(null);
    
    // Trigger cost recalculation
    setTimeout(() => fetchCostPreview(), TIMEOUTS.COST_RECALC_DELAY);
  };
  
  // Clear segment selection
  const clearSegmentFlight = (segmentIndex) => {
    setSegmentFlights(prev => {
      const updated = { ...prev };
      delete updated[segmentIndex];
      return updated;
    });
    
    // Trigger cost recalculation
    setTimeout(() => fetchCostPreview(), TIMEOUTS.COST_RECALC_DELAY);
  };
  
  // Get total flight cost from all segments
  const getTotalSegmentFlightsCost = () => {
    return Object.values(segmentFlights).reduce((total, segment) => {
      if (segment?.flight?.price) {
        return total + segment.flight.price;
      }
      return total;
    }, 0);
  };

  // OLD CODE REMOVED - The following was leftover from fetchTravelOptionsWithAirports and fetchTravelOptions
  // These functions are now provided by the useFlightSearch hook
  // Removed: ~270 lines of duplicate code

  // ===========================================
  // MULTI-SEGMENT FLIGHT SEARCH FUNCTIONS (duplicate section removed - see above)
  // ===========================================
  
  // Note: generateTripSegments and related functions are defined above (starting at line 2476)
  // The duplicate section below has been removed

  // ===========================================
  // RENDER SECTION
  // ===========================================
  
  // Note: All segment-related functions (generateTripSegments, searchSegmentFlights, etc.) 
  // are defined above in the MULTI-SEGMENT FLIGHT SEARCH FUNCTIONS section (starting at line 2476)
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const activeCustomers = customers.filter(c => c.name && c.address);
      
      // Ensure all customers are saved to database and have UUIDs
      // UUID format: 8-4-4-4-12 hex characters (e.g., "550e8400-e29b-41d4-a716-446655440000")
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const { saveCustomer } = await import('../services/customerStorage');
      const customersWithUUIDs = await Promise.all(
        activeCustomers.map(async (customer) => {
          // Check if customer ID is a temporary ID (not a valid UUID)
          if (!customer.id || !uuidRegex.test(customer.id)) {
            // This is a temporary ID, save customer to get UUID
            try {
              const savedCustomer = await saveCustomer({
                id: customer.id,
                name: customer.name,
                address: customer.address,
                city: customer.city,
                country: customer.country,
                coordinates: customer.coordinates,
                place_id: customer.place_id
              });
              if (savedCustomer && savedCustomer.id && uuidRegex.test(savedCustomer.id)) {
                logger.info('Trip', `Saved customer to database, got UUID: ${savedCustomer.id}`);
                return { ...customer, id: savedCustomer.id };
              } else {
                throw new Error('Customer saved but did not receive valid UUID');
              }
            } catch (error) {
              logger.error('Trip', `Failed to save customer:`, error);
              // If save fails, we can't create the trip - this customer needs to be saved first
              throw new Error(`Failed to save customer "${customer.name || customer.address}". Please ensure the customer is properly saved before creating the trip.`);
            }
          }
          return customer;
        })
      );
      
      // Update customers state with UUIDs if any changed
      if (customersWithUUIDs.some((c, i) => c.id !== activeCustomers[i].id)) {
        setCustomers(customers.map(c => {
          const updated = customersWithUUIDs.find(uc => uc.name === c.name && uc.address === c.address);
          return updated || c;
        }));
      }
      
      // Determine if flight is selected
      const isFlightSelected = selectedFlight || Object.keys(segmentFlights).length > 0;
      
      // Prepare customer data with machine info (using UUIDs)
      const customerData = customersWithUUIDs.map(customer => ({
        masch_typ: customerMachineInfo[customer.id]?.masch_typ || null,
        seriennr: customerMachineInfo[customer.id]?.seriennr || null,
        job_task: customerMachineInfo[customer.id]?.job_task || null
      }));
      
      // Prepare cost percentages array (aligned with customer_ids order)
      const costPercentages = customersWithUUIDs.map(customer =>
        customer.cost_percentage || (100 / customersWithUUIDs.length)
      );

      const tripData = {
        customer_ids: customersWithUUIDs.map(c => c.id),
        planned_start_date: tripDate,
        work_hours_estimate: activeCustomers.reduce((sum, c) => sum + (parseFloat(c.time_hours) || 0), 0),
        engineer_location: startingCoordinates || { address: startingAddress },
        // New quote form fields
        einsatzart: einsatzart || null,
        auftrag: auftrag || null,
        reisekostenpauschale: reisekostenpauschale || null,
        use_flat_rate: useFlatRate,
        parts_text: partsText || null,
        // Cost splitting percentages
        cost_percentages: costPercentages,
        // Excess baggage (only when flight is selected)
        excess_baggage: (isFlightSelected && excessBaggage.cost > 0) ? excessBaggage : null,
        selected_travel_mode: isFlightSelected ? 'flight' : 'road',
        // Machine info per customer
        customer_data: customerData,
        metadata: {
          engineer_location: startingCoordinates || { address: startingAddress },
          starting_address: startingAddress,
          // Include excess baggage in metadata if flight is selected
          ...(isFlightSelected && excessBaggage.cost > 0 ? { excess_baggage: excessBaggage } : {})
        }
      };

      const response = await tripsAPI.create(tripData);
      if (response.data.success) {
        alert('Trip created successfully!');
        navigate(`/trips/${response.data.data.id}`);
      }
    } catch (error) {
      alert('Error creating trip: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trip-wizard-dashboard">
      <LoadingIndicator
        loadingCostPreview={loadingCostPreview}
        loadingFlights={loadingFlights}
        loadingHotels={loadingHotels}
      />
      <DashboardHeader
        getOverallApiHealth={getOverallApiHealth}
        onApiStatusClick={() => setShowApiStatusModal(true)}
      />

      <div className="dashboard-grid">
        {/* Left Column: Configuration */}
        <div className="config-column">
          <TripDetailsSection
            selectedTechnician={selectedTechnician}
            allTechnicians={allTechnicians}
            tripDate={tripDate}
            startingAddress={startingAddress}
            onTechnicianChange={handleTechnicianChange}
            onTripDateChange={setTripDate}
            onStartingAddressChange={setStartingAddress}
            einsatzart={einsatzart}
            auftrag={auftrag}
            reisekostenpauschale={reisekostenpauschale}
            useFlatRate={useFlatRate}
            partsText={partsText}
            onEinsatzartChange={setEinsatzart}
            onAuftragChange={setAuftrag}
            onReisekostenpauschaleChange={setReisekostenpauschale}
            onUseFlatRateChange={setUseFlatRate}
            onPartsTextChange={setPartsText}
            customers={customers}
            onCostPercentageChange={(updatedPercentages) => {
              setCustomers(customers.map(c => ({
                ...c,
                cost_percentage: updatedPercentages[c.id] || c.cost_percentage || 0
              })));
            }}
          />

          <RoutePlanningSection
            customers={customers}
            searchQueries={searchQueries}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            customerNearestAirports={customerNearestAirports}
            loadingCustomerAirports={loadingCustomerAirports}
            draggedIndex={draggedIndex}
            travelModes={travelModes}
            transferInfo={transferInfo}
            selectedTechnician={selectedTechnician}
            selectedDepartureAirport={selectedDepartureAirport}
            selectedReturnAirport={selectedReturnAirport}
            selectedFlight={selectedFlight}
            segmentFlights={segmentFlights}
            loadingSegmentFlights={loadingSegmentFlights}
            onViewFlights={async () => {
              const activeCustomers = getActiveCustomers();
              if (activeCustomers.length === 0) {
                alert('Please add at least one customer first.');
                return;
              }
              
              const targetCustomer = activeCustomers[0];
              const { getActiveTechnician } = await import('../services/settingsStorage');
              const freshTech = await getActiveTechnician();
              const validTechAirports = freshTech?.airports?.filter(a => a && a.code) || [];
              
              if (freshTech && (!selectedTechnician || selectedTechnician.id !== freshTech.id || 
                  JSON.stringify(selectedTechnician.airports || []) !== JSON.stringify(validTechAirports))) {
                logger.debug('FlightSearch', 'Technician airports changed, updating and clearing cache');
                setSelectedTechnician(freshTech);
                setFlights(prev => {
                  const updated = { ...prev };
                  delete updated[targetCustomer.id];
                  return updated;
                });
              }
              
              const hasFlights = flights[targetCustomer.id]?.options?.length > 0;
              const isSearching = loadingFlights[targetCustomer.id];
              
              if (!hasFlights && !isSearching && targetCustomer.coordinates) {
                logger.debug('FlightSearch', 'Triggering fresh flight search for customer:', targetCustomer.id);
                await fetchTravelOptions(targetCustomer.id, targetCustomer.coordinates, false, false, false, true);
                      setTimeout(() => {
                        setFlightsModalCustomerId(targetCustomer.id);
                        setShowFlightsModal(true);
                      }, TIMEOUTS.FLIGHT_SEARCH_DELAY);
              } else if (hasFlights) {
                logger.debug('FlightSearch', 'Flights exist, refreshing to ensure latest airports are used...');
                setFlights(prev => {
                  const updated = { ...prev };
                  delete updated[targetCustomer.id];
                  return updated;
                });
                await fetchTravelOptions(targetCustomer.id, targetCustomer.coordinates, false, false, false, true);
                setFlightsModalCustomerId(targetCustomer.id);
                setShowFlightsModal(true);
              } else if (isSearching) {
                alert('Flight search in progress. Please wait...');
              } else {
                alert('No flights found. Please ensure customer address is set.');
              }
            }}
            onGenerateAIPrompt={generateAIPrompt}
            onCustomerSearch={handleCustomerSearch}
            onSelectCustomer={handleSelectCustomer}
            onCustomerTimeChange={handleCustomerTimeChange}
            onRemoveCustomer={(customerId) => {
              setCustomers(customers.filter(c => c.id !== customerId));
              setIsOptimized(false);
            }}
            onDeleteSavedCustomer={handleDeleteCustomer}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onTravelModeChange={handleTravelModeChange}
            onDepartureAirportSelect={setSelectedDepartureAirport}
            onReturnAirportSelect={setSelectedReturnAirport}
            onTransportChange={(mode) => {
              if (selectedTechnician) {
                setSelectedTechnician({ ...selectedTechnician, transportToAirport: mode });
              }
            }}
            onTechnicianUpdate={updateTechnician}
            onClearFlight={() => setSelectedFlight(null)}
            onClearSegment={() => setSegmentFlights({})}
            onSegmentClick={(segment) => {
              const segmentData = segmentFlights[segment.segmentIndex];
              setActiveSegmentModal(segment.segmentIndex);
              if (!segmentData?.searchResults) {
                searchSegmentFlights(segment);
              }
            }}
            onAddCustomer={() => {
              setCustomers([...customers, {
                id: `customer-${Date.now()}`,
                name: '',
                address: '',
                time_hours: '',
                coordinates: null,
                place_id: null,
                city: '',
                country: ''
              }]);
            }}
            getActiveCustomers={getActiveCustomers}
            generateTripSegments={generateTripSegments}
            getTotalSegmentFlightsCost={getTotalSegmentFlightsCost}
          />
          
          {/* Keep old sections for flights, hotels, etc. but they'll be conditionally shown based on travel mode */}
          <section className="config-section glass-card" style={{ display: 'none' }}>
            {/* This section will be shown conditionally based on travel mode selections */}
            <div>
              {customers.filter(c => c.name || c.address).map((customer, index) => (
                <div key={customer.id} className="customer-config-card">
                  <div className="card-header">
                    <span className="stop-badge">Stop {index + 1}</span>
                    <button onClick={() => removeCustomer(customer.id)} className="btn-icon-delete">×</button>
                  </div>

                  <div className="form-group">
                    <label>Search Company/Address</label>
                    <div className="autocomplete-wrapper">
                      <input
                        type="text"
                        value={searchQueries[customer.id] !== undefined
                          ? searchQueries[customer.id]
                          : (customer.name || customer.address || '')}
                        onChange={(e) => handleCustomerSearch(customer.id, e.target.value)}
                        placeholder="Type to search..."
                        className="form-input"
                      />
                      {showSuggestions[customer.id] && suggestions[customer.id] && (
                        <ul className="suggestions-list">
                          {suggestions[customer.id].map((suggestion, idx) => (
                            <li
                              key={idx}
                              onClick={() => handleSelectCustomer(customer.id, suggestion)}
                              className={`suggestion-item ${suggestion.isSaved ? 'saved-customer' : ''}`}
                            >
                              {suggestion.isSaved && <span className="saved-badge">💾 Saved</span>}
                              <div className="suggestion-content">
                                <div className="suggestion-main">
                                  {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                                </div>
                                {suggestion.structured_formatting?.secondary_text && (
                                  <div className="suggestion-secondary">
                                    {suggestion.structured_formatting.secondary_text}
                                  </div>
                                )}
                                {!suggestion.structured_formatting?.secondary_text && suggestion.description && (
                                  <div className="suggestion-secondary">
                                    {suggestion.description}
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Work Time (Hours)</label>
                      <input
                        type="number"
                        value={customer.time_hours}
                        onChange={(e) => handleCustomerTimeChange(customer.id, e.target.value)}
                        placeholder="e.g., 4"
                        min="0"
                        step="0.5"
                        className="form-input"
                      />
                    </div>
                    {customer.address && (
                      <div className="address-preview">
                        <p>{customer.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Airport Selection Cards */}
                  {airportOptions[customer.id] && (
                    <div style={{ marginBottom: '16px' }}>
                      {/* Origin Airports */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                          🏠 Departure Airports
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {loadingAirports[customer.id] ? (
                            <div style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>Loading airports...</div>
                          ) : (
                            airportOptions[customer.id]?.origin?.map((airport, idx) => {
                              // Use unique identifier (code + coordinates) to avoid duplicates
                              const selectedOrigin = selectedAirports[customer.id]?.origin;
                              // Compare by code first (more reliable), then coordinates if available
                              const isSelected = selectedOrigin && 
                                selectedOrigin.code === airport.code &&
                                (!selectedOrigin.lat || !airport.lat || 
                                 (Math.abs(selectedOrigin.lat - airport.lat) < 0.01 && 
                                  Math.abs(selectedOrigin.lng - airport.lng) < 0.01));
                              // Check if this is not the primary (first/closest) airport but is selected
                              const primaryAirport = airportOptions[customer.id]?.origin?.[0];
                              const isNotPrimary = isSelected && primaryAirport && airport.code !== primaryAirport.code;
                              // Also check if flight search is using a different airport than this one
                              const flightUsingThisAirport = flights[customer.id]?.origin_airport?.code === airport.code;
                              const flightUsingDifferentAirport = flights[customer.id]?.origin_airport?.code && 
                                                                  flights[customer.id].origin_airport.code !== airport.code &&
                                                                  isSelected;
                              const shouldHighlight = isNotPrimary || flightUsingDifferentAirport;
                              return (
                                <div
                                  key={`origin-${airport.code}-${idx}`}
                                  onClick={(e) => handleAirportSelect(customer.id, 'origin', airport, e)}
                                  style={{
                                    flex: '1',
                                    minWidth: '140px',
                                    padding: '10px 12px',
                                    background: isSelected ? '#e0f2fe' : '#f8fafc',
                                    border: `2px solid ${isSelected ? (shouldHighlight ? '#ef4444' : '#0ea5e9') : '#e2e8f0'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    boxShadow: shouldHighlight ? '0 0 10px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)' : 'none',
                                    animation: shouldHighlight ? 'glow-red 2s ease-in-out infinite' : 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = '#f1f5f9';
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = '#f8fafc';
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                    }
                                  }}
                                >
                                  {isSelected && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      fontSize: '10px',
                                      background: shouldHighlight ? '#ef4444' : '#0ea5e9',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>✓</span>
                                  )}
                                  {shouldHighlight && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '4px',
                                      left: '4px',
                                      fontSize: '10px',
                                      background: '#ef4444',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: '600',
                                      animation: 'pulse-red 1.5s ease-in-out infinite',
                                      zIndex: 10
                                    }}>⚠️ {flightUsingDifferentAirport ? 'Using Alternative' : 'Not Primary'}</span>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '14px' }}>🏠</span>
                                    <span style={{ fontWeight: '600', fontSize: '13px', color: shouldHighlight ? '#ef4444' : '#1e293b' }}>{airport.name}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                    <span style={{
                                      background: shouldHighlight ? '#ef4444' : '#0ea5e9',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600'
                                    }}>{airport.code}</span>
                                    <span style={{ fontSize: '11px', color: shouldHighlight ? '#ef4444' : '#64748b', fontWeight: shouldHighlight ? '600' : 'normal' }}>{airport.distance_km}km</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Destination Airports */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                          📍 Destination Airports
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {loadingAirports[customer.id] ? (
                            <div style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>Loading airports...</div>
                          ) : (
                            airportOptions[customer.id]?.destination?.map((airport, idx) => {
                              // Use unique identifier (code + coordinates) to avoid duplicates
                              const selectedDest = selectedAirports[customer.id]?.destination;
                              // Compare by code first (more reliable), then coordinates if available
                              const isSelected = selectedDest && 
                                selectedDest.code === airport.code &&
                                (!selectedDest.lat || !airport.lat || 
                                 (Math.abs(selectedDest.lat - airport.lat) < 0.01 && 
                                  Math.abs(selectedDest.lng - airport.lng) < 0.01));
                              // Check if this is not the primary (first/closest) airport but is selected
                              const primaryAirport = airportOptions[customer.id]?.destination?.[0];
                              const isNotPrimary = isSelected && primaryAirport && airport.code !== primaryAirport.code;
                              // Also check if flight search is using a different airport than this one
                              const flightUsingThisAirport = flights[customer.id]?.destination_airport?.code === airport.code;
                              const flightUsingDifferentAirport = flights[customer.id]?.destination_airport?.code && 
                                                                  flights[customer.id].destination_airport.code !== airport.code &&
                                                                  isSelected;
                              const shouldHighlight = isNotPrimary || flightUsingDifferentAirport;
                              return (
                                <div
                                  key={`dest-${airport.code}-${idx}`}
                                  onClick={(e) => handleAirportSelect(customer.id, 'destination', airport, e)}
                                  style={{
                                    flex: '1',
                                    minWidth: '140px',
                                    padding: '10px 12px',
                                    background: isSelected ? '#dcfce7' : '#f8fafc',
                                    border: `2px solid ${isSelected ? (shouldHighlight ? '#ef4444' : '#22c55e') : '#e2e8f0'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    boxShadow: shouldHighlight ? '0 0 10px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)' : 'none',
                                    animation: shouldHighlight ? 'glow-red 2s ease-in-out infinite' : 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = '#f1f5f9';
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) {
                                      e.currentTarget.style.background = '#f8fafc';
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                    }
                                  }}
                                >
                                  {isSelected && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      fontSize: '10px',
                                      background: shouldHighlight ? '#ef4444' : '#22c55e',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: '600'
                                    }}>✓</span>
                                  )}
                                  {shouldHighlight && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '4px',
                                      left: '4px',
                                      fontSize: '10px',
                                      background: '#ef4444',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: '600',
                                      animation: 'pulse-red 1.5s ease-in-out infinite',
                                      zIndex: 10
                                    }}>⚠️ {flightUsingDifferentAirport ? 'Using Alternative' : 'Not Primary'}</span>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '14px' }}>📍</span>
                                    <span style={{ fontWeight: '600', fontSize: '13px', color: shouldHighlight ? '#ef4444' : '#1e293b' }}>{airport.name}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                    <span style={{
                                      background: shouldHighlight ? '#ef4444' : '#22c55e',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600'
                                    }}>{airport.code}</span>
                                    <span style={{ fontSize: '11px', color: shouldHighlight ? '#ef4444' : '#64748b', fontWeight: shouldHighlight ? '600' : 'normal' }}>{airport.distance_km}km</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: FLIGHTS (Required - Must be selected first) */}
                  {flights[customer.id] && flights[customer.id].options && (
                    <div className="search-results-preview">
                      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span
                          onClick={() => setCollapsedSections(prev => ({
                            ...prev,
                            [`flights-${customer.id}`]: !prev[`flights-${customer.id}`]
                          }))}
                          style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <span>{collapsedSections[`flights-${customer.id}`] ? '▶' : '▼'}</span>
                          <span>✈️ Round-Trip Flights to <span style={{
                            color: airportOptions[customer.id]?.destination?.[0]?.code !== flights[customer.id].destination_airport?.code ? '#ef4444' : 'inherit',
                            fontWeight: airportOptions[customer.id]?.destination?.[0]?.code !== flights[customer.id].destination_airport?.code ? '700' : 'normal',
                            textShadow: airportOptions[customer.id]?.destination?.[0]?.code !== flights[customer.id].destination_airport?.code ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none',
                            animation: airportOptions[customer.id]?.destination?.[0]?.code !== flights[customer.id].destination_airport?.code ? 'pulse-red 1.5s ease-in-out infinite' : 'none'
                          }}>{flights[customer.id].destination_airport?.code}</span> ({flights[customer.id].destination_airport?.name})</span>
                          {airportOptions[customer.id]?.destination?.[0]?.code !== flights[customer.id].destination_airport?.code && (
                            <span style={{
                              fontSize: '10px',
                              background: '#ef4444',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              marginLeft: '8px',
                              animation: 'pulse-red 1.5s ease-in-out infinite'
                            }}>⚠️ Not Primary</span>
                          )}
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>({flights[customer.id].options.length} options)</span>
                          {false && (
                            <span style={{
                              fontSize: '11px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: '500'
                            }}>📦 Cached</span>
                          )}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchTravelOptions(customer.id, customer.coordinates);
                          }}
                          disabled={loadingFlights[customer.id]}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {loadingFlights[customer.id] ? '⏳' : '🔄'}
                        </button>
                      </h4>

                      {!collapsedSections[`flights-${customer.id}`] && (
                        <>
                          {/* Error banner when no flights available */}
                          {flights[customer.id].success === false && (
                            <div style={{
                              padding: '16px',
                              background: '#fee2e2',
                              border: '1px solid #ef4444',
                              borderRadius: '8px',
                              marginBottom: '12px',
                              fontSize: '13px'
                            }}>
                              <strong style={{ color: '#991b1b', display: 'block', marginBottom: '8px' }}>❌ No Flights Available</strong>
                              <div style={{ marginTop: '8px', marginBottom: '12px', color: '#7f1d1d', lineHeight: '1.5' }}>
                                {flights[customer.id].error || 'No flight data available for this route. You can still view rental car options below to calculate driving costs.'}
                              </div>
                              
                              {/* Provider Links */}
                              {flights[customer.id].search_details && (() => {
                                const search = flights[customer.id].search_details;
                                const originCode = search.origin_code || search.origin_airport?.code || '';
                                const destCode = search.destination_code || search.destination_airport?.code || '';
                                const depDate = search.departure_date || search.departure_date_formatted || '';
                                const retDate = search.return_date || search.return_date_formatted || '';
                                const isOneWay = search.is_one_way || !retDate;
                                
                                const formatDateForURL = (dateStr) => {
                                  if (!dateStr) return '';
                                  const date = new Date(dateStr);
                                  if (isNaN(date.getTime())) return dateStr;
                                  return date.toISOString().split('T')[0];
                                };
                                
                                const depDateURL = formatDateForURL(depDate);
                                const retDateURL = formatDateForURL(retDate);
                                
                                const googleFlightsURL = isOneWay 
                                  ? `https://www.google.com/travel/flights?q=flights%20${originCode}%20to%20${destCode}%20${depDateURL}`
                                  : `https://www.google.com/travel/flights?q=flights%20${originCode}%20to%20${destCode}%20${depDateURL}%20returning%20${retDateURL}`;
                                
                                const bookingURL = isOneWay
                                  ? `https://www.booking.com/flights/index.html?ss=${originCode}-${destCode}&dep=${depDateURL}`
                                  : `https://www.booking.com/flights/index.html?ss=${originCode}-${destCode}&dep=${depDateURL}&ret=${retDateURL}`;
                                
                                return (
                                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #fca5a5' }}>
                                    <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '8px', fontWeight: '500' }}>
                                      Search on:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      <a
                                        href={googleFlightsURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          padding: '6px 12px',
                                          background: '#4285f4',
                                          color: 'white',
                                          borderRadius: '4px',
                                          textDecoration: 'none',
                                          fontSize: '12px',
                                          fontWeight: '600'
                                        }}
                                      >
                                        Google Flights
                                      </a>
                                      <a
                                        href={bookingURL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          padding: '6px 12px',
                                          background: '#003580',
                                          color: 'white',
                                          borderRadius: '4px',
                                          textDecoration: 'none',
                                          fontSize: '12px',
                                          fontWeight: '600'
                                        }}
                                      >
                                        Booking.com
                                      </a>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          <div className="results-list">
                            {flights[customer.id].options.filter(flight => {
                              // Filter out flights without return flight if it's a round-trip search
                              const isRoundTrip = flights[customer.id].return_date || 
                                                 (flight.return && flight.outbound);
                              // Only show flights with return if it's a round-trip search
                              return !isRoundTrip || flight.return;
                            }).map(flight => (
                              <div
                                key={flight.id}
                                className={`result-card selection-card ${selectedFlight?.id === flight.id ? 'selected' : ''}`}
                                onClick={() => {
                                  const flightToSelect = {
                                    ...flight,
                                    price: flight.price || flight.total_price || 0,
                                    total_price: flight.total_price || flight.price || 0,
                                    customerId: customer.id
                                  };
                                  setSelectedFlight(flightToSelect);
                                  // Trigger cost recalculation after flight selection
                                  setTimeout(() => {
                                    logger.debug('CostPreview', 'Flight selected, triggering cost recalculation...');
                                    fetchCostPreview();
                                  }, 100);
                                }}
                                style={selectedFlight?.id === flight.id ? {
                                  border: '2px solid #2563eb',
                                  background: '#eff6ff'
                                } : {}}
                              >
                                <div className="result-info">
                                  {/* Cache/Live indicator */}
                                  <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      borderRadius: '3px',
                                      fontWeight: '600',
                                      background: '#d1fae5',
                                      color: '#065f46',
                                      border: '1px solid #6ee7b7'
                                    }}>
                                      🔴 LIVE DATA
                                    </span>
                                  </div>

                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <strong>Outbound ({flight.outbound?.date}):</strong>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{flight.outbound?.stops === 0 ? 'Direct' : `${flight.outbound?.stops} stop${flight.outbound?.stops > 1 ? 's' : ''}`}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', margin: '2px 0', fontWeight: '500' }}>
                                      {flight.outbound?.airline && <span style={{ color: '#2563eb', fontWeight: '600' }}>{getAirlineName(flight.outbound.airline)}</span>} {flight.outbound?.routing ? (
                                        (() => {
                                          const primaryOrigin = airportOptions[customer.id]?.origin?.[0]?.code;
                                          const primaryDest = airportOptions[customer.id]?.destination?.[0]?.code;
                                          const routingParts = flight.outbound.routing.split(' → ');
                                          return routingParts.map((part, idx) => {
                                            const isFirst = idx === 0;
                                            const isLast = idx === routingParts.length - 1;
                                            const isNotPrimaryOrigin = isFirst && part === flight.outbound?.from && primaryOrigin && part !== primaryOrigin;
                                            const isNotPrimaryDest = isLast && part === flight.outbound?.to && primaryDest && part !== primaryDest;
                                            const shouldHighlight = isNotPrimaryOrigin || isNotPrimaryDest;
                                            return (
                                              <span key={idx}>
                                                {shouldHighlight ? (
                                                  <span style={{
                                                    color: '#ef4444',
                                                    fontWeight: '700',
                                                    textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                                                    animation: 'pulse-red 1.5s ease-in-out infinite'
                                                  }}>{part}</span>
                                                ) : (
                                                  <span>{part}</span>
                                                )}
                                                {idx < routingParts.length - 1 && ' → '}
                                              </span>
                                            );
                                          });
                                        })()
                                      ) : (
                                        (() => {
                                          const primaryOrigin = airportOptions[customer.id]?.origin?.[0]?.code;
                                          const primaryDest = airportOptions[customer.id]?.destination?.[0]?.code;
                                          const isOriginNotPrimary = primaryOrigin && flight.outbound?.from && flight.outbound.from !== primaryOrigin;
                                          const isDestNotPrimary = primaryDest && flight.outbound?.to && flight.outbound.to !== primaryDest;
                                          return (
                                            <>
                                              {isOriginNotPrimary ? (
                                                <span style={{
                                                  color: '#ef4444',
                                                  fontWeight: '700',
                                                  textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                                                  animation: 'pulse-red 1.5s ease-in-out infinite'
                                                }}>{flight.outbound.from}</span>
                                              ) : (
                                                <span>{flight.outbound.from}</span>
                                              )}
                                              {' → '}
                                              {isDestNotPrimary ? (
                                                <span style={{
                                                  color: '#ef4444',
                                                  fontWeight: '700',
                                                  textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                                                  animation: 'pulse-red 1.5s ease-in-out infinite'
                                                }}>{flight.outbound.to}</span>
                                              ) : (
                                                <span>{flight.outbound.to}</span>
                                              )}
                                            </>
                                          );
                                        })()
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
                                      <span>✈️ {flight.outbound?.flight_number}</span>
                                      <span>🕒 {flight.outbound?.departure_time} - {flight.outbound?.arrival_time}</span>
                                      <span>({formatTime(flight.outbound?.duration_minutes)})</span>
                                    </div>
                                  </div>

                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <strong>Return ({flight.return?.date}):</strong>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{flight.return?.stops === 0 ? 'Direct' : `${flight.return?.stops} stop${flight.return?.stops > 1 ? 's' : ''}`}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', margin: '2px 0', fontWeight: '500' }}>
                                      {flight.return?.airline && <span style={{ color: '#2563eb', fontWeight: '600' }}>{getAirlineName(flight.return.airline)}</span>} {flight.return?.routing}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
                                      <span>✈️ {flight.return?.flight_number}</span>
                                      <span>🕒 {flight.return?.departure_time} - {flight.return?.arrival_time}</span>
                                      <span>({formatTime(flight.return?.duration_minutes)})</span>
                                    </div>
                                  </div>

                                  <div className="result-meta" style={{ marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
                                    <span>🛄 {flight.type}</span>
                                    <span style={{ marginLeft: '12px' }}>⏱️ Total travel: {formatTime((flight.outbound?.duration_minutes || 0) + (flight.return?.duration_minutes || 0))}</span>
                                  </div>
                                </div>
                                <div className="result-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '100px' }}>
                                  <div className="result-price" style={{ fontSize: '18px', fontWeight: 'bold' }}>€{flight.price}</div>
                                  <small>Round-trip</small>
                                  {selectedFlight?.id === flight.id && (
                                    <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px' }}>✓ Selected</span>
                                  )}
                                  <a
                                    href={`https://www.google.com/travel/flights?q=flights%20${flights[customer.id].origin_airport?.code || 'origin'}%20to%20${flights[customer.id].destination_airport?.code || 'destination'}%20${flights[customer.id].departure_date}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-book-small"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      padding: '4px 12px',
                                      background: '#2563eb',
                                      color: 'white',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      fontSize: '12px',
                                      marginTop: 'auto'
                                    }}
                                  >
                                    Book
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flight-summary" style={{ marginTop: '12px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                            <strong>Using: {selectedFlight ? `${getAirlineName(selectedFlight.outbound?.airline)} - €${selectedFlight.price}` : `Median Price - €${flights[customer.id].statistics?.median || 0}`}</strong>
                            <small style={{ display: 'block', marginTop: '4px' }}>
                              Range: €{flights[customer.id].statistics?.cheapest || 0} - €{flights[customer.id].statistics?.most_expensive || 0}
                            </small>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* SECTION 2: RENTAL CARS */}
                  {rentalCars[customer.id] && rentalCars[customer.id].length > 0 && (
                    <div className="search-results-preview">
                      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span
                          onClick={() => setCollapsedSections(prev => ({
                            ...prev,
                            [`cars-${customer.id}`]: !prev[`cars-${customer.id}`]
                          }))}
                          style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <span>{collapsedSections[`cars-${customer.id}`] ? '▶' : '▼'}</span>
                          <span>🚗 Rental Car Options</span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>({rentalCars[customer.id].length} options)</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchTravelOptions(customer.id, customer.coordinates);
                          }}
                          disabled={loadingRentalCars[customer.id]}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {loadingRentalCars[customer.id] ? '⏳' : '🔄'}
                        </button>
                      </h4>

                      {!collapsedSections[`cars-${customer.id}`] && (
                        <>
                          {rentalCars[customer.id][0]?.is_estimate && (
                            <div style={{
                              padding: '8px 12px',
                              background: '#fef3c7',
                              border: '1px solid #f59e0b',
                              borderRadius: '4px',
                              marginBottom: '12px',
                              fontSize: '13px'
                            }}>
                              <strong>⚠️ Price Estimates</strong>
                              <div style={{ marginTop: '4px', color: '#92400e' }}>
                                Prices are market-researched estimates ({rentalCars[customer.id][0]?.last_updated}).
                                <strong> Verify actual prices before finalizing quotation.</strong>
                              </div>
                            </div>
                          )}
                          <div className="results-list">
                            {rentalCars[customer.id].map(car => (
                              <div
                                key={car.id}
                                className={`result-card selection-card ${selectedRentalCar?.id === car.id ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedRentalCar(car);
                                  // Cost recalculation will be triggered by useEffect
                                }}
                                style={car.is_estimate ? {
                                  borderLeft: '3px solid #f59e0b'
                                } : {}}
                              >
                                <div className="result-info">
                                  {/* Data source indicator */}
                                  <div style={{ marginBottom: '6px' }}>
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '3px',
                                      fontWeight: '600',
                                      background: car.is_estimate ? '#fef3c7' : '#d1fae5',
                                      color: car.is_estimate ? '#92400e' : '#065f46',
                                      border: car.is_estimate ? '1px solid #f59e0b' : '1px solid #6ee7b7'
                                    }}>
                                      {car.is_estimate ? '📊 ESTIMATE' : '🔴 LIVE PRICE'}
                                    </span>
                                  </div>

                                  <strong>{car.provider} - {car.category}</strong>
                                  {car.is_estimate && (
                                    <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
                                      Est. range: €{car.price_per_day_min}-€{car.price_per_day_max}/day
                                    </div>
                                  )}
                                </div>
                                <div className="result-actions">
                                  <div className="result-price">
                                    €{car.price_per_day}{car.is_estimate ? '*' : ''}/day
                                  </div>
                                  {car.total_min && car.total_max && (
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                      Total: €{car.total_min}-€{car.total_max}
                                    </div>
                                  )}
                                  {selectedRentalCar?.id === car.id && (
                                    <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px' }}>✓ Selected</span>
                                  )}
                                  <a
                                    href={car.booking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-book-small"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Book
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* SECTION 3: HOTELS */}
                  {hotels[customer.id] && hotels[customer.id].length > 0 && (
                    <div className="search-results-preview">
                      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span
                          onClick={() => setCollapsedSections(prev => ({
                            ...prev,
                            [`hotels-${customer.id}`]: !prev[`hotels-${customer.id}`]
                          }))}
                          style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <span>{collapsedSections[`hotels-${customer.id}`] ? '▶' : '▼'}</span>
                          <span>🏨 Nearby Hotels</span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>({hotels[customer.id].length} results)</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchNearbyHotels(customer.id, customer.coordinates);
                          }}
                          disabled={loadingHotels[customer.id]}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {loadingHotels[customer.id] ? '⏳' : '🔄'}
                        </button>
                      </h4>

                      {!collapsedSections[`hotels-${customer.id}`] && (
                        <div className="results-list">
                          {hotels[customer.id].map(hotel => (
                            <div key={hotel.id} className="result-card">
                              <div className="result-info">
                                {/* Data source indicator */}
                                <div style={{ marginBottom: '6px' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontWeight: '600',
                                    background: hotel.has_live_pricing ? '#d1fae5' : '#fef3c7',
                                    color: hotel.has_live_pricing ? '#065f46' : '#92400e',
                                    border: hotel.has_live_pricing ? '1px solid #6ee7b7' : '1px solid #f59e0b'
                                  }}>
                                    {hotel.has_live_pricing ? '🔴 LIVE PRICE' : '📊 ESTIMATE'}
                                  </span>
                                </div>

                                <strong>{hotel.name}</strong>
                                <div className="result-meta">
                                  <span className="rating">⭐ {hotel.rating || 'N/A'}</span>
                                  {hotel.distance_km && <span className="distance">📍 {hotel.distance_km} km</span>}
                                  <span className="address">{hotel.address}</span>
                                </div>
                                <div className="result-price">{hotel.price_range || 'Check live price'}</div>
                              </div>
                              <a href={hotel.booking_link} target="_blank" rel="noopener noreferrer" className="btn-book">Book</a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Live Preview */}
        <div className="preview-column">
          <div className="sticky-preview">
            <RouteVisualization
              costPreview={costPreview}
              mapRef={mapRef}
              googleMapsLoaded={googleMapsLoaded}
              mapInitialized={mapInitialized}
            />

            {/* Excess Baggage Input (only shown when flight is selected) */}
            {(selectedFlight || Object.keys(segmentFlights).length > 0) && (
              <section className="config-section glass-card" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Excess Baggage (Ü-gepack)</h3>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Cost (EUR)</label>
                    <input
                      type="number"
                      value={excessBaggage.cost || ''}
                      onChange={(e) => setExcessBaggage(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="form-input"
                      style={{ padding: '10px', fontSize: '14px' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Description (Optional)</label>
                    <input
                      type="text"
                      value={excessBaggage.description || ''}
                      onChange={(e) => setExcessBaggage(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Extra luggage"
                      className="form-input"
                      style={{ padding: '10px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </section>
            )}

            <CostPreviewSection
              costPreview={costPreview}
              loadingCostPreview={loadingCostPreview}
              selectedTechnician={selectedTechnician}
              customers={customers}
              onTollDetailsClick={(details, cost) => {
                setTollDetails(details);
                setTotalTollCost(cost);
                setShowTollDetailsModal(true);
              }}
            />

            {/* Save Trip Button */}
            <section className="config-section glass-card" style={{ marginTop: '16px' }}>
              <button
                onClick={handleSubmit}
                disabled={loading || customers.filter(c => c.name && c.address).length === 0}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? 'Saving Trip...' : 'Save Trip & Create Quote'}
              </button>
              <p style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#6b7280', 
                textAlign: 'center' 
              }}>
                All trip data including quote form fields will be saved
              </p>
            </section>
          </div>
        </div>
      </div >
      
      {/* AI Prompt Modal */}
      <AIPromptModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        aiPrompt={aiPrompt}
        aiResponse={aiResponse}
        setAiResponse={setAiResponse}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        copyPromptToClipboard={copyPromptToClipboard}
        parseAIResponse={parseAIResponse}
      />
      
      {/* Flights Selection Modal - Extracted Component */}
      <FlightsModal
        isOpen={showFlightsModal}
        onClose={() => setShowFlightsModal(false)}
        customerId={flightsModalCustomerId}
        customers={customers}
        flights={flights}
        loadingFlights={loadingFlights}
        selectedFlight={selectedFlight}
        setSelectedFlight={setSelectedFlight}
        fetchTravelOptions={fetchTravelOptions}
        fetchCostPreview={fetchCostPreview}
        airportOptions={airportOptions}
        searchingWithApi={searchingWithApi}
        selectedSearchApi={selectedSearchApi}
        setSelectedSearchApi={setSelectedSearchApi}
        getSettings={getSettings}
      />
      
      {/* Toll Details Modal */}
      <TollDetailsModal
        isOpen={showTollDetailsModal}
        onClose={() => setShowTollDetailsModal(false)}
        totalTollCost={totalTollCost}
        tollDetails={tollDetails}
      />
      
      {/* Date Warning Modal */}
      <DateWarningModal
        isOpen={showDateWarningModal}
        onClose={() => setShowDateWarningModal(false)}
        message={dateWarningMessage}
      />

      {/* API Status Modal */}
      <ApiStatusModal
        isOpen={showApiStatusModal}
        onClose={() => setShowApiStatusModal(false)}
        apiStatuses={apiStatuses}
        getOverallApiHealth={getOverallApiHealth}
        testAllApis={testAllApis}
        testingApis={testingApis}
        resetStatuses={() => {
          setApiStatuses({
            groq: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
            amadeus: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
            serpapi: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
            googleMaps: { status: 'unknown', message: 'Not tested yet', lastChecked: null },
            tollApi: { status: 'unknown', message: 'Not tested yet', lastChecked: null }
          });
        }}
      />

      {/* Segment Flight Selection Modal - For multi-customer trips */}
      <SegmentFlightModal
        activeSegmentModal={activeSegmentModal}
        onClose={() => setActiveSegmentModal(null)}
        generateTripSegments={generateTripSegments}
        segmentFlights={segmentFlights}
        loadingSegmentFlights={loadingSegmentFlights}
        searchSegmentFlights={searchSegmentFlights}
        setSegmentDrive={setSegmentDrive}
        selectSegmentFlight={selectSegmentFlight}
        clearSegmentFlight={clearSegmentFlight}
      />

      {/* Backend Status Notification */}
      <BackendStatusNotification
        onBackendRestart={() => {
          logger.info('Backend', 'User requested backend restart');
          alert('To restart the backend, run:\n\ncd "Trip Cost/backend" && npm run dev\n\nOr check the terminal where the backend is running.');
        }}
      />
    </div >
  );
}

export default TripWizardPage;
