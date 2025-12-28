import React from 'react';
import { formatHoursToTime } from '../../utils/formatters';

/**
 * TotalCostCard Component
 * Displays total costs breakdown including work time and subtotals
 */
const TotalCostCard = ({ costPreview }) => {
  if (!costPreview) return null;

  return (
    <div className="total-cost-card">
      <h3>💰 Total Costs</h3>
      <div className="total-costs-grid">
        <div className="total-item">
          <span className="total-label">Work Time Cost</span>
          <span className="total-value">€{(Number(costPreview.arbeitszeit_total) || 0).toFixed(2)}</span>
          <span className="total-detail">
            {formatHoursToTime(Number(costPreview.total_work_hours) || 0)} × €{costPreview.metadata.rates_used.work_hour_rate.toFixed(2)}/h
          </span>
        </div>
        {costPreview.road_option && (
          <div className="total-item">
            <span className="total-label">Subtotal (Car + Work)</span>
            <span className="total-value">€{(Number(costPreview.road_option.total_cost) || 0).toFixed(2)}</span>
            <span className="total-detail">
              €{(Number(costPreview.road_option.travel_cost) || 0).toFixed(2)} + €{(Number(costPreview.arbeitszeit_total) || 0).toFixed(2)}
            </span>
          </div>
        )}
        {costPreview.flight_option && (
          <div className="total-item">
            <span className="total-label">Subtotal (Air + Work)</span>
            <span className="total-value">€{(Number(costPreview.flight_option.total_cost) || 0).toFixed(2)}</span>
            <span className="total-detail">
              €{(Number(costPreview.flight_option.travel_cost) || 0).toFixed(2)} + €{(Number(costPreview.arbeitszeit_total) || 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TotalCostCard;



