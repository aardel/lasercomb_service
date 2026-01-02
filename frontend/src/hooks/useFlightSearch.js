import { useState, useCallback } from 'react';
import { flightsAPI, checkBackendHealth } from '../services/api';
import { getSettings, getActiveTechnician } from '../services/settingsStorage';
import { logger } from '../utils/logger';
import { API_NAMES, API_OPTION_NAMES, FLIGHT_SEARCH_LIMITS, TRAVEL_THRESHOLDS } from '../constants/travelConstants';

/**
 * useFlightSearch Hook
 * Manages flight search state and operations
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.updateApiStatus - Function to update API status
 * @param {Function} options.setSelectedTechnician - Function to update selected technician
 * @param {Function} options.setDateWarningMessage - Function to set date warning message
 * @param {Function} options.setShowDateWarningModal - Function to show/hide date warning modal
 * @param {Function} options.setSelectedFlight - Function to set selected flight
 * @param {Function} options.setSelectedRentalCar - Function to set selected rental car
 * @param {Function} options.setAirportOptions - Function to set airport options
 * @param {Function} options.setSelectedAirports - Function to set selected airports
 * @param {Function} options.handleAirportSelect - Function to handle airport selection (for auto-fallback)
 * @param {Object} options.selectedTechnician - Currently selected technician
 * @param {Object} options.selectedAirports - Currently selected airports
 * @param {Object} options.airportOptions - Available airport options
 * @param {Object} options.selectedFlight - Currently selected flight (to check if AI-selected)
 * @param {Array} options.customers - List of customers
 * @param {string} options.tripDate - Trip departure date
 * @param {Object} options.startingCoordinates - Starting location coordinates
 * @param {string} options.startingAddress - Starting address
 * 
 * @returns {Object} Flight search state and functions
 */
export const useFlightSearch = ({
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
}) => {
  // Flight search state
  const [flights, setFlights] = useState({}); // { customerId: flightResults }
  const [loadingFlights, setLoadingFlights] = useState({}); // { customerId: boolean }
  const [rentalCars, setRentalCars] = useState({}); // { customerId: [cars] }
  const [loadingRentalCars, setLoadingRentalCars] = useState({}); // { customerId: boolean }
  const [searchingWithApi, setSearchingWithApi] = useState(null); // Track which API is currently searching

  /**
   * Validate dates and show warnings if needed
   */
  const validateDates = useCallback((departureDate, returnDate, outboundOnly, returnOnly) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departure = new Date(departureDate);
    departure.setHours(0, 0, 0, 0);

    if (departure < today) {
      const formattedDate = new Date(departureDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setDateWarningMessage(`The selected departure date (${formattedDate}) is in the past and no flight information can be searched. Please select today's date or a future date for departure.`);
      setShowDateWarningModal(true);
      return false;
    }

    if (returnDate && !outboundOnly && !returnOnly) {
      const returnDateObj = new Date(returnDate);
      returnDateObj.setHours(0, 0, 0, 0);
      if (returnDateObj < today) {
        const formattedReturnDate = returnDateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        setDateWarningMessage(`The calculated return date (${formattedReturnDate}) is in the past and no flight information can be searched. Please select today's date or a future date for departure.`);
        setShowDateWarningModal(true);
        return false;
      }
    }

    return true;
  }, [setDateWarningMessage, setShowDateWarningModal]);

  /**
   * Calculate return date based on work hours
   */
  const calculateReturnDate = useCallback((customerId, isMultiCustomer) => {
    const activeCustomers = customers.filter(c => c.coordinates && c.name && c.address);
    const customer = customers.find(c => c.id === customerId);
    const workHours = parseFloat(customer?.time_hours) || 0;
    const totalWorkHours = activeCustomers.reduce((sum, c) => sum + (parseFloat(c.time_hours) || 0), 0);

    const travelDays = Math.max(
      TRAVEL_THRESHOLDS.MIN_TRAVEL_DAYS,
      Math.ceil((isMultiCustomer ? totalWorkHours : workHours) / TRAVEL_THRESHOLDS.WORK_HOURS_PER_DAY)
    );

    const returnDate = new Date(tripDate);
    returnDate.setDate(returnDate.getDate() + (travelDays - 1));
    returnDate.setHours(0, 0, 0, 0);
    return returnDate.toISOString().split('T')[0];
  }, [customers, tripDate]);

  /**
   * Normalize airport object structure
   */
  const normalizeAirport = useCallback((airport, existingAirports = []) => {
    const existing = existingAirports.find(a =>
      (a.code || a.iataCode) === (airport.code || airport.iataCode)
    );

    return {
      code: airport.code || airport.iataCode,
      name: airport.name,
      lat: airport.lat || airport.latitude || airport.geoCode?.latitude,
      lng: airport.lng || airport.longitude || airport.geoCode?.longitude,
      distance_km: existing?.distance_km || airport.distance_km || 0
    };
  }, []);

  /**
   * Update airport options from flight search response
   */
  const updateAirportOptionsFromResponse = useCallback((customerId, responseData) => {
    if (!responseData.origin_airport || !responseData.destination_airport) return;

    const currentOptions = airportOptions[customerId] || { origin: [], destination: [] };
    const originAirports = [...currentOptions.origin];
    const destAirports = [...currentOptions.destination];

    const normalizedOrigin = normalizeAirport(responseData.origin_airport, originAirports);
    const normalizedDest = normalizeAirport(responseData.destination_airport, destAirports);

    setAirportOptions(prev => {
      const current = prev[customerId] || { origin: [], destination: [] };
      const updatedOriginAirports = [...current.origin];
      const updatedDestAirports = [...current.destination];

      // Update origin airport
      const originIndex = updatedOriginAirports.findIndex(a => a.code === normalizedOrigin.code);
      if (originIndex >= 0) {
        updatedOriginAirports[originIndex] = {
          ...normalizedOrigin,
          distance_km: updatedOriginAirports[originIndex].distance_km || normalizedOrigin.distance_km || 0
        };
      } else if (updatedOriginAirports.length < 2) {
        updatedOriginAirports.push(normalizedOrigin);
      }

      // Update destination airport
      const destIndex = updatedDestAirports.findIndex(a => a.code === normalizedDest.code);
      if (destIndex >= 0) {
        updatedDestAirports[destIndex] = {
          ...normalizedDest,
          distance_km: updatedDestAirports[destIndex].distance_km || normalizedDest.distance_km || 0
        };
      } else if (updatedDestAirports.length < 2) {
        updatedDestAirports.push(normalizedDest);
      }

      return {
        ...prev,
        [customerId]: {
          origin: updatedOriginAirports.slice(0, 2),
          destination: updatedDestAirports.slice(0, 2)
        }
      };
    });

    // Auto-select the airports used in flight search
    setSelectedAirports(prev => ({
      ...prev,
      [customerId]: {
        origin: normalizedOrigin,
        destination: normalizedDest
      }
    }));
  }, [airportOptions, normalizeAirport, setAirportOptions, setSelectedAirports]);

  /**
   * Update API status based on response
   */
  const updateApiStatusFromResponse = useCallback((responseData) => {
    if (responseData?.source?.includes('Groq')) {
      updateApiStatus('groq', responseData);
    } else if (responseData?.source?.includes('Amadeus')) {
      updateApiStatus('amadeus', responseData);
    } else if (responseData?.source?.includes('SerpAPI') || responseData?.source?.includes('Google')) {
      updateApiStatus('serpapi', responseData);
    }

    if (responseData?.error) {
      const errorMsg = responseData.error.toLowerCase();
      if (errorMsg.includes('groq')) updateApiStatus('groq', responseData);
      if (errorMsg.includes('amadeus')) updateApiStatus('amadeus', responseData);
      if (errorMsg.includes('serp') || errorMsg.includes('google flight')) updateApiStatus('serpapi', responseData);
    }
  }, [updateApiStatus]);

  /**
   * Fetch travel options with explicit airport selection
   */
  const fetchTravelOptionsWithAirports = useCallback(async (
    customerId,
    coordinates,
    explicitSelectedAirports = null,
    outboundOnly = false,
    returnOnly = false,
    forceApi = null
  ) => {
    if (!coordinates || !startingCoordinates) return;

    // Validate dates
    const returnDateStr = calculateReturnDate(customerId, customers.filter(c => c.coordinates && c.name && c.address).length > 1);
    if (!validateDates(tripDate, returnDateStr, outboundOnly, returnOnly)) {
      return;
    }

    setLoadingFlights(prev => ({ ...prev, [customerId]: true }));
    setLoadingRentalCars(prev => ({ ...prev, [customerId]: true }));

    // Use explicit airports if provided, otherwise use state
    const airportsToUse = explicitSelectedAirports || selectedAirports;
    const originAirport = airportsToUse[customerId]?.origin;
    const destAirport = airportsToUse[customerId]?.destination;

    // Determine search origin/destination
    let searchOrigin, searchDestination, searchReturnDate;

    if (returnOnly) {
      searchOrigin = destAirport?.code
        ? { code: destAirport.code, lat: destAirport.lat, lng: destAirport.lng }
        : coordinates;
      searchDestination = originAirport?.code
        ? { code: originAirport.code, lat: originAirport.lat, lng: originAirport.lng }
        : startingCoordinates;
      searchReturnDate = null;
    } else {
      searchOrigin = originAirport?.code
        ? { code: originAirport.code, lat: originAirport.lat, lng: originAirport.lng }
        : startingCoordinates;
      searchDestination = destAirport?.code
        ? { code: destAirport.code, lat: destAirport.lat, lng: destAirport.lng }
        : coordinates;
      searchReturnDate = outboundOnly ? null : returnDateStr;
    }

    // Get fresh technician data
    try {
      const freshTech = await getActiveTechnician();
      const validTechAirports = freshTech?.airports?.filter(a => a && a.code) || [];

      if (freshTech && (!selectedTechnician || selectedTechnician.id !== freshTech.id ||
        JSON.stringify(selectedTechnician.airports || []) !== JSON.stringify(validTechAirports))) {
        logger.debug('FlightSearch', 'Technician airports changed, updating state');
        setSelectedTechnician(freshTech);
        setFlights(prev => {
          const updated = { ...prev };
          delete updated[customerId];
          return updated;
        });
      }

      if (validTechAirports.length > 0) {
        logger.info('FlightSearch', 'Using technician airports:', validTechAirports.map(a => a.code).join(', '));
      } else {
        logger.warn('FlightSearch', 'No technician airports available, will find nearest');
      }
    } catch (error) {
      logger.error('FlightSearch', 'Error getting technician:', error);
    }

    try {
      // Get API preferences
      const settings = getSettings();
      const apiPreferences = settings?.apiSettings || null;
      let flightApiPreferences = apiPreferences?.flightApis || null;

      // Override API preferences if forceApi is specified
      if (forceApi && forceApi !== API_NAMES.ALL) {
        logger.debug('FlightSearch', `Forcing search with specific API: ${forceApi}`);
        setSearchingWithApi(forceApi);
        flightApiPreferences = {
          amadeus: { enabled: forceApi === API_NAMES.AMADEUS, priority: 1, name: API_OPTION_NAMES[API_NAMES.AMADEUS] },
          googleFlights: { enabled: forceApi === API_NAMES.SERPAPI, priority: 1, name: API_OPTION_NAMES[API_NAMES.SERPAPI] },
          groq: { enabled: forceApi === API_NAMES.GROQ, priority: 1, name: API_OPTION_NAMES[API_NAMES.GROQ] }
        };
      } else {
        setSearchingWithApi(null);
      }

      logger.debug('API', 'API Settings from storage:', JSON.stringify(apiPreferences, null, 2));
      logger.debug('API', 'Flight API preferences being sent:', JSON.stringify(flightApiPreferences, null, 2));

      // Pre-flight check: Verify backend is available
      const isBackendHealthy = await checkBackendHealth();
      
      if (!isBackendHealthy) {
        logger.warn('FlightSearch', 'Backend health check failed, aborting flight search');
        return {
          success: false,
          options: [],
          error: 'Backend server is not available. Please ensure the backend is running at http://localhost:3000'
        };
      }

      // Get flight search provider preference (default to Serper)
      const flightProvider = settings?.flightSearchProvider || 'serper';
      const providers = [flightProvider]; // Use selected provider first

      // Add fallback providers
      if (flightProvider !== 'serper') providers.push('serper');
      if (flightProvider !== 'amadeus') providers.push('amadeus');
      if (flightProvider !== 'groq') providers.push('groq');

      logger.debug('FlightSearch', `Using provider: ${flightProvider}, fallbacks: ${providers.join(', ')}`);

      // Search flights using new provider system
      const response = await flightsAPI.searchWithProvider({
        origin: searchOrigin,
        destination: searchDestination,
        departureDate: returnOnly ? returnDateStr : tripDate,
        returnDate: searchReturnDate,
        passengers: 1,
        maxResults: FLIGHT_SEARCH_LIMITS.MAX_RESULTS,
        providers: providers
      });

      logger.debug('FlightSearch', `Flights response for ${customerId}:`, response.data);

      // New provider format: response.data.flights instead of response.data.options
      const flightOptions = response.data.flights || response.data.options || [];
      logger.debug('FlightSearch', `Provider: ${response.data.provider}, Flights count: ${flightOptions.length}`);

      // Convert provider response to old format for compatibility
      const formattedResponse = {
        success: response.data.success,
        options: flightOptions,
        provider: response.data.provider,
        source: response.data.provider,
        origin_airport: {
          code: searchOrigin.code,
          lat: searchOrigin.lat,
          lng: searchOrigin.lng
        },
        destination_airport: {
          code: searchDestination.code,
          lat: searchDestination.lat,
          lng: searchDestination.lng
        },
        rental_car_options: [] // Provider endpoint doesn't return rental cars yet
      };

      // Update API status
      updateApiStatusFromResponse(formattedResponse);

      // Update state
      setFlights(prev => ({ ...prev, [customerId]: formattedResponse }));
      setRentalCars(prev => ({ ...prev, [customerId]: [] })); // TODO: Add rental car provider integration

      // Update airport options
      updateAirportOptionsFromResponse(customerId, formattedResponse);

      // Auto-select first flight (if not AI-selected)
      if (formattedResponse.success && flightOptions.length > 0) {
        const currentFlightIsAI = selectedFlight?.source === 'ai_recommendation';
        if (!currentFlightIsAI) {
          setSelectedFlight(flightOptions[0]);
        } else {
          logger.debug('FlightSearch', 'Preserving AI-selected flight, not overwriting with search results');
        }
      }

      return response.data;
    } catch (error) {
      // Check if it's a backend down error or network error
      const isBackendDown = error.isBackendDown || 
                           error.code === 'ERR_BACKEND_DOWN' ||
                           error.code === 'ERR_NETWORK' || 
                           error.code === 'ECONNREFUSED' ||
                           error.code === 'ERR_EMPTY_RESPONSE' ||
                           error.message?.toLowerCase().includes('network error') ||
                           error.message?.toLowerCase().includes('connection refused') ||
                           error.message?.toLowerCase().includes('empty response') ||
                           error.message?.toLowerCase().includes('backend server is not available');
      
      if (isBackendDown) {
        logger.warn('FlightSearch', 'Backend server is not available. Please ensure the backend is running.');
        return { 
          success: false, 
          options: [],
          error: 'Backend server is not available. Please ensure the backend is running at http://localhost:3000'
        };
      } else {
        logger.error('FlightSearch', 'Error fetching travel options:', error);
        return { 
          success: false, 
          options: [],
          error: error.message || 'Failed to fetch travel options'
        };
      }
    } finally {
      setLoadingFlights(prev => ({ ...prev, [customerId]: false }));
      setLoadingRentalCars(prev => ({ ...prev, [customerId]: false }));
      setSearchingWithApi(null);
    }
  }, [
    startingCoordinates,
    calculateReturnDate,
    validateDates,
    tripDate,
    customers,
    selectedAirports,
    selectedTechnician,
    selectedFlight,
    setSelectedTechnician,
    updateApiStatusFromResponse,
    updateAirportOptionsFromResponse,
    setSelectedFlight,
    setSelectedRentalCar
  ]);

  /**
   * Fetch travel options (wrapper with auto-fallback logic)
   */
  const fetchTravelOptions = useCallback(async (
    customerId,
    coordinates,
    useSelectedAirports = false,
    outboundOnly = false,
    returnOnly = false,
    forceApi = null
  ) => {
    const responseData = await fetchTravelOptionsWithAirports(
      customerId,
      coordinates,
      null,
      outboundOnly,
      returnOnly,
      forceApi
    );

    // Auto-fallback: try second airport if first failed
    if (!useSelectedAirports && (!responseData?.success || !responseData?.options || responseData.options.length === 0)) {
      const airports = airportOptions[customerId];
      const selected = selectedAirports[customerId];

      // Try second origin airport
      if (selected?.origin && airports?.origin && airports.origin.length > 1) {
        const firstOrigin = airports.origin[0];
        const secondOrigin = airports.origin[1];
        const isFirstOrigin = selected.origin.code === firstOrigin.code &&
          selected.origin.lat === firstOrigin.lat &&
          selected.origin.lng === firstOrigin.lng;
        if (isFirstOrigin && secondOrigin) {
          logger.debug('FlightSearch', `No flights found with ${firstOrigin.code}, trying ${secondOrigin.code}...`);
          if (handleAirportSelect) {
            await handleAirportSelect(customerId, 'origin', secondOrigin);
          }
          return;
        }
      }

      // Try second destination airport
      if (selected?.destination && airports?.destination && airports.destination.length > 1) {
        const firstDest = airports.destination[0];
        const secondDest = airports.destination[1];
        const isFirstDest = selected.destination.code === firstDest.code &&
          selected.destination.lat === firstDest.lat &&
          selected.destination.lng === firstDest.lng;
        if (isFirstDest && secondDest) {
          logger.debug('FlightSearch', `No flights found with ${firstDest.code}, trying ${secondDest.code}...`);
          if (handleAirportSelect) {
            await handleAirportSelect(customerId, 'destination', secondDest);
          }
          return;
        }
      }
    }
  }, [fetchTravelOptionsWithAirports, airportOptions, selectedAirports, handleAirportSelect]);

  return {
    // State
    flights,
    loadingFlights,
    rentalCars,
    loadingRentalCars,
    searchingWithApi,
    // Setters (for external control if needed)
    setFlights,
    setLoadingFlights,
    setRentalCars,
    setLoadingRentalCars,
    // Functions
    fetchTravelOptions,
    fetchTravelOptionsWithAirports
  };
};

