const express = require('express');
const router = express.Router();
const technicianService = require('../services/technician.service');

/**
 * GET /api/technicians
 * Get all active technicians
 */
router.get('/', async (req, res) => {
  try {
    const technicians = await technicianService.getAllTechnicians();
    res.json({
      success: true,
      data: technicians
    });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/technicians/default
 * Get default technician
 */
router.get('/default', async (req, res) => {
  try {
    const technician = await technicianService.getDefaultTechnician();
    if (!technician) {
      return res.json({
        success: false,
        message: 'No default technician found'
      });
    }
    res.json({
      success: true,
      data: technician
    });
  } catch (error) {
    console.error('Error fetching default technician:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/technicians/:id
 * Get technician by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const technician = await technicianService.getTechnicianById(req.params.id);
    if (!technician) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }
    res.json({
      success: true,
      data: technician
    });
  } catch (error) {
    console.error('Error fetching technician:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/technicians
 * Create or update technician
 */
router.post('/', async (req, res) => {
  try {
    const technician = await technicianService.saveTechnician(req.body);
    res.json({
      success: true,
      data: technician
    });
  } catch (error) {
    console.error('Error saving technician:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/technicians/:id
 * Update technician
 */
router.put('/:id', async (req, res) => {
  try {
    const technician = await technicianService.saveTechnician({
      ...req.body,
      id: req.params.id
    });
    res.json({
      success: true,
      data: technician
    });
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/technicians/:id
 * Delete technician (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    await technicianService.deleteTechnician(req.params.id);
    res.json({
      success: true,
      message: 'Technician deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


