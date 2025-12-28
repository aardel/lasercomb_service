import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

// Cache for backend health status (check every 5 seconds max)
let backendHealthCache = {
  status: null,
  lastCheck: 0,
  checkInterval: 5000 // 5 seconds
};

/**
 * Pre-flight check: Verify backend is available before making API calls
 * @returns {Promise<boolean>} True if backend is available, false otherwise
 */
export const checkBackendHealth = async () => {
  const now = Date.now();
  
  // Use cached result if recent (within 5 seconds)
  if (backendHealthCache.status !== null && (now - backendHealthCache.lastCheck) < backendHealthCache.checkInterval) {
    return backendHealthCache.status;
  }

  try {
    const response = await axios.get(`${API_URL}/api/health`, {
      timeout: 3000 // Quick 3 second timeout for health check
    });
    
    const isHealthy = response.data?.status === 'ok';
    backendHealthCache = {
      status: isHealthy,
      lastCheck: now
    };
    return isHealthy;
  } catch (error) {
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                          error.code === 'ECONNREFUSED' ||
                          error.code === 'ERR_EMPTY_RESPONSE' ||
                          error.message?.toLowerCase().includes('network error') ||
                          error.message?.toLowerCase().includes('connection refused') ||
                          error.message?.toLowerCase().includes('empty response');
    
    backendHealthCache = {
      status: false,
      lastCheck: now
    };
    
    if (isNetworkError) {
      console.warn('[API] Backend health check failed: Server is not responding');
    }
    return false;
  }
};

// Request interceptor to check backend health before important API calls
api.interceptors.request.use(
  async (config) => {
    // Skip health check for the health endpoint itself
    if (config.url?.includes('/health')) {
      return config;
    }

    // For critical operations (flights, costs), check backend health first
    const isCriticalOperation = config.url?.includes('/flights') || 
                                config.url?.includes('/costs') ||
                                config.url?.includes('/trips');
    
    if (isCriticalOperation) {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        // Reject the request with a clear error
        return Promise.reject({
          code: 'ERR_BACKEND_DOWN',
          message: 'Backend server is not available. Please ensure the backend is running.',
          isBackendDown: true
        });
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Customers API
export const customersAPI = {
  getAll: (filters = {}) => api.get('/api/customers', { params: filters }),
  getById: (id) => api.get(`/api/customers/${id}`),
  create: (data) => api.post('/api/customers', data),
  update: (id, data) => api.put(`/api/customers/${id}`, data),
  delete: (id) => api.delete(`/api/customers/${id}`),
  search: (query) => api.get('/api/customers/search', { params: { q: query } }),
  lookup: (place_id, address, name = null, city = null) => {
    const params = {};
    if (place_id) params.place_id = place_id;
    if (address) params.address = address;
    if (name) params.name = name;
    if (city) params.city = city;
    return api.get('/api/customers/lookup', { params });
  },
  clearAirports: () => api.post('/api/customers/clear-airports'),
  deleteAll: () => api.delete('/api/customers/bulk/all'),
  getCount: () => api.get('/api/customers/stats/count')
};

// Technicians API
export const techniciansAPI = {
  getAll: () => api.get('/api/technicians'),
  getDefault: () => api.get('/api/technicians/default'),
  getById: (id) => api.get(`/api/technicians/${id}`),
  save: (technician) => api.post('/api/technicians', technician),
  update: (id, technician) => api.put(`/api/technicians/${id}`, technician),
  delete: (id) => api.delete(`/api/technicians/${id}`)
};

// Trips API
export const tripsAPI = {
  getAll: (filters = {}) => api.get('/api/trips', { params: filters }),
  getById: (id) => api.get(`/api/trips/${id}`),
  create: (data) => api.post('/api/trips', data),
  update: (id, data) => api.put(`/api/trips/${id}`, data),
  delete: (id) => api.delete(`/api/trips/${id}`),
  addCustomer: (tripId, data) => api.post(`/api/trips/${tripId}/customers`, data),
  removeCustomer: (tripId, customerId) => api.delete(`/api/trips/${tripId}/customers/${customerId}`),
  recalculate: (tripId) => api.post(`/api/trips/${tripId}/recalculate`)
};

// Costs API
export const costsAPI = {
  calculate: (data) => api.post('/api/costs/calculate', data),
  calculateMultiStop: (data) => api.post('/api/costs/calculate-multi-stop', data),
  getRates: (country, city = null) => {
    const params = { country };
    if (city) params.city = city;
    return api.get('/api/costs/rates', { params });
  },
  compareOptions: (data) => api.post('/api/costs/compare-options', data)
};

// Places API (Google Places Autocomplete)
export const placesAPI = {
  autocomplete: (input, country = null) => {
    const params = { input };
    if (country) params.country = country;
    return api.get('/api/places/autocomplete', { params });
  },
  getDetails: (placeId) => api.get('/api/places/details', { params: { place_id: placeId } }),
  getNearbyAirports: (lat, lng, limit = 2, country = null) => {
    const params = { lat, lng, limit };
    if (country) params.country = country;
    return api.get('/api/places/nearby-airports', { params });
  }
};

// Hotels API
export const hotelsAPI = {
  searchNearby: (lat, lng, limit = null, cityName = null) => {
    const params = { lat, lng };
    if (limit) params.limit = limit;
    if (cityName) params.cityName = cityName;
    return api.get('/api/hotels/nearby', { params });
  }
};

// Flights API
export const flightsAPI = {
  search: (data) => api.post('/api/flights/search', data)
};

// Distance API
export const distanceAPI = {
  calculate: (origin, destination) => api.post('/api/distance/calculate', { origin, destination })
};


export default api;

