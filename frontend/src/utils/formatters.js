/**
 * Formatting utilities for Trip Cost application
 */

/**
 * Format minutes to human-readable time (e.g., 125 -> "2h 5m")
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted time string
 */
export const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
};

/**
 * Format decimal hours to human-readable time (e.g., 14.3 -> "14h 18m")
 * @param {number} decimalHours - Duration in decimal hours
 * @returns {string} Formatted time string
 */
export const formatHoursToTime = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0h';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Format currency value
 * @param {number} value - Amount to format
 * @param {string} currency - Currency symbol (default: €)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = '€') => {
  const num = Number(value) || 0;
  return `${currency}${num.toFixed(2)}`;
};

/**
 * Format distance in kilometers
 * @param {number} km - Distance in kilometers
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted distance string
 */
export const formatDistance = (km, decimals = 1) => {
  const num = Number(km) || 0;
  return `${num.toFixed(decimals)} km`;
};





