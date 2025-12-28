// Load environment variables
require('dotenv').config();

const { findNearestAirports } = require('./src/services/airport.service');

// Test locations with known international airports
const testLocations = [
  {
    name: 'Malta (Marsa)',
    lat: 35.8833,
    lng: 14.5000,
    country: 'Malta',
    expectedAirport: 'MLA' // Malta International Airport
  },
  {
    name: 'Paris (City Center)',
    lat: 48.8566,
    lng: 2.3522,
    country: 'France',
    expectedAirports: ['CDG', 'ORY'] // Charles de Gaulle and Orly
  },
  {
    name: 'London (City Center)',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom',
    expectedAirports: ['LHR', 'LGW', 'STN'] // Heathrow, Gatwick, Stansted
  },
  {
    name: 'Rome (City Center)',
    lat: 41.9028,
    lng: 12.4964,
    country: 'Italy',
    expectedAirports: ['FCO', 'CIA'] // Fiumicino and Ciampino
  },
  {
    name: 'Berlin (City Center)',
    lat: 52.5200,
    lng: 13.4050,
    country: 'Germany',
    expectedAirports: ['BER', 'SXF'] // Berlin Brandenburg
  },
  {
    name: 'Stuttgart (Notzingen)',
    lat: 48.6693,
    lng: 9.4524,
    country: 'Germany',
    expectedAirports: ['STR', 'FRA'] // Stuttgart and Frankfurt
  }
];

async function testAirportSearch() {
  console.log('🧪 Testing Airport Search Functionality\n');
  console.log('='.repeat(80));
  
  for (const location of testLocations) {
    console.log(`\n📍 Testing: ${location.name}`);
    console.log(`   Coordinates: ${location.lat}, ${location.lng}`);
    console.log(`   Country: ${location.country}`);
    console.log(`   Expected: ${location.expectedAirports ? location.expectedAirports.join(', ') : location.expectedAirport}`);
    console.log('-'.repeat(80));
    
    try {
      const airports = await findNearestAirports(
        { lat: location.lat, lng: location.lng, country: location.country },
        null,
        3
      );
      
      console.log(`✅ Found ${airports.length} airports:`);
      airports.forEach((airport, index) => {
        const isExpected = location.expectedAirports 
          ? location.expectedAirports.includes(airport.code)
          : airport.code === location.expectedAirport;
        
        const status = isExpected ? '✓' : '✗';
        console.log(`   ${status} ${index + 1}. ${airport.name} (${airport.code}) - ${airport.distance_km}km ${airport.amadeusVerified ? '[Amadeus]' : '[Google]'}`);
      });
      
      // Check if expected airport is in results
      const foundExpected = location.expectedAirports
        ? location.expectedAirports.some(code => airports.some(a => a.code === code))
        : airports.some(a => a.code === location.expectedAirport);
      
      if (!foundExpected) {
        console.log(`   ⚠️  WARNING: Expected airport(s) not found in results!`);
      } else {
        // Check if expected airport is first
        const firstIsExpected = location.expectedAirports
          ? location.expectedAirports.includes(airports[0]?.code)
          : airports[0]?.code === location.expectedAirport;
        
        if (!firstIsExpected) {
          console.log(`   ⚠️  WARNING: Expected airport exists but is not first!`);
        } else {
          console.log(`   ✅ SUCCESS: Expected airport is first in results!`);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}`);
      console.error(error.stack);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Testing complete!\n');
}

// Run tests
testAirportSearch().catch(console.error);

