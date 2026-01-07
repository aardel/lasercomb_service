import React, { useState, useEffect } from 'react';
import { expensesAPI, ratesAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import './TripDurationTab.css';

const TripDurationTab = ({ segments, onSegmentsChange, ratesDatabaseInfo }) => {
  const [countries, setCountries] = useState([]);
  const [countrySuggestions, setCountrySuggestions] = useState({});
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [calculating, setCalculating] = useState({});

  // Load countries from rates API
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await ratesAPI.getAll();
      if (response.data.success) {
        // Get unique countries (prefer country-level rates over city-specific)
        const countryMap = new Map();
        response.data.data.forEach(rate => {
          const key = rate.country_code;
          if (!countryMap.has(key) || !rate.city_name) {
            countryMap.set(key, {
              code: rate.country_code,
              name: rate.country_name,
              rate_8h: rate.daily_allowance_8h,
              rate_24h: rate.daily_allowance_24h
            });
          }
        });
        setCountries(Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      logger.error('TripDurationTab', 'Error loading countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const addSegment = () => {
    if (segments.length >= 10) {
      alert('Maximum 10 segments allowed');
      return;
    }

    // Get the last segment's end date/time and add 1 minute for the new segment's start
    let newStartDateTime = '';
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment.end_date_time) {
        try {
          // Parse the end date/time and add 1 minute
          const endDate = new Date(lastSegment.end_date_time);
          if (!isNaN(endDate.getTime())) {
            // Add 1 minute (60000 milliseconds)
            const newStartDate = new Date(endDate.getTime() + 60000);
            // Convert back to ISO string
            newStartDateTime = newStartDate.toISOString();
            logger.info('TripDurationTab', 'Auto-filled start date from previous segment:', {
              previousEnd: lastSegment.end_date_time,
              newStart: newStartDateTime
            });
          }
        } catch (error) {
          logger.warn('TripDurationTab', 'Error calculating new start date:', error);
        }
      }
    }

    const newSegment = {
      id: `segment-${Date.now()}`,
      segment_number: segments.length + 1,
      country_code: '',
      country_name: '',
      start_date_time: newStartDateTime,
      end_date_time: '',
      rate_8h: 0,
      rate_24h: 0,
      multiplier_1: 0,
      multiplier_2: 0,
      total_segment: 0
    };

    onSegmentsChange([...segments, newSegment]);
  };

  const removeSegment = (index) => {
    const newSegments = segments.filter((_, i) => i !== index);
    // Renumber segments
    newSegments.forEach((seg, i) => {
      seg.segment_number = i + 1;
    });
    onSegmentsChange(newSegments);
  };

  const checkDateOverlap = (segments, currentIndex, startDateTime, endDateTime) => {
    if (!startDateTime || !endDateTime) return null;
    
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end <= start) return 'End date must be after start date';
    
    // Check for overlaps with other segments
    for (let i = 0; i < segments.length; i++) {
      if (i === currentIndex) continue; // Skip current segment
      
      const otherSegment = segments[i];
      if (!otherSegment.start_date_time || !otherSegment.end_date_time) continue;
      
      const otherStart = new Date(otherSegment.start_date_time);
      const otherEnd = new Date(otherSegment.end_date_time);
      
      if (isNaN(otherStart.getTime()) || isNaN(otherEnd.getTime())) continue;
      
      // Check if dates overlap
      // Overlap occurs if: start < otherEnd && end > otherStart
      if (start < otherEnd && end > otherStart) {
        return `Date range overlaps with Segment ${otherSegment.segment_number}`;
      }
    }
    
    return null;
  };

  const updateSegment = (index, field, value) => {
    const newSegments = [...segments];
    const segment = { ...newSegments[index], [field]: value };
    
    // Validate date ranges if updating dates
    if (field === 'start_date_time' || field === 'end_date_time') {
      const startDateTime = field === 'start_date_time' ? value : segment.start_date_time;
      const endDateTime = field === 'end_date_time' ? value : segment.end_date_time;
      
      const overlapError = checkDateOverlap(newSegments, index, startDateTime, endDateTime);
      if (overlapError) {
        alert(overlapError);
        return; // Don't update if there's an overlap
      }
    }
    
    newSegments[index] = segment;
    onSegmentsChange(newSegments);

    // Auto-calculate if dates and country are set
    if (field === 'start_date_time' || field === 'end_date_time' || field === 'country_code') {
      if (segment.start_date_time && segment.end_date_time && segment.country_code) {
        calculateSegmentCosts(index, segment);
      }
    }
  };

  const selectCountry = (index, country) => {
    // Update both country_name and country_code at once
    const newSegments = [...segments];
    newSegments[index] = {
      ...newSegments[index],
      country_name: country.name,
      country_code: country.code
    };
    onSegmentsChange(newSegments);
    
    // Clear suggestions immediately
    setCountrySuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[index];
      return newSuggestions;
    });
  };

  const calculateSegmentCosts = async (index, segment) => {
    try {
      setCalculating({ ...calculating, [index]: true });
      
      const response = await expensesAPI.calculateSegment({
        start_date_time: segment.start_date_time,
        end_date_time: segment.end_date_time,
        country_code: segment.country_code,
        country_name: segment.country_name
      });

      if (response.data.success && response.data.data) {
        const calculation = response.data.data;
        const newSegments = [...segments];
        newSegments[index] = {
          ...newSegments[index],
          rate_8h: calculation.rate_8h,
          rate_24h: calculation.rate_24h,
          hotel_rate: calculation.hotel_rate,
          multiplier_1: calculation.multiplier_1,
          multiplier_2: calculation.multiplier_2,
          total_segment: calculation.total_segment,
          rates_snapshot: calculation.rates_snapshot
        };
        onSegmentsChange(newSegments);
      } else {
        alert('Error calculating segment: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      logger.error('TripDurationTab', 'Error calculating segment costs:', error);
      alert('Error calculating segment: ' + (error.response?.data?.error || error.message));
    } finally {
      setCalculating({ ...calculating, [index]: false });
    }
  };

  const totalDailyRate = segments.reduce((sum, seg) => sum + (parseFloat(seg.total_segment) || 0), 0);

  // Format date-time for input (local datetime format)
  const formatDateTimeLocal = (dateTime) => {
    if (!dateTime) return '';
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      // Use local time, not UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      return '';
    }
  };

  const parseDateTimeLocal = (value) => {
    if (!value) return '';
    try {
      // Convert local datetime to ISO string
      // The datetime-local input gives us a local time string like "2025-01-15T14:30"
      // We need to interpret this as German time (Europe/Berlin) and convert to ISO
      const localDate = new Date(value);
      if (isNaN(localDate.getTime())) return '';
      
      // Return ISO string - this will be in UTC but represents the local time
      return localDate.toISOString();
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="trip-duration-tab">
      <div className="tab-header">
        <h2>Trip Duration</h2>
        <button className="add-segment-btn" onClick={addSegment} disabled={segments.length >= 10}>
          + Add Country
        </button>
      </div>

      {ratesDatabaseInfo && (
        <div className="rates-info-banner">
          <span>📊 Rates Database: {ratesDatabaseInfo.database_name} ({ratesDatabaseInfo.year})</span>
        </div>
      )}

      {segments.length === 0 ? (
        <div className="empty-state">
          <p>No segments added yet. Click "Add Country" to start.</p>
        </div>
      ) : (
        <div className="segments-list">
          {segments.map((segment, index) => (
            <div key={segment.id || index} className="segment-card">
              <div className="segment-header">
                <h3>Segment {segment.segment_number}</h3>
                {segments.length > 1 && (
                  <button
                    className="remove-segment-btn"
                    onClick={() => removeSegment(index)}
                    title="Remove segment"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="segment-fields">
                <div className="field-group country-field">
                  <label>Country</label>
                  <div className="country-input-wrapper">
                    <input
                      type="text"
                      value={segment.country_name || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateSegment(index, 'country_name', value);
                        
                        // Find exact match first
                        const exactMatch = countries.find(c => 
                          c.name.toLowerCase() === value.toLowerCase() ||
                          c.code.toLowerCase() === value.toLowerCase()
                        );
                        
                        if (exactMatch) {
                          updateSegment(index, 'country_code', exactMatch.code);
                          setCountrySuggestions({ ...countrySuggestions, [index]: [] });
                        } else if (value.length > 0) {
                          // Show suggestions
                          const suggestions = countries.filter(c =>
                            c.name.toLowerCase().includes(value.toLowerCase()) ||
                            c.code.toLowerCase().includes(value.toLowerCase())
                          ).slice(0, 8);
                          setCountrySuggestions({ ...countrySuggestions, [index]: suggestions });
                        } else {
                          setCountrySuggestions({ ...countrySuggestions, [index]: [] });
                        }
                      }}
                      onFocus={() => {
                        // Show all countries when focused
                        if (!segment.country_name && countries.length > 0) {
                          setCountrySuggestions({ ...countrySuggestions, [index]: countries.slice(0, 10) });
                        }
                      }}
                      onBlur={(e) => {
                        // Clear suggestions after a delay to allow click events
                        // But check if we're clicking on a suggestion
                        const relatedTarget = e.relatedTarget || document.activeElement;
                        const isClickingSuggestion = relatedTarget && relatedTarget.closest('.country-suggestions');
                        
                        if (!isClickingSuggestion) {
                          setTimeout(() => {
                            setCountrySuggestions(prev => {
                              const newSuggestions = { ...prev };
                              delete newSuggestions[index];
                              return newSuggestions;
                            });
                          }, 200);
                        }
                      }}
                      placeholder="Type or select country name"
                      autoComplete="off"
                    />
                    {countrySuggestions[index] && countrySuggestions[index].length > 0 && (
                      <div className="country-suggestions">
                        {countrySuggestions[index].map(country => (
                          <div
                            key={country.code}
                            className="suggestion-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              selectCountry(index, country);
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <span className="country-name">{country.name}</span>
                            <span className="country-code">({country.code})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="field-group">
                  <label>Start Date/Time</label>
                  <input
                    type="datetime-local"
                    key={`start-${segment.id}-${segment.start_date_time || 'empty'}`}
                    value={formatDateTimeLocal(segment.start_date_time)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const isoDateTime = parseDateTimeLocal(value);
                        if (isoDateTime) {
                          updateSegment(index, 'start_date_time', isoDateTime);
                        }
                      } else {
                        updateSegment(index, 'start_date_time', '');
                      }
                    }}
                    onInput={(e) => {
                      // Handle input events (fires on every keystroke and calendar selection)
                      const value = e.target.value;
                      if (value) {
                        const isoDateTime = parseDateTimeLocal(value);
                        if (isoDateTime) {
                          updateSegment(index, 'start_date_time', isoDateTime);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure value is saved even if onChange/onInput didn't fire
                      const value = e.target.value;
                      if (value) {
                        const isoDateTime = parseDateTimeLocal(value);
                        if (isoDateTime) {
                          const currentFormatted = formatDateTimeLocal(segment.start_date_time);
                          // Only update if the value actually changed
                          if (currentFormatted !== value) {
                            updateSegment(index, 'start_date_time', isoDateTime);
                          }
                        }
                      } else if (segment.start_date_time) {
                        // Clear if value is empty
                        updateSegment(index, 'start_date_time', '');
                      }
                    }}
                  />
                </div>

                <div className="field-group">
                  <label>End Date/Time</label>
                  <input
                    type="datetime-local"
                    key={`end-${segment.id}-${segment.end_date_time || 'empty'}`}
                    value={formatDateTimeLocal(segment.end_date_time)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const isoDateTime = parseDateTimeLocal(value);
                        if (isoDateTime) {
                          updateSegment(index, 'end_date_time', isoDateTime);
                        }
                      } else {
                        updateSegment(index, 'end_date_time', '');
                      }
                    }}
                    onInput={(e) => {
                      // Handle input events (fires on every keystroke and calendar selection)
                      const value = e.target.value;
                      if (value) {
                        const isoDateTime = parseDateTimeLocal(value);
                        if (isoDateTime) {
                          updateSegment(index, 'end_date_time', isoDateTime);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure value is saved even if onChange/onInput didn't fire
                      const value = e.target.value;
                      if (value) {
                        const isoDateTime = parseDateTimeLocal(value);
                        if (isoDateTime) {
                          const currentFormatted = formatDateTimeLocal(segment.end_date_time);
                          // Only update if the value actually changed
                          if (currentFormatted !== value) {
                            updateSegment(index, 'end_date_time', isoDateTime);
                          }
                        }
                      } else if (segment.end_date_time) {
                        // Clear if value is empty
                        updateSegment(index, 'end_date_time', '');
                      }
                    }}
                  />
                </div>

                <div className="field-group">
                  <button
                    className="calculate-btn"
                    onClick={() => calculateSegmentCosts(index, segment)}
                    disabled={!segment.start_date_time || !segment.end_date_time || !segment.country_code || calculating[index]}
                  >
                    {calculating[index] ? 'Calculating...' : 'Calculate'}
                  </button>
                </div>
              </div>

              {(segment.rate_8h > 0 || segment.rate_24h > 0) && (
                <div className="segment-calculation">
                  <div className="calculation-breakdown">
                    <div className="rate-line">
                      <span>Rate 1 (24h):</span>
                      <span>€{parseFloat(segment.rate_24h || 0).toFixed(2)}</span>
                      <span>×</span>
                      <span>{segment.multiplier_1 || 0}</span>
                      <span>=</span>
                      <span>€{((parseFloat(segment.rate_24h) || 0) * (segment.multiplier_1 || 0)).toFixed(2)}</span>
                    </div>
                    <div className="rate-line">
                      <span>Rate 2 (8h):</span>
                      <span>€{parseFloat(segment.rate_8h || 0).toFixed(2)}</span>
                      <span>×</span>
                      <span>{segment.multiplier_2 || 0}</span>
                      <span>=</span>
                      <span>€{((parseFloat(segment.rate_8h) || 0) * (segment.multiplier_2 || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="segment-total">
                    <strong>Total: €{parseFloat(segment.total_segment || 0).toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="total-section">
        <div className="total-card">
          <h3>Total Daily Rate</h3>
          <div className="total-amount">€{totalDailyRate.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default TripDurationTab;
