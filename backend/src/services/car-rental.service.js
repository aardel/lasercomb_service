const axios = require('axios');

/**
 * Car Rental Service - Hybrid Approach
 *
 * 1. Primary: RapidAPI car rental data (free tier)
 * 2. Fallback: Market-researched price ranges
 * 3. Returns: Price ranges (min-max) for safety
 */

// Market-researched price ranges by region/airport
// Updated: December 2024
const PRICE_RANGES_DATABASE = {
    // Europe - Major Airports
    'STR': { // Stuttgart
        economy: { min: 45, max: 75 },
        compact: { min: 55, max: 85 },
        standard: { min: 65, max: 95 },
        premium: { min: 90, max: 140 }
    },
    'MUC': { // Munich
        economy: { min: 50, max: 80 },
        compact: { min: 60, max: 90 },
        standard: { min: 70, max: 100 },
        premium: { min: 95, max: 150 }
    },
    'FRA': { // Frankfurt
        economy: { min: 48, max: 78 },
        compact: { min: 58, max: 88 },
        standard: { min: 68, max: 98 },
        premium: { min: 92, max: 145 }
    },
    'BGY': { // Bergamo
        economy: { min: 40, max: 70 },
        compact: { min: 50, max: 80 },
        standard: { min: 60, max: 90 },
        premium: { min: 85, max: 130 }
    },
    'FCO': { // Rome
        economy: { min: 45, max: 75 },
        compact: { min: 55, max: 85 },
        standard: { min: 65, max: 95 },
        premium: { min: 90, max: 140 }
    },
    'MLA': { // Malta
        economy: { min: 35, max: 60 },
        compact: { min: 45, max: 70 },
        standard: { min: 55, max: 85 },
        premium: { min: 75, max: 120 }
    },
    'CDG': { // Paris
        economy: { min: 50, max: 85 },
        compact: { min: 60, max: 95 },
        standard: { min: 75, max: 110 },
        premium: { min: 100, max: 160 }
    },
    'AMS': { // Amsterdam
        economy: { min: 45, max: 80 },
        compact: { min: 55, max: 90 },
        standard: { min: 70, max: 105 },
        premium: { min: 95, max: 150 }
    },
    'MAD': { // Madrid
        economy: { min: 40, max: 70 },
        compact: { min: 50, max: 80 },
        standard: { min: 60, max: 90 },
        premium: { min: 85, max: 130 }
    },
    'BCN': { // Barcelona
        economy: { min: 42, max: 72 },
        compact: { min: 52, max: 82 },
        standard: { min: 62, max: 92 },
        premium: { min: 87, max: 135 }
    },
    'LHR': { // London Heathrow
        economy: { min: 55, max: 90 },
        compact: { min: 65, max: 100 },
        standard: { min: 80, max: 120 },
        premium: { min: 110, max: 180 }
    },
    'IST': { // Istanbul
        economy: { min: 30, max: 55 },
        compact: { min: 40, max: 65 },
        standard: { min: 50, max: 80 },
        premium: { min: 70, max: 110 }
    },
    // Default for unlisted airports
    'DEFAULT': {
        economy: { min: 45, max: 75 },
        compact: { min: 55, max: 85 },
        standard: { min: 65, max: 100 },
        premium: { min: 90, max: 140 }
    }
};

// Major providers with booking URLs
const PROVIDERS = [
    { name: 'Sixt', url_template: (airportCode) => `https://www.sixt.com/car-rental/${airportCode}/` },
    { name: 'Hertz', url_template: (airportCode) => `https://www.hertz.com/rentacar/reservation/?PickUpLocation=${airportCode}` },
    { name: 'Europcar', url_template: (airportCode) => `https://www.europcar.com/en/car-hire/${airportCode}` },
    { name: 'Enterprise', url_template: (airportCode) => `https://www.enterprise.com/en/car-rental/locations/${airportCode}` },
    { name: 'Budget', url_template: (airportCode) => `https://www.budget.com/en/locations/${airportCode}` },
    { name: 'Avis', url_template: (airportCode) => `https://www.avis.com/en/locations/${airportCode}` }
];

/**
 * Fetch car rental prices from RapidAPI (Free tier)
 * API: https://rapidapi.com/hub (Search for "car rental")
 *
 * @param {string} airportCode - IATA airport code
 * @param {string} pickupDate - YYYY-MM-DD
 * @param {string} returnDate - YYYY-MM-DD
 * @returns {Promise<Array>} - Car rental options
 */
async function fetchFromRapidAPI(airportCode, pickupDate, returnDate) {
    // Check if RapidAPI key is configured
    if (!process.env.RAPIDAPI_KEY) {
        console.log('[CarRentalService] RapidAPI key not configured, using fallback pricing');
        return null;
    }

    try {
        console.log(`[CarRentalService] Fetching from RapidAPI for ${airportCode}...`);

        // Example: Using a hypothetical car rental API on RapidAPI
        // Replace with actual API endpoint once you sign up
        const response = await axios.get('https://car-rental-api.rapidapi.com/search', {
            params: {
                pickup_location: airportCode,
                pickup_date: pickupDate,
                return_date: returnDate
            },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'car-rental-api.rapidapi.com' // Replace with actual host
            },
            timeout: 5000 // 5 second timeout
        });

        if (response.data && response.data.results) {
            console.log(`[CarRentalService] ✓ Got ${response.data.results.length} results from RapidAPI`);
            return response.data.results;
        }

        return null;

    } catch (error) {
        console.warn('[CarRentalService] RapidAPI error:', error.message);
        return null;
    }
}

/**
 * Get car rental options using hybrid approach
 *
 * @param {string} airportCode - IATA airport code
 * @param {string} pickupDate - YYYY-MM-DD
 * @param {string} returnDate - YYYY-MM-DD
 * @param {number} daysRequired - Number of rental days
 * @param {number} limit - Maximum number of rental options to return (default 5)
 * @returns {Promise<Array>} - Car rental options with price ranges
 */
async function getCarRentalOptions(airportCode, pickupDate, returnDate, daysRequired, limit = 5) {
    try {
        // 1. Try RapidAPI first (real data)
        const rapidApiResults = await fetchFromRapidAPI(airportCode, pickupDate, returnDate);

        if (rapidApiResults && rapidApiResults.length > 0) {
            console.log('[CarRentalService] Using RapidAPI data');
            return rapidApiResults.slice(0, limit);
        }

        // 2. Fallback to price range database
        console.log('[CarRentalService] Using fallback price range database');

        const priceRanges = PRICE_RANGES_DATABASE[airportCode] || PRICE_RANGES_DATABASE['DEFAULT'];
        const categories = ['economy', 'compact', 'standard', 'premium'];
        const options = [];

        // Generate options for each provider and category
        let optionId = 0;
        for (const provider of PROVIDERS) {
            for (const category of categories) {
                const priceRange = priceRanges[category];

                options.push({
                    id: `cr-${++optionId}`,
                    provider: provider.name,
                    category: category.charAt(0).toUpperCase() + category.slice(1),
                    price_per_day_min: priceRange.min,
                    price_per_day_max: priceRange.max,
                    price_per_day: Math.round((priceRange.min + priceRange.max) / 2), // Average for calculations
                    total_min: priceRange.min * daysRequired,
                    total_max: priceRange.max * daysRequired,
                    is_estimate: true,
                    requires_verification: true,
                    booking_url: provider.url_template(airportCode),
                    data_source: 'market_research',
                    last_updated: '2024-12'
                });
            }
        }

        // Limit to specified number of options (mix of providers and categories)
        return options.slice(0, limit);

    } catch (error) {
        console.error('[CarRentalService] Error:', error.message);
        throw new Error('Unable to fetch car rental pricing');
    }
}

module.exports = {
    getCarRentalOptions
};
