const ExpenseSubmission = require('../models/expense-submission.model');
const ExpenseSegment = require('../models/expense-segment.model');
const ExpenseCustomer = require('../models/expense-customer.model');
const ExpenseReceipt = require('../models/expense-receipt.model');
const ExpenseCarUsage = require('../models/expense-car-usage.model');
const ExpenseOthers = require('../models/expense-others.model');
const ExpenseEmailNotes = require('../models/expense-email-notes.model');
const expenseCalculationService = require('./expense-calculation.service');

class ExpenseService {
  /**
   * Create a new expense submission with all related data
   */
  async createExpense(expenseData) {
    let expense = null;
    try {
      // Note: Transactions would require refactoring models to accept client parameter
      // For now, operations are performed sequentially

      // Generate invoice number if not provided
      let invoiceNumber = expenseData.invoice_number;
      if (!invoiceNumber && expenseData.technician_id) {
        // Get technician initials (assuming technician name is available)
        // This might need to be enhanced to get actual technician data
        const technicianInitials = this.extractInitials(expenseData.technician_name || expenseData.technician_id);
        invoiceNumber = await ExpenseSubmission.generateInvoiceNumber(technicianInitials);
      }

      // Get rates database info
      const ratesInfo = await expenseCalculationService.getRatesDatabaseInfo();

      // Create main expense submission
      expense = await ExpenseSubmission.create({
        trip_name: expenseData.trip_name,
        technician_id: expenseData.technician_id,
        invoice_number: invoiceNumber,
        rates_database_used: ratesInfo.database_name,
        rates_year: ratesInfo.year
      });

      // Create segments
      if (expenseData.segments && Array.isArray(expenseData.segments)) {
        for (let i = 0; i < expenseData.segments.length; i++) {
          const segmentData = expenseData.segments[i];
          
          // Calculate segment costs
          const calculation = await expenseCalculationService.calculateSegmentCosts(
            segmentData.start_date_time,
            segmentData.end_date_time,
            segmentData.country_code,
            segmentData.country_name
          );

          await ExpenseSegment.create({
            expense_submission_id: expense.id,
            segment_number: i + 1,
            country_code: segmentData.country_code,
            country_name: segmentData.country_name,
            start_date_time: segmentData.start_date_time,
            end_date_time: segmentData.end_date_time,
            rate_8h: calculation.rate_8h,
            rate_24h: calculation.rate_24h,
            hotel_rate: calculation.hotel_rate,
            multiplier_1: calculation.multiplier_1,
            multiplier_2: calculation.multiplier_2,
            total_segment: calculation.total_segment,
            rates_snapshot: calculation.rates_snapshot
          });
        }
      }

      // Create customers
      if (expenseData.customers && Array.isArray(expenseData.customers)) {
        for (const customer of expenseData.customers) {
          if (customer.customer_name || customer.job_description) {
            await ExpenseCustomer.create({
              expense_submission_id: expense.id,
              customer_number: customer.customer_number,
              customer_name: customer.customer_name,
              job_description: customer.job_description
            });
          }
        }
      }

      // Create receipts
      if (expenseData.receipts && Array.isArray(expenseData.receipts)) {
        for (const receipt of expenseData.receipts) {
          if (receipt.description || receipt.amount_original > 0) {
            await ExpenseReceipt.create({
              expense_submission_id: expense.id,
              receipt_number: receipt.receipt_number,
              description: receipt.description,
              currency_code: receipt.currency_code || 'EUR',
              amount_original: receipt.amount_original || 0,
              exchange_rate: receipt.exchange_rate || 1.0,
              amount_eur: receipt.amount_eur || receipt.amount_original || 0,
              receipt_image_path: receipt.receipt_image_path
            });
          }
        }
      }

      // Create car usage
      if (expenseData.car_usage) {
        await ExpenseCarUsage.create({
          expense_submission_id: expense.id,
          ...expenseData.car_usage
        });
      }

      // Create others
      if (expenseData.others) {
        await ExpenseOthers.create({
          expense_submission_id: expense.id,
          notes: expenseData.others.notes || [],
          advanced_money_amount: expenseData.others.advanced_money_amount || 0
        });
      }

      // Create email notes
      if (expenseData.email_notes) {
        await ExpenseEmailNotes.create({
          expense_submission_id: expense.id,
          ...expenseData.email_notes
        });
      }

      // Update totals
      await ExpenseSubmission.updateTotals(expense.id);
      const updatedExpense = await ExpenseSubmission.findById(expense.id);

      return updatedExpense;
    } catch (error) {
      // If error occurs, try to clean up (partial rollback)
      if (expense && expense.id) {
        try {
          await ExpenseSubmission.delete(expense.id);
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
      throw error;
    }
  }

  /**
   * Get expense by ID with all related data
   */
  async getExpenseById(id) {
    const expense = await ExpenseSubmission.findById(id);
    if (!expense) {
      return null;
    }

    const segments = await ExpenseSegment.findByExpenseSubmission(id);
    const customers = await ExpenseCustomer.findByExpenseSubmission(id);
    const receipts = await ExpenseReceipt.findByExpenseSubmission(id);
    const carUsage = await ExpenseCarUsage.findByExpenseSubmission(id);
    const others = await ExpenseOthers.findByExpenseSubmission(id);
    const emailNotes = await ExpenseEmailNotes.findByExpenseSubmission(id);

    return {
      ...expense,
      segments,
      customers,
      receipts,
      car_usage: carUsage,
      others,
      email_notes: emailNotes
    };
  }

  /**
   * Get expense by invoice number
   */
  async getExpenseByInvoiceNumber(invoiceNumber) {
    const expense = await ExpenseSubmission.findByInvoiceNumber(invoiceNumber);
    if (!expense) {
      return null;
    }
    return await this.getExpenseById(expense.id);
  }

  /**
   * Get expense by trip name
   */
  async getExpenseByTripName(tripName) {
    const expense = await ExpenseSubmission.findByTripName(tripName);
    if (!expense) {
      return null;
    }
    return await this.getExpenseById(expense.id);
  }

  /**
   * Update expense submission
   */
  async updateExpense(id, updateData) {
    try {
      // Note: Transactions would require refactoring models to accept client parameter

      // Update main expense
      if (updateData.expense) {
        await ExpenseSubmission.update(id, updateData.expense);
      }

      // Update segments
      if (updateData.segments) {
        // Delete existing segments
        await ExpenseSegment.deleteByExpenseSubmission(id);
        
        // Create new segments
        for (let i = 0; i < updateData.segments.length; i++) {
          const segmentData = updateData.segments[i];
          const calculation = await expenseCalculationService.calculateSegmentCosts(
            segmentData.start_date_time,
            segmentData.end_date_time,
            segmentData.country_code,
            segmentData.country_name
          );

          await ExpenseSegment.create({
            expense_submission_id: id,
            segment_number: i + 1,
            ...segmentData,
            rate_8h: calculation.rate_8h,
            rate_24h: calculation.rate_24h,
            hotel_rate: calculation.hotel_rate,
            multiplier_1: calculation.multiplier_1,
            multiplier_2: calculation.multiplier_2,
            total_segment: calculation.total_segment,
            rates_snapshot: calculation.rates_snapshot
          });
        }
      }

      // Update customers
      if (updateData.customers) {
        await ExpenseCustomer.deleteByExpenseSubmission(id);
        for (const customer of updateData.customers) {
          if (customer.customer_name || customer.job_description) {
            await ExpenseCustomer.create({
              expense_submission_id: id,
              customer_number: customer.customer_number,
              customer_name: customer.customer_name,
              job_description: customer.job_description
            });
          }
        }
      }

      // Update receipts
      if (updateData.receipts) {
        await ExpenseReceipt.deleteByExpenseSubmission(id);
        for (const receipt of updateData.receipts) {
          if (receipt.description || receipt.amount_original > 0) {
            await ExpenseReceipt.create({
              expense_submission_id: id,
              receipt_number: receipt.receipt_number,
              description: receipt.description,
              currency_code: receipt.currency_code || 'EUR',
              amount_original: receipt.amount_original || 0,
              exchange_rate: receipt.exchange_rate || 1.0,
              amount_eur: receipt.amount_eur || receipt.amount_original || 0,
              receipt_image_path: receipt.receipt_image_path
            });
          }
        }
      }

      // Update car usage
      if (updateData.car_usage) {
        const existing = await ExpenseCarUsage.findByExpenseSubmission(id);
        if (existing) {
          await ExpenseCarUsage.update(id, updateData.car_usage);
        } else {
          await ExpenseCarUsage.create({
            expense_submission_id: id,
            ...updateData.car_usage
          });
        }
      }

      // Update others
      if (updateData.others) {
        const existing = await ExpenseOthers.findByExpenseSubmission(id);
        if (existing) {
          await ExpenseOthers.update(id, updateData.others);
        } else {
          await ExpenseOthers.create({
            expense_submission_id: id,
            notes: updateData.others.notes || [],
            advanced_money_amount: updateData.others.advanced_money_amount || 0
          });
        }
      }

      // Update email notes
      if (updateData.email_notes) {
        const existing = await ExpenseEmailNotes.findByExpenseSubmission(id);
        if (existing) {
          await ExpenseEmailNotes.update(id, updateData.email_notes);
        } else {
          await ExpenseEmailNotes.create({
            expense_submission_id: id,
            ...updateData.email_notes
          });
        }
      }

      // Update totals
      await ExpenseSubmission.updateTotals(id);
      const updatedExpense = await ExpenseSubmission.findById(id);

      return updatedExpense;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete expense submission
   */
  async deleteExpense(id) {
    return await ExpenseSubmission.delete(id);
  }

  /**
   * Extract initials from name
   */
  extractInitials(name) {
    if (!name) return 'XX';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}

module.exports = new ExpenseService();
