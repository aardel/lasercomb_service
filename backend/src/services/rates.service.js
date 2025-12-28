const pool = require('../config/database');

/**
 * Database-backed Travel Rates Service
 * Reads rates from PostgreSQL country_travel_rates table
 * Source: BMF ARVVwV 2025 (German Federal Ministry of Finance)
 * NO FALLBACKS - throws error if rate not found
 */
class RatesService {
    constructor() {
        this.initialized = false;
        this.ratesCache = new Map(); // Cache for performance
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheTime = 0;

        // ISO 3166-1 alpha-2 (2-letter) to alpha-3 (3-letter) conversion
        this.alpha2ToAlpha3 = {
            'PL': 'POL', 'DE': 'DEU', 'IT': 'ITA', 'FR': 'FRA', 'ES': 'ESP',
            'PT': 'PRT', 'GB': 'GBR', 'IE': 'IRL', 'NL': 'NLD', 'BE': 'BEL',
            'AT': 'AUT', 'CH': 'CHE', 'CZ': 'CZE', 'SK': 'SVK', 'HU': 'HUN',
            'RO': 'ROU', 'BG': 'BGR', 'GR': 'GRC', 'HR': 'HRV', 'SI': 'SVN',
            'DK': 'DNK', 'SE': 'SWE', 'NO': 'NOR', 'FI': 'FIN', 'EE': 'EST',
            'LV': 'LVA', 'LT': 'LTU', 'MT': 'MLT', 'CY': 'CYP', 'LU': 'LUX',
            'US': 'USA', 'CA': 'CAN', 'MX': 'MEX', 'BR': 'BRA', 'AR': 'ARG',
            'CN': 'CHN', 'JP': 'JPN', 'KR': 'KOR', 'IN': 'IND', 'AU': 'AUS',
            'NZ': 'NZL', 'ZA': 'ZAF', 'EG': 'EGY', 'TR': 'TUR', 'IL': 'ISR',
            'AE': 'ARE', 'SA': 'SAU', 'RU': 'RUS', 'UA': 'UKR', 'BY': 'BLR'
        };

        // Common country name variations
        this.countryNameAliases = {
            'usa': 'united states',
            'uk': 'united kingdom',
            'uae': 'united arab emirates',
            'holland': 'netherlands',
            'deutschland': 'germany',
            'italien': 'italy',
            'spanien': 'spain',
            'frankreich': 'france',
            'schweiz': 'switzerland',
            'österreich': 'austria',
            'polen': 'poland',
            'tschechien': 'czech republic',
            'grossbritannien': 'united kingdom',
            'großbritannien': 'united kingdom'
        };
    }

    /**
     * Initialize the service (load initial cache)
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this._refreshCache();
            this.initialized = true;
            console.log(`[RatesService] Initialized with ${this.ratesCache.size} rates from database`);
        } catch (error) {
            console.error('[RatesService] Failed to initialize:', error.message);
            throw error;
        }
    }

    /**
     * Refresh the rates cache from database
     */
    async _refreshCache() {
        const now = Date.now();
        if (this.ratesCache.size > 0 && (now - this.lastCacheTime) < this.cacheExpiry) {
            return; // Cache still valid
        }

        const result = await pool.query(`
            SELECT 
                id, country_code, country_name, city_name,
                daily_allowance_8h, daily_allowance_24h, hotel_rate_max,
                agent_fee, company_fee, additional_fee_percent,
                currency, effective_from, source_reference
            FROM country_travel_rates
            WHERE (effective_until IS NULL OR effective_until >= CURRENT_DATE)
            AND effective_from <= CURRENT_DATE
            ORDER BY country_name, city_name NULLS FIRST
        `);

        this.ratesCache.clear();

        for (const row of result.rows) {
            const countryKey = row.country_name.toLowerCase().trim();
            const cityKey = row.city_name ? row.city_name.toLowerCase().trim() : null;
            const cacheKey = cityKey ? `${countryKey}:${cityKey}` : countryKey;
            
            this.ratesCache.set(cacheKey, row);
            
            // Also index by country code
            const codeKey = cityKey 
                ? `code:${row.country_code}:${cityKey}` 
                : `code:${row.country_code}`;
            this.ratesCache.set(codeKey, row);
        }

        this.lastCacheTime = now;
    }

    /**
     * Get rate by country name
     * @param {string} countryName - Country name (case-insensitive)
     * @param {string} cityName - Optional city name for city-specific rates
     * @returns {Object} Rate data
     */
    async getRateByCountryName(countryName, cityName = null) {
        await this._refreshCache();

        let normalizedCountry = countryName.toLowerCase().trim();
        
        // Check for aliases
        if (this.countryNameAliases[normalizedCountry]) {
            normalizedCountry = this.countryNameAliases[normalizedCountry];
        }

        const normalizedCity = cityName ? cityName.toLowerCase().trim() : null;

        // Try city-specific rate first
        if (normalizedCity) {
            const cityKey = `${normalizedCountry}:${normalizedCity}`;
            if (this.ratesCache.has(cityKey)) {
                return this._formatRate(this.ratesCache.get(cityKey));
            }
        }

        // Fall back to country-level rate
        if (this.ratesCache.has(normalizedCountry)) {
            return this._formatRate(this.ratesCache.get(normalizedCountry));
        }

        // Not found - throw error (no fallbacks)
        throw new Error(
            `Travel rates not found for country: "${countryName}"${cityName ? ` (city: ${cityName})` : ''}. ` +
            `Please check the Daily Rates settings or add this country.`
        );
    }

    /**
     * Get rate by country code (ISO 3166-1 alpha-3 or alpha-2)
     * @param {string} countryCode - 2 or 3-letter country code
     * @param {string} cityName - Optional city name for city-specific rates
     * @returns {Object} Rate data
     */
    async getRateByCountryCode(countryCode, cityName = null) {
        await this._refreshCache();

        // Convert 2-letter code to 3-letter if needed
        let lookupCode = countryCode.toUpperCase();
        if (lookupCode.length === 2) {
            lookupCode = this.alpha2ToAlpha3[lookupCode] || lookupCode;
        }

        const normalizedCity = cityName ? cityName.toLowerCase().trim() : null;

        // Try city-specific rate first
        if (normalizedCity) {
            const cityKey = `code:${lookupCode}:${normalizedCity}`;
            if (this.ratesCache.has(cityKey)) {
                return this._formatRate(this.ratesCache.get(cityKey));
            }
        }

        // Fall back to country-level rate
        const codeKey = `code:${lookupCode}`;
        if (this.ratesCache.has(codeKey)) {
            return this._formatRate(this.ratesCache.get(codeKey));
        }

        // Not found - throw error (no fallbacks)
        throw new Error(
            `Travel rates not found for country code: "${countryCode}"${cityName ? ` (city: ${cityName})` : ''}. ` +
            `Please check the Daily Rates settings or add this country.`
        );
    }

    /**
     * Format database row into consistent rate structure
     */
    _formatRate(row) {
        return {
            country_name: row.country_name,
            country_code: row.country_code,
            city_name: row.city_name || null,
            daily_allowance_24h: parseFloat(row.daily_allowance_24h) || 0,
            daily_allowance_8h: parseFloat(row.daily_allowance_8h) || 0,
            hotel_allowance: parseFloat(row.hotel_rate_max) || 0,
            hotel_rate: parseFloat(row.hotel_rate_max) || 0, // Alias for compatibility
            // Trip Fees (per trip, not per day)
            agent_fee: parseFloat(row.agent_fee) || 0,
            company_fee: parseFloat(row.company_fee) || 0,
            additional_fee_percent: parseFloat(row.additional_fee_percent) || 0,
            // Standard company rates (from billing settings, hardcoded as fallback)
            mileage_rate: 0.30,
            travel_hour_rate: 98.00,
            work_hour_rate: 132.00,
            // Metadata
            source: 'database',
            source_reference: row.source_reference || 'BMF ARVVwV 2025',
            effective_date: row.effective_from,
            currency: row.currency || 'EUR'
        };
    }

    /**
     * Get all countries with their rates (for debugging/admin)
     */
    async getAllCountries() {
        await this._refreshCache();
        
        const countries = new Set();
        for (const [key, value] of this.ratesCache) {
            if (!key.startsWith('code:')) {
                countries.add(value.country_name);
            }
        }
        return Array.from(countries).sort();
    }

    /**
     * Check if a country exists in the rates
     */
    async hasCountry(countryName) {
        await this._refreshCache();
        
        let normalizedCountry = countryName.toLowerCase().trim();
        if (this.countryNameAliases[normalizedCountry]) {
            normalizedCountry = this.countryNameAliases[normalizedCountry];
        }
        
        return this.ratesCache.has(normalizedCountry);
    }

    /**
     * Clear the cache (force reload on next request)
     */
    clearCache() {
        this.ratesCache.clear();
        this.lastCacheTime = 0;
        console.log('[RatesService] Cache cleared');
    }
}

// Singleton instance
const ratesService = new RatesService();

module.exports = ratesService;
