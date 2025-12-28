const providerService = require('./geocoding-provider.service');

/**
 * Geocode an address to get coordinates
 * Now uses multi-provider system (Google Maps, OpenRouteService, Auto)
 *
 * @param {string} street - Street address
 * @param {string} city - City name
 * @param {string} country - Country code (ISO 3166-1 alpha-3)
 * @param {Object} options - Provider options { provider: 'google'|'openrouteservice'|'auto', enableFallback: true }
 * @returns {Promise<{lat: number, lng: number, formatted_address: string, provider: string}>}
 */
async function geocodeAddress(street, city, country, options = {}) {
  // Default to 'auto' mode (try OpenRouteService first, fallback to Google)
  const providerOptions = {
    provider: options.provider || 'auto',
    enableFallback: options.enableFallback !== false
  };

  try {
    return await providerService.geocodeAddress(street, city, country, providerOptions);
  } catch (error) {
    console.error('[Geocoding] All providers failed:', error.message);
    throw error;
  }
}

module.exports = { geocodeAddress };

