const pool = require('../config/database');

class ExpenseSegment {
  /**
   * Create a new expense segment
   */
  static async create(segmentData) {
    const query = `
      INSERT INTO expense_segments (
        expense_submission_id, segment_number,
        country_code, country_name,
        start_date_time, end_date_time,
        rate_8h, rate_24h, hotel_rate,
        multiplier_1, multiplier_2, total_segment,
        rates_snapshot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      segmentData.expense_submission_id,
      segmentData.segment_number,
      segmentData.country_code || null,
      segmentData.country_name || null,
      segmentData.start_date_time,
      segmentData.end_date_time,
      segmentData.rate_8h || null,
      segmentData.rate_24h || null,
      segmentData.hotel_rate || null,
      segmentData.multiplier_1 || 0,
      segmentData.multiplier_2 || 0,
      segmentData.total_segment || 0.00,
      segmentData.rates_snapshot ? JSON.stringify(segmentData.rates_snapshot) : null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all segments for an expense submission
   */
  static async findByExpenseSubmission(expenseSubmissionId) {
    const query = `
      SELECT * FROM expense_segments 
      WHERE expense_submission_id = $1 
      ORDER BY segment_number ASC
    `;
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows;
  }

  /**
   * Get segment by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM expense_segments WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update segment
   */
  static async update(id, updateData) {
    const allowedFields = [
      'segment_number', 'country_code', 'country_name',
      'start_date_time', 'end_date_time',
      'rate_8h', 'rate_24h', 'hotel_rate',
      'multiplier_1', 'multiplier_2', 'total_segment',
      'rates_snapshot'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'rates_snapshot' && updateData[key]) {
          updates.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          updates.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE expense_segments 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete segment
   */
  static async delete(id) {
    const query = 'DELETE FROM expense_segments WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Delete all segments for an expense submission
   */
  static async deleteByExpenseSubmission(expenseSubmissionId) {
    const query = 'DELETE FROM expense_segments WHERE expense_submission_id = $1';
    await pool.query(query, [expenseSubmissionId]);
  }

  /**
   * Check for overlapping date ranges
   */
  static async checkOverlap(expenseSubmissionId, startDateTime, endDateTime, excludeSegmentId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM expense_segments
      WHERE expense_submission_id = $1
        AND (
          (start_date_time <= $2 AND end_date_time > $2)
          OR (start_date_time < $3 AND end_date_time >= $3)
          OR (start_date_time >= $2 AND end_date_time <= $3)
        )
    `;
    
    const values = [expenseSubmissionId, startDateTime, endDateTime];
    
    if (excludeSegmentId) {
      query += ' AND id != $4';
      values.push(excludeSegmentId);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = ExpenseSegment;
