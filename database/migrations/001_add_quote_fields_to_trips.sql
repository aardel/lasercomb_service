-- ============================================================================
-- Migration: Add Quote Form Fields to Trips Table
-- Date: 2024-12-24
-- Description: Adds fields required for German quote form structure
-- Note: Machine info (masch_typ, seriennr) are customer-related and stored in trip_customers table
-- Note: Excess baggage (ue_gepack) is flight-related and stored in metadata
-- ============================================================================

-- Add new fields to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS einsatzart VARCHAR(50), -- Type of deployment (Installation, Service, Repair, etc.)
  ADD COLUMN IF NOT EXISTS auftrag VARCHAR(100), -- Order/Job number
  ADD COLUMN IF NOT EXISTS reisekostenpauschale DECIMAL(10, 2), -- Travel cost flat rate (nullable, overrides calculated costs if set)
  ADD COLUMN IF NOT EXISTS use_flat_rate BOOLEAN DEFAULT false, -- Flag to use flat rate instead of calculated costs
  ADD COLUMN IF NOT EXISTS parts_text TEXT; -- Simple text field for pasting parts from another system (no tracking system)

-- Add constraint for einsatzart (deployment type)
ALTER TABLE trips
  ADD CONSTRAINT check_einsatzart 
  CHECK (einsatzart IS NULL OR einsatzart IN ('Installation', 'Service', 'Repair', 'Training', 'Maintenance', 'Inspection', 'Other'));

-- Add index for auftrag (order number) for quick lookups
CREATE INDEX IF NOT EXISTS idx_trips_auftrag ON trips(auftrag) WHERE auftrag IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN trips.einsatzart IS 'Type of deployment: Installation, Service, Repair, Training, Maintenance, Inspection, or Other';
COMMENT ON COLUMN trips.auftrag IS 'Order/Job number or reference';
COMMENT ON COLUMN trips.reisekostenpauschale IS 'Travel cost flat rate in EUR (overrides calculated costs when use_flat_rate is true)';
COMMENT ON COLUMN trips.use_flat_rate IS 'If true, use reisekostenpauschale instead of calculated travel costs';
COMMENT ON COLUMN trips.parts_text IS 'Text field for pasting parts list from another system (no structured tracking)';

