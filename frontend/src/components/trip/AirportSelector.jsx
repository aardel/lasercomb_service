import React from 'react';

/**
 * AirportSelector Component
 * Displays a list of airports for selection (departure or return)
 */
const AirportSelector = ({
  label,
  airports,
  selectedAirport,
  placeholder,
  onSelect
}) => {
  return (
    <div className="route-section">
      <label className="route-label">{label}</label>
      <div className="airport-selector">
        {airports && airports.length > 0 ? (
          airports.map((airport, idx) => {
            const isSelected = selectedAirport?.code === airport.code;
            return (
              <div 
                key={idx} 
                className={`airport-option ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(airport)}
                style={{ cursor: 'pointer' }}
              >
                <span className="airport-code">{airport.code}</span>
                <span className="airport-name">{airport.name}</span>
                {airport.distance_to_home_km && (
                  <span className="airport-distance">{airport.distance_to_home_km.toFixed(1)}km</span>
                )}
                {isSelected && (
                  <span className="airport-checkmark">✓</span>
                )}
              </div>
            );
          })
        ) : (
          <div className="airport-placeholder">{placeholder}</div>
        )}
      </div>
    </div>
  );
};

export default AirportSelector;



