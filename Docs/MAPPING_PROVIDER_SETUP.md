# Mapping Provider Setup Guide

## Overview

The application now supports **multiple mapping providers** with automatic fallback:

- **Google Maps** (current, paid)
- **OpenRouteService** (new, FREE)
- **Auto mode** (tries OpenRouteService first, falls back to Google if it fails)

This allows you to:
1. ✅ **Test OpenRouteService for free** while keeping Google as backup
2. ✅ **Save $40-100/month** on mapping API costs
3. ✅ **Easy rollback** if OpenRouteService doesn't work well
4. ✅ **Zero downtime** migration

---

## Quick Start

### Step 1: Get FREE OpenRouteService API Key

1. Go to: https://openrouteservice.org/dev/#/signup
2. Sign up for a free account
3. Go to dashboard and copy your API key

**Free Tier Limits:**
- 2,000 routing requests/day
- 500 matrix requests/day
- Perfect for your usage (~400 requests/day)

### Step 2: Add API Key to `.env`

Edit `/backend/.env` and add:

```env
# OpenRouteService (FREE mapping provider)
OPENROUTESERVICE_API_KEY=your_api_key_here
```

### Step 3: Restart Backend

```bash
cd backend
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Start backend
node src/app.js
```

### Step 4: Test (Optional - Auto mode is already enabled)

The system is already set to **"auto" mode** by default, which means:
- ✅ Every geocoding/routing request tries OpenRouteService first
- ✅ If OpenRouteService fails, it automatically falls back to Google Maps
- ✅ You can see which provider was used in the backend logs

---

## Provider Modes

You can change the provider mode in settings (coming soon in UI) or directly in database:

### Mode Options:

**1. Auto (Recommended - Default)**
```sql
UPDATE technicians SET mapping_provider = 'auto';
```
- Tries OpenRouteService first (free)
- Falls back to Google if OpenRouteService fails
- Best for testing and gradual migration

**2. OpenRouteService Only**
```sql
UPDATE technicians SET mapping_provider = 'openrouteservice';
```
- Uses only OpenRouteService (no Google fallback)
- 100% free
- Fails if OpenRouteService is down

**3. Google Maps Only**
```sql
UPDATE technicians SET mapping_provider = 'google';
```
- Uses only Google Maps (current behavior)
- Paid service
- Most reliable

---

## Monitoring Which Provider is Used

Check backend logs to see which provider handled each request:

**OpenRouteService Success:**
```
[GeocodingProvider] 🗺️  OpenRouteService geocoding: Street, City, Country
[GeocodingProvider] ✅ Success with OpenRouteService
```

**Fallback to Google:**
```
[GeocodingProvider] 🗺️  OpenRouteService geocoding: Street, City, Country
[GeocodingProvider] ⚠️  OpenRouteService failed: No results found
[GeocodingProvider] 🔄 Falling back to Google Maps...
[GeocodingProvider] ✅ Success with Google Maps (fallback)
```

---

## Cost Savings Estimate

### Current (Google Maps Only):
- ~400 API calls/day
- Geocoding: $5 per 1,000 requests
- Distance Matrix: $5 per 1,000 requests
- **Monthly Cost: ~$60-100**

### With OpenRouteService (Auto Mode):
- 90% of requests succeed with OpenRouteService (free)
- 10% fallback to Google
- **Monthly Cost: ~$6-10** (90% savings!)

### With OpenRouteService Only:
- 100% requests to OpenRouteService
- **Monthly Cost: $0** (100% savings!)

---

## What Uses Mapping APIs?

1. **Customer Address Geocoding** - Converting addresses to coordinates
2. **Distance Calculations** - Route distance and duration between locations
3. **Travel Time Estimates** - Calculating driving times for trips
4. **Customer Search** - Finding businesses by name (future: separate Places API)

---

## Fallback Behavior

Enable/disable fallback per technician:

```sql
-- Enable fallback (recommended)
UPDATE technicians SET enable_mapping_fallback = true;

-- Disable fallback (force single provider)
UPDATE technicians SET enable_mapping_fallback = false;
```

---

## Troubleshooting

### OpenRouteService Returns No Results
- Check if address exists in OpenStreetMap: https://www.openstreetmap.org/
- Auto mode will fallback to Google automatically
- For new/obscure addresses, Google might have better coverage

### Rate Limit Exceeded
```
[GeocodingProvider] ⚠️  OpenRouteService failed: Rate limit exceeded
```
**Solution:**
- You've hit the 2,000/day limit
- System will automatically fallback to Google
- Consider caching (next phase) to reduce requests by 80%

### API Key Invalid
```
[GeocodingProvider] ⚠️  OPENROUTESERVICE_API_KEY not configured
```
**Solution:**
- Check `.env` file has correct API key
- Restart backend after adding key

---

## Next Steps

### Phase 1: Testing (Current)
- ✅ OpenRouteService integrated with fallback
- ✅ Auto mode enabled by default
- ✅ Zero risk - Google Maps still works as backup
- 📊 **Monitor logs to see success rate**

### Phase 2: Caching (Coming Soon)
- Add Redis/memory cache for geocoding results
- Cache routes for 7 days
- Reduce API calls by 80-90%
- Further cost savings

### Phase 3: Remove Google (Optional)
- Once confident OpenRouteService works well
- Switch to `mapping_provider = 'openrouteservice'`
- Remove Google Maps API key
- **100% free forever**

---

## API Key Security

**Important:** Never commit API keys to version control!

`.env` should be in `.gitignore`:
```
# .gitignore
.env
.env.local
```

Share keys securely through password manager or encrypted channels only.

---

## Support

For OpenRouteService issues:
- Documentation: https://openrouteservice.org/dev/#/api-docs
- Community: https://ask.openrouteservice.org/

For Google Maps issues:
- Documentation: https://developers.google.com/maps/documentation
- Pricing: https://mapsplatform.google.com/pricing/
