const Customer = require('../models/customer.model');
const { geocodeAddress } = require('./geocoding.service');
const { findNearestAirport } = require('./airport.service');

class CustomerService {
  // Create customer with geocoding
  async createCustomer(customerData) {
    try {
      // If airport code is already provided, use it (user may have edited it)
      const hasAirportCode = customerData.nearest_airport_code && customerData.nearest_airport_code.trim().length > 0;
      
      // Geocode address if provided
      if (customerData.city && customerData.country) {
        try {
          const coords = await geocodeAddress(
            customerData.street_address,
            customerData.city,
            customerData.country
          );
          
          if (coords) {
            customerData.latitude = coords.lat;
            customerData.longitude = coords.lng;
            
            // Find nearest airport only if not already provided by user
            if (!hasAirportCode && !customerData.nearest_airport) {
              const airport = await findNearestAirport(coords.lat, coords.lng);
              if (airport && airport.code) {
                customerData.nearest_airport_code = airport.code;
                customerData.nearest_airport = airport; // Save full airport object
              }
            }
          }
        } catch (error) {
          console.warn('Geocoding failed, continuing without coordinates:', error.message);
          // Continue without coordinates - they can be added later
        }
      }
      
      // Create customer
      const customer = await Customer.create(customerData);
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
  
  // Get all customers
  async getAllCustomers(filters) {
    return await Customer.findAll(filters);
  }
  
  // Get customer by ID
  async getCustomerById(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }
  
  // Update customer
  async updateCustomer(id, customerData) {
    // If airport code is explicitly provided, use it (user may have edited it)
    const hasAirportCode = customerData.nearest_airport_code !== undefined;
    
    // If address changed, re-geocode
    if (customerData.city || customerData.country || customerData.street_address) {
      try {
        const existing = await Customer.findById(id);
        const addressChanged = 
          customerData.city !== existing.city ||
          customerData.country !== existing.country ||
          customerData.street_address !== existing.street_address;
        
        if (addressChanged) {
          const coords = await geocodeAddress(
            customerData.street_address || existing.street_address,
            customerData.city || existing.city,
            customerData.country || existing.country
          );
          
          if (coords) {
            customerData.latitude = coords.lat;
            customerData.longitude = coords.lng;
            
            // Only auto-find airport if user hasn't explicitly set one
            if (!hasAirportCode && !customerData.nearest_airport) {
              const airport = await findNearestAirport(coords.lat, coords.lng);
              if (airport && airport.code) {
                customerData.nearest_airport_code = airport.code;
                customerData.nearest_airport = airport; // Save full airport object
              }
            }
          }
        }
      } catch (error) {
        console.warn('Geocoding failed during update:', error.message);
      }
    }
    
    return await Customer.update(id, customerData);
  }
  
  // Delete customer
  async deleteCustomer(id) {
    await Customer.delete(id);
  }

  // Search customers by query (for autocomplete)
  async searchCustomers(query) {
    try {
      // Validate query is a non-empty string
      if (!query || typeof query !== 'string') {
        console.warn('Invalid search query:', typeof query);
        return [];
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length < 2) {
        return [];
      }

      const pool = require('../config/database');
      const searchTerm = `%${trimmedQuery}%`;
      const result = await pool.query(
        `SELECT * FROM customers
         WHERE is_active = true
         AND (
           name ILIKE $1
           OR email ILIKE $1
           OR city ILIKE $1
           OR street_address ILIKE $1
           OR country ILIKE $1
         )
         ORDER BY name
         LIMIT 20`,
        [searchTerm]
      );

      // Safely parse nearest_airport for each result
      return result.rows.map(row => {
        let nearestAirport = null;
        if (row.nearest_airport) {
          try {
            const parsed = typeof row.nearest_airport === 'string'
              ? JSON.parse(row.nearest_airport)
              : row.nearest_airport;

            // Validate parsed airport object
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.code && parsed.name) {
              nearestAirport = {
                code: String(parsed.code).trim(),
                name: String(parsed.name).trim(),
                lat: parsed.lat || parsed.latitude || null,
                lng: parsed.lng || parsed.longitude || null,
                distance_km: parsed.distance_km || parsed.distance_to_home_km || null
              };
            }
          } catch (parseError) {
            console.warn(`Skipping invalid nearest_airport for customer ${row.id}:`, parseError.message);
          }
        }

        return {
          ...row,
          nearest_airport: nearestAirport
        };
      });
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  // Get customer by place_id, address, or name+city combination
  // This prevents duplicates while allowing same company name in different cities
  async getCustomerByPlaceId(placeId, address, name = null, city = null) {
    try {
      const pool = require('../config/database');
      let query, values;

      // Helper function to safely convert to trimmed string
      const safeStringTrim = (value, fieldName) => {
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value !== 'string') {
          console.warn(`${fieldName} is not a string (type: ${typeof value}), converting...`);
          // Reject invalid types that would convert to problematic strings
          if (typeof value === 'object' || Array.isArray(value)) {
            console.error(`${fieldName} cannot be an object or array`);
            return null;
          }
          value = String(value);
        }
        const trimmed = value.trim();
        // Reject strings that become empty after trimming or are just "null"/"undefined"
        if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
          return null;
        }
        return trimmed;
      };

      // Priority 1: Check by place_id (most reliable - unique Google Places ID)
      if (placeId) {
        const placeIdStr = safeStringTrim(placeId, 'placeId');
        if (!placeIdStr) {
          console.warn('Invalid place_id provided, skipping lookup');
          return null;
        }
        query = 'SELECT * FROM customers WHERE place_id = $1 AND is_active = true LIMIT 1';
        values = [placeIdStr];
      }
      // Priority 2: Check by name + city + address (allows same company in different cities)
      else if (name && city && address) {
        const nameStr = safeStringTrim(name, 'name');
        const cityStr = safeStringTrim(city, 'city');
        const addressStr = safeStringTrim(address, 'address');

        if (nameStr && cityStr && addressStr) {
          query = `SELECT * FROM customers
                   WHERE name ILIKE $1
                   AND city ILIKE $2
                   AND street_address ILIKE $3
                   AND is_active = true
                   LIMIT 1`;
          values = [nameStr, cityStr, `%${addressStr}%`];
        } else {
          console.debug('Name, city, or address validation failed:', {
            name: nameStr ? 'valid' : 'invalid',
            city: cityStr ? 'valid' : 'invalid',
            address: addressStr ? 'valid' : 'invalid'
          });
          return null;
        }
      }
      // Priority 3: Check by name + city (fallback if address not available)
      else if (name && city) {
        const nameStr = safeStringTrim(name, 'name');
        const cityStr = safeStringTrim(city, 'city');

        if (nameStr && cityStr) {
          query = `SELECT * FROM customers
                   WHERE name ILIKE $1
                   AND city ILIKE $2
                   AND is_active = true
                   LIMIT 1`;
          values = [nameStr, cityStr];
        } else {
          console.debug('Name or city validation failed:', {
            name: nameStr ? 'valid' : 'invalid',
            city: cityStr ? 'valid' : 'invalid'
          });
          return null;
        }
      }
      // Priority 4: Check by address only (less reliable)
      else if (address) {
        const addressStr = safeStringTrim(address, 'address');
        if (addressStr) {
          query = 'SELECT * FROM customers WHERE street_address ILIKE $1 AND is_active = true LIMIT 1';
          values = [`%${addressStr}%`];
        } else {
          console.debug('Address validation failed');
          return null;
        }
      } else {
        console.debug('No valid search criteria provided');
        return null;
      }
      
      if (!query || !values) {
        return null;
      }
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      // Safely parse and validate nearest_airport JSON
      let nearestAirport = null;
      if (row.nearest_airport) {
        try {
          const parsed = typeof row.nearest_airport === 'string'
            ? JSON.parse(row.nearest_airport)
            : row.nearest_airport;

          // Validate the parsed airport object has required fields
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (parsed.code && parsed.name) {
              nearestAirport = {
                code: String(parsed.code).trim(),
                name: String(parsed.name).trim(),
                lat: parsed.lat || parsed.latitude || null,
                lng: parsed.lng || parsed.longitude || null,
                distance_km: parsed.distance_km || parsed.distance_to_home_km || null
              };
            } else {
              console.warn('nearest_airport missing required fields (code, name):', parsed);
            }
          } else {
            console.warn('nearest_airport is not a valid object:', typeof parsed);
          }
        } catch (parseError) {
          console.error('Error parsing nearest_airport JSON:', {
            error: parseError.message,
            data: row.nearest_airport,
            customerId: row.id
          });
          nearestAirport = null;
        }
      }

      return {
        ...row,
        nearest_airport: nearestAirport
      };
    } catch (error) {
      console.error('Error getting customer by place_id:', error);
      console.error('Error details:', {
        placeId: placeId ? 'provided' : 'missing',
        address: address ? 'provided' : 'missing',
        name: name ? 'provided' : 'missing',
        city: city ? 'provided' : 'missing',
        errorMessage: error.message,
        errorStack: error.stack
      });
      // Don't throw - return null instead to prevent crashes
      return null;
    }
  }

  // Clear all customer airport data (nearest_airport, nearest_airport_code)
  async clearAllCustomerAirports() {
    try {
      const pool = require('../config/database');
      const result = await pool.query(
        `UPDATE customers 
         SET nearest_airport = NULL, 
             nearest_airport_code = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE nearest_airport IS NOT NULL OR nearest_airport_code IS NOT NULL`
      );
      return {
        success: true,
        cleared: result.rowCount
      };
    } catch (error) {
      console.error('Error clearing customer airports:', error);
      throw error;
    }
  }

  // Delete all customers (destructive operation)
  async deleteAllCustomers() {
    try {
      const pool = require('../config/database');
      // Get count before deletion
      const countResult = await pool.query('SELECT COUNT(*) as count FROM customers');
      const count = parseInt(countResult.rows[0].count) || 0;
      
      // Delete all customers
      await pool.query('DELETE FROM customers');
      
      return {
        success: true,
        deleted: count
      };
    } catch (error) {
      console.error('Error deleting all customers:', error);
      throw error;
    }
  }

  // Get customer count
  async getCustomerCount() {
    try {
      const pool = require('../config/database');
      const result = await pool.query('SELECT COUNT(*) as count FROM customers WHERE is_active = true');
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting customer count:', error);
      throw error;
    }
  }
}

module.exports = new CustomerService();

