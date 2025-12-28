-- ============================================================================
-- ARVVwV 2025 - Official German Travel Rates
-- Source: BMF-Schreiben vom 2. Dezember 2024
-- Effective: January 1, 2025
-- ============================================================================
-- This file contains the COMPLETE official rates from the German Federal 
-- Ministry of Finance document for business travel expenses abroad.
--
-- Structure:
-- - Countries with city-specific rates have both:
--   1. City entries (e.g., "Madrid" under "Spain")
--   2. Country-level entry with "im Übrigen" rates (= rest of country)
-- - Countries without city rates have only the country-level entry
-- ============================================================================

-- Clear existing rates to ensure clean import
DELETE FROM country_travel_rates;

-- Reset the sequence
ALTER SEQUENCE country_travel_rates_id_seq RESTART WITH 1;

-- ============================================================================
-- INSERT ALL RATES
-- Format: country_code, country_name, city_name, daily_8h, daily_24h, hotel_max
-- ============================================================================

INSERT INTO country_travel_rates (
    country_code, country_name, city_name, 
    daily_allowance_8h, daily_allowance_24h, hotel_rate_max,
    agent_fee, company_fee, additional_fee_percent,
    currency, effective_from, source_reference
) VALUES
-- A
('AFG', 'Afghanistan', NULL, 20, 30, 95, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ALB', 'Albania', NULL, 18, 27, 112, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('DZA', 'Algeria', NULL, 32, 47, 120, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AND', 'Andorra', NULL, 28, 41, 91, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AGO', 'Angola', NULL, 27, 40, 368, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ARG', 'Argentina', NULL, 24, 35, 113, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ARM', 'Armenia', NULL, 20, 29, 107, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AUS', 'Australia', NULL, 38, 57, 173, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AUS', 'Australia', 'Canberra', 49, 74, 186, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AUS', 'Australia', 'Sydney', 38, 57, 173, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AUT', 'Austria', NULL, 32, 47, 117, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('AZE', 'Azerbaijan', NULL, 24, 36, 145, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- B
('BHR', 'Bahrain', NULL, 36, 54, 212, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BGD', 'Bangladesh', NULL, 32, 48, 145, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BRB', 'Barbados', NULL, 46, 69, 214, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BLR', 'Belarus', NULL, 13, 20, 98, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BEL', 'Belgium', NULL, 34, 51, 141, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BEN', 'Benin', NULL, 35, 52, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BOL', 'Bolivia', NULL, 25, 37, 85, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BIH', 'Bosnia and Herzegovina', NULL, 19, 28, 79, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BWA', 'Botswana', NULL, 26, 39, 122, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BRA', 'Brazil', NULL, 30, 45, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BRA', 'Brazil', 'Brasilia', 24, 36, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BRA', 'Brazil', 'Rio de Janeiro', 34, 51, 150, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BRA', 'Brazil', 'São Paulo', 30, 45, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BRN', 'Brunei', NULL, 36, 53, 127, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BGR', 'Bulgaria', NULL, 18, 27, 102, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BFA', 'Burkina Faso', NULL, 31, 46, 106, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('BDI', 'Burundi', NULL, 30, 45, 130, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- C
('KHM', 'Cambodia', NULL, 28, 42, 93, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CMR', 'Cameroon', NULL, 35, 52, 147, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CAN', 'Canada', NULL, 40, 60, 159, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CAN', 'Canada', 'Ottawa', 35, 53, 142, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CAN', 'Canada', 'Toronto', 43, 65, 194, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CAN', 'Canada', 'Vancouver', 40, 60, 159, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CPV', 'Cape Verde', NULL, 24, 36, 87, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CAF', 'Central African Republic', NULL, 36, 53, 210, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TCD', 'Chad', NULL, 28, 42, 155, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHL', 'Chile', NULL, 29, 43, 120, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHN', 'China', NULL, 38, 57, 163, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHN', 'China', 'Beijing', 42, 63, 238, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHN', 'China', 'Chengdu', 38, 57, 163, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHN', 'China', 'Guangzhou', 46, 69, 158, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHN', 'China', 'Hong Kong', 46, 69, 194, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHN', 'China', 'Shanghai', 50, 75, 186, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('COL', 'Colombia', NULL, 28, 42, 113, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('COD', 'Congo, Democratic Republic', NULL, 40, 60, 175, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('COG', 'Congo, Republic', NULL, 45, 68, 207, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CRI', 'Costa Rica', NULL, 32, 47, 108, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CIV', 'Côte d''Ivoire', NULL, 34, 51, 181, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('HRV', 'Croatia', NULL, 26, 39, 107, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CUB', 'Cuba', NULL, 34, 51, 130, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CYP', 'Cyprus', NULL, 28, 42, 125, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CZE', 'Czech Republic', NULL, 21, 32, 77, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- D
('DNK', 'Denmark', NULL, 44, 66, 140, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('DJI', 'Djibouti', NULL, 35, 52, 133, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('DOM', 'Dominican Republic', NULL, 34, 50, 122, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- E
('ECU', 'Ecuador', NULL, 28, 42, 118, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('EGY', 'Egypt', NULL, 31, 46, 128, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SLV', 'El Salvador', NULL, 30, 45, 113, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GNQ', 'Equatorial Guinea', NULL, 36, 54, 173, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ERI', 'Eritrea', NULL, 36, 54, 139, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('EST', 'Estonia', NULL, 23, 35, 92, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ETH', 'Ethiopia', NULL, 30, 45, 139, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- F
('FJI', 'Fiji', NULL, 32, 47, 145, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('FIN', 'Finland', NULL, 36, 54, 133, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('FRA', 'France', NULL, 36, 53, 139, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('FRA', 'France', 'Lyon', 36, 53, 120, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('FRA', 'France', 'Paris', 44, 66, 186, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('FRA', 'France', 'Strasbourg', 33, 50, 96, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- G
('GAB', 'Gabon', NULL, 44, 66, 188, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GMB', 'Gambia', NULL, 27, 40, 112, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GEO', 'Georgia', NULL, 22, 32, 113, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GHA', 'Ghana', NULL, 31, 46, 178, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GRC', 'Greece', NULL, 27, 40, 124, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GTM', 'Guatemala', NULL, 28, 42, 108, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GIN', 'Guinea', NULL, 32, 47, 161, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- H
('HTI', 'Haiti', NULL, 42, 63, 175, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('HND', 'Honduras', NULL, 31, 46, 95, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('HUN', 'Hungary', NULL, 21, 32, 85, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- I
('ISL', 'Iceland', NULL, 43, 65, 160, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IND', 'India', NULL, 27, 40, 165, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IND', 'India', 'Chennai', 30, 44, 116, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IND', 'India', 'Kolkata', 25, 37, 116, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IND', 'India', 'Mumbai', 32, 47, 210, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IND', 'India', 'New Delhi', 27, 40, 165, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IDN', 'Indonesia', NULL, 27, 40, 120, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IRN', 'Iran', NULL, 24, 36, 126, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IRQ', 'Iraq', NULL, 26, 39, 200, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('IRL', 'Ireland', NULL, 34, 51, 135, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ISR', 'Israel', NULL, 42, 63, 198, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ITA', 'Italy', NULL, 27, 40, 146, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ITA', 'Italy', 'Milan', 32, 48, 200, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ITA', 'Italy', 'Rome', 32, 48, 150, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- J
('JAM', 'Jamaica', NULL, 41, 62, 174, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('JPN', 'Japan', NULL, 40, 60, 238, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('JPN', 'Japan', 'Tokyo', 53, 80, 266, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('JOR', 'Jordan', NULL, 32, 48, 155, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- K
('KAZ', 'Kazakhstan', NULL, 26, 39, 146, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('KEN', 'Kenya', NULL, 32, 48, 161, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('KOR', 'Korea, South', NULL, 41, 62, 177, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('KWT', 'Kuwait', NULL, 38, 57, 189, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('KGZ', 'Kyrgyzstan', NULL, 24, 36, 87, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- L
('LAO', 'Laos', NULL, 26, 39, 89, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LVA', 'Latvia', NULL, 25, 37, 101, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LBN', 'Lebanon', NULL, 32, 48, 168, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LSO', 'Lesotho', NULL, 19, 28, 86, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LBR', 'Liberia', NULL, 40, 60, 160, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LBY', 'Libya', NULL, 35, 52, 183, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LIE', 'Liechtenstein', NULL, 43, 64, 180, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LTU', 'Lithuania', NULL, 23, 35, 95, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LUX', 'Luxembourg', NULL, 39, 58, 130, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- M
('MDG', 'Madagascar', NULL, 25, 37, 109, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MWI', 'Malawi', NULL, 32, 48, 145, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MYS', 'Malaysia', NULL, 28, 42, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MLI', 'Mali', NULL, 27, 40, 120, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MLT', 'Malta', NULL, 33, 50, 139, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MRT', 'Mauritania', NULL, 34, 50, 92, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MUS', 'Mauritius', NULL, 33, 49, 118, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MEX', 'Mexico', NULL, 34, 51, 143, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MEX', 'Mexico', 'Mexico City', 39, 59, 174, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MDA', 'Moldova', NULL, 18, 27, 112, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MCO', 'Monaco', NULL, 46, 69, 135, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MNG', 'Mongolia', NULL, 22, 33, 97, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MNE', 'Montenegro', NULL, 26, 39, 117, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MAR', 'Morocco', NULL, 32, 47, 141, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MOZ', 'Mozambique', NULL, 35, 52, 178, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MMR', 'Myanmar', NULL, 26, 39, 117, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- N
('NAM', 'Namibia', NULL, 23, 34, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NPL', 'Nepal', NULL, 24, 36, 100, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NLD', 'Netherlands', NULL, 38, 57, 163, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NZL', 'New Zealand', NULL, 36, 54, 139, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NIC', 'Nicaragua', NULL, 28, 42, 105, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NER', 'Niger', NULL, 25, 37, 99, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NGA', 'Nigeria', NULL, 40, 60, 254, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('MKD', 'North Macedonia', NULL, 21, 31, 84, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NOR', 'Norway', NULL, 47, 70, 156, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('NOR', 'Norway', 'Oslo', 50, 75, 180, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- O
('OMN', 'Oman', NULL, 36, 54, 183, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- P
('PAK', 'Pakistan', NULL, 23, 34, 122, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PAK', 'Pakistan', 'Islamabad', 34, 51, 238, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PLW', 'Palau', NULL, 34, 51, 193, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PAN', 'Panama', NULL, 28, 41, 82, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PNG', 'Papua New Guinea', NULL, 40, 59, 159, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PRY', 'Paraguay', NULL, 26, 39, 124, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PER', 'Peru', NULL, 23, 34, 143, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PHL', 'Philippines', NULL, 28, 41, 140, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('POL', 'Poland', NULL, 23, 34, 124, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('POL', 'Poland', 'Breslau', 23, 34, 124, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('POL', 'Poland', 'Warsaw', 27, 40, 143, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('PRT', 'Portugal', NULL, 21, 32, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- Q
('QAT', 'Qatar', NULL, 42, 63, 229, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- R
('ROU', 'Romania', NULL, 18, 27, 89, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ROU', 'Romania', 'Bucharest', 21, 32, 92, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('RUS', 'Russia', NULL, 19, 28, 133, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('RUS', 'Russia', 'Moscow', 20, 30, 235, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('RUS', 'Russia', 'St. Petersburg', 19, 28, 133, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('RWA', 'Rwanda', NULL, 29, 44, 117, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- S
('WSM', 'Samoa', NULL, 26, 39, 105, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SMR', 'San Marino', NULL, 23, 34, 79, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('STP', 'São Tomé and Príncipe', NULL, 24, 36, 147, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SAU', 'Saudi Arabia', NULL, 37, 56, 181, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SAU', 'Saudi Arabia', 'Jeddah', 38, 57, 181, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SAU', 'Saudi Arabia', 'Riyadh', 37, 56, 186, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SEN', 'Senegal', NULL, 28, 42, 190, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SRB', 'Serbia', NULL, 18, 27, 97, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SLE', 'Sierra Leone', NULL, 38, 57, 145, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SGP', 'Singapore', NULL, 48, 71, 277, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SVK', 'Slovakia', NULL, 22, 33, 121, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SVN', 'Slovenia', NULL, 25, 38, 126, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ZAF', 'South Africa', NULL, 20, 29, 109, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ZAF', 'South Africa', 'Cape Town', 22, 33, 130, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ZAF', 'South Africa', 'Johannesburg', 24, 36, 129, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SSD', 'South Sudan', NULL, 34, 51, 159, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ESP', 'Spain', NULL, 23, 34, 103, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ESP', 'Spain', 'Barcelona', 23, 34, 144, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ESP', 'Spain', 'Canary Islands', 24, 36, 103, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ESP', 'Spain', 'Madrid', 28, 42, 131, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ESP', 'Spain', 'Palma de Mallorca', 29, 44, 142, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('LKA', 'Sri Lanka', NULL, 24, 36, 112, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SDN', 'Sudan', NULL, 22, 33, 195, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SWE', 'Sweden', NULL, 44, 66, 140, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHE', 'Switzerland', NULL, 43, 64, 180, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('CHE', 'Switzerland', 'Geneva', 44, 66, 186, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('SYR', 'Syria', NULL, 25, 38, 140, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- T
('TWN', 'Taiwan', NULL, 34, 51, 174, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TJK', 'Tajikistan', NULL, 18, 27, 85, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TZA', 'Tanzania', NULL, 29, 44, 97, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('THA', 'Thailand', NULL, 24, 36, 114, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TGO', 'Togo', NULL, 26, 39, 118, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TON', 'Tonga', NULL, 20, 29, 102, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TTO', 'Trinidad and Tobago', NULL, 44, 66, 203, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TUN', 'Tunisia', NULL, 27, 40, 144, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TUR', 'Turkey', NULL, 16, 24, 107, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TUR', 'Turkey', 'Ankara', 21, 32, 110, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TUR', 'Turkey', 'Izmir', 29, 44, 120, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('TKM', 'Turkmenistan', NULL, 19, 28, 135, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- U
('UGA', 'Uganda', NULL, 28, 41, 143, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('UKR', 'Ukraine', NULL, 17, 26, 98, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ARE', 'United Arab Emirates', NULL, 44, 65, 156, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GBR', 'United Kingdom', NULL, 35, 52, 99, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('GBR', 'United Kingdom', 'London', 44, 66, 163, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', NULL, 40, 59, 182, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Atlanta', 52, 77, 182, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Boston', 42, 63, 333, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Chicago', 44, 65, 233, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Houston', 41, 62, 204, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Los Angeles', 43, 64, 262, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Miami', 44, 65, 256, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'New York City', 44, 66, 308, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'San Francisco', 40, 59, 327, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('USA', 'United States', 'Washington D.C.', 44, 66, 203, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('URY', 'Uruguay', NULL, 27, 40, 113, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('UZB', 'Uzbekistan', NULL, 23, 34, 104, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- V
('VAT', 'Vatican City', NULL, 32, 48, 150, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('VEN', 'Venezuela', NULL, 30, 45, 127, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('VNM', 'Vietnam', NULL, 24, 36, 111, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- Y
('YEM', 'Yemen', NULL, 29, 43, 134, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),

-- Z
('ZMB', 'Zambia', NULL, 25, 38, 105, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025'),
('ZWE', 'Zimbabwe', NULL, 42, 63, 198, 0, 0, 0, 'EUR', '2025-01-01', 'BMF 2024-12-02 ARVVwV 2025');

-- ============================================================================
-- Verify import
-- ============================================================================
-- SELECT country_name, city_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max
-- FROM country_travel_rates 
-- WHERE country_name = 'Spain'
-- ORDER BY city_name NULLS FIRST;





