const axios = require('axios');

async function testFlightSearch() {
    const payload = {
        origin: { lat: 35.8575, lng: 14.4775 }, // Malta
        destination: { lat: 48.6706, lng: 9.4544 }, // Notzingen
        departureDate: '2025-01-20',
        returnDate: '2025-01-22'
    };

    try {
        console.log('Testing flight search with payload:', payload);
        const response = await axios.post('http://localhost:3000/api/flights/search', payload);
        console.log('Response Status:', response.status);
        console.log('Response Data Summary:');
        console.log('Success:', response.data.success);
        console.log('Distance:', response.data.distance_km, 'km');
        console.log('Origin Airport:', response.data.origin_airport?.name, `(${response.data.origin_airport?.code})`);
        console.log('Dest Airport:', response.data.destination_airport?.name, `(${response.data.destination_airport?.code})`);
        console.log('Options Count:', response.data.options?.length || 0);

        if (response.data.options && response.data.options.length > 0) {
            console.log('First Option Routing:', response.data.options[0].routing);
        }
    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

testFlightSearch();
