require('dotenv').config();
const { calculateRouteWithTolls } = require('./src/services/distance.service');

async function test() {
    console.log('Testing calculateRouteWithTolls...');
    try {
        const origin = { lat: 48.1351, lng: 11.5820 }; // Munich
        const destination = { lat: 45.4384, lng: 10.9916 }; // Verona

        const result = await calculateRouteWithTolls(origin, destination);
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
