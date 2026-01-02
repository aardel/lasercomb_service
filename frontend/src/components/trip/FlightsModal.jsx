/**
 * FlightsModal Component
 * 
 * Displays flight search results and allows selection of flights.
 * Extracted from TripWizardPage.jsx for better maintainability.
 * 
 * @module components/trip/FlightsModal
 */

import React from 'react';
import { formatTime } from '../../utils/formatters';
import { getAirlineName } from '../../utils/airlineCodes';

/**
 * FlightsModal Component
 */
const FlightsModal = ({
  isOpen,
  onClose,
  customerId,
  customers,
  flights,
  loadingFlights,
  selectedFlight,
  setSelectedFlight,
  fetchTravelOptions,
  fetchCostPreview,
  airportOptions,
  searchingWithApi,
  selectedSearchApi,
  setSelectedSearchApi,
  getSettings
}) => {
  if (!isOpen || !customerId) return null;

  const customer = customers.find(c => c.id === customerId);
  const flightData = flights[customerId];
  const isLoading = loadingFlights[customerId];

  // API options for search
  const apiOptions = [
    { id: 'all', label: '🔄 All APIs', color: '#6366f1' },
    { id: 'groq', label: '🤖 Groq AI', color: '#10b981' },
    { id: 'amadeus', label: '✈️ Amadeus', color: '#3b82f6' },
    { id: 'serpapi', label: '🔍 Google Flights', color: '#f59e0b' }
  ];

  // Handle API search
  const handleApiSearch = async (apiId) => {
    setSelectedSearchApi(apiId);
    if (customer?.coordinates) {
      console.log(`[FlightsModal] Searching with ${apiId} API for customer:`, customerId);
      await fetchTravelOptions(customerId, customer.coordinates, false, false, false, apiId === 'all' ? null : apiId);
    }
  };

  // Handle refresh
  const handleRefresh = async (e) => {
    e.stopPropagation();
    if (customer?.coordinates) {
      console.log('[FlightsModal] Refreshing flights for customer:', customerId);
      await fetchTravelOptions(customerId, customer.coordinates);
    }
  };

  // Handle flight selection
  const handleFlightSelect = (flight) => {
    if (!flight) {
      console.error('[FlightsModal] Cannot select flight: flight is null or undefined');
      return;
    }
    
    const flightPrice = flight.price || flight.total_price || 0;
    const flightToSelect = {
      ...flight,
      price: flightPrice,
      total_price: flightPrice,
      customerId: customerId
    };
    
    console.log('[FlightsModal] Selecting flight:', {
      id: flightToSelect.id,
      price: flightToSelect.price,
      total_price: flightToSelect.total_price,
      has_outbound: !!flightToSelect.outbound,
      has_return: !!flightToSelect.return
    });
    
    setSelectedFlight(flightToSelect);
    onClose();
    
    // Trigger cost recalculation
    setTimeout(() => {
      console.log('[FlightsModal] Triggering cost recalculation after flight selection...');
      fetchCostPreview();
    }, 300);
  };

  // Filter unique flights
  const getUniqueFlights = (options) => {
    if (!options) return [];
    
    const uniqueFlights = [];
    const seenKeys = new Set();
    
    options.forEach((flight) => {
      const isRoundTrip = flightData?.return_date || (flight.return && flight.outbound);
      
      // Skip flights without return if it's supposed to be round-trip
      if (isRoundTrip && !flight.return) {
        return;
      }
      
      const outboundKey = flight.outbound ? 
        `${flight.outbound.from || ''}-${flight.outbound.to || ''}-${flight.outbound.flight_number || ''}-${flight.outbound.departure_time || ''}-${flight.outbound.arrival_time || ''}` : 
        'no-outbound';
      const returnKey = flight.return ? 
        `${flight.return.from || ''}-${flight.return.to || ''}-${flight.return.flight_number || ''}-${flight.return.departure_time || ''}-${flight.return.arrival_time || ''}` : 
        'no-return';
      const priceKey = flight.price || 0;
      const uniqueKey = `${outboundKey}|${returnKey}|${priceKey}`;
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        uniqueFlights.push(flight);
      }
    });
    
    return uniqueFlights;
  };

  // Build provider URL from template
  const buildProviderURL = (template, isOneWayTemplate, searchData) => {
    const isOneWay = !searchData.retDate;
    const templateToUse = isOneWay && isOneWayTemplate ? isOneWayTemplate : template;
    if (!templateToUse) return '#';
    
    const formatDateForURL = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0];
    };
    
    return templateToUse
      .replace(/{origin}/g, searchData.originCode)
      .replace(/{destination}/g, searchData.destCode)
      .replace(/{departure}/g, formatDateForURL(searchData.depDate))
      .replace(/{return}/g, formatDateForURL(searchData.retDate));
  };

  // Render provider links
  const renderProviderLinks = (searchDetails) => {
    const currentSettings = getSettings();
    const enabledProviders = (currentSettings.flightProviders || []).filter(p => p.enabled !== false);
    
    if (enabledProviders.length === 0) return null;
    
    const searchData = {
      originCode: searchDetails?.origin_code || searchDetails?.origin_airport?.code || flightData?.origin_airport?.code || '',
      destCode: searchDetails?.destination_code || searchDetails?.destination_airport?.code || flightData?.destination_airport?.code || '',
      depDate: searchDetails?.departure_date || flightData?.departure_date || '',
      retDate: searchDetails?.return_date || flightData?.return_date || ''
    };
    
    return (
      <div style={{ 
        marginTop: '24px', 
        paddingTop: '24px', 
        borderTop: '2px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px', fontWeight: '600' }}>
          🔍 Search for flights on these providers:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-start' }}>
          {enabledProviders.map((provider) => {
            const url = buildProviderURL(provider.urlTemplate, provider.isOneWayTemplate, searchData);
            const baseColor = provider.color || '#2563eb';
            const hex = baseColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const hoverColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
            
            return (
              <a
                key={provider.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px',
                  background: baseColor,
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = hoverColor}
                onMouseLeave={(e) => e.target.style.background = baseColor}
              >
                {provider.icon || '🔗'} {provider.name || 'Provider'}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  // Check if airport is not primary
  const isNotPrimaryAirport = (code, type) => {
    const primaryCode = airportOptions[customerId]?.[type]?.[0]?.code;
    return primaryCode && code && code !== primaryCode;
  };

  // Get highlight style for non-primary airports
  const getHighlightStyle = (isHighlighted) => {
    if (!isHighlighted) return {};
    return {
      color: '#ef4444',
      fontWeight: '700',
      textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
      animation: 'pulse-red 1.5s ease-in-out infinite'
    };
  };

  // Render flight leg (outbound or return)
  const renderFlightLeg = (leg, type, flight) => {
    if (!leg) {
      return <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '6px', minHeight: '100%' }}></div>;
    }

    const isOutbound = type === 'outbound';
    const color = isOutbound ? '#059669' : '#dc2626';
    const label = isOutbound ? '✈️ Outbound' : '🔄 Return';

    return (
      <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '6px', minHeight: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <strong style={{ color, fontSize: '12px' }}>{label}</strong>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            {leg.stops === 0 ? '🟢 Direct' : `🟡 ${leg.stops} stop${leg.stops > 1 ? 's' : ''}`}
          </span>
        </div>
        
        <div style={{ fontSize: '11px', marginBottom: '6px', fontWeight: '500', color: '#1f2937', wordBreak: 'break-word' }}>
          {leg.routing ? (
            renderRouting(leg.routing, leg, isOutbound)
          ) : (
            renderSimpleRoute(leg, isOutbound)
          )}
        </div>
        
        <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: '1.5' }}>
          <div style={{ marginBottom: '3px' }}>
            <strong>Airline:</strong> {leg.airline ? getAirlineName(leg.airline) : 'N/A'} | <strong>Flight:</strong> {leg.flight_number || 'N/A'}
          </div>
          <div style={{ marginBottom: '3px' }}>
            <strong>Depart:</strong> {leg.departure_time || 'N/A'} (
              <span style={getHighlightStyle(isOutbound && isNotPrimaryAirport(leg.from, 'origin'))}>
                {leg.from || 'N/A'}
              </span>
            )<br />
            <strong>Arrive:</strong> {leg.arrival_time || 'N/A'} (
              <span style={getHighlightStyle(isOutbound && isNotPrimaryAirport(leg.to, 'destination'))}>
                {leg.to || 'N/A'}
              </span>
            )
          </div>
          <div>
            <strong>Duration:</strong> {formatTime(leg.duration_minutes || 0)}
            {leg.date && <span> | <strong>Date:</strong> {leg.date}</span>}
          </div>
        </div>
        
        {leg.segments && leg.segments.length > 1 && (
          <div style={{ marginTop: '6px', padding: '6px', background: '#fff', borderRadius: '4px', fontSize: '9px' }}>
            <strong>Connections:</strong>
            {leg.segments.map((seg, segIdx) => (
              <div key={segIdx} style={{ marginLeft: '6px', marginTop: '2px' }}>
                {segIdx + 1}. {seg.from} → {seg.to} ({seg.airline} {seg.flight_number}) - {formatTime(seg.duration_minutes)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render routing with highlighting
  const renderRouting = (routing, leg, isOutbound) => {
    const routingParts = routing.split(' → ');
    return routingParts.map((part, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === routingParts.length - 1;
      const isNotPrimaryOrigin = isFirst && isOutbound && isNotPrimaryAirport(part, 'origin');
      const isNotPrimaryDest = isLast && isOutbound && isNotPrimaryAirport(part, 'destination');
      const shouldHighlight = isNotPrimaryOrigin || isNotPrimaryDest;
      
      return (
        <span key={idx}>
          <span style={getHighlightStyle(shouldHighlight)}>{part}</span>
          {idx < routingParts.length - 1 && ' → '}
        </span>
      );
    });
  };

  // Render simple route (from → to)
  const renderSimpleRoute = (leg, isOutbound) => {
    const isOriginNotPrimary = isOutbound && isNotPrimaryAirport(leg.from, 'origin');
    const isDestNotPrimary = isOutbound && isNotPrimaryAirport(leg.to, 'destination');
    
    return (
      <>
        <span style={getHighlightStyle(isOriginNotPrimary)}>{leg.from}</span>
        {' → '}
        <span style={getHighlightStyle(isDestNotPrimary)}>{leg.to}</span>
      </>
    );
  };

  // Render flight card
  const renderFlightCard = (flight, index) => {
    const isSelected = selectedFlight?.id === flight.id;
    const provider = flightData?.provider || 'Amadeus API';
    
    // Build booking URL
    const buildBookingURL = () => {
      const originCode = flightData?.origin_airport?.code || '';
      const destCode = flightData?.destination_airport?.code || '';
      const depDate = flightData?.departure_date || '';
      const retDate = flightData?.return_date || '';
      const isRoundTrip = !!retDate;
      
      if (isRoundTrip && retDate) {
        return `https://www.google.com/travel/flights?q=flights%20${originCode}%20to%20${destCode}%20${depDate}%20returning%20${retDate}`;
      }
      return `https://www.google.com/travel/flights?q=flights%20${originCode}%20to%20${destCode}%20${depDate}`;
    };

    return (
      <div
        key={flight.id || index}
        className={`result-card selection-card flight-card-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleFlightSelect(flight)}
        style={{
          border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
          background: isSelected ? '#eff6ff' : 'white',
          cursor: 'pointer',
          borderRadius: '8px',
          transition: 'all 0.2s',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div className="flight-card-grid">
          {/* Selection Radio Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px' }}>
            <input
              type="radio"
              name="flight-selection"
              checked={isSelected}
              onChange={() => handleFlightSelect(flight)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            {isSelected && (
              <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '11px', marginTop: '4px' }}>✓</span>
            )}
          </div>
          
          {/* Option Label */}
          <div style={{ paddingTop: '4px' }}>
            <strong style={{ fontSize: '14px' }}>Option {index + 1}</strong>
            {isSelected && (
              <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>Selected</div>
            )}
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
              Via {provider}
            </div>
          </div>
          
          {/* Outbound Flight */}
          {renderFlightLeg(flight.outbound, 'outbound', flight)}
          
          {/* Return Flight */}
          {renderFlightLeg(flight.return, 'return', flight)}
          
          {/* Price and Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '16px', borderLeft: '2px solid #e5e7eb', marginLeft: '8px' }}>
            <div style={{ textAlign: 'center', width: '100%', marginBottom: '12px' }}>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb', marginBottom: '4px' }}>
                €{flight.price?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                Round-trip
              </div>
              <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: '1.4' }}>
                <div><strong>Total:</strong> {formatTime((flight.outbound?.duration_minutes || 0) + (flight.return?.duration_minutes || 0))}</div>
                <div>{flight.type || (flight.is_round_trip ? 'Round-Trip' : 'One-Way')}</div>
              </div>
            </div>
            <a
              href={buildBookingURL()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '10px 16px',
                background: '#2563eb',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                width: '100%',
                textAlign: 'center',
                display: 'block',
                boxSizing: 'border-box'
              }}
              title={`Book via ${provider}`}
            >
              Book Flight
            </a>
          </div>
        </div>
      </div>
    );
  };

  // Get unique flights
  const uniqueFlights = getUniqueFlights(flightData?.options);

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
        
        {/* Header */}
        <div className="ai-modal-header">
          <h2>✈️ Select Flight</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {customer && (
              <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>
                {customer.name || customer.address || 'Customer'}
              </span>
            )}
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              title="Refresh flights"
            >
              {isLoading ? '⏳' : '🔄'}
            </button>
            <button className="ai-modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        {/* API Source Selection */}
        {/* Provider Info - Now configured in Settings */}
        {flightData?.provider && (
          <div style={{
            padding: '10px 14px',
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: '500' }}>
              ✓ Searched with: {flightData.provider}
            </span>
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: '#64748b',
              fontStyle: 'italic'
            }}>
              Configure providers in Settings
            </span>
          </div>
        )}
        
        {/* Body */}
        <div className="ai-modal-body">
          {/* Loading State */}
          {isLoading && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Searching for flights...</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Please wait while we fetch the latest flight options.</div>
            </div>
          )}
          
          {/* No Loading - Show Results */}
          {!isLoading && (
            <>
              {/* No flight data */}
              {!flightData && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>No flight data available</div>
                  <div style={{ fontSize: '14px' }}>Flight search may still be in progress or no flights were found.</div>
                </div>
              )}
              
              {/* Error state */}
              {flightData && flightData.success === false && (
                <div style={{ padding: '24px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>✈️</div>
                    <strong style={{ fontSize: '18px', color: '#ef4444', display: 'block', marginBottom: '8px' }}>No Flights Found</strong>
                  </div>

                  {/* Search Details Box */}
                  <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
                      Search Criteria:
                    </div>
                    <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.8' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>From:</strong> {flightData.origin_airport?.code || 'N/A'} - {[
                          flightData.origin_airport?.name,
                          flightData.origin_airport?.city,
                          flightData.origin_airport?.country
                        ].filter(Boolean).join(', ') || 'Unknown Airport'}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>To:</strong> {flightData.destination_airport?.code || 'N/A'} - {[
                          flightData.destination_airport?.name,
                          flightData.destination_airport?.city,
                          flightData.destination_airport?.country
                        ].filter(Boolean).join(', ') || 'Unknown Airport'}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Departure:</strong> {flightData.departure_date || 'N/A'}
                      </div>
                      {flightData.return_date && (
                        <div>
                          <strong>Return:</strong> {flightData.return_date}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                    {flightData.error || 'No flight data available for this route.'}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {renderProviderLinks(flightData.search_details)}
                  </div>
                </div>
              )}
              
              {/* Flights available */}
              {flightData && flightData.options && flightData.options.length > 0 && (
                <>
                  {uniqueFlights.length > 0 ? (
                    <>
                      {/* Route Info */}
                      <div style={{ marginBottom: '20px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <strong>Route:</strong>{' '}
                            <span style={getHighlightStyle(isNotPrimaryAirport(flightData.origin_airport?.code, 'origin'))}>
                              {flightData.origin_airport?.code}
                              {flightData.origin_airport?.name && (
                                <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '4px' }}>
                                  ({[
                                    flightData.origin_airport.name,
                                    flightData.origin_airport.city,
                                    flightData.origin_airport.country
                                  ].filter(Boolean).join(', ')})
                                </span>
                              )}
                            </span>
                            {' → '}
                            <span style={getHighlightStyle(isNotPrimaryAirport(flightData.destination_airport?.code, 'destination'))}>
                              {flightData.destination_airport?.code}
                              {flightData.destination_airport?.name && (
                                <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '4px' }}>
                                  ({[
                                    flightData.destination_airport.name,
                                    flightData.destination_airport.city,
                                    flightData.destination_airport.country
                                  ].filter(Boolean).join(', ')})
                                </span>
                              )}
                            </span>
                            {(isNotPrimaryAirport(flightData.origin_airport?.code, 'origin') ||
                              isNotPrimaryAirport(flightData.destination_airport?.code, 'destination')) && (
                              <span style={{
                                fontSize: '10px',
                                background: '#ef4444',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '600',
                                marginLeft: '8px',
                                animation: 'pulse-red 1.5s ease-in-out infinite'
                              }}>⚠️ Using Alternative Airport</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            🔴 Live Data
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: '#4b5563' }}>
                          <div>
                            <strong>Origin:</strong> {flightData.origin_airport?.code} - {[
                              flightData.origin_airport?.name,
                              flightData.origin_airport?.city,
                              flightData.origin_airport?.country
                            ].filter(Boolean).join(', ')}
                          </div>
                          <div>
                            <strong>Destination:</strong> {flightData.destination_airport?.code} - {[
                              flightData.destination_airport?.name,
                              flightData.destination_airport?.city,
                              flightData.destination_airport?.country
                            ].filter(Boolean).join(', ')}
                          </div>
                          <div><strong>Departure:</strong> {flightData.departure_date}</div>
                          {flightData.return_date && (
                            <div><strong>Return:</strong> {flightData.return_date}</div>
                          )}
                          <div style={{ marginTop: '8px' }}>
                            <strong>Statistics:</strong>{' '}
                            Cheapest: €{flightData.statistics?.cheapest || 0} |{' '}
                            Median: €{flightData.statistics?.median || 0} |{' '}
                            Most Expensive: €{flightData.statistics?.most_expensive || 0}
                            {` (${uniqueFlights.length} unique of ${flightData.options.length} total)`}
                          </div>
                        </div>
                      </div>
                      
                      {/* Flight Cards */}
                      <div className="flight-cards-container">
                        {uniqueFlights.map((flight, index) => renderFlightCard(flight, index))}
                      </div>
                      
                      {/* Provider Links */}
                      {renderProviderLinks(flightData)}
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ fontSize: '16px', marginBottom: '8px' }}>No unique flights available</div>
                      <div style={{ fontSize: '14px' }}>All flights were duplicates. Please try refreshing the search.</div>
                    </div>
                  )}
                </>
              )}
              
              {/* Fallback - no options */}
              {flightData && flightData.success !== false && (!flightData.options || flightData.options.length === 0) && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  No flights available. Please wait for flight search to complete.
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="ai-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {selectedFlight && (
            <div style={{ fontSize: '14px', color: '#059669', fontWeight: '500' }}>
              ✓ Flight Selected: €{selectedFlight.price?.toFixed(2) || '0.00'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightsModal;

