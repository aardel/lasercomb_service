/**
 * Hotel Search Provider Service
 * Multi-provider abstraction layer for hotel search with automatic fallback
 *
 * Supported Providers:
 * - Xotelo (FREE hotel price aggregator) - Aggregates Hotels.com, Expedia, Booking.com, Agoda
 * - Amadeus (FREE tier: 2,000 requests/month)
 * - Google Places (PAID - backup only)
 */

const axios = require('axios');

// Provider implementations
async function searchWithXotelo(params) {
  console.log(`[HotelProvider] Searching with Xotelo (FREE): ${params.location}`);

  try {
    // Xotelo free API - aggregates multiple hotel booking sites
    const url = 'https://api.xotelo.com/api/rates';

    const searchParams = {
      location: params.location,
      checkin: params.checkIn,
      checkout: params.checkOut,
      guests: params.guests || 1
    };

    const response = await axios.get(url, {
      params: searchParams,
      timeout: 15000
    });

    // Convert Xotelo format to our standardized format
    const hotels = (response.data.hotels || []).map(hotel => ({
      id: `xotelo-${hotel.id}`,
      name: hotel.name,
      address: hotel.address,
      rating: hotel.rating || 0,
      price: hotel.price,
      currency: hotel.currency || 'USD',
      pricePerNight: hotel.pricePerNight,
      coordinates: hotel.coordinates,
      amenities: hotel.amenities || [],
      provider: 'Xotelo',
      bookingLinks: hotel.bookingLinks || {}
    }));

    console.log(`[HotelProvider] ✅ Xotelo returned ${hotels.length} hotels`);

    return {
      success: true,
      provider: 'Xotelo',
      count: hotels.length,
      hotels: hotels
    };
  } catch (error) {
    // If Xotelo API structure is different, provide fallback structure
    console.warn('[HotelProvider] Xotelo API structure may have changed, returning empty results');
    return {
      success: true,
      provider: 'Xotelo',
      count: 0,
      hotels: [],
      note: 'Xotelo API response format may need updating'
    };
  }
}

async function searchWithAmadeus(params) {
  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('AMADEUS_API_KEY or AMADEUS_API_SECRET not configured');
  }

  console.log(`[HotelProvider] Searching with Amadeus: ${params.location}`);

  // Get access token
  const tokenResponse = await axios.post(
    'https://test.api.amadeus.com/v1/security/oauth2/token',
    'grant_type=client_credentials&client_id=' + apiKey + '&client_secret=' + apiSecret,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    }
  );

  const accessToken = tokenResponse.data.access_token;

  // Search hotels by city code
  const searchParams = {
    cityCode: params.cityCode || params.location,
    checkInDate: params.checkIn,
    checkOutDate: params.checkOut,
    adults: params.guests || 1,
    radius: params.radius || 5,
    radiusUnit: 'KM'
  };

  const hotelResponse = await axios.get(
    'https://test.api.amadeus.com/v3/shopping/hotel-offers',
    {
      params: searchParams,
      headers: { 'Authorization': `Bearer ${accessToken}` },
      timeout: 15000
    }
  );

  // Convert Amadeus format to our standardized format
  const hotels = (hotelResponse.data.data || []).map(offer => ({
    id: `amadeus-${offer.hotel.hotelId}`,
    name: offer.hotel.name,
    address: offer.hotel.address?.lines?.join(', ') || '',
    rating: offer.hotel.rating || 0,
    price: parseFloat(offer.offers[0]?.price?.total || 0),
    currency: offer.offers[0]?.price?.currency || 'USD',
    pricePerNight: parseFloat(offer.offers[0]?.price?.base || 0),
    coordinates: {
      lat: offer.hotel.latitude,
      lng: offer.hotel.longitude
    },
    amenities: offer.hotel.amenities || [],
    provider: 'Amadeus'
  }));

  console.log(`[HotelProvider] ✅ Amadeus returned ${hotels.length} hotels`);

  return {
    success: true,
    provider: 'Amadeus',
    count: hotels.length,
    hotels: hotels
  };
}

async function searchWithGooglePlaces(params) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  console.log(`[HotelProvider] ⚠️ Using Google Places (PAID): ${params.location}`);

  // This is a simplified implementation - production would use proper Google Places API
  const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

  const searchParams = {
    query: `hotels in ${params.location}`,
    key: apiKey
  };

  const response = await axios.get(url, {
    params: searchParams,
    timeout: 15000
  });

  // Convert Google Places format to our standardized format
  const hotels = (response.data.results || []).slice(0, params.maxResults || 10).map(place => ({
    id: `google-${place.place_id}`,
    name: place.name,
    address: place.formatted_address,
    rating: place.rating || 0,
    price: null, // Google Places doesn't provide pricing directly
    currency: 'USD',
    pricePerNight: null,
    coordinates: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    },
    amenities: [],
    provider: 'Google Places',
    placeId: place.place_id
  }));

  console.log(`[HotelProvider] ✅ Google Places returned ${hotels.length} hotels (no pricing)`);

  return {
    success: true,
    provider: 'Google Places',
    count: hotels.length,
    hotels: hotels,
    note: 'Pricing not available via Google Places'
  };
}

/**
 * Main hotel search function with multi-provider support and fallback
 * @param {Object} params - Search parameters
 * @param {string} params.location - Location (city name or coordinates)
 * @param {string} [params.cityCode] - City code for Amadeus (e.g., 'NYC')
 * @param {string} params.checkIn - Check-in date (YYYY-MM-DD)
 * @param {string} params.checkOut - Check-out date (YYYY-MM-DD)
 * @param {number} [params.guests=1] - Number of guests
 * @param {number} [params.maxResults=10] - Maximum results to return
 * @param {number} [params.radius=5] - Search radius in kilometers
 * @param {Object} [options] - Provider options
 * @param {Array<string>} [options.providers=['xotelo', 'amadeus', 'google']] - Provider priority order
 * @param {boolean} [options.enableFallback=true] - Enable fallback to next provider on failure
 * @returns {Promise<Object>} Standardized hotel search results
 */
async function searchHotels(params, options = {}) {
  const {
    providers = ['xotelo', 'amadeus'], // Default: Free providers only (exclude Google)
    enableFallback = true
  } = options;

  console.log(`[HotelProvider] Searching hotels with providers: ${providers.join(' → ')}`);

  const errors = [];

  for (const provider of providers) {
    try {
      let result;

      switch (provider) {
        case 'xotelo':
          result = await searchWithXotelo(params);
          break;
        case 'amadeus':
          result = await searchWithAmadeus(params);
          break;
        case 'google':
          result = await searchWithGooglePlaces(params);
          break;
        default:
          console.warn(`[HotelProvider] Unknown provider: ${provider}`);
          continue;
      }

      // Return first successful result
      if (result.success && result.hotels.length > 0) {
        return result;
      }

      console.log(`[HotelProvider] Provider ${provider} returned no results, trying next...`);
    } catch (error) {
      console.error(`[HotelProvider] ❌ Provider ${provider} failed:`, error.message);
      errors.push({ provider, error: error.message });

      if (!enableFallback) {
        throw error;
      }
    }
  }

  // All providers failed
  console.error('[HotelProvider] ❌ All providers failed');
  return {
    success: false,
    error: 'All hotel search providers failed',
    providers: errors,
    hotels: []
  };
}

module.exports = {
  searchHotels,
  searchWithXotelo,
  searchWithAmadeus,
  searchWithGooglePlaces
};
