/**
 * Flight Search Provider Service
 * Multi-provider abstraction layer for flight search with automatic fallback
 *
 * Supported Providers:
 * - Serper (Google Flights via Serper API) - FREE tier: 2,500 queries, then $1/1,000 (15x cheaper than SerpAPI)
 * - Amadeus (Official airline data) - FREE tier: 2,000 requests/month
 * - Groq AI (AI-powered estimates) - FREE tier: 14,400 requests/day
 * - SerpAPI (Google Flights) - Legacy, expensive: $75/month for 5,000 searches
 */

const axios = require('axios');

// Provider implementations
async function searchWithSerper(params) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY not configured');
  }

  console.log(`[FlightProvider] Searching with Serper: ${params.origin} → ${params.destination}`);

  // Serper uses the /search endpoint with engine parameter
  const url = 'https://google.serper.dev/search';

  const searchParams = {
    q: `flights from ${params.origin} to ${params.destination}`,
    engine: 'google_flights',
    departure_id: params.origin,
    arrival_id: params.destination,
    outbound_date: params.departureDate,
    type: params.returnDate ? 1 : 2, // type=1 for round-trip, type=2 for one-way
    gl: 'us',
    hl: 'en'
  };

  if (params.returnDate) {
    searchParams.return_date = params.returnDate;
  }

  const response = await axios.post(url, searchParams, {
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  // Convert Serper format to our standardized format
  const flights = (response.data.best_flights || []).map(flight => ({
    id: `serper-${flight.flight_id || Math.random()}`,
    price: flight.price,
    currency: 'USD',
    airline: flight.airline,
    departure: {
      airport: params.origin,
      time: flight.departure_time,
      date: params.departureDate
    },
    arrival: {
      airport: params.destination,
      time: flight.arrival_time,
      date: params.departureDate
    },
    duration: flight.total_duration,
    stops: flight.stops || 0,
    provider: 'Serper'
  }));

  console.log(`[FlightProvider] ✅ Serper returned ${flights.length} flights`);

  return {
    success: true,
    provider: 'Serper',
    count: flights.length,
    flights: flights
  };
}

async function searchWithAmadeus(params) {
  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('AMADEUS_API_KEY or AMADEUS_API_SECRET not configured');
  }

  console.log(`[FlightProvider] Searching with Amadeus: ${params.origin} → ${params.destination}`);

  // Get access token (should be cached in production)
  const tokenResponse = await axios.post(
    'https://test.api.amadeus.com/v1/security/oauth2/token',
    'grant_type=client_credentials&client_id=' + apiKey + '&client_secret=' + apiSecret,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    }
  );

  const accessToken = tokenResponse.data.access_token;

  // Search flights
  const searchParams = {
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departureDate,
    adults: params.passengers || 1,
    max: params.maxResults || 5
  };

  if (params.returnDate) {
    searchParams.returnDate = params.returnDate;
  }

  const flightResponse = await axios.get(
    'https://test.api.amadeus.com/v2/shopping/flight-offers',
    {
      params: searchParams,
      headers: { 'Authorization': `Bearer ${accessToken}` },
      timeout: 15000
    }
  );

  // Convert Amadeus format to our standardized format
  const flights = (flightResponse.data.data || []).map(offer => {
    const firstSegment = offer.itineraries[0].segments[0];
    const lastSegment = offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1];

    return {
      id: `amadeus-${offer.id}`,
      price: parseFloat(offer.price.total),
      currency: offer.price.currency,
      airline: firstSegment.carrierCode,
      departure: {
        airport: firstSegment.departure.iataCode,
        time: firstSegment.departure.at,
        date: params.departureDate
      },
      arrival: {
        airport: lastSegment.arrival.iataCode,
        time: lastSegment.arrival.at,
        date: params.departureDate
      },
      duration: offer.itineraries[0].duration,
      stops: offer.itineraries[0].segments.length - 1,
      provider: 'Amadeus'
    };
  });

  console.log(`[FlightProvider] ✅ Amadeus returned ${flights.length} flights`);

  return {
    success: true,
    provider: 'Amadeus',
    count: flights.length,
    flights: flights
  };
}

async function searchWithGroq(params) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log(`[FlightProvider] Searching with Groq AI: ${params.origin} → ${params.destination}`);

  const prompt = `Find flight options from ${params.origin} to ${params.destination} on ${params.departureDate}${params.returnDate ? ` returning ${params.returnDate}` : ''}. Provide 3-5 realistic flight options with airlines, approximate prices in USD, departure/arrival times, and number of stops. Format as JSON array.`;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a flight search assistant. Provide realistic flight options based on typical routes and pricing. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  const aiResponse = response.data.choices[0].message.content;

  // Parse AI response (this is a simplified example, production would need better parsing)
  let flights = [];
  try {
    const parsed = JSON.parse(aiResponse);
    flights = Array.isArray(parsed) ? parsed : parsed.flights || [];

    // Standardize format
    flights = flights.map((flight, idx) => ({
      id: `groq-${Date.now()}-${idx}`,
      price: flight.price || 500,
      currency: 'USD',
      airline: flight.airline || 'Various',
      departure: {
        airport: params.origin,
        time: flight.departureTime || '10:00',
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: flight.arrivalTime || '14:00',
        date: params.departureDate
      },
      duration: flight.duration || '4h',
      stops: flight.stops || 0,
      provider: 'Groq AI (Estimated)',
      isEstimate: true
    }));
  } catch (error) {
    console.warn('[FlightProvider] Failed to parse Groq AI response, returning empty results');
    flights = [];
  }

  console.log(`[FlightProvider] ✅ Groq AI returned ${flights.length} estimated flights`);

  return {
    success: true,
    provider: 'Groq AI',
    count: flights.length,
    flights: flights,
    isEstimate: true
  };
}

async function searchWithSerpAPI(params) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY not configured');
  }

  console.log(`[FlightProvider] ⚠️ Using SerpAPI (expensive): ${params.origin} → ${params.destination}`);

  const searchParams = {
    engine: 'google_flights',
    departure_id: params.origin,
    arrival_id: params.destination,
    outbound_date: params.departureDate,
    type: params.returnDate ? '1' : '2', // 1 = round trip, 2 = one way
    api_key: apiKey
  };

  if (params.returnDate) {
    searchParams.return_date = params.returnDate;
  }

  const response = await axios.get('https://serpapi.com/search', {
    params: searchParams,
    timeout: 15000
  });

  // Convert SerpAPI format to our standardized format
  const flights = (response.data.best_flights || []).map(flight => ({
    id: `serpapi-${flight.flight_id || Math.random()}`,
    price: flight.price,
    currency: 'USD',
    airline: flight.airline,
    departure: {
      airport: params.origin,
      time: flight.departure_time,
      date: params.departureDate
    },
    arrival: {
      airport: params.destination,
      time: flight.arrival_time,
      date: params.departureDate
    },
    duration: flight.total_duration,
    stops: flight.stops || 0,
    provider: 'SerpAPI'
  }));

  console.log(`[FlightProvider] ✅ SerpAPI returned ${flights.length} flights`);

  return {
    success: true,
    provider: 'SerpAPI',
    count: flights.length,
    flights: flights
  };
}

/**
 * Main flight search function with multi-provider support and fallback
 * @param {Object} params - Search parameters
 * @param {string} params.origin - Origin airport code (IATA)
 * @param {string} params.destination - Destination airport code (IATA)
 * @param {string} params.departureDate - Departure date (YYYY-MM-DD)
 * @param {string} [params.returnDate] - Return date for round trip (YYYY-MM-DD)
 * @param {number} [params.passengers=1] - Number of passengers
 * @param {number} [params.maxResults=5] - Maximum results to return
 * @param {Object} [options] - Provider options
 * @param {Array<string>} [options.providers=['serper', 'amadeus', 'groq']] - Provider priority order
 * @param {boolean} [options.enableFallback=true] - Enable fallback to next provider on failure
 * @returns {Promise<Object>} Standardized flight search results
 */
async function searchFlights(params, options = {}) {
  const {
    providers = ['serper', 'amadeus', 'groq'], // Default priority: Serper (cheapest) → Amadeus (free) → Groq (AI estimates)
    enableFallback = true
  } = options;

  console.log(`[FlightProvider] Searching flights with providers: ${providers.join(' → ')}`);

  const errors = [];

  for (const provider of providers) {
    try {
      let result;

      switch (provider) {
        case 'serper':
          result = await searchWithSerper(params);
          break;
        case 'amadeus':
          result = await searchWithAmadeus(params);
          break;
        case 'groq':
          result = await searchWithGroq(params);
          break;
        case 'serpapi':
          result = await searchWithSerpAPI(params);
          break;
        default:
          console.warn(`[FlightProvider] Unknown provider: ${provider}`);
          continue;
      }

      // Return first successful result
      if (result.success && result.flights.length > 0) {
        return result;
      }

      console.log(`[FlightProvider] Provider ${provider} returned no results, trying next...`);
    } catch (error) {
      console.error(`[FlightProvider] ❌ Provider ${provider} failed:`, error.message);
      errors.push({ provider, error: error.message });

      if (!enableFallback) {
        throw error;
      }
    }
  }

  // All providers failed
  console.error('[FlightProvider] ❌ All providers failed');
  return {
    success: false,
    error: 'All flight search providers failed',
    providers: errors,
    flights: []
  };
}

module.exports = {
  searchFlights,
  searchWithSerper,
  searchWithAmadeus,
  searchWithGroq,
  searchWithSerpAPI
};
