const express = require('express');
const router = express.Router();
const costCalculatorService = require('../services/cost-calculator.service');
const Customer = require('../models/customer.model');
const pool = require('../config/database');

/**
 * Calculate costs for a trip
 * POST /api/costs/calculate
 * Body: {
 *   customer_id: UUID,
 *   engineer_location: {lat, lng} or {address},
 *   work_hours: number,
 *   date: YYYY-MM-DD
 * }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { customer_id, engineer_location, work_hours, date, meals_provided } = req.body;

    // Validate required fields
    if (!customer_id || !engineer_location || !work_hours || !date) {
      return res.status(400).json({
        error: 'Missing required fields: customer_id, engineer_location, work_hours, date'
      });
    }

    // Get customer data
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Prepare customer location
    const customer_location = customer.latitude && customer.longitude
      ? { lat: parseFloat(customer.latitude), lng: parseFloat(customer.longitude) }
      : { address: `${customer.city}, ${customer.country}` };

    // Calculate costs
    const costs = await costCalculatorService.calculateTripCosts({
      engineer_location,
      customer_location,
      customer_country: customer.country,
      customer_city: customer.city,
      work_hours: parseFloat(work_hours),
      customer_airport_code: customer.nearest_airport_code,
      meals_provided
    });

    res.json({
      success: true,
      data: costs,
      customer: {
        id: customer.id,
        name: customer.name,
        city: customer.city,
        country: customer.country
      }
    });
  } catch (error) {
    console.error('Cost calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Calculate costs for a multi-stop trip
 * POST /api/costs/calculate-multi-stop
 * Body: {
 *   engineer_location: {lat, lng} or {address},
 *   customers: Array of { customer_id, coordinates, city, country, work_hours },
 *   date: YYYY-MM-DD
 * }
 */
router.post('/calculate-multi-stop', async (req, res) => {
  try {
    const {
      engineer_location,
      customers,
      date,
      selected_flight,
      segment_flights,
      selected_rental_car,
      technician_settings,
      billing_settings,
      travel_times,
      cost_percentages
    } = req.body;

    if (!engineer_location || !customers || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: engineer_location, customers, date'
      });
    }

    // Validate customers array
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'customers must be a non-empty array'
      });
    }

    // Create mock trip_customers data for preview (if cost_percentages provided)
    let trip_customers = null;
    if (cost_percentages && Array.isArray(cost_percentages) && cost_percentages.length > 1) {
      trip_customers = customers.map((customer, index) => ({
        customer_id: customer.customer_id,
        customer_name: customer.name,
        cost_percentage: cost_percentages[index] || (100 / customers.length)
      }));
    }

    let costs;
    try {
      costs = await costCalculatorService.calculateMultiStopTripCosts({
        engineer_location,
        customers,
        date,
        selected_flight,
        segment_flights,
        selected_rental_car,
        technician_settings,
        billing_settings,
        travel_times,
        trip_customers
      });
    } catch (serviceError) {
      console.error('[CostRoute] ❌ Cost calculator service error:', serviceError);
      console.error('[CostRoute] Error stack:', serviceError.stack);
      return res.status(500).json({
        success: false,
        error: 'Cost calculation service encountered an error',
        message: serviceError.message || 'Unknown error occurred during cost calculation'
      });
    }

    // Ensure we always return a valid response
    if (!costs || typeof costs !== 'object') {
      console.warn('[CostRoute] ⚠️ Invalid results from cost calculator, returning error response');
      return res.status(500).json({
        success: false,
        error: 'Invalid response from cost calculation service'
      });
    }

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('[CostRoute] ❌ Unhandled error in multi-stop cost calculation:', error);
    console.error('[CostRoute] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during cost calculation',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * Get travel rates for a country/city
 * GET /api/costs/rates?country=DEU&city=Berlin
 */
router.get('/rates', async (req, res) => {
  try {
    const { country, city } = req.query;

    if (!country) {
      return res.status(400).json({ error: 'Country code is required' });
    }

    const rates = await costCalculatorService.getTravelRates(country, city || null);
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Rate lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Compare travel options (flight vs road)
 * POST /api/costs/compare-options
 * Body: {
 *   origin: {lat, lng} or {address},
 *   destination: {lat, lng} or {address},
 *   country: country code
 * }
 */
router.post('/compare-options', async (req, res) => {
  try {
    const { origin, destination, country } = req.body;

    if (!origin || !destination || !country) {
      return res.status(400).json({
        error: 'Missing required fields: origin, destination, country'
      });
    }

    const comparison = await costCalculatorService.compareTravelOptions(
      origin,
      destination,
      country
    );

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Travel comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


