import React from 'react';
import { formatTime } from '../../utils/formatters';

/**
 * SelectedFlightDisplay Component
 * Displays selected flight information for both single and multi-customer trips
 */
const SelectedFlightDisplay = ({
  selectedFlight,
  segmentFlights,
  segments,
  isMultiCustomer,
  onClearFlight,
  onClearSegment,
  onSegmentClick,
  loadingSegmentFlights,
  getTotalSegmentFlightsCost
}) => {
  // Single customer: Show round-trip flight selection
  if (!isMultiCustomer && selectedFlight) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        border: '2px solid #4caf50',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <span style={{ fontWeight: '600', color: '#2e7d32', fontSize: '16px' }}>
                Flight Selected
              </span>
              {selectedFlight.source && (
                <span style={{
                  background: selectedFlight.source?.includes('Groq') ? '#9c27b0' : '#1976d2',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {selectedFlight.source?.includes('Groq') ? '🤖 AI Estimate' : '✈️ ' + selectedFlight.source}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1b5e20' }}>
                  €{(selectedFlight.price || selectedFlight.total_price || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>Round-trip</div>
              </div>
              
              {selectedFlight.outbound && (
                <div style={{ borderLeft: '2px solid #a5d6a7', paddingLeft: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>OUTBOUND</div>
                  <div style={{ fontWeight: '600', color: '#333' }}>
                    {selectedFlight.outbound.routing || `${selectedFlight.outbound.from || '?'} → ${selectedFlight.outbound.to || '?'}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {selectedFlight.outbound.departure_time || '?'} - {selectedFlight.outbound.arrival_time || '?'}
                    {selectedFlight.outbound.duration_minutes && ` (${formatTime(selectedFlight.outbound.duration_minutes)})`}
                  </div>
                </div>
              )}
              
              {selectedFlight.return && (
                <div style={{ borderLeft: '2px solid #a5d6a7', paddingLeft: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>RETURN</div>
                  <div style={{ fontWeight: '600', color: '#333' }}>
                    {selectedFlight.return.routing || `${selectedFlight.return.from || '?'} → ${selectedFlight.return.to || '?'}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {selectedFlight.return.departure_time || '?'} - {selectedFlight.return.arrival_time || '?'}
                    {selectedFlight.return.duration_minutes && ` (${formatTime(selectedFlight.return.duration_minutes)})`}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={onClearFlight}
            style={{
              background: 'transparent',
              border: '1px solid #c8e6c9',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#666',
              fontSize: '12px'
            }}
            title="Clear selected flight"
          >
            ✕ Clear
          </button>
        </div>
      </div>
    );
  }
  
  // Multi-customer: Show segment-by-segment selection
  if (isMultiCustomer && segments.length > 0) {
    const totalFlightCost = getTotalSegmentFlightsCost();
    const selectedCount = Object.values(segmentFlights).filter(s => s?.flight || s?.mode === 'drive').length;
    
    return (
      <div style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
        border: '2px solid #1976d2',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🗺️</span>
            <span style={{ fontWeight: '600', color: '#1565c0', fontSize: '16px' }}>
              Multi-Stop Journey ({segments.length} segments)
            </span>
            <span style={{
              background: selectedCount === segments.length ? '#4caf50' : '#ff9800',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {selectedCount}/{segments.length} configured
            </span>
          </div>
          {totalFlightCost > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1565c0' }}>
                €{totalFlightCost.toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>Total flights</div>
            </div>
          )}
        </div>
        
        {/* Segments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {segments.map((segment, idx) => {
            const segmentData = segmentFlights[segment.segmentIndex];
            const isConfigured = segmentData?.flight || segmentData?.mode === 'drive';
            const isLoading = loadingSegmentFlights[segment.segmentIndex];
            
            return (
              <div 
                key={segment.segmentIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: isConfigured ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  borderRadius: '8px',
                  border: isConfigured ? '1px solid #4caf50' : '1px solid #90caf9',
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.6 : 1
                }}
                onClick={() => {
                  if (!isLoading) {
                    onSegmentClick(segment);
                  }
                }}
              >
                {/* Segment number */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isConfigured ? '#4caf50' : '#1976d2',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                
                {/* Route */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{segment.from.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {segment.from.label}
                    </span>
                    <span style={{ color: '#666' }}>→</span>
                    <span>{segment.to.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {segment.to.label}
                    </span>
                  </div>
                  
                  {/* Selected option info */}
                  {isConfigured && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {segmentData?.mode === 'drive' ? (
                        <span>🚗 Driving</span>
                      ) : segmentData?.flight ? (
                        <span>
                          ✈️ {segmentData.flight.outbound?.routing || segmentData.flight.routing || 'Flight'} 
                          {' • '}€{(segmentData.flight.price || 0).toFixed(0)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                
                {/* Status/Action */}
                <div style={{ flexShrink: 0 }}>
                  {isLoading ? (
                    <span className="spinner-small" style={{ width: '16px', height: '16px' }}></span>
                  ) : isConfigured ? (
                    <span style={{ color: '#4caf50', fontSize: '16px' }}>✓</span>
                  ) : (
                    <span style={{ 
                      background: '#1976d2', 
                      color: 'white', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      Select
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Clear all button */}
        {selectedCount > 0 && (
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <button
              onClick={onClearSegment}
              style={{
                background: 'transparent',
                border: '1px solid #90caf9',
                borderRadius: '6px',
                padding: '4px 12px',
                cursor: 'pointer',
                color: '#666',
                fontSize: '12px'
              }}
            >
              Clear all selections
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // No flight selected
  return null;
};

export default SelectedFlightDisplay;

