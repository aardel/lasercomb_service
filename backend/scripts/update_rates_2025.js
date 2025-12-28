/**
 * Update Country Travel Rates for 2025
 * Source: BMF-Schreiben vom 2. Dezember 2024
 * Official German Government Travel Expense Rates (ARVVwV 2025)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'travel_costs',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

// All 2025 rates from the official document
const rates2025 = [
  // Germany
  { code: 'DEU', name: 'Germany', city: null, rate8h: 14.00, rate24h: 28.00, hotel: 20.00 },

  // Major European Countries
  { code: 'FRA', name: 'France', city: 'Paris', rate8h: 32.00, rate24h: 48.00, hotel: 159.00 },
  { code: 'FRA', name: 'France', city: null, rate8h: 28.00, rate24h: 42.00, hotel: 130.00 },
  { code: 'GBR', name: 'United Kingdom', city: 'London', rate8h: 44.00, rate24h: 66.00, hotel: 163.00 },
  { code: 'GBR', name: 'United Kingdom', city: null, rate8h: 35.00, rate24h: 52.00, hotel: 99.00 },
  { code: 'ITA', name: 'Italy', city: 'Milan', rate8h: 35.00, rate24h: 52.00, hotel: 131.00 },
  { code: 'ITA', name: 'Italy', city: 'Rome', rate8h: 35.00, rate24h: 52.00, hotel: 131.00 },
  { code: 'ITA', name: 'Italy', city: null, rate8h: 32.00, rate24h: 48.00, hotel: 103.00 },
  { code: 'ESP', name: 'Spain', city: 'Barcelona', rate8h: 35.00, rate24h: 52.00, hotel: 144.00 },
  { code: 'ESP', name: 'Spain', city: 'Madrid', rate8h: 35.00, rate24h: 52.00, hotel: 131.00 },
  { code: 'ESP', name: 'Spain', city: 'Palma de Mallorca', rate8h: 29.00, rate24h: 44.00, hotel: 142.00 },
  { code: 'ESP', name: 'Spain', city: 'Canary Islands', rate8h: 24.00, rate24h: 36.00, hotel: 103.00 },
  { code: 'ESP', name: 'Spain', city: null, rate8h: 32.00, rate24h: 48.00, hotel: 103.00 },
  { code: 'NLD', name: 'Netherlands', city: 'Amsterdam', rate8h: 35.00, rate24h: 52.00, hotel: 122.00 },
  { code: 'NLD', name: 'Netherlands', city: null, rate8h: 32.00, rate24h: 48.00, hotel: 122.00 },
  { code: 'BEL', name: 'Belgium', city: 'Brussels', rate8h: 35.00, rate24h: 52.00, hotel: 122.00 },
  { code: 'BEL', name: 'Belgium', city: null, rate8h: 32.00, rate24h: 48.00, hotel: 122.00 },
  { code: 'AUT', name: 'Austria', city: 'Vienna', rate8h: 35.00, rate24h: 52.00, hotel: 122.00 },
  { code: 'AUT', name: 'Austria', city: null, rate8h: 32.00, rate24h: 48.00, hotel: 122.00 },
  { code: 'CHE', name: 'Switzerland', city: 'Geneva', rate8h: 44.00, rate24h: 66.00, hotel: 186.00 },
  { code: 'CHE', name: 'Switzerland', city: null, rate8h: 43.00, rate24h: 64.00, hotel: 180.00 },
  { code: 'SWE', name: 'Sweden', city: null, rate8h: 44.00, rate24h: 66.00, hotel: 140.00 },
  { code: 'NOR', name: 'Norway', city: 'Oslo', rate8h: 44.00, rate24h: 66.00, hotel: 140.00 },
  { code: 'NOR', name: 'Norway', city: null, rate8h: 44.00, rate24h: 66.00, hotel: 140.00 },
  { code: 'DNK', name: 'Denmark', city: 'Copenhagen', rate8h: 34.00, rate24h: 50.00, hotel: 193.00 },
  { code: 'DNK', name: 'Denmark', city: null, rate8h: 34.00, rate24h: 50.00, hotel: 193.00 },
  { code: 'FIN', name: 'Finland', city: 'Helsinki', rate8h: 34.00, rate24h: 50.00, hotel: 193.00 },
  { code: 'FIN', name: 'Finland', city: null, rate8h: 34.00, rate24h: 50.00, hotel: 193.00 },
  { code: 'POL', name: 'Poland', city: 'Warsaw', rate8h: 27.00, rate24h: 40.00, hotel: 143.00 },
  { code: 'POL', name: 'Poland', city: 'Breslau', rate8h: 23.00, rate24h: 34.00, hotel: 124.00 },
  { code: 'POL', name: 'Poland', city: null, rate8h: 23.00, rate24h: 34.00, hotel: 124.00 },
  { code: 'CZE', name: 'Czech Republic', city: null, rate8h: 21.00, rate24h: 32.00, hotel: 77.00 },
  { code: 'SVK', name: 'Slovak Republic', city: null, rate8h: 22.00, rate24h: 33.00, hotel: 121.00 },
  { code: 'HUN', name: 'Hungary', city: null, rate8h: 21.00, rate24h: 32.00, hotel: 85.00 },
  { code: 'ROU', name: 'Romania', city: 'Bucharest', rate8h: 21.00, rate24h: 32.00, hotel: 92.00 },
  { code: 'ROU', name: 'Romania', city: null, rate8h: 18.00, rate24h: 27.00, hotel: 89.00 },
  { code: 'BGR', name: 'Bulgaria', city: null, rate8h: 18.00, rate24h: 27.00, hotel: 89.00 },
  { code: 'GRC', name: 'Greece', city: 'Athens', rate8h: 23.00, rate24h: 34.00, hotel: 103.00 },
  { code: 'GRC', name: 'Greece', city: null, rate8h: 23.00, rate24h: 34.00, hotel: 103.00 },
  { code: 'PRT', name: 'Portugal', city: null, rate8h: 21.00, rate24h: 32.00, hotel: 111.00 },
  { code: 'IRL', name: 'Ireland', city: 'Dublin', rate8h: 35.00, rate24h: 52.00, hotel: 99.00 },
  { code: 'IRL', name: 'Ireland', city: null, rate8h: 35.00, rate24h: 52.00, hotel: 99.00 },
  { code: 'LUX', name: 'Luxembourg', city: null, rate8h: 23.00, rate24h: 34.00, hotel: 122.00 },
  { code: 'SVN', name: 'Slovenia', city: null, rate8h: 25.00, rate24h: 38.00, hotel: 126.00 },
  { code: 'RUS', name: 'Russian Federation', city: 'Moscow', rate8h: 20.00, rate24h: 30.00, hotel: 235.00 },
  { code: 'RUS', name: 'Russian Federation', city: 'St. Petersburg', rate8h: 19.00, rate24h: 28.00, hotel: 133.00 },
  { code: 'RUS', name: 'Russian Federation', city: null, rate8h: 19.00, rate24h: 28.00, hotel: 133.00 },
  { code: 'UKR', name: 'Ukraine', city: null, rate8h: 17.00, rate24h: 26.00, hotel: 98.00 },
  { code: 'TUR', name: 'Turkey', city: 'Ankara', rate8h: 21.00, rate24h: 32.00, hotel: 110.00 },
  { code: 'TUR', name: 'Turkey', city: 'Izmir', rate8h: 29.00, rate24h: 44.00, hotel: 120.00 },
  { code: 'TUR', name: 'Turkey', city: null, rate8h: 16.00, rate24h: 24.00, hotel: 107.00 },

  // North America
  { code: 'USA', name: 'United States', city: 'Atlanta', rate8h: 52.00, rate24h: 77.00, hotel: 182.00 },
  { code: 'USA', name: 'United States', city: 'Boston', rate8h: 42.00, rate24h: 63.00, hotel: 333.00 },
  { code: 'USA', name: 'United States', city: 'Chicago', rate8h: 44.00, rate24h: 65.00, hotel: 233.00 },
  { code: 'USA', name: 'United States', city: 'Houston', rate8h: 41.00, rate24h: 62.00, hotel: 204.00 },
  { code: 'USA', name: 'United States', city: 'Los Angeles', rate8h: 43.00, rate24h: 64.00, hotel: 262.00 },
  { code: 'USA', name: 'United States', city: 'Miami', rate8h: 44.00, rate24h: 65.00, hotel: 256.00 },
  { code: 'USA', name: 'United States', city: 'New York City', rate8h: 44.00, rate24h: 66.00, hotel: 308.00 },
  { code: 'USA', name: 'United States', city: 'San Francisco', rate8h: 40.00, rate24h: 59.00, hotel: 327.00 },
  { code: 'USA', name: 'United States', city: 'Washington, D.C.', rate8h: 44.00, rate24h: 66.00, hotel: 203.00 },
  { code: 'USA', name: 'United States', city: null, rate8h: 40.00, rate24h: 59.00, hotel: 182.00 },
  { code: 'CAN', name: 'Canada', city: 'Toronto', rate8h: 40.00, rate24h: 59.00, hotel: 182.00 },
  { code: 'CAN', name: 'Canada', city: 'Vancouver', rate8h: 40.00, rate24h: 59.00, hotel: 182.00 },
  { code: 'CAN', name: 'Canada', city: null, rate8h: 40.00, rate24h: 59.00, hotel: 182.00 },
  { code: 'MEX', name: 'Mexico', city: 'Mexico City', rate8h: 29.00, rate24h: 44.00, hotel: 143.00 },
  { code: 'MEX', name: 'Mexico', city: null, rate8h: 26.00, rate24h: 39.00, hotel: 124.00 },

  // Asia
  { code: 'CHN', name: 'China', city: 'Beijing', rate8h: 34.00, rate24h: 51.00, hotel: 174.00 },
  { code: 'CHN', name: 'China', city: 'Shanghai', rate8h: 34.00, rate24h: 51.00, hotel: 174.00 },
  { code: 'CHN', name: 'China', city: null, rate8h: 34.00, rate24h: 51.00, hotel: 174.00 },
  { code: 'JPN', name: 'Japan', city: 'Tokyo', rate8h: 48.00, rate24h: 71.00, hotel: 277.00 },
  { code: 'JPN', name: 'Japan', city: null, rate8h: 48.00, rate24h: 71.00, hotel: 277.00 },
  { code: 'KOR', name: 'South Korea', city: 'Seoul', rate8h: 34.00, rate24h: 51.00, hotel: 174.00 },
  { code: 'KOR', name: 'South Korea', city: null, rate8h: 34.00, rate24h: 51.00, hotel: 174.00 },
  { code: 'SGP', name: 'Singapore', city: null, rate8h: 48.00, rate24h: 71.00, hotel: 277.00 },
  { code: 'IND', name: 'India', city: 'Mumbai', rate8h: 29.00, rate24h: 44.00, hotel: 143.00 },
  { code: 'IND', name: 'India', city: 'New Delhi', rate8h: 29.00, rate24h: 44.00, hotel: 143.00 },
  { code: 'IND', name: 'India', city: null, rate8h: 23.00, rate24h: 34.00, hotel: 122.00 },
  { code: 'THA', name: 'Thailand', city: null, rate8h: 24.00, rate24h: 36.00, hotel: 114.00 },
  { code: 'VNM', name: 'Vietnam', city: null, rate8h: 24.00, rate24h: 36.00, hotel: 111.00 },
  { code: 'ARE', name: 'United Arab Emirates', city: null, rate8h: 44.00, rate24h: 65.00, hotel: 156.00 },
  { code: 'SAU', name: 'Saudi Arabia', city: 'Jeddah', rate8h: 38.00, rate24h: 57.00, hotel: 181.00 },
  { code: 'SAU', name: 'Saudi Arabia', city: 'Riyadh', rate8h: 37.00, rate24h: 56.00, hotel: 186.00 },
  { code: 'SAU', name: 'Saudi Arabia', city: null, rate8h: 37.00, rate24h: 56.00, hotel: 181.00 },

  // South America
  { code: 'BRA', name: 'Brazil', city: 'São Paulo', rate8h: 29.00, rate24h: 44.00, hotel: 143.00 },
  { code: 'BRA', name: 'Brazil', city: 'Rio de Janeiro', rate8h: 29.00, rate24h: 44.00, hotel: 143.00 },
  { code: 'BRA', name: 'Brazil', city: null, rate8h: 26.00, rate24h: 39.00, hotel: 124.00 },
  { code: 'ARG', name: 'Argentina', city: 'Buenos Aires', rate8h: 29.00, rate24h: 44.00, hotel: 143.00 },
  { code: 'ARG', name: 'Argentina', city: null, rate8h: 26.00, rate24h: 39.00, hotel: 124.00 },

  // Africa
  { code: 'ZAF', name: 'South Africa', city: 'Cape Town', rate8h: 22.00, rate24h: 33.00, hotel: 130.00 },
  { code: 'ZAF', name: 'South Africa', city: 'Johannesburg', rate8h: 24.00, rate24h: 36.00, hotel: 129.00 },
  { code: 'ZAF', name: 'South Africa', city: null, rate8h: 20.00, rate24h: 29.00, hotel: 109.00 },
  { code: 'EGY', name: 'Egypt', city: null, rate8h: 27.00, rate24h: 40.00, hotel: 144.00 },

  // Oceania
  { code: 'AUS', name: 'Australia', city: 'Sydney', rate8h: 44.00, rate24h: 66.00, hotel: 203.00 },
  { code: 'AUS', name: 'Australia', city: null, rate8h: 40.00, rate24h: 59.00, hotel: 182.00 },
];

async function updateRates() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Mark existing 2025 rates as expired
    await client.query(`
      UPDATE country_travel_rates 
      SET effective_until = '2024-12-31'
      WHERE effective_from >= '2025-01-01' OR effective_until IS NULL
    `);

    // Insert/update all 2025 rates
    for (const rate of rates2025) {
      await client.query(`
        INSERT INTO country_travel_rates (
          country_code, country_name, city_name,
          daily_allowance_8h, daily_allowance_24h, hotel_rate_max,
          effective_from, source_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01', 'BMF-Schreiben 2.12.2024 - ARVVwV 2025')
        ON CONFLICT (country_code, city_name, effective_from) DO UPDATE SET
          daily_allowance_8h = EXCLUDED.daily_allowance_8h,
          daily_allowance_24h = EXCLUDED.daily_allowance_24h,
          hotel_rate_max = EXCLUDED.hotel_rate_max,
          source_reference = EXCLUDED.source_reference,
          updated_at = CURRENT_TIMESTAMP
      `, [
        rate.code,
        rate.name,
        rate.city,
        rate.rate8h,
        rate.rate24h,
        rate.hotel
      ]);
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully updated ${rates2025.length} country travel rates for 2025`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating rates:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
updateRates()
  .then(() => {
    console.log('✅ Update complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  });

