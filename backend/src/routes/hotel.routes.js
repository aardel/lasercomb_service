const express = require('express');
const router = express.Router();
const hotelService = require('../services/hotel.service');

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

module.exports = router;
