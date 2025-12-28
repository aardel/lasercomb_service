const axios = require('axios');

/**
 * Unified Geocoding Service - Supports multiple providers
 * Providers: Google Maps, OpenRouteService (Pelias)
 * Supports fallback and caching
 */

/**
 * Geocode using OpenRouteService (Pelias) - FREE
 * @param {string} street
 * @param {string} city
 * @param {string} country - ISO 3166-1 alpha-3 (DEU, MLT, etc.)
 * @returns {Promise<{lat: number, lng: number, formatted_address: string}>}
 */
async function geocodeWithOpenRouteService(street, city, country) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTESERVICE_API_KEY not configured');
  }

  // Build search text
  const address = [street, city, country].filter(Boolean).join(', ');

  const url = 'https://api.openrouteservice.org/geocode/search';

  try {
    console.log(`[GeocodingProvider] 🗺️  OpenRouteService geocoding: ${address}`);

    const response = await axios.get(url, {
      params: {
        api_key: apiKey,
        text: address,
        size: 1 // Only need top result
      },
      timeout: 10000
    });

    if (!response.data.features || response.data.features.length === 0) {
      throw new Error('No results found');
    }

    const feature = response.data.features[0];
    const coords = feature.geometry.coordinates; // [lng, lat] format in GeoJSON

    return {
      lat: coords[1],
      lng: coords[0],
      formatted_address: feature.properties.label || address,
      provider: 'OpenRouteService'
    };
  } catch (error) {
    console.error('[GeocodingProvider] OpenRouteService error:', error.message);
    throw error;
  }
}

/**
 * Geocode using Google Maps Geocoding API
 * @param {string} street
 * @param {string} city
 * @param {string} country
 * @returns {Promise<{lat: number, lng: number, formatted_address: string}>}
 */
async function geocodeWithGoogle(street, city, country) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const address = [street, city, country].filter(Boolean).join(', ');
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';

  try {
    console.log(`[GeocodingProvider] 🌍 Google Maps geocoding: ${address}`);

    const response = await axios.get(url, {
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 10000
    });

    if (response.data.status === 'ZERO_RESULTS' || response.data.results.length === 0) {
      throw new Error('Address not found');
    }

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding error: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
      formatted_address: response.data.results[0].formatted_address,
      provider: 'Google Maps'
    };
  } catch (error) {
    console.error('[GeocodingProvider] Google Maps error:', error.message);
    throw error;
  }
}

/**
 * Geocode address with provider selection and fallback
 * @param {string} street
 * @param {string} city
 * @param {string} country
 * @param {Object} options - { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<{lat: number, lng: number, formatted_address: string, provider: string}>}
 */
async function geocodeAddress(street, city, country, options = {}) {
  const {
    provider = 'auto', // Default: try OpenRouteService first
    enableFallback = true
  } = options;

  console.log(`[GeocodingProvider] Geocoding with provider: ${provider}, fallback: ${enableFallback}`);

  // Simple cache key (you can enhance this with Redis/memory cache later)
  const cacheKey = `geocode:${[street, city, country].filter(Boolean).join(',')}`;

  // Strategy based on provider setting
  if (provider === 'google') {
    return await geocodeWithGoogle(street, city, country);
  }

  if (provider === 'openrouteservice') {
    return await geocodeWithOpenRouteService(street, city, country);
  }

  // Auto mode: Try OpenRouteService first, fallback to Google
  if (provider === 'auto') {
    try {
      const result = await geocodeWithOpenRouteService(street, city, country);
      console.log(`[GeocodingProvider] ✅ Success with OpenRouteService`);
      return result;
    } catch (orsError) {
      console.warn(`[GeocodingProvider] ⚠️  OpenRouteService failed: ${orsError.message}`);

      if (enableFallback && process.env.GOOGLE_MAPS_API_KEY) {
        console.log(`[GeocodingProvider] 🔄 Falling back to Google Maps...`);
        try {
          const result = await geocodeWithGoogle(street, city, country);
          console.log(`[GeocodingProvider] ✅ Success with Google Maps (fallback)`);
          return result;
        } catch (googleError) {
          console.error(`[GeocodingProvider] ❌ Both providers failed`);
          throw new Error(`Geocoding failed: ${orsError.message}, ${googleError.message}`);
        }
      } else {
        throw orsError;
      }
    }
  }

  throw new Error(`Unknown provider: ${provider}`);
}

module.exports = {
  geocodeAddress,
  geocodeWithGoogle,
  geocodeWithOpenRouteService
};
