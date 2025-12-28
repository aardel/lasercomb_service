// Run database migration for technicians and customer airports
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env file manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    });
}

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'travel_costs',
  user: process.env.DATABASE_USER || 'aarondelia',
  password: process.env.DATABASE_PASSWORD || ''
});

async function runMigration() {
  try {
    const sqlFile = path.join(__dirname, '../../database/add_technicians_and_customer_airports.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
    
    // Verify
    const result = await pool.query('SELECT COUNT(*) FROM technicians');
    console.log(`Technicians table created with ${result.rows[0].count} records`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();


