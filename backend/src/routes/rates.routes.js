const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ============================================================================
// GET ALL RATES
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        country_code,
        country_name,
        city_name,
        daily_allowance_8h,
        daily_allowance_24h,
        hotel_rate_max,
        agent_fee,
        company_fee,
        additional_fee_percent,
        currency,
        effective_from,
        effective_until,
        source_reference,
        created_at,
        updated_at
      FROM country_travel_rates
      ORDER BY country_name, city_name NULLS FIRST
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch rates'
    });
  }
});

// ============================================================================
// GET SINGLE RATE BY ID
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM country_travel_rates WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rate not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch rate'
    });
  }
});

// ============================================================================
// GET RATE BY COUNTRY CODE
// ============================================================================
router.get('/country/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { city } = req.query;
    
    let query = `
      SELECT * FROM country_travel_rates 
      WHERE country_code = $1 
      AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
      AND effective_from <= CURRENT_DATE
    `;
    const params = [code.toUpperCase()];
    
    if (city) {
      query += ' AND city_name = $2';
      params.push(city);
    } else {
      query += ' AND city_name IS NULL';
    }
    
    query += ' ORDER BY effective_from DESC LIMIT 1';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Rate not found for country code: ${code}`
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching rate by country:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch rate'
    });
  }
});

// ============================================================================
// CREATE NEW RATE
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const {
      country_code,
      country_name,
      city_name,
      daily_allowance_8h,
      daily_allowance_24h,
      hotel_rate_max,
      agent_fee = 0,
      company_fee = 0,
      additional_fee_percent = 0,
      currency = 'EUR',
      effective_from,
      effective_until,
      source_reference
    } = req.body;
    
    // Validation
    if (!country_code || !country_name || !daily_allowance_8h || !daily_allowance_24h || !hotel_rate_max || !effective_from) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: country_code, country_name, daily_allowance_8h, daily_allowance_24h, hotel_rate_max, effective_from'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO country_travel_rates (
        country_code, country_name, city_name,
        daily_allowance_8h, daily_allowance_24h, hotel_rate_max,
        agent_fee, company_fee, additional_fee_percent,
        currency, effective_from, effective_until, source_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      country_code.toUpperCase(),
      country_name,
      city_name || null,
      daily_allowance_8h,
      daily_allowance_24h,
      hotel_rate_max,
      agent_fee,
      company_fee,
      additional_fee_percent,
      currency,
      effective_from,
      effective_until || null,
      source_reference || 'Manual Entry'
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Rate created successfully'
    });
  } catch (error) {
    console.error('Error creating rate:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'A rate with this country, city, and effective date already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create rate'
    });
  }
});

// ============================================================================
// UPDATE RATE
// ============================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      country_code,
      country_name,
      city_name,
      daily_allowance_8h,
      daily_allowance_24h,
      hotel_rate_max,
      agent_fee,
      company_fee,
      additional_fee_percent,
      currency,
      effective_from,
      effective_until,
      source_reference
    } = req.body;
    
    const result = await pool.query(`
      UPDATE country_travel_rates SET
        country_code = COALESCE($1, country_code),
        country_name = COALESCE($2, country_name),
        city_name = $3,
        daily_allowance_8h = COALESCE($4, daily_allowance_8h),
        daily_allowance_24h = COALESCE($5, daily_allowance_24h),
        hotel_rate_max = COALESCE($6, hotel_rate_max),
        agent_fee = COALESCE($7, agent_fee),
        company_fee = COALESCE($8, company_fee),
        additional_fee_percent = COALESCE($9, additional_fee_percent),
        currency = COALESCE($10, currency),
        effective_from = COALESCE($11, effective_from),
        effective_until = $12,
        source_reference = COALESCE($13, source_reference),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      country_code?.toUpperCase(),
      country_name,
      city_name || null,
      daily_allowance_8h,
      daily_allowance_24h,
      hotel_rate_max,
      agent_fee,
      company_fee,
      additional_fee_percent,
      currency,
      effective_from,
      effective_until || null,
      source_reference,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rate not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Rate updated successfully'
    });
  } catch (error) {
    console.error('Error updating rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update rate'
    });
  }
});

// ============================================================================
// DELETE RATE
// ============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM country_travel_rates WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rate not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Rate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete rate'
    });
  }
});

// ============================================================================
// EXPORT RATES (JSON or CSV)
// ============================================================================
router.get('/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    
    const result = await pool.query(`
      SELECT 
        country_code,
        country_name,
        city_name,
        daily_allowance_8h,
        daily_allowance_24h,
        hotel_rate_max,
        agent_fee,
        company_fee,
        additional_fee_percent,
        currency,
        effective_from,
        effective_until,
        source_reference
      FROM country_travel_rates
      ORDER BY country_name, city_name NULLS FIRST
    `);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=travel_rates.json');
      res.json({
        export_date: new Date().toISOString(),
        rates: result.rows
      });
    } else if (format === 'csv') {
      const headers = [
        'country_code',
        'country_name',
        'city_name',
        'daily_allowance_8h',
        'daily_allowance_24h',
        'hotel_rate_max',
        'agent_fee',
        'company_fee',
        'additional_fee_percent',
        'currency',
        'effective_from',
        'effective_until',
        'source_reference'
      ];
      
      let csv = headers.join(',') + '\n';
      
      for (const row of result.rows) {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        });
        csv += values.join(',') + '\n';
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=travel_rates.csv');
      res.send(csv);
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid format. Use "json" or "csv"'
      });
    }
  } catch (error) {
    console.error('Error exporting rates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export rates'
    });
  }
});

// ============================================================================
// IMPORT RATES (JSON or CSV)
// ============================================================================
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const content = req.file.buffer.toString('utf-8');
    let rates = [];
    
    // Detect format
    const isJson = req.file.originalname.endsWith('.json') || content.trim().startsWith('{');
    
    if (isJson) {
      const parsed = JSON.parse(content);
      rates = parsed.rates || parsed;
    } else {
      // CSV parsing
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || null;
        });
        rates.push(row);
      }
    }
    
    // Option: clear existing or upsert
    const { mode = 'upsert' } = req.body; // 'replace' or 'upsert'
    
    if (mode === 'replace') {
      await pool.query('DELETE FROM country_travel_rates');
    }
    
    let imported = 0;
    let errors = [];
    
    for (const rate of rates) {
      try {
        await pool.query(`
          INSERT INTO country_travel_rates (
            country_code, country_name, city_name,
            daily_allowance_8h, daily_allowance_24h, hotel_rate_max,
            agent_fee, company_fee, additional_fee_percent,
            currency, effective_from, effective_until, source_reference
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (country_code, city_name, effective_from) 
          DO UPDATE SET
            country_name = EXCLUDED.country_name,
            daily_allowance_8h = EXCLUDED.daily_allowance_8h,
            daily_allowance_24h = EXCLUDED.daily_allowance_24h,
            hotel_rate_max = EXCLUDED.hotel_rate_max,
            agent_fee = EXCLUDED.agent_fee,
            company_fee = EXCLUDED.company_fee,
            additional_fee_percent = EXCLUDED.additional_fee_percent,
            currency = EXCLUDED.currency,
            effective_until = EXCLUDED.effective_until,
            source_reference = EXCLUDED.source_reference,
            updated_at = CURRENT_TIMESTAMP
        `, [
          rate.country_code?.toUpperCase(),
          rate.country_name,
          rate.city_name || null,
          parseFloat(rate.daily_allowance_8h) || 0,
          parseFloat(rate.daily_allowance_24h) || 0,
          parseFloat(rate.hotel_rate_max) || 0,
          parseFloat(rate.agent_fee) || 0,
          parseFloat(rate.company_fee) || 0,
          parseFloat(rate.additional_fee_percent) || 0,
          rate.currency || 'EUR',
          rate.effective_from || new Date().toISOString().split('T')[0],
          rate.effective_until || null,
          rate.source_reference || 'Imported'
        ]);
        imported++;
      } catch (err) {
        errors.push({
          country: rate.country_name,
          error: err.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Imported ${imported} rates`,
      imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing rates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import rates'
    });
  }
});

// ============================================================================
// CLEAR RATES CACHE
// ============================================================================
router.post('/cache/clear', async (req, res) => {
  try {
    const ratesService = require('../services/rates.service');
    ratesService.clearCache();
    
    res.json({
      success: true,
      message: 'Rates cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing rates cache:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
});

// ============================================================================
// GET DISTINCT COUNTRIES (for dropdowns)
// ============================================================================
router.get('/meta/countries', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT country_code, country_name 
      FROM country_travel_rates 
      ORDER BY country_name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch countries'
    });
  }
});

module.exports = router;

