import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './CustomerForm.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function CustomerForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contact_name: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: 'DEU',
    nearest_airport_code: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [loadingAirport, setLoadingAirport] = useState(false);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // Handle search input for autocomplete
  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear timeout if user is still typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If query is too short, clear suggestions
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Debounce API call
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/places/autocomplete`, {
          params: {
            input: query,
            country: formData.country === 'DEU' ? 'de' : 
                    formData.country === 'FRA' ? 'fr' :
                    formData.country === 'GBR' ? 'gb' :
                    formData.country === 'USA' ? 'us' : null
          }
        });
        
        if (response.data.success) {
          setSuggestions(response.data.data);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        // Silently fail - user can still type manually
      }
    }, 300);
  };

  // Handle selecting a place from suggestions
  const handleSelectPlace = async (place) => {
    setSearchQuery(place.description);
    setShowSuggestions(false);
    setLoadingPlace(true);
    
    try {
      const response = await axios.get(`${API_URL}/api/places/details`, {
        params: { place_id: place.place_id }
      });
      
      if (response.data.success) {
        const details = response.data.data;
        
        console.log('Place details received:', details);
        
        // Auto-fill form with place details
        const updatedFormData = {
          name: details.name || formData.name,
          email: formData.email, // Not available from Places API
          phone: details.phone || formData.phone,
          contact_name: formData.contact_name,
          street_address: details.street_address || formData.street_address,
          city: details.city || formData.city,
          postal_code: details.postal_code || formData.postal_code,
          country: details.country || formData.country,
          nearest_airport_code: formData.nearest_airport_code, // Keep existing or will be filled next
          notes: formData.notes
        };
        
        setFormData(updatedFormData);
        
        // If we have coordinates, find nearest airport
        if (details.latitude && details.longitude) {
          console.log('Coordinates found, looking up airport...', details.latitude, details.longitude);
          setLoadingAirport(true);
          try {
            console.log('Finding airport for coordinates:', details.latitude, details.longitude);
            const airportResponse = await axios.get(`${API_URL}/api/customers/find-airport`, {
              params: {
                lat: details.latitude,
                lng: details.longitude
              }
            });
            
            console.log('Airport response:', airportResponse.data);
            
            if (airportResponse.data.success && airportResponse.data.data) {
              const airportCode = airportResponse.data.data.code;
              if (airportCode) {
                setFormData({
                  ...updatedFormData,
                  nearest_airport_code: airportCode
                });
                console.log('✅ Airport code set to:', airportCode);
              } else {
                console.warn('⚠️ Airport found but no code available:', airportResponse.data.data.name);
                // Still show the airport name in a message or keep field empty for manual entry
              }
            } else {
              console.warn('No airport data in response:', airportResponse.data);
            }
          } catch (error) {
            console.error('Error finding airport:', error);
            console.error('Error details:', error.response?.data);
            // Don't show error - user can fill manually
          } finally {
            setLoadingAirport(false);
          }
        } else {
          console.warn('No coordinates in place details:', details);
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      alert('Could not load place details. Please fill in manually.');
    } finally {
      setLoadingPlace(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    let value = e.target.value;
    
    // Auto-uppercase for airport code
    if (e.target.name === 'nearest_airport_code') {
      value = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Valid email is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/customers`,
        formData
      );
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        contact_name: '',
        street_address: '',
        city: '',
        postal_code: '',
        country: 'DEU',
        nearest_airport_code: '',
        notes: ''
      });
      setSearchQuery('');
      
      alert(`✅ Customer "${response.data.name}" created successfully!`);
      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="customer-form">
      <h2>Add New Customer</h2>
      
      {/* Google Places Autocomplete Search */}
      <div className="form-group autocomplete-group" ref={suggestionsRef}>
        <label className="form-label">
          🔍 Search Company or Address (Auto-fill)
        </label>
        <div className="autocomplete-wrapper">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            className="form-input autocomplete-input"
            placeholder="Type company name or address to auto-fill..."
            disabled={loadingPlace}
          />
          {loadingPlace && (
            <span className="loading-indicator">Loading...</span>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.place_id || index}
                  onClick={() => handleSelectPlace(suggestion)}
                  className="suggestion-item"
                >
                  <div className="suggestion-main">{suggestion.description}</div>
                  {suggestion.structured_formatting && (
                    <div className="suggestion-secondary">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="help-text">Start typing to search Google Places. Select a result to auto-fill the form.</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          Company Name <span className="required">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="Enter company name"
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Email <span className="required">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`form-input ${errors.email ? 'error' : ''}`}
          placeholder="customer@example.com"
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Phone <span className="required">*</span>
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={`form-input ${errors.phone ? 'error' : ''}`}
          placeholder="+49 123 456 7890"
        />
        {errors.phone && <span className="error-message">{errors.phone}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Contact Name</label>
        <input
          type="text"
          name="contact_name"
          value={formData.contact_name}
          onChange={handleChange}
          className="form-input"
          placeholder="Primary contact person"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Street Address</label>
        <input
          type="text"
          name="street_address"
          value={formData.street_address}
          onChange={handleChange}
          className="form-input"
          placeholder="Street and number"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            City <span className="required">*</span>
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={`form-input ${errors.city ? 'error' : ''}`}
            placeholder="City"
          />
          {errors.city && <span className="error-message">{errors.city}</span>}
        </div>
        
        <div className="form-group">
          <label className="form-label">Postal Code</label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            className="form-input"
            placeholder="12345"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Country <span className="required">*</span>
        </label>
        <select
          name="country"
          value={formData.country}
          onChange={handleChange}
          className="form-input"
        >
          <option value="DEU">Germany</option>
          <option value="FRA">France</option>
          <option value="GBR">United Kingdom</option>
          <option value="USA">United States</option>
          <option value="CHE">Switzerland</option>
          <option value="AUT">Austria</option>
          <option value="NLD">Netherlands</option>
        </select>
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Nearest Airport Code
          {loadingAirport && <span className="loading-text"> (Finding...)</span>}
        </label>
        <input
          type="text"
          name="nearest_airport_code"
          value={formData.nearest_airport_code}
          onChange={handleChange}
          className="form-input"
          placeholder="STR, MUC, FRA, etc. (auto-filled from address)"
          maxLength="3"
          style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
        />
        <p className="help-text">
          IATA airport code (3 letters). Auto-filled when address is selected, but you can edit it.
        </p>
      </div>
      
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="form-input"
          rows="3"
          placeholder="Additional notes about this customer"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="submit-button"
      >
        {loading ? 'Creating...' : 'Create Customer'}
      </button>
    </form>
  );
}

export default CustomerForm;

