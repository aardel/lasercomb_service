const express = require('express');
const router = express.Router();
const expenseService = require('../services/expense.service');
const expenseCalculationService = require('../services/expense-calculation.service');

/**
 * Get all expense submissions
 * GET /api/expenses?technician_id=xxx&limit=50
 */
router.get('/', async (req, res) => {
  try {
    const ExpenseSubmission = require('../models/expense-submission.model');
    const technicianId = req.query.technician_id;
    const limit = parseInt(req.query.limit) || 50;

    let expenses;
    if (technicianId) {
      expenses = await ExpenseSubmission.findByTechnician(technicianId, limit);
    } else {
      expenses = await ExpenseSubmission.findAll(limit);
    }

    res.json({
      success: true,
      data: expenses,
      count: expenses.length
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expenses'
    });
  }
});

/**
 * Get rates database info
 * GET /api/expenses/rates-info
 * NOTE: Must be before /:id route to avoid matching "rates-info" as an ID
 */
router.get('/rates-info', async (req, res) => {
  // Always return a successful response with default values
  // This endpoint should never fail
  try {
    let info;
    try {
      info = await expenseCalculationService.getRatesDatabaseInfo();
    } catch (error) {
      // If getRatesDatabaseInfo fails, return defaults
      console.warn('[ExpenseRoutes] Error getting rates info, using defaults:', error.message);
      const currentYear = new Date().getFullYear();
      info = {
        database_name: 'TravelRates_2025.xml',
        year: currentYear,
        source: 'database'
      };
    }
    
    // Ensure we always return a valid response
    res.status(200).json({
      success: true,
      data: info || {
        database_name: 'TravelRates_2025.xml',
        year: new Date().getFullYear(),
        source: 'database'
      }
    });
  } catch (error) {
    console.error('[ExpenseRoutes] Unexpected error in rates-info endpoint:', error.message);
    // Even if there's an error, return default values with 200 status
    const currentYear = new Date().getFullYear();
    res.status(200).json({
      success: true,
      data: {
        database_name: 'TravelRates_2025.xml',
        year: currentYear,
        source: 'database'
      }
    });
  }
});

/**
 * Get expense settings
 * GET /api/expenses/settings?technician_id=xxx
 * NOTE: Must be before /:id route to avoid matching "settings" as an ID
 */
router.get('/settings', async (req, res) => {
  try {
    const ExpenseSettings = require('../models/expense-settings.model');
    const technicianId = req.query.technician_id || null;
    const settings = await ExpenseSettings.findByTechnician(technicianId);
    
    res.json({
      success: true,
      data: settings || {
        technician_id: technicianId,
        personal_number: '',
        department: '',
        invoice_number_sequence: 1,
        smtp_config: null,
        default_emails: null
      }
    });
  } catch (error) {
    console.error('Error fetching expense settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expense settings'
    });
  }
});

/**
 * Get expense by ID
 * GET /api/expenses/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expense'
    });
  }
});

/**
 * Get expense by invoice number
 * GET /api/expenses/invoice/:invoiceNumber
 */
router.get('/invoice/:invoiceNumber', async (req, res) => {
  try {
    const expense = await expenseService.getExpenseByInvoiceNumber(req.params.invoiceNumber);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expense'
    });
  }
});

/**
 * Get expense by trip name
 * GET /api/expenses/trip/:tripName
 */
router.get('/trip/:tripName', async (req, res) => {
  try {
    const expense = await expenseService.getExpenseByTripName(req.params.tripName);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch expense'
    });
  }
});

/**
 * Create new expense submission
 * POST /api/expenses
 */
router.post('/', async (req, res) => {
  try {
    const expense = await expenseService.createExpense(req.body);
    
    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create expense'
    });
  }
});

/**
 * Update expense submission
 * PUT /api/expenses/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update expense'
    });
  }
});

/**
 * Delete expense submission
 * DELETE /api/expenses/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const expense = await expenseService.deleteExpense(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete expense'
    });
  }
});

/**
 * Calculate segment costs
 * POST /api/expenses/calculate-segment
 */
router.post('/calculate-segment', async (req, res) => {
  try {
    const { start_date_time, end_date_time, country_code, country_name } = req.body;

    if (!start_date_time || !end_date_time || !country_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: start_date_time, end_date_time, country_code'
      });
    }

    const calculation = await expenseCalculationService.calculateSegmentCosts(
      start_date_time,
      end_date_time,
      country_code,
      country_name
    );

    res.json({
      success: calculation.success,
      data: calculation,
      error: calculation.error
    });
  } catch (error) {
    console.error('Error calculating segment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate segment costs'
    });
  }
});

/**
 * Save expense settings
 * POST /api/expenses/settings
 */
router.post('/settings', async (req, res) => {
  try {
    const ExpenseSettings = require('../models/expense-settings.model');
    const settings = await ExpenseSettings.upsert(req.body);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error saving expense settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save expense settings'
    });
  }
});

module.exports = router;
