/**
 * DetailedBreakdowns Component
 * 
 * Displays detailed cost breakdowns for both car and air travel options.
 * Includes clickable toll details and time breakdowns for flights.
 * 
 * @module components/trip/DetailedBreakdowns
 */

import React from 'react';
import { formatTime, formatHoursToTime } from '../../utils/formatters';

/**
 * DetailedBreakdowns Component
 * 
 * @param {Object} props
 * @param {Object} props.costPreview - The cost preview data from the backend
 * @param {Function} props.onTollDetailsClick - Handler for toll details click
 */
const DetailedBreakdowns = ({ costPreview, onTollDetailsClick }) => {
  if (!costPreview) return null;

  return (
    <div className="detailed-breakdowns-container">
      {/* Car Travel Breakdown */}
      {costPreview.road_option ? (
        <CarBreakdownCard 
          roadOption={costPreview.road_option}
          metadata={costPreview.metadata}
          tagesspesen={costPreview.tagesspesen_breakdown}
          hotelTotal={costPreview.hotel_total}
          onTollDetailsClick={onTollDetailsClick}
        />
      ) : (
        <CarNotAvailableCard roadNotAvailable={costPreview.road_not_available} />
      )}

      {/* Air Travel Breakdown */}
      {costPreview.flight_option && (
        <AirBreakdownCard 
          flightOption={costPreview.flight_option}
          metadata={costPreview.metadata}
        />
      )}
    </div>
  );
};

/**
 * Car Travel Breakdown Card
 */
const CarBreakdownCard = ({ roadOption, metadata, tagesspesen, hotelTotal, onTollDetailsClick }) => {
  const handleTollClick = () => {
    const tollsBreakdown = roadOption.breakdown?.tolls;
    if (!tollsBreakdown) return;
    
    const tollDetails = tollsBreakdown.details;
    const tollCost = tollsBreakdown.cost || 0;
    
    if (tollCost > 0 && onTollDetailsClick) {
      onTollDetailsClick(Array.isArray(tollDetails) ? tollDetails : [], tollCost);
    }
  };

  return (
    <div className="detailed-costs">
      <h3>🚗 Car Travel - Detailed Breakdown</h3>
      {roadOption.breakdown ? (
        <div className="cost-list">
          <CostItem
            name="Travel Time"
            explanation={roadOption.breakdown.travel_time.explanation}
            cost={roadOption.breakdown.travel_time.cost}
          />
          <CostItem
            name="Mileage Reimbursement"
            explanation={roadOption.breakdown.mileage.explanation}
            cost={roadOption.breakdown.mileage.cost}
          />
          <div 
            className={`cost-item ${(roadOption.breakdown?.tolls?.cost > 0) ? 'clickable' : ''}`}
            onClick={handleTollClick}
            style={(roadOption.breakdown?.tolls?.cost > 0) ? { cursor: 'pointer' } : {}}
          >
            <div>
              <span className="cost-name">
                Toll Roads
                {(roadOption.breakdown?.tolls?.cost > 0) && (
                  <span className="click-hint"> (Click for details)</span>
                )}
              </span>
              <span className="cost-explanation">{roadOption.breakdown?.tolls?.explanation || ''}</span>
            </div>
            <strong>€{(roadOption.breakdown?.tolls?.cost || 0).toFixed(2)}</strong>
          </div>
          <CostItem
            name="Daily Allowances"
            explanation={roadOption.breakdown.daily_allowances.explanation}
            cost={roadOption.breakdown.daily_allowances.total}
          />
          <CostItem
            name="Hotel"
            explanation={roadOption.breakdown.hotel.explanation}
            cost={roadOption.breakdown.hotel.cost}
          />
          <div className="cost-item total">
            <span>Total Travel Cost by Car</span>
            <strong>€{roadOption.travel_cost.toFixed(2)}</strong>
          </div>
        </div>
      ) : (
        <SimplifiedCarBreakdown 
          roadOption={roadOption}
          metadata={metadata}
          tagesspesen={tagesspesen}
          hotelTotal={hotelTotal}
        />
      )}
    </div>
  );
};

/**
 * Simplified Car Breakdown (when detailed breakdown not available)
 */
const SimplifiedCarBreakdown = ({ roadOption, metadata, tagesspesen, hotelTotal }) => (
  <div className="cost-list">
    <div className="cost-item">
      <span>Travel Time ({formatHoursToTime(Number(roadOption.duration_hours) || 0)})</span>
      <strong>€{(Number(roadOption.duration_hours * metadata.rates_used.travel_hour_rate) || 0).toFixed(2)}</strong>
    </div>
    <div className="cost-item">
      <span>Mileage ({(Number(roadOption.distance_km) || 0).toFixed(1)}km)</span>
      <strong>€{(Number(roadOption.distance_km * metadata.rates_used.mileage_rate) || 0).toFixed(2)}</strong>
    </div>
    {roadOption.toll_cost > 0 && (
      <div className="cost-item" style={{ cursor: 'default' }}>
        <span>Toll Roads</span>
        <strong>€{roadOption.toll_cost.toFixed(2)}</strong>
      </div>
    )}
    <div className="cost-item">
      <span>Daily Allowances</span>
      <strong>€{(Number(tagesspesen?.reduce((s, i) => s + i.final, 0) || 0)).toFixed(2)}</strong>
    </div>
    <div className="cost-item">
      <span>Hotel ({roadOption.hotel_nights || 0} nights)</span>
      <strong>€{(Number(hotelTotal) || 0).toFixed(2)}</strong>
    </div>
    <div className="cost-item total">
      <span>Total Travel Cost by Car</span>
      <strong>€{roadOption.travel_cost.toFixed(2)}</strong>
    </div>
  </div>
);

/**
 * Car Not Available Card
 */
const CarNotAvailableCard = ({ roadNotAvailable }) => (
  <div className="detailed-costs" style={{
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px dashed #f59e0b'
  }}>
    <h3 style={{ color: '#92400e' }}>🚗 Car Travel - Not Available</h3>
    <div style={{
      textAlign: 'center',
      padding: '20px',
      color: '#92400e'
    }}>
      <p style={{ margin: 0 }}>
        Driving is not practical for this destination.
        {roadNotAvailable?.driving_hours && (
          <> Estimated driving time: {roadNotAvailable.driving_hours.toFixed(1)} hours.</>
        )}
      </p>
    </div>
  </div>
);

/**
 * Air Travel Breakdown Card
 */
const AirBreakdownCard = ({ flightOption, metadata }) => (
  <div className="detailed-costs">
    <h3>✈️ Air Travel - Detailed Breakdown</h3>
    {flightOption.breakdown ? (
      <DetailedAirBreakdown flightOption={flightOption} />
    ) : (
      <SimplifiedAirBreakdown flightOption={flightOption} metadata={metadata} />
    )}

    <TimeBreakdown flightOption={flightOption} />
  </div>
);

/**
 * Detailed Air Breakdown (when breakdown data available)
 */
const DetailedAirBreakdown = ({ flightOption }) => (
  <div className="cost-list">
    <CostItem
      name="Travel Time"
      explanation={flightOption.breakdown.travel_time.explanation}
      cost={flightOption.breakdown.travel_time.cost}
    />
    <CostItem
      name="Flight Ticket"
      explanation={flightOption.breakdown.flight.explanation}
      cost={flightOption.breakdown.flight.cost}
    />
    <CostItem
      name="Rental Car"
      explanation={flightOption.breakdown.rental_car.explanation}
      cost={flightOption.breakdown.rental_car.cost}
    />
    <CostItem
      name="Rental Car Fuel"
      explanation={flightOption.breakdown.fuel.explanation}
      cost={flightOption.breakdown.fuel.cost}
    />
    <CostItem
      name="Ground Transport"
      explanation={flightOption.breakdown.ground_transport.explanation}
      cost={flightOption.breakdown.ground_transport.cost}
    />
    <CostItem
      name="Daily Allowances"
      explanation={flightOption.breakdown.daily_allowances.explanation}
      cost={flightOption.breakdown.daily_allowances.total}
    />
    <CostItem
      name="Hotel"
      explanation={flightOption.breakdown.hotel.explanation}
      cost={flightOption.breakdown.hotel.cost}
    />
    <div className="cost-item total">
      <span>Total Travel Cost by Air</span>
      <strong>€{flightOption.travel_cost.toFixed(2)}</strong>
    </div>
  </div>
);

/**
 * Simplified Air Breakdown (when detailed breakdown not available)
 */
const SimplifiedAirBreakdown = ({ flightOption, metadata }) => (
  <div className="cost-list">
    <div className="cost-item">
      <span>Travel Time ({formatHoursToTime(Number(flightOption.total_travel_hours) || 0)})</span>
      <strong>€{(Number(flightOption.total_travel_hours * metadata.rates_used.travel_hour_rate) || 0).toFixed(2)}</strong>
    </div>
    <div className="cost-item">
      <span>Flight Ticket</span>
      <strong>€{flightOption.flight_cost.toFixed(2)}</strong>
    </div>
    <div className="cost-item">
      <span>Rental Car ({flightOption.days_required} days)</span>
      <strong>€{flightOption.rental_car_cost.toFixed(2)}</strong>
    </div>
    {(flightOption.rental_car_fuel_cost || 0) > 0 && (
      <div className="cost-item">
        <span>Rental Car Fuel</span>
        <strong>€{(Number(flightOption.rental_car_fuel_cost) || 0).toFixed(2)}</strong>
      </div>
    )}
    <div className="cost-item">
      <span>Ground Transport</span>
      <strong>€{flightOption.ground_transport.toFixed(2)}</strong>
    </div>
    <div className="cost-item">
      <span>Daily Allowances</span>
      <strong>€{(Number(flightOption.allowances_total) || 0).toFixed(2)}</strong>
    </div>
    <div className="cost-item">
      <span>Hotel ({flightOption.hotel_nights || 0} nights)</span>
      <strong>€{(Number(flightOption.hotel_cost) || 0).toFixed(2)}</strong>
    </div>
    <div className="cost-item total">
      <span>Total Travel Cost by Air</span>
      <strong>€{flightOption.travel_cost.toFixed(2)}</strong>
    </div>
  </div>
);

/**
 * Time Breakdown for Air Travel
 */
const TimeBreakdown = ({ flightOption }) => (
  <div className="time-breakdown-detailed">
    <h4>Door-to-Door Time Breakdown</h4>
    <div className="time-step">
      <span>Base to Airport <span style={{ color: '#6b7280', fontSize: '11px' }}>(x2)</span></span>
      <span>{formatTime(flightOption.time_breakdown.to_airport)}</span>
    </div>
    <div className="time-step">
      <span>Security & Boarding <span style={{ color: '#6b7280', fontSize: '11px' }}>(x2)</span></span>
      <span>{formatTime(flightOption.time_breakdown.security_boarding)}</span>
    </div>
    <div className="time-step highlight">
      <span>Flight Duration <span style={{ color: '#6b7280', fontSize: '11px' }}>(out + return)</span></span>
      <span>{formatTime(flightOption.time_breakdown.flight_duration)}</span>
    </div>
    <div className="time-step">
      <span>Deboarding & Luggage <span style={{ color: '#6b7280', fontSize: '11px' }}>(x2)</span></span>
      <span>{formatTime(flightOption.time_breakdown.deboarding_luggage)}</span>
    </div>
    <div className="time-step">
      <span>Airport to Destination <span style={{ color: '#6b7280', fontSize: '11px' }}>(x2)</span></span>
      <span>{formatTime(flightOption.time_breakdown.to_destination)}</span>
    </div>
    <div className="time-total">
      <span>Total Door-to-Door</span>
      <span>{formatTime(Math.round(flightOption.total_travel_hours * 60))}</span>
    </div>
  </div>
);

/**
 * Reusable Cost Item Component
 */
const CostItem = ({ name, explanation, cost }) => (
  <div className="cost-item">
    <div>
      <span className="cost-name">{name}</span>
      <span className="cost-explanation">{explanation}</span>
    </div>
    <strong>€{cost.toFixed(2)}</strong>
  </div>
);

export default DetailedBreakdowns;





