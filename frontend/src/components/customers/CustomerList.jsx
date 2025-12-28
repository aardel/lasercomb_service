import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CustomerList.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const response = await axios.get(`${API_URL}/api/customers`, { params });
      // Handle both response formats: { success: true, data: [...] } or direct array
      setCustomers(response.data.data || response.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch customers');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  if (loading && customers.length === 0) {
    return (
      <div className="customer-list">
        <h2>Customers</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="customer-list">
      <h2>Customers</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="search-input"
        />
        <button type="submit" className="search-button">Search</button>
        {search && (
          <button 
            type="button" 
            onClick={() => {
              setSearch('');
              fetchCustomers();
            }}
            className="clear-button"
          >
            Clear
          </button>
        )}
      </form>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      {customers.length === 0 ? (
        <div className="empty-state">
          <p>No customers found.</p>
          <p className="hint">Add a customer using the form on the left.</p>
        </div>
      ) : (
        <div className="customers-grid">
          {customers.map((customer) => (
            <div key={customer.id} className="customer-card">
              <h3>{customer.name}</h3>
              <div className="customer-details">
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Phone:</strong> {customer.phone}</p>
                <p><strong>City:</strong> {customer.city}, {customer.country}</p>
                {customer.contact_name && (
                  <p><strong>Contact:</strong> {customer.contact_name}</p>
                )}
                {customer.nearest_airport_code && (
                  <p><strong>Nearest Airport:</strong> {customer.nearest_airport_code}</p>
                )}
                {customer.latitude != null && customer.longitude != null && (
                  <p className="coordinates">
                    📍 {Number(customer.latitude).toFixed(4)}, {Number(customer.longitude).toFixed(4)}
                  </p>
                )}
              </div>
              <div className="customer-meta">
                <span className="data-source">{customer.data_source}</span>
                <span className="created-date">
                  Created: {new Date(customer.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerList;

