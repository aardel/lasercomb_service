const axios = require('axios');

async function testCalculateMultiStop() {
    const payload = {
        engineer_location: { lat: 48.6693, lng: 9.4524 }, // Notzingen
        customers: [
            {
                customer_id: 1,
                name: 'Test Customer',
                city: 'Valletta',
                country: 'MLT',
                coordinates: { lat: 35.8989, lng: 14.5146 },
                work_hours: 4
            }
        ],
        date: '2025-01-20',
        technician_settings: {},
        billing_settings: {},
        travel_times: {}
    };

    try {
        console.log('Testing calculate-multi-stop with payload...');
        const response = await axios.post('http://localhost:3000/api/costs/calculate-multi-stop', payload);
        console.log('Response Success:', response.data.success);
        console.log('Recommended Mode:', response.data.data?.recommended);
    } catch (error) {
        console.error('Test failed with error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testCalculateMultiStop();
