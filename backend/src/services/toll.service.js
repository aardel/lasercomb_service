const axios = require('axios');

const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY;
const TOLLGURU_API_URL = 'https://apis.tollguru.com/toll/v2/origin-destination-waypoints';

const HERE_API_KEY = process.env.HERE_API_KEY;
const HERE_ROUTING_URL = 'https://router.hereapi.com/v8/routes';

/**
 * Calculate tolls using HERE Maps Routing API
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @param {Array} intermediates - Array of { lat, lng }
 * @returns {Promise<{total: number, details: Array}>} - Total toll cost and detailed breakdown
 */
async function calculateTollsWithHere(origin, destination, intermediates = []) {
    if (!HERE_API_KEY) {
        console.warn('HERE_API_KEY not configured, skipping HERE toll calculation');
        return 0;
    }

    try {
        // Build the origin and destination strings
        const originStr = `${origin.lat},${origin.lng}`;
        const destStr = `${destination.lat},${destination.lng}`;

        // Build via points
        const viaPoints = intermediates
            .filter(loc => loc && loc.lat && loc.lng)
            .map(loc => `${loc.lat},${loc.lng}`);

        // Build request URL
        const params = new URLSearchParams({
            apiKey: HERE_API_KEY,
            origin: originStr,
            destination: destStr,
            return: 'tolls,summary',
            transportMode: 'car',
            'tolls[currency]': 'EUR'
        });

        // Add via points
        viaPoints.forEach(via => {
            params.append('via', via);
        });

        const url = `${HERE_ROUTING_URL}?${params.toString()}`;
        console.log('Calling HERE Toll API...');

        const response = await axios.get(url);

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];

            // HERE returns tolls in sections
            let totalToll = 0;
            const tollDetails = [];

            // Only use section-level tolls (detailed breakdown)
            // Route-level tolls can duplicate section data
            if (route.sections) {
                route.sections.forEach((section, sectionIndex) => {
                    if (section.tolls) {
                        section.tolls.forEach((toll, tollIndex) => {
                            if (toll.fares && toll.fares.length > 0) {
                                // Only take the first fare (usually the standard/cash price)
                                const fare = toll.fares[0];
                                if (fare.price && fare.price.value) {
                                    const tollCost = fare.price.value;
                                    totalToll += tollCost;
                                    
                                    // Extract toll details
                                    tollDetails.push({
                                        id: `here-${sectionIndex}-${tollIndex}`,
                                        name: toll.name || `Toll ${tollDetails.length + 1}`,
                                        cost: Math.round(tollCost * 100) / 100,
                                        currency: fare.price.currency || 'EUR',
                                        location: toll.location || null,
                                        roadName: section.roadName || null
                                    });
                                }
                            }
                        });
                    }
                });
            }

            if (totalToll > 0) {
                console.log('HERE Toll Cost:', totalToll, 'EUR', `(${tollDetails.length} tolls)`);
                return {
                    total: Math.round(totalToll * 100) / 100,
                    details: tollDetails
                };
            }
        }

        console.log('HERE API returned no toll data');
        return { total: 0, details: [] };

    } catch (error) {
        console.error('HERE API error:', error.message);
        if (error.response) {
            console.error('HERE API Response:', JSON.stringify(error.response.data).substring(0, 300));
        }
        return { total: 0, details: [] };
    }
}

/**
 * Calculate tolls for a route using TollGuru API
 * @param {Object} origin - { lat, lng } or address string
 * @param {Object} destination - { lat, lng } or address string
 * @param {Array} intermediates - Array of { lat, lng } or address strings
 * @returns {Promise<{total: number, details: Array}>} - Total toll cost and detailed breakdown
 */
async function calculateTollsWithTollGuru(origin, destination, intermediates = []) {
    if (!TOLLGURU_API_KEY) {
        console.warn('TOLLGURU_API_KEY not configured, skipping TollGuru');
        return 0;
    }

    try {
        const requestBody = {
            from: {
                lat: origin.lat,
                lng: origin.lng
            },
            to: {
                lat: destination.lat,
                lng: destination.lng
            },
            waypoints: intermediates
                .filter(loc => loc && loc.lat && loc.lng)
                .map(loc => ({
                    lat: loc.lat,
                    lng: loc.lng
                })),
            serviceProvider: "here",
            vehicle: {
                type: "2AxlesAuto"
            },
            currency: "EUR"
        };

        console.log('Calling TollGuru API...');
        const response = await axios.post(TOLLGURU_API_URL, requestBody, {
            headers: {
                'x-api-key': TOLLGURU_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];

            // Check for costs
            if (route.costs) {
                const tollCost = route.costs.cash || route.costs.tag || route.costs.total || 0;
                if (tollCost > 0) {
                    const tollDetails = [];
                    
                    // Extract individual toll details if available
                    if (route.tolls && Array.isArray(route.tolls)) {
                        route.tolls.forEach((toll, index) => {
                            tollDetails.push({
                                id: `tollguru-${index}`,
                                name: toll.name || toll.road || `Toll ${index + 1}`,
                                cost: Math.round((toll.cost || toll.price || 0) * 100) / 100,
                                currency: 'EUR',
                                location: toll.location || null,
                                roadName: toll.road || toll.name || null
                            });
                        });
                    } else {
                        // If no detailed breakdown, create a single entry
                        tollDetails.push({
                            id: 'tollguru-total',
                            name: 'Route Tolls',
                            cost: Math.round(tollCost * 100) / 100,
                            currency: 'EUR',
                            location: null,
                            roadName: null
                        });
                    }
                    
                    console.log('TollGuru Toll Cost:', tollCost, 'EUR', `(${tollDetails.length} tolls)`);
                    return {
                        total: Math.round(tollCost * 100) / 100,
                        details: tollDetails
                    };
                }
            }
        }

        console.log('TollGuru API returned no toll data');
        return { total: 0, details: [] };

    } catch (error) {
        console.error('TollGuru API error:', error.message);
        if (error.response) {
            console.error('TollGuru Response:', JSON.stringify(error.response.data).substring(0, 200));
        }
        return { total: 0, details: [] };
    }
}

/**
 * Main toll calculation function with fallback chain:
 * TollGuru -> HERE Maps -> 0
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @param {Array} intermediates - Array of { lat, lng }
 * @returns {Promise<{total: number, details: Array}>} - Total toll cost and detailed breakdown
 */
async function calculateTolls(origin, destination, intermediates = []) {
    // Try TollGuru first (specialized toll API)
    const tollGuruResult = await calculateTollsWithTollGuru(origin, destination, intermediates);
    if (tollGuruResult.total > 0) {
        return tollGuruResult;
    }

    // Fallback to HERE Maps
    const hereResult = await calculateTollsWithHere(origin, destination, intermediates);
    if (hereResult.total > 0) {
        return hereResult;
    }

    // No toll data available
    console.log('No toll data from any provider');
    return { total: 0, details: [] };
}

module.exports = {
    calculateTolls,
    calculateTollsWithTollGuru,
    calculateTollsWithHere
};
