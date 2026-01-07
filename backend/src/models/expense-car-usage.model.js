const pool = require('../config/database');

class ExpenseCarUsage {
  static async create(carUsageData) {
    const query = `
      INSERT INTO expense_car_usage (
        expense_submission_id,
        personal_car_number, personal_car_km, personal_car_rate, personal_car_total,
        company_car_number, company_car_total_km,
        rental_car_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      carUsageData.expense_submission_id,
      carUsageData.personal_car_number || null,
      carUsageData.personal_car_km || 0.00,
      carUsageData.personal_car_rate || 0.35,
      carUsageData.personal_car_total || 0.00,
      carUsageData.company_car_number || null,
      carUsageData.company_car_total_km || 0.00,
      carUsageData.rental_car_notes ? JSON.stringify(carUsageData.rental_car_notes) : '[]'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByExpenseSubmission(expenseSubmissionId) {
    const query = 'SELECT * FROM expense_car_usage WHERE expense_submission_id = $1';
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }

  static async update(expenseSubmissionId, updateData) {
    const allowedFields = [
      'personal_car_number', 'personal_car_km', 'personal_car_rate', 'personal_car_total',
      'company_car_number', 'company_car_total_km', 'rental_car_notes'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'rental_car_notes' && updateData[key]) {
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
      return await this.findByExpenseSubmission(expenseSubmissionId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(expenseSubmissionId);

    const query = `
      UPDATE expense_car_usage 
      SET ${updates.join(', ')}
      WHERE expense_submission_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(expenseSubmissionId) {
    const query = 'DELETE FROM expense_car_usage WHERE expense_submission_id = $1 RETURNING *';
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }
}

module.exports = ExpenseCarUsage;
