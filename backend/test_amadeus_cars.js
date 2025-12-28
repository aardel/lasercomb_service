require('dotenv').config();
const amadeus = require('./src/services/amadeus.client');

async function test() {
    console.log('Testing Amadeus Transfer API...');
    try {
        console.log('Calling /v1/shopping/transfer-offers...');

        const response = await amadeus.client.post('/v1/shopping/transfer-offers', {
            "startLocationCode": "MUC",
            "endAddressLine": "Verona, Italy",
            "endCityName": "Verona",
            "endCountryCode": "IT",
            "startDateTime": "2025-12-25T10:00:00",
            "passengers": 1,
            "transferType": "PRIVATE"
        });

        console.log('Success (Transfer)!');
        console.log('Response keys:', Object.keys(response));
        if (response.result) console.log('Result keys:', Object.keys(response.result));
        if (response.data) console.log('Data keys:', Object.keys(response.data));
        else console.log('response.data is undefined');

    } catch (error) {
        console.error('Error calling transfer-offers:', error.response ? error.response.result : error.message);
    }
}

test();
