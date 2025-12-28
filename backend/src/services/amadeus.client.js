const Amadeus = require('amadeus');

const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_API_KEY || process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_API_SECRET || process.env.AMADEUS_CLIENT_SECRET,
    hostname: 'test' // Explicitly use the test environment
});

module.exports = amadeus;
