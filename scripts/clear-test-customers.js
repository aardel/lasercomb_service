/**
 * Clear Test Customers from Database
 * 
 * This script deletes all test customers from the database.
 * 
 * Usage:
 *   cd backend && node ../scripts/clear-test-customers.js
 */

const path = require('path');

// Change to backend directory to use its node_modules and config
const backendDir = path.join(__dirname, '../backend');
process.chdir(backendDir);

// Use backend's database connection (path relative to backend directory)
const pool = require(path.join(backendDir, 'src/config/database'));

async function clearTestCustomers() {
  try {
    console.log('🔍 Checking for customers...');
    
    // First, show what customers exist
    const checkResult = await pool.query('SELECT id, name, email, data_source, created_at FROM customers ORDER BY created_at');
    
    if (checkResult.rows.length === 0) {
      console.log('✅ No customers found in database.');
      process.exit(0);
    }
    
    console.log(`\n📋 Found ${checkResult.rows.length} customer(s):`);
    checkResult.rows.forEach((customer, index) => {
      console.log(`   ${index + 1}. ${customer.name} (${customer.email}) - Source: ${customer.data_source || 'N/A'}`);
    });
    
    // Delete all customers (you can add filters here if needed)
    console.log('\n🗑️  Deleting all customers...');
    
    // Check if customers are referenced in trips (check for any trip_customers relationships)
    // First check if trip_customers table exists
    let tripsCount = 0;
    try {
      const tripsCheck = await pool.query(`
        SELECT COUNT(*) as count 
        FROM trips t
        INNER JOIN trip_customers tc ON t.id = tc.trip_id
        WHERE tc.customer_id IN (SELECT id FROM customers)
      `);
      tripsCount = parseInt(tripsCheck.rows[0].count);
      
      if (tripsCount > 0) {
        console.log(`⚠️  Warning: ${tripsCount} trip(s) reference these customers.`);
        console.log('   Deleting customers will also delete associated trip relationships.');
        
        // Delete trip_customers relationships first
        await pool.query('DELETE FROM trip_customers WHERE customer_id IN (SELECT id FROM customers)');
        console.log('   ✅ Deleted trip-customer relationships.');
      }
    } catch (err) {
      // Table might not exist or have different structure, continue anyway
      console.log('   ℹ️  No trip relationships found or table structure different.');
    }
    
    // Delete customers
    const deleteResult = await pool.query('DELETE FROM customers RETURNING id, name');
    
    console.log(`\n✅ Successfully deleted ${deleteResult.rows.length} customer(s):`);
    deleteResult.rows.forEach((customer) => {
      console.log(`   - ${customer.name} (${customer.id})`);
    });
    
    // Verify deletion
    const verifyResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log(`\n✅ Verification: ${verifyResult.rows[0].count} customer(s) remaining in database.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing customers:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearTestCustomers();
