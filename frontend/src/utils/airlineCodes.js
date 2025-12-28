// Airline Code to Name Mapping
// This file can be easily updated when new airlines are added or names change
// Format: { "CODE": "Full Airline Name" }

import airlineCodes from './airlineCodes.json';

/**
 * Get the full airline name from an IATA airline code
 * @param {string} code - Two-letter IATA airline code (e.g., "LH", "BA", "VY")
 * @returns {string} - Full airline name, or the code itself if not found
 */
export const getAirlineName = (code) => {
  if (!code) return '';
  return airlineCodes[code.toUpperCase()] || code;
};

/**
 * Get all airline codes and names
 * @returns {Object} - Object with codes as keys and names as values
 */
export const getAllAirlines = () => {
  return airlineCodes;
};

/**
 * Check if an airline code exists in the mapping
 * @param {string} code - Two-letter IATA airline code
 * @returns {boolean} - True if code exists in mapping
 */
export const hasAirlineCode = (code) => {
  if (!code) return false;
  return code.toUpperCase() in airlineCodes;
};

export default getAirlineName;

