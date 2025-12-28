import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsAPI, customersAPI, costsAPI } from '../services/api';
import './NewTripPage.css';

function NewTripPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [costPreview, setCostPreview] = useState(null);
  const [formData, setFormData] = useState({
    customer_ids: [],
    planned_start_date: '',
    planned_end_date: '',
    job_type: '',
    job_description: '',
    work_hours_estimate: '',
    starting_address: 'Siemensstraße 2, 73274 Notzingen, Germany',
    work_percentages: [],
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerToggle = (customerId) => {
    setFormData(prev => {
      const isSelected = prev.customer_ids.includes(customerId);
      let newCustomerIds;
      
      if (isSelected) {
        newCustomerIds = prev.customer_ids.filter(id => id !== customerId);
      } else {
        if (prev.customer_ids.length >= 8) {
          alert('Maximum 8 customers per trip');
          return prev;
        }
        newCustomerIds = [...prev.customer_ids, customerId];
      }

      // Reset work percentages
      const newWorkPercentages = new Array(newCustomerIds.length).fill(100 / newCustomerIds.length);

      return {
        ...prev,
        customer_ids: newCustomerIds,
        work_percentages: newWorkPercentages
      };
    });
  };

  const handleWorkPercentageChange = (index, value) => {
    setFormData(prev => {
      const newPercentages = [...prev.work_percentages];
      newPercentages[index] = parseFloat(value) || 0;
      return {
        ...prev,
        work_percentages: newPercentages
      };
    });
  };

  const handlePreviewCosts = async () => {
    if (formData.customer_ids.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    if (!formData.planned_start_date || !formData.work_hours_estimate) {
      alert('Please fill in date and work hours for cost preview');
      return;
    }

    if (!formData.starting_address || !formData.starting_address.trim()) {
      alert('Please enter a starting address');
      return;
    }

    try {
      setLoading(true);
      const customer = await customersAPI.getById(formData.customer_ids[0]);
      
      const costData = {
        customer_id: customer.data.id,
        engineer_location: {
          address: formData.starting_address
        },
        work_hours: parseFloat(formData.work_hours_estimate),
        date: formData.planned_start_date
      };

      const response = await costsAPI.calculate(costData);
      setCostPreview(response.data.data);
    } catch (error) {
      alert('Error calculating costs: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.customer_ids.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    // Validate work percentages for combined trips
    if (formData.customer_ids.length > 1) {
      const total = formData.work_percentages.reduce((sum, p) => sum + p, 0);
      if (Math.abs(total - 100) > 0.01) {
        alert('Work percentages must sum to 100%');
        return;
      }
    }

    if (!formData.starting_address || !formData.starting_address.trim()) {
      alert('Please enter a starting address');
      return;
    }

    try {
      setSubmitting(true);
      const tripData = {
        customer_ids: formData.customer_ids,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date || formData.planned_start_date,
        job_type: formData.job_type,
        job_description: formData.job_description,
        work_hours_estimate: parseFloat(formData.work_hours_estimate),
        engineer_location: {
          address: formData.starting_address
        },
        work_percentages: formData.customer_ids.length > 1 ? formData.work_percentages : undefined,
        notes: formData.notes,
        metadata: {
          starting_address: formData.starting_address
        }
      };

      const response = await tripsAPI.create(tripData);
      alert('Trip created successfully!');
      navigate(`/trips/${response.data.data.id}`);
    } catch (error) {
      alert('Error creating trip: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create New Trip</h1>
        <p>Plan a new trip and calculate costs automatically</p>
      </div>

      <form onSubmit={handleSubmit} className="trip-form">
        <div className="form-section">
          <h2>Customer Selection</h2>
          <div className="customer-selection">
            {customers.map(customer => {
              const isSelected = formData.customer_ids.includes(customer.id);
              const index = formData.customer_ids.indexOf(customer.id);
              
              return (
                <div key={customer.id} className="customer-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCustomerToggle(customer.id)}
                    />
                    <span className="customer-name">{customer.name}</span>
                    <span className="customer-location">{customer.city}, {customer.country}</span>
                  </label>
                  {isSelected && formData.customer_ids.length > 1 && (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.work_percentages[index] || 0}
                      onChange={(e) => handleWorkPercentageChange(index, e.target.value)}
                      className="work-percentage-input"
                      placeholder="%"
                    />
                  )}
                </div>
              );
            })}
          </div>
          {formData.customer_ids.length > 1 && (
            <div className="percentage-summary">
              Total: {formData.work_percentages.reduce((sum, p) => sum + p, 0).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>Trip Details</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="datetime-local"
                name="planned_start_date"
                value={formData.planned_start_date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="datetime-local"
                name="planned_end_date"
                value={formData.planned_end_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Job Type *</label>
              <select
                name="job_type"
                value={formData.job_type}
                onChange={handleInputChange}
                required
              >
                <option value="">Select job type</option>
                <option value="installation">Installation</option>
                <option value="maintenance">Maintenance</option>
                <option value="repair">Repair</option>
                <option value="training">Training</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
            <div className="form-group">
              <label>Work Hours (Estimate) *</label>
              <input
                type="number"
                name="work_hours_estimate"
                value={formData.work_hours_estimate}
                onChange={handleInputChange}
                min="0"
                step="0.5"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Job Description</label>
            <textarea
              name="job_description"
              value={formData.job_description}
              onChange={handleInputChange}
              rows="3"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Starting Address</h2>
          <div className="form-group">
            <label>Starting Location <span className="required">*</span></label>
            <input
              type="text"
              name="starting_address"
              value={formData.starting_address}
              onChange={handleInputChange}
              placeholder="Enter starting address (e.g., Munich, Germany or full address)"
              required
            />
            <p className="help-text">
              The address where the trip starts from. Can be a city name, full address, or coordinates.
            </p>
          </div>
        </div>

        <div className="form-section">
          <h2>Notes</h2>
          <div className="form-group">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handlePreviewCosts}
            disabled={loading || formData.customer_ids.length === 0}
            className="btn-secondary"
          >
            {loading ? 'Calculating...' : 'Preview Costs'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      </form>

      {costPreview && (
        <div className="cost-preview">
          <h2>Cost Preview</h2>
          <div className="cost-breakdown">
            <div className="cost-item">
              <span>Working Time:</span>
              <span>€{costPreview.arbeitszeit_total?.toFixed(2)}</span>
            </div>
            <div className="cost-item">
              <span>Travel Time:</span>
              <span>€{costPreview.reisezeit_total?.toFixed(2)}</span>
            </div>
            <div className="cost-item">
              <span>Distance:</span>
              <span>€{costPreview.entfernung_total?.toFixed(2)}</span>
            </div>
            <div className="cost-item">
              <span>Daily Allowances:</span>
              <span>€{(costPreview.tagesspesen_24h_total + costPreview.tagesspesen_8h_total).toFixed(2)}</span>
            </div>
            <div className="cost-item">
              <span>Hotel:</span>
              <span>€{costPreview.hotel_total?.toFixed(2)}</span>
            </div>
            <div className="cost-item total">
              <span>Total Quotation:</span>
              <span>€{costPreview.total_quotation?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewTripPage;

