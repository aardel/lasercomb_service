# Implementation Plan - Step by Step Guide

## 🎯 Purpose
This document provides a detailed, step-by-step implementation guide for building the Travel Cost Automation System. Follow these steps in order for the most efficient development process.

---

## Phase 1: Project Setup & Database Foundation

### Week 1: Initial Setup

#### Step 1.1: Project Initialization (Day 1)
```bash
# Create project structure
mkdir travel-cost-automation
cd travel-cost-automation
mkdir -p backend/src/{config,models,routes,services,utils,middleware}
mkdir -p backend/tests
mkdir -p frontend/src/{components,pages,services,utils}
mkdir -p database/{migrations,seeds}
mkdir -p docs
mkdir -p scripts

# Initialize backend
cd backend
npm init -y
npm install express pg dotenv cors helmet morgan
npm install --save-dev nodemon jest supertest

# Initialize frontend
cd ../frontend
npx create-react-app .
npm install axios react-router-dom

# Return to root
cd ..
```

**Deliverable**: Project structure created, dependencies installed

#### Step 1.2: Database Setup (Day 1-2)

1. Install PostgreSQL locally or use Docker:
```bash
# Using Docker
docker run --name travel-costs-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=travel_costs \
  -p 5432:5432 \
  -d postgres:15
```

2. Create database schema:
```bash
# Copy schema from docs
cp docs/DATABASE_SCHEMA.sql database/schema.sql

# Apply schema
psql -U postgres -d travel_costs -f database/schema.sql
```

3. Set up database connection in backend:

File: `backend/src/config/database.js`
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'travel_costs',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

module.exports = pool;
```

4. Test database connection:

File: `backend/src/utils/db-test.js`
```javascript
const pool = require('../config/database');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
```

Run: `node backend/src/utils/db-test.js`

**Deliverable**: Database created, schema applied, connection tested

#### Step 1.3: Environment Configuration (Day 2)

Create `.env.example` in backend:
```env
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
```

Copy to `.env` and fill in actual values.

**Deliverable**: Environment configuration complete

#### Step 1.4: Basic Express Server (Day 2)

File: `backend/src/app.js`
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001'
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes will be added here

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
```

File: `backend/package.json` (add scripts):
```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest"
  }
}
```

Run: `npm run dev`

**Deliverable**: Basic Express server running on port 3000

---

## Phase 2: Customer Management

### Week 1-2: Customer Module

#### Step 2.1: Customer Model (Day 3)

File: `backend/src/models/customer.model.js`
```javascript
const pool = require('../config/database');

class Customer {
  // Create customer
  static async create(customerData) {
    const query = `
      INSERT INTO customers (
        external_id, name, contact_name, email, phone, mobile,
        street_address, city, postal_code, country,
        latitude, longitude, nearest_airport_code,
        cost_share_percentage, data_source, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    
    const values = [
      customerData.external_id,
      customerData.name,
      customerData.contact_name,
      customerData.email,
      customerData.phone,
      customerData.mobile,
      customerData.street_address,
      customerData.city,
      customerData.postal_code,
      customerData.country,
      customerData.latitude,
      customerData.longitude,
      customerData.nearest_airport_code,
      customerData.cost_share_percentage || 0,
      customerData.data_source || 'manual_entry',
      customerData.notes
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Get all customers
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM customers WHERE is_active = true';
    const values = [];
    let paramCount = 1;
    
    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }
    
    if (filters.data_source) {
      query += ` AND data_source = $${paramCount}`;
      values.push(filters.data_source);
      paramCount++;
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, values);
    return result.rows;
  }
  
  // Get by ID
  static async findById(id) {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
  
  // Update customer
  static async update(id, customerData) {
    const query = `
      UPDATE customers SET
        name = COALESCE($2, name),
        contact_name = COALESCE($3, contact_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        city = COALESCE($6, city),
        country = COALESCE($7, country),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      customerData.name,
      customerData.contact_name,
      customerData.email,
      customerData.phone,
      customerData.city,
      customerData.country
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Soft delete
  static async delete(id) {
    const query = 'UPDATE customers SET is_active = false WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = Customer;
```

**Deliverable**: Customer model with CRUD operations

#### Step 2.2: Customer Service (Day 3-4)

File: `backend/src/services/customer.service.js`
```javascript
const Customer = require('../models/customer.model');
const { geocodeAddress } = require('../services/geocoding.service');
const { findNearestAirport } = require('../services/airport.service');

class CustomerService {
  // Create customer with geocoding
  async createCustomer(customerData) {
    try {
      // Geocode address if provided
      if (customerData.city && customerData.country) {
        const coords = await geocodeAddress(
          customerData.street_address,
          customerData.city,
          customerData.country
        );
        
        customerData.latitude = coords.lat;
        customerData.longitude = coords.lng;
        
        // Find nearest airport
        const airport = await findNearestAirport(coords.lat, coords.lng);
        customerData.nearest_airport_code = airport.code;
      }
      
      // Create customer
      const customer = await Customer.create(customerData);
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
  
  // Get all customers
  async getAllCustomers(filters) {
    return await Customer.findAll(filters);
  }
  
  // Get customer by ID
  async getCustomerById(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }
  
  // Update customer
  async updateCustomer(id, customerData) {
    return await Customer.update(id, customerData);
  }
  
  // Delete customer
  async deleteCustomer(id) {
    await Customer.delete(id);
  }
}

module.exports = new CustomerService();
```

**Deliverable**: Customer service with business logic

#### Step 2.3: Customer Routes (Day 4)

File: `backend/src/routes/customer.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const customerService = require('../services/customer.service');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      data_source: req.query.data_source
    };
    const customers = await customerService.getAllCustomers(filters);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(
      req.params.id,
      req.body
    );
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

Add to `app.js`:
```javascript
const customerRoutes = require('./routes/customer.routes');
app.use('/api/customers', customerRoutes);
```

**Deliverable**: Customer API endpoints functional

#### Step 2.4: Customer Frontend Component (Day 5)

File: `frontend/src/components/customers/CustomerForm.jsx`
```javascript
import React, { useState } from 'react';
import axios from 'axios';

function CustomerForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contact_name: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: 'DE',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Valid email is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/api/customers',
        formData
      );
      alert(`Customer ${response.data.name} created successfully!`);
      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Add New Customer</h2>
      
      <div>
        <label className="block text-sm font-medium">Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm"
        />
        {errors.name && <span className="text-red-500 text-sm">{errors.name}</span>}
      </div>
      
      <div>
        <label className="block text-sm font-medium">Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm"
        />
        {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
      </div>
      
      <div>
        <label className="block text-sm font-medium">Phone *</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm"
        />
        {errors.phone && <span className="text-red-500 text-sm">{errors.phone}</span>}
      </div>
      
      <div>
        <label className="block text-sm font-medium">City *</label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleChange}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm"
        />
        {errors.city && <span className="text-red-500 text-sm">{errors.city}</span>}
      </div>
      
      <div>
        <label className="block text-sm font-medium">Country *</label>
        <select
          name="country"
          value={formData.country}
          onChange={handleChange}
          className="mt-1 block w-full rounded border-gray-300 shadow-sm"
        >
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="GB">United Kingdom</option>
          <option value="US">United States</option>
        </select>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Customer'}
      </button>
    </form>
  );
}

export default CustomerForm;
```

**Deliverable**: Customer entry form working

---

## Phase 3: API Integrations

### Week 3: External APIs

#### Step 3.1: Google Maps Integration (Day 6-7)

1. Get API key:
   - Go to https://console.cloud.google.com/
   - Create project
   - Enable "Distance Matrix API" and "Geocoding API"
   - Create API key
   - Add to `.env`: `GOOGLE_MAPS_API_KEY=your_key_here`

2. Create Geocoding Service:

File: `backend/src/services/geocoding.service.js`
```javascript
const axios = require('axios');

async function geocodeAddress(street, city, country) {
  const address = `${street}, ${city}, ${country}`;
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  try {
    const response = await axios.get(url, {
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.results.length === 0) {
      throw new Error('Address not found');
    }
    
    const location = response.data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
      formatted_address: response.data.results[0].formatted_address
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

module.exports = { geocodeAddress };
```

3. Create Distance Service:

File: `backend/src/services/distance.service.js`
```javascript
const axios = require('axios');

async function calculateDistance(origin, destination) {
  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  
  try {
    const response = await axios.get(url, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        units: 'metric',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error('Route not found');
    }
    
    return {
      distance_km: element.distance.value / 1000,
      duration_minutes: element.duration.value / 60,
      distance_text: element.distance.text,
      duration_text: element.duration.text
    };
  } catch (error) {
    console.error('Distance calculation error:', error);
    throw error;
  }
}

module.exports = { calculateDistance };
```

**Deliverable**: Google Maps integration working

#### Step 3.2: Amadeus Flight Search (Day 8-9)

1. Get API credentials:
   - Go to https://developers.amadeus.com/
   - Sign up for free account
   - Create app
   - Copy API Key and API Secret
   - Add to `.env`:
     ```
     AMADEUS_API_KEY=your_key
     AMADEUS_API_SECRET=your_secret
     ```

2. Create Flight Search Service:

File: `backend/src/services/flight-search.service.js`
```javascript
const axios = require('axios');

class FlightSearchService {
  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }
  
  // Get access token
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    
    try {
      const response = await axios.post(
        'https://api.amadeus.com/v1/security/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }
  
  // Search flights
  async searchFlights(params) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        'https://api.amadeus.com/v2/shopping/flight-offers',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            originLocationCode: params.origin,
            destinationLocationCode: params.destination,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            adults: params.adults || 1,
            currencyCode: 'EUR',
            max: 5
          }
        }
      );
      
      // Process and simplify results
      const flights = response.data.data.map(offer => ({
        id: offer.id,
        price: parseFloat(offer.price.total),
        currency: offer.price.currency,
        outbound: {
          departure: offer.itineraries[0].segments[0].departure.at,
          arrival: offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1].arrival.at,
          duration: offer.itineraries[0].duration,
          stops: offer.itineraries[0].segments.length - 1
        },
        return: offer.itineraries[1] ? {
          departure: offer.itineraries[1].segments[0].departure.at,
          arrival: offer.itineraries[1].segments[offer.itineraries[1].segments.length - 1].arrival.at,
          duration: offer.itineraries[1].duration,
          stops: offer.itineraries[1].segments.length - 1
        } : null
      }));
      
      return flights;
    } catch (error) {
      console.error('Flight search error:', error.response?.data || error);
      throw error;
    }
  }
}

module.exports = new FlightSearchService();
```

**Deliverable**: Flight search working

---

## Phase 4: Cost Calculation Engine

### Week 4: Calculation Logic

#### Step 4.1: Government Rates Database (Day 10)

1. Create seed file:

File: `database/seeds/government_rates_2025.sql`
```sql
-- Germany
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('DEU', 'Germany', NULL, 14.00, 28.00, 20.00, '2025-01-01', 'ARVVwV 2025'),
('FRA', 'France', NULL, 42.00, 42.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('FRA', 'France', 'Paris', 48.00, 48.00, 159.00, '2025-01-01', 'ARVVwV 2025'),
('GBR', 'United Kingdom', NULL, 42.00, 42.00, 170.00, '2025-01-01', 'ARVVwV 2025'),
('GBR', 'United Kingdom', 'London', 47.00, 47.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', NULL, 51.00, 51.00, 246.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'New York', 59.00, 59.00, 387.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'Washington', 59.00, 59.00, 306.00, '2025-01-01', 'ARVVwV 2025');

-- Add company custom rates
INSERT INTO company_custom_rates (country_code, city_name, custom_hotel_rate, custom_mileage_rate, custom_travel_hour_rate, custom_work_hour_rate, notes)
VALUES ('DEU', NULL, 115.00, 0.88, 98.00, 132.00, 'Company rates for Germany', true);
```

Load: `psql -U postgres -d travel_costs -f database/seeds/government_rates_2025.sql`

**Deliverable**: Rates database populated

#### Step 4.2: Cost Calculator Service (Day 11-12)

File: `backend/src/services/cost-calculator.service.js`
```javascript
const pool = require('../config/database');
const { calculateDistance } = require('./distance.service');
const flightSearchService = require('./flight-search.service');

class CostCalculatorService {
  // Get travel rates for country
  async getTravelRates(countryCode, cityName = null) {
    // Get official rates
    const officialQuery = `
      SELECT * FROM country_travel_rates
      WHERE country_code = $1
      AND (city_name = $2 OR city_name IS NULL)
      AND effective_from <= CURRENT_DATE
      AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
      ORDER BY city_name NULLS LAST
      LIMIT 1
    `;
    const officialResult = await pool.query(officialQuery, [countryCode, cityName]);
    
    // Get custom rates
    const customQuery = `
      SELECT * FROM company_custom_rates
      WHERE country_code = $1
      AND (city_name = $2 OR city_name IS NULL)
      AND active = true
      ORDER BY city_name NULLS LAST
      LIMIT 1
    `;
    const customResult = await pool.query(customQuery, [countryCode, cityName]);
    
    const official = officialResult.rows[0];
    const custom = customResult.rows[0];
    
    return {
      daily_allowance_8h: official.daily_allowance_8h,
      daily_allowance_24h: official.daily_allowance_24h,
      hotel_rate: custom?.custom_hotel_rate || official.hotel_rate_max,
      mileage_rate: custom?.custom_mileage_rate || 0.30,
      travel_hour_rate: custom?.custom_travel_hour_rate || 98,
      work_hour_rate: custom?.custom_work_hour_rate || 132
    };
  }
  
  // Calculate all costs for a trip
  async calculateTripCosts(tripData) {
    const {
      engineer_location,
      customer_location,
      customer_country,
      customer_city,
      work_hours,
      date
    } = tripData;
    
    // 1. Get rates
    const rates = await this.getTravelRates(customer_country, customer_city);
    
    // 2. Calculate distance
    const distance = await calculateDistance(engineer_location, customer_location);
    
    // 3. Determine if flight needed
    const needsFlight = distance.distance_km > 300 || customer_country !== 'DEU';
    
    // 4. Get travel options
    let selectedOption;
    
    if (needsFlight) {
      // Search flights
      const flights = await flightSearchService.searchFlights({
        origin: 'MUC', // This should come from engineer data
        destination: 'HAM', // This should come from customer data
        departureDate: date,
        returnDate: date
      });
      
      selectedOption = {
        type: 'flight',
        price: flights[0].price,
        travel_hours: 9, // Calculate from flight times
        taxi_costs: 80,
        parking_costs: 50
      };
    } else {
      // Road option
      selectedOption = {
        type: 'road',
        travel_hours: distance.duration_minutes / 60,
        distance_km: distance.distance_km,
        fuel_costs: (distance.distance_km / 100) * 7 * 1.80,
        toll_costs: 25
      };
    }
    
    // 5. Calculate trip duration
    const total_hours = selectedOption.travel_hours + work_hours;
    
    // 6. Calculate all costs
    const costs = {
      // Working time
      arbeitszeit_hours: work_hours,
      arbeitszeit_rate: rates.work_hour_rate,
      arbeitszeit_total: work_hours * rates.work_hour_rate,
      
      // Travel time
      reisezeit_hours: selectedOption.travel_hours,
      reisezeit_rate: rates.travel_hour_rate,
      reisezeit_total: selectedOption.travel_hours * rates.travel_hour_rate,
      
      // Distance
      entfernung_km: selectedOption.type === 'road' ? selectedOption.distance_km : 0,
      entfernung_rate: rates.mileage_rate,
      entfernung_total: selectedOption.type === 'road' ? 
        selectedOption.distance_km * rates.mileage_rate : 0,
      
      // Daily allowances
      tagesspesen_24h_days: Math.floor(total_hours / 24),
      tagesspesen_24h_rate: rates.daily_allowance_24h,
      tagesspesen_24h_total: Math.floor(total_hours / 24) * rates.daily_allowance_24h,
      
      tagesspesen_8h_days: (total_hours > 8 && total_hours < 24) ? 1 : 
        (total_hours % 24 > 8 ? 1 : 0),
      tagesspesen_8h_rate: rates.daily_allowance_8h,
      tagesspesen_8h_total: ((total_hours > 8 && total_hours < 24) ? 1 : 
        (total_hours % 24 > 8 ? 1 : 0)) * rates.daily_allowance_8h,
      
      // Hotel
      hotel_nights: total_hours > 18 ? Math.ceil((total_hours - 8) / 24) : 0,
      hotel_rate: rates.hotel_rate,
      hotel_total: (total_hours > 18 ? Math.ceil((total_hours - 8) / 24) : 0) * 
        rates.hotel_rate,
      
      // Transportation
      flight_national: selectedOption.type === 'flight' ? selectedOption.price : 0,
      taxi: selectedOption.taxi_costs || 0,
      parken: selectedOption.parking_costs || 0,
      treibstoff: selectedOption.fuel_costs || 0,
      maut: selectedOption.toll_costs || 0
    };
    
    // Calculate total
    costs.komplette_rk = 
      costs.reisezeit_total +
      costs.entfernung_total +
      costs.tagesspesen_24h_total +
      costs.tagesspesen_8h_total +
      costs.hotel_total +
      costs.flight_national +
      costs.taxi +
      costs.parken +
      costs.treibstoff +
      costs.maut;
    
    costs.total_quotation = costs.komplette_rk + costs.arbeitszeit_total;
    
    return costs;
  }
}

module.exports = new CostCalculatorService();
```

**Deliverable**: Cost calculation engine working

---

## Checkpoint: Week 4 End

At this point you should have:
- ✅ Database set up and running
- ✅ Customer management working (CRUD)
- ✅ Google Maps integration (geocoding, distance)
- ✅ Amadeus flight search working
- ✅ Cost calculation engine functional
- ✅ Basic frontend for customer entry

**Test the complete flow:**
1. Add a customer
2. Calculate costs for a trip to that customer
3. Verify all cost components are calculated

---

## Phase 5-8: Continue Implementation

Due to length constraints, the remaining phases follow the same pattern:

### Phase 5: Engineer Management (Week 5)
- Create engineer model, service, routes
- Add availability tracking
- Build engineer assignment logic

### Phase 6: Trip Planning (Week 6-7)
- Create trip model for 3 types
- Implement route optimization
- Add cost splitting for combined trips

### Phase 7: Quotation Generation (Week 8)
- Design PDF template
- Implement auto-fill logic
- Add download/email functionality

### Phase 8: Testing & Deployment (Week 9-10)
- Write tests
- Fix bugs
- Deploy to production

---

## Testing Throughout

Add tests continuously:

File: `backend/tests/customer.test.js`
```javascript
const request = require('supertest');
const app = require('../src/app');

describe('Customer API', () => {
  it('should create a new customer', async () => {
    const response = await request(app)
      .post('/api/customers')
      .send({
        name: 'Test Company',
        email: 'test@example.com',
        phone: '+49 123 456 7890',
        city: 'Munich',
        country: 'DE'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Company');
  });
});
```

Run: `npm test`

---

## Deployment Checklist

Before deploying:
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] API keys working
- [ ] Tests passing
- [ ] Frontend build successful
- [ ] Error logging configured
- [ ] Backup strategy in place

---

## Summary

Follow this implementation plan step by step. Each step builds on the previous one, ensuring a solid foundation before moving forward.

**Key Success Factors:**
1. Test each component before moving to the next
2. Keep code modular and reusable
3. Document as you go
4. Commit frequently to version control
5. Ask for clarification if anything is unclear

Good luck with implementation! 🚀
