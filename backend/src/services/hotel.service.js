const axios = require('axios');
const amadeus = require('./amadeus.client');

/**
 * Hotel Pricing Database - Market-researched price ranges per night
 * Updated: December 2024
 * Prices in EUR per night for standard double room
 */
const HOTEL_PRICE_RANGES = {
    // Germany
    'Stuttgart': { min: 70, max: 180, avg: 110 },
    'Munich': { min: 80, max: 220, avg: 130 },
    'Frankfurt': { min: 75, max: 200, avg: 120 },
    'Berlin': { min: 65, max: 190, avg: 105 },
    'Hamburg': { min: 70, max: 195, avg: 115 },

    // Poland
    'Warsaw': { min: 50, max: 150, avg: 85 },
    'Warszawa': { min: 50, max: 150, avg: 85 },
    'Krakow': { min: 45, max: 140, avg: 80 },
    'Gdansk': { min: 50, max: 145, avg: 85 },

    // Italy
    'Rome': { min: 70, max: 250, avg: 130 },
    'Milan': { min: 80, max: 280, avg: 150 },
    'Venice': { min: 90, max: 350, avg: 180 },
    'Florence': { min: 75, max: 240, avg: 135 },
    'Bergamo': { min: 60, max: 160, avg: 95 },

    // Malta
    'Valletta': { min: 65, max: 200, avg: 110 },
    'St. Julian\'s': { min: 70, max: 210, avg: 115 },
    'Sliema': { min: 65, max: 195, avg: 105 },

    // France
    'Paris': { min: 90, max: 350, avg: 165 },
    'Lyon': { min: 70, max: 180, avg: 110 },
    'Marseille': { min: 65, max: 175, avg: 105 },
    'Nice': { min: 75, max: 220, avg: 125 },

    // Spain
    'Madrid': { min: 60, max: 200, avg: 105 },
    'Barcelona': { min: 70, max: 220, avg: 120 },
    'Seville': { min: 55, max: 170, avg: 95 },
    'Valencia': { min: 60, max: 180, avg: 100 },

    // Netherlands
    'Amsterdam': { min: 80, max: 250, avg: 135 },
    'Rotterdam': { min: 65, max: 180, avg: 105 },
    'The Hague': { min: 70, max: 190, avg: 115 },

    // UK
    'London': { min: 95, max: 350, avg: 175 },
    'Manchester': { min: 60, max: 160, avg: 95 },
    'Edinburgh': { min: 70, max: 190, avg: 115 },

    // Turkey
    'Istanbul': { min: 45, max: 180, avg: 85 },
    'Ankara': { min: 40, max: 140, avg: 75 },

    // Default for unlisted cities
    'DEFAULT': { min: 60, max: 180, avg: 100 }
};

/**
 * Get estimated hotel price range for a city
 */
function getEstimatedPriceRange(cityName) {
    if (!cityName) return HOTEL_PRICE_RANGES['DEFAULT'];

    // Try exact match first
    const exactMatch = HOTEL_PRICE_RANGES[cityName];
    if (exactMatch) return exactMatch;

    // Try partial match (case-insensitive)
    const normalizedCity = cityName.toLowerCase();
    for (const [city, range] of Object.entries(HOTEL_PRICE_RANGES)) {
        if (city.toLowerCase().includes(normalizedCity) || normalizedCity.includes(city.toLowerCase())) {
            return range;
        }
    }

    return HOTEL_PRICE_RANGES['DEFAULT'];
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find hotels near given coordinates using Google Places API
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Search radius in meters (default 10km)
 * @param {number} limit - Maximum number of hotels to return (default 5)
 * @param {string} cityName - Optional city name for pricing fallback
 * @returns {Promise<Array>} List of hotels with ratings and booking links
 */
async function findNearbyHotels(lat, lng, radius = 10000, limit = 5, cityName = null) {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        console.warn('⚠️  Google Maps API key not set. Cannot search for hotels.');
        return [];
    }

    try {
        // Use Google Places API (New) for better data including price ranges
        const url = 'https://places.googleapis.com/v1/places:searchNearby';

        const response = await axios.post(url, {
            includedTypes: ['hotel', 'lodging'],
            maxResultCount: Math.min(Math.max(limit, 1), 20), // Limit between 1-20
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: radius
                }
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.location,places.photos'
            }
        });

        console.log('Google Places API (New) Response Status:', response.status);
        const fs = require('fs');
        fs.writeFileSync('/Users/aarondelia/Nextcloud2/Programing/Service/Trip Cost/backend/hotel_debug.json', JSON.stringify(response.data, null, 2));

        // Get estimated price range for fallback
        const estimatedPrices = getEstimatedPriceRange(cityName);
        console.log(`[HotelService] Using pricing for city: "${cityName}" → min:€${estimatedPrices.min}, max:€${estimatedPrices.max}`);

        const hotels = (response.data.places || []).map(hotel => {
            console.log(`Hotel: ${hotel.displayName?.text}, PriceRange:`, hotel.priceRange, 'PriceLevel:', hotel.priceLevel);
            const name = hotel.displayName?.text || 'Unknown Hotel';
            const address = hotel.formattedAddress || '';

            // Generate a Google Travel / Google Maps booking link
            const bookingLink = `https://www.google.com/travel/hotels?q=${encodeURIComponent(name + ' ' + address)}`;
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${hotel.id}`;

            // Extract price range or level if available
            let priceDisplay = null;
            let hasLivePricing = false;

            // 1. Try Google Places pricing first
            if (hotel.priceRange) {
                const { startPrice, endPrice } = hotel.priceRange;
                if (startPrice && endPrice) {
                    priceDisplay = `${startPrice.units} - ${endPrice.units} ${startPrice.currencyCode || 'EUR'}`;
                    hasLivePricing = true;
                } else if (startPrice) {
                    priceDisplay = `From ${startPrice.units} ${startPrice.currencyCode || 'EUR'}`;
                    hasLivePricing = true;
                }
            }

            // 2. Fallback to price level if range is missing
            if (!priceDisplay && hotel.priceLevel) {
                const levels = {
                    'PRICE_LEVEL_INEXPENSIVE': '€ (Budget)',
                    'PRICE_LEVEL_MODERATE': '€€ (Moderate)',
                    'PRICE_LEVEL_EXPENSIVE': '€€€ (Expensive)',
                    'PRICE_LEVEL_VERY_EXPENSIVE': '€€€€ (Luxury)'
                };
                priceDisplay = levels[hotel.priceLevel] || null;
                hasLivePricing = false; // Symbols are estimates, not actual prices
            }

            // 3. Final fallback: Use market-researched pricing database
            if (!priceDisplay) {
                priceDisplay = `€${estimatedPrices.min} - €${estimatedPrices.max} per night (est.)`;
                hasLivePricing = false;
                console.log(`  → Using fallback pricing: ${priceDisplay}`);
            } else {
                console.log(`  → Using existing pricing: ${priceDisplay}`);
            }

            // Calculate distance to customer
            const hotelLat = hotel.location?.latitude;
            const hotelLng = hotel.location?.longitude;
            let distanceKm = null;
            if (hotelLat && hotelLng) {
                distanceKm = calculateDistance(lat, lng, hotelLat, hotelLng);
            }

            return {
                id: hotel.id,
                name: name,
                rating: hotel.rating,
                user_ratings_total: hotel.userRatingCount,
                address: address,
                price_level: hotel.priceLevel,
                price_range: priceDisplay,
                has_live_pricing: hasLivePricing,
                distance_km: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
                coordinates: hotel.location,
                booking_link: bookingLink,
                maps_link: mapsLink,
                photo_reference: hotel.photos?.[0]?.name
            };
        });

        return hotels;
    } catch (error) {
        console.error('Error finding nearby hotels:', error.message);
        throw error;
    }
}

module.exports = { findNearbyHotels };
