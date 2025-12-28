# Testing Google Maps APIs

## Prerequisites

1. ✅ Google Maps APIs enabled in Google Cloud Console
2. ✅ API key added to `backend/.env`:
   ```env
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

## Start the Backend

```bash
cd backend
npm run dev
```

Server will run on http://localhost:3000

## Test Endpoints

### 1. Test Geocoding API

**Endpoint:** `GET /api/test/geocode`

**Example:**
```bash
curl "http://localhost:3000/api/test/geocode?address=Hauptstraße&city=Munich&country=DEU"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "lat": 48.1351,
    "lng": 11.5820,
    "formatted_address": "Hauptstraße, Munich, Germany"
  }
}
```

### 2. Test Distance Matrix API (by coordinates)

**Endpoint:** `GET /api/test/distance`

**Example:**
```bash
curl "http://localhost:3000/api/test/distance?origin_lat=48.1351&origin_lng=11.5820&dest_lat=53.5511&dest_lng=9.9937"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "distance_km": 780.5,
    "duration_minutes": 450,
    "distance_text": "781 km",
    "duration_text": "7 hours 30 mins",
    "origin_address": "Munich, Germany",
    "destination_address": "Hamburg, Germany"
  }
}
```

### 3. Test Distance Matrix API (by address)

**Endpoint:** `GET /api/test/distance-address`

**Example:**
```bash
curl "http://localhost:3000/api/test/distance-address?origin=Munich,Germany&destination=Hamburg,Germany"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "distance_km": 780.5,
    "duration_minutes": 450,
    "distance_text": "781 km",
    "duration_text": "7 hours 30 mins",
    "origin_address": "Munich, Germany",
    "destination_address": "Hamburg, Germany"
  }
}
```

## Test in Browser

1. **Geocoding:**
   ```
   http://localhost:3000/api/test/geocode?address=Hauptstraße&city=Munich&country=DEU
   ```

2. **Distance (coordinates):**
   ```
   http://localhost:3000/api/test/distance?origin_lat=48.1351&origin_lng=11.5820&dest_lat=53.5511&dest_lng=9.9937
   ```

3. **Distance (addresses):**
   ```
   http://localhost:3000/api/test/distance-address?origin=Munich,Germany&destination=Hamburg,Germany
   ```

## Common Test Cases

### Test 1: Munich to Hamburg (Domestic)
```bash
curl "http://localhost:3000/api/test/distance-address?origin=Munich,Germany&destination=Hamburg,Germany"
```
Expected: ~780 km, ~7.5 hours

### Test 2: Munich to Paris (International)
```bash
curl "http://localhost:3000/api/test/distance-address?origin=Munich,Germany&destination=Paris,France"
```
Expected: ~850 km, ~8 hours

### Test 3: Geocode Customer Address
```bash
curl "http://localhost:3000/api/test/geocode?address=123%20Main%20St&city=Berlin&country=DEU"
```

## Troubleshooting

### Error: "Google Maps API key not set"
- Check that `GOOGLE_MAPS_API_KEY` is in `backend/.env`
- Restart the server after adding the key

### Error: "REQUEST_DENIED"
- API key might be invalid
- API might not be enabled in Google Cloud Console
- Check API restrictions on the key

### Error: "OVER_QUERY_LIMIT"
- You've exceeded the quota
- Check usage in Google Cloud Console
- Wait for quota to reset (daily/monthly)

### Error: "ZERO_RESULTS"
- Address not found
- Try a more specific address
- Check spelling

## Next Steps

Once APIs are working:
1. ✅ Geocoding is already integrated in customer creation
2. ✅ Distance calculation ready for trip planning
3. ⏭️ Proceed to Phase 4: Cost Calculation Engine

