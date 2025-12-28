const express = require('express');
const router = express.Router();
const { autocompletePlaces, getPlaceDetails } = require('../services/places.service');
const { findNearestAirports } = require('../services/airport.service');

/**
 * Autocomplete places search
 * GET /api/places/autocomplete?input=company+name&country=DE
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { input, country } = req.query;
    
    if (!input || input.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const predictions = await autocompletePlaces(input, country);
    
    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get place details
 * GET /api/places/details?place_id=ChIJ...
 */
router.get('/details', async (req, res) => {
  try {
    const { place_id } = req.query;
    
    if (!place_id) {
      return res.status(400).json({
        success: false,
        error: 'place_id is required'
      });
    }

    const details = await getPlaceDetails(place_id);
    
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Find nearest airports to coordinates
 * GET /api/places/nearby-airports?lat=48.67&lng=9.44&limit=3
 */
router.get('/nearby-airports', async (req, res) => {
  try {
    const { lat, lng, limit, country } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }

    const numLimit = limit ? parseInt(limit) : 3;
    const airports = await findNearestAirports(
      { lat: parseFloat(lat), lng: parseFloat(lng), country: country || null },
      null,
      numLimit
    );

    res.json({
      success: true,
      data: airports
    });
  } catch (error) {
    console.error('Nearby airports error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


