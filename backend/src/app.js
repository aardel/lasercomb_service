const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:5173',
    'http://localhost:5174'
  ].filter(Boolean)
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      message: 'PostgreSQL database is not running. Please set up the database first.'
    });
  }
});

// Health check endpoint for API status monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: 'running',
      database: 'check_required'
    }
  });
});

// API Routes
const customerRoutes = require('./routes/customer.routes');
app.use('/api/customers', customerRoutes);

// Cost calculation routes
const costRoutes = require('./routes/cost.routes');
app.use('/api/costs', costRoutes);

// Trip routes
const tripRoutes = require('./routes/trip.routes');
app.use('/api/trips', tripRoutes);

// Places API routes (for autocomplete)
const placesRoutes = require('./routes/places.routes');
app.use('/api/places', placesRoutes);

// Test API Routes (for testing Google Maps integration)
const testApiRoutes = require('./routes/test-api.routes');
app.use('/api/test', testApiRoutes);

// Hotel routes
const hotelRoutes = require('./routes/hotel.routes');
app.use('/api/hotels', hotelRoutes);

// Flight routes
const flightRoutes = require('./routes/flight.routes');
app.use('/api/flights', flightRoutes);

// Car rental routes
const carRentalRoutes = require('./routes/car-rental.routes');
app.use('/api/car-rentals', carRentalRoutes);

// Toll calculation routes
const tollRoutes = require('./routes/toll.routes');
app.use('/api/tolls', tollRoutes);

// Distance routes
const distanceRoutes = require('./routes/distance.routes');
app.use('/api/distance', distanceRoutes);

// Technician routes
const technicianRoutes = require('./routes/technician.routes');
app.use('/api/technicians', technicianRoutes);

// Rates routes (country travel rates management)
const ratesRoutes = require('./routes/rates.routes');
app.use('/api/rates', ratesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception detected:');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  // NEVER exit in development - log and continue
  // This prevents the server from crashing
  console.error('⚠️ Server will continue running despite uncaught exception');
  // Only exit in production for critical errors
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️ Exiting in production mode due to uncaught exception');
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection detected:');
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Error message:', reason.message);
    console.error('Stack trace:', reason.stack);
  }
  console.error('Promise:', promise);
  // NEVER exit in development - log and continue
  // This prevents the server from crashing
  console.error('⚠️ Server will continue running despite unhandled rejection');
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all IPv4 interfaces to ensure browser compatibility
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`   Accessible at: http://localhost:${PORT}`);
});

module.exports = app;

