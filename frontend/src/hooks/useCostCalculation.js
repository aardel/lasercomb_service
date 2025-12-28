import { useState, useEffect, useCallback } from 'react';
import { costsAPI, checkBackendHealth } from '../services/api';
import { getSettings } from '../services/settingsStorage';
import { logger } from '../utils/logger';
import { TIMEOUTS } from '../constants/travelConstants';

/**
 * Custom hook for managing cost calculation and preview
 * @param {Object} params - Parameters for cost calculation
 * @param {Array} params.customers - Array of customer objects
 * @param {Object} params.startingCoordinates - Starting location coordinates
 * @param {string} params.startingAddress - Starting address string
 * @param {string} params.tripDate - Trip date in ISO format
 * @param {Object} params.selectedFlight - Selected flight object
 * @param {Object} params.selectedRentalCar - Selected rental car object
 * @param {Object} params.segmentFlights - Segment flights for multi-customer trips
 * @param {Object} params.selectedTechnician - Selected technician object
 * @param {Function} params.setSelectedTechnician - Function to update selected technician
 * @param {Object} params.airportOptions - Airport options per customer
 * @param {Object} params.selectedAirports - Selected airports per customer
 * @returns {Object} - { costPreview, loadingCostPreview, fetchCostPreview }
 */
export const useCostCalculation = ({
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
}) => {
  const [costPreview, setCostPreview] = useState(null);
  const [loadingCostPreview, setLoadingCostPreview] = useState(false);

  const fetchCostPreview = useCallback(async () => {
    const activeCustomers = customers.filter(c => c.name && c.address);
    if (activeCustomers.length === 0) return;

    // Get current settings from storage
    const settings = getSettings();
    const { getActiveTechnician } = await import('../services/settingsStorage');
    // Always fetch fresh technician data to avoid stale airport cache
    const activeTech = await getActiveTechnician();
    
    // Update selectedTechnician state if it changed
    if (activeTech && (!selectedTechnician || selectedTechnician.id !== activeTech.id || 
        JSON.stringify(selectedTechnician.airports || []) !== JSON.stringify(activeTech.airports || []))) {
      logger.debug('CostPreview', 'Technician airports changed, updating state');
      setSelectedTechnician(activeTech);
    }

    setLoadingCostPreview(true);
    try {
      // Include cached airports from technician settings - use fresh data
      // Filter out any null/undefined airports to ensure clean array
      const validAirports = activeTech?.airports?.filter(a => a && a.code) || [];
      const technicianSettingsWithAirports = activeTech ? {
        ...activeTech,
        airports: validAirports // Only include valid airports
      } : null;
      
      logger.info('CostPreview', 'Using technician airports:', validAirports.map(a => a.code).join(', ') || 'none');

      // Debug: Log what we're sending to backend
      if (selectedFlight) {
        logger.debug('CostPreview', 'Sending selectedFlight to backend:', {
          id: selectedFlight.id,
          price: selectedFlight.price,
          total_price: selectedFlight.total_price,
          has_outbound: !!selectedFlight.outbound,
          has_return: !!selectedFlight.return,
          outbound_price: selectedFlight.outbound?.price,
          return_price: selectedFlight.return?.price,
          source: selectedFlight.source
        });
      } else {
        logger.debug('CostPreview', 'No flight selected - backend will use median_flight');
      }
      
      // For multi-customer trips, use segment flights instead of single selected flight
      const isMultiCustomer = activeCustomers.length > 1;
      const hasSegmentFlights = isMultiCustomer && Object.keys(segmentFlights).length > 0;
      
      // Log segment flights if present
      if (hasSegmentFlights) {
        logger.debug('CostPreview', 'Sending segment flights to backend:', 
          Object.entries(segmentFlights).map(([idx, data]) => ({
            segment: idx,
            mode: data?.mode,
            flight_id: data?.flight?.id,
            price: data?.flight?.price
          }))
        );
      }
      
      // Pre-flight check: Verify backend is available
      const isBackendHealthy = await checkBackendHealth();
      if (!isBackendHealthy) {
        logger.warn('CostPreview', 'Backend health check failed, aborting cost calculation');
        setLoadingCostPreview(false);
        return;
      }
      
      // Prepare cost percentages for multi-customer trips
      const costPercentages = isMultiCustomer
        ? activeCustomers.map(c => c.cost_percentage || (100 / activeCustomers.length))
        : null;

      const response = await costsAPI.calculateMultiStop({
        engineer_location: startingCoordinates || { address: startingAddress },
        customers: activeCustomers.map(c => ({
          customer_id: c.id,
          name: c.name,
          city: c.city || '',
          country: c.country || 'DEU',
          coordinates: c.coordinates,
          work_hours: parseFloat(c.time_hours) || 0
        })),
        date: tripDate,
        // For single customer: use round-trip selectedFlight
        // For multi-customer: use segment_flights array
        selected_flight: isMultiCustomer ? null : selectedFlight,
        segment_flights: hasSegmentFlights ? segmentFlights : null,
        selected_rental_car: selectedRentalCar,
        // Pass overrides from settings (including cached airports)
        technician_settings: technicianSettingsWithAirports,
        billing_settings: settings.billing,
        travel_times: settings.travelTimes,
        // Pass cost percentages for splitting
        cost_percentages: costPercentages
      });

      if (response.data.success) {
        setCostPreview(response.data.data);
      }
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
        logger.warn('CostPreview', 'Backend server is not available. Cost preview will not be updated.');
      } else {
        logger.error('CostPreview', 'Error fetching cost preview:', error);
      }
    } finally {
      setLoadingCostPreview(false);
    }
  }, [customers, startingCoordinates, startingAddress, tripDate, selectedFlight, selectedRentalCar, selectedTechnician, segmentFlights, setSelectedTechnician]);

  // Master update effect for cost preview (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCostPreview();
    }, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [
    customers, 
    startingCoordinates, 
    tripDate, 
    selectedTechnician, 
    airportOptions, 
    selectedAirports,
    fetchCostPreview
  ]);

  // Immediate update for selections (including segment flights for multi-customer)
  useEffect(() => {
    fetchCostPreview();
  }, [selectedFlight, selectedRentalCar, segmentFlights, fetchCostPreview]);

  return {
    costPreview,
    loadingCostPreview,
    fetchCostPreview
  };
};


