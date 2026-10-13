import axios from 'axios';

const rawEnvUrl = (import.meta.env.VITE_API_URL || '').trim();
// Strip trailing slash and trailing '/api' to obtain the pure server origin
const cleanOrigin = rawEnvUrl
  ? rawEnvUrl.replace(/\/api\/?$/i, '').replace(/\/$/, '')
  : '';

export const BACKEND_ORIGIN = cleanOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
export const API_BASE_URL = cleanOrigin ? `${cleanOrigin}/api` : '/api';

/**
 * Centralised Axios instance.
 *
 * Base URL:
 *   - Dev  → Vite dev-server proxies /api → http://localhost:5000 (no CORS issue)
 *   - Prod → set VITE_API_URL to your deployed backend origin
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45_000,
});

// ─── Request interceptor: attach JWT if present ───────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('opssync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: surface clean error messages ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;
