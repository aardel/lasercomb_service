const fs = require('fs');
const path = require('path');

// Use the backend's database config (it will load .env automatically)
const backendPath = path.join(__dirname, '../backend');
const dbConfig = require(path.join(backendPath, 'src/config/database.js'));

const pool = dbConfig;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running technician migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/007_add_personal_number_department_to_technicians.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns to technicians table:');
    console.log('   - personal_number VARCHAR(50)');
    console.log('   - department VARCHAR(100)');
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
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
