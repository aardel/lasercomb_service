const pool = require('../config/database');

class ExpenseSubmission {
  /**
   * Generate invoice number: {technician_initials}{unique_number}
   * Example: AD0001
   */
  static async generateInvoiceNumber(technicianInitials) {
    const initials = technicianInitials.toUpperCase().substring(0, 2);
    
    // Get the last invoice number for this technician
    const query = `
      SELECT invoice_number 
      FROM expense_submissions 
      WHERE invoice_number LIKE $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [`${initials}%`]);
    
    if (result.rows.length > 0) {
      const lastInvoice = result.rows[0].invoice_number;
      const lastNumber = parseInt(lastInvoice.substring(2)) || 0;
      const nextNumber = lastNumber + 1;
      return `${initials}${String(nextNumber).padStart(4, '0')}`;
    }
    
    // First invoice for this technician
    return `${initials}0001`;
  }

  /**
   * Create a new expense submission
   */
  static async create(expenseData) {
    const query = `
      INSERT INTO expense_submissions (
        trip_name, technician_id, invoice_number,
        rates_database_used, rates_year,
        total_daily_rate, total_expenses, personal_car_expenses,
        advanced_money, grand_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      expenseData.trip_name,
      expenseData.technician_id,
      expenseData.invoice_number,
      expenseData.rates_database_used || null,
      expenseData.rates_year || null,
      expenseData.total_daily_rate || 0.00,
      expenseData.total_expenses || 0.00,
      expenseData.personal_car_expenses || 0.00,
      expenseData.advanced_money || 0.00,
      expenseData.grand_total || 0.00
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get expense submission by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM expense_submissions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get expense submission by invoice number
   */
  static async findByInvoiceNumber(invoiceNumber) {
    const query = 'SELECT * FROM expense_submissions WHERE invoice_number = $1';
    const result = await pool.query(query, [invoiceNumber]);
    return result.rows[0] || null;
  }

  /**
   * Get expense submission by trip name
   */
  static async findByTripName(tripName) {
    const query = 'SELECT * FROM expense_submissions WHERE trip_name = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query(query, [tripName]);
    return result.rows[0] || null;
  }

  /**
   * Get all expense submissions for a technician
   */
  static async findByTechnician(technicianId, limit = 50) {
    const query = `
      SELECT * FROM expense_submissions 
      WHERE technician_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [technicianId, limit]);
    return result.rows;
  }

  /**
   * Get all expense submissions
   */
  static async findAll(limit = 100) {
    const query = `
      SELECT * FROM expense_submissions 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Update expense submission
   */
  static async update(id, updateData) {
    const allowedFields = [
      'trip_name', 'technician_id', 'invoice_number',
      'rates_database_used', 'rates_year',
      'total_daily_rate', 'total_expenses', 'personal_car_expenses',
      'advanced_money', 'grand_total'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE expense_submissions 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete expense submission (cascades to related tables)
   */
  static async delete(id) {
    const query = 'DELETE FROM expense_submissions WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Calculate and update totals
   */
  static async updateTotals(id) {
    // Get all related data
    const segmentsQuery = `
      SELECT COALESCE(SUM(total_segment), 0) as total 
      FROM expense_segments 
      WHERE expense_submission_id = $1
    `;
    const segmentsResult = await pool.query(segmentsQuery, [id]);

    const receiptsQuery = `
      SELECT COALESCE(SUM(amount_eur), 0) as total 
      FROM expense_receipts 
      WHERE expense_submission_id = $1
    `;
    const receiptsResult = await pool.query(receiptsQuery, [id]);

    const carUsageQuery = `
      SELECT personal_car_total, advanced_money_amount
      FROM expense_car_usage ecu
      LEFT JOIN expense_others eo ON eo.expense_submission_id = ecu.expense_submission_id
      WHERE ecu.expense_submission_id = $1
    `;
    const carUsageResult = await pool.query(carUsageQuery, [id]);

    const totalDailyRate = parseFloat(segmentsResult.rows[0]?.total || 0);
    const totalExpenses = parseFloat(receiptsResult.rows[0]?.total || 0);
    const personalCarExpenses = parseFloat(carUsageResult.rows[0]?.personal_car_total || 0);
    const advancedMoney = parseFloat(carUsageResult.rows[0]?.advanced_money_amount || 0);
    const grandTotal = totalDailyRate + totalExpenses + personalCarExpenses + advancedMoney;

    return await this.update(id, {
      total_daily_rate: totalDailyRate,
      total_expenses: totalExpenses,
      personal_car_expenses: personalCarExpenses,
      advanced_money: advancedMoney,
      grand_total: grandTotal
    });
  }
}

module.exports = ExpenseSubmission;
