import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripsAPI } from '../services/api';
import './TripDetailsPage.css';

function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const response = await tripsAPI.getById(id);
      setTrip(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch trip');
      console.error('Error fetching trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      await tripsAPI.recalculate(id);
      fetchTrip();
      alert('Costs recalculated successfully!');
    } catch (err) {
      alert('Error recalculating: ' + (err.response?.data?.error || err.message));
    } finally {
      setRecalculating(false);
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
        <div className="loading">Loading trip details...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ❌ {error || 'Trip not found'}
        </div>
        <button onClick={() => navigate('/trips')} className="btn-primary">
          Back to Trips
        </button>
      </div>
    );
  }

  const costBreakdown = trip.metadata?.cost_breakdown || {};

  return (
    <div className="page-container">
      <div className="trip-details-header">
        <div>
          <h1>{trip.trip_number}</h1>
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(trip.status) }}
          >
            {trip.status.replace('_', ' ')}
          </span>
        </div>
        <div className="header-actions">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="btn-secondary"
          >
            {recalculating ? 'Recalculating...' : 'Recalculate Costs'}
          </button>
          <button onClick={() => navigate('/trips')} className="btn-primary">
            Back to Trips
          </button>
        </div>
      </div>

      <div className="trip-details-grid">
        <div className="details-section">
          <h2>Trip Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Type:</strong> {trip.trip_type}
            </div>
            {trip.planned_start_date && (
              <div className="info-item">
                <strong>Start Date:</strong> {new Date(trip.planned_start_date).toLocaleString()}
              </div>
            )}
            {trip.planned_end_date && (
              <div className="info-item">
                <strong>End Date:</strong> {new Date(trip.planned_end_date).toLocaleString()}
              </div>
            )}
            {trip.job_type && (
              <div className="info-item">
                <strong>Job Type:</strong> {trip.job_type}
              </div>
            )}
            {trip.work_hours_estimate && (
              <div className="info-item">
                <strong>Work Hours:</strong> {trip.work_hours_estimate}h
              </div>
            )}
            {trip.selected_travel_mode && (
              <div className="info-item">
                <strong>Travel Mode:</strong> {trip.selected_travel_mode}
              </div>
            )}
            {trip.total_distance_km != null && (
              <div className="info-item">
                <strong>Distance:</strong> {Number(trip.total_distance_km).toFixed(2)} km
              </div>
            )}
            {trip.total_travel_hours != null && (
              <div className="info-item">
                <strong>Travel Time:</strong> {Number(trip.total_travel_hours).toFixed(2)}h
              </div>
            )}
          </div>

          {trip.job_description && (
            <div className="description">
              <strong>Description:</strong>
              <p>{trip.job_description}</p>
            </div>
          )}

          {trip.notes && (
            <div className="notes">
              <strong>Notes:</strong>
              <p>{trip.notes}</p>
            </div>
          )}
        </div>

        <div className="customers-section">
          <h2>Customers ({trip.customers?.length || 0})</h2>
          {trip.customers && trip.customers.length > 0 ? (
            <div className="customers-list">
              {trip.customers.map((tc, index) => (
                <div key={tc.customer_id} className="customer-item">
                  <div className="customer-header">
                    <span className="visit-order">{tc.visit_order || index + 1}</span>
                    <h3>{tc.customer_name}</h3>
                  </div>
                  <p className="customer-location">{tc.customer_city}, {tc.customer_country}</p>
                  {tc.work_percentage > 0 && (
                    <p className="work-percentage">Work: {tc.work_percentage}%</p>
                  )}
                  {tc.visit_duration_hours && (
                    <p className="visit-duration">Duration: {tc.visit_duration_hours}h</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No customers assigned</p>
          )}
        </div>

        {costBreakdown.total_quotation && (
          <div className="costs-section">
            <h2>Cost Breakdown</h2>
            <div className="cost-breakdown">
              <div className="cost-category">
                <h3>Working Costs</h3>
                <div className="cost-item">
                  <span>Hours:</span>
                  <span>{costBreakdown.arbeitszeit_hours}h</span>
                </div>
                <div className="cost-item">
                  <span>Rate:</span>
                  <span>€{costBreakdown.arbeitszeit_rate}/h</span>
                </div>
                <div className="cost-item total">
                  <span>Total:</span>
                  <span>€{costBreakdown.arbeitszeit_total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="cost-category">
                <h3>Travel Costs</h3>
                <div className="cost-item">
                  <span>Travel Time:</span>
                  <span>€{costBreakdown.reisezeit_total?.toFixed(2)}</span>
                </div>
                {costBreakdown.entfernung_total > 0 && (
                  <div className="cost-item">
                    <span>Distance:</span>
                    <span>€{costBreakdown.entfernung_total?.toFixed(2)}</span>
                  </div>
                )}
                <div className="cost-item">
                  <span>Daily Allowances:</span>
                  <span>€{(costBreakdown.tagesspesen_24h_total + costBreakdown.tagesspesen_8h_total).toFixed(2)}</span>
                </div>
                {costBreakdown.hotel_total > 0 && (
                  <div className="cost-item">
                    <span>Hotel:</span>
                    <span>€{costBreakdown.hotel_total?.toFixed(2)}</span>
                  </div>
                )}
                {(costBreakdown.flight_national > 0 || costBreakdown.flight_international > 0) && (
                  <div className="cost-item">
                    <span>Flight:</span>
                    <span>€{(costBreakdown.flight_national + costBreakdown.flight_international).toFixed(2)}</span>
                  </div>
                )}
                {(costBreakdown.taxi > 0 || costBreakdown.parken > 0 || costBreakdown.treibstoff > 0 || costBreakdown.maut > 0) && (
                  <div className="cost-item">
                    <span>Other:</span>
                    <span>€{(costBreakdown.taxi + costBreakdown.parken + costBreakdown.treibstoff + costBreakdown.maut).toFixed(2)}</span>
                  </div>
                )}
                <div className="cost-item total">
                  <span>Travel Total:</span>
                  <span>€{costBreakdown.komplette_rk?.toFixed(2)}</span>
                </div>
              </div>

              <div className="cost-category grand-total">
                <div className="cost-item total">
                  <span>Grand Total:</span>
                  <span>€{costBreakdown.total_quotation?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TripDetailsPage;

