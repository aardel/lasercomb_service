// Run database migration for machine info fields in trip_customers table
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
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

async function runMigration() {
  try {
    const sqlFile = path.join(__dirname, '../../database/migrations/002_add_machine_info_to_trip_customers.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running migration: Add Machine Info to Trip Customers Table...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trip_customers' 
      AND column_name IN ('masch_typ', 'seriennr', 'job_task')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Verified columns added:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    if (result.rows.length === 3) {
      console.log('\n✅ All 3 columns successfully added to trip_customers table!');
    } else {
      console.log(`\n⚠️  Expected 3 columns, found ${result.rows.length}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.error('   Note: Some constraints or indexes may already exist. This is OK.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();




