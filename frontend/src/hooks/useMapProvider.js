import { useLeafletMap } from './useLeafletMap';
import { useMap as useGoogleMap } from './useMap';
import { getSettings } from '../services/settingsStorage';

/**
 * useMapProvider Hook
 * Provider abstraction layer for map rendering
 * Supports: Leaflet (OpenStreetMap - FREE) and Google Maps (PAID backup)
 *
 * @param {Object} options - Map configuration options (passed to underlying provider)
 * @returns {Object} Map state and refs with provider information
 */
export const useMapProvider = (options) => {
  // Get map rendering provider from settings
  const settings = getSettings();
  const mapProvider = settings?.mapRenderingProvider || 'leaflet'; // Default to free Leaflet

  // Use appropriate map implementation based on provider
  const leafletMap = useLeafletMap(options);
  const googleMap = useGoogleMap(options);

  // Return the appropriate implementation
  if (mapProvider === 'google') {
    return {
      ...googleMap,
      provider: 'google',
      providerName: 'Google Maps'
    };
  }

  // Default to Leaflet (FREE)
  return {
    ...leafletMap,
    provider: 'leaflet',
    providerName: 'Leaflet (OpenStreetMap)'
  };
};

export default useMapProvider;
