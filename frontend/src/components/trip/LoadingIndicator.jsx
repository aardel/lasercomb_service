import React from 'react';

/**
 * LoadingIndicator Component
 * Displays global loading bar and status tag
 */
const LoadingIndicator = ({
  loadingCostPreview,
  loadingFlights,
  loadingHotels
}) => {
  const isLoading = loadingCostPreview || Object.values(loadingFlights).some(v => v) || Object.values(loadingHotels).some(v => v);
  
  if (!isLoading) return null;

  return (
    <>
      <div className="global-processing-bar">
        <div className="progress-line"></div>
      </div>
      <div className="processing-status-tag">
        <span className="spinner-small"></span>
        {loadingCostPreview ? 'Applying pricing...' : 'Syncing travel data...'}
      </div>
    </>
  );
};

export default LoadingIndicator;



