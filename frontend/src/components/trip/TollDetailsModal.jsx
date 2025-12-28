import React from 'react';

/**
 * TollDetailsModal Component
 * Displays detailed breakdown of toll costs for a trip
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {number} props.totalTollCost - Total toll cost amount
 * @param {Array} props.tollDetails - Array of individual toll details
 */
const TollDetailsModal = ({ isOpen, onClose, totalTollCost, tollDetails }) => {
  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
        <div className="ai-modal-header">
          <h2>🛣️ Toll Roads Breakdown</h2>
          <button className="ai-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div style={{ marginBottom: '20px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Toll Cost</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>€{totalTollCost.toFixed(2)}</div>
          </div>
          
          {tollDetails && tollDetails.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                {tollDetails.length === 1 && tollDetails[0].note ? 'Toll Information' : `Individual Tolls (${tollDetails.length})`}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tollDetails.map((toll, index) => (
                  <div 
                    key={toll.id || index}
                    style={{
                      padding: '16px',
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                          {toll.name || `Toll ${index + 1}`}
                        </div>
                        {toll.roadName && toll.roadName !== toll.name && (
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                            Road: {toll.roadName}
                          </div>
                        )}
                        {toll.location && (
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            Location: {typeof toll.location === 'object' 
                              ? `${toll.location.lat?.toFixed(4)}, ${toll.location.lng?.toFixed(4)}`
                              : toll.location}
                          </div>
                        )}
                        {toll.note && (
                          <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px', padding: '8px', background: '#fef3c7', borderRadius: '4px' }}>
                            ℹ️ {toll.note}
                          </div>
                        )}
                        {toll.source && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            Source: {toll.source === 'google' ? 'Google Maps' : toll.source === 'tollguru' ? 'TollGuru API' : toll.source === 'here' ? 'HERE Maps' : toll.source}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669', marginLeft: '16px' }}>
                        €{toll.cost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>No detailed toll breakdown available</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                The toll cost was calculated from route data, but individual toll details are not available.
              </div>
            </div>
          )}
        </div>
        
        <div className="ai-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TollDetailsModal;





