const express = require('express');
const router = express.Router();
const carRentalProvider = require('../services/car-rental-provider.service');

/**
 * Search car rentals using multi-provider service
 * POST /api/car-rentals/search-provider
 * Body: {
 *   location,
 *   dropoffLocation,
 *   pickupDate,
 *   pickupTime,
 *   dropoffDate,
 *   dropoffTime,
 *   driverAge,
 *   currency,
 *   providers
 * }
 */
router.post('/search-provider', async (req, res) => {
    try {
        const {
            location,
            dropoffLocation,
            pickupDate,
            pickupTime,
            dropoffDate,
            dropoffTime,
            driverAge,
            currency,
            providers
        } = req.body;

        console.log('[CarRentalRoute] 📥 Provider search request received:');
        console.log('[CarRentalRoute]   - location:', location);
        console.log('[CarRentalRoute]   - pickup:', pickupDate, pickupTime || '10:00');
        console.log('[CarRentalRoute]   - dropoff:', dropoffDate, dropoffTime || '10:00');
        console.log('[CarRentalRoute]   - providers:', providers || 'default (market prices)');

        if (!location || !pickupDate || !dropoffDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: location, pickupDate, dropoffDate'
            });
        }

        // Use multi-provider service with automatic fallback
        const result = await carRentalProvider.searchCarRentals({
            location,
            dropoffLocation: dropoffLocation || location,
            pickupDate,
            pickupTime: pickupTime || '10:00',
            dropoffDate,
            dropoffTime: dropoffTime || '10:00',
            driverAge: driverAge || 30,
            currency: currency || 'USD'
        }, {
            providers: providers || ['market'], // Default to free market prices (no API needed)
            enableFallback: true
        });

        console.log(`[CarRentalRoute] ✅ Provider search completed: ${result.provider}, ${result.count} rentals`);

        res.json(result);
    } catch (error) {
        console.error('[CarRentalRoute] ❌ Provider search error:', error);
        res.status(500).json({
            success: false,
            error: 'Car rental provider search failed',
            message: error.message
        });
    }
});

module.exports = router;
