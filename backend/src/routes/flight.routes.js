const express = require('express');
const router = express.Router();
const flightService = require('../services/flight.service');
const flightProvider = require('../services/flight-provider.service');

/**
 * Search for flights between coordinates
 * POST /api/flights/search
 * Body: { origin: {lat, lng}, destination: {lat, lng}, date: 'YYYY-MM-DD' }
 */
router.post('/search', async (req, res) => {
    try {
        const { origin, destination, date, departureDate, returnDate, limit, apiPreferences } = req.body;
        const actualDepartureDate = departureDate || date;
        const actualLimit = limit || 5; // Default to 5 if not provided

        console.log('[FlightRoute] 📥 Search request received:');
        console.log('[FlightRoute]   - limit:', actualLimit);
        console.log('[FlightRoute]   - departure:', actualDepartureDate);
        console.log('[FlightRoute]   - return:', returnDate);
        console.log('[FlightRoute]   - API preferences:', apiPreferences ? JSON.stringify(apiPreferences, null, 2) : 'using defaults');

        if (!origin || !destination || !actualDepartureDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: origin, destination, date/departureDate'
            });
        }

        // Wrap in additional try-catch to prevent any unhandled errors from crashing the server
        let results;
        try {
            results = await flightService.searchFlights(origin, destination, actualDepartureDate, returnDate, actualLimit, null, null, apiPreferences);
        } catch (serviceError) {
            console.error('[FlightRoute] ❌ Flight service error:', serviceError);
            console.error('[FlightRoute] Error stack:', serviceError.stack);
            
            // Return a safe error response instead of crashing
            return res.status(500).json({
                success: false,
                error: 'Flight search service encountered an error',
                message: serviceError.message || 'Unknown error occurred during flight search',
                options: []
            });
        }

        // Ensure we always return a valid response structure
        if (!results || typeof results !== 'object') {
            console.warn('[FlightRoute] ⚠️ Invalid results from flight service, returning error response');
            return res.status(500).json({
                success: false,
                error: 'Invalid response from flight search service',
                options: []
            });
        }

        res.json(results);
    } catch (error) {
        console.error('[FlightRoute] ❌ Unhandled error in flight search route:', error);
        console.error('[FlightRoute] Error stack:', error.stack);
        
        // Always return a response, never let the error propagate
        res.status(500).json({
            success: false,
            error: 'An unexpected error occurred during flight search',
            message: error.message || 'Unknown error',
            options: []
        });
    }
});

/**
 * Search for flights using multi-provider service (NEW)
 * POST /api/flights/search-provider
 * Body: { origin: {code}, destination: {code}, departureDate, returnDate, passengers, maxResults, providers }
 */
router.post('/search-provider', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, passengers, maxResults, providers } = req.body;

        console.log('[FlightRoute] 📥 Provider search request received:');
        console.log('[FlightRoute]   - origin:', origin?.code);
        console.log('[FlightRoute]   - destination:', destination?.code);
        console.log('[FlightRoute]   - departure:', departureDate);
        console.log('[FlightRoute]   - return:', returnDate);
        console.log('[FlightRoute]   - providers:', providers || 'default (serper → amadeus → groq)');

        if (!origin?.code || !destination?.code || !departureDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: origin.code, destination.code, departureDate'
            });
        }

        // Use multi-provider service with automatic fallback
        const result = await flightProvider.searchFlights({
            origin: origin.code,
            destination: destination.code,
            departureDate,
            returnDate,
            passengers: passengers || 1,
            maxResults: maxResults || 5
        }, {
            providers: providers || ['serper', 'amadeus', 'groq'], // Default to free providers
            enableFallback: true
        });

        console.log(`[FlightRoute] ✅ Provider search completed: ${result.provider}, ${result.count} flights`);

        res.json(result);
    } catch (error) {
        console.error('[FlightRoute] ❌ Provider search error:', error);
        res.status(500).json({
            success: false,
            error: 'Flight provider search failed',
            message: error.message
        });
    }
});

module.exports = router;
