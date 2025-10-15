/**
 * Safely parse API errors to ensure they're always strings
 * Prevents "Objects are not valid as a React child" errors
 */

export const parseErrorMessage = (error) => {
  // Handle axios error response
  if (error.response?.data) {
    const detail = error.response.data.detail;
    
    // String detail
    if (typeof detail === 'string') {
      return detail;
    }
    
    // Array of validation errors (FastAPI Pydantic validation)
    if (Array.isArray(detail)) {
      return detail.map(err => {
        if (typeof err === 'string') return err;
        const location = err.loc ? err.loc.join('.') : 'field';
        const message = err.msg || 'validation error';
        return `${location}: ${message}`;
      }).join(', ');
    }
    
    // Object detail
    if (detail && typeof detail === 'object') {
      try {
        return JSON.stringify(detail);
      } catch (e) {
        return 'An error occurred';
      }
    }
    
    // Fallback to entire data if detail doesn't exist
    if (typeof error.response.data === 'string') {
      return error.response.data;
    }
  }
  
  // Network error or other error types
  if (error.message) {
    return error.message;
  }
  
  // Final fallback
  return 'An unexpected error occurred';
};

export default parseErrorMessage;

