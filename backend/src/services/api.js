// API service for frontend to interact with backend
// This replaces localStorage-based storage with database-backed storage

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Technicians API
export const techniciansAPI = {
  getAll: () => api.get('/api/technicians'),
  getDefault: () => api.get('/api/technicians/default'),
  getById: (id) => api.get(`/api/technicians/${id}`),
  save: (technician) => api.post('/api/technicians', technician),
  update: (id, technician) => api.put(`/api/technicians/${id}`, technician),
  delete: (id) => api.delete(`/api/technicians/${id}`)
};

// Customers API (for quick lookup and autocomplete)
export const customersAPI = {
  search: (query) => api.get('/api/customers/search', { params: { q: query } }),
  lookup: (place_id, address) => {
    const params = place_id ? { place_id } : { address };
    return api.get('/api/customers/lookup', { params });
  },
  saveQuick: (customer) => api.post('/api/customers', customer),
  updateAirport: (id, airport) => api.put(`/api/customers/${id}`, { 
    nearest_airport_code: airport?.code,
    nearest_airport: airport
  })
};

export default api;


