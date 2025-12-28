const axios = require('axios');

async function debugAirportResolution() {
    const locations = [
        { name: 'Malta', lat: 35.8575, lng: 14.4775 },
        { name: 'Notzingen (STR)', lat: 48.6706, lng: 9.4544 },
        { name: 'Paris (CDG)', lat: 48.8566, lng: 2.3522 },
        { name: 'Empty Coords', lat: null, lng: null }
    ];

    for (const loc of locations) {
        console.log(`\nTesting ${loc.name}:`);
        try {
            // Test direct airport resolution via a temporary API route or by mocking the parameters
            // Since I can't add an API route easily, I'll use the existing /api/flights/search
            const response = await axios.post('http://localhost:3000/api/flights/search', {
                origin: { lat: 48.6693, lng: 9.4524 }, // Base
                destination: { lat: loc.lat, lng: loc.lng },
                departureDate: '2025-01-20',
                returnDate: '2025-01-22'
            });
            console.log(`- Success: ${response.data.success}`);
            if (response.data.success) {
                console.log(`- Resolved Dest: ${response.data.destination_airport?.name} (${response.data.destination_airport?.code})`);
            } else {
                console.log(`- Error: ${response.data.error}`);
            }
        } catch (error) {
            console.log(`- Request Failed: ${error.response?.status || error.message}`);
            if (error.response?.data) console.log(`- Error Detail:`, error.response.data);
        }
    }
}

debugAirportResolution();
