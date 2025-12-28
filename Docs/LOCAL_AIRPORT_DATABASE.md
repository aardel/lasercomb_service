# Local Airport Database

## Overview

A comprehensive local database of international airports has been implemented to resolve IATA code lookup issues. This database contains **6,053 airports** with IATA codes, coordinates, names, cities, and countries.

## Benefits

1. **Reliability**: No dependency on external APIs that may fail or have rate limits
2. **Speed**: Instant lookups without network requests
3. **Offline Support**: Works even when external APIs are unavailable
4. **Comprehensive Coverage**: Includes airports from all countries worldwide
5. **Fallback Solution**: Automatically used when Google Places or Amadeus APIs fail

## Database Details

- **Source**: OpenFlights Airport Database
- **Total Airports**: 6,024 commercial airports with valid IATA codes
- **Heliports**: Filtered out (0 heliports in database)
- **Commercial Airports**: 6,024 (100% commercial)
- **Airport Sizes**: 40 hubs, 860 large, 5,085 medium, 39 small
- **File Location**: `backend/data/airports.json`
- **File Size**: ~7 MB
- **Last Updated**: Automatically updated when building the database

## Database Structure

```json
{
  "metadata": {
    "version": "2.0.0",
    "source": "OpenFlights",
    "lastUpdated": "2025-12-21T...",
    "totalAirports": 6024,
    "totalWithIATA": 6024,
    "totalWithICAO": 6024,
    "commercialAirports": 6024,
    "sizeBreakdown": {
      "hub": 40,
      "large": 860,
      "medium": 5085,
      "small": 39
    }
  },
  "airports": [
    {
      "id": "1",
      "iata": "MLA",
      "icao": "LMML",
      "name": "Malta International Airport",
      "city": "Malta",
      "country": "Malta",
      "lat": 35.857498,
      "lng": 14.4775,
      "altitude": 300,
      "timezone": "4.5",
      "tzDatabase": "Europe/Malta",
      "type": "airport",
      "isCommercial": true,
      "size": "large"
    }
  ],
  "iataIndex": {
    "MLA": { ... },
    "CDG": { ... }
  },
  "icaoIndex": {
    "LMML": { ... },
    "LFPG": { ... }
  }
}
```

### Airport Size Categories

- **hub**: Major international hubs (40 airports)
  - Examples: JFK, LHR, CDG, FRA, DXB, SIN
  
- **large**: Large international airports (860 airports)
  - Examples: MLA, BCN, MXP, MAD
  
- **medium**: Medium-sized commercial airports (5,085 airports)
  - Most regional and domestic airports
  
- **small**: Small commercial airports (39 airports)
  - Smaller regional airports with limited service

## Usage

### Building/Updating the Database

To build or update the airport database:

```bash
cd backend
node scripts/build-airport-database.js
```

This script:
1. Downloads the latest airport data from OpenFlights
2. Filters for airports with valid IATA codes
3. Excludes heliports and closed airports
4. Creates an optimized JSON file with IATA index for fast lookups

### Using the Database in Code

The airport service automatically uses the local database as a fallback:

```javascript
const { 
  findNearestAirport, 
  findNearestAirports,
  findAirportByIATALocal,
  findAirportByICAOLocal,
  findAirportByCodeLocal,
  searchAirportsLocal,
  findNearestAirportsLocal
} = require('./src/services/airport.service');

// Find nearest airport (uses local DB as fallback, commercial only)
const airport = await findNearestAirport({ lat: 35.8833, lng: 14.5000 });
// Returns: { code, name, city, country, lat, lng, icao, isCommercial, size, timezone, ... }

// Find airport by IATA code
const airport = findAirportByIATALocal('MLA');

// Find airport by ICAO code
const airport = findAirportByICAOLocal('LMML');

// Universal lookup (IATA or ICAO)
const airport = findAirportByCodeLocal('MLA');  // or 'LMML'

// Search airports by name/city (commercial only, filters heliports)
const airports = searchAirportsLocal('Malta', 10, true);

// Find nearest airports from local DB only
// Parameters: lat, lng, limit, maxDistanceKm, commercialOnly, minSize
const airports = findNearestAirportsLocal(35.8833, 14.5000, 5, 200, true, 'small');
// Options for minSize: 'small', 'medium', 'large', 'hub'

// Get only hub airports
const hubs = findNearestAirportsLocal(40.7128, -74.0060, 5, 200, true, 'hub');

// Get large or larger airports
const largeAirports = findNearestAirportsLocal(51.5074, -0.1278, 5, 200, true, 'large');
```

### Returned Airport Object

All functions return airport objects with the following structure:

```javascript
{
  code: 'MLA',                    // IATA code (3 letters)
  icao: 'LMML',                  // ICAO code (4 letters)
  name: 'Malta International Airport',
  city: 'Malta',
  country: 'Malta',
  lat: 35.857498,
  lng: 14.4775,
  distance_km: 3.5,              // Distance from search point (if applicable)
  source: 'local_database',
  isCommercial: true,            // Always true (heliports filtered)
  size: 'large',                 // 'hub', 'large', 'medium', or 'small'
  timezone: 'Europe/Malta',      // IANA timezone (tzDatabase)
  timezoneOffset: '4.5'          // UTC offset (timezone)
}
```

## How It Works

### Priority Order

The airport service uses the following priority order:

1. **Google Places API** (if available) - Finds airports near coordinates
2. **Amadeus API** (if available) - Verifies commercial airports
3. **Local Database** - **Final fallback** when APIs fail or don't return IATA codes

### Fallback Scenarios

The local database is automatically used when:

- Google Places API doesn't return an IATA code
- Amadeus API is unavailable or fails
- Google Maps API key is not configured
- Network requests fail or timeout
- No airports found within search radius via APIs

### Example Flow

```
1. User provides coordinates: lat=35.8833, lng=14.5000
2. Try Google Places API → Returns "Malta Airport" but no IATA code
3. Try Amadeus API → Not available or fails
4. Fallback to Local Database → Finds MLA (Malta International Airport)
5. Return: { code: 'MLA', name: 'Malta International Airport', ... }
```

## Testing

Run the test script to verify the database:

```bash
cd backend
node test-local-airports.js
```

This tests:
- IATA code lookups
- Airport name/city searches
- Nearest airport searches by coordinates
- Full integration with existing airport service

## Maintenance

### Updating the Database

The airport database should be updated periodically (e.g., quarterly) to include:
- New airports
- Airport code changes
- Closed airports (filtered out automatically)
- Coordinate updates

To update:

```bash
cd backend
node scripts/build-airport-database.js
```

### Adding Custom Airports

If you need to add custom airports not in the OpenFlights database:

1. Edit `backend/data/airports.json` manually
2. Add entry to `airports` array
3. Add entry to `iataIndex` object
4. Update `metadata.totalAirports` count

## Troubleshooting

### Database Not Found

If you see: `Local airport database not found`

**Solution**: Run the build script:
```bash
node scripts/build-airport-database.js
```

### Missing IATA Codes

If certain airports are missing IATA codes:

1. Check if the airport exists in OpenFlights database
2. Verify the airport has a valid 3-letter IATA code
3. Some airports may only have ICAO codes (4 letters) - these are excluded

### Performance

The database is loaded once at startup and cached in memory. Lookups are instant (<1ms).

For large-scale searches, consider:
- Using the IATA index for direct lookups
- Limiting search radius for coordinate-based searches
- Caching frequently accessed airports

## Statistics

- **Total Airports**: 6,024 commercial airports
- **Heliports**: 0 (all filtered out)
- **Countries Covered**: ~200+
- **Airport Sizes**: 40 hubs, 860 large, 5,085 medium, 39 small
- **IATA Codes**: 6,024 unique codes
- **ICAO Codes**: 6,024 unique codes
- **Average Distance Accuracy**: ±5km
- **Lookup Speed**: <1ms (in-memory)
- **Database Size**: ~7 MB
- **Commercial Airports**: 100% (all airports are commercial)

## Related Files

- `backend/data/airports.json` - Airport database file (6,024 airports)
- `backend/scripts/build-airport-database.js` - Database builder script
- `backend/src/services/airport.service.js` - Airport service with local DB integration
- `backend/test-local-airports.js` - Basic test script
- `backend/test-airport-features.js` - Enhanced features test script

## Testing

### Basic Tests

```bash
cd backend
node test-local-airports.js
```

Tests:
- IATA code lookups
- Airport name/city searches
- Nearest airport searches by coordinates
- Full integration with existing airport service

### Enhanced Features Tests

```bash
cd backend
node test-airport-features.js
```

Tests:
- ICAO code lookups
- Universal code lookup (IATA/ICAO)
- Airport size categorization
- Commercial airport filtering
- Heliport filtering
- Timezone information
- Size-based filtering

## Features Implemented ✅

All planned enhancements have been completed:

1. ✅ **Heliports Filtered**: All heliports removed from database (0 heliports)
2. ✅ **Commercial Airports Only**: 100% commercial airports (6,024 airports)
3. ✅ **Airport Size Categories**: Hub, large, medium, small classification
4. ✅ **Timezone Information**: IANA timezone and UTC offset included
5. ✅ **ICAO Code Support**: Full ICAO code lookup and indexing
6. ✅ **Commercial Prioritization**: Commercial airports prioritized in searches
7. ✅ **Size-Based Filtering**: Filter results by minimum airport size

## Usage Examples

### Example 1: Find Nearest Hub Airport

```javascript
const { findNearestAirportsLocal } = require('./src/services/airport.service');

// Find only hub airports near New York
const hubs = findNearestAirportsLocal(40.7128, -74.0060, 3, 200, true, 'hub');
// Returns: [{ code: 'JFK', size: 'hub', ... }]
```

### Example 2: Lookup by ICAO Code

```javascript
const { findAirportByICAOLocal } = require('./src/services/airport.service');

const airport = findAirportByICAOLocal('LMML');
// Returns: { code: 'MLA', icao: 'LMML', name: 'Malta International Airport', ... }
```

### Example 3: Get Timezone for Calculations

```javascript
const { findAirportByIATALocal } = require('./src/services/airport.service');

const airport = findAirportByIATALocal('JFK');
console.log(airport.timezone);        // 'America/New_York'
console.log(airport.timezoneOffset);  // '-5'
```

### Example 4: Search with Size Filter

```javascript
const { findNearestAirportsLocal } = require('./src/services/airport.service');

// Get only large or hub airports
const largeAirports = findNearestAirportsLocal(51.5074, -0.1278, 5, 200, true, 'large');
// Filters out small and medium airports
```

