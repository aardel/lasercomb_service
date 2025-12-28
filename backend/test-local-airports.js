// Test script to verify local airport database functionality
require('dotenv').config();

const { 
  findNearestAirport, 
  findNearestAirports,
  findAirportByIATALocal,
  searchAirportsLocal,
  findNearestAirportsLocal
} = require('./src/services/airport.service');

async function testLocalAirportDatabase() {
  console.log('🧪 Testing Local Airport Database\n');
  console.log('='.repeat(80));

  // Test 1: Find airport by IATA code
  console.log('\n📋 Test 1: Find airport by IATA code');
  console.log('-'.repeat(80));
  const testCodes = ['MLA', 'CDG', 'LHR', 'FRA', 'JFK', 'DXB', 'SYD'];
  for (const code of testCodes) {
    const airport = findAirportByIATALocal(code);
    if (airport) {
      console.log(`✅ ${code}: ${airport.name} (${airport.city}, ${airport.country})`);
      console.log(`   Coordinates: ${airport.lat}, ${airport.lng}`);
    } else {
      console.log(`❌ ${code}: Not found`);
    }
  }

  // Test 2: Search airports by name/city
  console.log('\n📋 Test 2: Search airports by name/city');
  console.log('-'.repeat(80));
  const searchQueries = ['Malta', 'Paris', 'London', 'Berlin'];
  for (const query of searchQueries) {
    const results = searchAirportsLocal(query, 3);
    console.log(`\n🔍 Query: "${query}" - Found ${results.length} airports:`);
    results.forEach((airport, idx) => {
      console.log(`   ${idx + 1}. ${airport.code} - ${airport.name} (${airport.city}, ${airport.country})`);
    });
  }

  // Test 3: Find nearest airports by coordinates
  console.log('\n📋 Test 3: Find nearest airports by coordinates');
  console.log('-'.repeat(80));
  const testLocations = [
    { name: 'Malta (Marsa)', lat: 35.8833, lng: 14.5000, expected: 'MLA' },
    { name: 'Paris (City Center)', lat: 48.8566, lng: 2.3522, expected: 'CDG' },
    { name: 'London (City Center)', lat: 51.5074, lng: -0.1278, expected: 'LHR' },
    { name: 'Berlin (City Center)', lat: 52.5200, lng: 13.4050, expected: 'BER' },
    { name: 'New York (Manhattan)', lat: 40.7128, lng: -74.0060, expected: 'JFK' },
  ];

  for (const location of testLocations) {
    console.log(`\n📍 ${location.name} (${location.lat}, ${location.lng})`);
    const airports = findNearestAirportsLocal(location.lat, location.lng, 3, 200);
    if (airports.length > 0) {
      console.log(`   Found ${airports.length} airports:`);
      airports.forEach((airport, idx) => {
        const isExpected = airport.code === location.expected;
        const marker = isExpected ? '✅' : '  ';
        console.log(`   ${marker} ${idx + 1}. ${airport.code} - ${airport.name} (${airport.distance_km}km)`);
      });
      const foundExpected = airports.some(a => a.code === location.expected);
      if (!foundExpected) {
        console.log(`   ⚠️  Expected airport ${location.expected} not in top results`);
      }
    } else {
      console.log(`   ❌ No airports found`);
    }
  }

  // Test 4: Test full findNearestAirport function with local database fallback
  console.log('\n📋 Test 4: Test full findNearestAirport function');
  console.log('-'.repeat(80));
  console.log('Testing with coordinates that might fail external APIs...\n');
  
  const testCoords = [
    { name: 'Malta', lat: 35.8833, lng: 14.5000 },
    { name: 'Remote location (test fallback)', lat: 35.8575, lng: 14.4775 }, // Exact MLA coordinates
  ];

  for (const test of testCoords) {
    console.log(`📍 ${test.name} (${test.lat}, ${test.lng})`);
    try {
      const airport = await findNearestAirport({ lat: test.lat, lng: test.lng });
      if (airport && airport.code) {
        console.log(`   ✅ Found: ${airport.code} - ${airport.name} (${airport.distance_km}km) [Source: ${airport.source}]`);
      } else {
        console.log(`   ❌ No airport found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('✅ Testing complete!\n');
}

// Run tests
testLocalAirportDatabase().catch(console.error);

