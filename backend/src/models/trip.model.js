const pool = require('../config/database');

class Trip {
  /**
   * Generate unique trip number: TR-YYYY-NNNN
   */
  static async generateTripNumber() {
    const year = new Date().getFullYear();
    const query = `
      SELECT COUNT(*) as count 
      FROM trips 
      WHERE trip_number LIKE $1
    `;
    const result = await pool.query(query, [`TR-${year}-%`]);
    const count = parseInt(result.rows[0].count) + 1;
    return `TR-${year}-${String(count).padStart(4, '0')}`;
  }

  /**
   * Create a new trip
   */
  static async create(tripData) {
    // Generate trip number if not provided
    if (!tripData.trip_number) {
      tripData.trip_number = await this.generateTripNumber();
    }

    const query = `
      INSERT INTO trips (
        trip_number, trip_type, status, engineer_id,
        planned_start_date, planned_end_date,
        job_type, job_description, work_hours_estimate,
        selected_travel_mode, total_distance_km, total_travel_hours,
        estimated_total_cost, notes, metadata,
        einsatzart, auftrag, reisekostenpauschale, use_flat_rate, parts_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      tripData.trip_number,
      tripData.trip_type || 'single',
      tripData.status || 'draft',
      tripData.engineer_id || null,
      tripData.planned_start_date || null,
      tripData.planned_end_date || null,
      tripData.job_type || null,
      tripData.job_description || null,
      tripData.work_hours_estimate || null,
      tripData.selected_travel_mode || null,
      tripData.total_distance_km || null,
      tripData.total_travel_hours || null,
      tripData.estimated_total_cost || null,
      tripData.notes || null,
      JSON.stringify(tripData.metadata || {}),
      tripData.einsatzart || null,
      tripData.auftrag || null,
      tripData.reisekostenpauschale || null,
      tripData.use_flat_rate || false,
      tripData.parts_text || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all trips with filters
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM trips WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.trip_type) {
      query += ` AND trip_type = $${paramCount}`;
      values.push(filters.trip_type);
      paramCount++;
    }

    if (filters.engineer_id) {
      query += ` AND engineer_id = $${paramCount}`;
      values.push(filters.engineer_id);
      paramCount++;
    }

    if (filters.date_from) {
      query += ` AND planned_start_date >= $${paramCount}`;
      values.push(filters.date_from);
      paramCount++;
    }

    if (filters.date_to) {
      query += ` AND planned_start_date <= $${paramCount}`;
      values.push(filters.date_to);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get trip by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM trips WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get trip by trip number
   */
  static async findByTripNumber(tripNumber) {
    const query = 'SELECT * FROM trips WHERE trip_number = $1';
    const result = await pool.query(query, [tripNumber]);
    return result.rows[0];
  }

  /**
   * Update trip
   */
  static async update(id, tripData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'status', 'engineer_id', 'planned_start_date', 'planned_end_date',
      'actual_start_date', 'actual_end_date', 'job_type', 'job_description',
      'work_hours_estimate', 'work_hours_actual', 'selected_travel_mode',
      'total_distance_km', 'total_travel_hours', 'estimated_total_cost',
      'actual_total_cost', 'optimized_route', 'notes', 'metadata',
      'einsatzart', 'auftrag', 'reisekostenpauschale', 'use_flat_rate', 'parts_text'
    ];

    for (const field of allowedFields) {
      if (tripData[field] !== undefined) {
        if (field === 'metadata' || field === 'optimized_route') {
          updates.push(`${field} = $${paramCount}`);
          values.push(JSON.stringify(tripData[field]));
        } else {
          updates.push(`${field} = $${paramCount}`);
          values.push(tripData[field]);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE trips 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete trip (soft delete by setting status to cancelled)
   */
  static async delete(id) {
    return await this.update(id, { status: 'cancelled' });
  }

  /**
   * Add customer to trip
   */
  static async addCustomer(tripId, customerId, customerData = {}) {
    const query = `
      INSERT INTO trip_customers (
        trip_id, customer_id, work_percentage, cost_percentage, visit_order,
        visit_duration_hours, visit_notes,
        masch_typ, seriennr, job_task
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (trip_id, customer_id)
      DO UPDATE SET
        work_percentage = EXCLUDED.work_percentage,
        cost_percentage = EXCLUDED.cost_percentage,
        visit_order = EXCLUDED.visit_order,
        visit_duration_hours = EXCLUDED.visit_duration_hours,
        visit_notes = EXCLUDED.visit_notes,
        masch_typ = EXCLUDED.masch_typ,
        seriennr = EXCLUDED.seriennr,
        job_task = EXCLUDED.job_task
      RETURNING *
    `;

    const values = [
      tripId,
      customerId,
      customerData.work_percentage || 0,
      customerData.cost_percentage || 0,
      customerData.visit_order || null,
      customerData.visit_duration_hours || null,
      customerData.visit_notes || null,
      customerData.masch_typ || null,
      customerData.seriennr || null,
      customerData.job_task || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all customers for a trip
   */
  static async getCustomers(tripId) {
    const query = `
      SELECT 
        tc.*,
        c.name as customer_name,
        c.email as customer_email,
        c.city as customer_city,
        c.country as customer_country
      FROM trip_customers tc
      JOIN customers c ON tc.customer_id = c.id
      WHERE tc.trip_id = $1
      ORDER BY tc.visit_order NULLS LAST, tc.created_at
    `;

    const result = await pool.query(query, [tripId]);
    return result.rows;
  }

  /**
   * Remove customer from trip
   */
  static async removeCustomer(tripId, customerId) {
    const query = 'DELETE FROM trip_customers WHERE trip_id = $1 AND customer_id = $2';
    await pool.query(query, [tripId, customerId]);
  }

  /**
   * Update trip type based on number of customers
   */
  static async updateTripType(tripId) {
    const customers = await this.getCustomers(tripId);
    const customerCount = customers.length;

    let tripType = 'single';
    if (customerCount > 1) {
      tripType = 'combined';
    }

    return await this.update(tripId, { trip_type: tripType });
  }
}

module.exports = Trip;


