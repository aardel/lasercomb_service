const providerService = require('./places-provider.service');

/**
 * Search for places using multi-provider autocomplete
 * Now uses both Google Places and OpenRouteService (FREE)
 *
 * @param {string} input - Search query (company name, address, etc.)
 * @param {string} country - Country code to restrict results (optional)
 * @param {Object} options - Provider options { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<Array>} Array of place predictions
 */
async function autocompletePlaces(input, country = null, options = {}) {
  // Default to 'auto' mode (try OpenRouteService first, fallback to Google)
  const providerOptions = {
    provider: options.provider || 'auto',
    enableFallback: options.enableFallback !== false
  };

  try {
    return await providerService.autocompletePlaces(input, country, providerOptions);
  } catch (error) {
    console.error('[Places] All providers failed:', error.message);
    throw error;
  }
}

/**
 * Get place details from place_id
 * Currently only Google Places supports this
 *
 * @param {string} placeId - Place ID from autocomplete
 * @param {Object} options - Provider options
 * @returns {Promise<Object>} Place details with address, coordinates, phone, etc.
 */
async function getPlaceDetails(placeId, options = {}) {
  try {
    return await providerService.getPlaceDetails(placeId, options);
  } catch (error) {
    console.error('[Places] Place details failed:', error.message);
    throw error;
  }
}

module.exports = {
  autocompletePlaces,
  getPlaceDetails
};


