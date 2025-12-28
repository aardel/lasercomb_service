import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tripsAPI } from '../services/api';
import './TripsPage.css';

function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    trip_type: ''
  });

  useEffect(() => {
    fetchTrips();
  }, [filters]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.trip_type) params.trip_type = filters.trip_type;

      const response = await tripsAPI.getAll(params);
      setTrips(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch trips');
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await tripsAPI.delete(tripId);
      fetchTrips();
    } catch (err) {
      alert('Error deleting trip: ' + (err.response?.data?.error || err.message));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6c757d',
      pending_approval: '#ffc107',
      approved: '#28a745',
      in_progress: '#17a2b8',
      completed: '#28a745',
      cancelled: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Trip Management</h1>
        <p>View and manage all trips</p>
        <Link to="/trips/new" className="btn-primary">
          Create New Trip
        </Link>
      </div>

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.trip_type}
          onChange={(e) => setFilters({ ...filters, trip_type: e.target.value })}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="single">Single</option>
          <option value="combined">Combined</option>
        </select>
      </div>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      {trips.length === 0 ? (
        <div className="empty-state">
          <p>No trips found.</p>
          <Link to="/trips/new" className="btn-primary">
            Create Your First Trip
          </Link>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => (
            <div key={trip.id} className="trip-card">
              <div className="trip-header">
                <h3>{trip.trip_number}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(trip.status) }}
                >
                  {trip.status.replace('_', ' ')}
                </span>
              </div>

              <div className="trip-info">
                <p><strong>Type:</strong> {trip.trip_type}</p>
                {trip.planned_start_date && (
                  <p><strong>Date:</strong> {new Date(trip.planned_start_date).toLocaleDateString()}</p>
                )}
                {trip.job_type && (
                  <p><strong>Job:</strong> {trip.job_type}</p>
                )}
                {trip.work_hours_estimate && (
                  <p><strong>Work Hours:</strong> {trip.work_hours_estimate}h</p>
                )}
                {trip.estimated_total_cost != null && (
                  <p><strong>Estimated Cost:</strong> €{Number(trip.estimated_total_cost).toFixed(2)}</p>
                )}
                {trip.customer_count !== undefined && (
                  <p><strong>Customers:</strong> {trip.customer_count}</p>
                )}
              </div>

              <div className="trip-actions">
                <Link to={`/trips/${trip.id}`} className="btn-secondary">
                  View Details
                </Link>
                <button
                  onClick={() => handleDelete(trip.id)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TripsPage;

