// Settings Storage Service
// Now uses database API instead of localStorage for technicians
// localStorage is still used for travel times, billing, and active technician ID

import { techniciansAPI } from './api';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'tripCostSettings';

// Get default flight providers (used for reset functionality)
const getDefaultFlightProvidersArray = () => [
    {
        id: 'google-flights',
        name: 'Google Flights',
        icon: '🔍',
        enabled: true,
        urlTemplate: 'https://www.google.com/travel/flights?q=flights%20{origin}%20to%20{destination}%20{departure}{return}',
        isOneWayTemplate: 'https://www.google.com/travel/flights?q=flights%20{origin}%20to%20{destination}%20{departure}',
        color: '#4285f4'
    },
    {
        id: 'booking-com',
        name: 'Booking.com',
        icon: '🏨',
        enabled: true,
        urlTemplate: 'https://www.booking.com/flights/index.html?ss={origin}-{destination}&dep={departure}&ret={return}',
        isOneWayTemplate: 'https://www.booking.com/flights/index.html?ss={origin}-{destination}&dep={departure}',
        color: '#003580'
    },
    {
        id: 'bcd-travel',
        name: 'BCD Travel',
        icon: '🏢',
        enabled: true,
        urlTemplate: 'https://www.bcdtravel.com/flights?from={origin}&to={destination}&departure={departure}&return={return}',
        isOneWayTemplate: 'https://www.bcdtravel.com/flights?from={origin}&to={destination}&departure={departure}',
        color: '#1a5490'
    },
    {
        id: 'expedia',
        name: 'Expedia',
        icon: '✈️',
        enabled: true,
        urlTemplate: 'https://www.expedia.com/Flights-Search?leg1=from:{origin},to:{destination},departure:{departure}TANYT&leg2=from:{destination},to:{origin},departure:{return}TANYT',
        isOneWayTemplate: 'https://www.expedia.com/Flights-Search?leg1=from:{origin},to:{destination},departure:{departure}TANYT',
        color: '#ff5722'
    },
    {
        id: 'kayak',
        name: 'Kayak',
        icon: '🔎',
        enabled: true,
        urlTemplate: 'https://www.kayak.com/flights/{origin}-{destination}/{departure}/{return}',
        isOneWayTemplate: 'https://www.kayak.com/flights/{origin}-{destination}/{departure}',
        color: '#ff5722'
    },
    {
        id: 'skyscanner',
        name: 'Skyscanner',
        icon: '🌐',
        enabled: true,
        urlTemplate: 'https://www.skyscanner.com/transport/flights/{origin}/{destination}/{departure}/{return}/',
        isOneWayTemplate: 'https://www.skyscanner.com/transport/flights/{origin}/{destination}/{departure}/',
        color: '#0e4595'
    }
];

// Export function for use in Settings page
export const getDefaultFlightProviders = getDefaultFlightProvidersArray;

// Default settings schema (for non-technician settings)
const defaultSettings = {
    // Active technician ID (stored locally for user preference)
    activeTechnicianId: 'standard',

    // Travel times (in minutes)
    travelTimes: {
        securityBoarding: 120,
        deboardingLuggage: 45,
        airportToDestination: 60
    },

    // Billing settings
    billing: {
        workingHourRate: 132,
        travelHourRate: 98,
        kmRateOwnCar: 0.88,
        maxDailyHours: 8,
        overtimeThreshold: 8
    },

    // Search result limits
    resultLimits: {
        flights: 5,
        rentalCars: 5,
        hotels: 5
    },

    // Flight provider links
    flightProviders: getDefaultFlightProvidersArray(),

    // API Settings - Control which APIs are used throughout the application
    apiSettings: {
        // Flight search APIs
        flightApis: {
            amadeus: {
                enabled: true,
                priority: 3,
                name: 'Amadeus API',
                description: 'Official airline data API with real-time pricing'
            },
            googleFlights: {
                enabled: true,
                priority: 1,
                name: 'Google Flights (SerpAPI)',
                description: 'Google Flights search via SerpAPI - requires SERPAPI_KEY'
            },
            groq: {
                enabled: true,
                priority: 2,
                name: 'Groq AI',
                description: 'AI-powered flight search using Groq API - requires GROQ_API_KEY'
            }
        },
        // Google Maps APIs (used for places, distance, geocoding)
        googleMapsApis: {
            places: {
                enabled: true,
                name: 'Google Places API',
                description: 'Used for address autocomplete, place details, and airport search - requires GOOGLE_MAPS_API_KEY'
            },
            distanceMatrix: {
                enabled: true,
                name: 'Google Distance Matrix API',
                description: 'Used for calculating distances and travel times - requires GOOGLE_MAPS_API_KEY'
            }
        },
        // Car Rental APIs
        carRentalApis: {
            rapidAPI: {
                enabled: true,
                name: 'RapidAPI Car Rental',
                description: 'Car rental price data - requires RAPIDAPI_KEY (falls back to price database if disabled)'
            }
        },
        // Hotel APIs
        hotelApis: {
            googlePlaces: {
                enabled: true,
                name: 'Google Places API (Hotels)',
                description: 'Hotel search and pricing - requires GOOGLE_MAPS_API_KEY'
            }
        },
        // Toll Calculation APIs
        tollApis: {
            here: {
                enabled: true,
                priority: 1,
                name: 'HERE API',
                description: 'Toll road calculation - requires HERE_API_KEY'
            },
            tollGuru: {
                enabled: true,
                priority: 2,
                name: 'TollGuru API',
                description: 'Alternative toll calculation service - requires TOLLGURU_API_KEY'
            }
        },
        // Airport Search APIs
        airportApis: {
            amadeus: {
                enabled: true,
                priority: 1,
                name: 'Amadeus Airport Search',
                description: 'Airport lookup via Amadeus API - requires AMADEUS credentials'
            },
            googlePlaces: {
                enabled: true,
                priority: 2,
                name: 'Google Places (Airports)',
                description: 'Airport search via Google Places API - requires GOOGLE_MAPS_API_KEY'
            }
        }
    }
};

// Get all settings (non-technician settings from localStorage)
export const getSettings = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...defaultSettings,
                ...parsed,
                travelTimes: { ...defaultSettings.travelTimes, ...parsed.travelTimes },
                billing: { ...defaultSettings.billing, ...parsed.billing },
                resultLimits: { ...defaultSettings.resultLimits, ...parsed.resultLimits },
                flightProviders: parsed.flightProviders || defaultSettings.flightProviders,
                apiSettings: {
                    flightApis: { ...defaultSettings.apiSettings.flightApis, ...parsed.apiSettings?.flightApis },
                    googleMapsApis: { ...defaultSettings.apiSettings.googleMapsApis, ...parsed.apiSettings?.googleMapsApis },
                    carRentalApis: { ...defaultSettings.apiSettings.carRentalApis, ...parsed.apiSettings?.carRentalApis },
                    hotelApis: { ...defaultSettings.apiSettings.hotelApis, ...parsed.apiSettings?.hotelApis },
                    tollApis: { ...defaultSettings.apiSettings.tollApis, ...parsed.apiSettings?.tollApis },
                    airportApis: { ...defaultSettings.apiSettings.airportApis, ...parsed.apiSettings?.airportApis }
                }
            };
        }
    } catch (e) {
        logger.error('Settings', 'Error loading settings:', e);
    }
    return defaultSettings;
};

// Save all settings (non-technician settings to localStorage)
export const saveSettings = (settings) => {
    try {
        // Don't save technicians to localStorage - they're in the database
        const { technicians, ...settingsToSave } = settings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
        return true;
    } catch (e) {
        logger.error('Settings', 'Error saving settings:', e);
        return false;
    }
};

// Get all technicians from API
export const getAllTechnicians = async () => {
    try {
        const response = await techniciansAPI.getAll();
        if (response.data.success) {
            return response.data.data || [];
        }
        return [];
    } catch (error) {
        logger.error('Technician', 'Error fetching technicians:', error);
        return [];
    }
};

// Get active technician (from API)
export const getActiveTechnician = async () => {
    try {
        const settings = getSettings();
        const activeId = settings.activeTechnicianId;
        
        // If we have an active ID, try to get it
        if (activeId) {
            try {
                const response = await techniciansAPI.getById(activeId);
                if (response.data.success && response.data.data) {
                    return response.data.data;
                }
            } catch (e) {
                // If not found, clear the invalid ID from localStorage
                logger.warn('Technician', `Technician ${activeId} not found, clearing from localStorage`);
                const updatedSettings = getSettings();
                delete updatedSettings.activeTechnicianId;
                saveSettings(updatedSettings);
            }
        }
        
        // Fallback to default technician
        try {
            const defaultResponse = await techniciansAPI.getDefault();
            if (defaultResponse.data.success && defaultResponse.data.data) {
                // Update localStorage with the default technician ID
                const updatedSettings = getSettings();
                updatedSettings.activeTechnicianId = defaultResponse.data.data.id;
                saveSettings(updatedSettings);
                return defaultResponse.data.data;
            }
        } catch (e) {
            logger.error('Technician', 'Error fetching default technician:', e);
        }
        
        // Last resort: get first technician from list
        try {
            const allTechs = await techniciansAPI.getAll();
            if (allTechs.data.success && allTechs.data.data && allTechs.data.data.length > 0) {
                const firstTech = allTechs.data.data[0];
                const updatedSettings = getSettings();
                updatedSettings.activeTechnicianId = firstTech.id;
                saveSettings(updatedSettings);
                return firstTech;
            }
        } catch (e) {
            logger.error('Technician', 'Error fetching technicians:', e);
        }
        
        return null;
    } catch (error) {
        logger.error('Technician', 'Error fetching active technician:', error);
        return null;
    }
};

// Set active technician ID (localStorage only - user preference)
export const setActiveTechnician = (technicianId) => {
    const settings = getSettings();
    settings.activeTechnicianId = technicianId;
    saveSettings(settings);
};

// Add technician (save to database)
export const addTechnician = async (technician) => {
    try {
        const techData = {
            ...technician,
            id: technician.id || `tech-${Date.now()}`
        };
        const response = await techniciansAPI.save(techData);
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error('Failed to save technician');
    } catch (error) {
        logger.error('Technician', 'Error adding technician:', error);
        throw error;
    }
};

// Update technician (save to database)
export const updateTechnician = async (id, updates) => {
    try {
        const response = await techniciansAPI.update(id, updates);
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error('Failed to update technician');
    } catch (error) {
        logger.error('Technician', 'Error updating technician:', error);
        throw error;
    }
};

// Delete technician (from database)
export const deleteTechnician = async (id) => {
    try {
        await techniciansAPI.delete(id);
        // If deleted the active one, switch to default
        const settings = getSettings();
        if (settings.activeTechnicianId === id) {
            const defaultTech = await techniciansAPI.getDefault();
            if (defaultTech.data.success && defaultTech.data.data) {
                setActiveTechnician(defaultTech.data.data.id);
            }
        }
        return true;
    } catch (error) {
        logger.error('Technician', 'Error deleting technician:', error);
        throw error;
    }
};

// Get travel times (from localStorage)
export const getTravelTimes = () => {
    return getSettings().travelTimes;
};

// Update travel times (to localStorage)
export const updateTravelTimes = (times) => {
    const settings = getSettings();
    settings.travelTimes = { ...settings.travelTimes, ...times };
    saveSettings(settings);
};

// Get billing settings (from localStorage)
export const getBillingSettings = () => {
    return getSettings().billing;
};

// Update billing settings (to localStorage)
export const updateBillingSettings = (billing) => {
    const settings = getSettings();
    settings.billing = { ...settings.billing, ...billing };
    saveSettings(settings);
};

export default {
    getSettings,
    saveSettings,
    getAllTechnicians,
    getActiveTechnician,
    setActiveTechnician,
    addTechnician,
    updateTechnician,
    deleteTechnician,
    getTravelTimes,
    updateTravelTimes,
    getBillingSettings,
    updateBillingSettings
};
