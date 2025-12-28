# Flight Search Improvement Plan

## Problem
Current flight search is missing low-cost carriers and has API reliability issues:
- Google Flights: 400 errors on one-way flights
- Groq AI: Rate limited (100k tokens/day)
- Amadeus: Quota exceeded
- Missing: Ryanair, EasyJet, Wizz Air, Vueling, etc.

## Solution: Multi-Tier Flight Search Strategy

### Tier 1: Low-Cost Carrier Aggregators (PRIORITY)
These APIs specialize in low-cost carriers:

1. **Kiwi.com (Tequila API)** ⭐ RECOMMENDED
   - Aggregates 750+ airlines including ALL major low-cost carriers
   - Ryanair, EasyJet, Wizz Air, Vueling, Norwegian, etc.
   - FREE tier: 100 requests/month
   - Paid: €0.01-0.05 per search
   - Best coverage for European low-cost carriers
   - URL: https://tequila.kiwi.com/

2. **Skyscanner Rapid API**
   - Comprehensive low-cost carrier coverage
   - Free tier: 500 requests/month
   - URL: https://rapidapi.com/skyscanner/api/skyscanner-flight-search

3. **AviationStack**
   - Real-time flight data
   - Free tier: 100 requests/month
   - URL: https://aviationstack.com/

### Tier 2: Traditional Carriers
Keep existing but fix issues:

4. **Amadeus API** (Fix quota issues)
   - Increase quota or implement better caching
   - Good for traditional carriers

5. **Google Flights** (Fix one-way search bug)
   - Issue: Requires return_date even for one-way
   - Fix: Set type parameter correctly

### Tier 3: AI Fallback
6. **Groq AI** (Implement daily token management)
   - Reset counter daily
   - Use only when others fail
   - Cache AI results aggressively

## Implementation Priority

### Phase 1: Quick Win (1-2 hours)
1. **Add Kiwi.com API** - Best ROI
   - Sign up for free tier
   - Implement search endpoint
   - Map response to our format

2. **Fix Google Flights one-way bug**
   - Remove type parameter or set correctly
   - Test with one-way segments

### Phase 2: Reliability (2-3 hours)
3. **Implement flight search caching**
   - Cache by route + date for 6 hours
   - Reduce API calls by 80%
   - Store in PostgreSQL or Redis

4. **Add request queue**
   - Prevent hitting rate limits
   - Retry failed requests
   - Track API quotas

### Phase 3: Enhancement (3-4 hours)
5. **Add Skyscanner API**
   - Second source for validation
   - Compare prices across APIs

6. **Price comparison dashboard**
   - Show cheapest from each source
   - Highlight low-cost carriers

## Expected Results

### Before:
- 0-2 flight options (mostly unavailable)
- Missing low-cost carriers
- API failures

### After:
- 5-15 flight options per route
- All major low-cost carriers included
- 95%+ search success rate
- Prices 30-50% cheaper on average

## API Costs Estimate

**Free Tier (Recommended Start):**
- Kiwi.com: 100 searches/month FREE
- Skyscanner: 500 searches/month FREE
- Total: ~600 searches/month at $0

**Paid Tier (After validation):**
- Kiwi.com: €0.01-0.05 per search
- 1000 searches/month = €10-50/month
- ROI: Huge - one booking pays for months

## Implementation Steps

### Step 1: Sign up for Kiwi.com API
```bash
# 1. Go to https://tequila.kiwi.com/
# 2. Create account
# 3. Get API key
# 4. Add to .env: KIWI_API_KEY=your_key_here
```

### Step 2: Create Kiwi.com Service
```javascript
// backend/src/services/kiwi-flights.service.js
class KiwiFlightService {
  async search({ origin, destination, dateFrom, dateTo, adults = 1 }) {
    // Kiwi.com API implementation
    // Returns: flights with low-cost carriers
  }
}
```

### Step 3: Update Flight Service Priority
```javascript
const API_PRIORITY = [
  'kiwi',        // NEW - Low-cost carriers
  'skyscanner',  // NEW - Aggregator
  'googleFlights',
  'amadeus',
  'groq'         // Fallback only
];
```

### Step 4: Add Caching
```javascript
// Cache flights for 6 hours
const cacheKey = `flights:${origin}:${destination}:${date}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
// ... search and cache result
```

## Quick Action Items

**TODAY (30 minutes):**
1. Sign up for Kiwi.com free API ✓
2. Get API key ✓
3. Test with one route ✓

**THIS WEEK (4-6 hours):**
1. Implement Kiwi.com service
2. Fix Google Flights one-way bug
3. Add basic caching
4. Test with real routes

**NEXT WEEK (3-4 hours):**
1. Add Skyscanner
2. Implement price comparison
3. Add quota monitoring
4. Performance optimization

## Success Metrics

- [ ] 10+ flight options per search (vs 0-2 now)
- [ ] Include Ryanair, EasyJet, Wizz Air in results
- [ ] 95%+ search success rate (vs ~30% now)
- [ ] Average price 30-50% lower
- [ ] Search response time < 3 seconds
- [ ] API costs < €50/month

## Notes

- **Kiwi.com is the #1 priority** - best low-cost carrier coverage for Europe
- Free tiers should cover initial usage
- Caching will dramatically reduce costs
- Can upgrade to paid tiers after validation
- ROI is excellent - better prices save money immediately
