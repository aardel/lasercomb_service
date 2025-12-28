-- ============================================================================
-- Migration: Add Machine Info to Trip Customers Table
-- Date: 2024-12-24
-- Description: Adds machine-related fields to trip_customers (customer-related, not technician-related)
-- ============================================================================

-- Add machine-related fields to trip_customers table
ALTER TABLE trip_customers
  ADD COLUMN IF NOT EXISTS masch_typ VARCHAR(255), -- Machine type/model (customer-related)
  ADD COLUMN IF NOT EXISTS seriennr VARCHAR(100), -- Serial number (customer-related)
  ADD COLUMN IF NOT EXISTS job_task TEXT; -- Job task description (machine-related)

-- Add comments for documentation
COMMENT ON COLUMN trip_customers.masch_typ IS 'Machine type/model - customer-related, each customer on trip may have different machine';
COMMENT ON COLUMN trip_customers.seriennr IS 'Serial number of the machine - customer-related';
COMMENT ON COLUMN trip_customers.job_task IS 'Job task description related to the machine';




