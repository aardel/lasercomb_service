-- ============================================================================
-- Migration: Add personal_number and department to technicians table
-- Date: 2025-01-XX
-- Description: Adds personal_number and department fields to technicians table
--              for expense submission module
-- ============================================================================

-- Add personal_number column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'personal_number'
  ) THEN
    ALTER TABLE technicians ADD COLUMN personal_number VARCHAR(50);
  END IF;
END $$;

-- Add department column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'department'
  ) THEN
    ALTER TABLE technicians ADD COLUMN department VARCHAR(100);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN technicians.personal_number IS 'Personal employee number for expense submissions';
COMMENT ON COLUMN technicians.department IS 'Department name for expense submissions';
