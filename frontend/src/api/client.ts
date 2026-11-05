import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiProblemDetails } from '../types/auth';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Precise CSRF Defense Header
  },
  timeout: 10000,
});

// Shared in-flight refresh: concurrent 401s must await ONE rotation. Parallel refreshes would
// replay an already-rotated token and trip the backend's reuse detection (revoking the family).
let refreshPromise: Promise<unknown> | null = null;

function refreshSession(): Promise<unknown> {
  if (!refreshPromise) {
    refreshPromise = apiClient.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Response interceptor to normalize error handling, extract correlation IDs, and handle sliding session auto-refreshes
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiProblemDetails>) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;
    const correlationId = error.response?.headers['x-correlation-id'];

    if (correlationId) {
      console.debug(`[API Error Trace] Correlation ID: ${correlationId}`);
    }

    // Auto-refresh sliding session on 401 Unauthorized if not already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/signin') &&
      !originalRequest.url?.includes('/auth/signup') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return apiClient(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);
