const axios = require('axios');

/**
 * Unified Distance/Routing Service - Supports multiple providers
 * Providers: Google Maps Distance Matrix, OpenRouteService Directions
 * Supports fallback and caching
 */

/**
 * Calculate distance using OpenRouteService - FREE
 * @param {Object} origin - {lat: number, lng: number} or {address: string}
 * @param {Object} destination - {lat: number, lng: number} or {address: string}
 * @returns {Promise<{distance_km: number, duration_minutes: number, distance_text: string, duration_text: string}>}
 */
async function calculateDistanceWithOpenRouteService(origin, destination) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTESERVICE_API_KEY not configured');
  }

  // Extract coordinates
  const getCoords = (p) => {
    if (p.lat && p.lng) return [p.lng, p.lat]; // ORS uses [lng, lat] format
    if (p.coordinates && p.coordinates.lat && p.coordinates.lng) {
      return [p.coordinates.lng, p.coordinates.lat];
    }
    throw new Error('Invalid coordinates format - OpenRouteService requires lat/lng');
  };

  const originCoords = getCoords(origin);
  const destCoords = getCoords(destination);

  const url = 'https://api.openrouteservice.org/v2/directions/driving-car';

  try {
    console.log(`[DistanceProvider] 🗺️  OpenRouteService routing: [${originCoords}] → [${destCoords}]`);

    const response = await axios.post(url, {
      coordinates: [originCoords, destCoords]
    }, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = response.data.routes[0];
    const summary = route.summary;

    const distanceKm = summary.distance / 1000; // meters to km
    const durationMinutes = summary.duration / 60; // seconds to minutes

    return {
      distance_km: Math.round(distanceKm * 100) / 100,
      duration_minutes: Math.round(durationMinutes),
      distance_text: `${distanceKm.toFixed(1)} km`,
      duration_text: `${Math.round(durationMinutes)} mins`,
      origin_address: origin.address || `${origin.lat},${origin.lng}`,
      destination_address: destination.address || `${destination.lat},${destination.lng}`,
      provider: 'OpenRouteService'
    };
  } catch (error) {
    console.error('[DistanceProvider] OpenRouteService error:', error.message);
    if (error.response) {
      console.error('[DistanceProvider] Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Calculate distance using Google Maps Distance Matrix API
 * @param {Object} origin
 * @param {Object} destination
 * @returns {Promise<{distance_km: number, duration_minutes: number, distance_text: string, duration_text: string}>}
 */
async function calculateDistanceWithGoogle(origin, destination) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  // Format origin and destination
  const getLocStr = (p) => {
    if (!p) return '';
    if (p.lat && p.lng) return `${p.lat},${p.lng}`;
    if (p.coordinates && p.coordinates.lat && p.coordinates.lng) {
      return `${p.coordinates.lat},${p.coordinates.lng}`;
    }
    if (p.address) return p.address;
    if (typeof p === 'string') return p;
    return '';
  };

  const originStr = getLocStr(origin);
  const destinationStr = getLocStr(destination);

  try {
    console.log(`[DistanceProvider] 🌍 Google Maps routing: ${originStr} → ${destinationStr}`);

    const response = await axios.get(url, {
      params: {
        origins: originStr,
        destinations: destinationStr,
        units: 'metric',
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 15000
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${response.data.status}`);
    }

    if (!response.data.rows || response.data.rows.length === 0) {
      throw new Error('No results returned from Distance Matrix API');
    }

    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    return {
      distance_km: element.distance.value / 1000,
      duration_minutes: element.duration.value / 60,
      distance_text: element.distance.text,
      duration_text: element.duration.text,
      origin_address: response.data.origin_addresses[0],
      destination_address: response.data.destination_addresses[0],
      provider: 'Google Maps'
    };
  } catch (error) {
    console.error('[DistanceProvider] Google Maps error:', error.message);
    throw error;
  }
}

/**
 * Calculate distance matrix using OpenRouteService
 * @param {Array<Object>} points - Array of {lat, lng} objects
 * @returns {Promise<Object>} Distance matrix
 */
async function calculateDistanceMatrixWithOpenRouteService(points) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTESERVICE_API_KEY not configured');
  }

  // Convert points to [lng, lat] format
  const locations = points.map(p => {
    if (p.lat && p.lng) return [p.lng, p.lat];
    if (p.coordinates && p.coordinates.lat && p.coordinates.lng) {
      return [p.coordinates.lng, p.coordinates.lat];
    }
    throw new Error('Invalid point format');
  });

  const url = 'https://api.openrouteservice.org/v2/matrix/driving-car';

  try {
    console.log(`[DistanceProvider] 🗺️  OpenRouteService matrix: ${points.length} points`);

    const response = await axios.post(url, {
      locations: locations,
      metrics: ['distance', 'duration']
    }, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    // Convert to same format as Google Maps
    const matrix = {
      distances: response.data.distances.map(row => row.map(d => d / 1000)), // meters to km
      durations: response.data.durations.map(row => row.map(d => d / 60)), // seconds to minutes
      provider: 'OpenRouteService'
    };

    return matrix;
  } catch (error) {
    console.error('[DistanceProvider] OpenRouteService matrix error:', error.message);
    throw error;
  }
}

/**
 * Calculate distance matrix using Google Maps
 * @param {Array<Object>} points
 * @returns {Promise<Object>} Distance matrix
 */
async function calculateDistanceMatrixWithGoogle(points) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  const getLocStr = (p) => {
    if (!p) return '';
    if (p.lat && p.lng) return `${p.lat},${p.lng}`;
    if (p.coordinates && p.coordinates.lat && p.coordinates.lng) {
      return `${p.coordinates.lat},${p.coordinates.lng}`;
    }
    if (p.address) return p.address;
    return '';
  };

  const pointsStr = points.map(getLocStr).filter(Boolean).join('|');

  try {
    console.log(`[DistanceProvider] 🌍 Google Maps matrix: ${points.length} points`);

    const response = await axios.get(url, {
      params: {
        origins: pointsStr,
        destinations: pointsStr,
        units: 'metric',
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 20000
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${response.data.status}`);
    }

    // Parse into distance/duration matrices
    const n = points.length;
    const distances = Array(n).fill().map(() => Array(n).fill(0));
    const durations = Array(n).fill().map(() => Array(n).fill(0));

    response.data.rows.forEach((row, i) => {
      row.elements.forEach((element, j) => {
        if (element.status === 'OK') {
          distances[i][j] = element.distance.value / 1000; // meters to km
          durations[i][j] = element.duration.value / 60; // seconds to minutes
        }
      });
    });

    return {
      distances,
      durations,
      provider: 'Google Maps'
    };
  } catch (error) {
    console.error('[DistanceProvider] Google Maps matrix error:', error.message);
    throw error;
  }
}

/**
 * Calculate distance with provider selection and fallback
 * @param {Object} origin
 * @param {Object} destination
 * @param {Object} options - { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<Object>} Distance data with provider info
 */
async function calculateDistance(origin, destination, options = {}) {
  const {
    provider = 'auto',
    enableFallback = true
  } = options;

  console.log(`[DistanceProvider] Calculating distance with provider: ${provider}, fallback: ${enableFallback}`);

  // Direct provider selection
  if (provider === 'google') {
    return await calculateDistanceWithGoogle(origin, destination);
  }

  if (provider === 'openrouteservice') {
    return await calculateDistanceWithOpenRouteService(origin, destination);
  }

  // Auto mode: Try OpenRouteService first, fallback to Google
  if (provider === 'auto') {
    try {
      const result = await calculateDistanceWithOpenRouteService(origin, destination);
      console.log(`[DistanceProvider] ✅ Success with OpenRouteService`);
      return result;
    } catch (orsError) {
      console.warn(`[DistanceProvider] ⚠️  OpenRouteService failed: ${orsError.message}`);

      if (enableFallback && process.env.GOOGLE_MAPS_API_KEY) {
        console.log(`[DistanceProvider] 🔄 Falling back to Google Maps...`);
        try {
          const result = await calculateDistanceWithGoogle(origin, destination);
          console.log(`[DistanceProvider] ✅ Success with Google Maps (fallback)`);
          return result;
        } catch (googleError) {
          console.error(`[DistanceProvider] ❌ Both providers failed`);
          throw new Error(`Distance calculation failed: ${orsError.message}, ${googleError.message}`);
        }
      } else {
        throw orsError;
      }
    }
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Calculate distance matrix with provider selection and fallback
 * @param {Array<Object>} points
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function calculateDistanceMatrix(points, options = {}) {
  const {
    provider = 'auto',
    enableFallback = true
  } = options;

  console.log(`[DistanceProvider] Calculating matrix with provider: ${provider}, fallback: ${enableFallback}`);

  if (provider === 'google') {
    return await calculateDistanceMatrixWithGoogle(points);
  }

  if (provider === 'openrouteservice') {
    return await calculateDistanceMatrixWithOpenRouteService(points);
  }

  // Auto mode
  if (provider === 'auto') {
    try {
      const result = await calculateDistanceMatrixWithOpenRouteService(points);
      console.log(`[DistanceProvider] ✅ Matrix success with OpenRouteService`);
      return result;
    } catch (orsError) {
      console.warn(`[DistanceProvider] ⚠️  OpenRouteService matrix failed: ${orsError.message}`);

      if (enableFallback && process.env.GOOGLE_MAPS_API_KEY) {
        console.log(`[DistanceProvider] 🔄 Falling back to Google Maps matrix...`);
        try {
          const result = await calculateDistanceMatrixWithGoogle(points);
          console.log(`[DistanceProvider] ✅ Matrix success with Google Maps (fallback)`);
          return result;
        } catch (googleError) {
          console.error(`[DistanceProvider] ❌ Both matrix providers failed`);
          throw new Error(`Matrix calculation failed: ${orsError.message}, ${googleError.message}`);
        }
      } else {
        throw orsError;
      }
    }
  }

  throw new Error(`Unknown provider: ${provider}`);
}

module.exports = {
  calculateDistance,
  calculateDistanceMatrix,
  calculateDistanceWithGoogle,
  calculateDistanceWithOpenRouteService,
  calculateDistanceMatrixWithGoogle,
  calculateDistanceMatrixWithOpenRouteService
};
