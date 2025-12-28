# Free API Options for Travel Cost Automation

## ✅ Recommended Free APIs (Already in Plan)

### 1. Google Maps APIs - **FREE Tier Available**

**What you get for FREE (Updated March 2025):**
- **10,000 free requests/month** per API (not a $200 credit)
- **Distance Matrix API** - Calculate distances and drive times
  - 10,000 free requests/month
  - After free tier: $5.00 per 1,000 requests (up to 100,000), then $4.00 per 1,000
- **Geocoding API** - Convert addresses to coordinates
  - 10,000 free requests/month
  - After free tier: $5.00 per 1,000 requests (up to 100,000), then $4.00 per 1,000

**Official Pricing:** https://developers.google.com/maps/billing-and-pricing/pricing

**Sign up:** https://console.cloud.google.com/
- Create a project
- Enable "Distance Matrix API" and "Geocoding API"
- Create API key (free)
- **Note:** Credit card may be required for billing account setup (but you won't be charged until you exceed free tier)

**Estimated usage:**
- 500 distance calculations/month = **$0** (well within 10,000 free tier)
- 500 geocoding requests/month = **$0** (well within 10,000 free tier)

**Cost after free tier:** 
- 10,001 - 100,000 requests: $5.00 per 1,000 requests
- 100,001+ requests: $4.00 per 1,000 requests

---

### 2. Amadeus Flight Search API - **FREE Tier Available**

**What you get for FREE:**
- **2,000 flight searches/month** (free tier)
- Real-time flight prices
- All airlines, global coverage
- No credit card required

**Sign up:** https://developers.amadeus.com/
- Create free account
- Create app to get API key and secret
- Free tier is self-service (no approval needed)

**Estimated usage:**
- 1,000 flight searches/month = **$0** (within free tier)

**Cost after free tier:** ~$0.01 per search (very affordable)

---

## 🔄 Free Alternatives (If Needed)

### Distance Calculation Alternatives

#### Option 1: OpenRouteService API - **100% FREE**
- **Unlimited free requests** (for non-commercial use)
- Distance Matrix API
- Route optimization
- **Sign up:** https://openrouteservice.org/
- **No credit card required**
- Perfect for development and testing

#### Option 2: Mapbox - **FREE Tier**
- **50,000 requests/month free**
- Distance Matrix API
- Similar to Google Maps
- **Sign up:** https://www.mapbox.com/
- Requires credit card but free tier is generous

#### Option 3: HERE API - **FREE Tier**
- **250,000 transactions/month free**
- Distance Matrix API
- **Sign up:** https://developer.here.com/
- Requires credit card

---

### Flight Search Alternatives

#### Option 1: Aviation Edge API - **FREE Tier**
- **500 requests/month free**
- Flight data and schedules
- **Sign up:** https://aviation-edge.com/
- Good for basic flight information

#### Option 2: OpenSky Network - **100% FREE**
- **Unlimited free requests**
- Real-time flight tracking
- Historical flight data
- **No signup required** (public API)
- **Note:** More for tracking than booking/search

#### Option 3: Mock/Static Data (For Development)
- Use sample flight data for testing
- No API needed during development
- Add real API later

---

### Geocoding Alternatives

#### Option 1: OpenStreetMap Nominatim - **100% FREE**
- **Unlimited free requests** (with rate limits)
- Geocoding and reverse geocoding
- **No signup required**
- **Note:** Rate limit: 1 request/second (fine for most use cases)

#### Option 2: Mapbox Geocoding - **FREE Tier**
- **100,000 requests/month free**
- Part of Mapbox suite
- **Signup:** https://www.mapbox.com/

---

## 💡 Recommended Approach

### For MVP/Development:
1. **Start with Google Maps** (free tier is generous)
2. **Use Amadeus** for flight search (free tier sufficient)
3. **If you exceed free tiers**, consider:
   - OpenRouteService for distance (unlimited free)
   - OpenStreetMap for geocoding (unlimited free)

### Cost Breakdown (Monthly):

| Service | Free Tier | Your Usage | Cost |
|---------|----------|------------|------|
| Google Maps Distance Matrix | 10,000 free/month | ~500 requests | **$0** |
| Google Maps Geocoding | 10,000 free/month | ~500 requests | **$0** |
| Amadeus | 2,000 searches | ~1,000 searches | **$0** |
| **Total** | | | **$0/month** |

---

## 🚀 Quick Start Guide

### 1. Get Google Maps API Key (5 minutes)
```
1. Go to https://console.cloud.google.com/
2. Create new project (or use existing)
3. Enable APIs:
   - Distance Matrix API
   - Geocoding API
4. Create API key
5. (Optional) Restrict key to specific APIs for security
6. Add to backend/.env: GOOGLE_MAPS_API_KEY=your_key
```

### 2. Get Amadeus API Credentials (10 minutes)
```
1. Go to https://developers.amadeus.com/
2. Sign up for free account
3. Go to "My Self-Service Workspace"
4. Create new app
5. Copy API Key and API Secret
6. Add to backend/.env:
   AMADEUS_API_KEY=your_key
   AMADEUS_API_SECRET=your_secret
```

### 3. Test APIs
```bash
# Test Google Maps (Distance Matrix)
curl "https://maps.googleapis.com/maps/api/distancematrix/json?origins=Munich,Germany&destinations=Hamburg,Germany&units=metric&key=YOUR_KEY"

# Test Amadeus (requires OAuth token first)
# We'll implement this in Phase 3
```

---

## 📊 Free Tier Comparison

| Feature | Google Maps | OpenRouteService | Mapbox |
|---------|-------------|------------------|--------|
| **Free Requests** | 10,000/month per API | Unlimited* | 50,000/month |
| **Distance Matrix** | ✅ | ✅ | ✅ |
| **Geocoding** | ✅ | ✅ | ✅ |
| **Credit Card** | ⚠️ May be required | ❌ Not required | ✅ Required |
| **Best For** | Production | Development/Testing | Production |

**Note:** Google Maps changed pricing in March 2025 - now offers 10,000 free requests/month per API instead of $200 credit.

*OpenRouteService: Unlimited for non-commercial use

---

## 🎯 Recommendation

**Use Google Maps + Amadeus** because:
1. ✅ Both have generous free tiers
2. ✅ Both are production-ready
3. ✅ Both are well-documented
4. ✅ Free tier is sufficient for your use case
5. ✅ Easy to upgrade if needed later

**Total cost: $0/month** (within free tiers)

---

## ⚠️ Important Notes

1. **Pricing Update (March 2025)**: 
   - Google Maps no longer offers $200/month credit
   - Now provides **10,000 free requests/month per API**
   - This is still more than enough for your use case (500 requests/month)

2. **Rate Limits**: Free tiers have rate limits (requests per second)
   - Google Maps: 50 requests/second
   - Amadeus: 10 requests/second
   - Both are more than enough for your use case

3. **API Key Security**: 
   - Never commit API keys to git
   - Use environment variables
   - Restrict API keys to specific APIs/IPs when possible

4. **Monitoring**: 
   - Set up usage alerts in Google Cloud Console
   - Set daily quota limits to prevent unexpected charges
   - Monitor Amadeus usage in their dashboard
   - Both will warn you before exceeding free tier

5. **Billing Account**: 
   - Google Maps may require a billing account setup (credit card)
   - You won't be charged until you exceed the 10,000 free requests/month
   - Set up quota limits to stay within free tier

---

## 🔧 Implementation Status

✅ **Phase 2 Complete**: Customer management with geocoding service ready
⏳ **Phase 3 Next**: API integrations
   - Google Maps Distance Matrix (free tier)
   - Amadeus Flight Search (free tier)

Both APIs are **100% free** for your expected usage!

