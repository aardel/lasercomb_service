const express = require('express');
const router = express.Router();
const tripService = require('../services/trip.service');

/**
 * Get all trips
 * GET /api/trips?status=draft&trip_type=single
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      trip_type: req.query.trip_type,
      engineer_id: req.query.engineer_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const trips = await tripService.getAllTrips(filters);
    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trips',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get trip by ID
 * GET /api/trips/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const trip = await tripService.getTripById(req.params.id);
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    if (error.message === 'Trip not found') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * Create new trip
 * POST /api/trips
 * Body: {
 *   customer_ids: [uuid],
 *   engineer_id: uuid,
 *   planned_start_date: ISO date,
 *   planned_end_date: ISO date,
 *   job_type: string,
 *   job_description: string,
 *   work_hours_estimate: number,
 *   engineer_location: {lat, lng} or {address},
 *   work_percentages: [number] (for combined trips),
 *   visit_durations: [number] (for combined trips),
 *   notes: string,
 *   einsatzart: string (Installation, Service, Repair, etc.),
 *   auftrag: string (Order/Job number),
 *   reisekostenpauschale: number (Travel cost flat rate, optional),
 *   use_flat_rate: boolean (Use flat rate instead of calculated costs),
 *   parts_text: string (Simple text field for parts),
 *   excess_baggage: {cost: number, description: string} (Only when flight selected),
 *   customer_data: [{masch_typ: string, seriennr: string, job_task: string}] (Machine info per customer)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      customer_ids,
      engineer_id,
      planned_start_date,
      planned_end_date,
      job_type,
      job_description,
      work_hours_estimate,
      engineer_location,
      work_percentages,
      visit_durations,
      notes,
      einsatzart,
      auftrag,
      reisekostenpauschale,
      use_flat_rate,
      parts_text,
      excess_baggage,
      customer_data,
      selected_travel_mode
    } = req.body;

    // Validate required fields
    if (!customer_ids || customer_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one customer_id is required'
      });
    }

    if (customer_ids.length > 8) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 8 customers per trip'
      });
    }

    // Validate work percentages for combined trips
    if (customer_ids.length > 1 && work_percentages) {
      const total = work_percentages.reduce((sum, p) => sum + p, 0);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'Work percentages must sum to 100%'
        });
      }
    }

    const trip = await tripService.createTrip({
      customer_ids,
      engineer_id,
      planned_start_date,
      planned_end_date,
      job_type,
      job_description,
      work_hours_estimate,
      engineer_location,
      work_percentages,
      visit_durations,
      notes,
      einsatzart,
      auftrag,
      reisekostenpauschale,
      use_flat_rate,
      parts_text,
      excess_baggage,
      customer_data,
      selected_travel_mode,
      metadata: {
        engineer_location
      }
    });

    res.status(201).json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update trip
 * PUT /api/trips/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const trip = await tripService.updateTrip(req.params.id, req.body);
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete trip (soft delete)
 * DELETE /api/trips/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await tripService.deleteTrip(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Add customer to trip
 * POST /api/trips/:id/customers
 * Body: {
 *   customer_id: uuid,
 *   work_percentage: number,
 *   visit_order: number,
 *   visit_duration_hours: number,
 *   masch_typ: string (Machine type, customer-related),
 *   seriennr: string (Serial number, customer-related),
 *   job_task: string (Job task description, machine-related)
 * }
 */
router.post('/:id/customers', async (req, res) => {
  try {
    const { 
      customer_id, 
      work_percentage, 
      visit_order, 
      visit_duration_hours,
      masch_typ,
      seriennr,
      job_task
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: 'customer_id is required'
      });
    }

    const trip = await tripService.addCustomerToTrip(req.params.id, customer_id, {
      work_percentage,
      visit_order,
      visit_duration_hours,
      masch_typ,
      seriennr,
      job_task
    });

    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Error adding customer to trip:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Remove customer from trip
 * DELETE /api/trips/:id/customers/:customerId
 */
router.delete('/:id/customers/:customerId', async (req, res) => {
  try {
    const trip = await tripService.removeCustomerFromTrip(
      req.params.id,
      req.params.customerId
    );
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Error removing customer from trip:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Recalculate trip costs
 * POST /api/trips/:id/recalculate
 */
router.post('/:id/recalculate', async (req, res) => {
  try {
    const trip = await tripService.calculateAndUpdateTripCosts(req.params.id);
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Error recalculating costs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

