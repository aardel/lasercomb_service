const pool = require('../config/database');

class ExpenseSettings {
  /**
   * Get settings for a technician (or global if technician_id is null)
   */
  static async findByTechnician(technicianId = null) {
    const query = 'SELECT * FROM expense_settings WHERE technician_id = $1 OR (technician_id IS NULL AND $1 IS NULL) LIMIT 1';
    const result = await pool.query(query, [technicianId]);
    return result.rows[0] || null;
  }

  /**
   * Create or update settings
   */
  static async upsert(settingsData) {
    const {
      technician_id,
      personal_number,
      department,
      invoice_number_sequence,
      smtp_config,
      default_emails
    } = settingsData;

    // Check if settings exist
    const existing = await this.findByTechnician(technician_id);
    
    if (existing) {
      // Update existing
      const updateQuery = `
        UPDATE expense_settings
        SET 
          personal_number = $1,
          department = $2,
          invoice_number_sequence = $3,
          smtp_config = $4,
          default_emails = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE technician_id = $6 OR (technician_id IS NULL AND $6 IS NULL)
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        personal_number || null,
        department || null,
        invoice_number_sequence || 1,
        smtp_config ? JSON.stringify(smtp_config) : null,
        default_emails ? JSON.stringify(default_emails) : null,
        technician_id
      ]);
      return result.rows[0];
    } else {
      // Create new
      const insertQuery = `
        INSERT INTO expense_settings (
          technician_id, personal_number, department,
          invoice_number_sequence, smtp_config, default_emails
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        technician_id || null,
        personal_number || null,
        department || null,
        invoice_number_sequence || 1,
        smtp_config ? JSON.stringify(smtp_config) : null,
        default_emails ? JSON.stringify(default_emails) : null
      ]);
      return result.rows[0];
    }
  }

  /**
   * Get next invoice number sequence for a technician
   */
  static async getNextInvoiceSequence(technicianId) {
    const settings = await this.findByTechnician(technicianId);
    if (settings && settings.invoice_number_sequence) {
      return settings.invoice_number_sequence;
    }
    return 1;
  }

  /**
   * Increment invoice number sequence for a technician
   */
  static async incrementInvoiceSequence(technicianId) {
    const settings = await this.findByTechnician(technicianId);
    const nextSequence = settings && settings.invoice_number_sequence 
      ? settings.invoice_number_sequence + 1 
      : 1;
    
    await this.upsert({
      technician_id: technicianId,
      invoice_number_sequence: nextSequence
    });
    
    return nextSequence;
  }
}

module.exports = ExpenseSettings;
