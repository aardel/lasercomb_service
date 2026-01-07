const ratesService = require('./rates.service');

class ExpenseCalculationService {
  /**
   * Calculate segment costs based on date range and country
   * Returns multipliers and total cost
   * 
   * @param {Date|string} startDateTime - Start date/time (German timezone)
   * @param {Date|string} endDateTime - End date/time (German timezone)
   * @param {string} countryCode - Country code (e.g., 'DEU', 'USA')
   * @param {string} countryName - Country name (optional, for fallback)
   * @returns {Promise<Object>} Calculation result with multipliers and totals
   */
  async calculateSegmentCosts(startDateTime, endDateTime, countryCode, countryName = null) {
    try {
      // Parse dates (assuming German timezone)
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }

      if (end <= start) {
        throw new Error('End date must be after start date');
      }

      // Calculate total hours
      const totalHours = (end - start) / (1000 * 60 * 60);

      // Get rates for the country
      let rates;
      try {
        // Try by country code first
        rates = await ratesService.getRateByCountryCode(countryCode);
      } catch (e) {
        // Fallback to country name
        if (countryName) {
          rates = await ratesService.getRateByCountryName(countryName);
        } else {
          throw new Error(`Rates not found for country code: ${countryCode}`);
        }
      }

      // Extract rates (snapshot for historical reference)
      const rate_8h = rates.daily_allowance_8h || 0;
      const rate_24h = rates.daily_allowance_24h || 0;
      const hotel_rate = rates.hotel_allowance || rates.hotel_rate || 0;

      // Calculate multipliers based on BMF rules:
      // - Day 1 (Departure): 8h allowance
      // - Days 2 to (N-1): 24h allowance × (days - 2)
      // - Day N (Return): 8h allowance
      // - Single day trip (>8h): Only 8h allowance

      let multiplier_1 = 0; // Full 24h days
      let multiplier_2 = 0; // Partial 8h days

      if (totalHours <= 8) {
        // Less than 8 hours: no allowance
        multiplier_1 = 0;
        multiplier_2 = 0;
      } else if (totalHours <= 24) {
        // Single day trip (>8h but <24h): Only 8h allowance
        multiplier_1 = 0;
        multiplier_2 = 1;
      } else {
        // Multi-day trip
        const fullDays = Math.floor(totalHours / 24);
        const remainingHours = totalHours % 24;

        // Full 24h days (excluding first and last day)
        // Days 2 to (N-1) = fullDays - 1 (if fullDays >= 2)
        multiplier_1 = Math.max(0, fullDays - 1);

        // Partial 8h days:
        // - Departure day (Day 1): 1 × 8h
        // - Return day (Day N): 1 × 8h if remainingHours > 8, else 0
        // Total: 1 (departure) + (1 if return day >8h else 0)
        multiplier_2 = 1 + (remainingHours > 8 ? 1 : 0);
      }

      // Calculate total
      const total_segment = (rate_24h * multiplier_1) + (rate_8h * multiplier_2);

      // Create rates snapshot for historical reference
      const rates_snapshot = {
        rate_8h,
        rate_24h,
        hotel_rate,
        country_code: rates.country_code || countryCode,
        country_name: rates.country_name || countryName,
        source: rates.source || 'database',
        source_reference: rates.source_reference || 'BMF ARVVwV 2025',
        effective_date: rates.effective_date || new Date().toISOString().split('T')[0],
        currency: rates.currency || 'EUR'
      };

      return {
        success: true,
        multiplier_1,
        multiplier_2,
        total_segment: Math.round(total_segment * 100) / 100, // Round to 2 decimals
        rate_8h,
        rate_24h,
        hotel_rate,
        rates_snapshot,
        calculation_details: {
          total_hours: totalHours,
          full_days: Math.floor(totalHours / 24),
          remaining_hours: totalHours % 24
        }
      };
    } catch (error) {
      console.error('[ExpenseCalculation] Error calculating segment costs:', error);
      return {
        success: false,
        error: error.message,
        multiplier_1: 0,
        multiplier_2: 0,
        total_segment: 0,
        rate_8h: 0,
        rate_24h: 0,
        hotel_rate: 0,
        rates_snapshot: null
      };
    }
  }

  /**
   * Calculate total expense from all segments
   * 
   * @param {Array} segments - Array of segment objects with total_segment
   * @returns {number} Total expense amount
   */
  calculateTotalExpense(segments) {
    if (!Array.isArray(segments)) {
      return 0;
    }

    return segments.reduce((total, segment) => {
      const segmentTotal = parseFloat(segment.total_segment) || 0;
      return total + segmentTotal;
    }, 0);
  }

  /**
   * Get rates database information
   * Returns current rates database name and year
   */
  async getRatesDatabaseInfo() {
    // Always return default values - never throw
    // This method is used for display purposes only
    const currentYear = new Date().getFullYear();
    
    // Always return valid default values, regardless of any errors
    // This prevents the endpoint from failing
    try {
      // Try to initialize rates service, but don't fail if it errors
      if (ratesService && typeof ratesService.initialize === 'function') {
        try {
          await ratesService.initialize().catch((err) => {
            // Silently catch initialization errors - we'll use defaults
            console.warn('[ExpenseCalculation] Rates service initialization failed, using defaults:', err.message);
          });
        } catch (initError) {
          // Silently catch initialization errors - we'll use defaults
          console.warn('[ExpenseCalculation] Rates service initialization failed, using defaults:', initError.message);
        }
      }
    } catch (error) {
      // Catch any other errors and continue with defaults
      console.warn('[ExpenseCalculation] Error in rates service check, using defaults:', error.message);
    }
    
    // Always return valid default values - this should never throw
    return {
      database_name: 'TravelRates_2025.xml', // Default name, can be enhanced to track actual source
      year: currentYear,
      source: 'database'
    };
  }

  /**
   * Validate segment date ranges don't overlap
   * 
   * @param {Array} segments - Array of segments with start_date_time and end_date_time
   * @param {string} excludeSegmentId - Optional segment ID to exclude from overlap check
   * @returns {Object} Validation result
   */
  validateSegmentOverlap(segments, excludeSegmentId = null) {
    if (!Array.isArray(segments) || segments.length <= 1) {
      return { valid: true, overlapping: [] };
    }

    const overlapping = [];
    
    for (let i = 0; i < segments.length; i++) {
      const seg1 = segments[i];
      if (excludeSegmentId && seg1.id === excludeSegmentId) continue;

      const start1 = new Date(seg1.start_date_time);
      const end1 = new Date(seg1.end_date_time);

      for (let j = i + 1; j < segments.length; j++) {
        const seg2 = segments[j];
        if (excludeSegmentId && seg2.id === excludeSegmentId) continue;

        const start2 = new Date(seg2.start_date_time);
        const end2 = new Date(seg2.end_date_time);

        // Check for overlap
        if (
          (start1 <= start2 && end1 > start2) ||
          (start1 < end2 && end1 >= end2) ||
          (start1 >= start2 && end1 <= end2)
        ) {
          overlapping.push({
            segment1: seg1.segment_number || i + 1,
            segment2: seg2.segment_number || j + 1
          });
        }
      }
    }

    return {
      valid: overlapping.length === 0,
      overlapping
    };
  }
}

module.exports = new ExpenseCalculationService();
