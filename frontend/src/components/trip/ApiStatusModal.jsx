import React from 'react';

/**
 * ApiStatusModal Component
 * Displays the status of all APIs used by the application
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.apiStatuses - Object containing status for each API
 * @param {Function} props.getOverallApiHealth - Function to get overall health status
 * @param {Function} props.testAllApis - Function to test all APIs
 * @param {boolean} props.testingApis - Whether APIs are currently being tested
 * @param {Function} props.resetStatuses - Function to reset all API statuses
 */
const ApiStatusModal = ({ 
  isOpen, 
  onClose, 
  apiStatuses, 
  getOverallApiHealth, 
  testAllApis, 
  testingApis,
  resetStatuses
}) => {
  if (!isOpen) return null;

  const apis = [
    { key: 'groq', name: '🤖 Groq AI', desc: 'AI-powered flight search' },
    { key: 'amadeus', name: '✈️ Amadeus', desc: 'Airline flight data' },
    { key: 'serpapi', name: '🔍 SerpAPI (Google Flights)', desc: 'Google Flights search' },
    { key: 'googleMaps', name: '🗺️ Google Maps', desc: 'Distance & routing' },
    { key: 'tollApi', name: '🛣️ Toll API', desc: 'Toll road costs' }
  ];

  const getStatusColor = (status) => {
    const colorMap = {
      'ok': '#4caf50',
      'warning': '#ff9800',
      'rate_limited': '#ff5722',
      'error': '#f44336',
      'auth_error': '#f44336',
      'disabled': '#607d8b',
      'unknown': '#9e9e9e',
      'testing': '#2196f3'
    };
    return colorMap[status] || '#9e9e9e';
  };

  const getHealthColor = () => {
    const health = getOverallApiHealth();
    const colorMap = {
      'ok': '#4caf50',
      'warning': '#ff9800',
      'rate_limited': '#ff5722',
      'error': '#f44336'
    };
    return colorMap[health] || '#9e9e9e';
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
        <div className="ai-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: getHealthColor(),
              display: 'inline-block'
            }} />
            API Status Dashboard
          </h2>
          <button className="ai-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div style={{ padding: '8px 0' }}>
            {/* Status Legend */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              marginBottom: '16px', 
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '8px',
              fontSize: '11px',
              flexWrap: 'wrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4caf50' }} /> OK
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff9800' }} /> Warning
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5722' }} /> Rate Limited
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f44336' }} /> Error
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#9e9e9e' }} /> Not Tested
              </span>
            </div>
            
            {/* API List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {apis.map(api => {
                const status = apiStatuses[api.key];
                const statusColor = getStatusColor(status?.status);
                
                return (
                  <div 
                    key={api.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: status?.status === 'error' || status?.status === 'auth_error' 
                        ? '#ffebee' 
                        : status?.status === 'rate_limited'
                        ? '#fff3e0'
                        : status?.status === 'ok'
                        ? '#e8f5e9'
                        : '#fafafa',
                      borderRadius: '8px',
                      border: `1px solid ${statusColor}20`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                        {api.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {api.desc}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        justifyContent: 'flex-end'
                      }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: statusColor,
                          boxShadow: `0 0 6px ${statusColor}`
                        }} />
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: statusColor,
                          textTransform: 'uppercase'
                        }}>
                          {status?.status === 'rate_limited' ? 'LIMIT' : 
                           status?.status === 'auth_error' ? 'AUTH' :
                           status?.status === 'disabled' ? 'OFF' :
                           status?.status === 'testing' ? 'TESTING' :
                           status?.status?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                      {status?.message && status.message !== 'Not tested yet' && (
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                          {status.message}
                        </div>
                      )}
                      {status?.lastChecked && (
                        <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                          {new Date(status.lastChecked).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Help Text */}
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#e3f2fd', 
              borderRadius: '8px',
              fontSize: '11px',
              color: '#1565c0'
            }}>
              💡 <strong>Tip:</strong> API status updates automatically when you perform searches. 
              If an API shows "Rate Limited", wait a few minutes before trying again. 
              Check Settings → API Settings to enable/disable specific APIs.
            </div>
          </div>
        </div>
        
        <div className="ai-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <button 
            className="btn-secondary" 
            onClick={resetStatuses}
            style={{ flex: 1 }}
          >
            Reset
          </button>
          <button 
            className="btn-primary" 
            onClick={testAllApis}
            disabled={testingApis}
            style={{ 
              flex: 2, 
              background: testingApis ? '#90caf9' : '#2196f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {testingApis ? (
              <>
                <span style={{ 
                  width: '14px', 
                  height: '14px', 
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  display: 'inline-block'
                }} />
                Testing...
              </>
            ) : (
              '🔍 Test All APIs'
            )}
          </button>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiStatusModal;





