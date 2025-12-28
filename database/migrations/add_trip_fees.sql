-- ============================================================================
-- MIGRATION: Add Trip Fees to country_travel_rates
-- Date: 2025-12-23
-- Description: Adds agent_fee, company_fee, and additional_fee_percent columns
-- ============================================================================

-- Add agent_fee column (EUR per trip, default 0.00)
ALTER TABLE country_travel_rates 
ADD COLUMN IF NOT EXISTS agent_fee DECIMAL(10, 2) DEFAULT 0.00;

-- Add company_fee column (EUR per trip, default 0.00)
ALTER TABLE country_travel_rates 
ADD COLUMN IF NOT EXISTS company_fee DECIMAL(10, 2) DEFAULT 0.00;

-- Add additional_fee_percent column (percentage of total trip cost, default 0.00)
ALTER TABLE country_travel_rates 
ADD COLUMN IF NOT EXISTS additional_fee_percent DECIMAL(5, 2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN country_travel_rates.agent_fee IS 'Agent fee in EUR, applied once per trip (not per day)';
COMMENT ON COLUMN country_travel_rates.company_fee IS 'Company fee in EUR, applied once per trip (not per day)';
COMMENT ON COLUMN country_travel_rates.additional_fee_percent IS 'Additional fee as percentage of total trip cost';

-- ============================================================================
-- VERIFICATION: Check the new columns exist
-- ============================================================================
-- Run this to verify: SELECT column_name, data_type, column_default 
--                     FROM information_schema.columns 
--                     WHERE table_name = 'country_travel_rates' 
--                     AND column_name IN ('agent_fee', 'company_fee', 'additional_fee_percent');





