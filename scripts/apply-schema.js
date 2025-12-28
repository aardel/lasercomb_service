/**
 * Apply Database Schema
 * 
 * This script applies the complete database schema to the database.
 * 
 * Usage:
 *   cd backend && node ../scripts/apply-schema.js
 */

const path = require('path');
const fs = require('fs');

// Change to backend directory to use its node_modules and config
const backendDir = path.join(__dirname, '../backend');
process.chdir(backendDir);

// Use backend's database connection
const pool = require(path.join(backendDir, 'src/config/database'));

async function applySchema() {
  try {
    console.log('📋 Applying database schema...');
    
    const schemaFile = path.join(__dirname, '../database/schema.sql');
    
    if (!fs.existsSync(schemaFile)) {
      console.error(`❌ Schema file not found: ${schemaFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(schemaFile, 'utf8');
    
    // Split SQL by semicolons and execute each statement
    // Note: This is a simplified approach. For production, consider using a proper SQL parser
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements to execute...`);
    
    let executed = 0;
    let errors = 0;
    
    for (const statement of statements) {
      try {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.length < 10) {
          continue;
        }
        
        await pool.query(statement);
        executed++;
        
        // Show progress for major operations
        if (statement.toUpperCase().includes('CREATE TABLE') || 
            statement.toUpperCase().includes('CREATE VIEW') ||
            statement.toUpperCase().includes('CREATE INDEX')) {
          const match = statement.match(/CREATE\s+(?:TABLE|VIEW|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
          if (match) {
            console.log(`   ✅ Created: ${match[1]}`);
          }
        }
      } catch (error) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || error.code === '42710' || error.message.includes('already exists')) {
          // Table/view/index already exists - this is OK
          continue;
        } else {
          errors++;
          console.error(`   ⚠️  Error executing statement: ${error.message}`);
          // Don't stop on errors - continue with other statements
        }
      }
    }
    
    console.log(`\n✅ Schema application complete!`);
    console.log(`   Executed: ${executed} statements`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} (some may be expected if objects already exist)`);
    }
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Database tables (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check for views
    const viewsResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (viewsResult.rows.length > 0) {
      console.log(`\n📊 Database views (${viewsResult.rows.length}):`);
      viewsResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();


