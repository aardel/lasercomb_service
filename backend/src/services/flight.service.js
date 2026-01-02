const amadeus = require('./amadeus.client');
const axios = require('axios');
const { findNearestAirport } = require('./airport.service');
const { getCarRentalOptions } = require('./car-rental.service');

const TRAVEL_HOUR_RATE = 98; // €/hour

/**
 * Parse ISO 8601 duration (PT1H30M) to minutes
 */
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    // Handle both ISO format (PT1H30M) and simple format (1h 30m)
    let durationMinutes = 0;
    const hoursMatch = durationStr.match(/(\d+)H/i) || durationStr.match(/(\d+)\s*h/i);
    const minsMatch = durationStr.match(/(\d+)M/i) || durationStr.match(/(\d+)\s*m/i);
    if (hoursMatch) durationMinutes += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) durationMinutes += parseInt(minsMatch[1]);
    return durationMinutes;
}

/**
 * Search Google Flights via SerpAPI (third-party service)
 * Falls back to Amadeus if SerpAPI is unavailable
 */
async function searchGoogleFlights(originAirport, destAirport, departureDate, returnDate, limit) {
    console.log(`[FlightService] 🔍 searchGoogleFlights called: ${originAirport?.code} → ${destAirport?.code}, dates: ${departureDate}${returnDate ? ` to ${returnDate}` : ' (one-way)'}`);
    
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
        console.log('[FlightService] ❌ SERPAPI_KEY not configured, skipping Google Flights');
        return null;
    }
    console.log(`[FlightService] ✓ SERPAPI_KEY found (length: ${serpApiKey.length})`);

    try {
        console.log(`[FlightService] 🔍 Trying Google Flights via SerpAPI: ${originAirport.code} → ${destAirport.code}`);
        console.log(`[FlightService] Dates: ${departureDate}${returnDate ? ` to ${returnDate}` : ' (one-way)'}`);
        
        // Validate dates are in the future (SerpAPI requirement)
        const depDate = new Date(departureDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (depDate < today) {
            console.log(`[FlightService] ⚠️ Departure date ${departureDate} is in the past, skipping SerpAPI (requires future dates)`);
            return null;
        }
        
        const params = {
            engine: 'google_flights',
            departure_id: originAirport.code,
            arrival_id: destAirport.code,
            outbound_date: departureDate,
            type: returnDate ? '1' : '2', // type=1 for round-trip, type=2 for one-way
            api_key: serpApiKey
        };

        if (returnDate) {
            const retDate = new Date(returnDate);
            if (retDate < today) {
                console.log(`[FlightService] ⚠️ Return date ${returnDate} is in the past, skipping SerpAPI`);
                return null;
            }
            params.return_date = returnDate;
        }

        console.log(`[FlightService] SerpAPI request params:`, JSON.stringify({ ...params, api_key: '***' }, null, 2));
        
        const response = await axios.get('https://serpapi.com/search', { 
            params, 
            timeout: 15000 
        });
        
        console.log(`[FlightService] SerpAPI response status: ${response.status}`);
        console.log(`[FlightService] Has best_flights: ${!!response.data?.best_flights}, count: ${response.data?.best_flights?.length || 0}`);
        console.log(`[FlightService] Has other_flights: ${!!response.data?.other_flights}, count: ${response.data?.other_flights?.length || 0}`);
        
        // Helper function to parse SerpAPI flight leg
        const parseSerpAPIFlightLeg = (flightLeg, date) => {
            if (!flightLeg) return null;
            
            const depAirport = flightLeg.departure_airport || {};
            const arrAirport = flightLeg.arrival_airport || {};
            
            // Extract time from "2026-01-20 08:40" format
            const depTime = depAirport.time ? depAirport.time.split(' ')[1] || '' : '';
            const arrTime = arrAirport.time ? arrAirport.time.split(' ')[1] || '' : '';
            
            // Duration is already in minutes
            const duration = flightLeg.duration || 0;
            
            return {
                airline: flightLeg.airline || 'Unknown',
                flight_number: flightLeg.flight_number || 'N/A',
                departure_time: depTime.substring(0, 5), // HH:MM format
                arrival_time: arrTime.substring(0, 5), // HH:MM format
                date: date,
                duration_minutes: duration,
                from: depAirport.id || '',
                to: arrAirport.id || '',
                routing: `${depAirport.id || ''} → ${arrAirport.id || ''}`,
                stops: 0, // SerpAPI doesn't provide layovers in this structure
                segments: []
            };
        };
        
        // Check both best_flights and other_flights
        let flightOptions = [];
        if (response.data?.best_flights && response.data.best_flights.length > 0) {
            flightOptions = response.data.best_flights;
        } else if (response.data?.other_flights && response.data.other_flights.length > 0) {
            flightOptions = response.data.other_flights;
        }
        
        if (flightOptions.length > 0) {
            const flights = flightOptions.slice(0, limit).map((flight, index) => {
                // SerpAPI structure: flight.flights is an array of ALL segments (both outbound and return)
                // For round-trip flights, we need to separate them by date
                let outboundSegments = [];
                let returnSegments = [];

                if (flight.flights && flight.flights.length > 0) {
                    if (returnDate) {
                        // Round-trip: separate segments by date
                        outboundSegments = flight.flights.filter(f => {
                            const segmentDate = f.departure_airport?.time?.split(' ')[0];
                            return segmentDate === departureDate;
                        });
                        returnSegments = flight.flights.filter(f => {
                            const segmentDate = f.departure_airport?.time?.split(' ')[0];
                            return segmentDate === returnDate;
                        });

                        console.log(`[FlightService] Flight ${index + 1}: ${outboundSegments.length} outbound segments, ${returnSegments.length} return segments`);
                    } else {
                        // One-way: all segments are outbound
                        outboundSegments = flight.flights;
                    }
                }

                // Build combined leg from multiple segments
                const buildCombinedLeg = (segments, date) => {
                    if (!segments || segments.length === 0) return null;

                    const firstSeg = segments[0];
                    const lastSeg = segments[segments.length - 1];

                    // Build routing string showing all stops
                    const airports = [firstSeg.departure_airport?.id];
                    segments.forEach(seg => airports.push(seg.arrival_airport?.id));
                    const routing = airports.filter(a => a).join(' → ');

                    // Extract times
                    const depTime = firstSeg.departure_airport?.time?.split(' ')[1] || '';
                    const arrTime = lastSeg.arrival_airport?.time?.split(' ')[1] || '';

                    // Calculate total duration
                    const totalDuration = segments.reduce((sum, seg) => sum + (seg.duration || 0), 0);

                    return {
                        airline: firstSeg.airline || 'Multiple',
                        flight_number: segments.length > 1 ? 'Multiple' : (firstSeg.flight_number || 'N/A'),
                        departure_time: depTime.substring(0, 5),
                        arrival_time: arrTime.substring(0, 5),
                        date: date,
                        duration_minutes: totalDuration,
                        from: firstSeg.departure_airport?.id || '',
                        to: lastSeg.arrival_airport?.id || '',
                        routing: routing,
                        stops: segments.length - 1,
                        segments: segments.map(seg => ({
                            from: seg.departure_airport?.id,
                            to: seg.arrival_airport?.id,
                            airline: seg.airline,
                            flight_number: seg.flight_number,
                            departure_time: seg.departure_airport?.time?.split(' ')[1]?.substring(0, 5),
                            arrival_time: seg.arrival_airport?.time?.split(' ')[1]?.substring(0, 5),
                            duration_minutes: seg.duration
                        }))
                    };
                };

                const outbound = buildCombinedLeg(outboundSegments, departureDate);
                const returnLeg = buildCombinedLeg(returnSegments, returnDate);

                // Parse price (could be number or string like "235" or "€235")
                let price = 0;
                if (typeof flight.price === 'number') {
                    price = flight.price;
                } else if (typeof flight.price === 'string') {
                    const priceStr = flight.price.replace(/[^0-9.]/g, '');
                    price = parseFloat(priceStr) || 0;
                }

                return {
                    id: `google-${index}-${Date.now()}`,
                    price: price,
                    total_price: price,
                    is_round_trip: !!returnDate,
                    is_one_way: !returnDate,
                    outbound: outbound,
                    return: returnLeg,
                    type: 'STANDARD',
                    source: 'Google Flights (SerpAPI)'
                };
            });

            console.log(`[FlightService] ✓ Found ${flights.length} flights from Google Flights`);
            console.log(`[FlightService] Sample flight:`, JSON.stringify(flights[0], null, 2).substring(0, 500));
            return flights;
        }
        
        console.log(`[FlightService] ⚠️ No flights found in SerpAPI response`);
        return null;
    } catch (error) {
        console.warn('[FlightService] ❌ Google Flights (SerpAPI) error:', error.message);
        if (error.response) {
            console.warn('[FlightService] Response status:', error.response.status);
            console.warn('[FlightService] Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
        }
        return null;
    }
}

/**
 * Search flights using Groq AI API
 * Uses AI to generate realistic flight options based on route knowledge
 */
async function searchGroqFlights(originAirport, destAirport, departureDate, returnDate, limit) {
    console.log(`[FlightService] 🤖 searchGroqFlights called: ${originAirport?.code} → ${destAirport?.code}, dates: ${departureDate}${returnDate ? ` to ${returnDate}` : ' (one-way)'}`);
    
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
        console.log('[FlightService] ❌ GROQ_API_KEY not configured, skipping Groq');
        return null;
    }
    console.log(`[FlightService] ✓ GROQ_API_KEY found`);

    try {
        const isRoundTrip = !!returnDate;
        const searchType = isRoundTrip ? 'round-trip' : 'one-way';
        
        // Build the prompt for Groq
        const prompt = `You are a flight search assistant. Find ${searchType} flights from ${originAirport.name} Airport (${originAirport.code}) to ${destAirport.name} Airport (${destAirport.code}).

${isRoundTrip ? `Departure: ${departureDate}\nReturn: ${returnDate}` : `Departure: ${departureDate}`}
Maximum ${limit} options

REQUIREMENTS:
- Provide ONLY real, bookable flights that exist
- Include actual flight numbers (e.g., LH1155, EW511)
- Use real airline codes (Lufthansa=LH, Eurowings=EW, etc.)
- Provide realistic prices in EUR (economy class, basic fare)
- Include actual connection airports and layover times
- Calculate total travel time including layovers

OUTPUT FORMAT (JSON only, no other text):
{
  "options": [
    {
      "id": "option_1",
      "price_eur": 184,
      "currency": "EUR",
      "departure_date": "${departureDate}",
      ${isRoundTrip ? `"return_date": "${returnDate}",` : ''}
      "is_round_trip": ${isRoundTrip},
      "outbound": {
        "routing": "STR → FRA → BGY",
        "departure_time": "06:25",
        "arrival_time": "10:55",
        "duration_minutes": 270,
        "stops": 1,
        "segments": [
          {
            "airline": "LH",
            "airline_name": "Lufthansa",
            "flight_number": "LH1155",
            "from": "STR",
            "to": "FRA",
            "departure_time": "06:25",
            "arrival_time": "08:00",
            "duration_minutes": 95
          },
          {
            "airline": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ620",
            "from": "FRA",
            "to": "BGY",
            "departure_time": "08:35",
            "arrival_time": "10:55",
            "duration_minutes": 140,
            "layover_minutes": 35
          }
        ]
      }${isRoundTrip ? `,
      "return": {
        "routing": "BGY → FRA → STR",
        "departure_time": "12:30",
        "arrival_time": "17:05",
        "duration_minutes": 275,
        "stops": 1,
        "segments": [
          {
            "airline": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ620",
            "from": "BGY",
            "to": "FRA",
            "departure_time": "12:30",
            "arrival_time": "14:55",
            "duration_minutes": 145
          },
          {
            "airline": "LH",
            "airline_name": "Lufthansa",
            "flight_number": "LH1156",
            "from": "FRA",
            "to": "STR",
            "departure_time": "15:20",
            "arrival_time": "17:05",
            "duration_minutes": 105,
            "layover_minutes": 25
          }
        ]
      },
      "total_duration_minutes": 545` : ''},
      "provider": "groq_estimated"
    }
  ]
}

IMPORTANT: 
- Use only real flight numbers and routes
- If uncertain about a specific flight, mark provider as "estimated"
- Prices should be realistic for the route and date
- All times in 24-hour format (HH:MM)
- All durations in minutes
- Return ONLY valid JSON, no markdown, no code blocks, no explanations`;

        console.log(`[FlightService] 🤖 Calling Groq API...`);
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile', // Updated to current model
            messages: [
                {
                    role: 'system',
                    content: 'You are a flight search API. Return only valid JSON with flight options. No explanations, no markdown formatting.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3, // Lower temperature for more consistent results
            max_tokens: 4000,
            response_format: { type: 'json_object' } // Force JSON output
        }, {
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });

        console.log(`[FlightService] 🤖 Groq API response status: ${response.status}`);
        
        if (!response.data || !response.data.choices || !response.data.choices[0]) {
            console.log('[FlightService] ❌ Invalid Groq API response structure');
            return null;
        }

        const content = response.data.choices[0].message.content;
        console.log(`[FlightService] 🤖 Groq response length: ${content.length} characters`);
        
        // Parse JSON response
        let groqData;
        try {
            // Remove any markdown code blocks if present
            const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            groqData = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('[FlightService] ❌ Failed to parse Groq JSON response:', parseError.message);
            console.error('[FlightService] Response content (first 500 chars):', content.substring(0, 500));
            return null;
        }

        if (!groqData.options || !Array.isArray(groqData.options) || groqData.options.length === 0) {
            console.log('[FlightService] ⚠️ No flight options in Groq response');
            return null;
        }

        // Map Groq response to current system format
        const flights = groqData.options.slice(0, limit).map((option, index) => {
            // Build routing string from segments
            const buildRouting = (segments) => {
                if (!segments || segments.length === 0) return '';
                const airports = [segments[0].from];
                segments.forEach(seg => airports.push(seg.to));
                return airports.join(' → ');
            };

            // Parse outbound
            const outboundSegments = (option.outbound?.segments || []).map(seg => ({
                airline: seg.airline,
                flight_number: seg.flight_number,
                from: seg.from,
                to: seg.to,
                departure_time: seg.departure_time,
                arrival_time: seg.arrival_time,
                duration_minutes: seg.duration_minutes,
                routing: `${seg.from} → ${seg.to}`,
                airline_name: seg.airline_name,
                layover_minutes: seg.layover_minutes
            }));

            // Parse return (if round-trip)
            let returnSegments = null;
            if (isRoundTrip && option.return) {
                returnSegments = (option.return.segments || []).map(seg => ({
                    airline: seg.airline,
                    flight_number: seg.flight_number,
                    from: seg.from,
                    to: seg.to,
                    departure_time: seg.departure_time,
                    arrival_time: seg.arrival_time,
                    duration_minutes: seg.duration_minutes,
                    routing: `${seg.from} → ${seg.to}`,
                    airline_name: seg.airline_name,
                    layover_minutes: seg.layover_minutes
                }));
            }

            return {
                id: `groq-${index}-${Date.now()}`,
                price: option.price_eur || option.price || 0,
                total_price: option.price_eur || option.price || 0,
                is_round_trip: isRoundTrip,
                is_one_way: !isRoundTrip,
                outbound: {
                    routing: option.outbound?.routing || buildRouting(option.outbound?.segments),
                    departure_time: option.outbound?.departure_time || '',
                    arrival_time: option.outbound?.arrival_time || '',
                    duration_minutes: option.outbound?.duration_minutes || 0,
                    stops: option.outbound?.stops || 0,
                    segments: outboundSegments
                },
                return: isRoundTrip && returnSegments ? {
                    routing: option.return?.routing || buildRouting(option.return?.segments),
                    departure_time: option.return?.departure_time || '',
                    arrival_time: option.return?.arrival_time || '',
                    duration_minutes: option.return?.duration_minutes || 0,
                    stops: option.return?.stops || 0,
                    segments: returnSegments
                } : null,
                type: 'STANDARD',
                source: 'Groq AI',
                provider: option.provider || 'groq_estimated'
            };
        });

        console.log(`[FlightService] ✓ Found ${flights.length} flights from Groq AI`);
        console.log(`[FlightService] Sample flight:`, JSON.stringify(flights[0], null, 2).substring(0, 500));
        return flights;

    } catch (error) {
        console.warn('[FlightService] ❌ Groq API error:', error.message);
        if (error.response) {
            console.warn('[FlightService] Response status:', error.response.status);
            console.warn('[FlightService] Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
        }
        return null;
    }
}

/**
 * Search for ROUND-TRIP flights using Amadeus API
 * This returns a single price for both outbound + return, which is cheaper than 2 one-ways
 *
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @param {string} departureDate - YYYY-MM-DD
 * @param {string} returnDate - YYYY-MM-DD
 * @param {number} limit - Maximum number of flight options to return (default: 5)
 * @returns {Promise<Object>} - Flight options and airport info
 */
async function searchFlights(origin, destination, departureDate, returnDate = null, limit = 5, cachedOriginAirports = null, cachedDestAirports = null, apiPreferences = null) {
    try {
        console.log(`[FlightService] searchFlights called with limit: ${limit}`);
        
        // Use cached airports if available (from technician settings)
        // Filter out invalid airports to avoid using stale/deleted airports
        let originAirport, destAirport;
        
        const validCachedOriginAirports = cachedOriginAirports?.filter(a => a && a.code) || [];
        const validCachedDestAirports = cachedDestAirports?.filter(a => a && a.code) || [];
        
        if (validCachedOriginAirports.length > 0) {
            // Use first cached airport (closest one)
            const cached = validCachedOriginAirports[0];
            originAirport = {
                code: cached.code,
                name: cached.name,
                lat: cached.lat,
                lng: cached.lng,
                distance_km: cached.distance_km || 0,
                source: 'cached'
            };
            console.log(`[FlightService] Using cached origin airport: ${originAirport.code} (from ${validCachedOriginAirports.length} valid airports)`);
        } else {
            console.log(`[FlightService] No valid cached origin airports, finding nearest...`);
            try {
                originAirport = await findNearestAirport(origin);
            } catch (airportError) {
                console.error('[FlightService] Error finding origin airport:', airportError);
                return {
                    success: false,
                    error: 'Failed to find origin airport',
                    message: airportError.message || 'Unknown error occurred while searching for origin airport',
                    options: []
                };
            }
        }
        
        if (validCachedDestAirports.length > 0) {
            // Use first cached airport (closest one)
            const cached = validCachedDestAirports[0];
            destAirport = {
                code: cached.code,
                name: cached.name,
                lat: cached.lat,
                lng: cached.lng,
                distance_km: cached.distance_km || 0,
                source: 'cached'
            };
            console.log(`[FlightService] Using cached destination airport: ${destAirport.code} (from ${validCachedDestAirports.length} valid airports)`);
        } else {
            console.log(`[FlightService] No valid cached destination airports, finding nearest...`);
            try {
                destAirport = await findNearestAirport(destination);
            } catch (airportError) {
                console.error('[FlightService] Error finding destination airport:', airportError);
                return {
                    success: false,
                    error: 'Failed to find destination airport',
                    message: airportError.message || 'Unknown error occurred while searching for destination airport',
                    options: []
                };
            }
        }

        if (!originAirport || !destAirport || !originAirport.code || !destAirport.code) {
            console.error('[FlightService] Could not resolve airport codes:',
                { origin: originAirport?.code, dest: destAirport?.code });
            return {
                success: false,
                error: `Could not resolve IATA codes for ${!originAirport?.code ? 'origin' : 'destination'}`
            };
        }

        // 0. Check if origin and destination are the same
        if (originAirport.code === destAirport.code) {
            console.log(`[FlightService] Same airport for origin and destination: ${originAirport.code}. Skipping flight search.`);
            return {
                success: true,
                origin_airport: originAirport,
                destination_airport: destAirport,
                distance_km: 0,
                options: [],
                travel_metrics: { total_travel_minutes: 0, total_travel_hours: 0, travel_time_cost: 0 },
                statistics: { flights_analyzed: 0, cheapest: 0, median: 0, most_expensive: 0 },
                rental_car_options: []
            };
        }

        // Calculate distance for mock pricing
        const R = 6371;
        const dLat = (destAirport.lat - originAirport.lat) * Math.PI / 180;
        const dLng = (destAirport.lng - originAirport.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(originAirport.lat * Math.PI / 180) * Math.cos(destAirport.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Determine if this is a one-way or round-trip search
        const isOneWay = returnDate === null;
        
        // For round-trip: Ensure return date is at least 1 day after departure (Amadeus requirement)
        let actualReturnDate = returnDate;
        if (!isOneWay && returnDate) {
            const depDate = new Date(departureDate);
            const retDate = new Date(returnDate);

            // If return date is same day or before departure, add 1 day
            if (retDate <= depDate) {
                const nextDay = new Date(depDate);
                nextDay.setDate(nextDay.getDate() + 1);
                actualReturnDate = nextDay.toISOString().split('T')[0];
                console.log(`[FlightService] Adjusted return date from ${returnDate} to ${actualReturnDate} (Amadeus requires min 1-day gap)`);
            }
        }

        // Always fetch fresh data - no caching
        console.log(`[FlightService] 🔄 Fetching fresh flight data for ${originAirport.code} <-> ${destAirport.code}`);

        let roundTripFlights = [];
        let provider = 'Amadeus API';
        
        console.log(`[FlightService] 🔄 Starting flight search: ${originAirport.code} ↔ ${destAirport.code}`);
        
        // Determine which APIs to use based on preferences
        const defaultApiSettings = {
            googleFlights: { enabled: true, priority: 1 },
            groq: { enabled: true, priority: 2 },
            amadeus: { enabled: true, priority: 3 }
        };

        // Handle both direct apiPreferences and apiPreferences.flightApis
        let apiSettings;
        if (apiPreferences) {
            if (apiPreferences.flightApis) {
                apiSettings = apiPreferences.flightApis;
            } else if (apiPreferences.googleFlights || apiPreferences.groq || apiPreferences.amadeus) {
                // Direct structure
                apiSettings = apiPreferences;
            } else {
                apiSettings = defaultApiSettings;
            }
        } else {
            apiSettings = defaultApiSettings;
        }
        
        console.log(`[FlightService] Received API preferences:`, JSON.stringify(apiSettings, null, 2));
        
        // Sort APIs by priority (lower number = higher priority), but ONLY include enabled ones
        const enabledApis = Object.entries(apiSettings)
            .filter(([key, config]) => {
                // Check if config exists and is an object
                if (!config || typeof config !== 'object') {
                    console.log(`[FlightService] API ${key}: Invalid config, skipping`);
                    return false;
                }
                // Explicitly check if enabled is true (not just "not false")
                const isEnabled = config.enabled === true;
                console.log(`[FlightService] API ${key}: enabled=${config.enabled} (${typeof config.enabled}), isEnabled=${isEnabled}`);
                return isEnabled;
            })
            .sort((a, b) => {
                const priorityA = a[1]?.priority || 999;
                const priorityB = b[1]?.priority || 999;
                return priorityA - priorityB;
            })
            .map(([key]) => key);
        
        console.log(`[FlightService] ✅ Enabled APIs (in priority order): ${enabledApis.length > 0 ? enabledApis.join(', ') : 'NONE'}`);
        
        // If no APIs are enabled, log warning and use defaults
        if (enabledApis.length === 0) {
            console.warn(`[FlightService] ⚠️ No APIs enabled! Using default settings.`);
            enabledApis.push('googleFlights', 'amadeus');
            apiSettings = defaultApiSettings;
        }
        
        // Try APIs in priority order
        for (const apiName of enabledApis) {
            if (roundTripFlights.length > 0) {
                break; // Stop if we already have results
            }
            
            if (apiName === 'googleFlights') {
                console.log(`[FlightService] 📞 Trying Google Flights (priority ${apiSettings.googleFlights?.priority || 1})...`);
                try {
                    const googleFlights = await searchGoogleFlights(originAirport, destAirport, departureDate, actualReturnDate, limit);
                    console.log(`[FlightService] 📞 searchGoogleFlights returned: ${googleFlights ? googleFlights.length + ' flights' : 'null/empty'}`);
                    
                    if (googleFlights && googleFlights.length > 0) {
                        roundTripFlights = googleFlights;
                        provider = 'Google Flights (SerpAPI)';
                        console.log(`[FlightService] ✓ Using Google Flights results (${roundTripFlights.length} flights)`);
                        break;
                    }
                } catch (apiError) {
                    console.error('[FlightService] ❌ Google Flights API error:', apiError.message);
                    // Continue to next API
                }
            } else if (apiName === 'groq') {
                console.log(`[FlightService] 🤖 Trying Groq AI (priority ${apiSettings.groq?.priority || 2})...`);
                try {
                    const groqFlights = await searchGroqFlights(originAirport, destAirport, departureDate, actualReturnDate, limit);
                    console.log(`[FlightService] 🤖 searchGroqFlights returned: ${groqFlights ? groqFlights.length + ' flights' : 'null/empty'}`);
                    
                    if (groqFlights && groqFlights.length > 0) {
                        roundTripFlights = groqFlights;
                        provider = 'Groq AI';
                        console.log(`[FlightService] ✓ Using Groq AI results (${roundTripFlights.length} flights)`);
                        break;
                    }
                } catch (apiError) {
                    console.error('[FlightService] ❌ Groq AI API error:', apiError.message);
                    // Continue to next API
                }
            } else if (apiName === 'amadeus') {
                console.log(`[FlightService] 📞 Trying Amadeus API (priority ${apiSettings.amadeus?.priority || 2})...`);
            
            // Try fetching flight data from Amadeus API (one-way or round-trip)
            if ((process.env.AMADEUS_API_KEY || process.env.AMADEUS_CLIENT_ID) &&
                (process.env.AMADEUS_API_SECRET || process.env.AMADEUS_CLIENT_SECRET)) {
                try {
                    const searchType = isOneWay ? 'ONE-WAY' : 'ROUND-TRIP';
                    console.log(`Fetching ${searchType} flights: ${originAirport.code} ${isOneWay ? '→' : '↔'} ${destAirport.code}, ${departureDate}${!isOneWay ? ` to ${actualReturnDate}` : ''}`);

                    const searchParams = {
                        originLocationCode: originAirport.code,
                        destinationLocationCode: destAirport.code,
                        departureDate: departureDate,
                        adults: '1',
                        max: String(Math.min(Math.max(limit, 1), 20)) // Limit between 1-20
                    };

                    // Only add returnDate for round-trip searches
                    if (!isOneWay && actualReturnDate) {
                        searchParams.returnDate = actualReturnDate;
                    }

                    const response = await amadeus.shopping.flightOffersSearch.get(searchParams);

                    if (response.data && response.data.length > 0) {
                        roundTripFlights = response.data.map((offer) => {
                            // One-way offers have 1 itinerary, round-trip have 2: [0] = outbound, [1] = return
                            const outbound = offer.itineraries[0];
                            const returnIt = isOneWay ? null : offer.itineraries[1];

                            // Function to parse an itinerary with multiple segments
                            const parseItinerary = (itinerary, isReturn = false) => {
                                if (!itinerary) return null;
                                const segments = itinerary.segments;

                                // Map segments to a simpler format
                                const parsedSegments = segments.map(seg => ({
                                    airline: seg.carrierCode,
                                    flight_number: `${seg.carrierCode}${seg.number}`,
                                    from: seg.departure.iataCode,
                                    to: seg.arrival.iataCode,
                                    departure_at: seg.departure.at,
                                    arrival_at: seg.arrival.at,
                                    duration_minutes: parseDuration(seg.duration)
                                }));

                                // Extract routing summary (e.g., MLA -> MUC -> STR)
                                const airports = [segments[0].departure.iataCode];
                                segments.forEach(seg => airports.push(seg.arrival.iataCode));

                                // Combine multiple flight numbers
                                const flightNumbers = segments.map(seg => `${seg.carrierCode}${seg.number}`).join(' / ');

                                return {
                                    airline: segments[0].carrierCode, // Principal carrier
                                    flight_number: flightNumbers,
                                    departure_time: segments[0].departure.at.split('T')[1].substring(0, 5),
                                    arrival_time: segments[segments.length - 1].arrival.at.split('T')[1].substring(0, 5),
                                    date: segments[0].departure.at.split('T')[0],
                                    duration_minutes: parseDuration(itinerary.duration), // Total time including layovers
                                    from: segments[0].departure.iataCode,
                                    to: segments[segments.length - 1].arrival.iataCode,
                                    routing: airports.join(' → '),
                                    stops: segments.length - 1,
                                    segments: parsedSegments
                                };
                            };

                            return {
                                id: offer.id,
                                price: parseFloat(offer.price.total),
                                is_round_trip: !isOneWay,
                                is_one_way: isOneWay,
                                outbound: parseItinerary(outbound),
                                return: isOneWay ? null : parseItinerary(returnIt, true),
                                type: offer.travelerPricings[0].fareOption
                            };
                        });
                        if (roundTripFlights.length > 0) {
                        provider = 'Amadeus API';
                            console.log(`[FlightService] ✓ Using Amadeus API results (${roundTripFlights.length} flights)`);
                            break;
                        }
                    }
                } catch (apiError) {
                    const errorDetail = apiError.response?.result || apiError.message;
                    console.error('[FlightService] Amadeus API Error:', errorDetail);

                    // Check if it's a rate limit error
                    if (apiError.response?.result?.errors?.[0]?.status === 429) {
                        console.warn('[FlightService] ⚠️ Amadeus API rate limit exceeded. Consider implementing caching or upgrading API plan.');
                    }
                        // Continue to next API if this one fails
                    }
                } else {
                    console.log('[FlightService] ⚠️ Amadeus API credentials not configured');
                }
            }
        }

        // 2. Return error if no flight data available (NO MOCK FALLBACK)
        if (roundTripFlights.length === 0) {
            const searchDetails = {
                origin: originAirport.code,
                origin_name: originAirport.name,
                destination: destAirport.code,
                destination_name: destAirport.name,
                departure_date: departureDate,
                return_date: actualReturnDate,
                is_one_way: isOneWay
            };
            
            console.error(`[FlightService] ❌ No flight data available for ${originAirport.code} (${originAirport.name}) <-> ${destAirport.code} (${destAirport.name}) on ${departureDate}${actualReturnDate ? ` returning ${actualReturnDate}` : ' (one-way)'}`);

            // Still fetch rental car options even if no flights (user might drive instead)
            let rentalCarsNoFlights = [];
            try {
                // For one-way flights, estimate 1 day; for round-trip, calculate from dates
                const estimatedDays = isOneWay 
                    ? 1 
                    : Math.max(1, Math.ceil((new Date(actualReturnDate || departureDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)));
                rentalCarsNoFlights = await getCarRentalOptions(
                    destAirport.code,
                    departureDate,
                    actualReturnDate || departureDate, // Use departure date if no return date
                    estimatedDays,
                    limit
                );
                console.log(`[FlightService] ✓ Got ${rentalCarsNoFlights.length} rental car options (no flights available)`);
            } catch (error) {
                console.error('[FlightService] Car rental service error:', error.message);
                rentalCarsNoFlights = [];
            }

            // Format dates for display
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            };
            
            const departureDateFormatted = formatDate(departureDate);
            const returnDateFormatted = actualReturnDate ? formatDate(actualReturnDate) : null;
            
            // Return error with detailed search information
            return {
                success: false,
                error: `Flight search from ${originAirport.code} (${originAirport.name}) to ${destAirport.code} (${destAirport.name}) on ${departureDateFormatted}${returnDateFormatted ? ` returning ${returnDateFormatted}` : ' (one-way)'} was not found. Please double-check with a manual web search.`,
                search_details: {
                    origin_code: originAirport.code,
                    origin_name: originAirport.name,
                    destination_code: destAirport.code,
                    destination_name: destAirport.name,
                    departure_date: departureDate,
                    departure_date_formatted: departureDateFormatted,
                    return_date: actualReturnDate,
                    return_date_formatted: returnDateFormatted,
                    is_one_way: isOneWay
                },
                origin_airport: originAirport,
                destination_airport: destAirport,
                distance_km: Math.round(distanceKm),
                options: [],
                rental_car_options: rentalCarsNoFlights
            };
        }

        // Only continue if we have REAL flight data
        console.log(`[FlightService] ✓ Found ${roundTripFlights.length} real flights from Amadeus API`);

        // Remove duplicates before sorting
        // Create a unique key for each flight based on: outbound flight number, return flight number, departure times, and price
        const uniqueFlights = [];
        const seenFlights = new Set();
        
        for (const flight of roundTripFlights) {
            // Create a unique identifier for this flight combination
            const outboundKey = flight.outbound ? 
                `${flight.outbound.from || ''}-${flight.outbound.to || ''}-${flight.outbound.flight_number || ''}-${flight.outbound.departure_time || ''}-${flight.outbound.arrival_time || ''}` : 
                'no-outbound';
            const returnKey = flight.return ? 
                `${flight.return.from || ''}-${flight.return.to || ''}-${flight.return.flight_number || ''}-${flight.return.departure_time || ''}-${flight.return.arrival_time || ''}` : 
                'no-return';
            const priceKey = flight.price || 0;
            const uniqueKey = `${outboundKey}|${returnKey}|${priceKey}`;
            
            if (!seenFlights.has(uniqueKey)) {
                seenFlights.add(uniqueKey);
                uniqueFlights.push(flight);
            } else {
                console.log(`[FlightService] Skipping duplicate flight: ${flight.outbound?.flight_number || 'N/A'} / ${flight.return?.flight_number || 'N/A'} - €${flight.price}`);
            }
        }
        
        console.log(`[FlightService] Filtered ${roundTripFlights.length} flights to ${uniqueFlights.length} unique flights`);
        roundTripFlights = uniqueFlights;

        // Sort by total travel time (fastest first)
        roundTripFlights.sort((a, b) => {
            const totalA = (a.outbound?.duration_minutes || 0) + (a.return?.duration_minutes || 0);
            const totalB = (b.outbound?.duration_minutes || 0) + (b.return?.duration_minutes || 0);
            return totalA - totalB;
        });

        // Ensure we don't return more than the requested limit (but only if we have that many unique flights)
        roundTripFlights = roundTripFlights.slice(0, limit);

        // Get median flight
        const medianIndex = Math.floor(roundTripFlights.length / 2);
        const medianFlight = roundTripFlights[medianIndex];

        // Calculate travel time metrics (outbound + return) using median flight
        const totalFlightDuration = (medianFlight?.outbound?.duration_minutes || 105) + (medianFlight?.return?.duration_minutes || 105);

        // Use default door-to-door constants for statistical metrics
        const totalTravelMins = (
            45 + 120 + totalFlightDuration + 45 + 60 + 45 + 60 // Approximate outbound + return ground times
        );
        const totalTravelHours = totalTravelMins / 60;
        const travelTimeCost = Math.round(totalTravelHours * TRAVEL_HOUR_RATE * 100) / 100;

        // Rental car options - Use hybrid pricing service
        // Estimated trip duration for rental (will be refined by cost calculator)
        const estimatedDays = Math.max(1, Math.ceil((totalFlightDuration + 480) / 480)); // Rough estimate

        let rentalCars = [];
        try {
            rentalCars = await getCarRentalOptions(
                destAirport.code,
                departureDate,
                actualReturnDate,
                estimatedDays,
                limit // Use same limit as flights
            );
            console.log(`[FlightService] ✓ Got ${rentalCars.length} rental car options`);
        } catch (error) {
            console.error('[FlightService] Car rental service error:', error.message);
            // Continue without rental cars rather than failing the whole request
            rentalCars = [];
        }

        const prices = roundTripFlights.map(f => f.price).sort((a, b) => a - b);

        const result = {
            success: true,
            origin_airport: originAirport,
            destination_airport: destAirport,
            distance_km: Math.round(distanceKm),
            departure_date: departureDate,
            return_date: actualReturnDate,

            // Round-trip flight options (price includes BOTH directions)
            options: roundTripFlights,
            median_flight: medianFlight,

            // Travel metrics
            travel_metrics: {
                total_travel_minutes: totalTravelMins,
                total_travel_hours: Math.round(totalTravelHours * 100) / 100,
                travel_time_cost: travelTimeCost
            },

            // Statistics
            statistics: {
                flights_analyzed: roundTripFlights.length,
                cheapest: roundTripFlights.length > 0 ? Math.min(...prices) : 0,
                median: roundTripFlights.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
                most_expensive: roundTripFlights.length > 0 ? Math.max(...prices) : 0
            },

            rental_car_options: rentalCars,
            provider: provider,
            provider_url: provider === 'Google Flights (SerpAPI)' 
                ? 'https://www.google.com/travel/flights' 
                : 'https://developers.amadeus.com'
        };

        // No caching - always return fresh data
        return result;

    } catch (error) {
        console.error('[FlightService] ❌ Unhandled error in searchFlights:', error);
        console.error('[FlightService] Error stack:', error.stack);
        
        // Return a safe error response instead of throwing
        // This prevents the server from crashing
        return {
            success: false,
            error: 'An unexpected error occurred during flight search',
            message: error.message || 'Unknown error',
            options: [],
            rental_car_options: []
        };
    }
}

module.exports = { searchFlights };
