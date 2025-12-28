# ✅ Airport & Rates Update - Using Real APIs and Data

## Changes Made

### 1. **Airport Lookup Now Uses Google Places API** ✅

**Before:**
- Hardcoded list of only 8 airports
- Always defaulted to Zurich for locations in southern Germany
- Missing many important airports (e.g., Stuttgart STR)

**After:**
- Uses **Google Places API** to find nearest airport dynamically
- Searches within 50km radius, expands to 200km if needed
- Uses Place Details API to extract IATA codes accurately
- Works for **any location worldwide**

**How it works:**
1. Searches for airports near the customer's coordinates
2. Uses Google Places Nearby Search with `type=airport`
3. Extracts IATA code from place name or Place Details API
4. Calculates actual distance to the nearest airport

### 2. **Removed Fallback Rates - Requires Actual Data** ✅

**Before:**
- Used fallback rates (€42/day, €150/night) when country not found
- Could calculate costs even without real data
- Not accurate for actual travel expense reporting

**After:**
- **Throws error** if no rates found for a country
- Forces you to add actual rate data to the database
- Ensures all calculations use official government rates
- More accurate and compliant with regulations

## Setup Required

### 1. Load Country Rates into Database

Run this script to load all country rates:

```bash
cd backend
node ../scripts/load-country-rates.js
```

This loads rates for 40+ countries from `database/seed_country_rates.sql`.

### 2. Ensure Google Places API is Enabled

The airport lookup requires:
- **Places API** enabled in Google Cloud Console
- **GOOGLE_MAPS_API_KEY** set in `backend/.env`

The Places API is already enabled if you set up the customer autocomplete feature.

## Testing

### Test Airport Lookup

For Notzingen, Germany (48.6693, 9.4524):
- Should now find **Stuttgart Airport (STR)** instead of Zurich
- Distance should be ~30-40km instead of ~100km

### Test Rate Lookup

1. **With rates in database:**
   - Create trip to Germany, France, UK, etc.
   - Should show official rates

2. **Without rates:**
   - Create trip to a country not in database
   - Should show error: "No travel rates found for country: XXX"
   - Forces you to add rates before calculating costs

## Adding More Countries

To add rates for additional countries:

1. Edit `database/seed_country_rates.sql`
2. Add INSERT statements for new countries
3. Run `node ../scripts/load-country-rates.js` again

## API Usage

### Google Places API Calls

**Airport Lookup:**
- **Nearby Search**: 1 call per customer creation/update
- **Place Details**: 1 call per airport (if code not in name)
- **Cost**: Free tier: 10,000 requests/month

**Estimated usage:**
- 100 customers/month = ~200 API calls (well within free tier)

## Benefits

1. **Accurate Airport Detection**: Finds actual nearest airport, not hardcoded list
2. **Global Coverage**: Works for any location worldwide
3. **Data Integrity**: No fallback rates - ensures real data is used
4. **Regulatory Compliance**: Uses official government rates only
5. **Better Cost Accuracy**: Real airport distances = accurate travel costs

## Notes

- If Google Places API is unavailable, airport lookup returns `null`
- Customer creation still works, just without airport code
- Airport code can be added manually later if needed
- Rate data must be loaded before cost calculations work


