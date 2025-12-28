# API Testing Guide

This guide covers testing all API integrations in the Travel Cost Automation System.

## Prerequisites

1. ✅ Backend server running on http://localhost:3000
2. ✅ All API keys configured in `backend/.env`
3. ✅ Database set up and running

## Google Maps API Testing

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

**Test in Browser:**
```
http://localhost:3000/api/test/geocode?address=Hauptstraße&city=Munich&country=DEU
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

### Common Test Cases

**Test 1: Munich to Hamburg (Domestic)**
```bash
curl "http://localhost:3000/api/test/distance-address?origin=Munich,Germany&destination=Hamburg,Germany"
```
Expected: ~780 km, ~7.5 hours

**Test 2: Munich to Paris (International)**
```bash
curl "http://localhost:3000/api/test/distance-address?origin=Munich,Germany&destination=Paris,France"
```
Expected: ~850 km, ~8 hours

**Test 3: Geocode Customer Address**
```bash
curl "http://localhost:3000/api/test/geocode?address=123%20Main%20St&city=Berlin&country=DEU"
```

### Troubleshooting Google Maps API

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

---

## Cost Calculation Testing

### Prerequisites
1. ✅ Database with rates data (from `database/schema.sql`)
2. ✅ At least one customer in the database
3. ✅ Backend server running

### 1. Get Travel Rates

**Endpoint:** `GET /api/costs/rates?country=DEU&city=Berlin`

**Example:**
```bash
curl "http://localhost:3000/api/costs/rates?country=DEU"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "daily_allowance_8h": 14.00,
    "daily_allowance_24h": 28.00,
    "hotel_rate": 115.00,
    "mileage_rate": 0.88,
    "travel_hour_rate": 98.00,
    "work_hour_rate": 132.00
  }
}
```

### 2. Calculate Trip Costs

**Endpoint:** `POST /api/costs/calculate`

**Body:**
```json
{
  "customer_id": "customer-uuid-here",
  "engineer_location": {
    "lat": 48.1351,
    "lng": 11.5820
  },
  "work_hours": 6,
  "date": "2025-01-15"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/costs/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "YOUR_CUSTOMER_ID",
    "engineer_location": {"lat": 48.1351, "lng": 11.5820},
    "work_hours": 6,
    "date": "2025-01-15"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "arbeitszeit_hours": 6,
    "arbeitszeit_rate": 132.00,
    "arbeitszeit_total": 792.00,
    "reisezeit_hours": 8.05,
    "reisezeit_rate": 98.00,
    "reisezeit_total": 788.90,
    "entfernung_km": 791.60,
    "entfernung_rate": 0.88,
    "entfernung_total": 696.61,
    "tagesspesen_24h_days": 0,
    "tagesspesen_24h_rate": 28.00,
    "tagesspesen_24h_total": 0.00,
    "tagesspesen_8h_days": 1,
    "tagesspesen_8h_rate": 14.00,
    "tagesspesen_8h_total": 14.00,
    "hotel_nights": 0,
    "hotel_rate": 115.00,
    "hotel_total": 0.00,
    "komplette_rk": 1499.51,
    "total_quotation": 2291.51
  }
}
```

### Step-by-Step Cost Calculation Test

**Step 1: Create a Test Customer**
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company Hamburg",
    "email": "test@hamburg.de",
    "phone": "+49 40 123456",
    "city": "Hamburg",
    "country": "DEU"
  }'
```

Save the `id` from the response.

**Step 2: Get Travel Rates**
```bash
curl "http://localhost:3000/api/costs/rates?country=DEU"
```

**Step 3: Calculate Costs**

Replace `CUSTOMER_ID` with the ID from Step 1:
```bash
curl -X POST http://localhost:3000/api/costs/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUSTOMER_ID",
    "engineer_location": {"lat": 48.1351, "lng": 11.5820},
    "work_hours": 6,
    "date": "2025-01-15"
  }'
```

### Troubleshooting Cost Calculation

**Error: "No travel rates found"**
- Make sure database has rates data
- Run: `psql -U postgres -d travel_costs -f database/schema.sql`

**Error: "Customer not found"**
- Create a customer first using `/api/customers` endpoint

**Error: "Distance calculation failed"**
- Check Google Maps API key is set
- Verify API key is working with `/api/test/distance-address`

---

## Amadeus Flight Search Testing

### Test Flight Search

**Endpoint:** `POST /api/flights/search`

**Body:**
```json
{
  "origin": "MUC",
  "destination": "HAM",
  "departureDate": "2025-01-15",
  "returnDate": "2025-01-20",
  "adults": 1
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "MUC",
    "destination": "HAM",
    "departureDate": "2025-01-15",
    "adults": 1
  }'
```

### Troubleshooting Amadeus API

**Error: "Invalid credentials"**
- Verify API key and secret are correct
- Check that credentials are for the correct environment (test vs production)

**Error: "Rate limit exceeded"**
- You've exceeded the free tier limit (2,000 searches/month)
- Wait for monthly reset or upgrade plan

---

## Places Autocomplete Testing

### Test Autocomplete

**Endpoint:** `GET /api/places/autocomplete?input=Siemens&country=de`

**Example:**
```bash
curl "http://localhost:3000/api/places/autocomplete?input=Siemens&country=de"
```

### Test Place Details

**Endpoint:** `GET /api/places/details?place_id=ChIJ...`

**Example:**
```bash
curl "http://localhost:3000/api/places/details?place_id=ChIJ..."
```

---

## Health Check Endpoints

### Server Health
```bash
curl http://localhost:3000/health
```

### Database Health
```bash
curl http://localhost:3000/health/db
```

---

## Next Steps

Once all APIs are tested and working:
1. Test the complete workflow in the frontend
2. Create customers and trips
3. Verify cost calculations
4. Test flight and hotel searches












