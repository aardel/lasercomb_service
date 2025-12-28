/**
 * Script to build a comprehensive local airport database
 * Downloads airport data from OpenFlights and formats it for local use
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const AIRPORTS_DATA_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const OUTPUT_FILE = path.join(__dirname, '../data/airports.json');

async function buildAirportDatabase() {
  console.log('🛫 Building comprehensive airport database...\n');
  
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created directory: ${dataDir}`);
    }

    console.log('📥 Downloading airport data from OpenFlights...');
    const response = await axios.get(AIRPORTS_DATA_URL, {
      responseType: 'text',
      timeout: 30000
    });

    console.log('✅ Downloaded airport data');
    console.log('🔄 Processing airport data...\n');

    const lines = response.data.split('\n');
    const airports = [];
    let processed = 0;
    let skipped = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      // OpenFlights format: Airport ID, Name, City, Country, IATA, ICAO, Latitude, Longitude, Altitude, Timezone, DST, Tz database time zone, Type, Source
      const parts = line.split(',').map(p => {
        // Remove quotes and trim
        return p.replace(/^"/, '').replace(/"$/, '').trim();
      });

      if (parts.length < 14) continue;

      const airportId = parts[0];
      const name = parts[1];
      const city = parts[2];
      const country = parts[3];
      const iata = parts[4];
      const icao = parts[5];
      const latitude = parseFloat(parts[6]);
      const longitude = parseFloat(parts[7]);
      const altitude = parseInt(parts[8]) || 0;
      const timezone = parts[9];
      const dst = parts[10];
      const tzDatabase = parts[11];
      const type = parts[12];
      const source = parts[13];

      // Only include airports with valid IATA codes (3 letters) and coordinates
      if (!iata || iata.length !== 3 || !/^[A-Z]{3}$/.test(iata)) {
        skipped++;
        continue;
      }

      if (isNaN(latitude) || isNaN(longitude)) {
        skipped++;
        continue;
      }

      // Filter out heliports, closed airports, and non-commercial airfields
      const typeLower = (type || '').toLowerCase();
      const nameLower = (name || '').toLowerCase();
      
      // Skip heliports, closed airports, and airfields
      if (typeLower === 'heliport' || 
          typeLower === 'closed' ||
          nameLower.includes('heliport') ||
          nameLower.includes('helipad') ||
          nameLower.includes('héli') ||
          nameLower.includes('helicopter')) {
        skipped++;
        continue;
      }

      // Determine if commercial airport (has scheduled passenger service)
      // Commercial indicators: "International", major city names, or known commercial airports
      const isCommercial = nameLower.includes('international') ||
                          nameLower.includes('airport') ||
                          typeLower === 'airport' ||
                          (city && city.length > 0); // Most commercial airports have city data

      // Determine airport size based on name patterns and known major airports
      let size = 'small'; // default
      const knownHubs = [
        'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'SEA', 'LAS', 'MIA',
        'LHR', 'CDG', 'AMS', 'FRA', 'MUC', 'FCO', 'MAD', 'BCN', 'LGW', 'STN',
        'DXB', 'AUH', 'DOH', 'IST', 'SIN', 'HKG', 'NRT', 'ICN', 'PEK', 'PVG',
        'SYD', 'MEL', 'BNE', 'AKL', 'YYZ', 'YVR', 'GRU', 'GIG', 'EZE', 'SCL'
      ];
      
      if (knownHubs.includes(iata)) {
        size = 'hub';
      } else if (nameLower.includes('international') || nameLower.includes('hub')) {
        size = 'large';
      } else if (nameLower.includes('regional') || nameLower.includes('municipal')) {
        size = 'medium';
      } else if (isCommercial && city) {
        // Commercial airports in major cities are likely medium or large
        size = 'medium';
      }

      airports.push({
        id: airportId,
        iata: iata,
        icao: icao || null,
        name: name,
        city: city || null,
        country: country || null,
        lat: latitude,
        lng: longitude,
        altitude: altitude,
        timezone: timezone || null,
        tzDatabase: tzDatabase || null,
        type: type || null,
        isCommercial: isCommercial,
        size: size
      });

      processed++;
    }

    // Sort by country, then by city, then by name
    airports.sort((a, b) => {
      if (a.country !== b.country) {
        return (a.country || '').localeCompare(b.country || '');
      }
      if (a.city !== b.city) {
        return (a.city || '').localeCompare(b.city || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Create indexes by IATA and ICAO codes for fast lookup
    const iataIndex = {};
    const icaoIndex = {};
    let commercialCount = 0;
    let hubCount = 0;
    let largeCount = 0;
    let mediumCount = 0;
    let smallCount = 0;

    airports.forEach(airport => {
      if (airport.iata && !iataIndex[airport.iata]) {
        iataIndex[airport.iata] = airport;
      }
      if (airport.icao && !icaoIndex[airport.icao]) {
        icaoIndex[airport.icao] = airport;
      }
      
      // Count by size
      if (airport.isCommercial) commercialCount++;
      if (airport.size === 'hub') hubCount++;
      else if (airport.size === 'large') largeCount++;
      else if (airport.size === 'medium') mediumCount++;
      else smallCount++;
    });

    const database = {
      metadata: {
        version: '2.0.0',
        source: 'OpenFlights',
        lastUpdated: new Date().toISOString(),
        totalAirports: airports.length,
        totalWithIATA: Object.keys(iataIndex).length,
        totalWithICAO: Object.keys(icaoIndex).length,
        commercialAirports: commercialCount,
        sizeBreakdown: {
          hub: hubCount,
          large: largeCount,
          medium: mediumCount,
          small: smallCount
        }
      },
      airports: airports,
      iataIndex: iataIndex,
      icaoIndex: icaoIndex
    };

    console.log(`✅ Processed ${processed} commercial airports with IATA codes`);
    console.log(`⏭️  Skipped ${skipped} entries (heliports, closed, or invalid data)`);
    console.log(`📊 Total unique IATA codes: ${Object.keys(iataIndex).length}`);
    console.log(`📊 Total unique ICAO codes: ${Object.keys(icaoIndex).length}`);
    console.log(`📊 Commercial airports: ${commercialCount}`);
    console.log(`📊 Size breakdown: ${hubCount} hubs, ${largeCount} large, ${mediumCount} medium, ${smallCount} small\n`);

    console.log('💾 Saving to file...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));
    console.log(`✅ Database saved to: ${OUTPUT_FILE}`);
    console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB\n`);

    // Show sample airports
    console.log('📋 Sample airports:');
    airports.slice(0, 10).forEach(airport => {
      console.log(`   ${airport.iata} - ${airport.name} (${airport.city}, ${airport.country})`);
    });

    console.log('\n✅ Airport database build complete!');

  } catch (error) {
    console.error('❌ Error building airport database:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data.substring(0, 200));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildAirportDatabase();
}

module.exports = { buildAirportDatabase };

