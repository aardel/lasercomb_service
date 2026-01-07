# Trip Cost Application - Deployment Guide

This guide explains how to deploy the Trip Cost application to a production server.

## Architecture Overview

- **Backend**: Node.js 18+ with Express, runs on port 3000
- **Frontend**: React + Vite, builds to static files
- **Database**: PostgreSQL 15 (via Docker)
- **Process Manager**: PM2 (recommended for backend)
- **Web Server**: Nginx (recommended for frontend static files)

## Prerequisites

### Server Requirements
- Node.js 18 or higher
- Docker and Docker Compose (for PostgreSQL)
- Git
- PM2 (install globally: `npm install -g pm2`)
- Nginx (optional but recommended)

### API Keys Required
The following API keys must be configured in the backend `.env` file:
- **GOOGLE_MAPS_API_KEY**: For geocoding and distance calculations
- **AMADEUS_API_KEY** & **AMADEUS_API_SECRET**: For flight search
- **TOLLGURU_API_KEY**: For toll calculations
- **HERE_API_KEY**: For routing
- **RAPIDAPI_KEY**: For car rental data
- **SERPAPI_KEY** or **SERPER_API_KEY**: For web search
- **GROQ_API_KEY**: For AI features
- **OPENROUTESERVICE_API_KEY**: Alternative to Google Maps

See `.env.example` files for details.

## Deployment Steps

### 1. Clone Repository

```bash
# SSH into your server first
cd /path/to/your/projects
git clone <your-repo-url> trip-cost
cd trip-cost
```

### 2. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Important `.env` configurations for server:**
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BACKEND_URL=http://YOUR_SERVER_IP:3000
FRONTEND_URL=http://YOUR_SERVER_IP:3001  # Or where frontend is served

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=travel_costs
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

# Add all your API keys here...
```

### 3. Set Up PostgreSQL Database

```bash
# Start PostgreSQL using Docker Compose
cd /path/to/trip-cost
docker-compose up -d

# Wait for database to be ready
sleep 10

# Run migrations (if you have them)
# cd backend && npm run migrate
```

**Database Setup Notes:**
- The `docker-compose.yml` file should define the PostgreSQL service
- Default credentials are in backend `.env`
- Ensure the database schema/tables are created (migrations or manual SQL)
- Check database connection: `curl http://YOUR_SERVER_IP:3000/health/db`

### 4. Set Up Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Frontend `.env` configuration:**
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_API_URL=http://YOUR_SERVER_IP:3000
```

**Build the frontend:**
```bash
npm run build
```

This creates optimized static files in `frontend/dist/` directory.

### 5. Start Backend with PM2

```bash
cd /path/to/trip-cost/backend

# Start with PM2
pm2 start src/app.js --name trip-cost-backend

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

**Useful PM2 commands:**
```bash
pm2 status              # Check status
pm2 logs trip-cost-backend  # View logs
pm2 restart trip-cost-backend  # Restart
pm2 stop trip-cost-backend     # Stop
```

### 6. Serve Frontend (Option A: Nginx)

**Install Nginx** (if not already installed):
```bash
sudo apt update
sudo apt install nginx
```

**Configure Nginx** (`/etc/nginx/sites-available/trip-cost`):
```nginx
server {
    listen 3001;
    server_name YOUR_SERVER_IP;

    root /path/to/trip-cost/frontend/dist;
    index index.html;

    # SPA routing - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/trip-cost /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 6. Serve Frontend (Option B: Backend Static Files)

The backend already has `express.static('public')` configured. You can:

1. Copy frontend build to backend public directory:
```bash
mkdir -p /path/to/trip-cost/backend/public
cp -r /path/to/trip-cost/frontend/dist/* /path/to/trip-cost/backend/public/
```

2. Access frontend at `http://YOUR_SERVER_IP:3000`

### 7. Verify Deployment

**Check backend health:**
```bash
curl http://YOUR_SERVER_IP:3000/health
curl http://YOUR_SERVER_IP:3000/health/db
```

**Check frontend:**
```bash
# Option A (Nginx on port 3001):
curl http://YOUR_SERVER_IP:3001

# Option B (Backend serves on port 3000):
curl http://YOUR_SERVER_IP:3000
```

**Access application:**
- Open browser: `http://YOUR_SERVER_IP:3001` (or :3000 if using Option B)
- Test QR code generation for receipt scanning
- Verify mobile phone can access the application

## Updating the Application

When you push changes to GitHub, update the server:

```bash
# SSH into server
cd /path/to/trip-cost

# Pull latest changes
git pull origin main

# Update backend
cd backend
npm install  # Only if package.json changed
pm2 restart trip-cost-backend

# Update frontend
cd ../frontend
npm install  # Only if package.json changed
npm run build

# If using Nginx:
# Files are automatically updated in dist/

# If using backend static serving:
cp -r dist/* ../backend/public/
```

## Firewall Configuration

Ensure your firewall allows traffic on required ports:

```bash
# Backend API
sudo ufw allow 3000/tcp

# Frontend (if using Nginx on 3001)
sudo ufw allow 3001/tcp

# PostgreSQL (only if accessing externally - not recommended)
# sudo ufw allow 5432/tcp

# SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Security Considerations

### Production Hardening (Optional but Recommended)

1. **Use environment-specific .env files**
   - Never commit `.env` with real API keys
   - Use secrets management (e.g., HashiCorp Vault, AWS Secrets Manager)

2. **Set up SSL/TLS with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

3. **Configure rate limiting** in backend
4. **Add authentication/authorization** for sensitive endpoints
5. **Regular backups** of PostgreSQL database
6. **Monitor logs** with PM2 or external service
7. **Update dependencies** regularly for security patches

### CORS Configuration

The backend CORS is configured in [backend/src/app.js](backend/src/app.js):
- Allows `process.env.FRONTEND_URL` (set in .env)
- Includes localhost URLs for development
- Update CORS origins if deploying to a domain

## Troubleshooting

### Backend won't start
```bash
# Check PM2 logs
pm2 logs trip-cost-backend

# Common issues:
# - PostgreSQL not running: docker-compose up -d
# - Port 3000 in use: sudo lsof -i :3000
# - Missing .env file: cp .env.example .env
```

### Database connection errors
```bash
# Check PostgreSQL container
docker ps
docker logs <postgres-container-id>

# Test database connection
psql -h localhost -p 5432 -U your_db_user -d travel_costs
```

### Frontend not loading
```bash
# If using Nginx:
sudo nginx -t  # Test config
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# If using backend static serving:
# Ensure files are in backend/public/
ls -la /path/to/trip-cost/backend/public/
```

### Mobile QR code not working
- Ensure BACKEND_URL in backend .env points to server IP (not localhost)
- Check firewall allows port 3000
- Verify mobile phone can reach server IP (ping test)
- Check backend logs: `pm2 logs trip-cost-backend`

### Receipt uploads failing
```bash
# Check uploads directory exists and has write permissions
mkdir -p /path/to/trip-cost/backend/uploads/receipts
chmod 755 /path/to/trip-cost/backend/uploads/receipts
```

## Development Workflow

After deployment, continue development on your desktop:

1. **Make changes locally** (in VS Code/Cursor)
2. **Test locally**
3. **Commit and push to GitHub**
```bash
git add .
git commit -m "Your changes"
git push origin main
```
4. **Update server** (SSH into server)
```bash
cd /path/to/trip-cost
git pull origin main
cd backend && pm2 restart trip-cost-backend
cd ../frontend && npm run build
```

## Database Migrations

If you modify the database schema:

1. Create SQL migration files (recommended naming: `001_initial_schema.sql`, `002_add_receipts_table.sql`, etc.)
2. Store in `backend/migrations/` directory
3. Apply manually or create a migration script
4. Document schema changes in this file

## Performance Optimization (Optional)

1. **Enable Nginx caching** for static assets
2. **Compress responses** with gzip
3. **Use CDN** for frontend static files
4. **Optimize images** in uploads directory
5. **Database indexing** for frequently queried columns
6. **Enable PM2 cluster mode** for multi-core servers:
```bash
pm2 start src/app.js -i max --name trip-cost-backend
```

## Monitoring (Optional)

1. **PM2 Monitoring**:
```bash
pm2 install pm2-logrotate  # Rotate logs
pm2 monit  # Live monitoring
```

2. **Database monitoring**:
```bash
# Check database size
docker exec <postgres-container> psql -U your_db_user -d travel_costs -c "SELECT pg_size_pretty(pg_database_size('travel_costs'));"
```

3. **Disk space monitoring**:
```bash
df -h  # Check available space
du -sh /path/to/trip-cost/backend/uploads  # Check uploads size
```

## Support

For issues or questions:
- Check logs: `pm2 logs trip-cost-backend`
- Check database health: `curl http://YOUR_SERVER_IP:3000/health/db`
- Review this deployment guide
- Check application logs in backend console

---

**Last Updated**: 2026-01-07
**Application Version**: 1.0.0
