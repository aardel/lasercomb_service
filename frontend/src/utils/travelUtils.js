/**
 * Travel-related utility functions
 * @module utils/travelUtils
 */

import { formatTime } from './formatters';
import { getAirlineName } from './airlineCodes';
import { isEuropeanAirport } from './airportUtils';

/**
 * Generate air travel legs breakdown for display
 * @param {Object} flightOption - Flight option data from cost calculator
 * @param {Object} technicianSettings - Technician settings with transport preferences
 * @returns {Array} Array of leg objects for display
 */
export const generateAirTravelLegs = (flightOption, technicianSettings) => {
  if (!flightOption || !flightOption.time_breakdown) return [];
  
  const legs = [];
  const transportType = technicianSettings?.transportToAirport || 'Taxi';
  const timeToAirport = technicianSettings?.timeToAirport || 45;
  const securityBoarding = flightOption.time_breakdown.security_boarding / 2; // Divide by 2 since it's round-trip
  const outboundFlight = flightOption.outbound_flight;
  const returnFlight = flightOption.return_flight;
  const deboardingLuggage = flightOption.time_breakdown.deboarding_luggage / 2;
  const airportToDestination = flightOption.time_breakdown.to_destination / 2;
  
  // Outbound journey - consolidated steps
  legs.push({
    from: 'Base',
    to: 'Departure Airport',
    duration_text: formatTime(timeToAirport),
    detail: transportType === 'Car' ? 'by car' : 'by taxi'
  });
  
  legs.push({
    from: 'Departure Airport',
    to: 'Flight Departure',
    duration_text: formatTime(securityBoarding),
    detail: 'check-in & security'
  });
  
  if (outboundFlight) {
    // Check if this is a connecting flight - use routing if available, otherwise use from/to
    let displayFrom, displayTo;
    if (outboundFlight.routing) {
      // Routing format: "FRA → SAW → BGY" - extract first and last airports
      const routingParts = outboundFlight.routing.split(' → ');
      displayFrom = routingParts[0]?.trim();
      displayTo = routingParts[routingParts.length - 1]?.trim();
    } else if (outboundFlight.segments && outboundFlight.segments.length > 1) {
      // If segments exist, use first segment's from and last segment's to
      displayFrom = outboundFlight.segments[0]?.from;
      displayTo = outboundFlight.segments[outboundFlight.segments.length - 1]?.to;
    } else {
      // Direct flight - use from/to
      displayFrom = outboundFlight.from;
      displayTo = outboundFlight.to;
    }
    
    // For European flight check, use the actual routing airports if available
    const checkFrom = displayFrom || outboundFlight.from;
    const checkTo = displayTo || outboundFlight.to;
    const isEuropeToEurope = isEuropeanAirport(checkFrom) && isEuropeanAirport(checkTo);
    const isLongEuropeanFlight = isEuropeToEurope && outboundFlight.duration_minutes > 600; // 10 hours = 600 minutes
    
    legs.push({
      from: displayFrom || outboundFlight.from,
      to: displayTo || outboundFlight.to,
      routing: outboundFlight.routing, // Store full routing for reference
      duration_text: formatTime(outboundFlight.duration_minutes),
      flight_info: `${getAirlineName(outboundFlight.airline)} ${outboundFlight.flight_number}`,
      isLongEuropeanFlight: isLongEuropeanFlight,
      isConnecting: outboundFlight.routing && outboundFlight.routing.includes(' → ') && outboundFlight.routing.split(' → ').length > 2
    });
  }
  
  legs.push({
    from: 'Arrival Airport',
    to: 'Customer',
    duration_text: formatTime(deboardingLuggage + airportToDestination),
    detail: 'deboarding, rental car & drive'
  });
  
  // Return journey - consolidated steps
  legs.push({
    from: 'Customer',
    to: 'Return Airport',
    duration_text: formatTime(airportToDestination + deboardingLuggage),
    detail: 'drive, return car & check-in'
  });
  
  if (returnFlight) {
    // Check if this is a connecting flight - use routing if available, otherwise use from/to
    let displayFrom, displayTo;
    if (returnFlight.routing) {
      // Routing format: "BGY → SAW → FRA" - extract first and last airports
      const routingParts = returnFlight.routing.split(' → ');
      displayFrom = routingParts[0]?.trim();
      displayTo = routingParts[routingParts.length - 1]?.trim();
    } else if (returnFlight.segments && returnFlight.segments.length > 1) {
      // If segments exist, use first segment's from and last segment's to
      displayFrom = returnFlight.segments[0]?.from;
      displayTo = returnFlight.segments[returnFlight.segments.length - 1]?.to;
    } else {
      // Direct flight - use from/to
      displayFrom = returnFlight.from;
      displayTo = returnFlight.to;
    }
    
    // For European flight check, use the actual routing airports if available
    const checkFrom = displayFrom || returnFlight.from;
    const checkTo = displayTo || returnFlight.to;
    const isEuropeToEurope = isEuropeanAirport(checkFrom) && isEuropeanAirport(checkTo);
    const isLongEuropeanFlight = isEuropeToEurope && returnFlight.duration_minutes > 600; // 10 hours = 600 minutes
    
    legs.push({
      from: displayFrom || returnFlight.from,
      to: displayTo || returnFlight.to,
      routing: returnFlight.routing, // Store full routing for reference
      duration_text: formatTime(returnFlight.duration_minutes),
      flight_info: `${getAirlineName(returnFlight.airline)} ${returnFlight.flight_number}`,
      isLongEuropeanFlight: isLongEuropeanFlight,
      isConnecting: returnFlight.routing && returnFlight.routing.includes(' → ') && returnFlight.routing.split(' → ').length > 2
    });
  }
  
  legs.push({
    from: 'Arrival Airport',
    to: 'Base',
    duration_text: formatTime(securityBoarding + timeToAirport),
    detail: transportType === 'Car' ? 'deboarding & drive home' : 'deboarding & taxi home'
  });
  
  return legs;
};

export default generateAirTravelLegs;





