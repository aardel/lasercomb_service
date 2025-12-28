import React from 'react';

/**
 * RouteVisualization Component
 * Displays the route map visualization
 */
const RouteVisualization = ({
  costPreview,
  mapRef,
  googleMapsLoaded,
  mapInitialized
}) => {
  return (
    <section className="preview-section glass-card map-preview">
      <div className="section-header">
        <h2>Route Visualization</h2>
        {costPreview && costPreview.road_option && (
          <span className="distance-badge">
            {(costPreview.road_option.distance_km || 0).toFixed(1)} km
          </span>
        )}
      </div>
      <div className="map-wrapper">
        <div ref={mapRef} className="map-container"></div>
        {(!googleMapsLoaded || !mapInitialized) && (
          <div className="map-placeholder">
            <p>Initializing map...</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RouteVisualization;



