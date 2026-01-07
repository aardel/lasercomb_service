const pool = require('../config/database');

class ExpenseEmailNotes {
  static async create(emailData) {
    const query = `
      INSERT INTO expense_email_notes (
        expense_submission_id,
        to_addresses, cc_addresses, from_address,
        subject, message, email_sent, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      emailData.expense_submission_id,
      emailData.to_addresses || null,
      emailData.cc_addresses || null,
      emailData.from_address || null,
      emailData.subject || null,
      emailData.message || null,
      emailData.email_sent || false,
      emailData.sent_at || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByExpenseSubmission(expenseSubmissionId) {
    const query = 'SELECT * FROM expense_email_notes WHERE expense_submission_id = $1';
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }

  static async update(expenseSubmissionId, updateData) {
    const allowedFields = [
      'to_addresses', 'cc_addresses', 'from_address',
      'subject', 'message', 'email_sent', 'sent_at'
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
      return await this.findByExpenseSubmission(expenseSubmissionId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(expenseSubmissionId);

    const query = `
      UPDATE expense_email_notes 
      SET ${updates.join(', ')}
      WHERE expense_submission_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async markAsSent(expenseSubmissionId) {
    const query = `
      UPDATE expense_email_notes 
      SET email_sent = true, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE expense_submission_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }

  static async delete(expenseSubmissionId) {
    const query = 'DELETE FROM expense_email_notes WHERE expense_submission_id = $1 RETURNING *';
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows[0] || null;
  }
}

module.exports = ExpenseEmailNotes;
