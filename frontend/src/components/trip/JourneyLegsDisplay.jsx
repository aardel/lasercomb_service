/**
 * JourneyLegsDisplay Component
 * 
 * Displays journey legs for both car and air travel options in a side-by-side layout.
 * Includes visual highlighting for long European flights and connecting flight indicators.
 * 
 * @module components/trip/JourneyLegsDisplay
 */

import React from 'react';
import { generateAirTravelLegs } from '../../utils/travelUtils';

/**
 * JourneyLegsDisplay Component
 * 
 * @param {Object} props
 * @param {Object} props.costPreview - The cost preview data from the backend
 * @param {Object} props.selectedTechnician - The currently selected technician
 */
const JourneyLegsDisplay = ({ costPreview, selectedTechnician }) => {
  if (!costPreview) return null;

  return (
    <div className="legs-breakdown-grid">
      {/* Car Travel Legs - Left (only if road option available) */}
      {costPreview.road_option ? (
        <div className="legs-breakdown">
          <h3>🚗 Car Travel - Journey Legs</h3>
          <div className="legs-list">
            {costPreview.legs.map((leg, idx) => (
              <div key={idx} className="leg-item">
                <div className="leg-path">
                  <span className="dot"></span>
                  <span className="line"></span>
                  <div className="leg-info">
                    <strong>{leg.from} → {leg.to}</strong>
                    <span>{leg.distance_text} • {leg.duration_text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <CarNotAvailableCard roadNotAvailable={costPreview.road_not_available} />
      )}

      {/* Air Travel Legs - Right */}
      <AirTravelLegsCard 
        flightOption={costPreview.flight_option}
        generateAirTravelLegs={generateAirTravelLegs}
        selectedTechnician={selectedTechnician}
      />
    </div>
  );
};

/**
 * Card shown when car travel is not available
 */
const CarNotAvailableCard = ({ roadNotAvailable }) => (
  <div className="legs-breakdown" style={{
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px dashed #f59e0b'
  }}>
    <h3 style={{ color: '#92400e' }}>🚗 Car Travel</h3>
    <div style={{
      textAlign: 'center',
      padding: '30px 20px',
      color: '#92400e'
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌍</div>
      <div style={{ fontWeight: '600', marginBottom: '8px' }}>
        Destination Too Far for Driving
      </div>
      <div style={{ fontSize: '13px', opacity: 0.9 }}>
        {roadNotAvailable?.not_reachable_by_road ? (
          <>
            Cannot drive to this destination (across water/unreachable by road).
            <br />
            Only flight option is available.
          </>
        ) : roadNotAvailable?.driving_hours ? (
          <>
            Driving would take {roadNotAvailable.driving_hours.toFixed(1)} hours one-way.
            <br />
            Only flight option is available for this destination.
          </>
        ) : (
          'Only flight option is available for this destination.'
        )}
      </div>
    </div>
  </div>
);

/**
 * Air Travel Legs Card
 */
const AirTravelLegsCard = ({ flightOption, generateAirTravelLegs, selectedTechnician }) => {
  if (!flightOption) {
    return (
      <div className="legs-breakdown">
        <h3>✈️ Air Travel - Journey Legs</h3>
        <div className="legs-list">
          <div className="leg-item-empty">No flight option available</div>
        </div>
      </div>
    );
  }

  const airLegs = generateAirTravelLegs(flightOption, selectedTechnician);
  
  if (airLegs.length === 0) {
    return (
      <div className="legs-breakdown">
        <h3>✈️ Air Travel - Journey Legs</h3>
        <div className="legs-list">
          <div className="leg-item-empty">No flight option available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="legs-breakdown">
      <h3>✈️ Air Travel - Journey Legs</h3>
      <div className="legs-list">
        {airLegs.map((leg, idx) => (
          <LegItem key={idx} leg={leg} />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual leg item with styling for long European flights
 */
const LegItem = ({ leg }) => {
  const containerStyle = leg.isLongEuropeanFlight ? {
    background: '#fee2e2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '8px',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
  } : {};

  const dotStyle = leg.isLongEuropeanFlight ? {
    background: '#ef4444',
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
  } : {};

  return (
    <div className="leg-item" style={containerStyle}>
      <div className="leg-path">
        <span className="dot" style={dotStyle}></span>
        <span className="line"></span>
        <div className="leg-info">
          <strong style={leg.isLongEuropeanFlight ? { color: '#ef4444' } : {}}>
            {leg.routing || `${leg.from} → ${leg.to}`}
            {leg.isConnecting && (
              <span style={{ 
                fontSize: '11px', 
                color: '#6b7280', 
                marginLeft: '4px', 
                fontWeight: 'normal' 
              }}>
                (connecting)
              </span>
            )}
            {leg.isLongEuropeanFlight && ' ⚠️'}
          </strong>
          <span style={leg.isLongEuropeanFlight ? { color: '#991b1b', fontWeight: '600' } : {}}>
            {leg.duration_text}
            {leg.flight_info && ` • ${leg.flight_info}`}
            {leg.detail && ` (${leg.detail})`}
            {leg.isLongEuropeanFlight && ' - Unusually long flight for Europe!'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JourneyLegsDisplay;

