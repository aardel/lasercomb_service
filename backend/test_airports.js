const { findNearestAirport } = require('./src/services/airport.service');
require('dotenv').config();

async function test() {
    console.log('--- Testing Airport Lookup ---');

    // MLA / Mellieha
    const mla = await findNearestAirport(35.957, 14.364);
    console.log('Mellieha (Malta) ->', mla);

    // Notzingen
    const notzingen = await findNearestAirport(48.6693, 9.4626);
    console.log('Notzingen (Germany) ->', notzingen);
}

test().catch(console.error);
