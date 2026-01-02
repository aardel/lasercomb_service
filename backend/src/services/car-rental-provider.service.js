/**
 * Car Rental Provider Service
 * Multi-provider abstraction layer for car rental search with automatic fallback
 *
 * Supported Providers:
 * - Rentalcars.com Partner API (FREE partnership) - 60,000 locations, 800+ companies
 * - RapidAPI (FREE tier: 500 requests/month)
 * - Market-based price database (FREE fallback - no API needed)
 */

const axios = require('axios');

// Provider implementations
async function searchWithRentalcars(params) {
  const apiKey = process.env.RENTALCARS_API_KEY;
  if (!apiKey) {
    throw new Error('RENTALCARS_API_KEY not configured');
  }

  console.log(`[CarRentalProvider] Searching with Rentalcars.com: ${params.location}`);

  const url = 'https://www.rentalcars.com/FeedXML/';

  const searchParams = {
    apikey: apiKey,
    pickup_location: params.location,
    dropoff_location: params.dropoffLocation || params.location,
    pickup_date: params.pickupDate,
    pickup_time: params.pickupTime || '10:00',
    dropoff_date: params.dropoffDate,
    dropoff_time: params.dropoffTime || '10:00',
    driver_age: params.driverAge || 30,
    currency: params.currency || 'USD'
  };

  const response = await axios.get(url, {
    params: searchParams,
    timeout: 15000
  });

  // Convert Rentalcars format to our standardized format
  // Note: Actual implementation would parse XML response
  const rentals = (response.data.vehicles || []).map(vehicle => ({
    id: `rentalcars-${vehicle.id}`,
    name: vehicle.name,
    category: vehicle.category || 'Economy',
    company: vehicle.vendor,
    price: parseFloat(vehicle.price),
    currency: vehicle.currency || 'USD',
    pricePerDay: parseFloat(vehicle.pricePerDay || vehicle.price),
    transmission: vehicle.transmission || 'Automatic',
    passengers: vehicle.passengers || 5,
    luggage: vehicle.luggage || 2,
    features: vehicle.features || [],
    provider: 'Rentalcars.com'
  }));

  console.log(`[CarRentalProvider] ✅ Rentalcars.com returned ${rentals.length} vehicles`);

  return {
    success: true,
    provider: 'Rentalcars.com',
    count: rentals.length,
    rentals: rentals
  };
}

async function searchWithRapidAPI(params) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY not configured');
  }

  console.log(`[CarRentalProvider] Searching with RapidAPI: ${params.location}`);

  // Example using a car rental API from RapidAPI marketplace
  const url = 'https://car-rental-api.p.rapidapi.com/search';

  const response = await axios.get(url, {
    params: {
      pickup_location: params.location,
      pickup_date: params.pickupDate,
      dropoff_date: params.dropoffDate
    },
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'car-rental-api.p.rapidapi.com'
    },
    timeout: 15000
  });

  // Convert RapidAPI format to our standardized format
  const rentals = (response.data.results || []).map(vehicle => ({
    id: `rapidapi-${vehicle.id}`,
    name: vehicle.name,
    category: vehicle.category || 'Economy',
    company: vehicle.vendor,
    price: parseFloat(vehicle.total_price),
    currency: vehicle.currency || 'USD',
    pricePerDay: parseFloat(vehicle.price_per_day),
    transmission: vehicle.transmission || 'Automatic',
    passengers: vehicle.seats || 5,
    luggage: vehicle.luggage || 2,
    features: vehicle.features || [],
    provider: 'RapidAPI'
  }));

  console.log(`[CarRentalProvider] ✅ RapidAPI returned ${rentals.length} vehicles`);

  return {
    success: true,
    provider: 'RapidAPI',
    count: rentals.length,
    rentals: rentals
  };
}

async function searchWithMarketPrices(params) {
  console.log(`[CarRentalProvider] Using market-based price database (FREE fallback)`);

  // Calculate rental duration in days
  const pickupDate = new Date(params.pickupDate);
  const dropoffDate = new Date(params.dropoffDate);
  const days = Math.ceil((dropoffDate - pickupDate) / (1000 * 60 * 60 * 24));

  // Market-researched daily rates by category (USD)
  const dailyRates = {
    'Economy': 35,
    'Compact': 42,
    'Midsize': 50,
    'Standard': 60,
    'Full-size': 70,
    'SUV': 85,
    'Luxury': 120,
    'Van': 95
  };

  // Generate typical rental options
  const categories = ['Economy', 'Compact', 'Midsize', 'Standard', 'SUV'];
  const rentals = categories.map((category, idx) => {
    const baseRate = dailyRates[category];
    const totalPrice = baseRate * days;

    return {
      id: `market-${category.toLowerCase()}-${idx}`,
      name: `${category} Car`,
      category: category,
      company: 'Various',
      price: totalPrice,
      currency: 'USD',
      pricePerDay: baseRate,
      transmission: 'Automatic',
      passengers: category === 'SUV' ? 7 : category === 'Economy' ? 4 : 5,
      luggage: category === 'SUV' ? 4 : category === 'Economy' ? 2 : 3,
      features: ['Air Conditioning', 'Power Steering'],
      provider: 'Market Prices',
      isEstimate: true
    };
  });

  console.log(`[CarRentalProvider] ✅ Market prices returned ${rentals.length} estimated vehicles`);

  return {
    success: true,
    provider: 'Market Prices',
    count: rentals.length,
    rentals: rentals,
    isEstimate: true,
    note: 'Prices based on market research - actual prices may vary'
  };
}

/**
 * Main car rental search function with multi-provider support and fallback
 * @param {Object} params - Search parameters
 * @param {string} params.location - Pickup location (airport code or city)
 * @param {string} [params.dropoffLocation] - Dropoff location (defaults to pickup)
 * @param {string} params.pickupDate - Pickup date (YYYY-MM-DD)
 * @param {string} [params.pickupTime='10:00'] - Pickup time (HH:MM)
 * @param {string} params.dropoffDate - Dropoff date (YYYY-MM-DD)
 * @param {string} [params.dropoffTime='10:00'] - Dropoff time (HH:MM)
 * @param {number} [params.driverAge=30] - Driver age
 * @param {string} [params.currency='USD'] - Currency code
 * @param {Object} [options] - Provider options
 * @param {Array<string>} [options.providers=['market']] - Provider priority order
 * @param {boolean} [options.enableFallback=true] - Enable fallback to next provider on failure
 * @returns {Promise<Object>} Standardized car rental search results
 */
async function searchCarRentals(params, options = {}) {
  const {
    providers = ['market'], // Default: Market prices only (no API costs)
    enableFallback = true
  } = options;

  console.log(`[CarRentalProvider] Searching car rentals with providers: ${providers.join(' → ')}`);

  const errors = [];

  for (const provider of providers) {
    try {
      let result;

      switch (provider) {
        case 'rentalcars':
          result = await searchWithRentalcars(params);
          break;
        case 'rapidapi':
          result = await searchWithRapidAPI(params);
          break;
        case 'market':
          result = await searchWithMarketPrices(params);
          break;
        default:
          console.warn(`[CarRentalProvider] Unknown provider: ${provider}`);
          continue;
      }

      // Return first successful result
      if (result.success && result.rentals.length > 0) {
        return result;
      }

      console.log(`[CarRentalProvider] Provider ${provider} returned no results, trying next...`);
    } catch (error) {
      console.error(`[CarRentalProvider] ❌ Provider ${provider} failed:`, error.message);
      errors.push({ provider, error: error.message });

      if (!enableFallback) {
        throw error;
      }
    }
  }

  // All providers failed - return market prices as ultimate fallback
  console.warn('[CarRentalProvider] All configured providers failed, using market prices as fallback');
  return await searchWithMarketPrices(params);
}

module.exports = {
  searchCarRentals,
  searchWithRentalcars,
  searchWithRapidAPI,
  searchWithMarketPrices
};
