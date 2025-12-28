import React from 'react';
import TravelCostCards from './TravelCostCards';
import TotalCostCard from './TotalCostCard';
import TripFeesSection from './TripFeesSection';
import JourneyLegsDisplay from './JourneyLegsDisplay';
import DetailedBreakdowns from './DetailedBreakdowns';
import RatesBreakdown from './RatesBreakdown';
import PerCustomerCosts from './PerCustomerCosts';

/**
 * CostPreviewSection Component
 * Complete cost preview section with all cost breakdowns
 */
const CostPreviewSection = ({
  costPreview,
  loadingCostPreview,
  selectedTechnician,
  onTollDetailsClick,
  customers = []
}) => {
  return (
    <section className="preview-section glass-card cost-summary-preview">
      {loadingCostPreview && (
        <div className="section-loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Updating costs & rewards...</div>
        </div>
      )}
      <h2>Cost & Duration Preview</h2>
      {costPreview ? (
        <div className="preview-content">
          <TravelCostCards
            costPreview={costPreview}
            selectedTechnician={selectedTechnician}
          />

          <TotalCostCard costPreview={costPreview} />

          <PerCustomerCosts
            costPreview={costPreview}
            customers={customers}
          />

          <TripFeesSection costPreview={costPreview} />

          <JourneyLegsDisplay
            costPreview={costPreview}
            selectedTechnician={selectedTechnician}
          />

          <DetailedBreakdowns
            costPreview={costPreview}
            onTollDetailsClick={onTollDetailsClick}
          />

          <RatesBreakdown costPreview={costPreview} />
        </div>
      ) : (
        <div className="empty-preview">
          <p>Add customers and a starting point to see live cost and route previews.</p>
        </div>
      )}
    </section>
  );
};

export default CostPreviewSection;



