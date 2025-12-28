/**
 * Direct test of flight APIs for STR → BGY route
 * Run with: node test_flight_apis.js
 */

require('dotenv').config();
const axios = require('axios');

// Original route
const ORIGIN = 'STR';  // Stuttgart
const DEST = 'BGY';    // Bergamo
// Use dates within 3 months (airlines publish schedules ~330 days ahead)
const today = new Date();
const depDate = new Date(today);
depDate.setDate(today.getDate() + 30); // 30 days from now
const retDate = new Date(depDate);
retDate.setDate(depDate.getDate() + 1); // 1 day trip
const DEP_DATE = depDate.toISOString().split('T')[0];
const RET_DATE = retDate.toISOString().split('T')[0];

async function testSerpAPI() {
    console.log('\n=== Testing SerpAPI (Google Flights) ===');
    const serpApiKey = process.env.SERPAPI_KEY;
    
    if (!serpApiKey) {
        console.log('❌ SERPAPI_KEY not configured');
        return;
    }
    
    console.log(`✓ SERPAPI_KEY found (length: ${serpApiKey.length})`);
    console.log(`Searching: ${ORIGIN} → ${DEST}, ${DEP_DATE} to ${RET_DATE}`);
    
    try {
        const params = {
            engine: 'google_flights',
            departure_id: ORIGIN,
            arrival_id: DEST,
            outbound_date: DEP_DATE,
            return_date: RET_DATE,
            api_key: serpApiKey
        };
        
        const response = await axios.get('https://serpapi.com/search', { params, timeout: 15000 });
        
        console.log(`Response status: ${response.status}`);
        console.log(`best_flights: ${response.data?.best_flights?.length || 0}`);
        console.log(`other_flights: ${response.data?.other_flights?.length || 0}`);
        
        if (response.data?.best_flights?.length > 0) {
            console.log('\n✓ Best flights found:');
            response.data.best_flights.slice(0, 2).forEach((f, i) => {
                console.log(`  ${i+1}. Price: $${f.price}, Stops: ${f.flights?.length - 1 || 0}`);
                if (f.flights?.[0]) {
                    const leg = f.flights[0];
                    console.log(`     ${leg.departure_airport?.id} → ${leg.arrival_airport?.id} @ ${leg.departure_airport?.time}`);
                }
            });
        }
        
        if (response.data?.other_flights?.length > 0) {
            console.log('\n✓ Other flights found:');
            response.data.other_flights.slice(0, 2).forEach((f, i) => {
                console.log(`  ${i+1}. Price: $${f.price}, Stops: ${f.flights?.length - 1 || 0}`);
            });
        }
        
        if (!response.data?.best_flights?.length && !response.data?.other_flights?.length) {
            console.log('\n⚠️ No flights returned by SerpAPI');
            console.log('Response keys:', Object.keys(response.data || {}));
            if (response.data?.error) {
                console.log('Error:', response.data.error);
            }
            if (response.data?.search_metadata) {
                console.log('Search ID:', response.data.search_metadata.id);
            }
        }
    } catch (error) {
        console.log(`❌ SerpAPI Error: ${error.message}`);
        if (error.response?.data) {
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function testAmadeus() {
    console.log('\n=== Testing Amadeus API ===');
    
    const clientId = process.env.AMADEUS_API_KEY;
    const clientSecret = process.env.AMADEUS_API_SECRET;
    
    if (!clientId || !clientSecret) {
        console.log('❌ Amadeus credentials not configured');
        return;
    }
    
    console.log(`✓ Amadeus credentials found`);
    console.log(`Searching: ${ORIGIN} → ${DEST}, ${DEP_DATE} to ${RET_DATE}`);
    
    try {
        // Get access token
        const tokenResponse = await axios.post(
            'https://api.amadeus.com/v1/security/oauth2/token',
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const accessToken = tokenResponse.data.access_token;
        console.log('✓ Got access token');
        
        // Search flights
        const flightResponse = await axios.get(
            'https://api.amadeus.com/v2/shopping/flight-offers',
            {
                params: {
                    originLocationCode: ORIGIN,
                    destinationLocationCode: DEST,
                    departureDate: DEP_DATE,
                    returnDate: RET_DATE,
                    adults: 1,
                    max: 5,
                    currencyCode: 'EUR'
                },
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 15000
            }
        );
        
        const flights = flightResponse.data?.data || [];
        console.log(`\n✓ Found ${flights.length} flight offers`);
        
        flights.slice(0, 3).forEach((offer, i) => {
            const price = offer.price?.total;
            const outbound = offer.itineraries?.[0];
            const returnTrip = offer.itineraries?.[1];
            
            console.log(`\n  ${i+1}. Price: €${price}`);
            if (outbound) {
                const segments = outbound.segments || [];
                const first = segments[0];
                const last = segments[segments.length - 1];
                console.log(`     Outbound: ${first?.departure?.iataCode} → ${last?.arrival?.iataCode}`);
                console.log(`     Departure: ${first?.departure?.at}, Stops: ${segments.length - 1}`);
            }
            if (returnTrip) {
                const segments = returnTrip.segments || [];
                const first = segments[0];
                const last = segments[segments.length - 1];
                console.log(`     Return: ${first?.departure?.iataCode} → ${last?.arrival?.iataCode}`);
                console.log(`     Departure: ${first?.departure?.at}, Stops: ${segments.length - 1}`);
            }
        });
        
    } catch (error) {
        console.log(`❌ Amadeus Error: ${error.message}`);
        if (error.response?.data) {
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function main() {
    console.log('Flight API Test');
    console.log('================');
    console.log(`Route: ${ORIGIN} (Stuttgart) → ${DEST} (Bergamo)`);
    console.log(`Dates: ${DEP_DATE} to ${RET_DATE}`);
    
    await testSerpAPI();
    await testAmadeus();
    
    console.log('\n================');
    console.log('Test complete!');
}

main().catch(console.error);

