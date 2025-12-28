const providerService = require('./distance-provider.service');

/**
 * Calculate distance and travel time between two locations
 * Now uses multi-provider system (Google Maps, OpenRouteService, Auto)
 *
 * @param {Object} origin - {lat: number, lng: number} or {address: string}
 * @param {Object} destination - {lat: number, lng: number} or {address: string}
 * @param {Object} options - Provider options { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<{distance_km: number, duration_minutes: number, distance_text: string, duration_text: string, provider: string}>}
 */
async function calculateDistance(origin, destination, options = {}) {
  // Default to 'auto' mode (try OpenRouteService first, fallback to Google)
  const providerOptions = {
    provider: options.provider || 'auto',
    enableFallback: options.enableFallback !== false
  };

  try {
    return await providerService.calculateDistance(origin, destination, providerOptions);
  } catch (error) {
    console.error('[Distance] All providers failed:', error.message);
    throw error;
  }
}

/**
 * Calculate distance matrix for multiple origins and destinations
 * Now uses multi-provider system (Google Maps, OpenRouteService, Auto)
 *
 * @param {Array<string|Object>} points - Array of addresses or {lat, lng} objects
 * @param {Object} options - Provider options { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<Object>} Matrix response (format varies by provider)
 */
async function calculateDistanceMatrix(points, options = {}) {
  // Default to 'auto' mode
  const providerOptions = {
    provider: options.provider || 'auto',
    enableFallback: options.enableFallback !== false
  };

  try {
    const result = await providerService.calculateDistanceMatrix(points, providerOptions);

    // Convert provider-specific format to Google-compatible format for backwards compatibility
    // This ensures existing code using matrix.rows[i].elements[j] continues to work
    if (result.provider === 'OpenRouteService') {
      // Convert OpenRouteService matrix format to Google format
      const rows = result.distances.map((row, i) => ({
        elements: row.map((distance, j) => ({
          status: 'OK',
          distance: {
            value: distance * 1000, // km to meters
            text: `${distance.toFixed(1)} km`
          },
          duration: {
            value: result.durations[i][j] * 60, // minutes to seconds
            text: `${Math.round(result.durations[i][j])} mins`
          }
        }))
      }));

      return {
        status: 'OK',
        rows,
        provider: result.provider
      };
    }

    // Google Maps format is already correct
    return result;
  } catch (error) {
    console.error('[Distance] Matrix calculation failed:', error.message);
    throw error;
  }
}

/**
 * Optimize route using a simple greedy (Nearest Neighbor) algorithm
 * @param {Object} origin - Starting point {lat, lng} or address
 * @param {Array<Object>} destinations - Array of destination objects with coordinates/address
 * @returns {Promise<Array<Object>>} Optimized sequence of destinations
 */
async function optimizeRoute(origin, destinations) {
  if (destinations.length <= 1) return destinations;

  const allPoints = [origin, ...destinations];
  const matrix = await calculateDistanceMatrix(allPoints);

  const optimized = [];
  const visited = new Set([0]); // Origin is index 0
  let currentIndex = 0;

  while (optimized.length < destinations.length) {
    let nearestIndex = -1;
    let minDistance = Infinity;

    const row = matrix.rows[currentIndex].elements;
    for (let i = 1; i < allPoints.length; i++) {
      if (!visited.has(i)) {
        const element = row[i];
        if (element.status === 'OK' && element.distance) {
          const distance = element.distance.value;
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }
      }
    }

    if (nearestIndex !== -1) {
      visited.add(nearestIndex);
      optimized.push(destinations[nearestIndex - 1]);
      currentIndex = nearestIndex;
    } else {
      // If we can't find any more reachable points, just add the remaining ones
      // to avoid an infinite loop or missing data, though they might not be optimized.
      for (let i = 1; i < allPoints.length; i++) {
        if (!visited.has(i)) {
          visited.add(i);
          optimized.push(destinations[i - 1]);
        }
      }
      break;
    }
  }

  return optimized;
}

/**
 * Calculate distance between two addresses (convenience function)
 * @param {string} originAddress - Origin address string
 * @param {string} destinationAddress - Destination address string
 * @returns {Promise<Object>} Distance and duration information
 */
async function calculateDistanceByAddress(originAddress, destinationAddress) {
  return calculateDistance(
    { address: originAddress },
    { address: destinationAddress }
  );
}

const tollService = require('./toll.service');

// ... (existing imports)

// ... (existing functions)

/**
 * Calculate route with toll estimation using Google Maps Routes API (v2)
 * and TollGuru API for accurate toll costs.
 * @param {Object} origin - {lat, lng}
 * @param {Object} destination - {lat, lng}
 * @returns {Promise<Object>} Route info with tolls
 */
async function calculateRouteWithTolls(origin, destination, intermediates = []) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not set');
  }

  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  const getLoc = (p) => {
    if (!p) return null;
    if (p.lat && p.lng) return { location: { latLng: { latitude: p.lat, longitude: p.lng } } };
    if (p.coordinates && p.coordinates.lat && p.coordinates.lng) return { location: { latLng: { latitude: p.coordinates.lat, longitude: p.coordinates.lng } } };
    if (p.address) return { address: p.address };
    if (typeof p === 'string') return { address: p };
    return null;
  };

  const originLoc = getLoc(origin);
  const destLoc = getLoc(destination);

  if (!originLoc || !destLoc) {
    console.warn('Invalid origin or destination for toll calculation');
    return { toll_cost: 0 };
  }

  const body = {
    origin: originLoc,
    destination: destLoc,
    intermediates: intermediates.map(getLoc).filter(Boolean),
    travelMode: 'DRIVE',
    extraComputations: ['TOLLS'],
    computeAlternativeRoutes: false
  };

  try {
    // Parallel execution: Google Routes for distance/duration, TollGuru for tolls
    const [googleResponse, tollGuruCost] = await Promise.all([
      axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo'
        }
      }).catch(err => {
        console.warn('Google Routes API failed:', err.message);
        return { data: {} };
      }),
      tollService.calculateTolls(origin, destination, intermediates)
    ]);

    const route = googleResponse.data && googleResponse.data.routes && googleResponse.data.routes[0];

    // Calculate Google's toll estimate as fallback/comparison
    let googleTollCost = 0;

    // Try top-level toll info first
    if (route && route.travelAdvisory && route.travelAdvisory.tollInfo) {
      const tollInfo = route.travelAdvisory.tollInfo;
      if (tollInfo.estimatedPrice && tollInfo.estimatedPrice.length > 0) {
        const price = tollInfo.estimatedPrice[0];
        googleTollCost = parseFloat(price.units || '0') + (price.nanos || 0) / 1e9;
      }
    } else {
      // No Google Top-Level Toll Info found
    }

    // If top-level is 0, check legs (some regions report per-leg)
    if (googleTollCost === 0 && route && route.legs) {
      let legTollTotal = 0;
      route.legs.forEach((leg, index) => {
        if (leg.travelAdvisory && leg.travelAdvisory.tollInfo) {
          if (leg.travelAdvisory.tollInfo.estimatedPrice) {
            const price = leg.travelAdvisory.tollInfo.estimatedPrice[0];
            if (price) {
              legTollTotal += parseFloat(price.units || '0') + (price.nanos || 0) / 1e9;
            }
          }
        }
      });
      if (legTollTotal > 0) {
        googleTollCost = legTollTotal;
      }
    }

    // Use TollGuru cost if available (> 0), otherwise fallback to Google's
    // If TollGuru returns 0, it might mean no tolls or API error.
    // Given the context, if TollGuru is 0, we trust it (or Google's 0).
    // But if TollGuru fails (returns 0 due to error), we might want Google's?
    // The service returns 0 on error.
    // Let's take the maximum for now to be safe? Or just prefer TollGuru?
    // User specifically asked for TollGuru because Google was 0.
    // So if TollGuru finds something, use it.
    const tollGuruTotal = (tollGuruCost && typeof tollGuruCost === 'object' && tollGuruCost.total) ? tollGuruCost.total : (typeof tollGuruCost === 'number' ? tollGuruCost : 0);
    const tollGuruDetails = (tollGuruCost && typeof tollGuruCost === 'object' && tollGuruCost.details) ? tollGuruCost.details : [];
    
    let finalTollCost = tollGuruTotal > 0 ? tollGuruTotal : googleTollCost;
    let tollDetails = tollGuruTotal > 0 ? tollGuruDetails : [];
    let tollSource = tollGuruTotal > 0 ? 'tollguru' : (googleTollCost > 0 ? 'google' : 'none');

    // If we're using Google's estimate and it has a cost but no details, create a summary entry
    if (googleTollCost > 0 && tollDetails.length === 0) {
      tollDetails.push({
        id: 'google-estimate',
        name: 'Estimated Route Tolls',
        cost: Math.round(googleTollCost * 100) / 100,
        currency: 'EUR',
        location: null,
        roadName: null,
        source: 'google',
        note: 'Estimated total from Google Maps. Individual toll breakdown not available.'
      });
      tollSource = 'google';
    }
    
    // If TollGuru returned a total but no details, create a summary entry
    if (tollGuruTotal > 0 && tollDetails.length === 0) {
      tollDetails.push({
        id: 'tollguru-total',
        name: 'Route Tolls',
        cost: Math.round(tollGuruTotal * 100) / 100,
        currency: 'EUR',
        location: null,
        roadName: null,
        source: 'tollguru',
        note: 'Total from TollGuru API. Individual toll breakdown not available in response.'
      });
    }

    return {
      distance_km: (route ? route.distanceMeters : 0) / 1000,
      duration_minutes: parseInt(route ? route.duration : '0') / 60,
      toll_cost: Math.round(finalTollCost * 100) / 100,
      toll_details: tollDetails,
      toll_source: tollSource
    };
  } catch (error) {
    console.warn('Route calculation failed:', error.message);
    return { toll_cost: 0 };
  }
}

module.exports = {
  calculateDistance,
  calculateDistanceByAddress,
  calculateDistanceMatrix,
  optimizeRoute,
  calculateRouteWithTolls
};

