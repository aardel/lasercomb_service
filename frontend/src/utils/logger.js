/**
 * Advanced Logging utility for Trip Cost application
 * 
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Categories for filtering
 * - In-memory log storage for UI viewer
 * - Console output with colors
 * - Can be disabled for production
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Technician', 'Loaded airports:', airports);
 *   logger.info('FlightSearch', 'Found flights:', count);
 *   logger.warn('CostPreview', 'No flight selected');
 *   logger.error('API', 'Request failed:', error);
 * 
 *   // Get logs for UI
 *   const logs = logger.getLogs();
 *   logger.clearLogs();
 */

// Configuration
const CONFIG = {
  // Set to false in production to disable console logging
  consoleEnabled: process.env.NODE_ENV !== 'production',
  
  // Set to true to show debug-level logs (most verbose)
  debugEnabled: true,
  
  // Maximum number of logs to keep in memory
  maxLogs: 500,
  
  // Categories to show in console (empty = show all)
  enabledCategories: [],
  
  // Store logs in memory for UI viewer
  storeEnabled: true
};

// In-memory log storage
let logs = [];
let listeners = [];

// Log levels with colors and priorities
const LOG_LEVELS = {
  debug: { priority: 0, color: '#9e9e9e', bg: '#f5f5f5', emoji: '🔍' },
  info: { priority: 1, color: '#2196f3', bg: '#e3f2fd', emoji: 'ℹ️' },
  warn: { priority: 2, color: '#ff9800', bg: '#fff3e0', emoji: '⚠️' },
  error: { priority: 3, color: '#f44336', bg: '#ffebee', emoji: '❌' }
};

// Known categories for better filtering
const CATEGORIES = [
  'Technician',
  'Customer',
  'FlightSearch',
  'CostPreview',
  'Map',
  'API',
  'Settings',
  'Cache',
  'Rates',
  'Airport',
  'Distance',
  'Hotel',
  'Toll',
  'UI',
  'Backend' // Backend-related logs
];

/**
 * Format a log entry
 */
const createLogEntry = (level, category, message, data) => {
  return {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    category: category || 'General',
    message: typeof message === 'string' ? message : JSON.stringify(message),
    data: data.length > 0 ? data : undefined,
    ...LOG_LEVELS[level]
  };
};

/**
 * Store log in memory
 */
const storeLog = (entry) => {
  if (!CONFIG.storeEnabled) return;
  
  logs.unshift(entry); // Add to beginning (newest first)
  
  // Trim to max size
  if (logs.length > CONFIG.maxLogs) {
    logs = logs.slice(0, CONFIG.maxLogs);
  }
  
  // Notify listeners
  listeners.forEach(fn => fn(logs));
};

/**
 * Output to console
 */
const consoleLog = (entry, ...data) => {
  if (!CONFIG.consoleEnabled) return;
  if (entry.level === 'debug' && !CONFIG.debugEnabled) return;
  if (CONFIG.enabledCategories.length > 0 && !CONFIG.enabledCategories.includes(entry.category)) return;
  
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const prefix = `[${time}] [${entry.category}]`;
  
  const style = `color: ${entry.color}; font-weight: bold;`;
  
  switch (entry.level) {
    case 'error':
      console.error(`%c${prefix}`, style, entry.message, ...data);
      break;
    case 'warn':
      console.warn(`%c${prefix}`, style, entry.message, ...data);
      break;
    default:
      console.log(`%c${prefix}`, style, entry.message, ...data);
  }
};

/**
 * Main logger object
 */
export const logger = {
  /**
   * Debug level - Most verbose, for development only
   */
  debug: (category, message, ...data) => {
    const entry = createLogEntry('debug', category, message, data);
    storeLog(entry);
    consoleLog(entry, ...data);
  },

  /**
   * Info level - General information
   */
  info: (category, message, ...data) => {
    const entry = createLogEntry('info', category, message, data);
    storeLog(entry);
    consoleLog(entry, ...data);
  },

  /**
   * Warn level - Warnings that don't stop execution
   */
  warn: (category, message, ...data) => {
    const entry = createLogEntry('warn', category, message, data);
    storeLog(entry);
    consoleLog(entry, ...data);
  },

  /**
   * Error level - Errors that need attention
   * Automatically downgrades network errors (ERR_NETWORK, ERR_CONNECTION_REFUSED) to warn level
   */
  error: (category, message, ...data) => {
    // Check if this is a network error (expected when backend is down)
    const isNetworkError = data.some(item => {
      if (!item) return false;
      const errorStr = JSON.stringify(item).toLowerCase();
      const messageStr = (item.message || '').toLowerCase();
      return errorStr.includes('err_network') || 
             errorStr.includes('err_connection_refused') ||
             messageStr.includes('network error') ||
             messageStr.includes('connection refused');
    });

    // Use warn level for network errors (expected when backend is down)
    const level = isNetworkError ? 'warn' : 'error';
    const entry = createLogEntry(level, category, message, data);
    storeLog(entry);
    consoleLog(entry, ...data);
  },

  /**
   * Get all stored logs
   */
  getLogs: () => [...logs],

  /**
   * Get logs filtered by level
   */
  getLogsByLevel: (level) => logs.filter(log => log.level === level),

  /**
   * Get logs filtered by category
   */
  getLogsByCategory: (category) => logs.filter(log => log.category === category),

  /**
   * Clear all stored logs
   */
  clearLogs: () => {
    logs = [];
    listeners.forEach(fn => fn(logs));
  },

  /**
   * Subscribe to log updates
   */
  subscribe: (callback) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(fn => fn !== callback);
    };
  },

  /**
   * Get available categories
   */
  getCategories: () => {
    const usedCategories = [...new Set(logs.map(log => log.category))];
    return [...new Set([...CATEGORIES, ...usedCategories])].sort();
  },

  /**
   * Get log counts by level
   */
  getCounts: () => {
    return {
      total: logs.length,
      debug: logs.filter(l => l.level === 'debug').length,
      info: logs.filter(l => l.level === 'info').length,
      warn: logs.filter(l => l.level === 'warn').length,
      error: logs.filter(l => l.level === 'error').length
    };
  },

  /**
   * Export logs as JSON
   */
  exportLogs: () => {
    return JSON.stringify(logs, null, 2);
  },

  /**
   * Update configuration
   */
  configure: (options) => {
    Object.assign(CONFIG, options);
  },

  /**
   * Get current configuration
   */
  getConfig: () => ({ ...CONFIG })
};

/**
 * Legacy log function for gradual migration
 */
export const log = (category, ...args) => {
  logger.debug(category, args[0], ...args.slice(1));
};

export default logger;
