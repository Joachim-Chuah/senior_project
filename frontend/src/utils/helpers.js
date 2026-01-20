/**
 * Format timestamp to locale time string with timezone handling
 * @param {string} ts - ISO timestamp
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export const formatTime = (ts, options = { hour: '2-digit', minute: '2-digit', hour12: true }) => {
  if (!ts) return '';
  // If the timestamp doesn't end with Z or include timezone, append Z to force UTC parsing
  const date = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : `${ts}Z`);
  return date.toLocaleTimeString([], options);
};

/**
 * Format timestamp to locale time string for chart display
 * @param {string} ts - ISO timestamp
 * @returns {string} Formatted time string (HH:MM)
 */
export const formatChartTime = (ts) => {
  return formatTime(ts, { hour: '2-digit', minute: '2-digit' });
};

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
 * Calculate percentage safely (avoids division by zero)
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number} Percentage (0-100)
 */
export const safePercentage = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return (numerator / denominator) * 100;
};

/**
 * Format sentiment score for display
 * @param {number} score - Sentiment score (-1 to 1)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted score
 */
export const formatSentiment = (score, decimals = 2) => {
  if (score === null || score === undefined) return '0.00';
  return score.toFixed(decimals);
};

/**
 * Get sentiment color class based on score
 * @param {number} score - Sentiment score
 * @returns {string} Tailwind color classes
 */
export const getSentimentColor = (score) => {
  if (score > 0.1) return 'text-green-500';
  if (score < -0.1) return 'text-red-500';
  return 'text-gray-400';
};

/**
 * Get regime color classes
 * @param {string} regime - 'bullish', 'bearish', or 'neutral'
 * @returns {string} Tailwind color classes
 */
export const getRegimeColor = (regime) => {
  switch (regime?.toLowerCase()) {
    case 'bullish':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'bearish':
      return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    default:
      return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  }
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
