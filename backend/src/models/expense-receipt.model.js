const pool = require('../config/database');

class ExpenseReceipt {
  static async create(receiptData) {
    const query = `
      INSERT INTO expense_receipts (
        expense_submission_id, receipt_number,
        description, currency_code, amount_original,
        exchange_rate, amount_eur, receipt_image_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      receiptData.expense_submission_id,
      receiptData.receipt_number,
      receiptData.description || null,
      receiptData.currency_code || 'EUR',
      receiptData.amount_original || 0.00,
      receiptData.exchange_rate || 1.000000,
      receiptData.amount_eur || 0.00,
      receiptData.receipt_image_path || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByExpenseSubmission(expenseSubmissionId) {
    const query = `
      SELECT * FROM expense_receipts 
      WHERE expense_submission_id = $1 
      ORDER BY receipt_number ASC
    `;
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = [
      'receipt_number', 'description', 'currency_code',
      'amount_original', 'exchange_rate', 'amount_eur',
      'receipt_image_path'
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
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE expense_receipts 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM expense_receipts WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async deleteByExpenseSubmission(expenseSubmissionId) {
    const query = 'DELETE FROM expense_receipts WHERE expense_submission_id = $1';
    await pool.query(query, [expenseSubmissionId]);
  }
}

module.exports = ExpenseReceipt;
