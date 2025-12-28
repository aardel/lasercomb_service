import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

/**
 * LogViewer Component
 * Displays application logs with filtering and search capabilities
 */
const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({
    level: 'all',
    category: 'all',
    source: 'all', // 'all', 'frontend', 'backend'
    search: ''
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState(null);
  const logContainerRef = useRef(null);

  // Subscribe to log updates
  useEffect(() => {
    try {
      // Log that the viewer is being initialized
      logger.info('UI', 'LogViewer component mounted');
      
      // Get initial logs
      const initialLogs = logger.getLogs();
      console.log('[LogViewer] Initial logs:', initialLogs.length);
      setLogs(Array.isArray(initialLogs) ? initialLogs : []);
      
      // Subscribe to updates
      const unsubscribe = logger.subscribe((newLogs) => {
        console.log('[LogViewer] Received log update:', newLogs.length, 'logs');
        setLogs(Array.isArray(newLogs) ? [...newLogs] : []);
      });

      // Force a refresh after a short delay to catch any logs created during mount
      const refreshTimer = setTimeout(() => {
        const currentLogs = logger.getLogs();
        console.log('[LogViewer] Refresh check:', currentLogs.length, 'logs');
        setLogs(Array.isArray(currentLogs) ? [...currentLogs] : []);
      }, 100);

      return () => {
        clearTimeout(refreshTimer);
        unsubscribe();
      };
    } catch (err) {
      console.error('Error initializing LogViewer:', err);
      setError(err.message);
      setLogs([]);
    }
  }, []);

  // Auto-scroll to top when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter.level !== 'all' && log.level !== filter.level) return false;
    if (filter.category !== 'all' && log.category !== filter.category) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const counts = React.useMemo(() => {
    try {
      return logger.getCounts();
    } catch (error) {
      return { total: 0, debug: 0, info: 0, warn: 0, error: 0 };
    }
  }, [logs]);

  const categories = React.useMemo(() => {
    try {
      return logger.getCategories();
    } catch (error) {
      return [];
    }
  }, [logs]);

  const toggleExpand = (logId) => {
    setExpanded(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const handleExport = () => {
    try {
      const dataStr = logger.exportLogs();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileName = `trip-cost-logs-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatData = (data) => {
    if (!data) return null;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  // Show error if logger failed
  if (error) {
    return (
      <div style={{ padding: '20px', border: '1px solid #f44336', borderRadius: '8px', background: '#ffebee' }}>
        <h3 style={{ color: '#c62828', marginBottom: '10px' }}>❌ Error Loading LogViewer</h3>
        <p style={{ color: '#c62828' }}>{error}</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Logger object: {logger ? 'exists' : 'missing'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', padding: '20px', background: '#fff' }}>
      {/* Debug: Component is rendering */}
      <div style={{ marginBottom: '10px', padding: '8px', background: '#e3f2fd', borderRadius: '4px', fontSize: '12px' }}>
        ✅ LogViewer component is rendering | Logs: {logs.length} | Error: {error || 'none'}
      </div>
      
      {/* Header with stats */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            background: '#f5f5f5',
            color: '#666'
          }}>
            Total: {counts.total}
          </span>
          <span style={{
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            background: '#e3f2fd',
            color: '#2196f3'
          }}>
            ℹ️ {counts.info}
          </span>
          <span style={{
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            background: '#fff3e0',
            color: '#ff9800'
          }}>
            ⚠️ {counts.warn}
          </span>
          <span style={{
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            background: '#ffebee',
            color: '#f44336'
          }}>
            ❌ {counts.error}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>

        <button
          onClick={() => {
            logger.info('UI', 'Test log generated from LogViewer');
            logger.debug('UI', 'This is a debug log');
            logger.warn('UI', 'This is a warning log');
            logger.error('UI', 'This is an error log (test)');
          }}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: '1px solid #4caf50',
            borderRadius: '6px',
            background: '#e8f5e9',
            color: '#2e7d32',
            cursor: 'pointer'
          }}
        >
          🧪 Test Logs
        </button>

        <button
          onClick={handleExport}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          📥 Export
        </button>

        <button
          onClick={() => logger.clearLogs()}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            border: '1px solid #ffcdd2',
            borderRadius: '6px',
            background: '#ffebee',
            color: '#c62828',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Level:</label>
          <select
            value={filter.level}
            onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value }))}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="all">All Levels</option>
            <option value="debug">🔍 Debug</option>
            <option value="info">ℹ️ Info</option>
            <option value="warn">⚠️ Warning</option>
            <option value="error">❌ Error</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Category:</label>
          <select
            value={filter.category}
            onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Source:</label>
          <select
            value={filter.source}
            onChange={(e) => setFilter(prev => ({ ...prev, source: e.target.value }))}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="all">All Sources</option>
            <option value="frontend">🖥️ Frontend</option>
            <option value="backend">⚙️ Backend</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Search:</label>
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px'
            }}
          />
          {filter.search && (
            <button
              onClick={() => setFilter(prev => ({ ...prev, search: '' }))}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: 'none',
                background: '#eee',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Showing count */}
      <div style={{ 
        fontSize: '11px', 
        color: '#999', 
        marginBottom: '8px',
        padding: '8px',
        background: '#f0f0f0',
        borderRadius: '4px'
      }}>
        Showing {filteredLogs.length} of {logs.length} logs | Filtered: {filteredLogs.length > 0 ? 'YES' : 'NO'} | All logs: {logs.length > 0 ? 'YES' : 'NO'}
      </div>

      {/* Log entries */}
      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          border: '2px solid #2196f3',
          borderRadius: '8px',
          background: '#fafafa',
          minHeight: '300px',
          maxHeight: '500px',
          padding: '10px'
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div>No logs to display</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Logs will appear here as you use the application
            </div>
            <div style={{ fontSize: '10px', marginTop: '8px', color: '#666' }}>
              Debug: logs.length = {logs.length}, filteredLogs.length = {filteredLogs.length}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'Monaco, Consolas, monospace', fontSize: '11px' }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #eee',
                  background: log.bg,
                  cursor: log.data ? 'pointer' : 'default'
                }}
                onClick={() => log.data && toggleExpand(log.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  {/* Level indicator */}
                  <span style={{ 
                    width: '20px', 
                    textAlign: 'center',
                    flexShrink: 0
                  }}>
                    {log.emoji}
                  </span>
                  
                  {/* Time */}
                  <span style={{ 
                    color: '#999', 
                    width: '70px',
                    flexShrink: 0
                  }}>
                    {formatTime(log.timestamp)}
                  </span>
                  
                  {/* Category */}
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: log.color + '20',
                    color: log.color,
                    fontSize: '10px',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {log.category}
                  </span>
                  
                  {/* Message */}
                  <span style={{ 
                    color: '#333',
                    flex: 1,
                    wordBreak: 'break-word'
                  }}>
                    {log.message}
                  </span>
                  
                  {/* Expand indicator */}
                  {log.data && (
                    <span style={{ 
                      color: '#999',
                      fontSize: '10px',
                      flexShrink: 0
                    }}>
                      {expanded[log.id] ? '▼' : '▶'} data
                    </span>
                  )}
                </div>
                
                {/* Expanded data */}
                {expanded[log.id] && log.data && (
                  <pre style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontSize: '10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {formatData(log.data)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;


