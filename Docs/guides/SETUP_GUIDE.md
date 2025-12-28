# Setup Guide - Travel Cost Automation System

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn
- Google Maps API key (for geocoding and distance calculations)
- Amadeus API credentials (for flight search)

## Installation Steps

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Database Setup

#### Option 1: Using Docker (Recommended)

The easiest way to set up the database is using Docker Compose:

```bash
# Start PostgreSQL database
docker-compose up -d

# Wait a few seconds for the database to initialize
sleep 5

# Verify the database is running
docker ps
```

The database will be available at:
- **Host**: localhost
- **Port**: 5432
- **Database**: travel_costs
- **User**: postgres
- **Password**: password

#### Option 2: Manual PostgreSQL Setup

1. **Install PostgreSQL 15+** (if not already installed)
   - macOS: `brew install postgresql@15`
   - Linux: `sudo apt-get install postgresql-15`
   - Windows: Download from https://www.postgresql.org/download/

2. **Create the database**:
   ```bash
   createdb travel_costs
   ```

3. **Apply the schema**:
   ```bash
   psql -U postgres -d travel_costs -f database/schema.sql
   ```

### 3. Environment Configuration

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << EOF
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=travel_costs
DATABASE_USER=postgres
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
RAPIDAPI_KEY=<your_key_optional>
EOF
```

### 4. Test Database Connection

```bash
cd backend
node src/utils/db-test.js
```

You should see:
```
✅ Database connected: { now: '2024-12-XX...' }
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The servers will run on:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001

### 6. Verify Installation

**Test Backend Health:**
```bash
curl http://localhost:3000/health
```

**Test Database Connection:**
```bash
curl http://localhost:3000/health/db
```

**Open Frontend:**
Open http://localhost:3001 in your browser

## Quick Test Workflow

### 1. Create a Customer
1. Go to Customers page (home page at http://localhost:3001)
2. Fill out the customer form:
   - Name: "Test Company"
   - Email: "test@example.com"
   - Phone: "+49 123 456 789"
   - City: "Hamburg"
   - Country: "Germany"
3. Click "Create Customer"
4. Customer should appear in the list on the right

### 2. Create a Trip
1. Click "New Trip" in navigation
2. Select the customer you just created
3. Fill in trip details:
   - Start Date: Choose a date/time
   - Job Type: "installation"
   - Work Hours: 6
4. Click "Preview Costs" to see calculation
5. Click "Create Trip" to save

### 3. View Trip Details
1. Go to "Trips" page
2. Click "View Details" on your trip
3. See complete cost breakdown

## Available Pages

- **/** - Customers (create/manage customers)
- **/trips** - Trip List (view all trips)
- **/trips/new** - New Trip (create trip with cost preview)
- **/trips/:id** - Trip Details (full cost breakdown)

## Troubleshooting

### Database Connection Issues

1. **Check if PostgreSQL is running**:
   ```bash
   # Docker
   docker ps | grep travel-costs-db
   
   # Local PostgreSQL
   pg_isready
   ```

2. **Verify database exists**:
   ```bash
   psql -U postgres -l | grep travel_costs
   ```

3. **Check environment variables**:
   ```bash
   cd backend
   cat .env
   ```

### Port Already in Use

If port 3000 is already in use, change it in `backend/.env`:
```
PORT=3001
```

### API Errors

- Check backend is running on port 3000
- Check `.env` file has `GOOGLE_MAPS_API_KEY` set
- Check database is running (if using database features)
- Verify API keys are valid in respective developer consoles

### Permission Issues

If you get permission errors:
- Make sure the PostgreSQL user has proper permissions
- For Docker, the default user/password should work
- For local PostgreSQL, you may need to use `sudo` or configure user permissions

## Next Steps

Once setup is complete:
1. Configure API keys (see `docs/api/API_SETUP.md`)
2. Review the project documentation in `docs/`
3. Follow the implementation plan in `docs/IMPLEMENTATION_PLAN.md`

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

### Quick Start Both Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```












