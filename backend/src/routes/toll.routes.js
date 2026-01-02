const express = require('express');
const router = express.Router();
const tollProvider = require('../services/toll-provider.service');

/**
 * Calculate tolls using multi-provider service
 * POST /api/tolls/calculate-provider
 * Body: {
 *   origin: {lat, lng},
 *   destination: {lat, lng},
 *   vehicleType,
 *   departureTime,
 *   providers
 * }
 */
router.post('/calculate-provider', async (req, res) => {
    try {
        const { origin, destination, vehicleType, departureTime, providers } = req.body;

        console.log('[TollRoute] 📥 Provider calculation request received:');
        console.log('[TollRoute]   - origin:', origin);
        console.log('[TollRoute]   - destination:', destination);
        console.log('[TollRoute]   - vehicleType:', vehicleType || 'car');
        console.log('[TollRoute]   - providers:', providers || 'default (here → estimate)');

        if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: origin {lat, lng}, destination {lat, lng}'
            });
        }

        // Use multi-provider service with automatic fallback
        const result = await tollProvider.calculateTolls(
            { lat: origin.lat, lng: origin.lng },
            { lat: destination.lat, lng: destination.lng },
            {
                vehicleType: vehicleType || 'car',
                departureTime: departureTime || new Date().toISOString(),
                providers: providers || ['here', 'estimate'], // Default to free providers
                enableFallback: true
            }
        );

        console.log(`[TollRoute] ✅ Provider calculation completed: ${result.provider}, cost: ${result.totalCost} ${result.currency}`);

        res.json(result);
    } catch (error) {
        console.error('[TollRoute] ❌ Provider calculation error:', error);
        res.status(500).json({
            success: false,
            error: 'Toll provider calculation failed',
            message: error.message
        });
    }
});

module.exports = router;
