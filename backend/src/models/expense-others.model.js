const pool = require('../config/database');

class ExpenseOthers {
  static async create(othersData) {
    const query = `
      INSERT INTO expense_others (
        expense_submission_id,
        notes, advanced_money_amount
      ) VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      othersData.expense_submission_id,
      othersData.notes ? JSON.stringify(othersData.notes) : '[]',
      othersData.advanced_money_amount || 0.00
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByExpenseSubmission(expenseSubmissionId) {
    const query = 'SELECT * FROM expense_others WHERE expense_submission_id = $1';
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }

  static async update(expenseSubmissionId, updateData) {
    const allowedFields = ['notes', 'advanced_money_amount'];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'notes' && updateData[key]) {
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
      UPDATE expense_others 
      SET ${updates.join(', ')}
      WHERE expense_submission_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(expenseSubmissionId) {
    const query = 'DELETE FROM expense_others WHERE expense_submission_id = $1 RETURNING *';
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }
}

module.exports = ExpenseOthers;
