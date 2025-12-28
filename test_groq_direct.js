const axios = require('axios');

async function testGroqAPI() {
    console.log('🧪 Testing Groq API Integration...\n');
    
    try {
        const response = await axios.post('http://localhost:3000/api/flights/search', {
            origin: { lat: 48.6892, lng: 9.2220 }, // Stuttgart
            destination: { lat: 45.7236, lng: 9.6642 }, // Bergamo
            departureDate: '2025-01-07',
            returnDate: '2025-01-09',
            limit: 5,
            apiPreferences: {
                flightApis: {
                    groq: { enabled: true, priority: 1 },
                    googleFlights: { enabled: false },
                    amadeus: { enabled: false }
                }
            }
        }, {
            timeout: 60000 // 60 second timeout for Groq
        });

        console.log('✅ API Request Successful!\n');
        console.log('📊 Response Summary:');
        console.log(`   - Success: ${response.data.success}`);
        console.log(`   - Provider: ${response.data.provider}`);
        console.log(`   - Options found: ${response.data.options?.length || 0}`);
        console.log(`   - Origin: ${response.data.origin_airport?.code} (${response.data.origin_airport?.name})`);
        console.log(`   - Destination: ${response.data.destination_airport?.code} (${response.data.destination_airport?.name})`);
        
        if (response.data.options && response.data.options.length > 0) {
            console.log('\n📋 First Flight Option:');
            const first = response.data.options[0];
            console.log(`   - ID: ${first.id}`);
            console.log(`   - Price: €${first.price}`);
            console.log(`   - Round-trip: ${first.is_round_trip}`);
            console.log(`   - Outbound: ${first.outbound?.routing || 'N/A'}`);
            console.log(`   - Outbound Duration: ${first.outbound?.duration_minutes || 0} minutes`);
            console.log(`   - Outbound Segments: ${first.outbound?.segments?.length || 0}`);
            if (first.return) {
                console.log(`   - Return: ${first.return?.routing || 'N/A'}`);
                console.log(`   - Return Duration: ${first.return?.duration_minutes || 0} minutes`);
            }
            
            console.log('\n🔍 Full First Option Structure:');
            console.log(JSON.stringify(first, null, 2));
            
            console.log('\n📊 Statistics:');
            if (response.data.statistics) {
                console.log(`   - Cheapest: €${response.data.statistics.cheapest}`);
                console.log(`   - Median: €${response.data.statistics.median}`);
                console.log(`   - Most Expensive: €${response.data.statistics.most_expensive}`);
            }
        } else {
            console.log('\n⚠️  No flight options returned');
        }
        
        console.log('\n✅ Test Complete!');
        return true;
        
    } catch (error) {
        console.error('❌ Test Failed!');
        console.error(`   Error: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

testGroqAPI();
