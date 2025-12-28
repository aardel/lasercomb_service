const axios = require('axios');
const amadeus = require('./amadeus.client');
const fs = require('fs');
const path = require('path');

// Load local airport database
let airportDatabase = null;
let airportDatabaseLoaded = false;

/**
 * Load airport database from local file
 * @returns {Object|null} Airport database or null if not available
 */
function loadAirportDatabase() {
  if (airportDatabaseLoaded) {
    return airportDatabase;
  }

  try {
    const dbPath = path.join(__dirname, '../../data/airports.json');
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      airportDatabase = JSON.parse(data);
      airportDatabaseLoaded = true;
      console.log(`[AirportService] Loaded local airport database: ${airportDatabase.metadata.totalAirports} airports`);
      return airportDatabase;
    } else {
      console.warn('[AirportService] Local airport database not found. Run: node scripts/build-airport-database.js');
      airportDatabaseLoaded = true; // Mark as loaded to avoid repeated warnings
      return null;
    }
  } catch (error) {
    console.error('[AirportService] Error loading airport database:', error.message);
    airportDatabaseLoaded = true;
    return null;
  }
}

/**
 * Find nearest airports from local database by coordinates
 * Prioritizes commercial airports and filters heliports
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} limit - Maximum number of airports to return
 * @param {number} maxDistanceKm - Maximum distance in km (default: 500)
 * @param {boolean} commercialOnly - Only return commercial airports (default: true)
 * @param {string} minSize - Minimum airport size: 'small', 'medium', 'large', 'hub' (default: 'small')
 * @returns {Array} Array of airport objects sorted by priority (commercial, size, distance)
 */
function findNearestAirportsLocal(lat, lng, limit = 5, maxDistanceKm = 500, commercialOnly = true, minSize = 'small') {
  const db = loadAirportDatabase();
  if (!db || !db.airports) {
    return [];
  }

  const sizeOrder = { hub: 4, large: 3, medium: 2, small: 1 };
  const minSizeValue = sizeOrder[minSize] || 1;

  const airportsWithDistance = db.airports
    .map(airport => {
      const distance = calculateDistance(lat, lng, airport.lat, airport.lng);
      return {
        ...airport,
        distance_km: Math.round(distance * 10) / 10
      };
    })
    .filter(airport => {
      // Filter by distance
      if (airport.distance_km > maxDistanceKm) return false;
      
      // Filter heliports (should already be filtered in DB, but double-check)
      const nameLower = (airport.name || '').toLowerCase();
      if (nameLower.includes('heliport') || nameLower.includes('helipad') || nameLower.includes('héli')) {
        return false;
      }
      
      // Filter by commercial status
      if (commercialOnly && !airport.isCommercial) return false;
      
      // Filter by minimum size
      const airportSizeValue = sizeOrder[airport.size] || 1;
      if (airportSizeValue < minSizeValue) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort priority: commercial airports first, then by size, then by distance
      if (a.isCommercial !== b.isCommercial) {
        return b.isCommercial ? 1 : -1;
      }
      const aSize = sizeOrder[a.size] || 1;
      const bSize = sizeOrder[b.size] || 1;
      if (aSize !== bSize) {
        return bSize - aSize; // Larger airports first
      }
      return a.distance_km - b.distance_km; // Closer airports first
    })
    .slice(0, limit)
    .map(airport => ({
      code: airport.iata,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      lat: airport.lat,
      lng: airport.lng,
      distance_km: airport.distance_km,
      source: 'local_database',
      icao: airport.icao,
      isCommercial: airport.isCommercial,
      size: airport.size,
      timezone: airport.tzDatabase || airport.timezone,
      timezoneOffset: airport.timezone
    }));

  return airportsWithDistance;
}

/**
 * Find airport by IATA code from local database
 * @param {string} iataCode - IATA code (3 letters)
 * @returns {Object|null} Airport object or null if not found
 */
function findAirportByIATALocal(iataCode) {
  if (!iataCode || iataCode.length !== 3) {
    return null;
  }

  const db = loadAirportDatabase();
  if (!db || !db.iataIndex) {
    return null;
  }

  const airport = db.iataIndex[iataCode.toUpperCase()];
  if (!airport) {
    return null;
  }

  return {
    code: airport.iata,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    lat: airport.lat,
    lng: airport.lng,
    source: 'local_database',
    icao: airport.icao,
    isCommercial: airport.isCommercial,
    size: airport.size,
    timezone: airport.tzDatabase || airport.timezone,
    timezoneOffset: airport.timezone
  };
}

/**
 * Find airport by ICAO code from local database
 * @param {string} icaoCode - ICAO code (4 letters)
 * @returns {Object|null} Airport object or null if not found
 */
function findAirportByICAOLocal(icaoCode) {
  if (!icaoCode || icaoCode.length !== 4) {
    return null;
  }

  const db = loadAirportDatabase();
  if (!db || !db.icaoIndex) {
    return null;
  }

  const airport = db.icaoIndex[icaoCode.toUpperCase()];
  if (!airport) {
    return null;
  }

  return {
    code: airport.iata,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    lat: airport.lat,
    lng: airport.lng,
    source: 'local_database',
    icao: airport.icao,
    isCommercial: airport.isCommercial,
    size: airport.size,
    timezone: airport.tzDatabase || airport.timezone,
    timezoneOffset: airport.timezone
  };
}

/**
 * Find airport by IATA or ICAO code (tries both)
 * @param {string} code - IATA (3 letters) or ICAO (4 letters) code
 * @returns {Object|null} Airport object or null if not found
 */
function findAirportByCodeLocal(code) {
  if (!code) return null;
  
  const codeUpper = code.toUpperCase();
  if (codeUpper.length === 3) {
    return findAirportByIATALocal(codeUpper);
  } else if (codeUpper.length === 4) {
    return findAirportByICAOLocal(codeUpper);
  }
  
  return null;
}

/**
 * Search airports by name, city, IATA, or ICAO code from local database
 * Prioritizes commercial airports and filters heliports
 * @param {string} query - Search query (airport name, city, IATA, or ICAO code)
 * @param {number} limit - Maximum number of results
 * @param {boolean} commercialOnly - Only return commercial airports (default: true)
 * @returns {Array} Array of matching airports sorted by relevance
 */
function searchAirportsLocal(query, limit = 10, commercialOnly = true) {
  const db = loadAirportDatabase();
  if (!db || !db.airports || !query) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const queryUpper = query.toUpperCase();
  
  // Check if it's an IATA or ICAO code first
  if (queryUpper.length === 3) {
    const byIATA = findAirportByIATALocal(queryUpper);
    if (byIATA) return [byIATA];
  } else if (queryUpper.length === 4) {
    const byICAO = findAirportByICAOLocal(queryUpper);
    if (byICAO) return [byICAO];
  }

  const matches = db.airports
    .filter(airport => {
      // Filter heliports
      const nameLower = (airport.name || '').toLowerCase();
      if (nameLower.includes('heliport') || nameLower.includes('helipad') || nameLower.includes('héli')) {
        return false;
      }
      
      // Filter by commercial status
      if (commercialOnly && !airport.isCommercial) return false;
      
      // Match by name, city, country, IATA, or ICAO
      const nameMatch = airport.name && airport.name.toLowerCase().includes(queryLower);
      const cityMatch = airport.city && airport.city.toLowerCase().includes(queryLower);
      const countryMatch = airport.country && airport.country.toLowerCase().includes(queryLower);
      const iataMatch = airport.iata && airport.iata.toLowerCase() === queryLower;
      const icaoMatch = airport.icao && airport.icao.toLowerCase() === queryLower;
      
      return nameMatch || cityMatch || countryMatch || iataMatch || icaoMatch;
    })
    .sort((a, b) => {
      // Prioritize exact IATA/ICAO matches, then commercial airports, then by size
      const aExact = (a.iata && a.iata.toLowerCase() === queryLower) || 
                     (a.icao && a.icao.toLowerCase() === queryLower);
      const bExact = (b.iata && b.iata.toLowerCase() === queryLower) || 
                     (b.icao && b.icao.toLowerCase() === queryLower);
      
      if (aExact !== bExact) return aExact ? -1 : 1;
      if (a.isCommercial !== b.isCommercial) return b.isCommercial ? 1 : -1;
      
      const sizeOrder = { hub: 4, large: 3, medium: 2, small: 1 };
      const aSize = sizeOrder[a.size] || 1;
      const bSize = sizeOrder[b.size] || 1;
      return bSize - aSize;
    })
    .slice(0, limit)
    .map(airport => ({
      code: airport.iata,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      lat: airport.lat,
      lng: airport.lng,
      source: 'local_database',
      icao: airport.icao,
      isCommercial: airport.isCommercial,
      size: airport.size,
      timezone: airport.tzDatabase || airport.timezone,
      timezoneOffset: airport.timezone
    }));

  return matches;
}

/**
 * Find nearest airport to given coordinates
 * Uses Google Places API first, then falls back to Amadeus if IATA code cannot be determined
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{code: string, name: string, distance_km: number}>}
 */
async function findNearestAirport(arg1, arg2) {
  let lat, lng, address, code, name;

  if (typeof arg1 === 'object' && arg1 !== null) {
    // Case 1: findNearestAirport({lat, lng}) or {latitude, longitude} or {address} or {code, lat, lng}
    lat = arg1.lat ?? arg1.latitude;
    lng = arg1.lng ?? arg1.longitude;
    address = arg1.address;
    code = arg1.code; // Check if airport code is already provided
    name = arg1.name; // Check if airport name is already provided
  } else {
    // Case 2: findNearestAirport(lat, lng)
    lat = arg1;
    lng = arg2;
  }

  // If airport code is already provided, look it up in local database for full details
  if (code && lat && lng) {
    console.log(`[AirportService] Using provided airport code: ${code} at ${lat}, ${lng}`);

    // Try to get full airport details from local database
    const airportDetails = findAirportByIATALocal(code);
    if (airportDetails) {
      console.log(`[AirportService] Found full details for ${code}: ${airportDetails.name}, ${airportDetails.city}, ${airportDetails.country}`);
      return {
        ...airportDetails,
        distance_km: 0, // Already at the airport
        source: 'provided_enriched'
      };
    }

    // Fallback if not found in database
    return {
      code: code,
      name: name || `${code} Airport`,
      distance_km: 0, // Already at the airport
      lat: lat,
      lng: lng,
      source: 'provided'
    };
  }

  // Fallback: Geocode address if coordinates are missing but address is present
  if ((lat === undefined || lat === null || lng === undefined || lng === null) && address) {
    console.log(`[AirportService] Geocoding address for airport search: ${address}`);
    try {
      const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address, key: process.env.GOOGLE_MAPS_API_KEY }
      });
      if (geocodeResponse.data.status === 'OK') {
        const loc = geocodeResponse.data.results[0].geometry.location;
        lat = loc.lat;
        lng = loc.lng;
      }
    } catch (err) {
      console.warn('[AirportService] Geocoding failed:', err.message);
    }
  }

  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    console.warn('[AirportService] Invalid coordinates provided:', { lat, lng, address });
    return null;
  }

    // If Google Maps API key is not set, try local database first (commercial airports only)
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️  Google Maps API key not set. Using local database...');
    const localAirports = findNearestAirportsLocal(lat, lng, 1, 500, true, 'small');
    if (localAirports.length > 0 && localAirports[0].code) {
      const airport = localAirports[0];
      console.log(`[AirportService] SUCCESS (Local DB): Resolved ${lat},${lng} to ${airport.name} (${airport.code}) at ${airport.distance_km}km`);
      return {
        code: airport.code,
        name: airport.name,
        distance_km: airport.distance_km,
        lat: airport.lat,
        lng: airport.lng,
        source: 'local_database',
        city: airport.city,
        country: airport.country,
        icao: airport.icao,
        isCommercial: airport.isCommercial,
        size: airport.size,
        timezone: airport.timezone,
        timezoneOffset: airport.timezoneOffset
      };
    }
    console.warn('⚠️  Local database also returned no results.');
    return null;
  }

  console.log(`[AirportService] Finding nearest airport for: ${lat}, ${lng}`);

  try {
    // Use Google Places API Nearby Search to find airports
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

    const response = await axios.get(url, {
      params: {
        location: `${lat},${lng}`,
        radius: 50000, // Search within 50km
        type: 'airport',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${response.data.status} - ${response.data.error_message || ''}`);
    }

    let airportResult = null;

    if (!response.data.results || response.data.results.length === 0) {
      console.log(`[AirportService] No airports within 50km, widening search to 200km...`);
      // If no results within 50km, try a wider search (200km)
      const widerResponse = await axios.get(url, {
        params: {
          location: `${lat},${lng}`,
          radius: 200000, // Search within 200km
          type: 'airport',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (!widerResponse.data.results || widerResponse.data.results.length === 0) {
        console.warn(`[AirportService] No airports found within 200km via Google Places. Trying local database...`);
        // Fallback to local database (commercial airports only)
        const localAirports = findNearestAirportsLocal(lat, lng, 1, 500, true, 'small');
        if (localAirports.length > 0 && localAirports[0].code) {
          const airport = localAirports[0];
          console.log(`[AirportService] SUCCESS (Local DB): Resolved ${lat},${lng} to ${airport.name} (${airport.code}) at ${airport.distance_km}km`);
          return {
            code: airport.code,
            name: airport.name,
            distance_km: airport.distance_km,
            lat: airport.lat,
            lng: airport.lng,
            source: 'local_database',
            city: airport.city,
            country: airport.country,
            icao: airport.icao,
            isCommercial: airport.isCommercial,
            size: airport.size,
            timezone: airport.timezone,
            timezoneOffset: airport.timezoneOffset
          };
        }
        console.warn(`[AirportService] No airports found within 500km of ${lat}, ${lng}`);
        return null;
      }
      airportResult = widerResponse.data.results[0];
    } else {
      airportResult = response.data.results[0];
    }

    const info = await extractAirportInfo(airportResult, lat, lng);

    // If we couldn't extract IATA code from Google Places, try Amadeus as fallback
    if (!info.code) {
      console.log(`[AirportService] Google Places didn't provide IATA code. Trying Amadeus API fallback...`);
      const amadeusInfo = await findNearestAirportAmadeus(lat, lng);
      if (amadeusInfo && amadeusInfo.code) {
        console.log(`[AirportService] SUCCESS (Amadeus): Resolved ${lat},${lng} to ${amadeusInfo.name} (${amadeusInfo.code}) at ${amadeusInfo.distance_km}km`);
        return amadeusInfo;
      }

      // If Amadeus also fails, try local database as final fallback (commercial airports only)
      console.log(`[AirportService] Amadeus didn't provide IATA code. Trying local database fallback...`);
      const localAirports = findNearestAirportsLocal(lat, lng, 1, 200, true, 'small');
      if (localAirports.length > 0 && localAirports[0].code) {
        const localAirport = localAirports[0];
        // Use Google Places name if available, otherwise use local database name
        const finalName = info.name && info.name !== 'Unknown Airport' ? info.name : localAirport.name;
        console.log(`[AirportService] SUCCESS (Local DB): Resolved ${lat},${lng} to ${finalName} (${localAirport.code}) at ${localAirport.distance_km}km`);
        return {
          code: localAirport.code,
          name: finalName,
          distance_km: localAirport.distance_km,
          lat: localAirport.lat,
          lng: localAirport.lng,
          source: 'local_database',
          city: localAirport.city,
          country: localAirport.country,
          icao: localAirport.icao,
          isCommercial: localAirport.isCommercial,
          size: localAirport.size,
          timezone: localAirport.timezone,
          timezoneOffset: localAirport.timezoneOffset
        };
      }
    }

    // If we have coordinates but no code, try to match with local database by coordinates
    if (info.lat && info.lng && !info.code) {
      console.log(`[AirportService] No IATA code found, trying to match by coordinates in local database...`);
      const localAirports = findNearestAirportsLocal(info.lat, info.lng, 1, 10, true, 'small');
      if (localAirports.length > 0) {
        const localAirport = localAirports[0];
        // Check if the local airport is very close (within 5km) to the Google result
        const distance = calculateDistance(info.lat, info.lng, localAirport.lat, localAirport.lng);
        if (distance < 5) {
          console.log(`[AirportService] Matched Google result with local database: ${localAirport.code}`);
          info.code = localAirport.code;
          info.source = 'local_database';
          info.icao = localAirport.icao;
          info.isCommercial = localAirport.isCommercial;
          info.size = localAirport.size;
          info.timezone = localAirport.timezone;
          info.timezoneOffset = localAirport.timezoneOffset;
        }
      }
    }

    if (!info.code) {
      console.warn(`[AirportService] Could not resolve IATA code for ${lat},${lng}`);
      return null;
    }

    console.log(`[AirportService] SUCCESS: Resolved ${lat},${lng} to ${info.name} (${info.code}) at ${info.distance_km}km`);
    return info;

  } catch (error) {
    console.error('[AirportService] Error finding nearest airport:', error.message);
    throw error;
  }
}

/**
 * Find nearest airport using Amadeus API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{code: string, name: string, distance_km: number}>}
 */
async function findNearestAirportAmadeus(lat, lng) {
  try {
    if (!process.env.AMADEUS_API_KEY && !process.env.AMADEUS_CLIENT_ID) {
      console.warn('[AirportService] Amadeus API credentials not configured');
      return null;
    }

    console.log(`[AirportService/Amadeus] Searching for airports near ${lat}, ${lng}`);

    const response = await amadeus.referenceData.locations.airports.get({
      latitude: lat,
      longitude: lng,
      radius: 200, // Search within 200km
      page: { limit: 1 } // Get closest airport only
    });

    if (!response.data || response.data.length === 0) {
      console.log(`[AirportService/Amadeus] No airports found near ${lat}, ${lng}`);
      return null;
    }

    const airport = response.data[0];

    // Calculate distance
    const distance = calculateDistance(
      lat,
      lng,
      parseFloat(airport.geoCode.latitude),
      parseFloat(airport.geoCode.longitude)
    );

    return {
      code: airport.iataCode,
      name: airport.name,
      distance_km: Math.round(distance * 10) / 10,
      lat: parseFloat(airport.geoCode.latitude),
      lng: parseFloat(airport.geoCode.longitude),
      source: 'amadeus'
    };

  } catch (error) {
    console.error('[AirportService/Amadeus] Error:', error.message);
    if (error.response && error.response.result) {
      console.error('[AirportService/Amadeus] API Response:', JSON.stringify(error.response.result, null, 2));
    }
    return null;
  }
}

/**
 * Find multiple nearest airports using Amadeus API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} limit - Maximum number of airports to return
 * @returns {Promise<Array>} - Array of airport objects
 */
async function findNearestAirportsAmadeus(lat, lng, limit = 5) {
  try {
    if (!process.env.AMADEUS_API_KEY && !process.env.AMADEUS_CLIENT_ID) {
      console.warn('[AirportService] Amadeus API credentials not configured');
      return [];
    }

    console.log(`[AirportService/Amadeus] Searching for ${limit} airports near ${lat}, ${lng}`);

    const response = await amadeus.referenceData.locations.airports.get({
      latitude: lat,
      longitude: lng,
      radius: 200, // Search within 200km
      page: { limit: limit }
    });

    if (!response.data || response.data.length === 0) {
      console.log(`[AirportService/Amadeus] No airports found near ${lat}, ${lng}`);
      return [];
    }

    const airports = response.data.map(airport => {
      const distance = calculateDistance(
        lat,
        lng,
        parseFloat(airport.geoCode.latitude),
        parseFloat(airport.geoCode.longitude)
      );

      return {
        code: airport.iataCode,
        name: airport.name,
        distance_km: Math.round(distance * 10) / 10,
        lat: parseFloat(airport.geoCode.latitude),
        lng: parseFloat(airport.geoCode.longitude),
        source: 'amadeus',
        amadeusVerified: true,
        isCommercial: true
      };
    });

    console.log(`[AirportService/Amadeus] Found ${airports.length} commercial airports:`, airports.map(a => `${a.name} (${a.code}) - ${a.distance_km}km`).join(', '));
    return airports;

  } catch (error) {
    console.error('[AirportService/Amadeus] Error:', error.message);
    if (error.response && error.response.result) {
      console.error('[AirportService/Amadeus] API Response:', JSON.stringify(error.response.result, null, 2));
    }
    return [];
  }
}

/**
 * Extract airport code and info from Google Places result
 * Uses Place Details API to get more accurate IATA code
 */
async function extractAirportInfo(place, originLat, originLng) {
  const name = place.name || 'Unknown Airport';
  let code = null;

  // Try to extract IATA code from name (e.g., "Stuttgart Airport (STR)" or "STR Airport")
  const codeMatch = name.match(/\(([A-Z]{3})\)|^([A-Z]{3})\s|([A-Z]{3})$/);
  if (codeMatch) {
    code = codeMatch[1] || codeMatch[2] || codeMatch[3];
  } else {
    // Use Place Details API to get more information including IATA code
    if (place.place_id && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            fields: 'name,address_components,formatted_address',
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });

        if (detailsResponse.data.status === 'OK' && detailsResponse.data.result) {
          const details = detailsResponse.data.result;
          const fullName = details.name || name;
          const fullAddress = details.formatted_address || '';

          // Try to extract from full name or address
          const nameCodeMatch = fullName.match(/\(([A-Z]{3})\)|^([A-Z]{3})\s|([A-Z]{3})$/);
          if (nameCodeMatch) {
            code = nameCodeMatch[1] || nameCodeMatch[2] || nameCodeMatch[3];
          } else {
            // Try from address
            const addressCodeMatch = fullAddress.match(/\b([A-Z]{3})\b/);
            if (addressCodeMatch) {
              code = addressCodeMatch[1];
            }
          }

          // Check address components for airport code
          if (!code && details.address_components) {
            for (const component of details.address_components) {
              // Sometimes airport codes are in the short_name
              if (component.short_name && component.short_name.length === 3 && /^[A-Z]{3}$/.test(component.short_name)) {
                code = component.short_name;
                break;
              }
            }
          }
        }
      } catch (error) {
        console.warn('[AirportService] Could not fetch place details:', error.message);
      }
    }

    // Fallback: try to extract from name patterns (look for 3-letter uppercase words)
    if (!code) {
      const words = name.split(/[\s-]+/);
      for (const word of words) {
        const cleanWord = word.replace(/[^A-Z]/g, '');
        if (cleanWord.length === 3 && /^[A-Z]{3}$/.test(cleanWord)) {
          code = cleanWord;
          break;
        }
      }
    }

    // Last resort: Use a mapping of known airport names to codes
    if (!code) {
      const airportNameMap = {
        'malta': 'MLA',
        'stuttgart': 'STR',
        'munich': 'MUC',
        'frankfurt': 'FRA',
        'hamburg': 'HAM',
        'berlin': 'BER',
        'zurich': 'ZRH',
        'paris': 'CDG',
        'london': 'LHR',
        'amsterdam': 'AMS',
        'vienna': 'VIE',
        'madrid': 'MAD',
        'barcelona': 'BCN',
        'rome': 'FCO',
        'milan': 'MXP',
        'warsaw': 'WAW',
        'warszawa': 'WAW',
        'chopin': 'WAW', // Warsaw Chopin Airport
        'notzingen': 'STR', // Near STR
        'kirchheim': 'STR',
        'wendlingen': 'STR'
      };

      const nameLower = name.toLowerCase();
      for (const [key, value] of Object.entries(airportNameMap)) {
        if (nameLower.includes(key)) {
          code = value;
          break;
        }
      }
    }
  }

  // Calculate distance
  const airportLat = place.geometry?.location?.lat || place.geometry?.lat;
  const airportLng = place.geometry?.location?.lng || place.geometry?.lng;
  const distance = (airportLat && airportLng) ? calculateDistance(originLat, originLng, airportLat, airportLng) : 0;

  // Specific Overrides for common mis-detections
  if (code === 'LQA') code = 'MLA'; // Malta International Airport
  if (name.toLowerCase().includes('malta')) code = 'MLA';
  if (name.toLowerCase().includes('stuttgart')) code = 'STR';

  return {
    code: code || null, // Return null if we can't determine code
    name: name,
    distance_km: Math.round(distance * 10) / 10,
    place_id: place.place_id,
    lat: airportLat,
    lng: airportLng
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find multiple nearest airports to given coordinates
 * Returns an array of up to 'limit' airports sorted by distance
 *
 * @param {Object|number} arg1 - {lat, lng} object or latitude
 * @param {number} arg2 - longitude (if arg1 is latitude)
 * @param {number} limit - Maximum number of airports to return (default: 3)
 * @returns {Promise<Array>} - Array of airport objects with code, name, distance_km, lat, lng
 */
async function findNearestAirports(arg1, arg2, limit = 3) {
  let lat, lng, address, country;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lng = arg1.lng ?? arg1.longitude;
    address = arg1.address;
    country = arg1.country; // Country code for prioritization
  } else {
    lat = arg1;
    lng = arg2;
  }

  // Fallback: Geocode address if coordinates are missing
  if ((lat === undefined || lat === null || lng === undefined || lng === null) && address) {
    console.log(`[AirportService] Geocoding address for airports search: ${address}`);
    try {
      const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address, key: process.env.GOOGLE_MAPS_API_KEY }
      });
      if (geocodeResponse.data.status === 'OK') {
        const loc = geocodeResponse.data.results[0].geometry.location;
        lat = loc.lat;
        lng = loc.lng;
      }
    } catch (err) {
      console.warn('[AirportService] Geocoding failed:', err.message);
    }
  }

  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    console.warn('[AirportService] Invalid coordinates provided');
    return [];
  }

  console.log(`[AirportService] Finding ${limit} nearest airports for: ${lat}, ${lng}`);

  try {
    // PRIMARY: Use Amadeus API to get commercial airports (most reliable)
    // Amadeus only returns commercial airports, so this is the best source
    // Request more airports than needed to ensure we have options
    const amadeusAirports = await findNearestAirportsAmadeus(lat, lng, Math.max(limit * 2, 5));
    
    console.log(`[AirportService] Amadeus returned ${amadeusAirports.length} airports`);
    
    // If country is specified, prioritize main airport and same-country airports
    if (country && amadeusAirports.length > 0) {
      const countryUpper = country.toUpperCase();
      const countryMainAirports = {
        'MLT': 'MLA', 'MT': 'MLA', 'Malta': 'MLA',
        'DEU': 'FRA', 'DE': 'FRA', 'Germany': 'FRA',
        'FRA': 'CDG', 'FR': 'CDG', 'France': 'CDG',
        'GBR': 'LHR', 'GB': 'LHR', 'United Kingdom': 'LHR',
        'ITA': 'FCO', 'IT': 'FCO', 'Italy': 'FCO',
        'ESP': 'MAD', 'ES': 'MAD', 'Spain': 'MAD'
      };
      
      // Known airport coordinates for airports that Amadeus might miss
      const knownAirportCoords = {
        'MLA': { lat: 35.8575, lng: 14.4775, name: 'Malta International Airport' }, // Malta
        'BER': { lat: 52.3667, lng: 13.5033, name: 'Berlin Brandenburg Airport' } // Berlin (TXL is closed)
      };
      
      const mainAirportCode = countryMainAirports[countryUpper] || countryMainAirports[country];
      
      if (mainAirportCode) {
        // Find main airport in results
        const mainAirportIndex = amadeusAirports.findIndex(a => a.code === mainAirportCode);
        
        if (mainAirportIndex > 0) {
          // If main airport exists but not first, move it to first position
          const mainAirport = amadeusAirports[mainAirportIndex];
          amadeusAirports.splice(mainAirportIndex, 1);
          amadeusAirports.unshift(mainAirport);
          console.log(`[AirportService] Prioritized main airport ${mainAirportCode} for country ${country}`);
        } else if (mainAirportIndex === -1) {
          console.warn(`[AirportService] Main airport ${mainAirportCode} for ${country} not found in Amadeus results`);
          
          // If main airport is not found and we have known coordinates, add it manually
          if (knownAirportCoords[mainAirportCode]) {
            const knownAirport = knownAirportCoords[mainAirportCode];
            const distance = calculateDistance(lat, lng, knownAirport.lat, knownAirport.lng);
            
            const manualAirport = {
              code: mainAirportCode,
              name: knownAirport.name,
              distance_km: Math.round(distance * 10) / 10,
              lat: knownAirport.lat,
              lng: knownAirport.lng,
              source: 'manual',
              amadeusVerified: false,
              isCommercial: true
            };
            
            amadeusAirports.unshift(manualAirport);
            console.log(`[AirportService] Added main airport ${mainAirportCode} manually (${distance.toFixed(1)}km away)`);
          }
        }
      }
      
      // Special case: Remove closed airports (e.g., TXL - Berlin Tegel is closed)
      const closedAirports = ['TXL']; // Berlin Tegel closed in 2020
      const filteredAirports = amadeusAirports.filter(a => !closedAirports.includes(a.code));
      if (filteredAirports.length < amadeusAirports.length) {
        console.log(`[AirportService] Removed ${amadeusAirports.length - filteredAirports.length} closed airport(s)`);
        amadeusAirports.length = 0;
        amadeusAirports.push(...filteredAirports);
        
        // If we removed TXL and country is Germany, ensure BER is prioritized
        if (closedAirports.some(code => amadeusAirports.some(a => a.code === code)) && 
            (countryUpper === 'DEU' || countryUpper === 'DE' || country === 'Germany')) {
          const berIndex = filteredAirports.findIndex(a => a.code === 'BER');
          if (berIndex > 0) {
            const ber = filteredAirports[berIndex];
            filteredAirports.splice(berIndex, 1);
            filteredAirports.unshift(ber);
            console.log(`[AirportService] Prioritized BER after removing closed TXL`);
          }
        }
      }
    }
    
    if (amadeusAirports.length >= limit) {
      // If we got enough airports from Amadeus, use them directly
      console.log(`[AirportService] Using ${limit} airports from Amadeus (sorted by priority)`);
      return amadeusAirports.slice(0, limit);
    }

    // SECONDARY: Supplement with Google Places results if we need more
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const response = await axios.get(url, {
      params: {
        location: `${lat},${lng}`,
        radius: 200000, // 200km to get multiple options
        type: 'airport',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (!response.data.results || response.data.results.length === 0) {
      // If no Google results, try local database to supplement Amadeus results (commercial only)
      if (amadeusAirports.length < limit) {
        console.log(`[AirportService] No Google results. Supplementing with local database...`);
        const localAirports = findNearestAirportsLocal(lat, lng, limit - amadeusAirports.length, 500, true, 'small');
        const seenCodes = new Set(amadeusAirports.map(a => a.code));
        
        for (const localAirport of localAirports) {
          if (!seenCodes.has(localAirport.code)) {
            amadeusAirports.push({
              ...localAirport,
              amadeusVerified: false
            });
            seenCodes.add(localAirport.code);
          }
        }
        
        // Re-sort: Amadeus verified first, then by distance
        amadeusAirports.sort((a, b) => {
          if (a.amadeusVerified !== b.amadeusVerified) {
            return a.amadeusVerified ? -1 : 1;
          }
          return a.distance_km - b.distance_km;
        });
      }
      
      console.log(`[AirportService] Returning ${amadeusAirports.length} airports (${amadeusAirports.filter(a => a.source === 'amadeus').length} from Amadeus, ${amadeusAirports.filter(a => a.source === 'local_database').length} from local DB)`);
      return amadeusAirports.slice(0, limit);
    }

    // Start with Amadeus airports (already verified commercial)
    const airports = [...amadeusAirports];
    const seenCodes = new Set(amadeusAirports.map(a => a.code)); // Track codes we already have
    
    // Process Google results and add unique airports
    for (const place of response.data.results) {
      const airportLat = place.geometry.location.lat;
      const airportLng = place.geometry.location.lng;
      const distance = calculateDistance(lat, lng, airportLat, airportLng);
      const name = place.name;

      // Filter out non-commercial airports (helipads, small airfields, aviation services)
      const nameLower = name.toLowerCase();
      const excludeKeywords = [
        'helipad', 'heliport', 'héliport', 'helicopter', 'hélicoptère',
        'launch', 'glider', 'hang gliding', 'paragliding',
        'aviation service', 'business aviation', 'flight school',
        'model aircraft', 'aeromodellisti', 'aero club',
        'private', 'executive', 'corporate',
        'airfield', 'fluggelände', 'flugplatz', 'landing strip',
        'moor', 'crosland', 'hmsv', 'egnd', 'eg', // Common small airfield patterns
        'ultralight', 'microlight', 'sport aviation'
      ];
      
      // Skip if it's clearly not a commercial airport
      if (excludeKeywords.some(keyword => nameLower.includes(keyword))) {
        console.log(`[AirportService] Skipping non-commercial: ${name}`);
        continue;
      }

      // Only consider it commercial if it explicitly has "Airport" or "International" in the name
      // "Airfield" alone is NOT commercial - it's usually a small private field
      const isCommercial = nameLower.includes('airport') || 
                          nameLower.includes('international');

      // Try to extract IATA code from name
      let code = null;
      let cleanName = name;
      const codeMatch = name.match(/\(([A-Z]{3})\)|^([A-Z]{3})\s|([A-Z]{3})$/);
      if (codeMatch) {
        code = codeMatch[1] || codeMatch[2] || codeMatch[3];
      }

      // For commercial airports, try to get better info from Place Details API
      if (isCommercial && place.place_id && process.env.GOOGLE_MAPS_API_KEY) {
        try {
          const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
              place_id: place.place_id,
              fields: 'name,formatted_address,address_components',
              key: process.env.GOOGLE_MAPS_API_KEY
            }
          });
          
          if (detailsResponse.data.status === 'OK' && detailsResponse.data.result) {
            const details = detailsResponse.data.result;
            // Use the official name from Place Details if available
            if (details.name && (details.name.toLowerCase().includes('airport') || details.name.toLowerCase().includes('international'))) {
              cleanName = details.name;
            }
            
            // Try to extract code from address components if not found in name
            if (!code && details.address_components) {
              for (const component of details.address_components) {
                if (component.short_name && component.short_name.length === 3 && /^[A-Z]{3}$/.test(component.short_name)) {
                  code = component.short_name;
                  break;
                }
              }
            }
          }
        } catch (err) {
          // Silently fail, continue with name-based extraction
        }
      }

      // ALWAYS verify with Amadeus API if available - it only returns commercial airports
      // This is the best way to filter out small airfields
      let amadeusVerified = false;
      let finalLat = airportLat;
      let finalLng = airportLng;
      
      if (process.env.AMADEUS_API_KEY || process.env.AMADEUS_CLIENT_ID) {
        try {
          const amadeusInfo = await findNearestAirportAmadeus(airportLat, airportLng);
          if (amadeusInfo && amadeusInfo.code) {
            // Check if Amadeus airport is close enough (within 5km) to be the same airport
            const amadeusDistance = calculateDistance(airportLat, airportLng, amadeusInfo.lat, amadeusInfo.lng);
            if (amadeusDistance < 5) {
              // If Amadeus found an airport at this location, it's commercial
              amadeusVerified = true;
              // Use Amadeus code and name - they're more reliable
              code = amadeusInfo.code;
              if (amadeusInfo.name && amadeusInfo.name.toLowerCase().includes('airport')) {
                cleanName = amadeusInfo.name;
              }
              // Use Amadeus coordinates (more accurate)
              finalLat = amadeusInfo.lat;
              finalLng = amadeusInfo.lng;
            }
          }
        } catch (err) {
          // If Amadeus fails, we'll continue with Google data but be more strict
          console.log(`[AirportService] Amadeus verification failed for ${name}, will use strict filtering`);
        }
      }

      // Only include airports that are:
      // 1. Verified by Amadeus (commercial), OR
      // 2. Explicitly commercial (has "Airport" or "International" in name) AND has IATA code
      if (code && (amadeusVerified || (isCommercial && code))) {
        // If we've seen this code before, keep the better one (commercial, then closer)
        if (seenCodes.has(code)) {
          const existingIndex = airports.findIndex(a => a.code === code);
          if (existingIndex >= 0) {
            const existing = airports[existingIndex];
            // Replace if current is commercial and existing is not, or if current is closer
            const shouldReplace = (isCommercial && !existing.isCommercial) ||
                                 (isCommercial === existing.isCommercial && distance < existing.distance_km);
            if (shouldReplace) {
              airports.splice(existingIndex, 1);
            } else {
              continue; // Keep existing, skip current
            }
          }
        } else {
          seenCodes.add(code);
        }
        
        // Final cleanup of airport name (if not already cleaned from Place Details)
        if (cleanName === name) {
          cleanName = name
            .replace(/\s*\([A-Z]{3}\)\s*/g, '') // Remove IATA code in parentheses
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        }

        airports.push({
          code,
          name: cleanName,
          lat: finalLat,
          lng: finalLng,
          distance_km: Math.round(distance * 10) / 10,
          isCommercial: isCommercial || amadeusVerified,
          amadeusVerified: amadeusVerified
        });
      }
    }

    // Country-to-main-airport mapping (ensure main airport is always included)
    const countryMainAirports = {
      'MLT': 'MLA', // Malta
      'MT': 'MLA',
      'Malta': 'MLA',
      'DEU': 'FRA', // Germany (Frankfurt is main hub)
      'DE': 'FRA',
      'Germany': 'FRA',
      'FRA': 'CDG', // France
      'FR': 'CDG',
      'France': 'CDG',
      'GBR': 'LHR', // UK
      'GB': 'LHR',
      'United Kingdom': 'LHR',
      'ITA': 'FCO', // Italy
      'IT': 'FCO',
      'Italy': 'FCO',
      'ESP': 'MAD', // Spain
      'ES': 'MAD',
      'Spain': 'MAD'
    };
    
    // If country is specified, ensure main airport is included
    if (country) {
      const countryUpper = country.toUpperCase();
      const mainAirportCode = countryMainAirports[countryUpper] || countryMainAirports[country];
      
      if (mainAirportCode) {
        // Check if main airport is already in the list
        const hasMainAirport = airports.some(a => a.code === mainAirportCode);
        
        if (!hasMainAirport) {
          // Try to find it in Amadeus results or add it
          try {
            // Search for the main airport specifically
            const mainAirportSearch = await findNearestAirportsAmadeus(lat, lng, 10);
            const mainAirport = mainAirportSearch.find(a => a.code === mainAirportCode);
            
            if (mainAirport) {
              airports.push(mainAirport);
              seenCodes.add(mainAirportCode);
              console.log(`[AirportService] Added main airport ${mainAirportCode} for country ${country}`);
            }
          } catch (err) {
            console.warn(`[AirportService] Could not find main airport ${mainAirportCode} for ${country}`);
          }
        }
      }
    }

    // Sort: Same country first (if country specified), then Amadeus-verified, then commercial, then by distance
    airports.sort((a, b) => {
      // If country is specified, prioritize airports that match known country patterns
      if (country) {
        const countryUpper = country.toUpperCase();
        const mainAirportCode = countryMainAirports[countryUpper] || countryMainAirports[country];
        
        // Prioritize main airport of the country
        if (mainAirportCode) {
          if (a.code === mainAirportCode && b.code !== mainAirportCode) return -1;
          if (a.code !== mainAirportCode && b.code === mainAirportCode) return 1;
        }
      }
      
      // Prioritize Amadeus-verified airports (most reliable)
      if (a.amadeusVerified && !b.amadeusVerified) return -1;
      if (!a.amadeusVerified && b.amadeusVerified) return 1;
      // Then prioritize commercial airports
      if (a.isCommercial && !b.isCommercial) return -1;
      if (!a.isCommercial && b.isCommercial) return 1;
      // Finally sort by distance
      return a.distance_km - b.distance_km;
    });
    
    const topAirports = airports.slice(0, limit);
    
    console.log(`[AirportService] Found ${topAirports.length} airports:`, topAirports.map(a => `${a.name} (${a.code}) - ${a.distance_km}km ${a.amadeusVerified ? '[Amadeus]' : ''}`).join(', '));
    return topAirports;

  } catch (error) {
    console.error('[AirportService] Error finding multiple airports:', error.message);
    console.log('[AirportService] Falling back to local database...');
    
    // Final fallback: use local database (commercial airports only)
    try {
      const localAirports = findNearestAirportsLocal(lat, lng, limit, 500, true, 'small');
      if (localAirports.length > 0) {
        console.log(`[AirportService] Found ${localAirports.length} commercial airports from local database`);
        return localAirports.map(a => ({
          ...a,
          amadeusVerified: false,
          isCommercial: true
        }));
      }
    } catch (localError) {
      console.error('[AirportService] Local database fallback also failed:', localError.message);
    }
    
    return [];
  }
}

module.exports = { 
  findNearestAirport, 
  findNearestAirports,
  findAirportByIATALocal,
  findAirportByICAOLocal,
  findAirportByCodeLocal,
  searchAirportsLocal,
  findNearestAirportsLocal
};

