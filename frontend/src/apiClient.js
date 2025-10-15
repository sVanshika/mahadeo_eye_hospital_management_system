import axios from 'axios';

// Central place to configure the backend base URL
// Priority: window.__BACKEND_URL__ (for runtime override) -> env -> default prod URL
const runtimeUrl = typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined;
const envUrl = process.env.APP_BACKEND_URL || process.env.VITE_BACKEND_URL;
export const API_BASE_URL = (runtimeUrl || envUrl || 'https://mahadeo-eye-hospital-management-system.onrender.com').replace(/\/$/, '');

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


