import React from 'react';

/**
 * RatesBreakdown Component
 * Displays the rates used for cost calculation
 */
const RatesBreakdown = ({ costPreview }) => {
  if (!costPreview?.metadata?.rates_used) return null;

  const rates = costPreview.metadata.rates_used;

  return (
    <div className="rates-breakdown">
      <h3>Rates Used</h3>
      <table className="rates-table">
        <tbody>
          <tr>
            <td>Work Hour Rate</td>
            <td className="text-right">€{(Number(rates.work_hour_rate) || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Travel Hour Rate</td>
            <td className="text-right">€{(Number(rates.travel_hour_rate) || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Mileage Rate</td>
            <td className="text-right">€{(Number(rates.mileage_rate) || 0).toFixed(2)}/km</td>
          </tr>
          <tr>
            <td>Daily Allowance (24h)</td>
            <td className="text-right">€{(Number(rates.daily_allowance_24h) || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Daily Allowance (8h)</td>
            <td className="text-right">€{(Number(rates.daily_allowance_8h) || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Hotel Rate</td>
            <td className="text-right">€{(Number(rates.hotel_rate) || 0).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RatesBreakdown;



