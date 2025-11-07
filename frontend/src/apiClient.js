import axios from 'axios';

// Central place to configure the backend base URL
// Priority: window.__BACKEND_URL__ (runtime) -> env -> auto-detect based on hostname
const runtimeUrl = typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined;
const envUrl = process.env.REACT_APP_API_URL || process.env.APP_BACKEND_URL || process.env.VITE_BACKEND_URL;

// Auto-detect: if NOT localhost, use Render backend; otherwise localhost
const defaultUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://mahadeo-eye-hospital-management-system.onrender.com'  // Render backend URL
  : 'http://localhost:8000';

export const API_BASE_URL = (runtimeUrl || envUrl || defaultUrl).replace(/\/$/, '');

// Debug log for production troubleshooting
console.log('API_BASE_URL configured as:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Attach token from localStorage automatically if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;


