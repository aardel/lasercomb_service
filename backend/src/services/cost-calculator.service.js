const pool = require('../config/database');
const { calculateDistance } = require('./distance.service');
const ratesService = require('./rates.service');

// Helper function to format decimal hours to hours and minutes (e.g., 14.3 -> "14 hours 18 minutes")
function formatHoursToTime(decimalHours) {
  if (!decimalHours || decimalHours === 0) return '0 hours';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours > 0 && minutes > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

class CostCalculatorService {
  /**
   * Get travel rates for a country/city from XML file
   * NO FALLBACKS - throws error if rate not found
   * @param {string} countryName - Country name (or country code for backwards compat)
   * @param {string} cityName - Optional city name for city-specific rates
   */
  async getTravelRates(countryName, cityName = null) {
    // Ensure rates service is initialized
    await ratesService.initialize();

    // Try to get rate by country name first (now async - database backed)
    let rate;
    try {
      rate = await ratesService.getRateByCountryName(countryName, cityName);
    } catch (e) {
      // If country name not found, try as country code
      try {
        rate = await ratesService.getRateByCountryCode(countryName, cityName);
      } catch (e2) {
        // Re-throw the original error with country name
        throw new Error(
          `Travel rates not found for: "${countryName}"${cityName ? ` (city: "${cityName}")` : ''}. ` +
          `Please check the Daily Rates settings.`
        );
      }
    }

    // Log which rate was found (helpful for debugging city-specific lookups)
    console.log(`[CostCalculator] Rate lookup: ${countryName}${cityName ? ` / ${cityName}` : ''} → ${rate.country_name}${rate.city_name ? ` (${rate.city_name})` : ' (country default)'}`);

    // Return in the same format as before for backwards compatibility
    return {
      daily_allowance_8h: rate.daily_allowance_8h,
      daily_allowance_24h: rate.daily_allowance_24h,
      hotel_rate: rate.hotel_allowance || rate.hotel_rate,
      mileage_rate: rate.mileage_rate,
      travel_hour_rate: rate.travel_hour_rate,
      work_hour_rate: rate.work_hour_rate,
      // Trip fees (per trip, not per day)
      agent_fee: rate.agent_fee || 0,
      company_fee: rate.company_fee || 0,
      additional_fee_percent: rate.additional_fee_percent || 0,
      // Metadata
      official_rate: {
        country_name: rate.country_name,
        country_code: rate.country_code,
        city_name: rate.city_name,
        source: rate.source,
        source_reference: rate.source_reference,
        effective_date: rate.effective_date
      },
      custom_rate: null // Reserved for future company-specific overrides
    };
  }

  /**
   * Calculate all costs for a trip
   * @param {Object} tripData - Trip information
   * @returns {Promise<Object>} Complete cost breakdown
   */
  async calculateTripCosts(tripData) {
    const {
      engineer_location, // {lat, lng} or {address}
      customer_location, // {lat, lng} or {address}
      customer_country,
      customer_city,
      work_hours,
      date,
      engineer_airport_code,
      customer_airport_code
    } = tripData;

    // 1. Get travel rates for the destination country
    let rates;
    try {
      rates = await this.getTravelRates(customer_country, customer_city);
    } catch (ratesError) {
      console.error('[CostCalculator] Error getting travel rates:', ratesError);
      // Use default rates as fallback instead of crashing
      console.warn(`[CostCalculator] Using default rates for ${customer_country} due to error`);
      rates = {
        daily_allowance_8h: 50,
        daily_allowance_24h: 100,
        hotel_rate_max: 150,
        work_hour_rate: 98,
        travel_hour_rate: 98,
        country_name: customer_country,
        city_name: customer_city
      };
    }

    // 2. Calculate distance and travel time
    const distance = await calculateDistance(engineer_location, customer_location);

    // 3. Determine travel mode (flight vs road)
    const isDomestic = customer_country === 'DEU';
    const distanceKm = distance.distance_km;
    const needsFlight = distanceKm > 300 || !isDomestic;

    // 4. Calculate travel option costs
    let selectedOption;

    if (needsFlight) {
      // Flight option (simplified - will be enhanced with Amadeus API later)
      // For now, estimate based on distance
      const estimatedFlightPrice = isDomestic
        ? Math.max(150, distanceKm * 0.5) // Domestic: ~0.5€/km, min 150€
        : Math.max(300, distanceKm * 0.8); // International: ~0.8€/km, min 300€

      selectedOption = {
        type: 'flight',
        price: estimatedFlightPrice,
        travel_hours: (distance.duration_minutes / 60) * 0.6, // Flight is faster
        taxi_costs: 80, // Estimated taxi to/from airports
        parking_costs: 50, // Estimated parking
        distance_km: 0 // No road distance for flights
      };
    } else {
      // Road option
      const fuelConsumption = 7; // liters per 100km
      const fuelPricePerLiter = 1.80; // €/liter
      const fuelCosts = (distanceKm / 100) * fuelConsumption * fuelPricePerLiter;

      selectedOption = {
        type: 'road',
        travel_hours: distance.duration_minutes / 60,
        distance_km: distanceKm,
        fuel_costs: Math.round(fuelCosts * 100) / 100,
        toll_costs: distanceKm > 200 ? 25 : 0, // Estimated tolls
        price: 0
      };
    }

    // 5. Calculate total trip duration
    const total_hours = selectedOption.travel_hours + work_hours;

    // 6. Calculate daily allowances
    const fullDays = Math.floor(total_hours / 24);
    const remainingHours = total_hours % 24;
    const hasPartialDay = remainingHours > 8;

    // 7. Calculate hotel nights (only if trip > 18 hours)
    const hotelNights = total_hours > 18 ? Math.ceil((total_hours - 8) / 24) : 0;

    // 8. Build complete cost breakdown
    const costs = {
      // Working time (Arbeitszeit)
      arbeitszeit_hours: work_hours,
      arbeitszeit_rate: rates.work_hour_rate,
      arbeitszeit_total: Math.round(work_hours * rates.work_hour_rate * 100) / 100,

      // Travel time (Reisezeit)
      reisezeit_hours: Math.round(selectedOption.travel_hours * 100) / 100,
      reisezeit_rate: rates.travel_hour_rate,
      reisezeit_total: Math.round(selectedOption.travel_hours * rates.travel_hour_rate * 100) / 100,

      // Distance (Entfernung) - only for road travel
      entfernung_km: selectedOption.type === 'road' ? Math.round(selectedOption.distance_km * 100) / 100 : 0,
      entfernung_rate: rates.mileage_rate,
      entfernung_total: selectedOption.type === 'road'
        ? Math.round(selectedOption.distance_km * rates.mileage_rate * 100) / 100
        : 0,

      // Daily allowances 24h (Tagesspesen 24h)
      tagesspesen_24h_days: fullDays,
      tagesspesen_24h_rate: rates.daily_allowance_24h,
      tagesspesen_24h_total: Math.round(fullDays * rates.daily_allowance_24h * 100) / 100,

      // Daily allowances 8h (Tagesspesen >8h)
      tagesspesen_8h_days: hasPartialDay ? 1 : 0,
      tagesspesen_8h_rate: rates.daily_allowance_8h,
      tagesspesen_8h_total: hasPartialDay
        ? Math.round(rates.daily_allowance_8h * 100) / 100
        : 0,

      // Hotel (Übernachtung)
      hotel_nights: hotelNights,
      hotel_rate: rates.hotel_rate,
      hotel_total: Math.round(hotelNights * rates.hotel_rate * 100) / 100,

      // Transportation costs
      flight_national: selectedOption.type === 'flight' && isDomestic
        ? Math.round(selectedOption.price * 100) / 100
        : 0,
      flight_international: selectedOption.type === 'flight' && !isDomestic
        ? Math.round(selectedOption.price * 100) / 100
        : 0,
      taxi: selectedOption.taxi_costs || 0,
      parken: selectedOption.parking_costs || 0,
      treibstoff: selectedOption.fuel_costs || 0,
      maut: selectedOption.toll_costs || 0,
      
      // Excess baggage (ue_gepack) - only for flights
      ue_gepack: (selectedOption.type === 'flight' && tripData.metadata?.excess_baggage?.cost)
        ? Math.round(tripData.metadata.excess_baggage.cost * 100) / 100
        : 0
    };

    // 9. Calculate totals
    // Complete travel costs (komplette RK)
    costs.komplette_rk = Math.round((
      costs.reisezeit_total +
      costs.entfernung_total +
      costs.tagesspesen_24h_total +
      costs.tagesspesen_8h_total +
      costs.hotel_total +
      costs.flight_national +
      costs.flight_international +
      costs.taxi +
      costs.parken +
      costs.treibstoff +
      costs.maut +
      costs.ue_gepack
    ) * 100) / 100;

    // Total quotation (travel + work)
    costs.total_quotation = Math.round((costs.komplette_rk + costs.arbeitszeit_total) * 100) / 100;

    // 10. Add metadata
    costs.metadata = {
      travel_mode: selectedOption.type,
      is_domestic: isDomestic,
      distance_km: distanceKm,
      total_trip_hours: Math.round(total_hours * 100) / 100,
      rates_used: {
        country: customer_country,
        city: customer_city,
        has_custom_rates: !!rates.custom_rate
      }
    };

    return costs;
  }

  /**
   * Calculate costs for a multi-stop trip
   * @param {Object} tripData - { engineer_location, customers, work_hours_total, ... }
   * @returns {Promise<Object>} Detailed cost breakdown
   */
  async calculateMultiStopTripCosts(tripData) {
    const {
      engineer_location,
      customers, // Array of { customer_id, coordinates, city, country, work_hours }
      date,
      selected_flight = null,
      segment_flights = null, // For multi-customer trips: { segmentIndex: { flight, mode } }
      selected_rental_car = null,
      technician_settings = null, // Includes airports array if cached
      billing_settings = null,
      travel_times = null,
      trip_customers = null // Trip customer data including cost_percentage
    } = tripData;

    // 1. Optimize route
    let optimizedCustomers;
    try {
      optimizedCustomers = await require('./distance.service').optimizeRoute(engineer_location, customers);
    } catch (routeError) {
      console.error('[CostCalculator] Error optimizing route:', routeError);
      // Return safe empty result instead of crashing
      return {
        legs: [],
        total_work_hours: 0,
        total_days_required: 0,
        arbeitszeit_total: 0,
        tagesspesen_breakdown: [],
        hotel_total: 0,
        road_option: { type: 'road', total_cost: 0, travel_cost: 0, distance_km: 0, duration_hours: 0, toll_cost: 0, days_required: 0, hotel_nights: 0 },
        flight_option: null,
        recommended: 'road',
        metadata: { optimized_sequence: [], rates_used: null, error: routeError.message }
      };
    }

    if (!optimizedCustomers || optimizedCustomers.length === 0) {
      return {
        legs: [],
        total_work_hours: 0,
        total_days_required: 0,
        arbeitszeit_total: 0,
        tagesspesen_breakdown: [],
        hotel_total: 0,
        road_option: { type: 'road', total_cost: 0, travel_cost: 0, distance_km: 0, duration_hours: 0, toll_cost: 0, days_required: 0, hotel_nights: 0 },
        flight_option: null,
        recommended: 'road',
        metadata: { optimized_sequence: [], rates_used: null }
      };
    }

    // 2. Build the full path: Base -> C1 -> C2 -> ... -> Cn -> Base
    const fullPath = [engineer_location, ...optimizedCustomers.map(c => c.coordinates || { address: `${c.city}, ${c.country}` }), engineer_location];

    // 3. Calculate distances for each leg
    const legs = [];
    let totalDistanceKm = 0;
    let totalTravelMinutes = 0;
    let drivingPossible = true;
    let drivingError = null;

    try {
      for (let i = 0; i < fullPath.length - 1; i++) {
        try {
          const legDistance = await require('./distance.service').calculateDistance(fullPath[i], fullPath[i + 1]);
          if (legDistance && legDistance.distance_km !== undefined) {
            legs.push({
              from: i === 0 ? 'Base' : optimizedCustomers[i - 1].name || optimizedCustomers[i - 1].city,
              to: i === fullPath.length - 2 ? 'Base' : optimizedCustomers[i].name || optimizedCustomers[i].city,
              distance_km: legDistance.distance_km,
              duration_minutes: legDistance.duration_minutes,
              distance_text: legDistance.distance_text,
              duration_text: legDistance.duration_text
            });
            totalDistanceKm += legDistance.distance_km || 0;
            totalTravelMinutes += legDistance.duration_minutes || 0;
          } else {
            console.warn(`[CostCalculator] Invalid distance result for leg ${i}, skipping`);
          }
        } catch (legError) {
          console.warn(`[CostCalculator] Error calculating distance for leg ${i}:`, legError.message);
          // Continue with other legs instead of failing completely
          if (i === 0) {
            // If first leg fails, mark driving as not possible
            drivingPossible = false;
            drivingError = legError.message;
            break;
          }
        }
      }
    } catch (error) {
      console.log(`[CostCalculator] Driving route calculation failed: ${error.message}`);
      drivingPossible = false;
      drivingError = error.message.includes('ZERO_RESULTS') 
        ? 'No driving route available (destination across water or unreachable by road)'
        : error.message;
    }

    // 4. Calculate total work hours
    const totalWorkHours = optimizedCustomers.reduce((sum, c) => sum + (parseFloat(c.work_hours) || 0), 0);
    const totalTravelHours = drivingPossible ? (totalTravelMinutes / 60) : 0;
    const totalTripHours = totalWorkHours + totalTravelHours;

    // 5. Work day calculation: 8h daily (40-hour work week) or from billing settings
    const maxDailyHours = billing_settings?.maxDailyHours || 8;

    // Helper function to calculate car travel days considering arrival time and customer work hours
    const calculateCarTravelDays = (startTime, travelHours, workHours, customerWorkHoursStart = 8, customerWorkHoursEnd = 16, minWorkTime = 0.5) => {
      // Parse start time (format: "HH:MM" or number of hours from midnight)
      let startHour = 8; // Default 8:00
      if (typeof startTime === 'string' && startTime.includes(':')) {
        const [h, m] = startTime.split(':').map(Number);
        startHour = h + m / 60;
      } else if (typeof startTime === 'number') {
        startHour = startTime;
      }

      // Calculate arrival time
      const arrivalHour = startHour + travelHours;
      const arrivalTime = arrivalHour;

      // Check if work can start on Day 1
      // Work can start if: arrival_time + setup_time <= customer_work_hours_end
      const canStartWorkDay1 = (arrivalTime + minWorkTime) <= customerWorkHoursEnd;

      if (canStartWorkDay1 && workHours > 0) {
        // Calculate available work time on Day 1
        const workStartTime = Math.max(arrivalTime + minWorkTime, customerWorkHoursStart);
        const availableWorkHoursDay1 = Math.max(0, customerWorkHoursEnd - workStartTime);
        const remainingWorkHours = Math.max(0, workHours - availableWorkHoursDay1);

        if (remainingWorkHours <= 0) {
          // All work can be done on Day 1, but need to check if return is possible same day
          // If arrival + work + return travel <= end of day, it's 1 day
          // Otherwise, it's 2 days (Day 1: travel + work, Day 2: return)
          const totalDay1Hours = travelHours + workHours;
          // If total exceeds reasonable day length (e.g., 12 hours), need 2 days
          return totalDay1Hours <= 12 ? 1 : 2;
        } else {
          // Need additional days for remaining work
          const additionalDays = Math.ceil(remainingWorkHours / (customerWorkHoursEnd - customerWorkHoursStart));
          return 1 + additionalDays; // Day 1 (travel + partial work) + work days + return day
        }
      } else {
        // Work starts Day 2
        const workDaysNeeded = Math.ceil(workHours / (customerWorkHoursEnd - customerWorkHoursStart));
        // Day 1: Travel, Days 2-N: Work, Last Day: Return
        return 1 + workDaysNeeded; // At least 2 days (travel + work + return)
      }
    };

    // Road Days Calculation - Improved logic considering arrival time
    const defaultStartTime = billing_settings?.defaultStartTime || '8:00';
    const customerWorkHoursStart = billing_settings?.customerWorkHoursStart || 8;
    const customerWorkHoursEnd = billing_settings?.customerWorkHoursEnd || 16;
    const minWorkTime = billing_settings?.minWorkTime || 0.5; // Minimum time to start work after arrival

    const road_days_required = calculateCarTravelDays(
      defaultStartTime,
      totalTravelHours,
      totalWorkHours,
      customerWorkHoursStart,
      customerWorkHoursEnd,
      minWorkTime
    );

    // 6. Get rates (using the first customer's country for simplicity, or default to DEU)
    const primaryCountry = optimizedCustomers[0]?.country || 'DEU';
    const primaryCity = optimizedCustomers[0]?.city;
    let rates;
    try {
      rates = await this.getTravelRates(primaryCountry, primaryCity);
    } catch (ratesError) {
      console.error('[CostCalculator] Error getting travel rates:', ratesError);
      // Use default rates as fallback instead of crashing
      console.warn(`[CostCalculator] Using default rates for ${primaryCountry} due to error`);
      rates = {
        daily_allowance_8h: 50,
        daily_allowance_24h: 100,
        hotel_rate_max: 150,
        work_hour_rate: 98,
        travel_hour_rate: 98,
        country_name: primaryCountry,
        city_name: primaryCity
      };
    }

    // Apply billing overrides if provided
    if (billing_settings) {
      if (billing_settings.workingHourRate) rates.work_hour_rate = billing_settings.workingHourRate;
      if (billing_settings.travelHourRate) rates.travel_hour_rate = billing_settings.travelHourRate;
      if (billing_settings.kmRateOwnCar) rates.mileage_rate = billing_settings.kmRateOwnCar;
    }

    // 7. Calculate costs
    const arbeitszeit_total = Math.round(totalWorkHours * rates.work_hour_rate * 100) / 100;
    const reisezeit_total = Math.round(totalTravelHours * rates.travel_hour_rate * 100) / 100;
    const entfernung_total = Math.round(totalDistanceKm * rates.mileage_rate * 100) / 100;

    // 8. Daily allowances (German Tax Law Model) - ROAD
    let tagesspesen_24h_total = 0;
    let tagesspesen_8h_total = 0;
    const allowance_details = [];

    // Removed meals_provided reduction logic
    const daily_reduction = 0;

    // Helper to calculate allowances
    const calculateAllowances = (days, hours) => {
      let t24 = 0;
      let t8 = 0;
      const details = [];

      if (days === 1) {
        if (hours > 8) {
          const day_allowance = rates.daily_allowance_8h - daily_reduction;
          t8 = Math.max(0, day_allowance);
          details.push({ day: 'Day 1 (Single Day)', rate: rates.daily_allowance_8h, reduction: daily_reduction, final: t8, type: '8h' });
        }
      } else if (days > 1) {
        // Day 1: Departure day
        const dep_allowance = rates.daily_allowance_8h - daily_reduction;
        const dep_final = Math.max(0, dep_allowance);
        t8 += dep_final;
        details.push({ day: 'Day 1 (Departure)', rate: rates.daily_allowance_8h, reduction: daily_reduction, final: dep_final, type: '8h' });

        // Intermediate full days
        const intermediateDays = days - 2;
        if (intermediateDays > 0) {
          const full_day_allowance = rates.daily_allowance_24h - daily_reduction;
          const full_day_final = Math.max(0, full_day_allowance);
          t24 += intermediateDays * full_day_final;
          details.push({ day: `Days 2-${days - 1} (${intermediateDays} Full Days)`, rate: rates.daily_allowance_24h, reduction: daily_reduction, final: intermediateDays * full_day_final, type: '24h', count: intermediateDays });
        }

        // Last Day: Return day
        const ret_allowance = rates.daily_allowance_8h - daily_reduction;
        const ret_final = Math.max(0, ret_allowance);
        t8 += ret_final;
        details.push({ day: `Day ${days} (Return)`, rate: rates.daily_allowance_8h, reduction: daily_reduction, final: ret_final, type: '8h' });
      }
      return { t24, t8, details };
    };

    const roadAllowances = calculateAllowances(road_days_required, totalTripHours);
    tagesspesen_24h_total = Math.round(roadAllowances.t24 * 100) / 100;
    tagesspesen_8h_total = Math.round(roadAllowances.t8 * 100) / 100;

    // 9. Hotel nights: road_days_required - 1
    const road_hotelNights = Math.max(0, road_days_required - 1);
    const hotel_total = Math.round(road_hotelNights * rates.hotel_rate * 100) / 100;

    // 10. Fuel Cost Calculation (CAR_WORKFLOW.md Phase 3)
    // Fuel consumption: 7 liters per 100km (default, or from technician settings)
    // Fuel rate: 2.00 €/liter (or from billing settings)
    const fuelConsumptionRate = technician_settings?.fuelConsumptionRate || 7; // L/100km
    const fuelRate = billing_settings?.fuelRate || 2.00; // €/liter
    const fuelConsumptionLiters = (totalDistanceKm / 100) * fuelConsumptionRate;
    const fuel_cost = Math.round(fuelConsumptionLiters * fuelRate * 100) / 100;

    // 11. Road Option Calculation
    // We need to calculate tolls for the FULL route: Base -> C1 -> C2 ... -> Base
    const road_toll_info = await require('./distance.service').calculateRouteWithTolls(
      engineer_location,
      engineer_location,
      optimizedCustomers.map(c => c.coordinates || { address: `${c.city}, ${c.country}` })
    );
    const road_toll_cost = road_toll_info.toll_cost || 0;
    const road_toll_details = road_toll_info.toll_details || [];
    const toll_source = road_toll_info.toll_source || 'unknown';
    
    // Komplette RK (Complete Travel Costs) = Travel Time + Mileage + Daily Allowances + Hotel + Tolls
    // Note: Fuel cost is NOT included here as it's already covered by the mileage reimbursement (€0.88/km)
    const road_komplette_rk = Math.round((
      reisezeit_total + 
      entfernung_total + 
      tagesspesen_24h_total + 
      tagesspesen_8h_total + 
      hotel_total + 
      road_toll_cost
    ) * 100) / 100;
    
    // Total Quotation = Travel Costs + Work Time Costs
    const road_total_quotation = Math.round((arbeitszeit_total + road_komplette_rk) * 100) / 100;

    // Build road_option only if driving is possible
    let road_option = null;
    const MAX_DRIVING_HOURS = 15;
    
    if (drivingPossible) {
      road_option = {
        type: 'road',
        total_cost: road_total_quotation,
        travel_cost: road_komplette_rk,
        distance_km: totalDistanceKm,
        duration_hours: totalTravelHours,
        toll_cost: road_toll_cost,
        fuel_cost: fuel_cost,
        fuel_consumption_liters: Math.round(fuelConsumptionLiters * 100) / 100,
        fuel_rate: fuelRate,
        fuel_consumption_rate: fuelConsumptionRate,
        days_required: road_days_required,
        hotel_nights: road_hotelNights,
        // Detailed breakdown for explanation
        breakdown: {
          travel_time: {
            hours: totalTravelHours,
            rate: rates.travel_hour_rate,
            cost: reisezeit_total,
            explanation: `You spend ${formatHoursToTime(totalTravelHours)} traveling. Each hour is paid at €${rates.travel_hour_rate.toFixed(2)} per hour.`
          },
          mileage: {
            km: totalDistanceKm,
            rate: rates.mileage_rate,
            cost: entfernung_total,
            explanation: `You drive ${totalDistanceKm.toFixed(1)} kilometers. You get reimbursed €${rates.mileage_rate.toFixed(2)} for each kilometer you drive (fuel cost is included in this reimbursement).`
          },
          tolls: {
            cost: road_toll_cost,
            details: road_toll_details,
            source: toll_source,
            explanation: road_toll_cost > 0 
              ? `You need to pay €${road_toll_cost.toFixed(2)} for toll roads on your route${road_toll_details.length > 0 ? ` (${road_toll_details.length} toll${road_toll_details.length !== 1 ? 's' : ''} identified)` : ' (estimated total)'}.`
              : `No toll roads on your route - no extra cost.`
          },
          daily_allowances: {
            days_24h: roadAllowances.details.filter(d => d.type === '24h').reduce((sum, d) => sum + (d.count || 1), 0),
            days_8h: roadAllowances.details.filter(d => d.type === '8h').length,
            rate_24h: rates.daily_allowance_24h,
            rate_8h: rates.daily_allowance_8h,
            cost_24h: tagesspesen_24h_total,
            cost_8h: tagesspesen_8h_total,
            total: Math.round((tagesspesen_24h_total + tagesspesen_8h_total) * 100) / 100,
            explanation: roadAllowances.details.length > 0
              ? `Daily meal allowances: ${roadAllowances.details.map(d => `${d.day} = €${d.final.toFixed(2)}`).join(', ')}. Total: €${Math.round((tagesspesen_24h_total + tagesspesen_8h_total) * 100) / 100}`
              : `No daily allowances needed for this trip.`
          },
          hotel: {
            nights: road_hotelNights,
            rate: rates.hotel_rate,
            cost: hotel_total,
            explanation: road_hotelNights > 0
              ? `You need ${road_hotelNights} hotel night${road_hotelNights > 1 ? 's' : ''} because the trip takes more than one day. Each night costs €${rates.hotel_rate.toFixed(2)}.`
              : `No hotel needed - you can return home the same day.`
          }
        }
      };
      
      // RULE: If driving time exceeds 15 hours one-way, hide road option (impractical)
      if (totalTravelHours > MAX_DRIVING_HOURS) {
        console.log(`[CostCalculator] Driving time ${totalTravelHours.toFixed(1)}h exceeds ${MAX_DRIVING_HOURS}h limit - hiding road option`);
        road_option = null;
      }
    } else {
      console.log(`[CostCalculator] Driving not possible: ${drivingError}`);
    }
    
    // Alias for compatibility
    let practical_road_option = road_option;

    // 11. Flight Option Calculation
    // For multi-customer trips: Base → First Customer (flight), then ground travel between customers, then Last Customer → Base (flight)
    // For single customer: Round-trip flight Base ↔ Customer
    // RULE: Skip flight search if driving time is less than 4 hours (240 minutes), unless driving is not possible
    let flight_option = null;
    try {
      const isMultiCustomer = optimizedCustomers.length > 1;
      const firstCustomer = optimizedCustomers[0];
      const lastCustomer = optimizedCustomers[optimizedCustomers.length - 1];

      // Determine driving time - if driving is not possible, force flight search
      let drivingTimeHours = Infinity; // Default to very high to force flight search
      const DRIVING_TIME_THRESHOLD_HOURS = 4; // 4 hours threshold
      
      if (drivingPossible && totalTravelHours > 0) {
        // Use already calculated total travel hours
        drivingTimeHours = totalTravelHours / 2; // Approximate one-way time
      } else {
        // Driving is not possible (e.g., across water) - always search for flights
        console.log('[CostCalculator] Driving not possible, forcing flight search');
        drivingTimeHours = Infinity;
      }

      if (drivingTimeHours < DRIVING_TIME_THRESHOLD_HOURS && !selected_flight && drivingPossible) {
        console.log(`[CostCalculator] Skipping flight search: Driving time (${drivingTimeHours.toFixed(2)}h) is less than ${DRIVING_TIME_THRESHOLD_HOURS}h threshold`);
        // Still set flight_option to null (already null), but skip all flight search logic
        // Only proceed if a flight was explicitly selected by the user
        if (!selected_flight) {
          // No flight selected and driving time is short - skip flight option entirely
          flight_option = null;
        } else {
          // User explicitly selected a flight, so we'll still calculate it even if driving is short
          console.log('[CostCalculator] Flight was explicitly selected, calculating flight option despite short driving time');
        }
      }

      // Only proceed with flight search if:
      // 1. Driving time is >= 4 hours, OR
      // 2. A flight was explicitly selected by the user, OR
      // 3. Driving is not possible (drivingPossible = false)
      if (drivingTimeHours < DRIVING_TIME_THRESHOLD_HOURS && !selected_flight && drivingPossible) {
        // Skip flight search - return early with flight_option = null
        console.log(`[CostCalculator] Flight option skipped: ${drivingTimeHours.toFixed(2)}h drive is faster than flying`);
      } else {

      // Estimate flight travel time for return date calculation
      // Use technician settings or reasonable defaults for door-to-door travel
      const timeToAirport = technician_settings?.timeToAirport || 45; // minutes
      const securityBoarding = travel_times?.securityBoarding || 120;
      const deboardingLuggage = travel_times?.deboardingLuggage || 45;
      const airportToDestination = travel_times?.airportToDestination || 60;
      const estimatedFlightDuration = 120; // Assume ~2 hours average flight time

      // Calculate ground travel time between customers (for multi-customer trips)
      let groundTravelBetweenCustomers = 0; // minutes
      let groundDistanceBetweenCustomers = 0; // km
      if (isMultiCustomer) {
        // Calculate total ground travel between all customers
        for (let i = 0; i < optimizedCustomers.length - 1; i++) {
          const legDistance = await require('./distance.service').calculateDistance(
            optimizedCustomers[i].coordinates,
            optimizedCustomers[i + 1].coordinates
          );
          groundTravelBetweenCustomers += legDistance.duration_minutes;
          groundDistanceBetweenCustomers += legDistance.distance_km;
        }
      }

      // Round-trip door-to-door time in hours
      // Outbound: Base → Airport → First Customer
      // Ground: Between customers (if multi-customer)
      // Return: Last Customer → Airport → Base
      const estimatedFlightTravelHours = (
        (timeToAirport + securityBoarding + estimatedFlightDuration + deboardingLuggage + airportToDestination) * 2 + // Flights
        groundTravelBetweenCustomers // Ground travel between customers
      ) / 60;

      const estimatedFlightTotalHours = totalWorkHours + estimatedFlightTravelHours;
      const estimatedFlightDays = Math.ceil(estimatedFlightTotalHours / maxDailyHours);

      // Calculate return date based on estimated flight days
      const returnDate = new Date(date);
      returnDate.setDate(returnDate.getDate() + (estimatedFlightDays - 1));
      const returnDateStr = returnDate.toISOString().split('T')[0];

      let outboundFlight = null;
      let returnFlight = null;
      let outboundFlightResults = null;
      let returnFlightResults = null;
      let rental = selected_rental_car;

      // Handle segment_flights for multi-customer trips (one-way flights per segment)
      if (segment_flights && Object.keys(segment_flights).length > 0 && isMultiCustomer) {
        console.log('[CostCalculator] Using segment flights for multi-customer trip');
        console.log('[CostCalculator] Segment flights:', JSON.stringify(segment_flights, null, 2));
        
        // Calculate total flight cost from all segments
        let totalSegmentFlightCost = 0;
        let totalFlightDuration = 0;
        const segmentDetails = [];
        
        for (const [segmentIndex, segmentData] of Object.entries(segment_flights)) {
          if (segmentData?.mode === 'fly' && segmentData?.flight) {
            const flight = segmentData.flight;
            const flightPrice = flight.price || flight.total_price || 0;
            const flightDuration = flight.outbound?.duration_minutes || flight.duration_minutes || 90;
            
            totalSegmentFlightCost += flightPrice;
            totalFlightDuration += flightDuration;
            
            segmentDetails.push({
              segment: parseInt(segmentIndex),
              mode: 'fly',
              price: flightPrice,
              duration_minutes: flightDuration,
              routing: flight.outbound?.routing || flight.routing || 'Unknown'
            });
          } else if (segmentData?.mode === 'drive') {
            segmentDetails.push({
              segment: parseInt(segmentIndex),
              mode: 'drive',
              price: 0
            });
          }
        }
        
        console.log('[CostCalculator] Total segment flight cost:', totalSegmentFlightCost);
        console.log('[CostCalculator] Segment details:', segmentDetails);
        
        // Create synthetic outbound and return flights from segment data
        // For multi-customer: First segment is outbound, last segment is return
        const firstFlightSegment = segmentDetails.find(s => s.mode === 'fly');
        const lastFlightSegment = [...segmentDetails].reverse().find(s => s.mode === 'fly');
        
        if (firstFlightSegment) {
          outboundFlight = {
            price: firstFlightSegment.price,
            total_price: firstFlightSegment.price,
            duration_minutes: firstFlightSegment.duration_minutes,
            routing: firstFlightSegment.routing,
            _is_segment: true
          };
        }
        
        if (lastFlightSegment && lastFlightSegment !== firstFlightSegment) {
          returnFlight = {
            price: lastFlightSegment.price,
            total_price: lastFlightSegment.price,
            duration_minutes: lastFlightSegment.duration_minutes,
            routing: lastFlightSegment.routing,
            _is_segment: true
          };
        } else if (firstFlightSegment) {
          // If only one flight segment, use it for both
          returnFlight = outboundFlight;
        }
        
        // Store segment details for breakdown
        if (outboundFlight) {
          outboundFlight._segment_details = segmentDetails;
          outboundFlight._total_segment_cost = totalSegmentFlightCost;
        }
      }
      // If a flight is already selected, use it directly (for single customer, it's a round-trip)
      else if (selected_flight) {
        console.log('[CostCalculator] Using provided selected flight:', selected_flight.id || selected_flight.flight_number || 'unknown');
        console.log('[CostCalculator] Selected flight object:', JSON.stringify({
          id: selected_flight.id,
          price: selected_flight.price,
          total_price: selected_flight.total_price,
          has_outbound: !!selected_flight.outbound,
          has_return: !!selected_flight.return,
          source: selected_flight.source
        }, null, 2));
        
        // Check if selected_flight has price information
        const hasPrice = selected_flight.price > 0 || selected_flight.total_price > 0;
        if (!hasPrice) {
          console.warn('[CostCalculator] WARNING: selected_flight provided but has no price! Will use median_flight instead.');
        }
        
        if (isMultiCustomer) {
          // For multi-customer, selected_flight should have outbound and return separately
          // For now, assume it's structured as round-trip and split it
          outboundFlight = selected_flight.outbound || selected_flight;
          returnFlight = selected_flight.return || selected_flight;
        } else {
          // Single customer: round-trip
          outboundFlight = selected_flight.outbound || selected_flight;
          returnFlight = selected_flight.return || selected_flight;
        }
        
        // If outbound/return don't have prices, use parent price (for round-trip, price is at top level)
        const parentPrice = selected_flight.price || selected_flight.total_price || 0;
        const pricePerLeg = parentPrice / 2; // Split round-trip price between outbound and return
        
        // Ensure outboundFlight and returnFlight have all necessary properties
        if (!outboundFlight.price && !outboundFlight.total_price) {
          outboundFlight.price = pricePerLeg;
          outboundFlight.total_price = pricePerLeg;
          outboundFlight._parent_price = parentPrice;
        }
        if (!returnFlight.price && !returnFlight.total_price) {
          returnFlight.price = pricePerLeg;
          returnFlight.total_price = pricePerLeg;
          returnFlight._parent_price = parentPrice;
        }
        
        // Ensure duration_minutes are available (fallback to parent if needed)
        if (!outboundFlight.duration_minutes && selected_flight.outbound?.duration_minutes) {
          outboundFlight.duration_minutes = selected_flight.outbound.duration_minutes;
        }
        if (!returnFlight.duration_minutes && selected_flight.return?.duration_minutes) {
          returnFlight.duration_minutes = selected_flight.return.duration_minutes;
        }
        
        // Ensure routing is available
        if (!outboundFlight.routing && selected_flight.outbound?.routing) {
          outboundFlight.routing = selected_flight.outbound.routing;
        }
        if (!returnFlight.routing && selected_flight.return?.routing) {
          returnFlight.routing = selected_flight.return.routing;
        }
        
        console.log('[CostCalculator] Extracted outbound price:', outboundFlight?.price, 'total_price:', outboundFlight?.total_price, '_parent_price:', outboundFlight?._parent_price, 'duration:', outboundFlight?.duration_minutes);
        console.log('[CostCalculator] Extracted return price:', returnFlight?.price, 'total_price:', returnFlight?.total_price, '_parent_price:', returnFlight?._parent_price, 'duration:', returnFlight?.duration_minutes);
        console.log('[CostCalculator] Parent flight price:', parentPrice, 'split per leg:', pricePerLeg);
        
        // Try to get rental car options if not already selected
        if (!rental) {
          try {
            // Use cached airports from technician settings if available
            const cachedOriginAirports = technician_settings?.airports || null;
            const cachedDestAirports = null;
            
            const tempResults = await require('./flight.service').searchFlights(
              engineer_location,
              firstCustomer.coordinates,
              date,
              returnDateStr,
              5, // limit
              cachedOriginAirports,
              cachedDestAirports
            );
            if (tempResults.success && tempResults.rental_car_options && tempResults.rental_car_options.length > 0) {
              const carPrices = tempResults.rental_car_options.map(c => c.price_per_day).sort((a, b) => a - b);
              const medianPrice = carPrices[Math.floor(carPrices.length / 2)];
              rental = tempResults.rental_car_options.find(c => c.price_per_day === medianPrice) || tempResults.rental_car_options[0];
            }
          } catch (e) {
            console.warn('Could not fetch rental car options for selected flight:', e.message);
          }
        }
      } else {
        // No flight selected, search for options
        if (isMultiCustomer) {
          // Multi-customer: Search for two separate flights
          console.log(`Searching MULTI-CUSTOMER flights: Outbound ${date} (Base → ${firstCustomer.city || 'First Customer'}), Return ${returnDateStr} (${lastCustomer.city || 'Last Customer'} → Base)`);
          
          // Use cached airports from technician settings if available
          const cachedOriginAirports = technician_settings?.airports || null;
          const cachedDestAirports = null; // Customer airports not cached yet
          
          // Outbound flight: Base → First Customer
          outboundFlightResults = await require('./flight.service').searchFlights(
            engineer_location,
            firstCustomer.coordinates,
            date,
            null, // No return date for outbound-only search
            5, // limit
            cachedOriginAirports, // Use cached technician airports
            cachedDestAirports
          );

          // Return flight: Last Customer → Base (use cached origin airports for return)
          returnFlightResults = await require('./flight.service').searchFlights(
            lastCustomer.coordinates,
            engineer_location,
            returnDateStr,
            null, // No return date for return-only search
            5, // limit
            cachedDestAirports, // Customer airports (not cached yet)
            cachedOriginAirports // Use cached technician airports for return
          );

          if (outboundFlightResults.success && outboundFlightResults.options.length > 0) {
            const outboundFlightOption = outboundFlightResults.median_flight || outboundFlightResults.options[0];
            outboundFlight = outboundFlightOption?.outbound || outboundFlightOption;
            
            // Store parent flight price if available
            if (outboundFlightOption?.price && !outboundFlight.price) {
              outboundFlight._parent_price = outboundFlightOption.price;
            }
          }

          if (returnFlightResults.success && returnFlightResults.options.length > 0) {
            const returnFlightOption = returnFlightResults.median_flight || returnFlightResults.options[0];
            returnFlight = returnFlightOption?.return || returnFlightOption;
            
            // Store parent flight price if available
            if (returnFlightOption?.price && !returnFlight.price) {
              returnFlight._parent_price = returnFlightOption.price;
            }
          }

          // Get rental car options from outbound flight results
          if (!rental && outboundFlightResults.rental_car_options && outboundFlightResults.rental_car_options.length > 0) {
            const carPrices = outboundFlightResults.rental_car_options.map(c => c.price_per_day).sort((a, b) => a - b);
            const medianPrice = carPrices[Math.floor(carPrices.length / 2)];
            rental = outboundFlightResults.rental_car_options.find(c => c.price_per_day === medianPrice) || outboundFlightResults.rental_car_options[0];
          }
        } else {
          // Single customer: Round-trip flight
          console.log(`Searching ROUND-TRIP flights: ${date} to ${returnDateStr} (${estimatedFlightDays} days estimated)`);

          // Use cached airports from technician settings if available
          const cachedOriginAirports = technician_settings?.airports || null;
          const cachedDestAirports = null; // Customer airports not cached yet
          
          outboundFlightResults = await require('./flight.service').searchFlights(
            engineer_location,
            firstCustomer.coordinates,
            date,
            returnDateStr,
            5, // limit
            cachedOriginAirports, // Use cached technician airports
            cachedDestAirports
          );

          if (outboundFlightResults.success && outboundFlightResults.options.length > 0) {
            const roundTripFlight = outboundFlightResults.median_flight || outboundFlightResults.options[0];
            outboundFlight = roundTripFlight?.outbound || roundTripFlight;
            returnFlight = roundTripFlight?.return || roundTripFlight;
            
            // Store the parent flight price for cost calculation
            // The price is on the parent flight object, not on outbound/return segments
            const parentPrice = roundTripFlight?.price || 0;
            console.log('[CostCalculator] Round-trip flight price from median_flight:', parentPrice);
            
            if (parentPrice > 0 && !outboundFlight.price && !returnFlight.price) {
              // If outbound/return don't have prices, store parent price for later use
              outboundFlight._parent_price = parentPrice;
              returnFlight._parent_price = parentPrice;
              console.log('[CostCalculator] Stored _parent_price on outbound/return:', parentPrice);
            } else {
              console.log('[CostCalculator] Parent price not stored - outbound.price:', outboundFlight?.price, 'return.price:', returnFlight?.price, 'parentPrice:', parentPrice);
            }

            // Calculate median rental car if not selected
            if (!rental && outboundFlightResults.rental_car_options && outboundFlightResults.rental_car_options.length > 0) {
              const carPrices = outboundFlightResults.rental_car_options.map(c => c.price_per_day).sort((a, b) => a - b);
              const medianPrice = carPrices[Math.floor(carPrices.length / 2)];
              rental = outboundFlightResults.rental_car_options.find(c => c.price_per_day === medianPrice) || outboundFlightResults.rental_car_options[0];
            }
          }
        }
      }

      // If we have flights (either selected or from search), calculate the flight option
      if (outboundFlight && returnFlight) {
        console.log('Using flights - Outbound:', outboundFlight?.id || outboundFlight?.flight_number, 'Return:', returnFlight?.id || returnFlight?.flight_number);

        // Dynamic Travel Times from settings or defaults
        const timeToAirport = technician_settings?.timeToAirport || 45;
        const securityBoarding = travel_times?.securityBoarding || 120;
        const deboardingLuggage = travel_times?.deboardingLuggage || 45;
        const airportToDestination = travel_times?.airportToDestination || 60;

        // Recalculate travel metrics based on SELECTED flights
        const outboundDuration = outboundFlight?.duration_minutes || selected_flight?.outbound?.duration_minutes || 105;
        const returnDuration = returnFlight?.duration_minutes || selected_flight?.return?.duration_minutes || 105;

        console.log('[CostCalculator] Flight durations - outbound:', outboundDuration, 'return:', returnDuration);
        console.log('[CostCalculator] Outbound flight object:', JSON.stringify({
          duration_minutes: outboundFlight?.duration_minutes,
          routing: outboundFlight?.routing,
          has_price: !!(outboundFlight?.price || outboundFlight?.total_price)
        }, null, 2));

        // Total travel time includes:
        // - Outbound: Base → Airport → First Customer
        // - Ground travel between customers (if multi-customer)
        // - Return: Last Customer → Airport → Base
        const totalTravelMins = (
          timeToAirport + securityBoarding + outboundDuration + deboardingLuggage + airportToDestination + // outbound
          groundTravelBetweenCustomers + // ground travel between customers (0 for single customer)
          airportToDestination + deboardingLuggage + returnDuration + securityBoarding + timeToAirport      // return
        );
        const total_flight_travel_hours = Math.round((totalTravelMins / 60) * 100) / 100;
        const flight_travel_time_cost = Math.round(total_flight_travel_hours * rates.travel_hour_rate * 100) / 100;
        
        console.log('[CostCalculator] Calculated total_flight_travel_hours:', total_flight_travel_hours, 'minutes:', totalTravelMins);

        // Time breakdown using actual flight durations
        const time_breakdown = {
          to_airport: timeToAirport * 2,
          security_boarding: securityBoarding * 2,
          flight_duration: outboundDuration + returnDuration, // Combined for display
          outbound_flight: outboundDuration,
          return_flight: returnDuration,
          deboarding_luggage: deboardingLuggage * 2,
          to_destination: airportToDestination * 2,
          ground_travel_between_customers: groundTravelBetweenCustomers,
          routing: outboundFlight?.routing || returnFlight?.routing || 'Direct'
        };

        // Flight Days Calculation - Improved logic considering actual flight departure/arrival times
        const calculateFlightTravelDays = (tripDate, outboundFlight, returnFlight, workHours, groundTransportTime, airportProcessingAfter) => {
          // Parse flight departure/arrival times
          // Flight times are typically in format "HH:MM" or ISO datetime string
          let outboundDepartureHour = 10; // Default 10:00 if not available
          let outboundArrivalHour = 12; // Default 12:00 if not available
          
          if (outboundFlight?.departure_time) {
            const depTime = outboundFlight.departure_time;
            if (typeof depTime === 'string') {
              if (depTime.includes(':')) {
                const [h, m] = depTime.split(':').map(Number);
                outboundDepartureHour = h + m / 60;
              } else if (depTime.includes('T')) {
                // ISO datetime
                const date = new Date(depTime);
                outboundDepartureHour = date.getHours() + date.getMinutes() / 60;
              }
            }
          }
          
          if (outboundFlight?.arrival_time) {
            const arrTime = outboundFlight.arrival_time;
            if (typeof arrTime === 'string') {
              if (arrTime.includes(':')) {
                const [h, m] = arrTime.split(':').map(Number);
                outboundArrivalHour = h + m / 60;
              } else if (arrTime.includes('T')) {
                const date = new Date(arrTime);
                outboundArrivalHour = date.getHours() + date.getMinutes() / 60;
              }
            }
          } else if (outboundFlight?.duration_minutes) {
            // Calculate arrival from departure + duration
            outboundArrivalHour = outboundDepartureHour + (outboundFlight.duration_minutes / 60);
          }

          // Calculate customer arrival time
          // Airport arrival + processing + ground transport
          const customerArrivalHour = outboundArrivalHour + (airportProcessingAfter / 60) + (groundTransportTime / 60);
          
          // Check if work can start on Day 1
          // Use billing_settings from outer scope or defaults
          const customerWorkHoursStart = (typeof billing_settings !== 'undefined' && billing_settings?.customerWorkHoursStart) || 8;
          const customerWorkHoursEnd = (typeof billing_settings !== 'undefined' && billing_settings?.customerWorkHoursEnd) || 16;
          const minWorkTime = (typeof billing_settings !== 'undefined' && billing_settings?.minWorkTime) || 0.5;
          
          const canStartWorkDay1 = (customerArrivalHour + minWorkTime) <= customerWorkHoursEnd;

          if (canStartWorkDay1 && workHours > 0) {
            // Calculate available work time on Day 1
            const workStartTime = Math.max(customerArrivalHour + minWorkTime, customerWorkHoursStart);
            const availableWorkHoursDay1 = Math.max(0, customerWorkHoursEnd - workStartTime);
            const remainingWorkHours = Math.max(0, workHours - availableWorkHoursDay1);

            if (remainingWorkHours <= 0) {
              // All work can be done on Day 1
              // Check if return flight is possible same day
              // Need to check return flight departure time
              let returnDepartureHour = customerWorkHoursEnd + 1; // Assume return flight after work
              if (returnFlight?.departure_time) {
                const retTime = returnFlight.departure_time;
                if (typeof retTime === 'string') {
                  if (retTime.includes(':')) {
                    const [h, m] = retTime.split(':').map(Number);
                    returnDepartureHour = h + m / 60;
                  } else if (retTime.includes('T')) {
                    const date = new Date(retTime);
                    returnDepartureHour = date.getHours() + date.getMinutes() / 60;
                  }
                }
              }
              
              // If return flight is same day and after work completion, it's 1 day
              // Otherwise, need 2 days
              const workEndTime = workStartTime + workHours;
              const latestDepartureFromCustomer = returnDepartureHour - (airportProcessingAfter / 60) - (groundTransportTime / 60);
              
              return (workEndTime <= latestDepartureFromCustomer) ? 1 : 2;
            } else {
              // Need additional days for remaining work
              const additionalDays = Math.ceil(remainingWorkHours / (customerWorkHoursEnd - customerWorkHoursStart));
              return 1 + additionalDays;
            }
          } else {
            // Work starts Day 2
            const workDaysNeeded = Math.ceil(workHours / (customerWorkHoursEnd - customerWorkHoursStart));
            return 1 + workDaysNeeded; // At least 2 days (travel + work + return)
          }
        };

        const flight_days_required = calculateFlightTravelDays(
          date,
          outboundFlight,
          returnFlight,
          totalWorkHours,
          airportToDestination,
          deboardingLuggage
        );
        const flight_hotelNights = Math.max(0, flight_days_required - 1);

        // Flight Allowances
        const flightAllowances = calculateAllowances(flight_days_required, total_flight_travel_hours);
        const flight_tagesspesen_24h = Math.round(flightAllowances.t24 * 100) / 100;
        const flight_tagesspesen_8h = Math.round(flightAllowances.t8 * 100) / 100;
        const flight_hotel_total = Math.round(flight_hotelNights * rates.hotel_rate * 100) / 100;

        // Flight costs: outbound + return (or combined round-trip price)
        // Priority: Use segment total if available, then total_price, otherwise sum individual prices
        let flight_cost = 0;
        
        // Check if using segment flights (multi-customer with individual one-way flights)
        if (outboundFlight?._total_segment_cost && outboundFlight._total_segment_cost > 0) {
          flight_cost = outboundFlight._total_segment_cost;
          console.log('[CostCalculator] Using segment flights total cost:', flight_cost);
          console.log('[CostCalculator] Segment details:', outboundFlight._segment_details);
        }
        // Check if this is a round-trip ticket with total_price
        else if (selected_flight?.total_price && selected_flight.total_price > 0) {
          // Use the total_price directly for round-trip flights
          flight_cost = selected_flight.total_price;
          console.log('[CostCalculator] Using selected_flight.total_price:', flight_cost);
        } else if (selected_flight?.price && selected_flight.price > 0) {
          // Use selected_flight.price if total_price is not available
          flight_cost = selected_flight.price;
          console.log('[CostCalculator] Using selected_flight.price:', flight_cost);
        } else if (outboundFlight?._parent_price && outboundFlight._parent_price > 0) {
          // Use parent flight price (from median_flight or options[0]) - this is the round-trip price
          flight_cost = outboundFlight._parent_price;
          console.log('[CostCalculator] Using outboundFlight._parent_price (round-trip):', flight_cost);
        } else if (returnFlight?._parent_price && returnFlight._parent_price > 0) {
          // Use return flight parent price as fallback
          flight_cost = returnFlight._parent_price;
          console.log('[CostCalculator] Using returnFlight._parent_price:', flight_cost);
        } else if (outboundFlight?.total_price && outboundFlight.total_price > 0) {
          // Use outbound's total_price if available (round-trip)
          flight_cost = outboundFlight.total_price;
          console.log('[CostCalculator] Using outboundFlight.total_price:', flight_cost);
        } else {
          // Calculate from individual flight prices
          const outboundFlightCost = outboundFlight?.price || (outboundFlight?.total_price ? outboundFlight.total_price / 2 : 0);
          const returnFlightCost = returnFlight?.price || (returnFlight?.total_price ? returnFlight.total_price / 2 : 0);
          flight_cost = outboundFlightCost + returnFlightCost;
          console.log('[CostCalculator] Calculated from individual prices - outbound:', outboundFlightCost, 'return:', returnFlightCost, 'total:', flight_cost);
          
          // Fallback: if both are 0, try to get price from selected_flight
          if (flight_cost === 0 && selected_flight?.price) {
            flight_cost = selected_flight.price;
            console.log('[CostCalculator] Fallback to selected_flight.price:', flight_cost);
          }
        }
        
        console.log('[CostCalculator] Final flight_cost:', flight_cost);
        
        // Rental car cost: covers entire trip duration (from arrival at first customer to departure from last customer)
        const rental_car_cost = flight_days_required * (rental?.price_per_day || 75);

        // Ground transport: use taxi costs or parking from settings if available
        let ground_transport = 90; // Default
        let ground_transport_type = 'Taxi (default)';
        if (technician_settings?.transportToAirport === 'Taxi') {
          ground_transport = (technician_settings.taxiCost || 45) * 2;
          ground_transport_type = 'Taxi (round-trip)';
        } else if (technician_settings?.transportToAirport === 'Car') {
          ground_transport = (technician_settings.parkingCostPerDay || 15) * flight_days_required;
          ground_transport_type = 'Parking';
        }

        // Fuel Cost for Rental Car (FLIGHT_WORKFLOW.md Phase 3.4)
        // For multi-customer: Airport → First Customer + All inter-customer travel + Last Customer → Airport
        // For single customer: Airport → Customer + Customer → Airport (round-trip)
        let rental_car_fuel_cost = 0;
        let rental_car_distance_km = 0;
        try {
          const fuelConsumptionRate = 7; // L/100km (rental car default)
          const fuelRate = billing_settings?.fuelRate || 2.00; // €/liter

          if (isMultiCustomer) {
            // Multi-customer: Calculate airport-to-first-customer + inter-customer travel + last-customer-to-airport
            let totalRentalDistance = 0;

            // Get arrival airport (from outbound flight)
            let arrivalAirport = null;
            if (outboundFlightResults?.destination_airport) {
              arrivalAirport = outboundFlightResults.destination_airport;
            } else if (outboundFlight?.to) {
              try {
                const airportService = require('./airport.service');
                arrivalAirport = await airportService.findNearestAirport({ code: outboundFlight.to });
              } catch (e) {
                console.warn('Could not get arrival airport details:', e.message);
              }
            }

            // Get departure airport (from return flight)
            let departureAirport = null;
            if (returnFlightResults?.origin_airport) {
              departureAirport = returnFlightResults.origin_airport;
            } else if (returnFlight?.from) {
              try {
                const airportService = require('./airport.service');
                departureAirport = await airportService.findNearestAirport({ code: returnFlight.from });
              } catch (e) {
                console.warn('Could not get departure airport details:', e.message);
              }
            }

            // Airport → First Customer
            if (arrivalAirport && (arrivalAirport.lat || arrivalAirport.latitude) && firstCustomer.coordinates) {
              const airportCoords = { lat: arrivalAirport.lat || arrivalAirport.latitude, lng: arrivalAirport.lng || arrivalAirport.longitude };
              const airportToFirst = await require('./distance.service').calculateDistance(airportCoords, firstCustomer.coordinates);
              totalRentalDistance += airportToFirst.distance_km;
            } else {
              // Estimate
              totalRentalDistance += (airportToDestination * 0.8);
            }

            // Inter-customer travel (already calculated above)
            totalRentalDistance += groundDistanceBetweenCustomers;

            // Last Customer → Airport
            if (departureAirport && (departureAirport.lat || departureAirport.latitude) && lastCustomer.coordinates) {
              const airportCoords = { lat: departureAirport.lat || departureAirport.latitude, lng: departureAirport.lng || departureAirport.longitude };
              const lastToAirport = await require('./distance.service').calculateDistance(lastCustomer.coordinates, airportCoords);
              totalRentalDistance += lastToAirport.distance_km;
            } else {
              // Estimate
              totalRentalDistance += (airportToDestination * 0.8);
            }

            rental_car_distance_km = totalRentalDistance;
          } else {
            // Single customer: Airport → Customer → Airport (round-trip)
            let destAirport = null;
            if (outboundFlightResults?.destination_airport) {
              destAirport = outboundFlightResults.destination_airport;
            } else if (outboundFlight?.to) {
              try {
                const airportService = require('./airport.service');
                destAirport = await airportService.findNearestAirport({ code: outboundFlight.to });
              } catch (e) {
                console.warn('Could not get airport details from flight:', e.message);
              }
            }
            
            if (destAirport && (destAirport.lat || destAirport.latitude) && firstCustomer.coordinates) {
              const airportCoords = { lat: destAirport.lat || destAirport.latitude, lng: destAirport.lng || destAirport.longitude };
              const airportToCustomer = await require('./distance.service').calculateDistance(airportCoords, firstCustomer.coordinates);
              rental_car_distance_km = airportToCustomer.distance_km * 2; // Round-trip
            } else {
              // Estimate based on airport-to-destination time
              rental_car_distance_km = (airportToDestination * 2) * 0.8; // Rough estimate: 0.8 km per minute
            }
          }

          // Calculate fuel cost: (distance_km / 100) × 7L/100km × 2.00€/L
          const fuelConsumptionLiters = (rental_car_distance_km / 100) * fuelConsumptionRate;
          rental_car_fuel_cost = Math.round(fuelConsumptionLiters * fuelRate * 100) / 100;
        } catch (e) {
          console.warn('Could not calculate rental car fuel cost:', e.message);
          // Estimate based on airport-to-destination time
          rental_car_distance_km = (airportToDestination * 2) * 0.8;
          const fuelConsumptionRate = 7;
          const fuelRate = billing_settings?.fuelRate || 2.00;
          const fuelConsumptionLiters = (rental_car_distance_km / 100) * fuelConsumptionRate;
          rental_car_fuel_cost = Math.round(fuelConsumptionLiters * fuelRate * 100) / 100;
        }

        // Get excess baggage cost from metadata (only for flights)
        const excessBaggageCost = (tripData.metadata?.excess_baggage?.cost)
          ? Math.round(tripData.metadata.excess_baggage.cost * 100) / 100
          : 0;

        // Komplette RK (Complete Travel Costs) = Travel Time + Flight + Rental Car + Ground Transport + Fuel + Daily Allowances + Hotel + Excess Baggage
        const flight_komplette_rk = Math.round((
          flight_travel_time_cost +
          flight_tagesspesen_24h + 
          flight_tagesspesen_8h + 
          flight_hotel_total +
          flight_cost + 
          rental_car_cost + 
          ground_transport +
          rental_car_fuel_cost +
          excessBaggageCost
        ) * 100) / 100;

        // Total Quotation = Travel Costs + Work Time Costs
        const flight_total_quotation = Math.round((arbeitszeit_total + flight_komplette_rk) * 100) / 100;

        flight_option = {
          type: 'flight',
          total_cost: Math.round(flight_total_quotation * 100) / 100,
          travel_cost: Math.round(flight_komplette_rk * 100) / 100,
          flight_cost,
          is_round_trip: !isMultiCustomer, // Only round-trip for single customer
          is_multi_customer: isMultiCustomer,
          travel_time_cost: flight_travel_time_cost,
          rental_car_cost,
          rental_car_fuel_cost,
          rental_car_distance_km: Math.round(rental_car_distance_km * 100) / 100,
          ground_transport,
          ground_transport_type,
          total_travel_hours: total_flight_travel_hours,
          days_required: flight_days_required,
          hotel_nights: flight_hotelNights,
          hotel_cost: flight_hotel_total,
          allowances_total: Math.round((flight_tagesspesen_24h + flight_tagesspesen_8h) * 100) / 100,
          ue_gepack: excessBaggageCost,
          time_breakdown,
          // Flight details
          departure_date: date,
          return_date: returnDateStr,
          outbound_flight: outboundFlight,
          return_flight: returnFlight,
          rental_details: rental,
          // Statistics (if available from search results)
          statistics: outboundFlightResults?.statistics || returnFlightResults?.statistics || null,
          options_count: (outboundFlightResults?.options?.length || 0) + (returnFlightResults?.options?.length || 0) || (selected_flight ? 1 : 0),
          // Detailed breakdown for explanation
          breakdown: {
            travel_time: {
              hours: total_flight_travel_hours,
              rate: rates.travel_hour_rate,
              cost: flight_travel_time_cost,
              explanation: `You spend ${formatHoursToTime(total_flight_travel_hours)} traveling door-to-door (including airport time, flight, and ground transport). Each hour is paid at €${rates.travel_hour_rate.toFixed(2)} per hour.`
            },
            flight: {
              cost: flight_cost,
              explanation: isMultiCustomer
                ? `Flight tickets cost €${flight_cost.toFixed(2)}. This includes your outbound flight from base to ${firstCustomer.city || 'first customer'} and return flight from ${lastCustomer.city || 'last customer'} to base.`
                : `Round-trip flight ticket costs €${flight_cost.toFixed(2)}. This includes your outbound and return flights${outboundFlight?.routing || returnFlight?.routing ? ` (${outboundFlight?.routing || returnFlight?.routing})` : ''}.`
            },
            rental_car: {
              days: flight_days_required,
              rate_per_day: rental?.price_per_day || 75,
              cost: rental_car_cost,
              explanation: `You need a rental car for ${flight_days_required} day${flight_days_required > 1 ? 's' : ''} at the destination. The rental costs €${(rental?.price_per_day || 75).toFixed(2)} per day.`
            },
            fuel: {
              distance_km: Math.round(rental_car_distance_km * 100) / 100,
              liters: Math.round((rental_car_distance_km / 100) * 7 * 100) / 100,
              rate: billing_settings?.fuelRate || 2.00,
              cost: rental_car_fuel_cost,
              explanation: rental_car_fuel_cost > 0
                ? isMultiCustomer
                  ? `The rental car needs fuel to drive from the airport to all customers and back to the airport (${Math.round(rental_car_distance_km * 100) / 100}km total). Fuel costs €${rental_car_fuel_cost.toFixed(2)}.`
                  : `The rental car needs fuel to drive from the airport to the customer and back (${Math.round(rental_car_distance_km * 100) / 100}km total). Fuel costs €${rental_car_fuel_cost.toFixed(2)}.`
                : `Fuel cost for the rental car is included in the estimate.`
            },
            ground_transport: {
              type: ground_transport_type,
              cost: ground_transport,
              explanation: ground_transport_type.includes('Taxi')
                ? `Taxi to and from the airport costs €${ground_transport.toFixed(2)} (round-trip).`
                : `Parking at the airport costs €${ground_transport.toFixed(2)} for ${flight_days_required} day${flight_days_required > 1 ? 's' : ''}.`
            },
            daily_allowances: {
              days_24h: flightAllowances.details.filter(d => d.type === '24h').reduce((sum, d) => sum + (d.count || 1), 0),
              days_8h: flightAllowances.details.filter(d => d.type === '8h').length,
              rate_24h: rates.daily_allowance_24h,
              rate_8h: rates.daily_allowance_8h,
              cost_24h: flight_tagesspesen_24h,
              cost_8h: flight_tagesspesen_8h,
              total: Math.round((flight_tagesspesen_24h + flight_tagesspesen_8h) * 100) / 100,
              explanation: flightAllowances.details.length > 0
                ? `Daily meal allowances: ${flightAllowances.details.map(d => `${d.day} = €${d.final.toFixed(2)}`).join(', ')}. Total: €${Math.round((flight_tagesspesen_24h + flight_tagesspesen_8h) * 100) / 100}`
                : `No daily allowances needed for this trip.`
            },
            hotel: {
              nights: flight_hotelNights,
              rate: rates.hotel_rate,
              cost: flight_hotel_total,
              explanation: flight_hotelNights > 0
                ? `You need ${flight_hotelNights} hotel night${flight_hotelNights > 1 ? 's' : ''} because the trip takes more than one day. Each night costs €${rates.hotel_rate.toFixed(2)}.`
                : `No hotel needed - you can return home the same day.`
            }
          }
        };
      }
      } // End of else block (flight search only if driving time >= 4h or flight selected)
    } catch (e) {
      console.warn('Flight option calculation failed:', e.message);
    }

    // Calculate trip fees (applied once per trip, not per day)
    const agent_fee = parseFloat(rates.agent_fee) || 0;
    const company_fee = parseFloat(rates.company_fee) || 0;
    const additional_fee_percent = parseFloat(rates.additional_fee_percent) || 0;
    const trip_fixed_fees = agent_fee + company_fee;
    
    // Apply fees to road option (only if practical - under 15 hours)
    if (practical_road_option) {
      const road_base_cost = practical_road_option.total_cost;
      const road_percentage_fee = Math.round((road_base_cost * additional_fee_percent / 100) * 100) / 100;
      practical_road_option.trip_fees = {
        agent_fee,
        company_fee,
        additional_fee_percent,
        additional_fee_amount: road_percentage_fee,
        total_fees: Math.round((trip_fixed_fees + road_percentage_fee) * 100) / 100
      };
      practical_road_option.total_cost_with_fees = Math.round((road_base_cost + practical_road_option.trip_fees.total_fees) * 100) / 100;
    }
    
    // Apply fees to flight option
    if (flight_option) {
      const flight_base_cost = flight_option.total_cost;
      const flight_percentage_fee = Math.round((flight_base_cost * additional_fee_percent / 100) * 100) / 100;
      flight_option.trip_fees = {
        agent_fee,
        company_fee,
        additional_fee_percent,
        additional_fee_amount: flight_percentage_fee,
        total_fees: Math.round((trip_fixed_fees + flight_percentage_fee) * 100) / 100
      };
      flight_option.total_cost_with_fees = Math.round((flight_base_cost + flight_option.trip_fees.total_fees) * 100) / 100;
    }

    // Determine recommendation
    let recommended = 'road';
    if (!practical_road_option) {
      // If road is not practical (>15h), recommend flight if available
      recommended = flight_option ? 'flight' : 'none';
    } else if (flight_option) {
      // Compare costs if both options available
      const roadCost = practical_road_option.total_cost_with_fees || practical_road_option.total_cost;
      const flightCost = flight_option.total_cost_with_fees || flight_option.total_cost;
      recommended = flightCost < roadCost ? 'flight' : 'road';
    }

    // Calculate per-customer cost breakdown if trip_customers data is available
    let per_customer_costs = null;
    if (trip_customers && trip_customers.length > 1) {
      // Create a map for easy lookup
      const customerCostMap = {};
      const customerWorkHoursMap = {};

      trip_customers.forEach(tc => {
        customerCostMap[tc.customer_id] = tc.cost_percentage || (100 / trip_customers.length);
      });

      // Get actual work hours per customer from the customers array
      customers.forEach(c => {
        customerWorkHoursMap[c.customer_id] = c.work_hours || 0;
      });

      // Use recommended option for cost splitting
      const selectedOption = recommended === 'flight' ? flight_option : practical_road_option;

      if (selectedOption) {
        // Calculate individual work costs per customer based on actual hours
        const totalWorkHoursAllCustomers = customers.reduce((sum, c) => sum + (c.work_hours || 0), 0);
        const workHourRate = rates.work_hour_rate || 0;

        per_customer_costs = trip_customers.map(tc => {
          const costPercentage = customerCostMap[tc.customer_id] || 0;
          const individualWorkHours = customerWorkHoursMap[tc.customer_id] || 0;

          // Individual work cost based on actual hours (NOT split by percentage)
          const individualWorkCost = Math.round(individualWorkHours * workHourRate * 100) / 100;

          // Shared costs (travel, allowances, hotel, fees) split by cost_percentage
          const sharedTravelCost = Math.round((selectedOption.travel_cost || 0) * (costPercentage / 100) * 100) / 100;

          // Allowances: flight option uses allowances_total, road option uses breakdown.daily_allowances.total
          const allowancesTotal = selectedOption.allowances_total || selectedOption.breakdown?.daily_allowances?.total || 0;
          const sharedAllowances = Math.round(allowancesTotal * (costPercentage / 100) * 100) / 100;

          // Hotel: flight option uses hotel_cost, road option uses breakdown.hotel.cost
          const hotelTotal = selectedOption.hotel_cost || selectedOption.breakdown?.hotel?.cost || 0;
          const sharedHotel = Math.round(hotelTotal * (costPercentage / 100) * 100) / 100;

          const sharedFees = Math.round(((selectedOption.trip_fees?.total_fees || 0) * (costPercentage / 100)) * 100) / 100;

          // Total allocated cost = individual work + shared costs
          const totalAllocatedCost = Math.round((individualWorkCost + sharedTravelCost + sharedAllowances + sharedHotel + sharedFees) * 100) / 100;

          return {
            customer_id: tc.customer_id,
            customer_name: tc.customer_name || 'Unknown',
            cost_percentage: costPercentage,
            work_hours: individualWorkHours,
            allocated_cost: totalAllocatedCost,
            breakdown: {
              // Shared costs split by percentage
              travel_cost: sharedTravelCost,
              // Individual work cost based on actual hours
              work_cost: individualWorkCost,
              work_hours: individualWorkHours,
              // Shared costs split by percentage
              allowances: sharedAllowances,
              hotel: sharedHotel,
              fees: sharedFees
            }
          };
        });
      }
    }

    return {
      legs,
      total_work_hours: totalWorkHours,
      total_days_required: practical_road_option ? road_days_required : (flight_option?.days_required || 1),
      arbeitszeit_total,
      tagesspesen_breakdown: roadAllowances.details,
      hotel_total,
      trip_fees: {
        agent_fee,
        company_fee,
        additional_fee_percent,
        note: 'Fees applied once per trip (not per day)'
      },
      road_option: practical_road_option,
      flight_option,
      recommended,
      // Per-customer cost breakdown (if multiple customers with cost percentages)
      per_customer_costs,
      // Add info when road is not available
      road_not_available: !practical_road_option ? {
        reason: drivingError || `Driving time exceeds ${MAX_DRIVING_HOURS} hours`,
        driving_hours: drivingPossible ? totalTravelHours : null,
        not_reachable_by_road: !drivingPossible
      } : null,
      metadata: {
        optimized_sequence: optimizedCustomers.map(c => c.customer_id),
        rates_used: rates
      }
    };
  }

  /**
   * Compare travel options (flight vs road) and return best option
   */
  async compareTravelOptions(origin, destination, country) {
    const distance = await require('./distance.service').calculateDistance(origin, destination);
    const isDomestic = country === 'DEU';

    // Road option
    const roadOption = {
      type: 'road',
      distance_km: distance.distance_km,
      duration_hours: distance.duration_minutes / 60,
      estimated_cost: distance.distance_km * 0.88 // Using company mileage rate
    };

    // Flight option (if applicable)
    let flightOption = null;
    if (distance.distance_km > 300 || !isDomestic) {
      const estimatedPrice = isDomestic
        ? Math.max(150, distance.distance_km * 0.5)
        : Math.max(300, distance.distance_km * 0.8);

      flightOption = {
        type: 'flight',
        distance_km: distance.distance_km,
        duration_hours: (distance.duration_minutes / 60) * 0.6,
        estimated_cost: estimatedPrice + 130 // flight + taxi + parking
      };
    }

    return {
      road: roadOption,
      flight: flightOption,
      recommended: flightOption && flightOption.estimated_cost < roadOption.estimated_cost
        ? 'flight'
        : 'road'
    };
  }
}

module.exports = new CostCalculatorService();

