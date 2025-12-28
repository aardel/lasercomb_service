/**
 * TripFeesSection Component
 * 
 * Displays trip fees breakdown including agent, company, and additional percentage fees.
 * Extracted from TripWizardPage.jsx for better maintainability.
 * 
 * @module components/trip/TripFeesSection
 */

import React from 'react';

/**
 * TripFeesSection Component
 */
const TripFeesSection = ({ costPreview }) => {
  if (!costPreview) return null;
  
  const tripFees = costPreview.trip_fees;
  const hasAnyFees = tripFees && (
    tripFees.agent_fee > 0 || 
    tripFees.company_fee > 0 || 
    tripFees.additional_fee_percent > 0
  );

  if (!hasAnyFees) {
    // Show simple totals if no fees
    return (
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '16px', 
        borderTop: '2px dashed #e5e7eb',
        display: 'grid',
        gridTemplateColumns: (costPreview.road_option && costPreview.flight_option) ? '1fr 1fr' : '1fr',
        gap: '12px'
      }}>
        {costPreview.road_option && (
          <GrandTotalCard 
            type="car"
            total={costPreview.road_option?.total_cost || 0}
            fees={0}
          />
        )}
        {costPreview.flight_option && (
          <GrandTotalCard 
            type="air"
            total={costPreview.flight_option?.total_cost || 0}
            fees={0}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      marginTop: '16px', 
      paddingTop: '16px', 
      borderTop: '2px dashed #e5e7eb'
    }}>
      <h4 style={{ 
        margin: '0 0 12px 0', 
        fontSize: '14px', 
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        📋 Trip Fees <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(per trip)</span>
      </h4>

      {/* Fee Rate Cards - Show what fees apply */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '12px',
        marginBottom: '12px'
      }}>
        {tripFees.agent_fee > 0 && (
          <FeeRateCard 
            label="Agent Fee"
            value={`€${Number(tripFees.agent_fee).toFixed(2)}`}
            bgColor="#f0fdf4"
            borderColor="#bbf7d0"
            labelColor="#166534"
            valueColor="#15803d"
          />
        )}
        {tripFees.company_fee > 0 && (
          <FeeRateCard 
            label="Company Fee"
            value={`€${Number(tripFees.company_fee).toFixed(2)}`}
            bgColor="#eff6ff"
            borderColor="#bfdbfe"
            labelColor="#1e40af"
            valueColor="#1d4ed8"
          />
        )}
        {tripFees.additional_fee_percent > 0 && (
          <FeeRateCard 
            label="Additional Fee Rate"
            value={`${tripFees.additional_fee_percent}%`}
            bgColor="#fef3c7"
            borderColor="#fde68a"
            labelColor="#92400e"
            valueColor="#b45309"
          />
        )}
      </div>
      
      {/* Calculated Fees for Each Option */}
      {(costPreview.road_option || costPreview.flight_option) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: (costPreview.road_option && costPreview.flight_option) ? '1fr 1fr' : '1fr',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {/* Car Option Fees */}
          {costPreview.road_option && costPreview.road_option.trip_fees && (
            <OptionFeesCard 
              type="car"
              baseCost={costPreview.road_option.total_cost}
              tripFees={costPreview.road_option.trip_fees}
              additionalFeePercent={tripFees.additional_fee_percent}
            />
          )}
          
          {/* Flight Option Fees */}
          {costPreview.flight_option && costPreview.flight_option.trip_fees && (
            <OptionFeesCard 
              type="air"
              baseCost={costPreview.flight_option.total_cost}
              tripFees={costPreview.flight_option.trip_fees}
              additionalFeePercent={tripFees.additional_fee_percent}
            />
          )}
        </div>
      )}
      
      {/* Grand Total with Fees */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: (costPreview.road_option && costPreview.flight_option) ? '1fr 1fr' : '1fr',
        gap: '12px'
      }}>
        {costPreview.road_option && (
          <GrandTotalCard 
            type="car"
            total={costPreview.road_option?.total_cost_with_fees || costPreview.road_option?.total_cost || 0}
            fees={costPreview.road_option?.trip_fees?.total_fees || 0}
          />
        )}
        {costPreview.flight_option && (
          <GrandTotalCard 
            type="air"
            total={costPreview.flight_option?.total_cost_with_fees || costPreview.flight_option?.total_cost || 0}
            fees={costPreview.flight_option?.trip_fees?.total_fees || 0}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Fee Rate Card - Shows individual fee type
 */
const FeeRateCard = ({ label, value, bgColor, borderColor, labelColor, valueColor }) => (
  <div style={{ 
    padding: '10px 12px', 
    background: bgColor, 
    borderRadius: '8px',
    border: `1px solid ${borderColor}`
  }}>
    <div style={{ fontSize: '12px', color: labelColor, marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: '600', color: valueColor }}>
      {value}
    </div>
  </div>
);

/**
 * Option Fees Card - Shows breakdown for car or air option
 */
const OptionFeesCard = ({ type, baseCost, tripFees, additionalFeePercent }) => {
  const isCar = type === 'car';
  const bgColor = isCar ? '#f8fafc' : '#f0fdfa';
  const borderColor = isCar ? '#e2e8f0' : '#99f6e4';
  const headerColor = isCar ? '#64748b' : '#0f766e';
  const icon = isCar ? '🚗' : '✈️';
  const label = isCar ? 'Car Option Fees' : 'Flight Option Fees';

  return (
    <div style={{
      padding: '12px',
      background: bgColor,
      borderRadius: '8px',
      border: `1px solid ${borderColor}`
    }}>
      <div style={{ fontSize: '12px', color: headerColor, marginBottom: '8px', fontWeight: '600' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Base Cost:</span>
          <span>€{Number(baseCost).toFixed(2)}</span>
        </div>
        {tripFees.additional_fee_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
            <span>+ {additionalFeePercent}% Fee:</span>
            <span>€{Number(tripFees.additional_fee_amount).toFixed(2)}</span>
          </div>
        )}
        {tripFees.agent_fee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
            <span>+ Agent Fee:</span>
            <span>€{Number(tripFees.agent_fee).toFixed(2)}</span>
          </div>
        )}
        {tripFees.company_fee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1d4ed8' }}>
            <span>+ Company Fee:</span>
            <span>€{Number(tripFees.company_fee).toFixed(2)}</span>
          </div>
        )}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontWeight: '700', 
          paddingTop: '4px', 
          borderTop: `1px solid ${borderColor}` 
        }}>
          <span>Total Fees:</span>
          <span>€{Number(tripFees.total_fees).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Grand Total Card - Shows final total with fees included
 */
const GrandTotalCard = ({ type, total, fees }) => {
  const isCar = type === 'car';
  const background = isCar 
    ? 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)'
    : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)';
  const icon = isCar ? '🚗' : '✈️';
  const label = isCar ? 'Grand Total (Car)' : 'Grand Total (Air)';

  return (
    <div style={{ 
      padding: '14px 16px', 
      background,
      borderRadius: '10px',
      color: 'white'
    }}>
      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700' }}>
        €{Number(total).toFixed(2)}
      </div>
      {fees > 0 && (
        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
          incl. €{Number(fees).toFixed(2)} fees
        </div>
      )}
    </div>
  );
};

export default TripFeesSection;





