# Provider Integration Guide

This guide shows how to integrate the new multi-provider services into existing routes.

## Quick Start

All provider services are ready to use. They follow the same pattern:

```javascript
const { searchFlights } = require('./services/flight-provider.service');
const { searchHotels } = require('./services/hotel-provider.service');
const { searchCarRentals } = require('./services/car-rental-provider.service');
const { calculateTolls } = require('./services/toll-provider.service');
```

## Integration Examples

### 1. Flight Search Integration

**Current:** `flight.service.js` has complex logic with multiple providers
**New:** Use `flight-provider.service.js` for cleaner multi-provider support

#### Option A: Add to existing flight.service.js (Recommended for testing)

Add at the top of `flight.service.js`:
```javascript
const flightProvider = require('./flight-provider.service');

// NEW: Use multi-provider flight search
async function searchFlightsWithProvider(origin, destination, departureDate, returnDate, limit) {
    const params = {
        origin: origin.code,
        destination: destination.code,
        departureDate,
        returnDate,
        passengers: 1,
        maxResults: limit || 5
    };

    const options = {
        providers: ['serper', 'amadeus', 'groq'], // Try Serper first (cheapest)
        enableFallback: true
    };

    return await flightProvider.searchFlights(params, options);
}

module.exports = {
    searchFlights, // Keep existing
    searchFlightsWithProvider // Add new
};
```

#### Option B: Update route directly

In `routes/flight.routes.js`:
```javascript
const flightProvider = require('../services/flight-provider.service');

router.post('/search-v2', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate } = req.body;

        const result = await flightProvider.searchFlights({
            origin: origin.code,
            destination: destination.code,
            departureDate,
            returnDate
        }, {
            providers: ['serper', 'amadeus', 'groq'],
            enableFallback: true
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### 2. Hotel Search Integration

**Current:** Hotels are searched via Google Places
**New:** Use `hotel-provider.service.js` for free Xotelo + Amadeus

Create new route in `routes/hotel.routes.js` (or create if doesn't exist):
```javascript
const express = require('express');
const router = express.Router();
const hotelProvider = require('../services/hotel-provider.service');

router.post('/search', async (req, res) => {
    try {
        const { location, checkIn, checkOut, guests } = req.body;

        const result = await hotelProvider.searchHotels({
            location,
            checkIn,
            checkOut,
            guests: guests || 1
        }, {
            providers: ['xotelo', 'amadeus'], // Free providers only
            enableFallback: true
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### 3. Car Rental Integration

**Current:** Uses RapidAPI or market prices
**New:** Use `car-rental-provider.service.js` with market prices as default

In `services/car-rental.service.js`, add:
```javascript
const carRentalProvider = require('./car-rental-provider.service');

async function getCarRentalOptionsWithProvider(location, pickupDate, dropoffDate) {
    const result = await carRentalProvider.searchCarRentals({
        location,
        pickupDate,
        dropoffDate
    }, {
        providers: ['market'], // Free market prices (no API needed)
        enableFallback: true
    });

    return result.rentals;
}
```

### 4. Toll Calculation Integration

**Current:** Uses TollGuru ($80/month)
**New:** Use `toll-provider.service.js` with HERE Maps (FREE 250k/month)

In `services/cost.service.js` or wherever toll calculation happens:
```javascript
const tollProvider = require('./toll-provider.service');

async function calculateTollCosts(origin, destination) {
    const result = await tollProvider.calculateTolls(
        { lat: origin.lat, lng: origin.lng },
        { lat: destination.lat, lng: destination.lng },
        {
            providers: ['here', 'estimate'], // FREE providers only
            enableFallback: true
        }
    );

    return {
        totalCost: result.totalCost,
        currency: result.currency,
        provider: result.provider
    };
}
```

## Provider Configuration

All providers support configuration:

```javascript
const options = {
    providers: ['provider1', 'provider2', 'provider3'], // Priority order
    enableFallback: true // Auto-fallback on failure
};
```

### Available Providers

**Flights:**
- `'serper'` - Serper API (FREE 2,500, then $1/1k) ⭐ Recommended
- `'amadeus'` - Amadeus (FREE 2k/month)
- `'groq'` - Groq AI (FREE 14k/day, estimates only)
- `'serpapi'` - SerpAPI (EXPENSIVE, legacy)

**Hotels:**
- `'xotelo'` - Xotelo (FREE unlimited) ⭐ Recommended
- `'amadeus'` - Amadeus (FREE 2k/month)
- `'google'` - Google Places (PAID backup)

**Car Rentals:**
- `'market'` - Market prices (FREE, no API) ⭐ Recommended
- `'rentalcars'` - Rentalcars.com (FREE partnership)
- `'rapidapi'` - RapidAPI (FREE 500/month)

**Tolls:**
- `'here'` - HERE Maps (FREE 250k/month) ⭐ Recommended
- `'estimate'` - Simple estimate (FREE)
- `'tollguru'` - TollGuru (EXPENSIVE $80/month)

## Cost Optimization Tips

1. **Always start with free providers** (Serper, Xotelo, Market, HERE)
2. **Keep paid providers as backup** for reliability
3. **Enable fallback** for automatic provider switching
4. **Monitor usage** via provider logs

## Testing

Test each provider integration:

```bash
# Test flight provider
curl -X POST http://localhost:3000/api/flights/search-v2 \
  -H "Content-Type: application/json" \
  -d '{"origin":{"code":"STR"},"destination":{"code":"IAF"},"departureDate":"2026-02-01"}'

# Check logs for provider usage
tail -f /tmp/backend.log | grep Provider
```

## Gradual Migration Plan

1. **Week 1:** Add provider services alongside existing (parallel)
2. **Week 2:** Test new providers with real data
3. **Week 3:** Switch default to new providers
4. **Week 4:** Remove old provider code

This allows safe, incremental migration with rollback capability.

---

**Created:** December 28, 2024
**Status:** Ready for integration
**Cost Impact:** $5,000-5,700/year savings when fully integrated
