-- ============================================================================
-- COMPREHENSIVE COUNTRY TRAVEL RATES (ARVVwV 2025)
-- ============================================================================
-- This file contains travel rates for major countries worldwide
-- Based on German government travel expense regulations (ARVVwV 2025)
-- 
-- Daily Allowances (Tagesgeld):
--   - daily_allowance_8h: For trips >8 hours but <24 hours
--   - daily_allowance_24h: For trips 24+ hours
-- 
-- Hotel Rates (Übernachtungsgeld):
--   - hotel_rate_max: Maximum reimbursable per night
-- ============================================================================

-- EUROPE
-- ============================================================================

-- Germany
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('DEU', 'Germany', NULL, 14.00, 28.00, 20.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- France
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('FRA', 'France', NULL, 42.00, 42.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('FRA', 'France', 'Paris', 48.00, 48.00, 159.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- United Kingdom
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('GBR', 'United Kingdom', NULL, 42.00, 42.00, 170.00, '2025-01-01', 'ARVVwV 2025'),
('GBR', 'United Kingdom', 'London', 47.00, 47.00, 200.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Switzerland
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('CHE', 'Switzerland', NULL, 63.00, 63.00, 189.00, '2025-01-01', 'ARVVwV 2025'),
('CHE', 'Switzerland', 'Zurich', 69.00, 69.00, 212.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Austria
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('AUT', 'Austria', NULL, 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025'),
('AUT', 'Austria', 'Vienna', 52.00, 52.00, 140.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Netherlands
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('NLD', 'Netherlands', NULL, 48.00, 48.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('NLD', 'Netherlands', 'Amsterdam', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Belgium
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('BEL', 'Belgium', NULL, 48.00, 48.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('BEL', 'Belgium', 'Brussels', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Italy
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('ITA', 'Italy', NULL, 48.00, 48.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('ITA', 'Italy', 'Rome', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('ITA', 'Italy', 'Milan', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Spain
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('ESP', 'Spain', NULL, 48.00, 48.00, 130.00, '2025-01-01', 'ARVVwV 2025'),
('ESP', 'Spain', 'Madrid', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('ESP', 'Spain', 'Barcelona', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Poland
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('POL', 'Poland', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('POL', 'Poland', 'Warsaw', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Czech Republic
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('CZE', 'Czech Republic', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('CZE', 'Czech Republic', 'Prague', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Sweden
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('SWE', 'Sweden', NULL, 63.00, 63.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('SWE', 'Sweden', 'Stockholm', 69.00, 69.00, 170.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Norway
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('NOR', 'Norway', NULL, 69.00, 69.00, 170.00, '2025-01-01', 'ARVVwV 2025'),
('NOR', 'Norway', 'Oslo', 75.00, 75.00, 190.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Denmark
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('DNK', 'Denmark', NULL, 63.00, 63.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('DNK', 'Denmark', 'Copenhagen', 69.00, 69.00, 170.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Finland
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('FIN', 'Finland', NULL, 63.00, 63.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('FIN', 'Finland', 'Helsinki', 69.00, 69.00, 170.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Greece
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('GRC', 'Greece', NULL, 48.00, 48.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('GRC', 'Greece', 'Athens', 52.00, 52.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Portugal
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('PRT', 'Portugal', NULL, 48.00, 48.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('PRT', 'Portugal', 'Lisbon', 52.00, 52.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- AMERICAS
-- ============================================================================

-- United States
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('USA', 'United States', NULL, 51.00, 51.00, 246.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'New York', 59.00, 59.00, 387.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'Washington', 59.00, 59.00, 306.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'Los Angeles', 59.00, 59.00, 306.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'Chicago', 59.00, 59.00, 306.00, '2025-01-01', 'ARVVwV 2025'),
('USA', 'United States', 'San Francisco', 59.00, 59.00, 387.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Canada
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('CAN', 'Canada', NULL, 51.00, 51.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('CAN', 'Canada', 'Toronto', 59.00, 59.00, 250.00, '2025-01-01', 'ARVVwV 2025'),
('CAN', 'Canada', 'Vancouver', 59.00, 59.00, 250.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Mexico
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('MEX', 'Mexico', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('MEX', 'Mexico', 'Mexico City', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Brazil
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('BRA', 'Brazil', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('BRA', 'Brazil', 'São Paulo', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025'),
('BRA', 'Brazil', 'Rio de Janeiro', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Argentina
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('ARG', 'Argentina', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('ARG', 'Argentina', 'Buenos Aires', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- ASIA
-- ============================================================================

-- China
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('CHN', 'China', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('CHN', 'China', 'Beijing', 48.00, 48.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('CHN', 'China', 'Shanghai', 48.00, 48.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Japan
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('JPN', 'Japan', NULL, 63.00, 63.00, 150.00, '2025-01-01', 'ARVVwV 2025'),
('JPN', 'Japan', 'Tokyo', 69.00, 69.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('JPN', 'Japan', 'Osaka', 69.00, 69.00, 180.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- India
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('IND', 'India', NULL, 42.00, 42.00, 80.00, '2025-01-01', 'ARVVwV 2025'),
('IND', 'India', 'Mumbai', 48.00, 48.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('IND', 'India', 'Delhi', 48.00, 48.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('IND', 'India', 'Bangalore', 48.00, 48.00, 100.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- South Korea
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('KOR', 'South Korea', NULL, 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025'),
('KOR', 'South Korea', 'Seoul', 52.00, 52.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Singapore
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('SGP', 'Singapore', NULL, 63.00, 63.00, 200.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Thailand
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('THA', 'Thailand', NULL, 42.00, 42.00, 80.00, '2025-01-01', 'ARVVwV 2025'),
('THA', 'Thailand', 'Bangkok', 48.00, 48.00, 100.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- United Arab Emirates
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('ARE', 'United Arab Emirates', NULL, 63.00, 63.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('ARE', 'United Arab Emirates', 'Dubai', 69.00, 69.00, 250.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Australia & Oceania
-- ============================================================================

-- Australia
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('AUS', 'Australia', NULL, 63.00, 63.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('AUS', 'Australia', 'Sydney', 69.00, 69.00, 250.00, '2025-01-01', 'ARVVwV 2025'),
('AUS', 'Australia', 'Melbourne', 69.00, 69.00, 250.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- New Zealand
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('NZL', 'New Zealand', NULL, 63.00, 63.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('NZL', 'New Zealand', 'Auckland', 69.00, 69.00, 250.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- MIDDLE EAST & AFRICA
-- ============================================================================

-- Israel
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('ISR', 'Israel', NULL, 63.00, 63.00, 200.00, '2025-01-01', 'ARVVwV 2025'),
('ISR', 'Israel', 'Tel Aviv', 69.00, 69.00, 250.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- South Africa
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('ZAF', 'South Africa', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('ZAF', 'South Africa', 'Johannesburg', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025'),
('ZAF', 'South Africa', 'Cape Town', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Turkey
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('TUR', 'Turkey', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('TUR', 'Turkey', 'Istanbul', 48.00, 48.00, 120.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;

-- Russia
INSERT INTO country_travel_rates (country_code, country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from, source_reference)
VALUES 
('RUS', 'Russia', NULL, 42.00, 42.00, 100.00, '2025-01-01', 'ARVVwV 2025'),
('RUS', 'Russia', 'Moscow', 48.00, 48.00, 150.00, '2025-01-01', 'ARVVwV 2025')
ON CONFLICT (country_code, city_name, effective_from) DO NOTHING;


