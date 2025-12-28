# Testing Cost Calculation Engine

## Prerequisites

1. ✅ Database with rates data (from `database/schema.sql`)
2. ✅ At least one customer in the database
3. ✅ Backend server running

## Test Endpoints

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

### 3. Compare Travel Options

**Endpoint:** `POST /api/costs/compare-options`

**Body:**
```json
{
  "origin": {"lat": 48.1351, "lng": 11.5820},
  "destination": {"lat": 53.5511, "lng": 9.9937},
  "country": "DEU"
}
```

## Step-by-Step Test

### Step 1: Create a Test Customer

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

### Step 2: Get Travel Rates

```bash
curl "http://localhost:3000/api/costs/rates?country=DEU"
```

### Step 3: Calculate Costs

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

## Cost Breakdown Explanation

- **arbeitszeit_total**: Working time cost (hours × 132€/h)
- **reisezeit_total**: Travel time cost (hours × 98€/h)
- **entfernung_total**: Distance cost (km × 0.88€/km) - only for road
- **tagesspesen_24h_total**: Full day allowance (24+ hours)
- **tagesspesen_8h_total**: Partial day allowance (>8h but <24h)
- **hotel_total**: Hotel costs (if overnight required)
- **komplette_rk**: Complete travel costs (all travel-related)
- **total_quotation**: Total quotation (travel + work)

## Troubleshooting

### Error: "No travel rates found"
- Make sure database has rates data
- Run: `psql -U postgres -d travel_costs -f database/schema.sql`

### Error: "Customer not found"
- Create a customer first using `/api/customers` endpoint

### Error: "Distance calculation failed"
- Check Google Maps API key is set
- Verify API key is working with `/api/test/distance-address`


