import React from 'react';
import { formatTime } from '../../utils/formatters';

/**
 * TravelModeCard Component
 * Displays travel mode selection (Fly/Drive) between two customers
 */
const TravelModeCard = ({
  fromCustomerIndex,
  toCustomerIndex,
  travelMode,
  transferInfo,
  onModeChange
}) => {
  return (
    <div className="travel-mode-card">
      <div className="travel-mode-header">
        <span className="travel-mode-label">Customer {fromCustomerIndex} → Customer {toCustomerIndex}</span>
      </div>
      <div className="travel-mode-options">
        <label className={`travel-mode-option-card ${travelMode === 'fly' ? 'active' : ''}`}>
          <input
            type="radio"
            name={`travel-mode-${fromCustomerIndex}`}
            checked={travelMode === 'fly'}
            onChange={() => onModeChange('fly')}
          />
          <span className="travel-mode-icon">✈️</span>
          <span className="travel-mode-text">Fly</span>
        </label>
        <label className={`travel-mode-option-card ${travelMode === 'drive' ? 'active' : ''}`}>
          <input
            type="radio"
            name={`travel-mode-${fromCustomerIndex}`}
            checked={travelMode === 'drive'}
            onChange={() => onModeChange('drive')}
          />
          <span className="travel-mode-icon">🚗</span>
          <span className="travel-mode-text">Drive</span>
        </label>
      </div>
      {transferInfo && (
        <div className="transfer-info-card">
          <span className="transfer-time">
            Travel: {formatTime(transferInfo.time_minutes)}
          </span>
          {travelMode === 'drive' && transferInfo.distance_km && (
            <span className="transfer-distance">
              Distance: {transferInfo.distance_km.toFixed(1)} km
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TravelModeCard;



