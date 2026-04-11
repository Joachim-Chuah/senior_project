/**
 * Extract user-friendly error message from API error
 * @param {Error} error - Error object from API call
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;

    if (status === 404) {
      return 'Resource not found. Please check the ticker symbol.';
    }
    if (status === 429) {
      return 'Rate limit exceeded. Please try again in a few moments.';
    }
    if (status === 500) {
      return 'Server error. Please try again later.';
    }
    if (status === 503) {
      return 'Service temporarily unavailable. Please try again later.';
    }

    // Check if error has detail message
    if (data?.detail) {
      return typeof data.detail === 'string' ? data.detail : 'An error occurred';
    }
    if (data?.message) {
      return data.message;
    }

    return `Error: ${status}`;
  }

  if (error.request) {
    // Request made but no response
    return 'Unable to connect to the server. Please check your connection.';
  }

  // Something else happened
  return error.message || 'An unexpected error occurred';
};

