import React from 'react';

/**
 * DashboardHeader Component
 * Displays the main header with title and API status indicator
 */
const DashboardHeader = ({
  getOverallApiHealth,
  onApiStatusClick
}) => {
  const health = getOverallApiHealth();
  
  const getHealthColor = () => {
    switch(health) {
      case 'ok': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'rate_limited': return '#ff5722';
      case 'error': return '#f44336';
      case 'auth_error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getHealthShadow = () => {
    const color = health === 'ok' ? '#4caf50' : 
                 health === 'warning' ? '#ff9800' :
                 health === 'rate_limited' ? '#ff5722' :
                 health === 'error' || health === 'auth_error' ? '#f44336' : '#9e9e9e';
    return `0 0 8px ${color}`;
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          Trip Planner
          {/* API Status Indicator */}
          <button
            onClick={onApiStatusClick}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: getHealthColor(),
              boxShadow: getHealthShadow(),
              animation: health === 'error' || health === 'rate_limited' 
                ? 'pulse-error 1.5s ease-in-out infinite' : 'none'
            }}
            title={`API Status: ${health.replace('_', ' ').toUpperCase()}\nClick to view details`}
          />
        </h1>
        <p>Configure your multi-stop journey with real-time cost optimization</p>
      </div>
    </header>
  );
};

export default DashboardHeader;



