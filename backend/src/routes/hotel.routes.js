const express = require('express');
const router = express.Router();
const hotelService = require('../services/hotel.service');
const hotelProvider = require('../services/hotel-provider.service');

/**
 * Find hotels near coordinates
 * GET /api/hotels/nearby?lat=...&lng=...&radius=...&limit=...&cityName=...
 */
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius, limit, cityName } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const hotels = await hotelService.findNearbyHotels(
            parseFloat(lat),
            parseFloat(lng),
            radius ? parseInt(radius) : undefined,
            limit ? parseInt(limit) : undefined,
            cityName
        );

        res.json({
            success: true,
            data: hotels
        });
    } catch (error) {
        console.error('Hotel search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Search hotels using multi-provider service (NEW)
 * POST /api/hotels/search-provider
 * Body: { location, cityCode, checkIn, checkOut, guests, maxResults, radius, providers }
 */
router.post('/search-provider', async (req, res) => {
    try {
        const { location, cityCode, checkIn, checkOut, guests, maxResults, radius, providers } = req.body;

        console.log('[HotelRoute] 📥 Provider search request received:');
        console.log('[HotelRoute]   - location:', location);
        console.log('[HotelRoute]   - cityCode:', cityCode);
        console.log('[HotelRoute]   - checkIn:', checkIn);
        console.log('[HotelRoute]   - checkOut:', checkOut);
        console.log('[HotelRoute]   - providers:', providers || 'default (xotelo → amadeus)');

        if (!location || !checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: location, checkIn, checkOut'
            });
        }

        // Use multi-provider service with automatic fallback
        const result = await hotelProvider.searchHotels({
            location,
            cityCode,
            checkIn,
            checkOut,
            guests: guests || 1,
            maxResults: maxResults || 10,
            radius: radius || 5
        }, {
            providers: providers || ['xotelo', 'amadeus'], // Default to free providers
            enableFallback: true
        });

        console.log(`[HotelRoute] ✅ Provider search completed: ${result.provider}, ${result.count} hotels`);

        res.json(result);
    } catch (error) {
        console.error('[HotelRoute] ❌ Provider search error:', error);
        res.status(500).json({
            success: false,
            error: 'Hotel provider search failed',
            message: error.message
        });
    }
});

module.exports = router;
