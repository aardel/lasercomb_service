# API Setup Checklist

## ✅ Google Maps APIs - ENABLED

You have the following APIs enabled:
- ✅ Distance Matrix API
- ✅ Geocoding API
- ✅ Directions API

## Next Steps

### 1. Get Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Find your API key (or create a new one)
5. Copy the API key

### 2. Add API Key to Backend

Add to `backend/.env`:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. (Optional) Restrict API Key for Security

1. Click on your API key in Google Cloud Console
2. Under "API restrictions", select "Restrict key"
3. Choose only:
   - Distance Matrix API
   - Geocoding API
   - Directions API (if using)
4. Save

### 4. Set Quota Limits (Recommended)

To stay within free tier (10,000 requests/month):

1. Go to **APIs & Services** > **APIs**
2. Click on **Distance Matrix API**
3. Go to **Quotas** tab
4. Set daily quota: **350 requests/day** (10,500/month max)
5. Repeat for **Geocoding API**

### 5. Set Up Billing Alerts

1. Go to **Billing** in Google Cloud Console
2. Set up budget alert at **$1/month** (to catch any overages)
3. Set alert at 80% of free tier (8,000 requests)

## Ready for Phase 3!

Once your API key is in `backend/.env`, we can:
- ✅ Test geocoding (already partially implemented)
- ✅ Implement Distance Matrix API
- ✅ Complete the distance calculation service
- ✅ Test with real data

## Test Your API Key

```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Munich,Germany&key=YOUR_API_KEY"

# Test Distance Matrix API
curl "https://maps.googleapis.com/maps/api/distancematrix/json?origins=Munich,Germany&destinations=Hamburg,Germany&units=metric&key=YOUR_API_KEY"
```

Both should return JSON responses with data (not error messages).

