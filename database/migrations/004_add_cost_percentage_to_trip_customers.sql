-- ============================================================================
-- Migration: Add Cost Percentage to Trip Customers Table
-- Date: 2024-12-27
-- Description: Adds cost_percentage field to enable flexible cost splitting
--              between multiple customers on the same trip
-- ============================================================================

-- Add cost_percentage field to trip_customers table
ALTER TABLE trip_customers
  ADD COLUMN IF NOT EXISTS cost_percentage DECIMAL(5, 2) DEFAULT 0
    CHECK (cost_percentage >= 0 AND cost_percentage <= 100);

-- Add comment for documentation
COMMENT ON COLUMN trip_customers.cost_percentage IS 'Percentage of total trip costs allocated to this customer (0-100). Used for flexible cost splitting in multi-customer trips.';

-- Note: work_percentage is for work hour distribution
-- cost_percentage is for cost distribution (can be different)
