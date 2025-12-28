/**
 * TravelCostCards Component
 * 
 * Displays the side-by-side travel cost comparison cards (Car vs Air)
 * Extracted from TripWizardPage.jsx for better maintainability.
 * 
 * @module components/trip/TravelCostCards
 */

import React from 'react';
import { formatHoursToTime, formatCurrency } from '../../utils/formatters';
import { generateAirTravelLegs } from '../../utils/travelUtils';

/**
 * TravelCostCards Component
 */
const TravelCostCards = ({
  costPreview,
  selectedTechnician
}) => {
  if (!costPreview) return null;

  // Check if there are any long European flights for the warning icon
  const hasLongEuropeanFlight = costPreview.flight_option 
    ? (() => {
        const airLegs = generateAirTravelLegs(costPreview.flight_option, selectedTechnician);
        return airLegs.some(leg => leg.isLongEuropeanFlight);
      })()
    : false;

  return (
    <div className="travel-costs-grid">
      {/* Car Travel Card - Only show if road option is available */}
      {costPreview.road_option ? (
        <div className={`travel-cost-card ${costPreview.recommended === 'road' ? 'recommended' : ''}`}>
          <div className="card-header">
            <h3>🚗 Travel Cost by Car</h3>
            {costPreview.recommended === 'road' && <span className="badge">Recommended</span>}
          </div>
          <div className="travel-cost-amount">{formatCurrency(costPreview.road_option.travel_cost)}</div>
          <div className="travel-metrics">
            <div className="metric">
              <span>Distance</span>
              <span>{costPreview.road_option.distance_km.toFixed(0)} km</span>
            </div>
            <div className="metric">
              <span>Travel Time</span>
              <span>{formatHoursToTime(costPreview.road_option.duration_hours)}</span>
            </div>
            <div className="metric">
              <span>Toll Roads</span>
              <span>{formatCurrency(costPreview.road_option.toll_cost || 0)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="travel-cost-card" style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '2px dashed #f59e0b',
          opacity: 0.9
        }}>
          <div className="card-header">
            <h3>🚗 Travel by Car</h3>
            <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>Not Available</span>
          </div>
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            color: '#92400e'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚫</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              Driving Not Practical
            </div>
            <div style={{ fontSize: '13px' }}>
              {costPreview.road_not_available?.not_reachable_by_road 
                ? 'No driving route available (destination across water)'
                : (costPreview.road_not_available?.reason || 'Distance too far for driving')
              }
              {costPreview.road_not_available?.driving_hours && (
                <div style={{ marginTop: '4px' }}>
                  ({costPreview.road_not_available.driving_hours.toFixed(1)}h one-way)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Air Travel Card */}
      {costPreview.flight_option ? (
        <div className={`travel-cost-card ${costPreview.recommended === 'flight' ? 'recommended' : ''}`}>
          <div className="card-header">
            <h3>
              ✈️ Travel Cost by Air
              {hasLongEuropeanFlight && (
                <span style={{
                  display: 'inline-block',
                  marginLeft: '8px',
                  fontSize: '18px',
                  color: '#f59e0b',
                  cursor: 'help',
                  verticalAlign: 'middle',
                  filter: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.5))',
                  animation: 'pulse-yellow 2s ease-in-out infinite'
                }} title="Warning: This trip includes unusually long European flights (>10 hours). Please verify the flight details.">
                  ⚠️
                </span>
              )}
            </h3>
            {costPreview.recommended === 'flight' && <span className="badge">Recommended</span>}
          </div>
          <div className="travel-cost-amount">{formatCurrency(costPreview.flight_option.travel_cost)}</div>
          <div className="travel-metrics">
            <div className="metric">
              <span>Flight Cost</span>
              <span>{formatCurrency(costPreview.flight_option.flight_cost)}</span>
            </div>
            <div className="metric">
              <span>Rental Car</span>
              <span>{formatCurrency(costPreview.flight_option.rental_car_cost)}</span>
            </div>
            <div className="metric">
              <span>Ground Transport</span>
              <span>{formatCurrency(costPreview.flight_option.ground_transport)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="travel-cost-card disabled">
          <div className="card-header">
            <h3>✈️ Travel Cost by Air</h3>
          </div>
          <div className="travel-cost-amount">—</div>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '1rem' }}>No flight options available</p>
        </div>
      )}
    </div>
  );
};

export default TravelCostCards;

