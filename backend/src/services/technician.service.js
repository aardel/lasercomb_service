const pool = require('../config/database');

/**
 * Convert country name to ISO 3166-1 alpha-3 code
 */
function getCountryCode(country) {
  if (!country) return null;
  
  // If value is too long (likely an address), try to extract country from it
  if (country.length > 10) {
    const lowerCountry = country.toLowerCase();
    // Try to find country name in the string
    if (lowerCountry.includes('germany') || lowerCountry.includes('deutschland')) return 'DEU';
    if (lowerCountry.includes('malta')) return 'MLT';
    if (lowerCountry.includes('france')) return 'FRA';
    if (lowerCountry.includes('united kingdom') || lowerCountry.includes('uk') || lowerCountry.includes('great britain')) return 'GBR';
    if (lowerCountry.includes('italy')) return 'ITA';
    if (lowerCountry.includes('spain')) return 'ESP';
    if (lowerCountry.includes('netherlands')) return 'NLD';
    if (lowerCountry.includes('belgium')) return 'BEL';
    if (lowerCountry.includes('austria')) return 'AUT';
    if (lowerCountry.includes('switzerland')) return 'CHE';
    // If we can't find a country, return null
    return null;
  }
  
  // If already a 3-letter code, return as-is
  if (country.length === 3 && country.match(/^[A-Z]{3}$/i)) {
    return country.toUpperCase();
  }
  
  // If it's a 2-letter code, convert to 3-letter
  const twoToThree = {
    'DE': 'DEU', 'MT': 'MLT', 'FR': 'FRA', 'GB': 'GBR', 'IT': 'ITA',
    'ES': 'ESP', 'NL': 'NLD', 'BE': 'BEL', 'AT': 'AUT', 'CH': 'CHE',
    'PL': 'POL', 'CZ': 'CZE', 'DK': 'DNK', 'SE': 'SWE', 'NO': 'NOR',
    'FI': 'FIN', 'PT': 'PRT', 'GR': 'GRC', 'IE': 'IRL', 'US': 'USA',
    'CA': 'CAN', 'AU': 'AUS', 'JP': 'JPN', 'CN': 'CHN', 'IN': 'IND'
  };
  if (country.length === 2 && country.match(/^[A-Z]{2}$/i)) {
    return twoToThree[country.toUpperCase()] || null;
  }
  
  // Country name to ISO code mapping
  const countryMap = {
    'germany': 'DEU',
    'deutschland': 'DEU',
    'malta': 'MLT',
    'france': 'FRA',
    'united kingdom': 'GBR',
    'uk': 'GBR',
    'great britain': 'GBR',
    'italy': 'ITA',
    'spain': 'ESP',
    'netherlands': 'NLD',
    'belgium': 'BEL',
    'austria': 'AUT',
    'switzerland': 'CHE',
    'poland': 'POL',
    'czech republic': 'CZE',
    'denmark': 'DNK',
    'sweden': 'SWE',
    'norway': 'NOR',
    'finland': 'FIN',
    'portugal': 'PRT',
    'greece': 'GRC',
    'ireland': 'IRL',
    'united states': 'USA',
    'usa': 'USA',
    'canada': 'CAN',
    'australia': 'AUS',
    'japan': 'JPN',
    'china': 'CHN',
    'india': 'IND',
    'brazil': 'BRA',
    'mexico': 'MEX',
    'south korea': 'KOR',
    'russia': 'RUS',
    'turkey': 'TUR',
    'south africa': 'ZAF',
    'argentina': 'ARG',
    'chile': 'CHL',
    'new zealand': 'NZL',
    'singapore': 'SGP',
    'thailand': 'THA',
    'malaysia': 'MYS',
    'indonesia': 'IDN',
    'philippines': 'PHL',
    'vietnam': 'VNM',
    'uae': 'ARE',
    'united arab emirates': 'ARE',
    'saudi arabia': 'SAU',
    'israel': 'ISR',
    'egypt': 'EGY',
    'morocco': 'MAR',
    'tunisia': 'TUN',
    'algeria': 'DZA'
  };
  
  const normalized = country.toLowerCase().trim();
  return countryMap[normalized] || null;
}

/**
 * Get all technicians
 */
async function getAllTechnicians() {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        home_address as "homeAddress",
        home_latitude as "homeCoordinates",
        home_longitude,
        country,
        transport_to_airport as "transportToAirport",
        taxi_cost as "taxiCost",
        parking_cost_per_day as "parkingCostPerDay",
        time_to_airport as "timeToAirport",
        airports,
        personal_number as "personalNumber",
        department,
        is_default as "isDefault",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM technicians 
      WHERE is_active = true 
      ORDER BY is_default DESC, name ASC`
    );
    
    // Transform homeCoordinates to object format
    return result.rows.map(tech => ({
      ...tech,
      homeCoordinates: tech.homeCoordinates ? {
        lat: parseFloat(tech.homeCoordinates),
        lng: parseFloat(tech.home_longitude)
      } : null
    }));
  } catch (error) {
    console.error('Error fetching technicians:', error);
    throw error;
  }
}

/**
 * Get technician by ID
 */
async function getTechnicianById(id) {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        home_address as "homeAddress",
        home_latitude as "homeCoordinates",
        home_longitude,
        country,
        transport_to_airport as "transportToAirport",
        taxi_cost as "taxiCost",
        parking_cost_per_day as "parkingCostPerDay",
        time_to_airport as "timeToAirport",
        airports,
        personal_number as "personalNumber",
        department,
        is_default as "isDefault",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM technicians 
      WHERE id = $1 AND is_active = true`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tech = result.rows[0];
    return {
      ...tech,
      homeCoordinates: tech.homeCoordinates ? {
        lat: parseFloat(tech.homeCoordinates),
        lng: parseFloat(tech.home_longitude)
      } : null
    };
  } catch (error) {
    console.error('Error fetching technician:', error);
    throw error;
  }
}

/**
 * Get default technician
 */
async function getDefaultTechnician() {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        home_address as "homeAddress",
        home_latitude as "homeCoordinates",
        home_longitude,
        country,
        transport_to_airport as "transportToAirport",
        taxi_cost as "taxiCost",
        parking_cost_per_day as "parkingCostPerDay",
        time_to_airport as "timeToAirport",
        airports,
        is_default as "isDefault",
        is_active as "isActive"
      FROM technicians 
      WHERE is_default = true AND is_active = true 
      LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tech = result.rows[0];
    return {
      ...tech,
      homeCoordinates: tech.homeCoordinates ? {
        lat: parseFloat(tech.homeCoordinates),
        lng: parseFloat(tech.home_longitude)
      } : null
    };
  } catch (error) {
    console.error('Error fetching default technician:', error);
    throw error;
  }
}

/**
 * Create or update technician
 */
async function saveTechnician(technician) {
  try {
    const {
      id,
      name,
      homeAddress,
      homeCoordinates,
      country,
      transportToAirport,
      taxiCost,
      parkingCostPerDay,
      timeToAirport,
      airports,
      isDefault
    } = technician;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await pool.query(
        'UPDATE technicians SET is_default = false WHERE is_default = true'
      );
    }
    
    // Convert country name to ISO code if needed
    let countryCode = getCountryCode(country);
    
    // Log for debugging if country conversion fails
    if (country && !countryCode) {
      console.warn(`Could not convert country "${country.substring(0, 50)}" to ISO code. Using null.`);
    }
    
    // Ensure country code is not longer than 3 characters (safety check)
    if (countryCode && countryCode.length > 3) {
      console.error(`Country code "${countryCode}" is too long (${countryCode.length} chars). Using null.`);
      countryCode = null;
    }
    
    const { personalNumber, department } = technician;
    
    const result = await pool.query(
      `INSERT INTO technicians (
        id, name, home_address, home_latitude, home_longitude, country,
        transport_to_airport, taxi_cost, parking_cost_per_day, time_to_airport,
        airports, personal_number, department, is_default, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        home_address = EXCLUDED.home_address,
        home_latitude = EXCLUDED.home_latitude,
        home_longitude = EXCLUDED.home_longitude,
        country = EXCLUDED.country,
        transport_to_airport = EXCLUDED.transport_to_airport,
        taxi_cost = EXCLUDED.taxi_cost,
        parking_cost_per_day = EXCLUDED.parking_cost_per_day,
        time_to_airport = EXCLUDED.time_to_airport,
        airports = EXCLUDED.airports,
        personal_number = EXCLUDED.personal_number,
        department = EXCLUDED.department,
        is_default = EXCLUDED.is_default,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        id,
        name,
        homeAddress,
        homeCoordinates?.lat || null,
        homeCoordinates?.lng || null,
        countryCode,
        transportToAirport || 'taxi',
        taxiCost || 90.00,
        parkingCostPerDay || 15.00,
        timeToAirport || 45,
        JSON.stringify(airports || []),
        personalNumber || null,
        department || null,
        isDefault || false
      ]
    );
    
    const saved = result.rows[0];
    return {
      id: saved.id,
      name: saved.name,
      homeAddress: saved.home_address,
      homeCoordinates: saved.home_latitude ? {
        lat: parseFloat(saved.home_latitude),
        lng: parseFloat(saved.home_longitude)
      } : null,
      country: saved.country,
      transportToAirport: saved.transport_to_airport,
      taxiCost: parseFloat(saved.taxi_cost),
      parkingCostPerDay: parseFloat(saved.parking_cost_per_day),
      timeToAirport: saved.time_to_airport,
      airports: saved.airports || [],
      personalNumber: saved.personal_number,
      department: saved.department,
      isDefault: saved.is_default,
      isActive: saved.is_active
    };
  } catch (error) {
    console.error('Error saving technician:', error);
    throw error;
  }
}

/**
 * Delete technician (soft delete)
 */
async function deleteTechnician(id) {
  try {
    await pool.query(
      'UPDATE technicians SET is_active = false WHERE id = $1',
      [id]
    );
    return true;
  } catch (error) {
    console.error('Error deleting technician:', error);
    throw error;
  }
}

module.exports = {
  getAllTechnicians,
  getTechnicianById,
  getDefaultTechnician,
  saveTechnician,
  deleteTechnician
};

