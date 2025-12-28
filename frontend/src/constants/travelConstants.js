/**
 * Travel-related constants
 * Centralized configuration for travel thresholds, timeouts, and API settings
 */

// Travel mode decision thresholds
export const TRAVEL_THRESHOLDS = {
  DRIVING_TIME_HOURS: 4,        // If drive time > 4 hours, recommend flying
  DRIVING_DISTANCE_KM: 300,     // If distance > 300km, recommend flying
  WORK_HOURS_PER_DAY: 10,       // Average work hours per day for trip estimation
  MIN_TRAVEL_DAYS: 1            // Minimum travel days
};

// API configuration
export const API_NAMES = {
  ALL: 'all',
  GROQ: 'groq',
  AMADEUS: 'amadeus',
  SERPAPI: 'serpapi',
  GOOGLE_FLIGHTS: 'serpapi'  // SerpAPI is used for Google Flights
};

// API option names for UI
export const API_OPTION_NAMES = {
  [API_NAMES.GROQ]: 'Groq AI',
  [API_NAMES.AMADEUS]: 'Amadeus API',
  [API_NAMES.SERPAPI]: 'Google Flights (SerpAPI)'
};

// AI Prompt options
export const AI_OPTIONS = {
  OPTION1: 'option1',
  OPTION2: 'option2'
};

// Timeouts and delays (in milliseconds)
export const TIMEOUTS = {
  MAP_INIT_RETRY: 200,           // Google Maps initialization retry delay
  FLIGHT_SEARCH_DELAY: 500,     // Delay before opening flight modal after search
  COST_PREVIEW_DEBOUNCE: 500,   // Debounce for cost preview updates
  STATE_UPDATE_DELAY: 500,      // Delay for state updates to propagate
  COST_RECALC_DELAY: 200        // Delay before recalculating costs
};

// Flight search limits
export const FLIGHT_SEARCH_LIMITS = {
  MAX_RESULTS: 5,                // Maximum number of flight results to return
  MAX_CUSTOMERS: 10              // Maximum number of customers in a trip
};

// Date formatting
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  DISPLAY_DATE: 'en-US'          // Locale for date display
};

// Default values
export const DEFAULTS = {
  API_URL: 'http://localhost:3000',
  MAP_CENTER: {                 // Default map center (Malta)
    lat: 35.9375,
    lng: 14.3754
  }
};





