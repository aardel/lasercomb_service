// Customer Storage Service
// Now uses database API instead of localStorage
// Customers are stored permanently in the database with airport data

import { customersAPI } from './api';

// Helper function to safely parse JSON airport data
const safeParseAirport = (airport) => {
    if (!airport) return null;

    try {
        // If already an object, validate it
        const parsed = typeof airport === 'string' ? JSON.parse(airport) : airport;

        // Validate required fields
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }

        if (!parsed.code || !parsed.name) {
            console.warn('Airport object missing required fields (code, name)');
            return null;
        }

        return {
            code: String(parsed.code).trim(),
            name: String(parsed.name).trim(),
            lat: parsed.lat || parsed.latitude || null,
            lng: parsed.lng || parsed.longitude || null,
            distance_km: parsed.distance_km || parsed.distance_to_home_km || null
        };
    } catch (error) {
        console.warn('Failed to parse airport data:', error.message);
        return null;
    }
};

// Search customers by query (for autocomplete)
export const searchCustomers = async (query) => {
    // Validate input
    if (!query || typeof query !== 'string') {
        console.warn('Invalid search query type:', typeof query);
        return [];
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
        return [];
    }

    try {
        const response = await customersAPI.search(trimmedQuery);

        if (!response || !response.data) {
            console.error('Invalid response from customer search API');
            return [];
        }

        if (response.data.success) {
            // Transform and validate database format to frontend format
            return response.data.data
                .map(c => {
                    // Validate required fields
                    if (!c.id || !c.name) {
                        console.warn('Skipping customer with missing id or name:', c);
                        return null;
                    }

                    // Parse and validate coordinates
                    let coordinates = null;
                    if (c.latitude && c.longitude) {
                        const lat = parseFloat(c.latitude);
                        const lng = parseFloat(c.longitude);

                        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                            coordinates = { lat, lng };
                        } else {
                            console.warn(`Invalid coordinates for customer ${c.id}:`, { lat: c.latitude, lng: c.longitude });
                        }
                    }

                    return {
                        id: c.id,
                        name: c.name || '',
                        address: c.street_address || '',
                        city: c.city || '',
                        country: c.country || '',
                        coordinates,
                        place_id: c.place_id || null,
                        nearest_airport_code: c.nearest_airport_code || null,
                        nearest_airport: safeParseAirport(c.nearest_airport)
                    };
                })
                .filter(c => c !== null); // Remove invalid entries
        }
        return [];
    } catch (error) {
        console.error('Error searching customers:', error);
        // Provide more specific error message
        if (error.response) {
            console.error('API error:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('Network error: No response received');
        }
        return [];
    }
};

// Get customer by place_id, address, or name+city combination (from database)
// This prevents duplicates while allowing same company name in different cities
export const getCustomerByPlace = async (place_id, address, name = null, city = null) => {
    try {
        // Only make API call if we have at least one parameter
        if (!place_id && !address && !name) {
            return null;
        }

        const response = await customersAPI.lookup(place_id, address, name, city);

        // Handle different response formats
        if (response.data) {
            if (response.data.success && response.data.data) {
                const c = response.data.data;

                // Validate and parse coordinates
                let coordinates = null;
                if (c.latitude && c.longitude) {
                    const lat = parseFloat(c.latitude);
                    const lng = parseFloat(c.longitude);

                    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        coordinates = { lat, lng };
                    } else {
                        console.warn(`Invalid coordinates for customer ${c.id}:`, { lat: c.latitude, lng: c.longitude });
                    }
                }

                return {
                    id: c.id,
                    name: c.name || '',
                    address: c.street_address || '',
                    city: c.city || '',
                    country: c.country || '',
                    coordinates,
                    place_id: c.place_id || null,
                    nearest_airport_code: c.nearest_airport_code || null,
                    nearest_airport: safeParseAirport(c.nearest_airport)
                };
            } else if (response.data.success === false) {
                // Customer not found - this is normal, not an error
                return null;
            }
        }
        return null;
    } catch (error) {
        // Don't log as error if it's just "customer not found" (404/400)
        if (error.response?.status === 404 || error.response?.status === 400) {
            return null;
        }
        console.warn('Error looking up customer (non-critical):', error.message || error);
        return null;
    }
};

// Save customer to database (quick save for trip planning)
export const saveCustomer = async (customer) => {
    try {
        // Transform frontend format to database format
        const customerData = {
            name: customer.name || 'Customer',
            email: customer.email || `customer-${Date.now()}@temp.com`,
            phone: customer.phone || '',
            street_address: customer.address || '',
            city: customer.city && customer.city.trim() !== '' ? customer.city : 'Unknown',
            country: customer.country && customer.country.trim() !== '' ? customer.country : 'Unknown',
            latitude: customer.coordinates?.lat || null,
            longitude: customer.coordinates?.lng || null,
            place_id: customer.place_id || null,
            nearest_airport_code: customer.nearest_airport_code || null,
            nearest_airport: customer.nearest_airport || null,
            data_source: 'manual_entry'
        };
        
        const response = await customersAPI.create(customerData);
        if (response.data) {
            const c = response.data;
            return {
                id: c.id,
                name: c.name || '',
                address: c.street_address || '',
                city: c.city || '',
                country: c.country || '',
                coordinates: c.latitude && c.longitude ? {
                    lat: parseFloat(c.latitude),
                    lng: parseFloat(c.longitude)
                } : null,
                place_id: c.place_id || null,
                nearest_airport_code: c.nearest_airport_code || null,
                nearest_airport: c.nearest_airport || null
            };
        }
        return null;
    } catch (error) {
        console.error('Error saving customer:', error);
        // If customer already exists (duplicate email), try to look it up
        if (error.response?.status === 409 && customer.place_id) {
            return await getCustomerByPlace(customer.place_id, customer.address);
        }
        throw error;
    }
};

// Update customer airport information (in database)
export const updateCustomerAirport = async (customerId, airport) => {
    try {
        const response = await customersAPI.update(customerId, {
            nearest_airport_code: airport?.code || null,
            nearest_airport: airport || null
        });
        if (response.data) {
            const c = response.data;
            return {
                id: c.id,
                name: c.name || '',
                address: c.street_address || '',
                city: c.city || '',
                country: c.country || '',
                coordinates: c.latitude && c.longitude ? {
                    lat: parseFloat(c.latitude),
                    lng: parseFloat(c.longitude)
                } : null,
                place_id: c.place_id || null,
                nearest_airport_code: c.nearest_airport_code || null,
                nearest_airport: c.nearest_airport || null
            };
        }
        return null;
    } catch (error) {
        console.error('Error updating customer airport:', error);
        throw error;
    }
};

// Legacy functions for backward compatibility (now use API)
export const getSavedCustomers = async () => {
    // This is now async, but kept for compatibility
    // In practice, components should use searchCustomers instead
    return [];
};

export const saveCustomers = () => {
    // No-op - customers are saved individually via saveCustomer
    return true;
};

export const deleteCustomer = async (customerId) => {
    try {
        await customersAPI.delete(customerId);
        return true;
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
};

export const clearAllCustomers = () => {
    // This would require a bulk delete endpoint
    console.warn('clearAllCustomers is not implemented - use deleteCustomer for individual deletions');
};

export default {
    getSavedCustomers,
    saveCustomers,
    saveCustomer,
    searchCustomers,
    getCustomerByPlace,
    updateCustomerAirport,
    deleteCustomer,
    clearAllCustomers
};
