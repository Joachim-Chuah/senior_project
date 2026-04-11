/**
 * Validate ticker symbol
 * @param {string} ticker - Ticker symbol to validate
 * @returns {object} { isValid: boolean, error: string }
 */
export const validateTicker = (ticker) => {
  if (!ticker || ticker.trim().length === 0) {
    return { isValid: false, error: 'Ticker symbol is required' };
  }

  const trimmed = ticker.trim().toUpperCase();

  // Check length (typically 1-5 characters for US stocks)
  if (trimmed.length < 1 || trimmed.length > 10) {
    return { isValid: false, error: 'Ticker must be 1-10 characters' };
  }

  // Check for valid characters (letters, numbers, dots, hyphens)
  if (!/^[A-Z0-9.-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Ticker can only contain letters, numbers, dots, and hyphens' };
  }

  return { isValid: true, ticker: trimmed };
};

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
