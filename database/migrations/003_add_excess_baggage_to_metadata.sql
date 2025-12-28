-- ============================================================================
-- Migration: Add Excess Baggage Support (Flight-Related)
-- Date: 2024-12-24
-- Description: Excess baggage is flight-related and stored in trip metadata
-- Note: This migration is informational - excess baggage will be stored in 
--       the metadata JSONB field when flight travel is selected
-- ============================================================================

-- Excess baggage (ue_gepack) is stored in trips.metadata JSONB field
-- Structure: metadata.excess_baggage = { cost: DECIMAL, description: TEXT }
-- This is only relevant when selected_travel_mode = 'flight'

-- Add comment to trips table metadata field for documentation
COMMENT ON COLUMN trips.metadata IS 'JSONB field containing trip metadata. For flights, may include: {"excess_baggage": {"cost": 50.00, "description": "Extra luggage"}}';




