-- ============================================================================
-- TRAVEL COST AUTOMATION SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- PostgreSQL 15+
-- Version: 1.0
-- Last Updated: December 2024
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- APplus Integration
  external_id VARCHAR(100) UNIQUE, -- APplus customer ID
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  mobile VARCHAR(50),
  
  -- Address
  street_address TEXT,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  country VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3 (DEU, FRA, GBR, USA)
  
  -- Location Data (Geocoded)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  nearest_airport_code VARCHAR(3), -- IATA code (MUC, HAM, etc.)
  
  -- Travel Planning
  cost_share_percentage DECIMAL(5, 2) DEFAULT 0 
    CHECK (cost_share_percentage >= 0 AND cost_share_percentage <= 100),
  preferences JSONB DEFAULT '{}',
  
  -- Source Tracking
  data_source VARCHAR(20) NOT NULL 
    CHECK (data_source IN ('applus_import', 'manual_entry', 'csv_upload')),
  can_edit_synced_fields BOOLEAN DEFAULT true,
  
  -- Additional Info
  notes TEXT,
  metadata JSONB DEFAULT '{}', -- Store APplus-specific data
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_synced_at TIMESTAMP,
  
  -- Constraints
  UNIQUE(email)
);

-- Indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_external_id ON customers(external_id);
CREATE INDEX idx_customers_data_source ON customers(data_source);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_location ON customers(latitude, longitude);
CREATE INDEX idx_customers_country ON customers(country);
CREATE INDEX idx_customers_city ON customers(city);

-- ============================================================================
-- 2. ENGINEERS TABLE
-- ============================================================================

CREATE TABLE engineers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  employee_id VARCHAR(50) UNIQUE,
  
  -- Location (Home Base)
  base_city VARCHAR(100) NOT NULL,
  base_country VARCHAR(3) NOT NULL,
  base_address TEXT,
  base_latitude DECIMAL(10, 8),
  base_longitude DECIMAL(11, 8),
  nearest_airport_code VARCHAR(3),
  
  -- Skills
  skills JSONB DEFAULT '[]', -- ["installation", "maintenance", "training"]
  skill_level VARCHAR(20) DEFAULT 'intermediate' 
    CHECK (skill_level IN ('junior', 'intermediate', 'senior', 'expert')),
  specializations JSONB DEFAULT '[]', -- ["laser_systems", "CNC"]
  
  -- Rates
  hourly_rate DECIMAL(10, 2),
  overtime_rate DECIMAL(10, 2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  currently_on_trip BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_engineers_email ON engineers(email);
CREATE INDEX idx_engineers_is_active ON engineers(is_active);
CREATE INDEX idx_engineers_location ON engineers(base_latitude, base_longitude);
CREATE INDEX idx_engineers_skills ON engineers USING GIN(skills);

-- ============================================================================
-- 3. ENGINEER AVAILABILITY TABLE
-- ============================================================================

CREATE TABLE engineer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engineer_id UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  reason VARCHAR(255), -- "on_trip", "vacation", "sick_leave", "training"
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_availability_engineer ON engineer_availability(engineer_id);
CREATE INDEX idx_availability_dates ON engineer_availability(start_date, end_date);

-- ============================================================================
-- 4. TRIPS TABLE
-- ============================================================================

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  trip_number VARCHAR(50) UNIQUE, -- Auto-generated: TR-2025-0001
  
  -- Trip Type
  trip_type VARCHAR(20) NOT NULL 
    CHECK (trip_type IN ('single', 'combined', 'pending_approval')),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
  
  -- Assignment
  engineer_id UUID REFERENCES engineers(id),
  
  -- Dates
  planned_start_date TIMESTAMP,
  planned_end_date TIMESTAMP,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  
  -- Job Details
  job_type VARCHAR(50), -- "installation", "maintenance", "repair", "training"
  job_description TEXT,
  work_hours_estimate DECIMAL(5, 2),
  work_hours_actual DECIMAL(5, 2),
  
  -- Travel Details
  selected_travel_mode VARCHAR(20) 
    CHECK (selected_travel_mode IN ('flight', 'road', 'train', 'mixed')),
  total_distance_km DECIMAL(10, 2),
  total_travel_hours DECIMAL(5, 2),
  
  -- Costs (Calculated)
  estimated_total_cost DECIMAL(10, 2),
  actual_total_cost DECIMAL(10, 2),
  
  -- Route (for combined trips)
  optimized_route JSONB, -- Array of customer IDs in order
  
  -- Additional Info
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),
  
  CHECK (planned_end_date >= planned_start_date)
);

-- Indexes
CREATE INDEX idx_trips_trip_number ON trips(trip_number);
CREATE INDEX idx_trips_engineer ON trips(engineer_id);
CREATE INDEX idx_trips_type ON trips(trip_type);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(planned_start_date, planned_end_date);

-- ============================================================================
-- 5. TRIP_CUSTOMERS TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE trip_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- For Combined Trips
  work_percentage DECIMAL(5, 2) DEFAULT 0 
    CHECK (work_percentage >= 0 AND work_percentage <= 100),
  cost_share DECIMAL(10, 2),
  
  -- Visit Details
  visit_order INTEGER, -- 1, 2, 3, etc. for route optimization
  visit_duration_hours DECIMAL(5, 2),
  visit_notes TEXT,
  
  -- Status
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(trip_id, customer_id)
);

-- Indexes
CREATE INDEX idx_trip_customers_trip ON trip_customers(trip_id);
CREATE INDEX idx_trip_customers_customer ON trip_customers(customer_id);
CREATE INDEX idx_trip_customers_order ON trip_customers(trip_id, visit_order);

-- ============================================================================
-- 6. QUOTATIONS TABLE
-- ============================================================================

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  quotation_number VARCHAR(50) NOT NULL UNIQUE, -- "25-0015"
  
  -- Relationships
  customer_id UUID NOT NULL REFERENCES customers(id),
  engineer_id UUID REFERENCES engineers(id),
  trip_id UUID REFERENCES trips(id),
  
  -- Job Information
  job_type VARCHAR(50) NOT NULL,
  job_description TEXT,
  
  -- Date
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  
  -- === COST BREAKDOWN ===
  
  -- Working Time
  working_hours DECIMAL(5, 2),
  working_rate DECIMAL(10, 2) DEFAULT 132,
  working_cost DECIMAL(10, 2),
  
  -- Travel Time
  travel_hours DECIMAL(5, 2),
  travel_rate DECIMAL(10, 2) DEFAULT 98,
  travel_cost DECIMAL(10, 2),
  
  -- Distance (Road Only)
  distance_km DECIMAL(10, 2),
  distance_rate DECIMAL(10, 2) DEFAULT 0.88,
  distance_cost DECIMAL(10, 2),
  
  -- Daily Allowances
  allowance_24h_days INTEGER DEFAULT 0,
  allowance_24h_rate DECIMAL(10, 2) DEFAULT 28,
  allowance_24h_cost DECIMAL(10, 2),
  
  allowance_8h_days INTEGER DEFAULT 0,
  allowance_8h_rate DECIMAL(10, 2) DEFAULT 14,
  allowance_8h_cost DECIMAL(10, 2),
  
  -- Hotel
  hotel_nights INTEGER DEFAULT 0,
  hotel_rate DECIMAL(10, 2) DEFAULT 115,
  hotel_cost DECIMAL(10, 2),
  
  -- Transportation
  flight_international DECIMAL(10, 2) DEFAULT 0,
  flight_national DECIMAL(10, 2) DEFAULT 0,
  excess_baggage DECIMAL(10, 2) DEFAULT 0,
  taxi DECIMAL(10, 2) DEFAULT 0,
  parking DECIMAL(10, 2) DEFAULT 0,
  rental_car DECIMAL(10, 2) DEFAULT 0,
  fuel DECIMAL(10, 2) DEFAULT 0,
  toll DECIMAL(10, 2) DEFAULT 0,
  
  -- Totals
  total_travel_costs DECIMAL(10, 2), -- komplette RK
  total_working_costs DECIMAL(10, 2), -- V61
  total_parts DECIMAL(10, 2) DEFAULT 0,
  grand_total DECIMAL(10, 2),
  
  -- Travel Mode
  travel_mode VARCHAR(20) CHECK (travel_mode IN ('flight', 'road', 'train', 'mixed')),
  
  -- Additional Info
  notes TEXT,
  internal_notes TEXT,
  
  -- Customer Initials (from template)
  customer_initials VARCHAR(10),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  approved_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_engineer ON quotations(engineer_id);
CREATE INDEX idx_quotations_trip ON quotations(trip_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_date ON quotations(quotation_date);

-- ============================================================================
-- 7. COUNTRY_TRAVEL_RATES TABLE (Official Government Rates)
-- ============================================================================

CREATE TABLE country_travel_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
  country_name VARCHAR(100) NOT NULL,
  city_name VARCHAR(100), -- NULL for nationwide rate
  
  -- Daily Allowances (Tagesgeld)
  daily_allowance_8h DECIMAL(10, 2) NOT NULL, -- >8 hours
  daily_allowance_24h DECIMAL(10, 2) NOT NULL, -- 24+ hours
  
  -- Hotel Allowances (Übernachtungsgeld)
  hotel_rate_max DECIMAL(10, 2) NOT NULL, -- Maximum per night
  hotel_rate_actual BOOLEAN DEFAULT true, -- Can use actual costs
  
  -- Currency
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Validity Period
  effective_from DATE NOT NULL,
  effective_until DATE,
  
  -- Source Reference
  source_reference VARCHAR(255) DEFAULT 'ARVVwV 2025',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(country_code, city_name, effective_from)
);

-- Indexes
CREATE INDEX idx_rates_country ON country_travel_rates(country_code);
CREATE INDEX idx_rates_city ON country_travel_rates(city_name);
CREATE INDEX idx_rates_effective ON country_travel_rates(effective_from, effective_until);

-- ============================================================================
-- 8. COMPANY_CUSTOM_RATES TABLE
-- ============================================================================

CREATE TABLE company_custom_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  country_code VARCHAR(3) NOT NULL,
  city_name VARCHAR(100),
  
  -- Override Rates (Company pays more than government minimum)
  custom_hotel_rate DECIMAL(10, 2), -- e.g., 115 € vs government 20 €
  custom_mileage_rate DECIMAL(10, 2), -- e.g., 0.88 € vs government 0.30 €
  custom_travel_hour_rate DECIMAL(10, 2), -- e.g., 98 €
  custom_work_hour_rate DECIMAL(10, 2), -- e.g., 132 €
  
  notes TEXT,
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(country_code, city_name)
);

-- Indexes
CREATE INDEX idx_custom_rates_country ON company_custom_rates(country_code);
CREATE INDEX idx_custom_rates_active ON company_custom_rates(active);

-- ============================================================================
-- 9. IMPORT_HISTORY TABLE (APplus Imports)
-- ============================================================================

CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10), -- xml, csv
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Statistics
  imported_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Details
  errors JSONB DEFAULT '[]',
  parse_errors JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('success', 'partial', 'failed')),
  duration_ms INTEGER,
  
  notes TEXT
);

-- Indexes
CREATE INDEX idx_import_history_date ON import_history(import_date DESC);
CREATE INDEX idx_import_history_status ON import_history(status);

-- ============================================================================
-- 10. FLIGHT_SEARCHES TABLE (Cache Results)
-- ============================================================================

CREATE TABLE flight_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  origin_airport VARCHAR(3) NOT NULL,
  destination_airport VARCHAR(3) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  
  search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Results (Store as JSON)
  results JSONB NOT NULL,
  best_price DECIMAL(10, 2),
  
  -- Cache Expiry
  expires_at TIMESTAMP,
  
  UNIQUE(origin_airport, destination_airport, departure_date, return_date, search_date)
);

-- Indexes
CREATE INDEX idx_flight_searches_route ON flight_searches(origin_airport, destination_airport);
CREATE INDEX idx_flight_searches_date ON flight_searches(departure_date);
CREATE INDEX idx_flight_searches_expires ON flight_searches(expires_at);

-- ============================================================================
-- 11. COST_SPLITS TABLE (For Combined Trips)
-- ============================================================================

CREATE TABLE cost_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  work_percentage DECIMAL(5, 2) NOT NULL 
    CHECK (work_percentage >= 0 AND work_percentage <= 100),
  
  allocated_cost DECIMAL(10, 2) NOT NULL,
  original_total_cost DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cost_splits_quotation ON cost_splits(quotation_id);
CREATE INDEX idx_cost_splits_trip ON cost_splits(trip_id);
CREATE INDEX idx_cost_splits_customer ON cost_splits(customer_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engineers_updated_at 
  BEFORE UPDATE ON engineers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at 
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at 
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Government Rates (ARVVwV 2025)
-- ============================================================================

-- Germany
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('DEU', 'Germany', NULL, 14.00, 28.00, 20.00, '2025-01-01', 'ARVVwV 2025');

-- France
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('FRA', 'France', NULL, 42.00, 42.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('FRA', 'France', 'Paris', 48.00, 48.00, 159.00, '2025-01-01', 'ARVVwV 2025');

-- United Kingdom
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('GBR', 'United Kingdom', NULL, 42.00, 42.00, 170.00, '2025-01-01', 'ARVVwV 2025'),
('GBR', 'United Kingdom', 'London', 47.00, 47.00, 200.00, '2025-01-01', 'ARVVwV 2025');

-- United States
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('USA', 'United States', NULL, 51.00, 51.00, 246.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'New York', 59.00, 59.00, 387.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'Washington', 59.00, 59.00, 306.00, '2025-01-01', 'ARVVwV 2025');

-- Switzerland
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('CHE', 'Switzerland', NULL, 63.00, 63.00, 189.00, '2025-01-01', 'ARVVwV 2025'),
('CHE', 'Switzerland', 'Zurich', 69.00, 69.00, 212.00, '2025-01-01', 'ARVVwV 2025');

-- Add more countries as needed...

-- ============================================================================
-- SEED DATA: Company Custom Rates
-- ============================================================================

INSERT INTO company_custom_rates (country_code, city_name, custom_hotel_rate, custom_mileage_rate, custom_travel_hour_rate, custom_work_hour_rate, notes, active)
VALUES ('DEU', NULL, 115.00, 0.88, 98.00, 132.00, 'Company rates for Germany - higher than government minimum', true);

-- ============================================================================
-- VIEWS (Useful Queries)
-- ============================================================================

-- Active Customers View
CREATE VIEW v_active_customers AS
SELECT 
  id,
  name,
  email,
  phone,
  city,
  country,
  latitude,
  longitude,
  nearest_airport_code,
  data_source,
  created_at
FROM customers
WHERE is_active = true
ORDER BY name;

-- Active Engineers View
CREATE VIEW v_active_engineers AS
SELECT 
  id,
  name,
  email,
  base_city,
  base_country,
  skills,
  skill_level,
  is_active,
  currently_on_trip
FROM engineers
WHERE is_active = true
ORDER BY name;

-- Pending Quotations View
CREATE VIEW v_pending_quotations AS
SELECT 
  q.id,
  q.quotation_number,
  q.quotation_date,
  c.name AS customer_name,
  e.name AS engineer_name,
  q.job_type,
  q.grand_total,
  q.status,
  q.created_at
FROM quotations q
JOIN customers c ON q.customer_id = c.id
LEFT JOIN engineers e ON q.engineer_id = e.id
WHERE q.status IN ('draft', 'sent')
ORDER BY q.quotation_date DESC;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
