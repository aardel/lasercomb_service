-- ============================================================================
-- Migration: Create Expense Submissions Tables
-- Date: 2025-01-XX
-- Description: Creates all tables for the Expense Submission Module
-- ============================================================================

-- Main expense submissions table
CREATE TABLE IF NOT EXISTS expense_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_name VARCHAR(255) NOT NULL,
    technician_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    rates_database_used VARCHAR(255), -- e.g., "rates2019_Eng.sqlite" or "TravelRates_2025.xml"
    rates_year INTEGER, -- e.g., 2025, 2026
    total_daily_rate DECIMAL(10, 2) DEFAULT 0.00,
    total_expenses DECIMAL(10, 2) DEFAULT 0.00,
    personal_car_expenses DECIMAL(10, 2) DEFAULT 0.00,
    advanced_money DECIMAL(10, 2) DEFAULT 0.00,
    grand_total DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense segments (country segments for trip duration)
CREATE TABLE IF NOT EXISTS expense_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_submission_id UUID NOT NULL REFERENCES expense_submissions(id) ON DELETE CASCADE,
    segment_number INTEGER NOT NULL CHECK (segment_number >= 1 AND segment_number <= 10),
    country_code VARCHAR(10),
    country_name VARCHAR(255),
    start_date_time TIMESTAMP NOT NULL,
    end_date_time TIMESTAMP NOT NULL,
    rate_8h DECIMAL(10, 2), -- Snapshot at calculation time
    rate_24h DECIMAL(10, 2), -- Snapshot at calculation time
    hotel_rate DECIMAL(10, 2), -- Snapshot at calculation time
    multiplier_1 INTEGER DEFAULT 0, -- Number of full 24h days
    multiplier_2 INTEGER DEFAULT 0, -- Number of partial 8h days
    total_segment DECIMAL(10, 2) DEFAULT 0.00,
    rates_snapshot JSONB, -- Full rates object at calculation time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_end_after_start CHECK (end_date_time > start_date_time)
);

-- Expense customers (job details)
CREATE TABLE IF NOT EXISTS expense_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_submission_id UUID NOT NULL REFERENCES expense_submissions(id) ON DELETE CASCADE,
    customer_number INTEGER NOT NULL CHECK (customer_number >= 1 AND customer_number <= 10),
    customer_name VARCHAR(255),
    job_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense receipts
CREATE TABLE IF NOT EXISTS expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_submission_id UUID NOT NULL REFERENCES expense_submissions(id) ON DELETE CASCADE,
    receipt_number INTEGER NOT NULL, -- Auto-increment per expense
    description VARCHAR(255),
    currency_code VARCHAR(10) DEFAULT 'EUR',
    amount_original DECIMAL(10, 2) DEFAULT 0.00,
    exchange_rate DECIMAL(10, 6) DEFAULT 1.000000,
    amount_eur DECIMAL(10, 2) DEFAULT 0.00,
    receipt_image_path VARCHAR(500), -- Path to uploaded receipt image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense car usage
CREATE TABLE IF NOT EXISTS expense_car_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_submission_id UUID NOT NULL REFERENCES expense_submissions(id) ON DELETE CASCADE,
    personal_car_number VARCHAR(50),
    personal_car_km DECIMAL(10, 2) DEFAULT 0.00,
    personal_car_rate DECIMAL(10, 2) DEFAULT 0.35,
    personal_car_total DECIMAL(10, 2) DEFAULT 0.00,
    company_car_number VARCHAR(50),
    company_car_total_km DECIMAL(10, 2) DEFAULT 0.00,
    rental_car_notes JSONB DEFAULT '[]'::jsonb, -- Array of rental car note strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_submission_id) -- One car usage record per expense
);

-- Expense others (notes and advanced money)
CREATE TABLE IF NOT EXISTS expense_others (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_submission_id UUID NOT NULL REFERENCES expense_submissions(id) ON DELETE CASCADE,
    notes JSONB DEFAULT '[]'::jsonb, -- Array of note strings
    advanced_money_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_submission_id) -- One others record per expense
);

-- Expense email notes
CREATE TABLE IF NOT EXISTS expense_email_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_submission_id UUID NOT NULL REFERENCES expense_submissions(id) ON DELETE CASCADE,
    to_addresses TEXT, -- Comma-separated email addresses
    cc_addresses TEXT, -- Comma-separated email addresses
    from_address VARCHAR(255),
    subject VARCHAR(500),
    message TEXT,
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_submission_id) -- One email record per expense
);

-- Expense settings (global settings for expense module)
CREATE TABLE IF NOT EXISTS expense_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id VARCHAR(100), -- NULL for global settings, or specific technician ID
    personal_number VARCHAR(50),
    department VARCHAR(100),
    invoice_number_sequence INTEGER DEFAULT 1, -- Last used invoice number sequence
    smtp_config JSONB, -- { server, port, authenticate, username, password }
    default_emails JSONB, -- { to, cc, from }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(technician_id) -- One settings record per technician (or global)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expense_submissions_technician ON expense_submissions(technician_id);
CREATE INDEX IF NOT EXISTS idx_expense_submissions_invoice ON expense_submissions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_expense_submissions_trip_name ON expense_submissions(trip_name);
CREATE INDEX IF NOT EXISTS idx_expense_segments_expense ON expense_segments(expense_submission_id);
CREATE INDEX IF NOT EXISTS idx_expense_customers_expense ON expense_customers(expense_submission_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense ON expense_receipts(expense_submission_id);
CREATE INDEX IF NOT EXISTS idx_expense_email_notes_expense ON expense_email_notes(expense_submission_id);

-- Add comments for documentation
COMMENT ON TABLE expense_submissions IS 'Main table for expense submissions - stores trip expense data';
COMMENT ON TABLE expense_segments IS 'Country segments for trip duration - stores date ranges and calculated rates';
COMMENT ON TABLE expense_customers IS 'Customer job details - stores customer names and job descriptions';
COMMENT ON TABLE expense_receipts IS 'Physical receipts - stores receipt entries with currency conversion';
COMMENT ON TABLE expense_car_usage IS 'Car usage data - stores personal car, company car, and rental car information';
COMMENT ON TABLE expense_others IS 'Other expenses - stores notes and advanced money amounts';
COMMENT ON TABLE expense_email_notes IS 'Email notes - stores email composition and sending status';
COMMENT ON TABLE expense_settings IS 'Expense module settings - stores SMTP config, default emails, and other settings';
