import React, { useState, useEffect } from 'react';
import { ratesAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import './DailyRatesTab.css';

const DailyRatesTab = () => {
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRates();
  }, []);

  useEffect(() => {
    filterRates();
  }, [searchQuery, rates]);

  const loadRates = async () => {
    try {
      setLoading(true);
      const response = await ratesAPI.getAll();
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // Group by country (prefer country-level rates over city-specific)
        const countryMap = new Map();
        response.data.data.forEach(rate => {
          if (!rate.country_code) return; // Skip invalid entries
          
          const key = rate.country_code;
          if (!countryMap.has(key) || !rate.city_name) {
            countryMap.set(key, {
              country_code: rate.country_code,
              country_name: rate.country_name || rate.country_code,
              city_name: rate.city_name || null,
              rate_24h: parseFloat(rate.daily_allowance_24h) || 0,
              rate_8h: parseFloat(rate.daily_allowance_8h) || 0
            });
          }
        });
        const sortedRates = Array.from(countryMap.values()).sort((a, b) => 
          (a.country_name || '').localeCompare(b.country_name || '')
        );
        setRates(sortedRates);
        setFilteredRates(sortedRates);
      } else {
        logger.warn('DailyRatesTab', 'No rates data received');
        setRates([]);
        setFilteredRates([]);
      }
    } catch (error) {
      logger.error('DailyRatesTab', 'Error loading rates:', error);
      setRates([]);
      setFilteredRates([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRates = () => {
    if (!searchQuery.trim()) {
      setFilteredRates(rates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rates.filter(rate =>
      rate.country_name.toLowerCase().includes(query) ||
      rate.country_code.toLowerCase().includes(query) ||
      (rate.city_name && rate.city_name.toLowerCase().includes(query))
    );
    setFilteredRates(filtered);
  };

  return (
    <div className="daily-rates-tab">
      <div className="tab-header">
        <h2>Daily Rates</h2>
      </div>

      <div className="search-section">
        <div className="search-wrapper">
          <label>Find</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by country name or code..."
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading rates...</p>
        </div>
      ) : (
        <div className="rates-table-container">
          <table className="rates-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>
                  <div className="rate-header">
                    <span>Full Day Rate €</span>
                    <span className="sub-header">Rate1</span>
                  </div>
                </th>
                <th>
                  <div className="rate-header">
                    <span>Partial Day Rate €</span>
                    <span className="sub-header">Rate2</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan="3" className="no-results">
                    {searchQuery ? 'No countries found matching your search.' : 'No rates available.'}
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate, index) => (
                  <tr key={`${rate.country_code}-${index}`}>
                    <td>
                      {rate.country_name}
                      {rate.city_name && <span className="city-name"> / {rate.city_name}</span>}
                    </td>
                    <td className="rate-value">€{Number(rate.rate_24h || 0).toFixed(2)}</td>
                    <td className="rate-value">€{Number(rate.rate_8h || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DailyRatesTab;
