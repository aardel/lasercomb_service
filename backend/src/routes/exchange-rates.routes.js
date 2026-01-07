const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Get exchange rate
 * GET /api/exchange-rates?base=EUR&target=USD
 */
router.get('/', async (req, res) => {
  try {
    const { base = 'EUR', target } = req.query;

    if (!target) {
      return res.status(400).json({
        success: false,
        error: 'target currency is required'
      });
    }

    if (base === target) {
      return res.json({
        success: true,
        data: {
          base,
          target,
          rate: 1.0,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Try multiple exchange rate APIs (free tiers)
    let rate = null;
    let source = null;

    // Option 1: exchangerate-api.com (free tier: 1,500 requests/month)
    try {
      const apiKey = process.env.EXCHANGERATE_API_KEY;
      if (apiKey) {
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${base}/${target}`, {
          timeout: 5000
        });
        if (response.data && response.data.conversion_rate) {
          rate = response.data.conversion_rate;
          source = 'exchangerate-api.com';
        }
      }
    } catch (error) {
      console.log('[ExchangeRates] exchangerate-api.com failed, trying alternatives...');
    }

    // Option 2: fixer.io (free tier: 100 requests/month)
    if (!rate) {
      try {
        const apiKey = process.env.FIXER_API_KEY;
        if (apiKey) {
          const response = await axios.get(`http://data.fixer.io/api/latest?access_key=${apiKey}&base=${base}&symbols=${target}`, {
            timeout: 5000
          });
          if (response.data && response.data.success && response.data.rates && response.data.rates[target]) {
            rate = response.data.rates[target];
            source = 'fixer.io';
          }
        }
      } catch (error) {
        console.log('[ExchangeRates] fixer.io failed, trying alternatives...');
      }
    }

    // Option 3: European Central Bank (free, no API key, but limited currencies)
    if (!rate && base === 'EUR') {
      try {
        const response = await axios.get('https://api.exchangerate.host/latest?base=EUR', {
          timeout: 5000
        });
        if (response.data && response.data.rates && response.data.rates[target]) {
          rate = response.data.rates[target];
          source = 'exchangerate.host (ECB data)';
        }
      } catch (error) {
        console.log('[ExchangeRates] exchangerate.host failed');
      }
    }

    if (!rate) {
      return res.status(503).json({
        success: false,
        error: 'Unable to fetch exchange rate. Please check API keys or try again later.'
      });
    }

    res.json({
      success: true,
      data: {
        base,
        target,
        rate: parseFloat(rate.toFixed(6)),
        timestamp: new Date().toISOString(),
        source
      }
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exchange rate'
    });
  }
});

module.exports = router;
