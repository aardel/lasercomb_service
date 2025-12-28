/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay (default: 300ms)
 * @param {boolean} immediate - If true, trigger on leading edge instead of trailing
 * @returns {Function} - Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => searchCustomers(query), 300);
 * debouncedSearch('test'); // Will only execute after 300ms of inactivity
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout;

    return function executedFunction(...args) {
        const context = this;

        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 *
 * @param {Function} func - The function to throttle
 * @param {number} limit - The number of milliseconds to limit calls (default: 300ms)
 * @returns {Function} - Throttled function
 *
 * @example
 * const throttledScroll = throttle(() => handleScroll(), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(func, limit = 300) {
    let inThrottle;

    return function executedFunction(...args) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Creates a debounced async function that cancels previous pending calls
 * Returns a promise that resolves with the result
 *
 * @param {Function} func - The async function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} - Debounced async function
 *
 * @example
 * const debouncedAsyncSearch = debounceAsync(async (q) => await api.search(q), 300);
 * const results = await debouncedAsyncSearch('test');
 */
export function debounceAsync(func, wait = 300) {
    let timeout;
    let pendingPromise = null;

    return function executedFunction(...args) {
        return new Promise((resolve, reject) => {
            const context = this;

            // Cancel previous pending call
            if (pendingPromise) {
                pendingPromise.reject(new Error('Debounced - newer call in progress'));
            }

            clearTimeout(timeout);

            pendingPromise = { resolve, reject };

            timeout = setTimeout(async () => {
                try {
                    const result = await func.apply(context, args);
                    if (pendingPromise) {
                        pendingPromise.resolve(result);
                        pendingPromise = null;
                    }
                } catch (error) {
                    if (pendingPromise) {
                        pendingPromise.reject(error);
                        pendingPromise = null;
                    }
                }
            }, wait);
        });
    };
}

export default debounce;
