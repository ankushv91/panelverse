const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * A native fetch wrapper that automatically handles JWT authentication 
 * and standardizes JSON responses/errors for the FastAPI backend.
 *
 * @param {string} endpoint - The API endpoint to call (e.g., '/users/me')
 * @param {RequestInit} options - Standard fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} The JSON parsed response data
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If a JWT token exists in local storage, attach it to the Authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle standard HTTP errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // FastAPI often uses 'detail' for error messages
    const errorMessage = errorData.detail || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
