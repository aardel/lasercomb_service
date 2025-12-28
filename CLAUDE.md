# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Travel Cost Automation System** - Automates travel quotation generation for a German engineering services company, reducing quotation creation time from 60 minutes to 3 minutes.

The system calculates travel costs for service engineers visiting customers across Europe and worldwide, using official German government travel rates (ARVVwV 2025), real-time flight prices (Amadeus API), and distance calculations (Google Maps API).

## Development Commands

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start development server (nodemon on port 3000)
npm start               # Start production server
npm test                # Run tests with Jest
node src/utils/db-test.js  # Test database connection
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start Vite dev server (port 3001)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Database Setup
```bash
createdb travel_costs                                           # Create database
psql -U postgres -d travel_costs -f database/schema.sql        # Apply schema
```

### Quick Start Both Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Or use the convenience script:
```bash
./restart.sh  # Restarts both backend and frontend
```

## Architecture

### Tech Stack
- **Backend**: Node.js 18+, Express 5.2, PostgreSQL 15+, CommonJS modules
- **Frontend**: React 19.2, Vite 7.3, React Router 7.11, ES modules
- **APIs**: Amadeus (flights), Google Maps (geocoding, distance, places), TollGuru (tolls), HERE Maps

### Backend Structure (`backend/src/`)

**Routes** (`routes/`):
- `customer.routes.js` - Customer CRUD operations
- `trip.routes.js` - Trip management (single and combined trips)
- `cost.routes.js` - Cost calculations (car and flight)
- `flight.routes.js` - Flight search (Amadeus API)
- `hotel.routes.js` - Hotel search (Amadeus API)
- `places.routes.js` - Google Places autocomplete and details
- `distance.routes.js` - Distance and route calculations
- `technician.routes.js` - Technician/engineer management
- `test-api.routes.js` - API testing endpoints

**Services** (business logic in `services/`):
- `cost-calculator.service.js` - Core cost calculation engine using official rates (car and flight)
- `customer.service.js` - Customer management with geocoding
- `trip.service.js` - Trip creation and management
- `flight.service.js` - Amadeus flight search integration
- `hotel.service.js` - Amadeus hotel search integration
- `car-rental.service.js` - Rental car search and pricing
- `distance.service.js` - Google Maps distance calculations and route optimization
- `airport.service.js` - Find nearest airport to coordinates
- `geocoding.service.js` - Address to coordinates conversion
- `places.service.js` - Google Places autocomplete and place details
- `rates.service.js` - Load and query travel rates from `TravelRates_2025.xml`
- `toll.service.js` - TollGuru toll cost calculations
- `technician.service.js` - Technician/engineer profile management
- `amadeus.client.js` - Amadeus API client singleton

**Models** (`models/`):
- `customer.model.js` - Customer database operations
- `trip.model.js` - Trip database operations

**Config**:
- `config/database.js` - PostgreSQL connection pool

### Frontend Structure (`frontend/src/`)

**Pages** (`pages/`):
- `TripWizardPage.jsx` - Main trip planning wizard (multi-customer, flight/car selection)
- `TripsPage.jsx` - Trip list and management
- `TripDetailsPage.jsx` - Detailed trip view with cost breakdown
- `SettingsPage.jsx` - Technician and system settings
- `CustomersPage.jsx` - Customer management (legacy, may be integrated into wizard)

**Components** (`components/`):
- `Navigation.jsx` - Main navigation bar
- `customers/` - Customer-related components (form, list)

**Services** (`services/`):
- `api.js` - Centralized API client for all backend endpoints
- `settingsStorage.js` - Local storage for technician settings
- `customerStorage.js` - Local storage for customer data

**Utils** (`utils/`):
- `airlineCodes.js` - Airline code to name mapping

### Database Schema

Key tables:
- `customers` - Customer data with geocoded locations and nearest airport
- `engineers` - Engineer profiles with skills and availability
- `trips` - Trip planning (single/combined/pending types)
- `trip_customers` - Many-to-many for combined trips
- `quotations` - Generated quotations with detailed cost breakdown
- `country_travel_rates` - Official German government rates (180+ countries)
- `company_custom_rates` - Company rate overrides
- `flight_searches` - Flight search result cache

See `database/schema.sql` for complete schema with triggers and views.

## Key Business Logic

### Travel Rates System
- **Source**: `Rates/TravelRates_2025.xml` contains official German government rates (ARVVwV 2025) for 180+ countries
- **Loading**: `rates.service.js` parses XML on initialization, caches rates in memory
- **Query**: Use country name (preferred) or ISO-3 country code, optional city name for city-specific rates
- **Company Overrides**: Higher rates for hotel (115€), mileage (0.88€/km), travel hours (98€/h), work hours (132€/h)
- **No Fallbacks**: Service throws clear errors if rate not found - do not add fallback values

### Cost Calculation (`cost-calculator.service.js`)
The main `calculateTripCost()` method calculates:
1. **Working time costs**: work_hours × 132€/hour
2. **Travel time costs**: travel_hours × 98€/hour
3. **Distance costs**: (road only) distance_km × 0.88€/km
4. **Daily allowances**: Based on trip duration (>8h = 14€, 24h = 28€ for Germany, varies by country)
5. **Hotel costs**: nights × hotel_rate (country-specific)
6. **Transportation**: Flight/taxi/parking/tolls

Returns detailed breakdown with all components.

### Travel Mode Selection
- Distance < 100km: Always road
- 100-300km: Compare flight vs road
- Distance > 300km or international: Prefer flight

### Flight Search Integration
- Uses Amadeus Flight Offers Search API
- Supports one-way and round-trip searches
- Multi-city itineraries for combined trips (up to 6 segments)
- Returns cheapest options with detailed pricing

### Distance Calculation
- Uses Google Maps Distance Matrix API for road distance/duration
- Haversine formula for flight distance estimation
- Caches results to minimize API calls

### Airport Detection
- Finds nearest IATA airport code to any coordinates
- Used for flight search origin/destination determination
- Hardcoded major European/US airports with lat/long coordinates

## Environment Variables

Required in `backend/.env`:
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=travel_costs
DATABASE_USER=aarondelia
DATABASE_PASSWORD=password

# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# APIs
GOOGLE_MAPS_API_KEY=<your_key>
AMADEUS_API_KEY=<your_key>
AMADEUS_API_SECRET=<your_secret>
TOLLGURU_API_KEY=<your_key>
HERE_API_KEY=<your_key>

# Optional: RapidAPI for real-time car rental pricing
# Without this, system uses market-researched price ranges
# Sign up at: https://rapidapi.com/hub
# Search for "car rental" APIs with free tiers
RAPIDAPI_KEY=<your_key_optional>
```

**Setting up RapidAPI for Car Rentals (Optional):**
1. Sign up at https://rapidapi.com (free account)
2. Search for "car rental" APIs
3. Choose one with a free tier (e.g., 100-500 requests/month)
4. Subscribe to free plan
5. Copy API key to `.env` as `RAPIDAPI_KEY`
6. Update `car-rental.service.js` line 153 with the actual API endpoint

**Without RapidAPI:**
- System uses market-researched price ranges (updated December 2024)
- Shows min-max ranges with verification warnings
- User must verify actual prices before finalizing quotation

**API Credentials**: Current `.env` contains live API keys - do not expose these publicly.

## Testing the System

### Health Checks
- `GET /health` - Server status
- `GET /health/db` - Database connection

### Test Workflow
1. Create customer: `POST /api/customers` (geocodes address automatically)
2. Calculate costs: `POST /api/costs/calculate` with origin/destination/hours
3. Create trip: `POST /api/trips` (auto-calculates costs)
4. Search flights: `POST /api/flights/search` with origin/destination/dates
5. Search hotels: `POST /api/hotels/search` with location/dates

### Test Files
Root directory contains several test scripts:
- `test_flight_search.js` - Test Amadeus one-way flight search
- `test_multi_stop.js` - Test multi-city flight search
- `debug_airports.js` - Debug airport detection

## Important Notes

### API Rate Limits & Data Sources
- **Amadeus Flights**: Free tier 2,000 searches/month (⚠️ NO MOCK FALLBACK - Returns error if API fails)
- **Google Maps**: $200/month credit (~40,000 requests)
- **RapidAPI Car Rentals**: Optional - Free tier 100-500 requests/month
- Use caching to minimize API calls

### NO MOCK DATA Policy
**CRITICAL:** This application does NOT use mock/fake data for pricing. All data must come from real APIs or verified sources to prevent financial losses from incorrect quotations.

**Current Data Sources:**
1. **Flights:** 100% real Amadeus API data only (no fallback)
2. **Hotels:** Real Google Places API data
3. **Rental Cars:** Hybrid approach:
   - **Primary:** RapidAPI free tier (if configured)
   - **Fallback:** Market-researched price RANGES (updated monthly)
   - **Display:** Shows min-max ranges with verification warnings
   - **Requirement:** User must verify prices before finalizing quotation

### Data Sources
- Travel rates XML must be updated annually (January)
- No database seeding of rates - rates loaded from XML at runtime
- Airport codes hardcoded in `airport.service.js` (consider moving to database)

### Error Handling
- Rates service throws clear errors when country/city not found
- Do not add fallback rates - missing rates indicate data issue
- Flight API errors are propagated with Amadeus error details

### CORS Configuration
Backend allows multiple frontend ports for development flexibility (3001, 3002, 3003, 5173, 5174).

### Database Connection
Uses PostgreSQL connection pool. Always use `pool.query()` for queries, never maintain open connections. Connection is tested on startup at `/health/db`.

## Current Development Status

**Completed Phases**:
- Phase 1-5: Database setup, customer management, Google Maps integration, cost calculation engine, trip planning module
- Phase 6: Advanced Trip Wizard with flight, hotel, and rental car integration

**Current Features**:
- ✅ Multi-customer trip planning (up to 8 customers)
- ✅ Flight search and selection (Amadeus API)
- ✅ Hotel search and selection
- ✅ Rental car search and pricing
- ✅ Real-time cost preview with detailed breakdowns
- ✅ Route optimization for multi-customer trips
- ✅ Interactive map visualization
- ✅ Technician/engineer management
- ✅ Airport selection and nearest airport detection
- ✅ Travel mode selection per segment (fly/drive)

**Next Phases**:
- Phase 7: PDF quotation generation
- Phase 8: Advanced reporting and analytics
- Phase 9: APplus ERP integration

See `PROJECT_STATUS.md` and phase completion docs for detailed status.
