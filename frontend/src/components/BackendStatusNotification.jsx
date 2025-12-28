import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';
import { checkBackendHealth } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * BackendStatusNotification Component
 * Shows a popup notification when backend is down and provides restart option
 */
const BackendStatusNotification = ({ onBackendRestart }) => {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online', 'offline', 'checking'
  const [showNotification, setShowNotification] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  // Check backend status using the shared health check function
  const checkBackendStatus = useCallback(async () => {
    try {
      const isHealthy = await checkBackendHealth();
      
      if (isHealthy) {
        setBackendStatus(prev => {
          if (prev === 'offline') {
            logger.info('Backend', 'Backend is now online');
          }
          return 'online';
        });
        setShowNotification(false);
        setLastCheck(new Date());
        return true;
      } else {
        setBackendStatus('offline');
        setShowNotification(true);
        setLastCheck(new Date());
        return false;
      }
    } catch (error) {
      // Treat all errors as backend being down
      logger.warn('Backend', 'Backend is offline:', error.code || error.message);
      setBackendStatus('offline');
      setShowNotification(true);
      setLastCheck(new Date());
      return false;
    }
  }, []);

  // Initial check and periodic monitoring
  useEffect(() => {
    // Initial check immediately
    checkBackendStatus();

    // Set up periodic checks every 3 seconds (more frequent for better UX)
    const interval = setInterval(() => {
      checkBackendStatus();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [checkBackendStatus]);
  
  // Listen for window errors and network failures
  useEffect(() => {
    const handleError = (event) => {
      // Check for network-related errors
      if (event.error?.code === 'ERR_NETWORK' || 
          event.error?.code === 'ERR_CONNECTION_REFUSED' ||
          event.error?.message?.toLowerCase().includes('network') ||
          event.error?.message?.toLowerCase().includes('connection refused')) {
        logger.warn('Backend', 'Detected network error in window error handler');
        setBackendStatus('offline');
        setShowNotification(true);
        setLastCheck(new Date());
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.code === 'ERR_NETWORK' || 
          event.reason?.code === 'ERR_CONNECTION_REFUSED' ||
          event.reason?.message?.toLowerCase().includes('network')) {
        logger.warn('Backend', 'Detected network error in unhandled rejection');
        setBackendStatus('offline');
        setShowNotification(true);
        setLastCheck(new Date());
      }
    });
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Update notification visibility when status changes
  useEffect(() => {
    if (backendStatus === 'offline') {
      setShowNotification(true);
    } else if (backendStatus === 'online') {
      setShowNotification(false);
    }
    // Keep showing if checking and we haven't confirmed online yet
  }, [backendStatus]);

  const handleRetry = async () => {
    setBackendStatus('checking');
    const isOnline = await checkBackendStatus();
    if (isOnline) {
      setShowNotification(false);
    }
  };

  const handleRestartBackend = () => {
    if (onBackendRestart) {
      onBackendRestart();
    } else {
      // Default action: show instructions
      alert(
        'To restart the backend:\n\n' +
        '1. Open a terminal\n' +
        '2. Navigate to: Trip Cost/backend\n' +
        '3. Run: npm run dev\n\n' +
        'Or use the restart button if configured.'
      );
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
    // Re-check after a delay to see if backend came back
    setTimeout(() => {
      checkBackendStatus();
    }, 2000);
  };

  // Always show notification when backend is offline or checking
  // Don't show when online
  if (backendStatus === 'online') {
    return null;
  }
  
  // Always show if offline or checking - ensure immediate visibility
  // This ensures immediate visibility when backend is detected as down
  const shouldShow = backendStatus === 'offline' || backendStatus === 'checking' || showNotification;
  
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        background: '#fff',
        border: '3px solid #f44336',
        borderRadius: '8px',
        boxShadow: '0 6px 20px rgba(244, 67, 54, 0.4)',
        padding: '20px',
        minWidth: '380px',
        maxWidth: '500px',
        animation: 'slideInRight 0.3s ease-out',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: backendStatus === 'checking' ? '#ff9800' : '#f44336',
            animation: 'pulse 1.5s ease-in-out infinite',
            flexShrink: 0
          }}
        />
        <h3 style={{ margin: 0, color: '#c62828', fontSize: '18px', fontWeight: '600' }}>
          ⚠️ Backend Unavailable
        </h3>
        <button
          onClick={handleDismiss}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666',
            padding: '0 8px'
          }}
          title="Dismiss (will reappear if still offline)"
        >
          ×
        </button>
      </div>

      {/* Message */}
      <p style={{ margin: '0 0 16px 0', color: '#333', lineHeight: '1.6', fontSize: '14px' }}>
        {backendStatus === 'checking' 
          ? 'Checking backend status...' 
          : 'The backend server is not responding. Most features will not work until the backend is restarted.'}
      </p>

      {/* Status info */}
      {lastCheck && (
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#666' }}>
          Last checked: {lastCheck.toLocaleTimeString()}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={handleRetry}
          style={{
            padding: '8px 16px',
            background: '#2196f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔄 Retry Connection
        </button>
        <button
          onClick={handleRestartBackend}
          style={{
            padding: '8px 16px',
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔧 Restart Backend
        </button>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px' }}>
        <strong>Manual restart:</strong>
        <code style={{ display: 'block', marginTop: '4px', padding: '4px', background: '#fff', borderRadius: '2px' }}>
          cd "Trip Cost/backend" && npm run dev
        </code>
      </div>
    </div>
  );
};

export default BackendStatusNotification;


