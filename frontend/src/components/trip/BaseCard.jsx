import React from 'react';
import { getSettings } from '../../services/settingsStorage';

/**
 * BaseCard Component
 * Displays base location (departure/return) with transport options
 */
const BaseCard = ({
  label,
  technician,
  selectedAirport,
  onTransportChange,
  onTechnicianUpdate
}) => {
  if (!technician) return null;

  const settings = getSettings();
  const kmRate = settings.billing?.kmRateOwnCar || 0.88;
  const carCost = selectedAirport?.distance_to_home_km 
    ? (selectedAirport.distance_to_home_km * kmRate).toFixed(2)
    : null;

  return (
    <div className="base-card">
      <div className="base-card-header">
        <span className="base-icon">🏠</span>
        <div className="base-info" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label className="base-label">{label}</label>
              <div className="base-address">{technician.homeAddress || 'Not set'}</div>
            </div>
          </div>
          <div className="base-transport-section">
            <div className="base-transport-options">
              <label className={`base-transport-option ${technician.transportToAirport === 'taxi' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name={`${label.toLowerCase().replace(/\s+/g, '-')}-transport`}
                  checked={technician.transportToAirport === 'taxi'}
                  onChange={() => {
                    if (technician.id) {
                      onTechnicianUpdate(technician.id, { transportToAirport: 'taxi' });
                      onTransportChange('taxi');
                    }
                  }}
                />
                <span>🚕 Taxi</span>
                {technician.taxiCost && (
                  <span className="transport-cost">€{(technician.taxiCost / 2).toFixed(2)}</span>
                )}
              </label>
              <label className={`base-transport-option ${technician.transportToAirport === 'car' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name={`${label.toLowerCase().replace(/\s+/g, '-')}-transport`}
                  checked={technician.transportToAirport === 'car'}
                  onChange={() => {
                    if (technician.id) {
                      onTechnicianUpdate(technician.id, { transportToAirport: 'car' });
                      onTransportChange('car');
                    }
                  }}
                />
                <span>🚗 Personal Car</span>
                {selectedAirport && selectedAirport.distance_to_home_km && (
                  <span className="transport-cost">
                    {selectedAirport.distance_to_home_km.toFixed(1)}km • €{carCost}
                  </span>
                )}
              </label>
            </div>
            {selectedAirport && selectedAirport.distance_to_home_km && (
              <div className="base-distance">
                Distance to airport: {selectedAirport.distance_to_home_km.toFixed(1)} km
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseCard;



