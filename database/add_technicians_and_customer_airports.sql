-- Add technicians table and update customers table for permanent storage
-- This allows technicians and customers to be shared across all browsers/users

-- ============================================================================
-- TECHNICIANS TABLE (for storing technician profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS technicians (
  id VARCHAR(100) PRIMARY KEY,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  home_address TEXT NOT NULL,
  home_latitude DECIMAL(10, 8),
  home_longitude DECIMAL(11, 8),
  country VARCHAR(3), -- ISO country code
  
  -- Transport Preferences
  transport_to_airport VARCHAR(10) DEFAULT 'taxi' CHECK (transport_to_airport IN ('taxi', 'car')),
  taxi_cost DECIMAL(10, 2) DEFAULT 90.00, -- Round-trip cost
  parking_cost_per_day DECIMAL(10, 2) DEFAULT 15.00,
  time_to_airport INTEGER DEFAULT 45, -- Minutes
  
  -- Cached Airport Data (JSONB for flexibility)
  airports JSONB DEFAULT '[]', -- Array of { code, name, lat, lng, distance_to_home_km, time_to_home_minutes }
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_technicians_is_default ON technicians(is_default);
CREATE INDEX IF NOT EXISTS idx_technicians_is_active ON technicians(is_active);

-- ============================================================================
-- UPDATE CUSTOMERS TABLE (add airport storage)
-- ============================================================================

-- Add nearest_airport JSONB column if it doesn't exist (for full airport object)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'nearest_airport'
  ) THEN
    ALTER TABLE customers ADD COLUMN nearest_airport JSONB;
  END IF;
END $$;

-- Add place_id column if it doesn't exist (for Google Places integration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN place_id VARCHAR(255);
  END IF;
END $$;

-- Add index for place_id
CREATE INDEX IF NOT EXISTS idx_customers_place_id ON customers(place_id);

-- Add index for nearest_airport_code
CREATE INDEX IF NOT EXISTS idx_customers_nearest_airport_code ON customers(nearest_airport_code);

-- ============================================================================
-- INSERT DEFAULT TECHNICIAN (if not exists)
-- ============================================================================

INSERT INTO technicians (id, name, home_address, home_latitude, home_longitude, country, transport_to_airport, taxi_cost, parking_cost_per_day, time_to_airport, is_default, is_active)
VALUES (
  'standard',
  'Standard',
  'Siemensstraße 2, 73274 Notzingen, Germany',
  48.6693,
  9.4626,
  'DEU',
  'taxi',
  90.00,
  15.00,
  45,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;


