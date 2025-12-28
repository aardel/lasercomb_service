const express = require('express');
const router = express.Router();
const { calculateDistance } = require('../services/distance.service');

/**
 * Calculate distance between two points
 * POST /api/distance/calculate
 * Body: { origin: {lat, lng} or {address}, destination: {lat, lng} or {address} }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: origin, destination'
      });
    }

    const result = await calculateDistance(origin, destination);
    
    res.json({
      success: true,
      data: {
        distance_km: result.distance_km,
        duration_minutes: result.duration_minutes,
        distance_text: result.distance_text,
        duration_text: result.duration_text
      }
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

