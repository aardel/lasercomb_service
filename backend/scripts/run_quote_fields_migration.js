// Run database migration for quote form fields (einsatzart, auftrag, etc.)
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
    const sqlFile = path.join(__dirname, '../../database/migrations/001_add_quote_fields_to_trips.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running migration: Add Quote Form Fields to Trips Table...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trips' 
      AND column_name IN ('einsatzart', 'auftrag', 'reisekostenpauschale', 'use_flat_rate', 'parts_text')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Verified columns added:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    if (result.rows.length === 5) {
      console.log('\n✅ All 5 columns successfully added to trips table!');
    } else {
      console.log(`\n⚠️  Expected 5 columns, found ${result.rows.length}`);
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




