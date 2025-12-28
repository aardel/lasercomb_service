const express = require('express');
const router = express.Router();
const customerService = require('../services/customer.service');
const { findNearestAirport } = require('../services/airport.service');

// Find nearest airport (helper endpoint for frontend)
router.get('/find-airport', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    const airport = await findNearestAirport(parseFloat(lat), parseFloat(lng));
    
    if (!airport) {
      return res.json({
        success: false,
        message: 'No airport found nearby'
      });
    }
    
    res.json({
      success: true,
      data: airport
    });
  } catch (error) {
    console.error('Error finding airport:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all customers
router.get('/', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      data_source: req.query.data_source
    };
    const customers = await customerService.getAllCustomers(filters);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch customers',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get customer count - MUST be before /:id route
// Using /stats/count to ensure it's not matched by /:id
router.get('/stats/count', async (req, res) => {
  try {
    const count = await customerService.getCustomerCount();
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error getting customer count:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get customer count'
    });
  }
});

// Search customers (for autocomplete) - MUST be before /:id route
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const customers = await customerService.searchCustomers(q);
    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search customers'
    });
  }
});

// Lookup customer by place_id or address - MUST be before /:id route
router.get('/lookup', async (req, res) => {
  try {
    const { place_id, address, name, city } = req.query;
    
    if (!place_id && !address && !name) {
      return res.status(400).json({
        success: false,
        error: 'Either place_id, address, or name is required'
      });
    }
    
    // Validate and sanitize inputs
    const sanitizedPlaceId = place_id ? String(place_id).trim() : null;
    const sanitizedAddress = address ? String(address).trim() : null;
    const sanitizedName = name ? String(name).trim() : null;
    const sanitizedCity = city ? String(city).trim() : null;
    
    const customer = await customerService.getCustomerByPlaceId(
      sanitizedPlaceId || null, 
      sanitizedAddress || null, 
      sanitizedName || null, 
      sanitizedCity || null
    );
    
    if (!customer) {
      return res.json({
        success: false,
        data: null
      });
    }
    
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error looking up customer:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to lookup customer'
    });
  }
});

// Clear all customer airport data (nearest_airport, nearest_airport_code)
// This forces re-fetching of airports on next use
// MUST be before /:id route to avoid route conflicts
router.post('/clear-airports', async (req, res) => {
  try {
    const result = await customerService.clearAllCustomerAirports();
    res.json({
      success: true,
      message: `Cleared airport data for ${result.cleared} customers`,
      cleared: result.cleared
    });
  } catch (error) {
    console.error('Error clearing customer airports:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear customer airports'
    });
  }
});

// Delete all customers (destructive - use with caution)
// MUST be before /:id route to avoid route conflicts
// Using a more specific path to ensure it's matched before /:id
router.delete('/bulk/all', async (req, res) => {
  try {
    const result = await customerService.deleteAllCustomers();
    res.json({
      success: true,
      message: `Deleted ${result.deleted} customers`,
      deleted: result.deleted
    });
  } catch (error) {
    console.error('Error deleting all customers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete all customers'
    });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    if (error.message === 'Customer not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ 
        error: error.message || 'Failed to fetch customer',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    // Validate required fields - make city and country optional for quick saves
    if (!req.body.name || !req.body.email) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and email are required' 
      });
    }
    
    // Set defaults for optional fields
    if (!req.body.phone) req.body.phone = '';
    if (!req.body.city) req.body.city = 'Unknown';
    if (!req.body.country) req.body.country = 'Unknown';

    const customer = await customerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Handle duplicate email error
    if (error.code === '23505' && error.constraint === 'customers_email_key') {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }
    
    res.status(400).json({ 
      error: error.message || 'Failed to create customer',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(
      req.params.id,
      req.body
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to update customer',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete customer (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to delete customer',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
