const pool = require('../config/database');

class ExpenseCustomer {
  static async create(customerData) {
    const query = `
      INSERT INTO expense_customers (
        expense_submission_id, customer_number,
        customer_name, job_description
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      customerData.expense_submission_id,
      customerData.customer_number,
      customerData.customer_name || null,
      customerData.job_description || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByExpenseSubmission(expenseSubmissionId) {
    const query = `
      SELECT * FROM expense_customers 
      WHERE expense_submission_id = $1 
      ORDER BY customer_number ASC
    `;
    const result = await pool.query(query, [expenseSubmissionId]);
    return result.rows;
  }

  static async deleteByExpenseSubmission(expenseSubmissionId) {
    const query = 'DELETE FROM expense_customers WHERE expense_submission_id = $1';
    await pool.query(query, [expenseSubmissionId]);
  }
}

module.exports = ExpenseCustomer;
