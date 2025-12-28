-- Migration 005: Add mapping provider settings to technicians table
-- Allows selection between Google Maps, OpenRouteService, or Auto (with fallback)
-- Created: 2025-12-27

-- Add mapping_provider to technicians table
ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS mapping_provider VARCHAR(20) DEFAULT 'auto'
    CHECK (mapping_provider IN ('google', 'openrouteservice', 'auto'));

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS enable_mapping_fallback BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN technicians.mapping_provider IS 'Mapping API provider: google (Google Maps), openrouteservice (free), auto (try OpenRouteService first, fallback to Google)';
COMMENT ON COLUMN technicians.enable_mapping_fallback IS 'Enable fallback to secondary provider if primary fails';

-- Default all existing technicians to 'auto' mode (try free OpenRouteService first, fallback to Google)
UPDATE technicians
SET
  mapping_provider = 'auto',
  enable_mapping_fallback = true
WHERE mapping_provider IS NULL;

-- Log migration
SELECT 'Migration 005: Added mapping provider settings (google, openrouteservice, auto)' AS status;
