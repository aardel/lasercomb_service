# API Setup Guide

This guide covers setting up all required APIs for the Travel Cost Automation System.

## Required APIs

### 1. Google Maps API (Required)

Used for:
- Geocoding (address to coordinates)
- Distance Matrix (road distance and duration)
- Places Autocomplete (customer address search)

#### Setup Steps:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Enable the following APIs:**
   - Distance Matrix API
   - Geocoding API
   - Places API (for autocomplete)
   - Directions API (optional, for route details)

4. **Get Your API Key:**
   - Navigate to **APIs & Services** > **Credentials**
   - Find your API key (or create a new one)
   - Copy the API key

5. **Add API Key to Backend:**
   Add to `backend/.env`:
   ```env
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

6. **Restrict API Key for Security (Recommended):**
   - Click on your API key in Google Cloud Console
   - Under "API restrictions", select "Restrict key"
   - Choose only:
     - Distance Matrix API
     - Geocoding API
     - Places API
     - Directions API (if using)
   - Save

7. **Set Quota Limits (Recommended):**
   - Go to **APIs & Services** > **APIs**
   - Click on each API (Distance Matrix, Geocoding, Places)
   - Go to **Quotas** tab
   - Set daily quota: **350 requests/day** (10,500/month max)

8. **Set Up Billing Alerts:**
   - Go to **Billing** in Google Cloud Console
   - Set up budget alert at **$1/month** (to catch any overages)
   - Set alert at 80% of free tier (8,000 requests)

#### Pricing:
- **Free tier**: $200/month credit (~40,000 requests)
- **After free tier**: Varies by API (see Google Cloud pricing)

#### Test Your API Key:

```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Munich,Germany&key=YOUR_API_KEY"

# Test Distance Matrix API
curl "https://maps.googleapis.com/maps/api/distancematrix/json?origins=Munich,Germany&destinations=Hamburg,Germany&units=metric&key=YOUR_API_KEY"
```

Both should return JSON responses with data (not error messages).

---

### 2. Amadeus API (Required)

Used for:
- Flight search with real-time prices
- Hotel search

#### Setup Steps:

1. **Sign up at [Amadeus for Developers](https://developers.amadeus.com/)**
2. **Create a new app** in the developer portal
3. **Get your credentials:**
   - API Key
   - API Secret

4. **Add Credentials to Backend:**
   Add to `backend/.env`:
   ```env
   AMADEUS_API_KEY=your_api_key_here
   AMADEUS_API_SECRET=your_api_secret_here
   ```

#### Pricing:
- **Free tier**: 2,000 flight searches/month
- **After free tier**: Pay-as-you-go pricing

#### Test Your API:

The system uses OAuth 2.0 for authentication. Test endpoints are available at:
- `GET /api/test/amadeus` - Test Amadeus connection

---

### 3. TollGuru API (Optional)

Used for:
- Toll cost calculations for road trips

#### Setup Steps:

1. **Sign up at [TollGuru](https://tollguru.com/)**
2. **Get your API key**
3. **Add to Backend:**
   ```env
   TOLLGURU_API_KEY=your_api_key_here
   ```

#### Pricing:
- Free tier available (check TollGuru website for current limits)

---

### 4. HERE Maps API (Optional)

Used for:
- Alternative geocoding and routing

#### Setup Steps:

1. **Sign up at [HERE Developer Portal](https://developer.here.com/)**
2. **Create a project and get API key**
3. **Add to Backend:**
   ```env
   HERE_API_KEY=your_api_key_here
   ```

---

### 5. RapidAPI (Optional)

Used for:
- Real-time car rental pricing

#### Setup Steps:

1. **Sign up at [RapidAPI](https://rapidapi.com/hub)**
2. **Search for "car rental" APIs**
3. **Choose one with a free tier** (e.g., 100-500 requests/month)
4. **Subscribe to free plan**
5. **Copy API key to `.env`:**
   ```env
   RAPIDAPI_KEY=your_key_here
   ```
6. **Update `car-rental.service.js`** with the actual API endpoint

#### Without RapidAPI:
- System uses market-researched price ranges (updated monthly)
- Shows min-max ranges with verification warnings
- User must verify actual prices before finalizing quotation

---

## API Testing

### Test Google Maps APIs

See `docs/api/TESTING.md` for detailed testing instructions.

### Test Amadeus API

```bash
# Test flight search (requires OAuth token)
curl -X POST http://localhost:3000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "MUC",
    "destination": "HAM",
    "departureDate": "2025-01-15"
  }'
```

---

## API Rate Limits & Best Practices

### Rate Limits:
- **Amadeus Flights**: 2,000 searches/month (free tier)
- **Google Maps**: $200/month credit (~40,000 requests)
- **RapidAPI Car Rentals**: 100-500 requests/month (varies by API)

### Best Practices:
1. **Use caching** to minimize API calls
2. **Monitor usage** in respective developer consoles
3. **Set up billing alerts** to avoid unexpected charges
4. **Implement retry logic** with exponential backoff
5. **Cache frequently accessed data** (e.g., customer locations, rates)

---

## Troubleshooting

### Google Maps API Errors

**Error: "Google Maps API key not set"**
- Check that `GOOGLE_MAPS_API_KEY` is in `backend/.env`
- Restart the server after adding the key

**Error: "REQUEST_DENIED"**
- API key might be invalid
- API might not be enabled in Google Cloud Console
- Check API restrictions on the key

**Error: "OVER_QUERY_LIMIT"**
- You've exceeded the quota
- Check usage in Google Cloud Console
- Wait for quota to reset (daily/monthly)

**Error: "ZERO_RESULTS"**
- Address not found
- Try a more specific address
- Check spelling

### Amadeus API Errors

**Error: "Invalid credentials"**
- Verify API key and secret are correct
- Check that credentials are for the correct environment (test vs production)

**Error: "Rate limit exceeded"**
- You've exceeded the free tier limit
- Wait for monthly reset or upgrade plan

---

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit API keys to version control
- Always use environment variables (`.env` file)
- Restrict API keys to specific APIs and IPs when possible
- Rotate API keys regularly
- Monitor API usage for suspicious activity

---

## Next Steps

Once APIs are configured:
1. Test each API using the test endpoints
2. Verify integration in the application
3. Set up monitoring and alerts
4. Review `docs/api/TESTING.md` for detailed testing procedures












