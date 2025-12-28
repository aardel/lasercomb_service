/**
 * Load Country Travel Rates into Database
 * 
 * This script loads comprehensive travel rates for countries worldwide
 * into the database. Run this to ensure all countries have actual rate data.
 * 
 * Usage:
 *   cd backend && node ../scripts/load-country-rates.js
 */

const path = require('path');
const fs = require('fs');

// Change to backend directory to use its node_modules and config
const backendDir = path.join(__dirname, '../backend');
process.chdir(backendDir);

// Use backend's database connection
const pool = require(path.join(backendDir, 'src/config/database'));

async function loadRates() {
  try {
    console.log('🌍 Loading country travel rates...');
    
    const sqlFile = path.join(__dirname, '../database/seed_country_rates.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ SQL file not found: ${sqlFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL file
    await pool.query(sql);
    
    // Count how many rates were added
    const result = await pool.query('SELECT COUNT(*) as count FROM country_travel_rates');
    console.log(`✅ Successfully loaded travel rates!`);
    console.log(`   Total rate entries: ${result.rows[0].count}`);
    
    // Count unique countries
    const countriesResult = await pool.query(`
      SELECT COUNT(DISTINCT country_code) as count 
      FROM country_travel_rates
    `);
    console.log(`   Unique countries: ${countriesResult.rows[0].count}`);
    
    // Show sample of countries
    const countries = await pool.query(`
      SELECT DISTINCT country_code, country_name 
      FROM country_travel_rates 
      ORDER BY country_name 
      LIMIT 15
    `);
    console.log('\n📋 Sample countries with rates:');
    countries.rows.forEach(row => {
      console.log(`   - ${row.country_name} (${row.country_code})`);
    });
    
    console.log('\n✅ All rates loaded! The system will now use actual data instead of fallbacks.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error loading rates:', error.message);
    if (error.code === '23505') {
      console.log('   ℹ️  Some rates may already exist (duplicate key error is OK)');
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

loadRates();


