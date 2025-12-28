const express = require('express');
const router = express.Router();
const { geocodeAddress } = require('../services/geocoding.service');
const { calculateDistance } = require('../services/distance.service');

// Test geocoding endpoint
router.get('/geocode', async (req, res) => {
  try {
    const { address, city, country } = req.query;
    
    if (!address || !city || !country) {
      return res.status(400).json({ 
        error: 'Missing required parameters: address, city, country' 
      });
    }
    
    const result = await geocodeAddress(address, city, country);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test distance calculation endpoint
router.get('/distance', async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;
    
    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters: origin_lat, origin_lng, dest_lat, dest_lng' 
      });
    }
    
    const result = await calculateDistance(
      { lat: parseFloat(origin_lat), lng: parseFloat(origin_lng) },
      { lat: parseFloat(dest_lat), lng: parseFloat(dest_lng) }
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test distance by address
router.get('/distance-address', async (req, res) => {
  try {
    const { origin, destination } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Missing required parameters: origin, destination' 
      });
    }
    
    const result = await calculateDistance(
      { address: origin },
      { address: destination }
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

