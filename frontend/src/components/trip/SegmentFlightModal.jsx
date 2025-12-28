import React from 'react';

/**
 * SegmentFlightModal Component
 * Modal for selecting flights for individual segments in multi-customer trips
 * 
 * @param {Object} props
 * @param {number|null} props.activeSegmentModal - Index of active segment, or null if closed
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.generateTripSegments - Function to get trip segments
 * @param {Object} props.segmentFlights - Object containing flight data per segment
 * @param {Object} props.loadingSegmentFlights - Object containing loading state per segment
 * @param {Function} props.searchSegmentFlights - Function to search flights for a segment
 * @param {Function} props.setSegmentDrive - Function to set segment mode to drive
 * @param {Function} props.selectSegmentFlight - Function to select a flight for a segment
 * @param {Function} props.clearSegmentFlight - Function to clear flight selection for a segment
 */
const SegmentFlightModal = ({
  activeSegmentModal,
  onClose,
  generateTripSegments,
  segmentFlights,
  loadingSegmentFlights,
  searchSegmentFlights,
  setSegmentDrive,
  selectSegmentFlight,
  clearSegmentFlight
}) => {
  if (activeSegmentModal === null) return null;

  const segments = generateTripSegments();
  const segment = segments.find(s => s.segmentIndex === activeSegmentModal);
  const segmentData = segmentFlights[activeSegmentModal];
  const isLoading = loadingSegmentFlights[activeSegmentModal];
  const flightOptions = segmentData?.searchResults || [];
  
  if (!segment) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div 
        className="ai-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }}
      >
        <div className="ai-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✈️</span>
            Segment {activeSegmentModal + 1}: {segment.from.label} → {segment.to.label}
          </h2>
          <button className="ai-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-modal-body">
          {/* Segment Info with Airport Codes */}
          <div style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px'
          }}>
            {/* Route Display with Airport Codes */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '12px'
            }}>
              {/* Origin */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  background: segment.from.airportCode ? '#1976d2' : '#9e9e9e', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '18px',
                  marginBottom: '4px'
                }}>
                  {segment.from.airportCode || '???'}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>{segment.from.label}</div>
              </div>
              
              {/* Arrow */}
              <div style={{ fontSize: '24px', color: '#1976d2' }}>✈️ →</div>
              
              {/* Destination */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  background: segment.to.airportCode ? '#4caf50' : '#9e9e9e', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '18px',
                  marginBottom: '4px'
                }}>
                  {segment.to.airportCode || '???'}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>{segment.to.label}</div>
              </div>
            </div>
            
            {/* Airport Names (if resolved from search) */}
            {(segmentData?.originAirport || segmentData?.destAirport) && (
              <div style={{ 
                fontSize: '11px', 
                color: '#666', 
                textAlign: 'center',
                padding: '8px',
                background: '#e3f2fd',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <strong>Search used:</strong>{' '}
                {segmentData?.originAirport?.code} ({segmentData?.originAirport?.name || 'Unknown'})
                {' → '}
                {segmentData?.destAirport?.code} ({segmentData?.destAirport?.name || 'Unknown'})
              </div>
            )}
            
            {/* Warning if airport codes missing */}
            {(!segment.from.airportCode || !segment.to.airportCode) && (
              <div style={{ 
                fontSize: '11px', 
                color: '#ff9800', 
                textAlign: 'center',
                padding: '6px',
                background: '#fff3e0',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                ⚠️ Airport code{!segment.from.airportCode && !segment.to.airportCode ? 's' : ''} not resolved yet. 
                {!segment.from.airportCode && ` Origin: using coordinates.`}
                {!segment.to.airportCode && ` Destination: using coordinates.`}
              </div>
            )}
            
            {/* Date and Search Button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '8px'
            }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                📅 {new Date(segment.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <button
                onClick={() => searchSegmentFlights(segment)}
                disabled={isLoading}
                style={{
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small" style={{ width: '14px', height: '14px' }}></span>
                    Searching...
                  </>
                ) : (
                  <>🔄 Search Flights</>
                )}
              </button>
            </div>
          </div>
          
          {/* Travel Mode Selection */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
              How will you travel this segment?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSegmentDrive(activeSegmentModal)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: segmentData?.mode === 'drive' ? '2px solid #4caf50' : '1px solid #ddd',
                  borderRadius: '8px',
                  background: segmentData?.mode === 'drive' ? '#e8f5e9' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🚗</span>
                <span style={{ fontWeight: '500' }}>Drive</span>
                {segmentData?.mode === 'drive' && <span style={{ color: '#4caf50' }}>✓</span>}
              </button>
              <button
                onClick={() => {
                  if (!segmentData?.searchResults) {
                    searchSegmentFlights(segment);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: segmentData?.mode === 'fly' ? '2px solid #4caf50' : '1px solid #ddd',
                  borderRadius: '8px',
                  background: segmentData?.mode === 'fly' ? '#e8f5e9' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>✈️</span>
                <span style={{ fontWeight: '500' }}>Fly</span>
                {segmentData?.mode === 'fly' && <span style={{ color: '#4caf50' }}>✓</span>}
              </button>
            </div>
          </div>
          
          {/* Flight Options */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <span className="spinner-small" style={{ width: '32px', height: '32px', marginBottom: '12px' }}></span>
              <div>Searching for flights...</div>
            </div>
          ) : flightOptions.length > 0 ? (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                Available Flights ({flightOptions.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {flightOptions.map((flight, idx) => {
                  const isSelected = segmentData?.flight?.id === flight.id;
                  const flightLeg = flight.outbound || flight;
                  
                  return (
                    <div
                      key={flight.id || idx}
                      onClick={() => selectSegmentFlight(activeSegmentModal, flight)}
                      style={{
                        padding: '12px',
                        border: isSelected ? '2px solid #4caf50' : '1px solid #e0e0e0',
                        borderRadius: '8px',
                        background: isSelected ? '#e8f5e9' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                            {flightLeg.routing || `${flightLeg.from || '?'} → ${flightLeg.to || '?'}`}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {flightLeg.departure_time || '?'} - {flightLeg.arrival_time || '?'}
                            {flightLeg.duration_minutes && (
                              <span style={{ marginLeft: '8px' }}>
                                ({Math.floor(flightLeg.duration_minutes / 60)}h {flightLeg.duration_minutes % 60}m)
                              </span>
                            )}
                          </div>
                          {flightLeg.stops > 0 && (
                            <div style={{ fontSize: '11px', color: '#ff9800', marginTop: '2px' }}>
                              {flightLeg.stops} stop{flightLeg.stops > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b5e20' }}>
                            €{(flight.price || 0).toFixed(0)}
                          </div>
                          {flight.source && (
                            <div style={{ 
                              fontSize: '10px', 
                              color: flight.source?.includes('Groq') ? '#9c27b0' : '#666',
                              marginTop: '2px'
                            }}>
                              {flight.source?.includes('Groq') ? '🤖 AI' : flight.source}
                            </div>
                          )}
                          {isSelected && (
                            <div style={{ color: '#4caf50', fontSize: '12px', marginTop: '4px' }}>
                              ✓ Selected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : segmentData?.searchResults !== undefined ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '30px', 
              background: '#fff3e0', 
              borderRadius: '8px',
              border: '1px solid #ffcc80'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>😕</div>
              <div style={{ fontWeight: '600', color: '#e65100', marginBottom: '4px' }}>No flights found</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Consider driving this segment or try different dates
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '30px', 
              background: '#f5f5f5', 
              borderRadius: '8px' 
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              <div style={{ color: '#666' }}>
                Click "Search Flights" to find available options
              </div>
            </div>
          )}
        </div>
        
        <div className="ai-modal-footer" style={{ display: 'flex', gap: '8px' }}>
          {segmentData?.flight && (
            <button 
              className="btn-secondary" 
              onClick={() => clearSegmentFlight(activeSegmentModal)}
            >
              Clear Selection
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentFlightModal;





