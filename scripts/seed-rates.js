/**
 * Seed Country Travel Rates
 * 
 * This script loads comprehensive travel rates for countries worldwide
 * into the database.
 * 
 * Usage:
 *   node scripts/seed-rates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'travel_costs',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

async function seedRates() {
  try {
    console.log('🌍 Loading country travel rates...');
    
    const sqlFile = path.join(__dirname, '../database/seed_country_rates.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL file
    await pool.query(sql);
    
    // Count how many rates were added
    const result = await pool.query('SELECT COUNT(*) as count FROM country_travel_rates');
    console.log(`✅ Successfully loaded travel rates!`);
    console.log(`   Total countries with rates: ${result.rows[0].count}`);
    
    // Show sample of countries
    const countries = await pool.query(`
      SELECT DISTINCT country_code, country_name 
      FROM country_travel_rates 
      ORDER BY country_name 
      LIMIT 10
    `);
    console.log('\n📋 Sample countries with rates:');
    countries.rows.forEach(row => {
      console.log(`   - ${row.country_name} (${row.country_code})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding rates:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedRates();


