const axios = require('axios');

/**
 * Unified Places/Autocomplete Service - Supports multiple providers
 * Providers: Google Places Autocomplete, OpenRouteService Autocomplete
 * Supports fallback and caching
 */

/**
 * Autocomplete using OpenRouteService (Pelias) - FREE
 * @param {string} input - Search query
 * @param {string} country - Country code (2-letter ISO, e.g., "DE", "MT")
 * @returns {Promise<Array>} Array of place predictions
 */
async function autocompleteWithOpenRouteService(input, country = null) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTESERVICE_API_KEY not configured');
  }

  const url = 'https://api.openrouteservice.org/geocode/autocomplete';

  try {
    console.log(`[PlacesProvider] 🗺️  OpenRouteService autocomplete: "${input}"`);

    const params = {
      api_key: apiKey,
      text: input,
      size: 5 // Return up to 5 suggestions
    };

    // Add country filter if provided (convert 3-letter to 2-letter)
    if (country) {
      const threeToTwoLetter = {
        'DEU': 'DE', 'MLT': 'MT', 'FRA': 'FR', 'GBR': 'GB', 'ITA': 'IT',
        'ESP': 'ES', 'CHE': 'CH', 'AUT': 'AT', 'NLD': 'NL', 'USA': 'US',
        'POL': 'PL', 'CZE': 'CZ', 'DNK': 'DK', 'SWE': 'SE', 'NOR': 'NO',
        'FIN': 'FI', 'PRT': 'PT', 'GRC': 'GR', 'IRL': 'IE'
      };

      const countryCode = country.length === 3 ? (threeToTwoLetter[country.toUpperCase()] || country) : country;
      params['boundary.country'] = countryCode.toUpperCase();
    }

    const response = await axios.get(url, {
      params,
      timeout: 10000
    });

    if (!response.data.features || response.data.features.length === 0) {
      console.log('[PlacesProvider] No results from OpenRouteService autocomplete');
      return [];
    }

    // Convert to Google Places format for compatibility
    const predictions = response.data.features.map((feature, index) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates; // [lng, lat]

      return {
        place_id: `ors-${feature.properties.id || index}`,
        description: props.label || props.name,
        structured_formatting: {
          main_text: props.name || props.label,
          secondary_text: [props.locality, props.region, props.country].filter(Boolean).join(', ')
        },
        // Add coordinates for quick access (non-standard but useful)
        coordinates: {
          lat: coords[1],
          lng: coords[0]
        },
        provider: 'OpenRouteService'
      };
    });

    console.log(`[PlacesProvider] ✅ OpenRouteService returned ${predictions.length} suggestions`);
    return predictions;
  } catch (error) {
    console.error('[PlacesProvider] OpenRouteService autocomplete error:', error.message);
    if (error.response) {
      console.error('[PlacesProvider] Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Autocomplete using Google Places API
 * @param {string} input - Search query
 * @param {string} country - Country code
 * @returns {Promise<Array>} Array of place predictions
 */
async function autocompleteWithGoogle(input, country = null) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

  try {
    console.log(`[PlacesProvider] 🌍 Google Places autocomplete: "${input}"`);

    const params = {
      input: input,
      key: process.env.GOOGLE_MAPS_API_KEY
    };

    if (country) {
      // Convert 3-letter to 2-letter country code
      const threeToTwoLetter = {
        'MLT': 'MT', 'DEU': 'DE', 'FRA': 'FR', 'GBR': 'GB', 'ITA': 'IT',
        'ESP': 'ES', 'CHE': 'CH', 'AUT': 'AT', 'NLD': 'NL', 'USA': 'US'
      };

      let countryCode = country.toUpperCase();
      if (countryCode.length === 3 && threeToTwoLetter[countryCode]) {
        countryCode = threeToTwoLetter[countryCode];
      }
      params.components = `country:${countryCode}`;
    }

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${response.data.status}`);
    }

    const predictions = (response.data.predictions || []).map(p => ({
      ...p,
      provider: 'Google Places'
    }));

    console.log(`[PlacesProvider] ✅ Google Places returned ${predictions.length} suggestions`);
    return predictions;
  } catch (error) {
    console.error('[PlacesProvider] Google Places autocomplete error:', error.message);
    throw error;
  }
}

/**
 * Get place details from place_id
 * @param {string} placeId - Place ID
 * @returns {Promise<Object>} Place details
 */
async function getPlaceDetailsWithGoogle(placeId) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const url = 'https://maps.googleapis.com/maps/api/place/details/json';

  try {
    const response = await axios.get(url, {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,address_components,geometry,formatted_phone_number,international_phone_number,website,types',
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 10000
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Place details error: ${response.data.status}`);
    }

    const place = response.data.result;

    // Parse address components
    const addressComponents = place.address_components || [];
    const getComponent = (type) => {
      const component = addressComponents.find(c => c.types.includes(type));
      return component ? component.long_name : '';
    };

    const getShortComponent = (type) => {
      const component = addressComponents.find(c => c.types.includes(type));
      return component ? component.short_name : '';
    };

    // Country code mapping
    const countryCodeShort = getShortComponent('country');
    const countryCodeMap = {
      'DE': 'DEU', 'FR': 'FRA', 'GB': 'GBR', 'US': 'USA', 'CH': 'CHE',
      'AT': 'AUT', 'NL': 'NLD', 'IT': 'ITA', 'ES': 'ESP', 'MT': 'MLT'
    };
    const countryCode = countryCodeMap[countryCodeShort] || countryCodeShort;

    return {
      name: place.name,
      formatted_address: place.formatted_address,
      street_address: getComponent('street_number') + ' ' + getComponent('route'),
      city: getComponent('locality') || getComponent('administrative_area_level_2'),
      postal_code: getComponent('postal_code'),
      country: countryCode,
      country_name: getComponent('country'),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      phone: place.formatted_phone_number || place.international_phone_number,
      website: place.website,
      types: place.types || [],
      provider: 'Google Places'
    };
  } catch (error) {
    console.error('[PlacesProvider] Google place details error:', error.message);
    throw error;
  }
}

/**
 * Autocomplete with provider selection and fallback
 * @param {string} input - Search query
 * @param {string} country - Country code (optional)
 * @param {Object} options - { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<Array>} Array of place predictions
 */
async function autocompletePlaces(input, country = null, options = {}) {
  const {
    provider = 'auto',
    enableFallback = true
  } = options;

  console.log(`[PlacesProvider] Autocomplete with provider: ${provider}, fallback: ${enableFallback}`);

  // Direct provider selection
  if (provider === 'google') {
    return await autocompleteWithGoogle(input, country);
  }

  if (provider === 'openrouteservice') {
    return await autocompleteWithOpenRouteService(input, country);
  }

  // Auto mode: Try OpenRouteService first, fallback to Google
  if (provider === 'auto') {
    try {
      const results = await autocompleteWithOpenRouteService(input, country);
      if (results && results.length > 0) {
        console.log(`[PlacesProvider] ✅ Success with OpenRouteService`);
        return results;
      }
      throw new Error('No results from OpenRouteService');
    } catch (orsError) {
      console.warn(`[PlacesProvider] ⚠️  OpenRouteService failed: ${orsError.message}`);

      if (enableFallback && process.env.GOOGLE_MAPS_API_KEY) {
        console.log(`[PlacesProvider] 🔄 Falling back to Google Places...`);
        try {
          const results = await autocompleteWithGoogle(input, country);
          console.log(`[PlacesProvider] ✅ Success with Google Places (fallback)`);
          return results;
        } catch (googleError) {
          console.error(`[PlacesProvider] ❌ Both providers failed`);
          throw new Error(`Autocomplete failed: ${orsError.message}, ${googleError.message}`);
        }
      } else {
        throw orsError;
      }
    }
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Get place details (currently only Google supports this, OpenRouteService uses geocoding)
 * @param {string} placeId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function getPlaceDetails(placeId, options = {}) {
  // If it's an OpenRouteService place_id, extract coordinates
  if (placeId.startsWith('ors-')) {
    console.log('[PlacesProvider] OpenRouteService place - details already included in autocomplete');
    throw new Error('OpenRouteService place details not supported via place_id - use autocomplete data directly');
  }

  // Google Places
  return await getPlaceDetailsWithGoogle(placeId);
}

module.exports = {
  autocompletePlaces,
  getPlaceDetails,
  autocompleteWithGoogle,
  autocompleteWithOpenRouteService,
  getPlaceDetailsWithGoogle
};
