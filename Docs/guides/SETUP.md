# Setup Guide - Travel Cost Automation System

## Phase 1: Database Setup

### Option 1: Using Docker (Recommended)

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

### Option 2: Manual PostgreSQL Setup

If you prefer to use a local PostgreSQL installation:

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

   Or use the setup script:
   ```bash
   ./scripts/setup-database.sh
   ```

### Configure Environment Variables

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

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001

# APIs (get these later)
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
GOOGLE_MAPS_API_KEY=

# File paths
APPLUS_EXPORT_FOLDER=./data/exports
UPLOAD_FOLDER=./data/uploads
OUTPUT_FOLDER=./data/outputs
EOF
```

### Test Database Connection

```bash
cd backend
node src/utils/db-test.js
```

You should see:
```
✅ Database connected: { now: '2024-12-XX...' }
```

### Start the Development Server

```bash
cd backend
npm run dev
```

The server will start on http://localhost:3000

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

You should see:
```json
{"status":"ok","timestamp":"2024-12-XX..."}
```

## Next Steps

Once Phase 1 is complete, proceed to Phase 2: Customer Management as outlined in `Docs/IMPLEMENTATION_PLAN.md`.

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

### Permission Issues

If you get permission errors:
- Make sure the PostgreSQL user has proper permissions
- For Docker, the default user/password should work
- For local PostgreSQL, you may need to use `sudo` or configure user permissions

