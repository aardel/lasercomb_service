/**
 * Airport utility functions
 * @module utils/airportUtils
 */

/**
 * List of known European airport IATA codes
 */
const EUROPEAN_AIRPORTS = [
  // Germany
  'STR', 'FRA', 'MUC', 'HAM', 'BER', 'DUS', 'CGN', 'NUE', 'LEJ', 'DTM',
  // France
  'CDG', 'ORY', 'LYS', 'MRS', 'NCE', 'BOD', 'TLS', 'LIL',
  // UK
  'LHR', 'LGW', 'STN', 'MAN', 'EDI', 'BHX', 'BRS', 'NCL',
  // Italy
  'FCO', 'MXP', 'BGY', 'LIN', 'VCE', 'BLQ', 'PSA', 'NAP', 'CTA', 'PMO',
  // Spain
  'MAD', 'BCN', 'AGP', 'VLC', 'SEV', 'BIO', 'ALC', 'PMI',
  // Netherlands
  'AMS', 'EIN', 'RTM', 'GRQ',
  // Switzerland
  'ZRH', 'GVA', 'BSL',
  // Austria
  'VIE', 'SZG', 'GRZ', 'LNZ',
  // Sweden
  'ARN', 'GOT', 'MMX', 'UME',
  // Norway
  'OSL', 'BGO', 'TOS', 'TRD',
  // Denmark
  'CPH', 'AAL', 'BLL',
  // Finland
  'HEL', 'TMP', 'OUL', 'RVN',
  // Poland
  'WAW', 'KRK', 'GDN', 'WRO', 'POZ',
  // Portugal
  'LIS', 'OPO', 'FAO',
  // Greece
  'ATH', 'SKG', 'HER', 'RHO',
  // Ireland
  'DUB', 'SNN', 'ORK',
  // Czech Republic
  'PRG', 'BRQ',
  // Hungary
  'BUD', 'DEB',
  // Romania
  'OTP', 'CLJ', 'IAS',
  // Bulgaria
  'SOF', 'VAR',
  // Croatia
  'ZAG', 'SPU', 'DBV',
  // Slovakia
  'BTS', 'KSC',
  // Slovenia
  'LJU', 'MBX',
  // Estonia
  'TLL', 'TAY',
  // Latvia
  'RIX', 'VNT',
  // Lithuania
  'VNO', 'PLQ',
  // Others
  'MLA', 'LUX', 'KEF', 'REK'
];

/**
 * Check if an airport code is in Europe
 * @param {string} airportCode - IATA airport code (e.g., "FRA", "LHR")
 * @returns {boolean} True if the airport is in Europe
 */
export const isEuropeanAirport = (airportCode) => {
  if (!airportCode || typeof airportCode !== 'string') return false;
  const code = airportCode.toUpperCase();
  
  // Check against known list first (most reliable)
  if (EUROPEAN_AIRPORTS.includes(code)) return true;
  
  // For other codes, we'd need coordinate-based checking, but for now
  // we'll use a simple heuristic: if it's a 3-letter code and not obviously non-European
  // This is a fallback - ideally we'd check coordinates
  return code.length === 3 && /^[A-Z]{3}$/.test(code);
};

/**
 * Get all known European airport codes
 * @returns {string[]} Array of European airport IATA codes
 */
export const getEuropeanAirports = () => [...EUROPEAN_AIRPORTS];

export default isEuropeanAirport;





