# Quick Start Guide

## 🚀 Servers Running

### Backend Server
- **URL**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Base**: http://localhost:3000/api

### Frontend Server
- **URL**: http://localhost:3001
- **Open in browser**: http://localhost:3001

## 📋 Quick Test Workflow

### 1. Open Frontend
Open http://localhost:3001 in your browser

### 2. Create a Customer
1. Go to Customers page (home page)
2. Fill out the customer form:
   - Name: "Test Company"
   - Email: "test@example.com"
   - Phone: "+49 123 456 789"
   - City: "Hamburg"
   - Country: "Germany"
3. Click "Create Customer"
4. Customer should appear in the list on the right

### 3. Create a Trip
1. Click "New Trip" in navigation
2. Select the customer you just created
3. Fill in trip details:
   - Start Date: Choose a date/time
   - Job Type: "installation"
   - Work Hours: 6
4. Click "Preview Costs" to see calculation
5. Click "Create Trip" to save

### 4. View Trip Details
1. Go to "Trips" page
2. Click "View Details" on your trip
3. See complete cost breakdown

## 🎯 Available Pages

- **/** - Customers (create/manage customers)
- **/trips** - Trip List (view all trips)
- **/trips/new** - New Trip (create trip with cost preview)
- **/trips/:id** - Trip Details (full cost breakdown)

## ✅ What's Working

- ✅ Customer creation with geocoding
- ✅ Trip creation with automatic cost calculation
- ✅ Cost preview before saving
- ✅ Complete cost breakdown display
- ✅ Trip list with filters
- ✅ Navigation between pages

## 🔧 Troubleshooting

### Backend not responding?
```bash
cd backend
npm run dev
```

### Frontend not loading?
```bash
cd frontend
npm run dev
```

### API errors?
- Check backend is running on port 3000
- Check `.env` file has `GOOGLE_MAPS_API_KEY` set
- Check database is running (if using database features)

## 🎉 Ready to Use!

Both servers are running. Open http://localhost:3001 and start creating trips!


