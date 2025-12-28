/**
 * Comprehensive Fee Calculation & Edge Case Tests
 * Run with: node tests/fee-calculation-tests.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const ENGINEER_LOCATION = { lat: 48.6693, lng: 9.4524 }; // Stuttgart area

// Test configurations
const TEST_CASES = [
  // =====================================================
  // SECTION 1: FEE CALCULATION TESTS
  // =====================================================
  {
    name: '1.1 Germany/Munich - Car Only (Short Trip) with Fees',
    description: 'Short trip where flight is skipped, verify car fees apply',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-1',
        city: 'Munich',
        country: 'Germany',
        coordinates: { lat: 48.1351, lng: 11.5820 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      flight_option: 'NULL_OR_SKIPPED', // Short trip
      fees: {
        agent_fee: 50,
        company_fee: 75,
        additional_fee_percent: 10
      }
    }
  },
  {
    name: '1.2 India/Chennai - Flight Only (Overseas) with 20% Fee',
    description: 'Overseas trip where driving is impossible',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-2',
        city: 'Chennai',
        country: 'India',
        coordinates: { lat: 13.0827, lng: 80.2707 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'NULL',
      flight_option: 'PRESENT',
      fees: {
        agent_fee: 0,
        company_fee: 0,
        additional_fee_percent: 20
      }
    }
  },
  {
    name: '1.3 France/Paris - Both Options with City-Specific Fees',
    description: 'Medium distance with both options, Paris has specific rates',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-3',
        city: 'Paris',
        country: 'France',
        coordinates: { lat: 48.8566, lng: 2.3522 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      flight_option: 'PRESENT',
      fees: {
        check_city_specific: true
      }
    }
  },
  {
    name: '1.4 Italy/Bergamo - Both Options (No Special Fees)',
    description: 'Italy default rates, no additional fees configured',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-4',
        city: 'Bergamo',
        country: 'Italy',
        coordinates: { lat: 45.6983, lng: 9.6773 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      flight_option: 'PRESENT',
      fees: {
        agent_fee: 0,
        company_fee: 0,
        additional_fee_percent: 0
      }
    }
  },
  {
    name: '1.5 USA/New York - Flight Only (Transatlantic)',
    description: 'Transatlantic trip, no driving possible',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-5',
        city: 'New York',
        country: 'United States',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        work_hours: 16
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-20'
    },
    expectedBehavior: {
      road_option: 'NULL',
      flight_option: 'PRESENT'
    }
  },
  
  // =====================================================
  // SECTION 2: CITY-SPECIFIC RATE TESTS
  // =====================================================
  {
    name: '2.1 UK/London - City-Specific Hotel Rate',
    description: 'London has higher hotel rate than UK default',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-6',
        city: 'London',
        country: 'United Kingdom',
        coordinates: { lat: 51.5074, lng: -0.1278 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      check_city_specific_rate: 'London'
    }
  },
  {
    name: '2.2 Switzerland/Geneva - City-Specific Rate',
    description: 'Geneva has different rates than Zurich or Switzerland default',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-7',
        city: 'Geneva',
        country: 'Switzerland',
        coordinates: { lat: 46.2044, lng: 6.1432 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      check_city_specific_rate: 'Geneva'
    }
  },
  
  // =====================================================
  // SECTION 3: EDGE CASES - ROAD OPTION
  // =====================================================
  {
    name: '3.1 Very Short Trip - 50km (Ulm)',
    description: 'Very short trip, should be car only',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-8',
        city: 'Ulm',
        country: 'Germany',
        coordinates: { lat: 48.4011, lng: 9.9876 },
        work_hours: 4
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      flight_option: 'NULL_OR_SKIPPED',
      recommended: 'road'
    }
  },
  {
    name: '3.2 Medium Trip - 400km (Amsterdam)',
    description: 'Medium distance where both options should be available',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-9',
        city: 'Amsterdam',
        country: 'Netherlands',
        coordinates: { lat: 52.3676, lng: 4.9041 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      flight_option: 'PRESENT'
    }
  },
  {
    name: '3.3 Long European Trip - 1500km (Madrid)',
    description: 'Long distance but still drivable',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-10',
        city: 'Madrid',
        country: 'Spain',
        coordinates: { lat: 40.4168, lng: -3.7038 },
        work_hours: 16
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT_OR_NULL', // May exceed 15h threshold
      flight_option: 'PRESENT'
    }
  },
  
  // =====================================================
  // SECTION 4: EDGE CASES - FLIGHT OPTION
  // =====================================================
  {
    name: '4.1 Japan/Tokyo - Very Long Flight',
    description: 'Very long distance, flight only',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-11',
        city: 'Tokyo',
        country: 'Japan',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        work_hours: 24
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-20'
    },
    expectedBehavior: {
      road_option: 'NULL',
      flight_option: 'PRESENT'
    }
  },
  {
    name: '4.2 Australia/Sydney - Antipodal Destination',
    description: 'Maximum distance destination',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-12',
        city: 'Sydney',
        country: 'Australia',
        coordinates: { lat: -33.8688, lng: 151.2093 },
        work_hours: 40
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-25'
    },
    expectedBehavior: {
      road_option: 'NULL',
      flight_option: 'PRESENT'
    }
  },
  
  // =====================================================
  // SECTION 5: MULTI-CUSTOMER TRIPS
  // =====================================================
  {
    name: '5.1 Multi-Customer: Munich + Frankfurt (Short)',
    description: 'Two German cities, car route',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [
        {
          id: 'test-13a',
          city: 'Munich',
          country: 'Germany',
          coordinates: { lat: 48.1351, lng: 11.5820 },
          work_hours: 4
        },
        {
          id: 'test-13b',
          city: 'Frankfurt',
          country: 'Germany',
          coordinates: { lat: 50.1109, lng: 8.6821 },
          work_hours: 4
        }
      ],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      multi_customer: true
    }
  },
  {
    name: '5.2 Multi-Customer: Paris + Milan (International)',
    description: 'Two countries, mixed routing',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [
        {
          id: 'test-14a',
          city: 'Paris',
          country: 'France',
          coordinates: { lat: 48.8566, lng: 2.3522 },
          work_hours: 4
        },
        {
          id: 'test-14b',
          city: 'Milan',
          country: 'Italy',
          coordinates: { lat: 45.4642, lng: 9.1900 },
          work_hours: 4
        }
      ],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      road_option: 'PRESENT',
      flight_option: 'PRESENT',
      multi_customer: true
    }
  },
  
  // =====================================================
  // SECTION 6: ZERO/NULL VALUES
  // =====================================================
  {
    name: '6.1 Zero Work Hours',
    description: 'Edge case with 0 work hours',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-15',
        city: 'Munich',
        country: 'Germany',
        coordinates: { lat: 48.1351, lng: 11.5820 },
        work_hours: 0
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      should_handle_gracefully: true
    }
  },
  {
    name: '6.2 Country with No Custom Fees (Belgium)',
    description: 'Country without custom fee configuration',
    endpoint: '/costs/calculate-multi-stop',
    payload: {
      customers: [{
        id: 'test-16',
        city: 'Brussels',
        country: 'Belgium',
        coordinates: { lat: 50.8503, lng: 4.3517 },
        work_hours: 8
      }],
      engineer_location: ENGINEER_LOCATION,
      date: '2025-01-15'
    },
    expectedBehavior: {
      fees: {
        agent_fee: 0,
        company_fee: 0,
        additional_fee_percent: 0
      }
    }
  }
];

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function runTest(testCase) {
  console.log('\n' + '='.repeat(70));
  log('cyan', `TEST: ${testCase.name}`);
  log('dim', testCase.description);
  console.log('='.repeat(70));
  
  try {
    const response = await axios.post(
      `${API_BASE}${testCase.endpoint}`,
      testCase.payload,
      { timeout: 30000 }
    );
    
    const data = response.data.data;
    const results = {
      passed: true,
      issues: []
    };
    
    // Check road option
    if (testCase.expectedBehavior.road_option) {
      const hasRoad = data.road_option !== null;
      const expected = testCase.expectedBehavior.road_option;
      
      if (expected === 'PRESENT' && !hasRoad) {
        results.issues.push('❌ Expected road_option to be PRESENT but got NULL');
        results.passed = false;
      } else if (expected === 'NULL' && hasRoad) {
        results.issues.push('❌ Expected road_option to be NULL but got data');
        results.passed = false;
      } else if (expected === 'NULL_OR_SKIPPED' && hasRoad) {
        log('yellow', '⚠️  Road option present (may be valid for distance threshold)');
      }
      
      log('blue', `Road Option: ${hasRoad ? 'PRESENT' : 'NULL'}`);
      if (hasRoad && data.road_option.total_cost) {
        console.log(`   Total Cost: €${data.road_option.total_cost.toFixed(2)}`);
        console.log(`   With Fees: €${(data.road_option.total_cost_with_fees || data.road_option.total_cost).toFixed(2)}`);
      }
    }
    
    // Check flight option
    if (testCase.expectedBehavior.flight_option) {
      const hasFlight = data.flight_option !== null;
      const expected = testCase.expectedBehavior.flight_option;
      
      if (expected === 'PRESENT' && !hasFlight) {
        results.issues.push('❌ Expected flight_option to be PRESENT but got NULL');
        results.passed = false;
      } else if (expected === 'NULL' && hasFlight) {
        results.issues.push('❌ Expected flight_option to be NULL but got data');
        results.passed = false;
      }
      
      log('blue', `Flight Option: ${hasFlight ? 'PRESENT' : 'NULL'}`);
      if (hasFlight && data.flight_option.total_cost) {
        console.log(`   Total Cost: €${data.flight_option.total_cost.toFixed(2)}`);
        console.log(`   With Fees: €${(data.flight_option.total_cost_with_fees || data.flight_option.total_cost).toFixed(2)}`);
      }
    }
    
    // Check fees
    if (testCase.expectedBehavior.fees) {
      log('blue', '\nFee Verification:');
      const tripFees = data.trip_fees || {};
      
      const expectedFees = testCase.expectedBehavior.fees;
      
      if (expectedFees.agent_fee !== undefined) {
        const actual = Number(tripFees.agent_fee) || 0;
        const expected = expectedFees.agent_fee;
        const match = actual === expected;
        console.log(`   Agent Fee: €${actual.toFixed(2)} (expected: €${expected.toFixed(2)}) ${match ? '✅' : '❌'}`);
        if (!match) {
          results.issues.push(`Agent fee mismatch: got ${actual}, expected ${expected}`);
          results.passed = false;
        }
      }
      
      if (expectedFees.company_fee !== undefined) {
        const actual = Number(tripFees.company_fee) || 0;
        const expected = expectedFees.company_fee;
        const match = actual === expected;
        console.log(`   Company Fee: €${actual.toFixed(2)} (expected: €${expected.toFixed(2)}) ${match ? '✅' : '❌'}`);
        if (!match) {
          results.issues.push(`Company fee mismatch: got ${actual}, expected ${expected}`);
          results.passed = false;
        }
      }
      
      if (expectedFees.additional_fee_percent !== undefined) {
        const actual = Number(tripFees.additional_fee_percent) || 0;
        const expected = expectedFees.additional_fee_percent;
        const match = actual === expected;
        console.log(`   Additional Fee %: ${actual}% (expected: ${expected}%) ${match ? '✅' : '❌'}`);
        if (!match) {
          results.issues.push(`Additional fee % mismatch: got ${actual}%, expected ${expected}%`);
          results.passed = false;
        }
      }
      
      // Check calculated fee amounts
      if (data.road_option && data.road_option.trip_fees) {
        const roadFees = data.road_option.trip_fees;
        console.log(`\n   Road Option Fee Breakdown:`);
        console.log(`      Agent: €${(roadFees.agent_fee || 0).toFixed(2)}`);
        console.log(`      Company: €${(roadFees.company_fee || 0).toFixed(2)}`);
        console.log(`      Additional (${tripFees.additional_fee_percent || 0}%): €${(roadFees.additional_fee_amount || 0).toFixed(2)}`);
        console.log(`      Total Fees: €${(roadFees.total_fees || 0).toFixed(2)}`);
      }
      
      if (data.flight_option && data.flight_option.trip_fees) {
        const flightFees = data.flight_option.trip_fees;
        console.log(`\n   Flight Option Fee Breakdown:`);
        console.log(`      Agent: €${(flightFees.agent_fee || 0).toFixed(2)}`);
        console.log(`      Company: €${(flightFees.company_fee || 0).toFixed(2)}`);
        console.log(`      Additional (${tripFees.additional_fee_percent || 0}%): €${(flightFees.additional_fee_amount || 0).toFixed(2)}`);
        console.log(`      Total Fees: €${(flightFees.total_fees || 0).toFixed(2)}`);
      }
    }
    
    // Check recommended
    if (testCase.expectedBehavior.recommended) {
      const actual = data.recommended;
      const expected = testCase.expectedBehavior.recommended;
      const match = actual === expected;
      log('blue', `\nRecommended: ${actual} (expected: ${expected}) ${match ? '✅' : '❌'}`);
      if (!match) {
        results.issues.push(`Recommended mismatch: got ${actual}, expected ${expected}`);
      }
    }
    
    // Summary
    console.log('\n' + '-'.repeat(40));
    if (results.passed && results.issues.length === 0) {
      log('green', '✅ TEST PASSED');
    } else if (results.issues.length > 0) {
      log('red', '❌ TEST FAILED');
      results.issues.forEach(issue => log('red', `   ${issue}`));
    } else {
      log('yellow', '⚠️  TEST COMPLETED WITH WARNINGS');
    }
    
    return { ...results, data };
    
  } catch (error) {
    log('red', `❌ TEST ERROR: ${error.message}`);
    if (error.response) {
      log('red', `   Status: ${error.response.status}`);
      log('red', `   Data: ${JSON.stringify(error.response.data)}`);
    }
    return { passed: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(70));
  log('cyan', '   TRAVEL COST FEE CALCULATION & EDGE CASE TEST SUITE');
  log('dim', `   Started at: ${new Date().toISOString()}`);
  console.log('█'.repeat(70));
  
  const results = {
    total: TEST_CASES.length,
    passed: 0,
    failed: 0,
    errors: 0,
    details: []
  };
  
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.details.push({
      name: testCase.name,
      ...result
    });
    
    if (result.error) {
      results.errors++;
    } else if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Final summary
  console.log('\n\n' + '█'.repeat(70));
  log('cyan', '   TEST SUITE SUMMARY');
  console.log('█'.repeat(70));
  console.log(`\n   Total Tests: ${results.total}`);
  log('green', `   Passed: ${results.passed}`);
  log('red', `   Failed: ${results.failed}`);
  log('yellow', `   Errors: ${results.errors}`);
  console.log(`\n   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0 || results.errors > 0) {
    console.log('\n   Failed Tests:');
    results.details
      .filter(d => !d.passed || d.error)
      .forEach(d => log('red', `   - ${d.name}`));
  }
  
  console.log('\n' + '█'.repeat(70) + '\n');
  
  return results;
}

// Run tests
runAllTests()
  .then(results => {
    process.exit(results.failed + results.errors > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });





