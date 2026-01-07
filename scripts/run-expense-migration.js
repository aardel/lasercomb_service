const fs = require('fs');
const path = require('path');

// Use the backend's database config
const backendPath = path.join(__dirname, '../backend');
const dbConfig = require(path.join(backendPath, 'src/config/database.js'));

const pool = dbConfig;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running expense submissions migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/006_create_expense_submissions_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Enable UUID extension if not already enabled
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Run migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - expense_submissions');
    console.log('   - expense_segments');
    console.log('   - expense_customers');
    console.log('   - expense_receipts');
    console.log('   - expense_car_usage');
    console.log('   - expense_others');
    console.log('   - expense_email_notes');
    console.log('   - expense_settings');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
