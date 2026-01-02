/**
 * Toll Calculation Provider Service
 * Multi-provider abstraction layer for toll cost calculation with automatic fallback
 *
 * Supported Providers:
 * - HERE Maps (FREE tier: 250,000 queries/month) - Primary, includes toll calculation in routing
 * - TollGuru (14-day trial, then $80/month) - Expensive, use only as backup
 */

const axios = require('axios');

// Provider implementations
async function calculateWithHERE(origin, destination, options = {}) {
  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) {
    throw new Error('HERE_API_KEY not configured');
  }

  console.log(`[TollProvider] Calculating tolls with HERE Maps (FREE): ${origin.lat},${origin.lng} → ${destination.lat},${destination.lng}`);

  const url = 'https://router.hereapi.com/v8/routes';

  const params = {
    apiKey: apiKey,
    transportMode: 'car',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    return: 'summary,tolls',
    spans: 'tollSys'
  };

  // Add vehicle type if specified
  if (options.vehicleType) {
    params[`car[type]`] = options.vehicleType; // e.g., 'car', 'truck', 'taxi', 'bus'
  }

  const response = await axios.get(url, {
    params: params,
    timeout: 15000
  });

  const route = response.data.routes[0];
  const tolls = route.sections.reduce((acc, section) => {
    if (section.tolls) {
      section.tolls.forEach(toll => {
        acc.push({
          name: toll.name || 'Toll',
          cost: toll.fares?.[0]?.price || 0,
          currency: toll.fares?.[0]?.currency || 'USD',
          tollSystem: toll.tollSystemId
        });
      });
    }
    return acc;
  }, []);

  const totalTollCost = tolls.reduce((sum, toll) => sum + toll.cost, 0);

  console.log(`[TollProvider] ✅ HERE Maps calculated toll cost: ${totalTollCost} ${tolls[0]?.currency || 'USD'} (${tolls.length} tolls)`);

  return {
    success: true,
    provider: 'HERE Maps',
    totalCost: totalTollCost,
    currency: tolls[0]?.currency || 'USD',
    tollCount: tolls.length,
    tolls: tolls,
    distance: route.sections[0].summary.length / 1000, // meters to km
    duration: route.sections[0].summary.duration / 60 // seconds to minutes
  };
}

async function calculateWithTollGuru(origin, destination, options = {}) {
  const apiKey = process.env.TOLLGURU_API_KEY;
  if (!apiKey) {
    throw new Error('TOLLGURU_API_KEY not configured');
  }

  console.log(`[TollProvider] ⚠️ Calculating tolls with TollGuru (EXPENSIVE): ${origin.lat},${origin.lng} → ${destination.lat},${destination.lng}`);

  const url = 'https://apis.tollguru.com/toll/v2/origin-destination-waypoints';

  const requestBody = {
    from: {
      lat: origin.lat,
      lng: origin.lng
    },
    to: {
      lat: destination.lat,
      lng: destination.lng
    },
    vehicleType: options.vehicleType || '2AxlesAuto',
    departure_time: options.departureTime || new Date().toISOString()
  };

  const response = await axios.post(url, requestBody, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    timeout: 15000
  });

  const route = response.data.routes[0];
  const tolls = route.tolls || [];
  const totalTollCost = route.costs?.tag || 0;

  console.log(`[TollProvider] ✅ TollGuru calculated toll cost: ${totalTollCost} ${route.costs?.currency || 'USD'} (${tolls.length} tolls)`);

  return {
    success: true,
    provider: 'TollGuru',
    totalCost: totalTollCost,
    currency: route.costs?.currency || 'USD',
    tollCount: tolls.length,
    tolls: tolls.map(toll => ({
      name: toll.name,
      cost: toll.cost,
      currency: route.costs?.currency || 'USD'
    })),
    distance: route.distance?.value / 1000, // meters to km
    duration: route.duration?.value / 60 // seconds to minutes
  };
}

async function estimateWithoutAPI(origin, destination) {
  console.log(`[TollProvider] Using estimate without API (FREE fallback)`);

  // Calculate straight-line distance
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLng = (destination.lng - origin.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Estimate: ~$0.15 per km for toll roads (European average)
  const estimatedTollCost = Math.round(distance * 0.15 * 100) / 100;

  console.log(`[TollProvider] ✅ Estimated toll cost: ${estimatedTollCost} EUR for ${distance.toFixed(1)} km`);

  return {
    success: true,
    provider: 'Estimate',
    totalCost: estimatedTollCost,
    currency: 'EUR',
    tollCount: 0,
    tolls: [],
    distance: distance,
    isEstimate: true,
    note: 'Toll cost estimated at €0.15/km - actual costs may vary'
  };
}

/**
 * Main toll calculation function with multi-provider support and fallback
 * @param {Object} origin - Origin coordinates
 * @param {number} origin.lat - Origin latitude
 * @param {number} origin.lng - Origin longitude
 * @param {Object} destination - Destination coordinates
 * @param {number} destination.lat - Destination latitude
 * @param {number} destination.lng - Destination longitude
 * @param {Object} [options] - Calculation options
 * @param {string} [options.vehicleType] - Vehicle type (e.g., 'car', 'truck', 'taxi')
 * @param {string} [options.departureTime] - Departure time (ISO format)
 * @param {Array<string>} [options.providers=['here', 'estimate']] - Provider priority order
 * @param {boolean} [options.enableFallback=true] - Enable fallback to next provider on failure
 * @returns {Promise<Object>} Standardized toll calculation results
 */
async function calculateTolls(origin, destination, options = {}) {
  const {
    providers = ['here', 'estimate'], // Default: FREE providers only (exclude TollGuru)
    enableFallback = true
  } = options;

  console.log(`[TollProvider] Calculating tolls with providers: ${providers.join(' → ')}`);

  const errors = [];

  for (const provider of providers) {
    try {
      let result;

      switch (provider) {
        case 'here':
          result = await calculateWithHERE(origin, destination, options);
          break;
        case 'tollguru':
          result = await calculateWithTollGuru(origin, destination, options);
          break;
        case 'estimate':
          result = await estimateWithoutAPI(origin, destination);
          break;
        default:
          console.warn(`[TollProvider] Unknown provider: ${provider}`);
          continue;
      }

      // Return first successful result
      if (result.success) {
        return result;
      }

      console.log(`[TollProvider] Provider ${provider} failed, trying next...`);
    } catch (error) {
      console.error(`[TollProvider] ❌ Provider ${provider} failed:`, error.message);
      errors.push({ provider, error: error.message });

      if (!enableFallback) {
        throw error;
      }
    }
  }

  // All providers failed - return estimate as ultimate fallback
  console.warn('[TollProvider] All configured providers failed, using estimate as fallback');
  return await estimateWithoutAPI(origin, destination);
}

module.exports = {
  calculateTolls,
  calculateWithHERE,
  calculateWithTollGuru,
  estimateWithoutAPI
};
