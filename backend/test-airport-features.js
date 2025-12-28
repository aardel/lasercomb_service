// Test script for enhanced airport database features
require('dotenv').config();

const { 
  findAirportByIATALocal,
  findAirportByICAOLocal,
  findAirportByCodeLocal,
  searchAirportsLocal,
  findNearestAirportsLocal
} = require('./src/services/airport.service');

async function testEnhancedFeatures() {
  console.log('🧪 Testing Enhanced Airport Database Features\n');
  console.log('='.repeat(80));

  // Test 1: ICAO Code Lookups
  console.log('\n📋 Test 1: ICAO Code Lookups');
  console.log('-'.repeat(80));
  const icaoCodes = [
    { icao: 'LMML', iata: 'MLA', name: 'Malta International Airport' },
    { icao: 'LFPG', iata: 'CDG', name: 'Charles de Gaulle' },
    { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow' },
    { icao: 'EDDF', iata: 'FRA', name: 'Frankfurt' },
    { icao: 'KJFK', iata: 'JFK', name: 'John F Kennedy' }
  ];

  for (const test of icaoCodes) {
    const airport = findAirportByICAOLocal(test.icao);
    if (airport) {
      const match = airport.code === test.iata;
      console.log(`${match ? '✅' : '❌'} ${test.icao} → ${airport.code} - ${airport.name}`);
      console.log(`   Size: ${airport.size}, Commercial: ${airport.isCommercial}, Timezone: ${airport.timezone || 'N/A'}`);
    } else {
      console.log(`❌ ${test.icao}: Not found`);
    }
  }

  // Test 2: Universal Code Lookup (IATA or ICAO)
  console.log('\n📋 Test 2: Universal Code Lookup (IATA or ICAO)');
  console.log('-'.repeat(80));
  const codes = ['MLA', 'LMML', 'CDG', 'LFPG', 'JFK', 'KJFK'];
  for (const code of codes) {
    const airport = findAirportByCodeLocal(code);
    if (airport) {
      console.log(`✅ ${code} → ${airport.code} (${airport.icao || 'no ICAO'}) - ${airport.name}`);
    } else {
      console.log(`❌ ${code}: Not found`);
    }
  }

  // Test 3: Airport Size and Commercial Status
  console.log('\n📋 Test 3: Airport Size and Commercial Status');
  console.log('-'.repeat(80));
  const testAirports = [
    { code: 'JFK', expectedSize: 'hub' },
    { code: 'CDG', expectedSize: 'hub' },
    { code: 'LHR', expectedSize: 'hub' },
    { code: 'MLA', expectedSize: 'large' },
    { code: 'FRA', expectedSize: 'hub' }
  ];

  for (const test of testAirports) {
    const airport = findAirportByIATALocal(test.code);
    if (airport) {
      const sizeMatch = airport.size === test.expectedSize;
      console.log(`${sizeMatch ? '✅' : '⚠️ '} ${test.code}: ${airport.name}`);
      console.log(`   Size: ${airport.size} (expected: ${test.expectedSize})`);
      console.log(`   Commercial: ${airport.isCommercial}`);
      console.log(`   Timezone: ${airport.timezone || airport.timezoneOffset || 'N/A'}`);
    }
  }

  // Test 4: Filter by Size
  console.log('\n📋 Test 4: Filter by Airport Size');
  console.log('-'.repeat(80));
  const locations = [
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 }
  ];

  for (const loc of locations) {
    console.log(`\n📍 ${loc.name}:`);
    
    // Get only hubs
    const hubs = findNearestAirportsLocal(loc.lat, loc.lng, 3, 200, true, 'hub');
    console.log(`   Hubs (${hubs.length}): ${hubs.map(a => `${a.code} (${a.size})`).join(', ') || 'None'}`);
    
    // Get large or larger
    const large = findNearestAirportsLocal(loc.lat, loc.lng, 3, 200, true, 'large');
    console.log(`   Large+ (${large.length}): ${large.map(a => `${a.code} (${a.size})`).join(', ')}`);
    
    // Get all commercial
    const all = findNearestAirportsLocal(loc.lat, loc.lng, 5, 200, true, 'small');
    console.log(`   All Commercial (${all.length}): ${all.map(a => `${a.code} (${a.size})`).join(', ')}`);
  }

  // Test 5: Timezone Information
  console.log('\n📋 Test 5: Timezone Information');
  console.log('-'.repeat(80));
  const timezoneTests = [
    { code: 'JFK', city: 'New York' },
    { code: 'LHR', city: 'London' },
    { code: 'CDG', city: 'Paris' },
    { code: 'DXB', city: 'Dubai' },
    { code: 'SYD', city: 'Sydney' }
  ];

  for (const test of timezoneTests) {
    const airport = findAirportByIATALocal(test.code);
    if (airport) {
      console.log(`${test.code} (${test.city}):`);
      console.log(`   Timezone: ${airport.timezone || 'N/A'}`);
      console.log(`   Offset: ${airport.timezoneOffset || 'N/A'}`);
    }
  }

  // Test 6: Heliport Filtering
  console.log('\n📋 Test 6: Heliport Filtering');
  console.log('-'.repeat(80));
  console.log('Searching for "heliport" - should return 0 results:');
  const heliports = searchAirportsLocal('heliport', 10, true);
  console.log(`   Found: ${heliports.length} (should be 0)`);
  
  if (heliports.length > 0) {
    console.log('   ⚠️  WARNING: Heliports found in results!');
    heliports.forEach(h => console.log(`      - ${h.code}: ${h.name}`));
  } else {
    console.log('   ✅ No heliports found (correct!)');
  }

  // Test 7: Commercial Airport Prioritization
  console.log('\n📋 Test 7: Commercial Airport Prioritization');
  console.log('-'.repeat(80));
  const testCoords = { lat: 35.8833, lng: 14.5000 }; // Malta
  const commercialOnly = findNearestAirportsLocal(testCoords.lat, testCoords.lng, 5, 200, true, 'small');
  const allTypes = findNearestAirportsLocal(testCoords.lat, testCoords.lng, 5, 200, false, 'small');
  
  console.log(`Malta area (${testCoords.lat}, ${testCoords.lng}):`);
  console.log(`   Commercial only: ${commercialOnly.length} airports`);
  commercialOnly.forEach((a, i) => {
    console.log(`      ${i + 1}. ${a.code} - ${a.name} (${a.size}, commercial: ${a.isCommercial})`);
  });
  
  console.log(`   All types: ${allTypes.length} airports`);
  console.log(`   Difference: ${allTypes.length - commercialOnly.length} non-commercial filtered out`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Enhanced features testing complete!\n');
}

testEnhancedFeatures().catch(console.error);

