const pool = require('../config/database');

class Customer {
  // Create customer
  static async create(customerData) {
    const query = `
      INSERT INTO customers (
        external_id, name, contact_name, email, phone, mobile,
        street_address, city, postal_code, country,
        latitude, longitude, nearest_airport_code, nearest_airport, place_id,
        cost_share_percentage, data_source, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      customerData.external_id || null,
      customerData.name,
      customerData.contact_name || null,
      customerData.email,
      customerData.phone,
      customerData.mobile || null,
      customerData.street_address || null,
      customerData.city,
      customerData.postal_code || null,
      customerData.country,
      customerData.latitude || null,
      customerData.longitude || null,
      customerData.nearest_airport_code || null,
      customerData.nearest_airport ? JSON.stringify(customerData.nearest_airport) : null,
      customerData.place_id || null,
      customerData.cost_share_percentage || 0,
      customerData.data_source || 'manual_entry',
      customerData.notes || null
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Get all customers
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM customers WHERE is_active = true';
    const values = [];
    let paramCount = 1;
    
    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }
    
    if (filters.data_source) {
      query += ` AND data_source = $${paramCount}`;
      values.push(filters.data_source);
      paramCount++;
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, values);
    return result.rows;
  }
  
  // Get by ID
  static async findById(id) {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
  
  // Update customer
  static async update(id, customerData) {
    const query = `
      UPDATE customers SET
        name = COALESCE($2, name),
        contact_name = COALESCE($3, contact_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        city = COALESCE($6, city),
        country = COALESCE($7, country),
        street_address = COALESCE($8, street_address),
        postal_code = COALESCE($9, postal_code),
        latitude = COALESCE($10, latitude),
        longitude = COALESCE($11, longitude),
        nearest_airport_code = COALESCE($12, nearest_airport_code),
        nearest_airport = COALESCE($13, nearest_airport),
        place_id = COALESCE($14, place_id),
        notes = COALESCE($15, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      customerData.name,
      customerData.contact_name,
      customerData.email,
      customerData.phone,
      customerData.city,
      customerData.country,
      customerData.street_address,
      customerData.postal_code,
      customerData.latitude,
      customerData.longitude,
      customerData.nearest_airport_code,
      customerData.nearest_airport ? JSON.stringify(customerData.nearest_airport) : null,
      customerData.place_id,
      customerData.notes
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }
  
  // Soft delete
  static async delete(id) {
    const query = 'UPDATE customers SET is_active = false WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = Customer;

