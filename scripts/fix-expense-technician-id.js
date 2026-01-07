const fs = require('fs');
const path = require('path');

// Use the backend's database config
const backendPath = path.join(__dirname, '../backend');
const dbConfig = require(path.join(backendPath, 'src/config/database.js'));

const pool = dbConfig;

async function fixTechnicianId() {
  const client = await pool.connect();
  try {
    console.log('🔄 Fixing technician_id column type...');
    
    await client.query('BEGIN');
    
    // Check if table exists and what type technician_id is
    const checkQuery = `
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expense_submissions' 
      AND column_name = 'technician_id'
    `;
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      const currentType = checkResult.rows[0].data_type;
      console.log(`Current technician_id type: ${currentType}`);
      
      if (currentType === 'uuid') {
        console.log('Converting technician_id from UUID to VARCHAR(100)...');
        await client.query(`
          ALTER TABLE expense_submissions 
          ALTER COLUMN technician_id TYPE VARCHAR(100) USING technician_id::text
        `);
        console.log('✅ expense_submissions.technician_id updated');
      } else {
        console.log('✅ technician_id is already VARCHAR(100)');
      }
    } else {
      console.log('⚠️ expense_submissions table does not exist yet');
    }
    
    // Check expense_settings table
    const checkSettingsQuery = `
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expense_settings' 
      AND column_name = 'technician_id'
    `;
    const checkSettingsResult = await client.query(checkSettingsQuery);
    
    if (checkSettingsResult.rows.length > 0) {
      const currentType = checkSettingsResult.rows[0].data_type;
      console.log(`Current expense_settings.technician_id type: ${currentType}`);
      
      if (currentType === 'uuid') {
        console.log('Converting expense_settings.technician_id from UUID to VARCHAR(100)...');
        await client.query(`
          ALTER TABLE expense_settings 
          ALTER COLUMN technician_id TYPE VARCHAR(100) USING technician_id::text
        `);
        console.log('✅ expense_settings.technician_id updated');
      } else {
        console.log('✅ expense_settings.technician_id is already VARCHAR(100)');
      }
    }
    
    await client.query('COMMIT');
    console.log('✨ Done!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTechnicianId()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
