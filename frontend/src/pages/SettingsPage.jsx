import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { placesAPI, distanceAPI } from '../services/api';
import {
    getSettings,
    saveSettings,
    getActiveTechnician,
    setActiveTechnician,
    addTechnician,
    updateTechnician,
    deleteTechnician,
    getAllTechnicians,
    getDefaultFlightProviders
} from '../services/settingsStorage';
import { customersAPI } from '../services/api';
import LogViewer from '../components/LogViewer';
import { logger } from '../utils/logger';
import './SettingsPage.css';

const SettingsPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('technicians');
    
    // Log when settings page loads
    useEffect(() => {
        logger.info('Settings', 'SettingsPage loaded');
    }, []);
    const [settings, setSettings] = useState(null);
    const [technicians, setTechnicians] = useState([]); // Loaded from API
    const [loadingTechnicians, setLoadingTechnicians] = useState(true);
    const [editingTechnician, setEditingTechnician] = useState(null);
    const [technicianForm, setTechnicianForm] = useState({
        name: '',
        homeAddress: '',
        homeCoordinates: null,
        country: 'Germany',
        transportToAirport: 'taxi',
        taxiCost: 90,
        parkingCostPerDay: 15,
        timeToAirport: 45,
        airports: [] // Cached airports array
    });
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saved, setSaved] = useState(false);
    const [addressSearchTimeout, setAddressSearchTimeout] = useState(null);
    const [airports, setAirports] = useState([]); // Cached airports for current technician
    const [loadingAirports, setLoadingAirports] = useState(false);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const [clearingCache, setClearingCache] = useState(false);
    const [customerCount, setCustomerCount] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [customerForm, setCustomerForm] = useState({
        name: '',
        email: '',
        phone: '',
        street_address: '',
        city: '',
        country: '',
        postal_code: ''
    });

    // Load Google Maps script (only once, check for existing)
    useEffect(() => {
        let isMounted = true;

        const loadGoogleMaps = () => {
            // Check if already loaded
            if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
                setGoogleMapsLoaded(true);
                if (technicianForm.homeCoordinates && mapRef.current) {
                    setTimeout(() => initializeMap(), 100);
                }
                return;
            }

            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                console.warn('Google Maps API key not found');
                return;
            }

            // Check if script is already in the DOM
            const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
            if (existingScript) {
                if (existingScript.getAttribute('data-loaded') === 'true') {
                    // Script already loaded
                    setTimeout(() => {
                        if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
                            setGoogleMapsLoaded(true);
                            if (technicianForm.homeCoordinates && mapRef.current) {
                                initializeMap();
                            }
                        }
                    }, 100);
                } else {
                    // Script is loading, wait for it
                    const handleLoad = () => {
                        existingScript.setAttribute('data-loaded', 'true');
                        if (isMounted) {
                            setTimeout(() => {
                                if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
                                    setGoogleMapsLoaded(true);
                                    if (technicianForm.homeCoordinates && mapRef.current) {
                                        initializeMap();
                                    }
                                }
                            }, 200);
                        }
                    };
                    existingScript.addEventListener('load', handleLoad);
                    if (existingScript.readyState === 'complete') {
                        handleLoad();
                    }
                }
                return;
            }

            // Create new script
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async`;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-loaded', 'false');
            
            script.onload = () => {
                script.setAttribute('data-loaded', 'true');
                if (isMounted) {
                    setTimeout(() => {
                        if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.marker) {
                            setGoogleMapsLoaded(true);
                            if (technicianForm.homeCoordinates && mapRef.current) {
                                initializeMap();
                            }
                        }
                    }, 200);
                }
            };
            
            script.onerror = () => {
                console.error('Failed to load Google Maps script');
            };
            
            document.head.appendChild(script);
        };

        loadGoogleMaps();

        return () => {
            isMounted = false;
            // Cleanup markers
            if (markersRef.current) {
                markersRef.current.forEach(marker => marker.setMap(null));
            }
        };
    }, []);

    // Initialize map when coordinates are available (reinitialize if needed)
    useEffect(() => {
        if (googleMapsLoaded && technicianForm.homeCoordinates && mapRef.current) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                // If map instance doesn't exist, initialize it
                if (!mapInstanceRef.current) {
                    initializeMap();
                } else {
                    // Map exists, update it with new coordinates
                    // Check if map container is visible and has dimensions
                    if (mapRef.current.offsetWidth > 0 && mapRef.current.offsetHeight > 0) {
                        // Update center and trigger resize
                        setTimeout(() => {
                            if (window.google && window.google.maps && mapInstanceRef.current) {
                                const currentCenter = mapInstanceRef.current.getCenter();
                                const newCenter = technicianForm.homeCoordinates;
                                
                                // Only update if coordinates actually changed
                                if (!currentCenter || 
                                    currentCenter.lat() !== newCenter.lat || 
                                    currentCenter.lng() !== newCenter.lng) {
                                    mapInstanceRef.current.setCenter(newCenter);
                                    
                                    // Update home marker position
                                    const homeMarker = markersRef.current.find(m => 
                                        m.title === 'Home Base' || m.title === 'Home Base - Drag to move'
                                    );
                                    if (homeMarker) {
                                        homeMarker.position = newCenter;
                                    }
                                }
                                
                                window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
                            }
                        }, 100);
                    } else {
                        // Container not ready, reinitialize
                        mapInstanceRef.current = null;
                        initializeMap();
                    }
                }
            }, 50);
            
            return () => clearTimeout(timer);
        }
    }, [googleMapsLoaded, technicianForm.homeCoordinates]);

    // Update map when airports change
    useEffect(() => {
        if (googleMapsLoaded && mapInstanceRef.current && technicianForm.homeCoordinates && airports.length > 0) {
            updateMapWithAirports(technicianForm.homeCoordinates, airports);
        }
    }, [airports, googleMapsLoaded]);

    // Load customer count when System tab is active
    useEffect(() => {
        const loadStats = async () => {
            if (activeTab === 'system') {
                try {
                    // Load customer count
                    try {
                        const customerResponse = await customersAPI.getCount();
                        if (customerResponse.data.success) {
                            setCustomerCount(customerResponse.data.count);
                        }
                    } catch (e) {
                        console.error('Failed to load customer count:', e);
                        setCustomerCount(0);
                    }
                } catch (error) {
                    console.error('Error loading stats:', error);
                }
            }
        };
        
        loadStats();
    }, [activeTab]);

    // Update marker position when coordinates change (from address input, not drag)
    useEffect(() => {
        if (googleMapsLoaded && mapInstanceRef.current && technicianForm.homeCoordinates) {
            const homeMarker = markersRef.current.find(m => 
                m.title === 'Home Base' || m.title === 'Home Base - Drag to move'
            );
            if (homeMarker) {
                const currentLat = typeof homeMarker.position.lat === 'function' 
                    ? homeMarker.position.lat() 
                    : homeMarker.position.lat;
                const currentLng = typeof homeMarker.position.lng === 'function' 
                    ? homeMarker.position.lng() 
                    : homeMarker.position.lng;
                
                // Only update if coordinates actually changed (avoid infinite loop)
                if (currentLat !== technicianForm.homeCoordinates.lat || 
                    currentLng !== technicianForm.homeCoordinates.lng) {
                    homeMarker.position = technicianForm.homeCoordinates;
                    
                    // Center map on new position
                    mapInstanceRef.current.setCenter(technicianForm.homeCoordinates);
                }
            }
        }
    }, [technicianForm.homeCoordinates, googleMapsLoaded]);

    // Reverse geocode coordinates to get address
    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            if (data.status === 'OK' && data.results.length > 0) {
                return data.results[0].formatted_address;
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
        return null;
    };

    const initializeMap = () => {
        if (!mapRef.current || !technicianForm.homeCoordinates) return;

        // Ensure Google Maps API is fully loaded
        if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function' ||
            !window.google.maps.marker || typeof window.google.maps.marker.AdvancedMarkerElement !== 'function') {
            console.log('Google Maps not fully loaded, retrying...');
            setTimeout(initializeMap, 200);
            return;
        }

        try {
            // Clear existing map instance if it exists
            if (mapInstanceRef.current) {
                // Clear all markers
                markersRef.current.forEach(marker => marker.setMap(null));
                markersRef.current = [];
                mapInstanceRef.current = null;
            }

            const mapOptions = {
                center: technicianForm.homeCoordinates,
                zoom: 10,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true
            };
            
            // Only add mapId if marker library is fully loaded
            if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                mapOptions.mapId = 'SETTINGS_TECHNICIAN_MAP';
            }
            
            const map = new window.google.maps.Map(mapRef.current, mapOptions);
            mapInstanceRef.current = map;
            
            // Trigger resize after a short delay to ensure proper rendering
            setTimeout(() => {
                if (window.google && window.google.maps && mapInstanceRef.current) {
                    window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
                }
            }, 100);

            // Add draggable home marker
            if (technicianForm.homeCoordinates) {
                const homeContent = document.createElement('div');
                homeContent.style.fontSize = '24px';
                homeContent.textContent = '🏠';
                homeContent.style.cursor = 'move';
                
                const homeMarker = new window.google.maps.marker.AdvancedMarkerElement({
                    position: technicianForm.homeCoordinates,
                    map: map,
                    title: 'Home Base - Drag to move',
                    content: homeContent,
                    gmpDraggable: true // Make marker draggable
                });

                // Handle marker drag end - update address
                homeMarker.addListener('dragend', async (event) => {
                    const newPosition = event.latLng;
                    const newLat = newPosition.lat();
                    const newLng = newPosition.lng();
                    const newCoords = { lat: newLat, lng: newLng };

                    // Update coordinates immediately
                    setTechnicianForm(prev => ({
                        ...prev,
                        homeCoordinates: newCoords
                    }));

                    // Reverse geocode to get new address
                    const newAddress = await reverseGeocode(newLat, newLng);
                    if (newAddress) {
                        setTechnicianForm(prev => ({
                            ...prev,
                            homeAddress: newAddress,
                            homeCoordinates: newCoords
                        }));
                    }

                    // Re-fetch airports for new location
                    await fetchAirportsForTechnician(newCoords, technicianForm.country);
                });

                markersRef.current.push(homeMarker);
            }

            // Add airport markers if available
            if (airports.length > 0) {
                updateMapWithAirports(technicianForm.homeCoordinates, airports);
            }
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    };

    const updateMapWithAirports = (homeCoords, airportList) => {
        if (!mapInstanceRef.current || !homeCoords) return;

        const map = mapInstanceRef.current;
        const bounds = new window.google.maps.LatLngBounds();

        // Clear existing markers except home
        markersRef.current.forEach(marker => {
            if (marker.title !== 'Home Base' && marker.title !== 'Home Base - Drag to move') {
                marker.setMap(null);
            }
        });
        markersRef.current = markersRef.current.filter(m => 
            m.title === 'Home Base' || m.title === 'Home Base - Drag to move'
        );

        // Add home marker if not exists (make it draggable)
        const existingHomeMarker = markersRef.current.find(m => m.title === 'Home Base' || m.title === 'Home Base - Drag to move');
        if (!existingHomeMarker) {
            const homeContent = document.createElement('div');
            homeContent.style.fontSize = '24px';
            homeContent.textContent = '🏠';
            homeContent.style.cursor = 'move';
            
            const homeMarker = new window.google.maps.marker.AdvancedMarkerElement({
                position: homeCoords,
                map: map,
                title: 'Home Base - Drag to move',
                content: homeContent,
                gmpDraggable: true // Make marker draggable
            });

            // Handle marker drag end - update address
            homeMarker.addListener('dragend', async (event) => {
                const newPosition = event.latLng;
                const newLat = newPosition.lat();
                const newLng = newPosition.lng();
                const newCoords = { lat: newLat, lng: newLng };

                // Update coordinates immediately
                setTechnicianForm(prev => ({
                    ...prev,
                    homeCoordinates: newCoords
                }));

                // Reverse geocode to get new address
                const newAddress = await reverseGeocode(newLat, newLng);
                if (newAddress) {
                    setTechnicianForm(prev => ({
                        ...prev,
                        homeAddress: newAddress,
                        homeCoordinates: newCoords
                    }));
                }

                // Re-fetch airports for new location
                await fetchAirportsForTechnician(newCoords);
            });

            markersRef.current.push(homeMarker);
        } else {
            // Update existing marker position if coordinates changed
            if (existingHomeMarker.position.lat !== homeCoords.lat || existingHomeMarker.position.lng !== homeCoords.lng) {
                existingHomeMarker.position = homeCoords;
            }
        }
        bounds.extend(homeCoords);

        // Add airport markers
        airportList.forEach((airport, index) => {
            const airportContent = document.createElement('div');
            airportContent.style.fontSize = '20px';
            airportContent.textContent = '✈️';
            const airportMarker = new window.google.maps.marker.AdvancedMarkerElement({
                position: { lat: airport.lat, lng: airport.lng },
                map: map,
                title: `${airport.name} (${airport.code})`,
                content: airportContent
            });
            markersRef.current.push(airportMarker);
            bounds.extend({ lat: airport.lat, lng: airport.lng });
        });

        // Fit bounds to show all markers
        if (airportList.length > 0) {
            map.fitBounds(bounds, { padding: 50 });
        } else {
            map.setCenter(homeCoords);
            map.setZoom(10);
        }
    };

    // Load settings and technicians on mount
    useEffect(() => {
        const loadData = async () => {
            setSettings(getSettings());
            setLoadingTechnicians(true);
            try {
                const techs = await getAllTechnicians();
                setTechnicians(techs);
            } catch (error) {
                console.error('Error loading technicians:', error);
            } finally {
                setLoadingTechnicians(false);
            }
        };
        
        loadData();
        
        // Cleanup timeout on unmount
        return () => {
            if (addressSearchTimeout) {
                clearTimeout(addressSearchTimeout);
            }
        };
    }, []);

    const handleSave = () => {
        saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // Helper function to detect country from input
    const detectCountryFromInput = (input) => {
        const lowerInput = input.toLowerCase();
        // Common country name mappings to ISO country codes
        const countryMap = {
            'malta': 'MT',
            'germany': 'DE',
            'deutschland': 'DE',
            'france': 'FR',
            'united kingdom': 'GB',
            'uk': 'GB',
            'italy': 'IT',
            'spain': 'ES',
            'switzerland': 'CH',
            'austria': 'AT',
            'netherlands': 'NL',
            'usa': 'US',
            'united states': 'US'
        };
        
        for (const [countryName, code] of Object.entries(countryMap)) {
            if (lowerInput.includes(countryName)) {
                return code;
            }
        }
        
        return null;
    };

    const handleAddressSearch = async (input) => {
        setTechnicianForm({ ...technicianForm, homeAddress: input });
        
        // Clear existing timeout
        if (addressSearchTimeout) {
            clearTimeout(addressSearchTimeout);
        }
        
        if (input.length < 2) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        
        // Debounce the API call
        const timeout = setTimeout(async () => {
            try {
                // Detect country from input or use technician's country setting
                const detectedCountry = detectCountryFromInput(input);
                const countryCode = detectedCountry || (technicianForm.country === 'Malta' ? 'MT' : 
                                                       technicianForm.country === 'Germany' ? 'DE' : null);
                
                const response = await placesAPI.autocomplete(input, countryCode);
                // The backend returns { success: true, data: [...] } format
                const suggestions = response.data.success ? response.data.data : [];
                setAddressSuggestions(suggestions);
                setShowSuggestions(suggestions.length > 0);
            } catch (e) {
                console.error('Address search error:', e);
                setAddressSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300); // 300ms debounce
        
        setAddressSearchTimeout(timeout);
    };

    const handleAddressSelect = async (suggestion) => {
        try {
            // Use getDetails to get full place details including coordinates
            const detailsResponse = await placesAPI.getDetails(suggestion.place_id);
            if (detailsResponse.data.success && detailsResponse.data.data) {
                const details = detailsResponse.data.data;
                // Backend returns latitude and longitude (not lat/lng)
                const latitude = details.latitude;
                const longitude = details.longitude;
                
                // Use formatted_address from details (more complete) or description from suggestion
                const address = details.formatted_address || suggestion.description || suggestion.name;
                
                const newCoordinates = (latitude && longitude) ? { lat: latitude, lng: longitude } : null;
                
                // Extract country from place details (backend returns country as 3-letter ISO code or country_name as full name)
                const countryFromDetails = details.country || details.country_name || null;
                
                // Update form state
                const updatedForm = {
                    ...technicianForm,
                    homeAddress: address,
                    homeCoordinates: newCoordinates,
                    country: countryFromDetails || technicianForm.country // Update country if available
                };
                
                setTechnicianForm(updatedForm);
                setShowSuggestions(false);
                
                // Auto-fetch airports when coordinates are set, passing the updated country
                if (newCoordinates) {
                    // Pass the country directly to avoid stale closure issues
                    fetchAirportsForTechnician(newCoordinates, countryFromDetails || updatedForm.country);
                }
            } else {
                console.error('Invalid place details response:', detailsResponse.data);
                // Still update the address even if coordinates are missing
                setTechnicianForm({
                    ...technicianForm,
                    homeAddress: suggestion.description || suggestion.name
                });
                setShowSuggestions(false);
            }
        } catch (e) {
            console.error('Error getting place details:', e);
            // Still update the address even if geocoding fails
            setTechnicianForm({
                ...technicianForm,
                homeAddress: suggestion.description || suggestion.name
            });
            setShowSuggestions(false);
        }
    };

    // Fetch airports for technician and calculate distances
    const fetchAirportsForTechnician = async (coordinates, countryOverride = null) => {
        if (!coordinates || !coordinates.lat || !coordinates.lng) return;
        
        setLoadingAirports(true);
        try {
            // Use provided country or get from form state
            const countryToUse = countryOverride || technicianForm.country;
            
            // Detect country from technician form or coordinates
            // First try to detect from address, then from country field
            const detectedCountry = detectCountryFromInput(technicianForm.homeAddress);
            
            // Convert country to 2-letter code for API
            let countryCode = detectedCountry;
            if (!countryCode && countryToUse) {
                // Convert 3-letter ISO codes to 2-letter, or handle country names
                const country = countryToUse.toUpperCase();
                if (country === 'MLT' || country === 'MALTA') countryCode = 'MT';
                else if (country === 'DEU' || country === 'GERMANY' || country === 'DEUTSCHLAND') countryCode = 'DE';
                else if (country === 'FRA' || country === 'FRANCE') countryCode = 'FR';
                else if (country === 'GBR' || country === 'UNITED KINGDOM' || country === 'UK') countryCode = 'GB';
                else if (country === 'ITA' || country === 'ITALY') countryCode = 'IT';
                else if (country === 'ESP' || country === 'SPAIN') countryCode = 'ES';
                else if (country.length === 2) countryCode = country; // Already 2-letter
                else if (country.length === 3) {
                    // Convert 3-letter to 2-letter
                    const threeToTwo = { 'MLT': 'MT', 'DEU': 'DE', 'FRA': 'FR', 'GBR': 'GB', 'ITA': 'IT', 'ESP': 'ES', 'CHE': 'CH', 'AUT': 'AT', 'NLD': 'NL' };
                    countryCode = threeToTwo[country] || null;
                }
            }
            
            console.log(`[SettingsPage] Fetching airports for ${coordinates.lat}, ${coordinates.lng} with country: ${countryToUse} -> code: ${countryCode}`);
            
            // Fetch up to 3 nearest airports
            const response = await placesAPI.getNearbyAirports(coordinates.lat, coordinates.lng, 3, countryCode);
            
            if (response.data.success && response.data.data) {
                const airportList = response.data.data;
                
                // Calculate distances and times to each airport using backend distance API
                const airportsWithDistances = await Promise.all(airportList.map(async (airport) => {
                    try {
                        const distanceResponse = await distanceAPI.calculate(
                            coordinates,
                            { lat: airport.lat, lng: airport.lng }
                        );
                        
                        if (distanceResponse.data.success && distanceResponse.data.data) {
                            const distanceData = distanceResponse.data.data;
                            return {
                                code: airport.code,
                                name: airport.name,
                                lat: airport.lat,
                                lng: airport.lng,
                                distance_to_home_km: distanceData.distance_km || airport.distance_km || 0,
                                time_to_home_minutes: distanceData.duration_minutes || 0
                            };
                        }
                    } catch (e) {
                        console.warn(`Could not calculate distance to ${airport.code}:`, e);
                    }
                    
                    // Fallback: use distance_km from airport search if available
                    return {
                        code: airport.code,
                        name: airport.name,
                        lat: airport.lat,
                        lng: airport.lng,
                        distance_to_home_km: airport.distance_km || 0,
                        time_to_home_minutes: airport.distance_km ? Math.round(airport.distance_km * 1.2) : 0 // Rough estimate: 1.2 min per km
                    };
                }));
                
                setAirports(airportsWithDistances);
                
                // Update technician form with airports
                setTechnicianForm(prev => ({
                    ...prev,
                    airports: airportsWithDistances
                }));
                
                // Update map if loaded
                if (googleMapsLoaded && mapInstanceRef.current) {
                    updateMapWithAirports(coordinates, airportsWithDistances);
                }
            }
        } catch (error) {
            console.error('Error fetching airports:', error);
        } finally {
            setLoadingAirports(false);
        }
    };

    const handleSaveTechnician = async () => {
        if (!technicianForm.name || !technicianForm.homeAddress) {
            alert('Please fill in name and home address');
            return;
        }

        // Auto-fetch airports if coordinates exist but airports not yet fetched
        if (technicianForm.homeCoordinates && (!technicianForm.airports || technicianForm.airports.length === 0)) {
            fetchAirportsForTechnician(technicianForm.homeCoordinates, technicianForm.country);
        }

        try {
            if (editingTechnician) {
                await updateTechnician(editingTechnician.id, technicianForm);
            } else {
                await addTechnician(technicianForm);
            }
            
            // Reload technicians from API
            const techs = await getAllTechnicians();
            setTechnicians(techs);
            setSettings(getSettings());
            setEditingTechnician(null);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving technician:', error);
            alert('Failed to save technician: ' + error.message);
        }
        setAirports([]);
        setTechnicianForm({
            name: '',
            homeAddress: '',
            homeCoordinates: null,
            country: 'Germany',
            transportToAirport: 'taxi',
            taxiCost: 90,
            parkingCostPerDay: 15,
            timeToAirport: 45,
            airports: []
        });
    };

    const handleEditTechnician = (tech) => {
        setEditingTechnician(tech);
        
        // Reset map instance first to force reinitialization
        if (mapInstanceRef.current) {
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            mapInstanceRef.current = null;
        }
        
        // Update form state
        setTechnicianForm({
            name: tech.name,
            homeAddress: tech.homeAddress,
            homeCoordinates: tech.homeCoordinates,
            country: tech.country || 'Germany',
            transportToAirport: tech.transportToAirport || 'taxi',
            taxiCost: tech.taxiCost || 90,
            parkingCostPerDay: tech.parkingCostPerDay || 15,
            timeToAirport: tech.timeToAirport || 45,
            airports: tech.airports || []
        });
        
        // Load airports if coordinates exist
        if (tech.homeCoordinates && tech.airports && tech.airports.length > 0) {
            setAirports(tech.airports);
        } else if (tech.homeCoordinates) {
            // Fetch airports if not cached
            fetchAirportsForTechnician(tech.homeCoordinates, tech.country);
        }
        
        // Initialize map with the technician's coordinates after state update
        if (tech.homeCoordinates && googleMapsLoaded) {
            // Use a longer delay to ensure state is updated and DOM is ready
            setTimeout(() => {
                if (mapRef.current && tech.homeCoordinates) {
                    // Force reinitialize with new coordinates
                    initializeMapWithCoordinates(tech.homeCoordinates, tech.airports || []);
                }
            }, 300);
        }
    };
    
    // Helper function to initialize map with specific coordinates
    const initializeMapWithCoordinates = (coordinates, airportList = []) => {
        if (!mapRef.current || !coordinates) return;

        // Ensure Google Maps API is fully loaded
        if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function' ||
            !window.google.maps.marker || typeof window.google.maps.marker.AdvancedMarkerElement !== 'function') {
            console.log('Google Maps not fully loaded, retrying...');
            setTimeout(() => initializeMapWithCoordinates(coordinates, airportList), 200);
            return;
        }

        try {
            // Clear existing map instance if it exists
            if (mapInstanceRef.current) {
                markersRef.current.forEach(marker => marker.setMap(null));
                markersRef.current = [];
                mapInstanceRef.current = null;
            }

            const mapOptions = {
                center: coordinates,
                zoom: 10,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true
            };
            
            // Only add mapId if marker library is fully loaded
            if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                mapOptions.mapId = 'SETTINGS_TECHNICIAN_MAP';
            }
            
            const map = new window.google.maps.Map(mapRef.current, mapOptions);
            mapInstanceRef.current = map;
            
            // Trigger resize after a short delay to ensure proper rendering
            setTimeout(() => {
                if (window.google && window.google.maps && mapInstanceRef.current) {
                    window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
                    mapInstanceRef.current.setCenter(coordinates);
                }
            }, 100);

            // Add draggable home marker
            const homeContent = document.createElement('div');
            homeContent.style.fontSize = '24px';
            homeContent.textContent = '🏠';
            homeContent.style.cursor = 'move';
            
            const homeMarker = new window.google.maps.marker.AdvancedMarkerElement({
                position: coordinates,
                map: map,
                title: 'Home Base - Drag to move',
                content: homeContent,
                gmpDraggable: true
            });

            // Handle marker drag end - update address
            homeMarker.addListener('dragend', async (event) => {
                const newPosition = event.latLng;
                const newLat = newPosition.lat();
                const newLng = newPosition.lng();
                const newCoords = { lat: newLat, lng: newLng };

                // Update coordinates immediately
                setTechnicianForm(prev => ({
                    ...prev,
                    homeCoordinates: newCoords
                }));

                // Reverse geocode to get new address
                const newAddress = await reverseGeocode(newLat, newLng);
                if (newAddress) {
                    setTechnicianForm(prev => ({
                        ...prev,
                        homeAddress: newAddress,
                        homeCoordinates: newCoords
                    }));
                }

                // Re-fetch airports for new location
                await fetchAirportsForTechnician(newCoords);
            });

            markersRef.current.push(homeMarker);

            // Add airport markers if available
            if (airportList.length > 0) {
                updateMapWithAirports(coordinates, airportList);
            }
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    };

    const handleDeleteTechnician = async (id) => {
        if (window.confirm('Delete this technician?')) {
            try {
                await deleteTechnician(id);
                // Reload technicians from API
                const techs = await getAllTechnicians();
                setTechnicians(techs);
                setSettings(getSettings());
            } catch (error) {
                console.error('Error deleting technician:', error);
                alert('Failed to delete technician: ' + error.message);
            }
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await setActiveTechnician(id);
            const updated = getSettings();
            updated.activeTechnicianId = id;
            setSettings(updated);
            saveSettings(updated);
        } catch (error) {
            console.error('Error setting default technician:', error);
            alert('Failed to set default technician: ' + error.message);
        }
    };

    if (!settings) return <div className="settings-page">Loading...</div>;

    return (
        <div className="settings-page">
            <header className="settings-header">
                <button className="back-button" onClick={() => navigate('/')}>← Back</button>
                <h1>⚙️ Settings</h1>
                <button className={`save-button ${saved ? 'saved' : ''}`} onClick={handleSave}>
                    {saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </header>

            <div className="settings-tabs">
                <button
                    className={activeTab === 'technicians' ? 'active' : ''}
                    onClick={() => {
                        logger.info('Settings', 'Switched to Technicians tab');
                        setActiveTab('technicians');
                    }}
                >
                    👤 Technicians
                </button>
                <button
                    className={activeTab === 'travelTimes' ? 'active' : ''}
                    onClick={() => {
                        logger.info('Settings', 'Switched to Travel Times tab');
                        setActiveTab('travelTimes');
                    }}
                >
                    ⏱️ Travel Times
                </button>
                    <button 
                        className={activeTab === 'billing' ? 'active' : ''}
                        onClick={() => {
                            logger.info('Settings', 'Switched to Billing tab');
                            setActiveTab('billing');
                        }}
                    >
                        💰 Billing
                    </button>
                    <button 
                        className={activeTab === 'flightProviders' ? 'active' : ''}
                        onClick={() => {
                            logger.info('Settings', 'Switched to Flight Providers tab');
                            setActiveTab('flightProviders');
                        }}
                    >
                        ✈️ Flight Providers
                    </button>
                        <button
                            className={activeTab === 'apiSettings' ? 'active' : ''}
                            onClick={() => {
                                logger.info('Settings', 'Switched to API Settings tab');
                                setActiveTab('apiSettings');
                            }}
                        >
                            🔌 API Settings
                        </button>
                        <button
                            className={activeTab === 'system' ? 'active' : ''}
                            onClick={() => {
                                logger.info('Settings', 'Switched to System tab');
                                setActiveTab('system');
                            }}
                        >
                            ⚙️ System
                        </button>
                        <button
                            className={activeTab === 'dailyRates' ? 'active' : ''}
                            onClick={() => {
                                logger.info('Settings', 'Switched to Daily Rates tab');
                                setActiveTab('dailyRates');
                            }}
                        >
                            📊 Daily Rates
                        </button>
                        <button
                            className={activeTab === 'logs' ? 'active' : ''}
                            onClick={() => {
                                logger.info('Settings', 'Switched to Logs tab');
                                setActiveTab('logs');
                            }}
                        >
                            📋 Logs
                        </button>
                </div>

            <div className="settings-content">
                {/* TECHNICIANS TAB */}
                {activeTab === 'technicians' && (
                    <div className="tab-content">
                        <h2>Technician Profiles</h2>
                        <p className="tab-description">
                            Manage technicians with individual travel settings. The active technician's home address and transport preferences will be used for trip calculations.
                        </p>

                        {/* Technician Form */}
                        <div className="technician-form">
                            <h3>{editingTechnician ? '✏️ Edit Technician' : '➕ Add Technician'}</h3>

                            <div className="form-row">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={technicianForm.name}
                                    onChange={(e) => setTechnicianForm({ ...technicianForm, name: e.target.value })}
                                    placeholder="Enter technician name"
                                />
                            </div>

                            <div className="form-row">
                                <label>Home Address</label>
                                <div className="address-input-container">
                                    <input
                                        type="text"
                                        value={technicianForm.homeAddress}
                                        onChange={(e) => handleAddressSearch(e.target.value)}
                                        placeholder="Search for address..."
                                    />
                                    {showSuggestions && addressSuggestions.length > 0 && (
                                        <div className="suggestions-dropdown">
                                            {addressSuggestions.map((suggestion, i) => (
                                                <div
                                                    key={suggestion.place_id || i}
                                                    className="suggestion-item"
                                                    onClick={() => handleAddressSelect(suggestion)}
                                                >
                                                    {suggestion.description || suggestion.formatted_address || suggestion.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <label>Transport to Airport</label>
                                <select
                                    value={technicianForm.transportToAirport}
                                    onChange={(e) => setTechnicianForm({ ...technicianForm, transportToAirport: e.target.value })}
                                >
                                    <option value="taxi">🚕 Taxi</option>
                                    <option value="car">🚗 Own Car</option>
                                </select>
                            </div>

                            {technicianForm.transportToAirport === 'taxi' ? (
                                <div className="form-row">
                                    <label>Taxi Cost (round-trip)</label>
                                    <div className="input-with-unit">
                                        <input
                                            type="number"
                                            value={technicianForm.taxiCost}
                                            onChange={(e) => setTechnicianForm({ ...technicianForm, taxiCost: parseFloat(e.target.value) || 0 })}
                                        />
                                        <span>€</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-row">
                                    <label>Parking Cost (per day)</label>
                                    <div className="input-with-unit">
                                        <input
                                            type="number"
                                            value={technicianForm.parkingCostPerDay}
                                            onChange={(e) => setTechnicianForm({ ...technicianForm, parkingCostPerDay: parseFloat(e.target.value) || 0 })}
                                        />
                                        <span>€/day</span>
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <label>Time to Airport</label>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={technicianForm.timeToAirport}
                                        onChange={(e) => setTechnicianForm({ ...technicianForm, timeToAirport: parseInt(e.target.value) || 0 })}
                                    />
                                    <span>min</span>
                                </div>
                            </div>

                            {/* Airport List and Map Visualization */}
                            {technicianForm.homeCoordinates && (
                                <>
                                    <div className="form-row">
                                        <label>
                                            Nearest Airports 
                                            {loadingAirports && <span style={{ marginLeft: '10px', color: '#666' }}>Loading...</span>}
                                            {!loadingAirports && airports.length > 0 && <span style={{ marginLeft: '10px', color: '#28a745' }}>({airports.length} found)</span>}
                                        </label>
                                        {airports.length > 0 ? (
                                            <div className="airports-list">
                                                {airports.map((airport, index) => (
                                                    <div key={airport.code || index} className="airport-item">
                                                        <div className="airport-info">
                                                            <strong>✈️ {airport.name} ({airport.code})</strong>
                                                            <div className="airport-details">
                                                                <span>Distance: {(airport.distance_to_home_km || airport.distance_km)?.toFixed(1) || 'N/A'} km</span>
                                                                <span>•</span>
                                                                <span>Time: {(airport.time_to_home_minutes || airport.distance_minutes) ? Math.round(airport.time_to_home_minutes || airport.distance_minutes) + ' min' : 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="btn-remove-airport"
                                                            onClick={() => {
                                                                const updatedAirports = airports.filter(a => a.code !== airport.code);
                                                                setAirports(updatedAirports);
                                                                setTechnicianForm(prev => ({ ...prev, airports: updatedAirports }));
                                                            }}
                                                            title="Remove airport"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="airports-placeholder">
                                                {technicianForm.homeCoordinates ? (
                                                    <p>Airports will be automatically detected when you save the technician.</p>
                                                ) : (
                                                    <p>Enter a home address to find nearest airports.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Map Visualization */}
                                    <div className="form-row">
                                        <label>
                                            Location Map
                                            <span style={{ 
                                                marginLeft: '10px', 
                                                fontSize: '12px', 
                                                color: '#666',
                                                fontWeight: 'normal'
                                            }}>
                                                (Drag 🏠 marker to update address)
                                            </span>
                                        </label>
                                        <div 
                                            ref={mapRef} 
                                            style={{ 
                                                width: '100%', 
                                                height: '400px', 
                                                borderRadius: '8px',
                                                border: '1px solid #ddd',
                                                backgroundColor: '#f5f5f5',
                                                position: 'relative'
                                            }}
                                        >
                                            {!googleMapsLoaded && (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    height: '100%',
                                                    color: '#666'
                                                }}>
                                                    Loading map...
                                                </div>
                                            )}
                                        </div>
                                        <p style={{ 
                                            fontSize: '12px', 
                                            color: '#666', 
                                            marginTop: '8px',
                                            marginBottom: 0
                                        }}>
                                            💡 Tip: Drag the home marker (🏠) on the map to update the address. Airports will be automatically updated.
                                        </p>
                                    </div>
                                </>
                            )}

                            <div className="form-actions">
                                <button className="btn-primary" onClick={handleSaveTechnician}>
                                    {editingTechnician ? 'Update Technician' : 'Add Technician'}
                                </button>
                                {editingTechnician && (
                                    <button className="btn-secondary" onClick={() => {
                                        setEditingTechnician(null);
                                        setTechnicianForm({
                                            name: '',
                                            homeAddress: '',
                                            homeCoordinates: null,
                                            country: 'Germany',
                                            transportToAirport: 'taxi',
                                            taxiCost: 90,
                                            parkingCostPerDay: 15,
                                            timeToAirport: 45
                                        });
                                    }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Technician List */}
                        <div className="technician-list">
                            <h3>📋 Saved Technicians</h3>
                            {loadingTechnicians ? (
                                <div>Loading technicians...</div>
                            ) : technicians.length === 0 ? (
                                <div>No technicians found. Add one to get started.</div>
                            ) : (
                                technicians.map(tech => (
                                <div key={tech.id} className={`technician-card ${settings.activeTechnicianId === tech.id ? 'active' : ''}`}>
                                    <div className="tech-info">
                                        <div className="tech-name">
                                            {tech.name}
                                            {settings.activeTechnicianId === tech.id && <span className="default-badge">Active</span>}
                                        </div>
                                        <div className="tech-address">📍 {tech.homeAddress}</div>
                                        <div className="tech-transport">
                                            {tech.transportToAirport === 'taxi'
                                                ? `🚕 Taxi (€${tech.taxiCost} round-trip)`
                                                : `🚗 Car + parking (€${tech.parkingCostPerDay}/day)`
                                            }
                                        </div>
                                        {tech.airports && tech.airports.length > 0 && (
                                            <div className="tech-airports">
                                                <strong>Preferred Airports:</strong>
                                                <div className="airport-list-inline">
                                                    {tech.airports
                                                        .sort((a, b) => (a.distance_to_home_km || a.distance_km || 0) - (b.distance_to_home_km || b.distance_km || 0))
                                                        .map((airport, idx) => (
                                                            <span key={airport.code || idx} className="airport-badge">
                                                                ✈️ {airport.name || airport.code} ({airport.code})
                                                                {airport.distance_to_home_km && (
                                                                    <span className="airport-distance">
                                                                        {' '}{airport.distance_to_home_km.toFixed(1)}km
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="tech-actions">
                                        {settings.activeTechnicianId !== tech.id && (
                                            <button className="btn-set-default" onClick={() => handleSetDefault(tech.id)}>
                                                Set Active
                                            </button>
                                        )}
                                        <button className="btn-edit" onClick={() => handleEditTechnician(tech)}>Edit</button>
                                        {technicians.length > 1 && (
                                            <button className="btn-delete" onClick={() => handleDeleteTechnician(tech.id)}>Delete</button>
                                        )}
                                    </div>
                                </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* TRAVEL TIMES TAB */}
                {activeTab === 'travelTimes' && (
                    <div className="tab-content">
                        <h2>Default Travel Times</h2>
                        <p className="tab-description">
                            These are default times used in travel cost calculations. Individual technician settings may override some values.
                        </p>

                        <div className="settings-grid">
                            <div className="setting-item">
                                <label>Security & Boarding</label>
                                <p className="setting-desc">Check-in, security screening, boarding</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={settings.travelTimes.securityBoarding}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            travelTimes: { ...settings.travelTimes, securityBoarding: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>min</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <label>Deboarding & Luggage</label>
                                <p className="setting-desc">Exit plane, collect checked bags</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={settings.travelTimes.deboardingLuggage}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            travelTimes: { ...settings.travelTimes, deboardingLuggage: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>min</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <label>Airport to Destination</label>
                                <p className="setting-desc">Rental car pickup + drive to customer</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={settings.travelTimes.airportToDestination}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            travelTimes: { ...settings.travelTimes, airportToDestination: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>min</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* BILLING TAB */}
                {activeTab === 'billing' && (
                    <div className="tab-content">
                        <h2>Billing Settings</h2>
                        <p className="tab-description">
                            Configure billing rates and work hour limits.
                        </p>

                        <div className="settings-grid">
                            <div className="setting-item">
                                <label>Working Hour Rate</label>
                                <p className="setting-desc">Hourly rate charged for work time</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={settings.billing.workingHourRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            billing: { ...settings.billing, workingHourRate: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>€/hour</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <label>Travel Hour Rate</label>
                                <p className="setting-desc">Hourly rate charged for travel time</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={settings.billing.travelHourRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            billing: { ...settings.billing, travelHourRate: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>€/hour</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <label>KM Rate (Own Car)</label>
                                <p className="setting-desc">Rate per kilometer when using own car</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.billing.kmRateOwnCar}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            billing: { ...settings.billing, kmRateOwnCar: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>€/km</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <label>Max Daily Work Hours</label>
                                <p className="setting-desc">Work hours per day for trip duration calculation (e.g., 8 for 40-hour work week)</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        max="24"
                                        value={settings.billing.maxDailyHours}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            billing: { ...settings.billing, maxDailyHours: parseFloat(e.target.value) || 8 }
                                        })}
                                    />
                                    <span>hours/day</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <label>Overtime Threshold</label>
                                <p className="setting-desc">Hours after which overtime applies</p>
                                <div className="input-with-unit">
                                    <input
                                        type="number"
                                        value={settings.billing.overtimeThreshold}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            billing: { ...settings.billing, overtimeThreshold: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <span>hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FLIGHT PROVIDERS TAB */}
                {activeTab === 'flightProviders' && (
                    <div className="tab-content">
                        <h2>Flight Provider Links</h2>
                        <p className="tab-description">
                            Manage flight search provider links that appear in the flight selection modal. Enable/disable providers and add custom links.
                        </p>

                        <div className="settings-grid">
                            {/* Built-in Providers */}
                            <div className="setting-item" style={{ gridColumn: '1 / -1' }}>
                                <label>Built-in Providers</label>
                                <p className="setting-desc">
                                    Edit the default flight search providers. You can modify URLs, icons, colors, and names if providers change their format. Use placeholders: {'{origin}'}, {'{destination}'}, {'{departure}'}, {'{return}'}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
                                    {settings.flightProviders?.filter(p => !p.isCustom).map((provider, index) => {
                                        // Find the actual index in the full array
                                        const fullIndex = settings.flightProviders.findIndex(p => p.id === provider.id);
                                        return (
                                            <div key={provider.id} style={{
                                                padding: '16px',
                                                background: '#f0f9ff',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Provider Name"
                                                        value={provider.name || ''}
                                                        onChange={(e) => {
                                                            const updated = settings.flightProviders.map((p, i) =>
                                                                i === fullIndex ? { ...p, name: e.target.value } : p
                                                            );
                                                            const newSettings = { ...settings, flightProviders: updated };
                                                            setSettings(newSettings);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '6px',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Icon (emoji)"
                                                        value={provider.icon || ''}
                                                        onChange={(e) => {
                                                            const updated = settings.flightProviders.map((p, i) =>
                                                                i === fullIndex ? { ...p, icon: e.target.value } : p
                                                            );
                                                            const newSettings = { ...settings, flightProviders: updated };
                                                            setSettings(newSettings);
                                                        }}
                                                        style={{
                                                            width: '80px',
                                                            padding: '8px 12px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                    <input
                                                        type="color"
                                                        value={provider.color || '#2563eb'}
                                                        onChange={(e) => {
                                                            const updated = settings.flightProviders.map((p, i) =>
                                                                i === fullIndex ? { ...p, color: e.target.value } : p
                                                            );
                                                            const newSettings = { ...settings, flightProviders: updated };
                                                            setSettings(newSettings);
                                                        }}
                                                        style={{
                                                            width: '60px',
                                                            height: '38px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            // Reset to default
                                                            const defaultProviders = getDefaultFlightProviders();
                                                            const defaultProvider = defaultProviders.find(p => p.id === provider.id);
                                                            if (defaultProvider) {
                                                                const updated = settings.flightProviders.map((p, i) =>
                                                                    i === fullIndex ? {
                                                                        ...defaultProvider,
                                                                        enabled: provider.enabled // Keep current enabled state
                                                                    } : p
                                                                );
                                                                const newSettings = { ...settings, flightProviders: updated };
                                                                setSettings(newSettings);
                                                                saveSettings(newSettings);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: '#6b7280',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}
                                                        title="Reset to default"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="URL Template (use {origin}, {destination}, {departure}, {return})"
                                                    value={provider.urlTemplate || ''}
                                                    onChange={(e) => {
                                                        const updated = settings.flightProviders.map((p, i) =>
                                                            i === fullIndex ? { ...p, urlTemplate: e.target.value } : p
                                                        );
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontFamily: 'monospace',
                                                        marginBottom: '8px'
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="One-Way URL Template (optional)"
                                                    value={provider.isOneWayTemplate || ''}
                                                    onChange={(e) => {
                                                        const updated = settings.flightProviders.map((p, i) =>
                                                            i === fullIndex ? { ...p, isOneWayTemplate: e.target.value } : p
                                                        );
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontFamily: 'monospace',
                                                        marginBottom: '8px'
                                                    }}
                                                />
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={provider.enabled !== false}
                                                        onChange={(e) => {
                                                            const updated = settings.flightProviders.map((p, i) =>
                                                                i === fullIndex ? { ...p, enabled: e.target.checked } : p
                                                            );
                                                            const newSettings = { ...settings, flightProviders: updated };
                                                            setSettings(newSettings);
                                                            saveSettings(newSettings);
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '13px', color: provider.enabled !== false ? '#16a34a' : '#9ca3af' }}>
                                                        {provider.enabled !== false ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom Providers */}
                            <div className="setting-item" style={{ gridColumn: '1 / -1', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                                <label>Custom Provider Links</label>
                                <p className="setting-desc">
                                    Add your own flight search provider links. Use placeholders: {'{origin}'}, {'{destination}'}, {'{departure}'}, {'{return}'}
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
                                    {settings.flightProviders?.filter(p => p.isCustom).map((provider, index) => (
                                        <div key={provider.id || index} style={{
                                            padding: '16px',
                                            background: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Provider Name (e.g., My Travel Agency)"
                                                    value={provider.name || ''}
                                                    onChange={(e) => {
                                                        const updated = settings.flightProviders.map((p, i) =>
                                                            (p.isCustom && i === index) ? { ...p, name: e.target.value } : p
                                                        );
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Icon (emoji)"
                                                    value={provider.icon || ''}
                                                    onChange={(e) => {
                                                        const updated = settings.flightProviders.map((p, i) =>
                                                            (p.isCustom && i === index) ? { ...p, icon: e.target.value } : p
                                                        );
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                    }}
                                                    style={{
                                                        width: '80px',
                                                        padding: '8px 12px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        textAlign: 'center'
                                                    }}
                                                />
                                                <input
                                                    type="color"
                                                    value={provider.color || '#2563eb'}
                                                    onChange={(e) => {
                                                        const updated = settings.flightProviders.map((p, i) =>
                                                            (p.isCustom && i === index) ? { ...p, color: e.target.value } : p
                                                        );
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                    }}
                                                    style={{
                                                        width: '60px',
                                                        height: '38px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const updated = settings.flightProviders.filter((p, i) => !(p.isCustom && i === index));
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                        saveSettings(newSettings);
                                                    }}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="URL Template (use {origin}, {destination}, {departure}, {return})"
                                                value={provider.urlTemplate || ''}
                                                onChange={(e) => {
                                                    const updated = settings.flightProviders.map((p, i) =>
                                                        (p.isCustom && i === index) ? { ...p, urlTemplate: e.target.value } : p
                                                    );
                                                    const newSettings = { ...settings, flightProviders: updated };
                                                    setSettings(newSettings);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontFamily: 'monospace',
                                                    marginBottom: '8px'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="One-Way URL Template (optional)"
                                                value={provider.isOneWayTemplate || ''}
                                                onChange={(e) => {
                                                    const updated = settings.flightProviders.map((p, i) =>
                                                        (p.isCustom && i === index) ? { ...p, isOneWayTemplate: e.target.value } : p
                                                    );
                                                    const newSettings = { ...settings, flightProviders: updated };
                                                    setSettings(newSettings);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontFamily: 'monospace'
                                                }}
                                            />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={provider.enabled !== false}
                                                    onChange={(e) => {
                                                        const updated = settings.flightProviders.map((p, i) =>
                                                            (p.isCustom && i === index) ? { ...p, enabled: e.target.checked } : p
                                                        );
                                                        const newSettings = { ...settings, flightProviders: updated };
                                                        setSettings(newSettings);
                                                    }}
                                                />
                                                <span style={{ fontSize: '13px' }}>Enabled</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        const newProvider = {
                                            id: `custom-${Date.now()}`,
                                            name: '',
                                            icon: '🔗',
                                            enabled: true,
                                            isCustom: true,
                                            urlTemplate: '',
                                            isOneWayTemplate: '',
                                            color: '#2563eb'
                                        };
                                        const updated = [...(settings.flightProviders || []), newProvider];
                                        const newSettings = { ...settings, flightProviders: updated };
                                        setSettings(newSettings);
                                    }}
                                    style={{
                                        marginTop: '16px',
                                        padding: '10px 20px',
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600'
                                    }}
                                >
                                    + Add Custom Provider
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* API SETTINGS TAB */}
                {activeTab === 'apiSettings' && (
                    <div className="tab-content">
                        <h2>API Settings</h2>
                        <p className="tab-description">
                            Configure which APIs are used throughout the application. Check/uncheck to enable or disable each API.
                        </p>
                        
                            {(() => {
                                const currentSettings = getSettings();
                                // Get default settings structure
                                const defaultApiSettings = {
                                    flightApis: {
                                        amadeus: { enabled: true, priority: 3, name: 'Amadeus API', description: 'Official airline data API with real-time pricing' },
                                        googleFlights: { enabled: true, priority: 1, name: 'Google Flights (SerpAPI)', description: 'Google Flights search via SerpAPI - requires SERPAPI_KEY' },
                                        groq: { enabled: true, priority: 2, name: 'Groq AI', description: 'AI-powered flight search using Groq API - requires GROQ_API_KEY' }
                                    },
                                    googleMapsApis: {
                                        places: { enabled: true, name: 'Google Places API', description: 'Used for address autocomplete and place search - requires GOOGLE_MAPS_API_KEY (Note: Geocoding & routing now controlled by Mapping Provider above)' }
                                    },
                                    carRentalApis: {
                                        rapidAPI: { enabled: true, name: 'RapidAPI Car Rental', description: 'Car rental price data - requires RAPIDAPI_KEY (falls back to price database if disabled)' }
                                    },
                                    hotelApis: {
                                        googlePlaces: { enabled: true, name: 'Google Places API (Hotels)', description: 'Hotel search and pricing - requires GOOGLE_MAPS_API_KEY' }
                                    },
                                    tollApis: {
                                        here: { enabled: true, priority: 1, name: 'HERE API', description: 'Toll road calculation - requires HERE_API_KEY' },
                                        tollGuru: { enabled: true, priority: 2, name: 'TollGuru API', description: 'Alternative toll calculation service - requires TOLLGURU_API_KEY' }
                                    },
                                    airportApis: {
                                        amadeus: { enabled: true, priority: 1, name: 'Amadeus Airport Search', description: 'Airport lookup via Amadeus API - requires AMADEUS credentials' },
                                        googlePlaces: { enabled: true, priority: 2, name: 'Google Places (Airports)', description: 'Airport search via Google Places API - requires GOOGLE_MAPS_API_KEY' }
                                    }
                                };
                                
                                // Merge with current settings, ensuring defaults for missing APIs
                                const apiSettings = {};
                                Object.keys(defaultApiSettings).forEach(groupKey => {
                                    apiSettings[groupKey] = {};
                                    Object.keys(defaultApiSettings[groupKey]).forEach(apiKey => {
                                        apiSettings[groupKey][apiKey] = {
                                            ...defaultApiSettings[groupKey][apiKey],
                                            ...(currentSettings?.apiSettings?.[groupKey]?.[apiKey] || {})
                                        };
                                    });
                                });
                            
                            // Helper function to render API checkbox group
                            const renderApiGroup = (title, apiGroup, groupKey, hasPriority = false) => {
                                if (!apiGroup || Object.keys(apiGroup).length === 0) return null;
                                
                                const apis = Object.entries(apiGroup).map(([key, config]) => ({
                                    key,
                                    ...config
                                }));
                                
                                if (hasPriority) {
                                    apis.sort((a, b) => (a.priority || 999) - (b.priority || 999));
                                }
                                
                                return (
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                                            {title}
                                        </h3>
                                        <div style={{ padding: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {apis.map((api) => (
                                                <div key={api.key} style={{
                                                    padding: '14px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    background: api.enabled ? '#fff' : '#f8fafc',
                                                    opacity: api.enabled ? 1 : 0.7
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={api.enabled}
                                                                    onChange={(e) => {
                                                                        const newSettings = getSettings();
                                                                        const updatedApis = {
                                                                            ...newSettings.apiSettings?.[groupKey],
                                                                            [api.key]: {
                                                                                ...api,
                                                                                enabled: e.target.checked
                                                                            }
                                                                        };
                                                                        saveSettings({
                                                                            ...newSettings,
                                                                            apiSettings: {
                                                                                ...newSettings.apiSettings,
                                                                                [groupKey]: updatedApis
                                                                            }
                                                                        });
                                                                        setSettings(getSettings());
                                                                    }}
                                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                                />
                                                                <strong style={{ fontSize: '15px', color: api.enabled ? '#1e293b' : '#94a3b8' }}>
                                                                    {api.name}
                                                                </strong>
                                                            </div>
                                                            <p style={{ fontSize: '13px', color: '#64748b', marginLeft: '28px', marginTop: '2px', lineHeight: '1.5' }}>
                                                                {api.description}
                                                            </p>
                                                        </div>
                                                        {api.enabled && hasPriority && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                                                                <label style={{ fontSize: '12px', color: '#64748b' }}>Priority:</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="10"
                                                                    value={api.priority || 999}
                                                                    onChange={(e) => {
                                                                        const newPriority = parseInt(e.target.value) || 999;
                                                                        const newSettings = getSettings();
                                                                        const updatedApis = {
                                                                            ...newSettings.apiSettings?.[groupKey],
                                                                            [api.key]: {
                                                                                ...api,
                                                                                priority: newPriority
                                                                            }
                                                                        };
                                                                        saveSettings({
                                                                            ...newSettings,
                                                                            apiSettings: {
                                                                                ...newSettings.apiSettings,
                                                                                [groupKey]: updatedApis
                                                                            }
                                                                        });
                                                                        setSettings(getSettings());
                                                                    }}
                                                                    style={{
                                                                        width: '60px',
                                                                        padding: '4px 8px',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '4px',
                                                                        fontSize: '13px'
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            };
                            
                            return (
                                <>
                                    {renderApiGroup('✈️ Flight Search APIs', apiSettings.flightApis, 'flightApis', true)}

                                    {/* Mapping Provider Selection */}
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                                            🗺️ Mapping Provider (Geocoding & Routing)
                                        </h3>
                                        <div style={{ padding: '16px', border: '2px solid #3b82f6', borderRadius: '8px', background: '#eff6ff' }}>
                                            {(() => {
                                                const activeTech = getActiveTechnician();
                                                const currentProvider = activeTech?.mapping_provider || 'auto';

                                                const handleProviderChange = async (provider) => {
                                                    if (!activeTech) return;

                                                    try {
                                                        const response = await fetch(`http://localhost:3000/api/technicians/${activeTech.id}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                ...activeTech,
                                                                mapping_provider: provider
                                                            })
                                                        });

                                                        if (response.ok) {
                                                            const updated = await response.json();
                                                            setActiveTechnician(updated.technician);
                                                            setSaved(true);
                                                            setTimeout(() => setSaved(false), 2000);
                                                        }
                                                    } catch (error) {
                                                        console.error('Failed to update mapping provider:', error);
                                                    }
                                                };

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {[
                                                            { value: 'auto', label: '🔄 Auto (Recommended)', desc: 'Try OpenRouteService first, fallback to Google Maps', badge: 'Smart', badgeColor: '#10b981' },
                                                            { value: 'openrouteservice', label: '🆓 OpenRouteService Only', desc: 'Free forever - 2,000 requests/day', badge: 'FREE', badgeColor: '#3b82f6' },
                                                            { value: 'google', label: '💳 Google Maps Only', desc: 'Paid service - most reliable', badge: 'Paid', badgeColor: '#ef4444' }
                                                        ].map((option) => (
                                                            <label
                                                                key={option.value}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    padding: '14px',
                                                                    border: currentProvider === option.value ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                                                    borderRadius: '8px',
                                                                    background: currentProvider === option.value ? '#fff' : '#f8fafc',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                                                onMouseLeave={(e) => e.currentTarget.style.borderColor = currentProvider === option.value ? '#3b82f6' : '#cbd5e1'}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="mappingProvider"
                                                                    value={option.value}
                                                                    checked={currentProvider === option.value}
                                                                    onChange={() => handleProviderChange(option.value)}
                                                                    style={{ width: '18px', height: '18px', marginRight: '12px', cursor: 'pointer' }}
                                                                />
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                        <strong style={{ fontSize: '15px', color: '#1e293b' }}>{option.label}</strong>
                                                                        <span style={{
                                                                            padding: '2px 8px',
                                                                            borderRadius: '4px',
                                                                            fontSize: '11px',
                                                                            fontWeight: '600',
                                                                            color: '#fff',
                                                                            background: option.badgeColor
                                                                        }}>
                                                                            {option.badge}
                                                                        </span>
                                                                    </div>
                                                                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{option.desc}</p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                                                <strong>💡 Current Usage:</strong> Check backend logs to see which provider is handling your requests.
                                                <br />
                                                <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                                                    tail -f /tmp/backend.log | grep Provider
                                                </code>
                                            </div>
                                        </div>
                                    </div>

                                    {renderApiGroup('🚗 Car Rental APIs', apiSettings.carRentalApis, 'carRentalApis', false)}
                                    {renderApiGroup('🏨 Hotel APIs', apiSettings.hotelApis, 'hotelApis', false)}
                                    {renderApiGroup('🛣️ Toll Calculation APIs', apiSettings.tollApis, 'tollApis', true)}
                                    {renderApiGroup('🛫 Airport Search APIs', apiSettings.airportApis, 'airportApis', true)}

                                    <div style={{ marginTop: '32px', padding: '16px', background: '#f1f5f9', borderRadius: '8px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                        <strong style={{ display: 'block', marginBottom: '8px' }}>📝 Notes:</strong>
                                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                            <li>APIs with priority settings are tried in order (lower number = higher priority)</li>
                                            <li>If the first API fails or returns no results, the system will automatically try the next enabled API</li>
                                            <li>Disabling an API will prevent it from being used, and the system will use fallback methods if available</li>
                                            <li>Some APIs require API keys to be configured in the backend environment variables</li>
                                        </ul>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* SYSTEM TAB */}
                {activeTab === 'system' && (
                    <div className="tab-content">
                        <h2>System Settings</h2>
                        <p className="tab-description">
                            Manage system data storage.
                        </p>

                        <div className="settings-grid">
                            <div className="setting-item" style={{ gridColumn: '1 / -1' }}>
                                <label>Clear Customer Airport Data</label>
                                <p className="setting-desc">
                                    Clear customer airport data to force re-fetching on next use. Customer records will be kept, but their airport data will be cleared.
                                </p>
                                <button 
                                    className="btn-danger" 
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to clear customer airport data? This will force fresh airport lookups on next use.')) {
                                            return;
                                        }
                                        
                                        setClearingCache(true);
                                        try {
                                            // Clear customer airport data
                                            const airportResult = await customersAPI.clearAirports();
                                            console.log(`Cleared airport data for ${airportResult.data.cleared} customers`);
                                            
                                            // Clear frontend localStorage (except settings)
                                            const settingsKey = 'tripCostSettings';
                                            const keysToKeep = [settingsKey];
                                            const allKeys = Object.keys(localStorage);
                                            allKeys.forEach(key => {
                                                if (!keysToKeep.includes(key)) {
                                                    localStorage.removeItem(key);
                                                }
                                            });
                                            
                                            // Reload technicians to ensure fresh data
                                            const techs = await getAllTechnicians();
                                            setTechnicians(techs);
                                            
                                            alert(`✅ Customer airport data cleared successfully!\n\nCleared airport data for ${airportResult.data.cleared} customers.\n\nThe system will now use fresh data on next search.`);
                                        } catch (error) {
                                            console.error('Error clearing customer airports:', error);
                                            alert('❌ Error clearing customer airports: ' + error.message);
                                        } finally {
                                            setClearingCache(false);
                                        }
                                    }}
                                    disabled={clearingCache}
                                    style={{ 
                                        marginTop: '1rem',
                                        padding: '0.75rem 1.5rem',
                                        fontSize: '1rem',
                                        backgroundColor: clearingCache ? '#9ca3af' : '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: clearingCache ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {clearingCache ? '🔄 Clearing...' : '🗑️ Clear Customer Airport Data'}
                                </button>
                            </div>
                            
                            <div className="setting-item" style={{ gridColumn: '1 / -1', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label>Customer Management</label>
                                    {customerCount !== null && (
                                        <span style={{ 
                                            fontSize: '0.875rem', 
                                            color: '#059669',
                                            fontWeight: '600',
                                            padding: '0.25rem 0.75rem',
                                            backgroundColor: '#d1fae5',
                                            borderRadius: '6px'
                                        }}>
                                            👥 {customerCount} Customers
                                        </span>
                                    )}
                                </div>
                                <p className="setting-desc">
                                    View, edit, and delete individual customer records. You can also delete all customers at once (use with extreme caution).
                                </p>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <button 
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowCustomerModal(true);
                                            setLoadingCustomers(true);
                                            try {
                                                const response = await customersAPI.getAll();
                                                // Handle different response structures
                                                if (response.data) {
                                                    if (response.data.success && response.data.data) {
                                                        // Response format: { success: true, data: [...] }
                                                        setCustomers(response.data.data);
                                                    } else if (Array.isArray(response.data)) {
                                                        // Response format: [...] (array directly)
                                                        setCustomers(response.data);
                                                    } else if (response.data.data && Array.isArray(response.data.data)) {
                                                        // Nested data structure
                                                        setCustomers(response.data.data);
                                                    } else {
                                                        setCustomers([]);
                                                    }
                                                } else {
                                                    setCustomers([]);
                                                }
                                            } catch (error) {
                                                console.error('Error loading customers:', error);
                                                alert('Failed to load customers: ' + (error.response?.data?.error || error.message));
                                                setCustomers([]);
                                            } finally {
                                                setLoadingCustomers(false);
                                            }
                                        }}
                                        style={{ 
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem',
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        📋 Manage Customers
                                    </button>
                                    <button 
                                        className="btn-danger" 
                                        onClick={async () => {
                                            const confirmed = window.confirm(
                                                '⚠️ DANGER: This will PERMANENTLY DELETE ALL CUSTOMERS from the database!\n\n' +
                                                'This action CANNOT be undone.\n\n' +
                                                'Are you absolutely sure you want to proceed?'
                                            );
                                            
                                            if (!confirmed) {
                                                return;
                                            }
                                            
                                            // Double confirmation
                                            const doubleConfirmed = window.confirm(
                                                'FINAL WARNING: You are about to delete ALL customers.\n\n' +
                                                'Type "DELETE ALL" in the next prompt to confirm.'
                                            );
                                            
                                            if (!doubleConfirmed) {
                                                return;
                                            }
                                            
                                            const userInput = window.prompt('Type "DELETE ALL" to confirm deletion:');
                                            if (userInput !== 'DELETE ALL') {
                                                alert('Deletion cancelled. Customers were not deleted.');
                                                return;
                                            }
                                            
                                            setClearingCache(true);
                                            try {
                                                const result = await customersAPI.deleteAll();
                                                
                                                // Refresh customer count
                                                try {
                                                    const customerResponse = await customersAPI.getCount();
                                                    if (customerResponse.data.success) {
                                                        setCustomerCount(customerResponse.data.count);
                                                    }
                                                } catch (e) {
                                                    setCustomerCount(0);
                                                }
                                                
                                                // Close modal if open and refresh customer list
                                                if (showCustomerModal) {
                                                    const response = await customersAPI.getAll();
                                                    if (response.data.success) {
                                                        setCustomers(response.data.data || []);
                                                    }
                                                }
                                                
                                                alert(`✅ Successfully deleted ${result.data.deleted} customers from the database.\n\nCustomer count is now: ${result.data.deleted === 0 ? 0 : '0'}`);
                                            } catch (error) {
                                                console.error('Error deleting customers:', error);
                                                alert('❌ Error deleting customers: ' + (error.response?.data?.error || error.message));
                                            } finally {
                                                setClearingCache(false);
                                            }
                                        }}
                                        disabled={clearingCache}
                                        style={{ 
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem',
                                            backgroundColor: clearingCache ? '#9ca3af' : '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: clearingCache ? 'not-allowed' : 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {clearingCache ? '🔄 Deleting...' : '🗑️ Delete All Customers'}
                                    </button>
                                </div>
                                <p className="setting-desc" style={{ color: '#dc2626', fontWeight: '600', marginTop: '1rem', fontSize: '0.875rem' }}>
                                    ⚠️ WARNING: "Delete All Customers" will permanently delete ALL customer records from the database. This action cannot be undone. Use with extreme caution.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* DAILY RATES TAB */}
                {activeTab === 'dailyRates' && (
                    <DailyRatesTab />
                )}

                {/* LOGS TAB */}
                {activeTab === 'logs' && (
                    <div className="tab-content" style={{ padding: '20px', background: '#f9f9f9' }}>
                        <h2>📋 Application Logs</h2>
                        <p className="tab-description">
                            View and filter application logs for debugging and monitoring. Logs are stored in memory and cleared on page refresh.
                        </p>
                        <div style={{ marginTop: '20px', padding: '10px', background: '#fff', border: '2px solid #4caf50', borderRadius: '8px' }}>
                            <strong>Debug: Logs tab is active. activeTab = {activeTab}</strong>
                        </div>
                        <LogViewer />
                    </div>
                )}

                {/* Customer Management Modal */}
                {showCustomerModal && (
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            padding: '20px'
                        }} 
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowCustomerModal(false);
                                setEditingCustomer(null);
                            }
                        }}
                    >
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '900px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Customer Management</h2>
                                <button
                                    onClick={() => {
                                        setShowCustomerModal(false);
                                        setEditingCustomer(null);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        color: '#6b7280'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            {loadingCustomers ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>Loading customers...</div>
                            ) : editingCustomer ? (
                                <div>
                                    <h3 style={{ marginBottom: '16px' }}>Edit Customer</h3>
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Name</label>
                                            <input
                                                type="text"
                                                value={customerForm.name}
                                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email</label>
                                            <input
                                                type="email"
                                                value={customerForm.email}
                                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Phone</label>
                                            <input
                                                type="text"
                                                value={customerForm.phone}
                                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Street Address</label>
                                            <input
                                                type="text"
                                                value={customerForm.street_address}
                                                onChange={(e) => setCustomerForm({ ...customerForm, street_address: e.target.value })}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>City</label>
                                                <input
                                                    type="text"
                                                    value={customerForm.city}
                                                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Postal Code</label>
                                                <input
                                                    type="text"
                                                    value={customerForm.postal_code}
                                                    onChange={(e) => setCustomerForm({ ...customerForm, postal_code: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Country</label>
                                            <input
                                                type="text"
                                                value={customerForm.country}
                                                onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => {
                                                setEditingCustomer(null);
                                                setCustomerForm({ name: '', email: '', phone: '', street_address: '', city: '', country: '', postal_code: '' });
                                            }}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#f3f4f6',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await customersAPI.update(editingCustomer.id, customerForm);
                                                    const response = await customersAPI.getAll();
                                                    if (response.data && Array.isArray(response.data)) {
                                                        setCustomers(response.data);
                                                    } else if (response.data && response.data.success && response.data.data) {
                                                        setCustomers(response.data.data);
                                                    }
                                                    setEditingCustomer(null);
                                                    setCustomerForm({ name: '', email: '', phone: '', street_address: '', city: '', country: '', postal_code: '' });
                                                    alert('Customer updated successfully!');
                                                } catch (error) {
                                                    alert('Failed to update customer: ' + (error.response?.data?.error || error.message));
                                                }
                                            }}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#059669',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={{ margin: 0, color: '#6b7280' }}>Total: {customers.length} customers</p>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Address</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>City</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Country</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {customers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                                            No customers found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    customers.map((customer) => (
                                                        <tr key={customer.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                            <td style={{ padding: '12px' }}>{customer.name || '-'}</td>
                                                            <td style={{ padding: '12px' }}>{customer.email || '-'}</td>
                                                            <td style={{ padding: '12px' }}>{customer.street_address || '-'}</td>
                                                            <td style={{ padding: '12px' }}>{customer.city || '-'}</td>
                                                            <td style={{ padding: '12px' }}>{customer.country || '-'}</td>
                                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCustomer(customer);
                                                                            setCustomerForm({
                                                                                name: customer.name || '',
                                                                                email: customer.email || '',
                                                                                phone: customer.phone || '',
                                                                                street_address: customer.street_address || '',
                                                                                city: customer.city || '',
                                                                                country: customer.country || '',
                                                                                postal_code: customer.postal_code || ''
                                                                            });
                                                                        }}
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            backgroundColor: '#3b82f6',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            fontSize: '14px'
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (window.confirm(`Delete customer "${customer.name || customer.email}"?`)) {
                                                                                try {
                                                                                    await customersAPI.delete(customer.id);
                                                                                    const response = await customersAPI.getAll();
                                                                                    if (response.data && Array.isArray(response.data)) {
                                                                                        setCustomers(response.data);
                                                                                    } else if (response.data && response.data.success && response.data.data) {
                                                                                        setCustomers(response.data.data);
                                                                                    }
                                                                                    // Refresh customer count
                                                                                    try {
                                                                                        const customerResponse = await customersAPI.getCount();
                                                                                        if (customerResponse.data.success) {
                                                                                            setCustomerCount(customerResponse.data.count);
                                                                                        }
                                                                                    } catch (e) {
                                                                                        // Ignore
                                                                                    }
                                                                                    alert('Customer deleted successfully!');
                                                                                } catch (error) {
                                                                                    alert('Failed to delete customer: ' + (error.response?.data?.error || error.message));
                                                                                }
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            backgroundColor: '#dc2626',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            fontSize: '14px'
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// DAILY RATES TAB COMPONENT
// ============================================================================
const DailyRatesTab = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingRate, setEditingRate] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('country_name');
    const [sortDirection, setSortDirection] = useState('asc');
    const fileInputRef = React.useRef(null);

    // Form state for add/edit
    const [formData, setFormData] = useState({
        country_code: '',
        country_name: '',
        city_name: '',
        daily_allowance_8h: 0,
        daily_allowance_24h: 0,
        hotel_rate_max: 0,
        agent_fee: 0,
        company_fee: 0,
        additional_fee_percent: 0,
        currency: 'EUR',
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: '',
        source_reference: 'Manual Entry'
    });

    // Load rates on mount
    useEffect(() => {
        loadRates();
    }, []);

    const loadRates = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/rates`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                setRates(data.data || []);
            } else {
                setError(data.error || 'Failed to load rates');
            }
        } catch (err) {
            setError(`Failed to connect to server: ${err.message}`);
            console.error('Error loading rates:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort rates
    const filteredRates = rates
        .filter(rate => {
            const search = searchTerm.toLowerCase();
            return (
                rate.country_name?.toLowerCase().includes(search) ||
                rate.country_code?.toLowerCase().includes(search) ||
                rate.city_name?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            let aVal = a[sortField] || '';
            let bVal = b[sortField] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleAddNew = () => {
        setFormData({
            country_code: '',
            country_name: '',
            city_name: '',
            daily_allowance_8h: 0,
            daily_allowance_24h: 0,
            hotel_rate_max: 0,
            agent_fee: 0,
            company_fee: 0,
            additional_fee_percent: 0,
            currency: 'EUR',
            effective_from: new Date().toISOString().split('T')[0],
            effective_until: '',
            source_reference: 'Manual Entry'
        });
        setEditingRate(null);
        setShowAddModal(true);
    };

    const handleEdit = (rate) => {
        setFormData({
            country_code: rate.country_code || '',
            country_name: rate.country_name || '',
            city_name: rate.city_name || '',
            daily_allowance_8h: rate.daily_allowance_8h || 0,
            daily_allowance_24h: rate.daily_allowance_24h || 0,
            hotel_rate_max: rate.hotel_rate_max || 0,
            agent_fee: rate.agent_fee || 0,
            company_fee: rate.company_fee || 0,
            additional_fee_percent: rate.additional_fee_percent || 0,
            currency: rate.currency || 'EUR',
            effective_from: rate.effective_from?.split('T')[0] || new Date().toISOString().split('T')[0],
            effective_until: rate.effective_until?.split('T')[0] || '',
            source_reference: rate.source_reference || ''
        });
        setEditingRate(rate);
        setShowAddModal(true);
    };

    const handleDelete = async (rate) => {
        if (!window.confirm(`Delete rate for ${rate.country_name}${rate.city_name ? ` (${rate.city_name})` : ''}?`)) {
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/rates/${rate.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                loadRates();
            } else {
                alert('Error deleting rate: ' + data.error);
            }
        } catch (err) {
            alert('Error deleting rate: ' + err.message);
        }
    };

    const handleSave = async () => {
        try {
            const url = editingRate ? `${API_URL}/api/rates/${editingRate.id}` : `${API_URL}/api/rates`;
            const method = editingRate ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            if (data.success) {
                setShowAddModal(false);
                loadRates();
            } else {
                alert('Error saving rate: ' + data.error);
            }
        } catch (err) {
            alert('Error saving rate: ' + err.message);
        }
    };

    const handleExport = async (format) => {
        try {
            const response = await fetch(`${API_URL}/api/rates/export/${format}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `travel_rates.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            alert('Error exporting: ' + err.message);
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/api/rates/import`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                alert(`✅ Imported ${data.imported} rates successfully!`);
                loadRates();
            } else {
                alert('Error importing: ' + data.error);
            }
        } catch (err) {
            alert('Error importing: ' + err.message);
        }
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="tab-content">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                    <div>Loading rates...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="tab-content">
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>❌</div>
                    <div>{error}</div>
                    <button onClick={loadRates} style={{ marginTop: '16px' }}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <h2>📊 Daily Travel Rates</h2>
            <p className="tab-description">
                Manage country-specific travel rates including daily allowances, hotel rates, and trip fees. 
                These rates are typically updated annually based on government regulations (ARVVwV).
            </p>

            {/* Toolbar */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '20px', 
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    placeholder="🔍 Search countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        flex: '1',
                        minWidth: '200px'
                    }}
                />
                <button 
                    onClick={handleAddNew}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    ➕ Add Rate
                </button>
                <button 
                    onClick={() => handleExport('csv')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    📥 Export CSV
                </button>
                <button 
                    onClick={() => handleExport('json')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    📥 Export JSON
                </button>
                <label style={{
                    padding: '8px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}>
                    📤 Import
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.csv"
                        onChange={handleImport}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {/* Stats */}
            <div style={{ 
                marginBottom: '16px', 
                fontSize: '14px', 
                color: '#6b7280' 
            }}>
                Showing {filteredRates.length} of {rates.length} rates
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                            <th onClick={() => handleSort('country_code')} style={thStyle}>
                                Code {sortField === 'country_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('country_name')} style={thStyle}>
                                Country {sortField === 'country_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('city_name')} style={thStyle}>
                                City {sortField === 'city_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th style={thStyle}>Half Day (8h)</th>
                            <th style={thStyle}>Full Day (24h)</th>
                            <th style={thStyle}>Hotel Max</th>
                            <th style={thStyle}>Agent Fee</th>
                            <th style={thStyle}>Company Fee</th>
                            <th style={thStyle}>Add. Fee %</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRates.map((rate) => (
                            <tr key={rate.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={tdStyle}>{rate.country_code}</td>
                                <td style={tdStyle}>{rate.country_name}</td>
                                <td style={tdStyle}>{rate.city_name || '-'}</td>
                                <td style={tdStyle}>€{parseFloat(rate.daily_allowance_8h || 0).toFixed(2)}</td>
                                <td style={tdStyle}>€{parseFloat(rate.daily_allowance_24h || 0).toFixed(2)}</td>
                                <td style={tdStyle}>€{parseFloat(rate.hotel_rate_max || 0).toFixed(2)}</td>
                                <td style={tdStyle}>€{parseFloat(rate.agent_fee || 0).toFixed(2)}</td>
                                <td style={tdStyle}>€{parseFloat(rate.company_fee || 0).toFixed(2)}</td>
                                <td style={tdStyle}>{parseFloat(rate.additional_fee_percent || 0).toFixed(1)}%</td>
                                <td style={tdStyle}>
                                    <button 
                                        onClick={() => handleEdit(rate)}
                                        style={{ marginRight: '8px', padding: '4px 8px', cursor: 'pointer' }}
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(rate)}
                                        style={{ padding: '4px 8px', cursor: 'pointer', color: '#ef4444' }}
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredRates.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No rates found. {searchTerm ? 'Try a different search term.' : 'Click "Add Rate" to create one.'}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginBottom: '20px' }}>
                            {editingRate ? '✏️ Edit Rate' : '➕ Add New Rate'}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Country Code (3-letter)</label>
                                <input
                                    type="text"
                                    value={formData.country_code}
                                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase().slice(0, 3) })}
                                    placeholder="DEU"
                                    style={inputStyle}
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Country Name</label>
                                <input
                                    type="text"
                                    value={formData.country_name}
                                    onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                                    placeholder="Germany"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>City Name (optional)</label>
                                <input
                                    type="text"
                                    value={formData.city_name}
                                    onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                                    placeholder="Leave empty for country-wide"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Currency</label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="EUR">EUR (€)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="CHF">CHF (Fr)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Half Day Rate (8h) €</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.daily_allowance_8h}
                                    onChange={(e) => setFormData({ ...formData, daily_allowance_8h: parseFloat(e.target.value) || 0 })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Full Day Rate (24h) €</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.daily_allowance_24h}
                                    onChange={(e) => setFormData({ ...formData, daily_allowance_24h: parseFloat(e.target.value) || 0 })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Hotel Max Rate €</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.hotel_rate_max}
                                    onChange={(e) => setFormData({ ...formData, hotel_rate_max: parseFloat(e.target.value) || 0 })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Effective From</label>
                                <input
                                    type="date"
                                    value={formData.effective_from}
                                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
                                <h4 style={{ marginBottom: '12px', color: '#374151' }}>💼 Trip Fees (per trip)</h4>
                            </div>

                            <div>
                                <label style={labelStyle}>Agent Fee €</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.agent_fee}
                                    onChange={(e) => setFormData({ ...formData, agent_fee: parseFloat(e.target.value) || 0 })}
                                    style={inputStyle}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Company Fee €</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.company_fee}
                                    onChange={(e) => setFormData({ ...formData, company_fee: parseFloat(e.target.value) || 0 })}
                                    style={inputStyle}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Additional Fee %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.additional_fee_percent}
                                    onChange={(e) => setFormData({ ...formData, additional_fee_percent: parseFloat(e.target.value) || 0 })}
                                    style={inputStyle}
                                    placeholder="0.0"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Source Reference</label>
                                <input
                                    type="text"
                                    value={formData.source_reference}
                                    onChange={(e) => setFormData({ ...formData, source_reference: e.target.value })}
                                    placeholder="ARVVwV 2025"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                {editingRate ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Table styles
const thStyle = {
    padding: '12px 8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: '600',
    borderBottom: '2px solid #e5e7eb',
    whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '10px 8px',
    verticalAlign: 'middle'
};

const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151'
};

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
};

export default SettingsPage;
