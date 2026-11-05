import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../api/client';
import type { User, SignUpPayload, SignInPayload, ApiProblemDetails } from '../types/auth';
import type { AxiosError } from 'axios';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref<boolean>(false);
  const isInitialized = ref<boolean>(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);

  function parseErrorMessage(err: unknown): string {
    const axiosError = err as AxiosError<ApiProblemDetails>;
    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail;
      return Array.isArray(detail) ? detail.join(', ') : detail;
    }
    if (axiosError.response?.data?.title) {
      return axiosError.response.data.title;
    }
    return axiosError.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Restores user session on page load by calling protected /auth/me.
   * Primary authentication uses HttpOnly cookies; no token is handled in JS.
   */
  async function restoreSession(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get<User>('/auth/me');
      user.value = response.data;
      return true;
    } catch {
      user.value = null;
      return false;
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  /**
   * Registers a new user. The backend automatically sets the HttpOnly cookie,
   * immediately authenticating the user without requiring a second sign-in step.
   */
  async function signup(payload: SignUpPayload): Promise<User> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.post<User>('/auth/signup', payload);
      user.value = response.data;
      return response.data;
    } catch (err) {
      const msg = parseErrorMessage(err);
      error.value = msg;
      throw new Error(msg);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Authenticates user credentials and stores user profile in memory.
   */
  async function signin(payload: SignInPayload): Promise<User> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.post<User>('/auth/signin', payload);
      user.value = response.data;
      return response.data;
    } catch (err) {
      const msg = parseErrorMessage(err);
      error.value = msg;
      throw new Error(msg);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logs out the user, clearing the backend HttpOnly cookie and local state.
   */
  async function logout(): Promise<void> {
    isLoading.value = true;
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request warning:', err);
    } finally {
      user.value = null;
      error.value = null;
      isLoading.value = false;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    user,
    isLoading,
    isInitialized,
    error,
    isAuthenticated,
    restoreSession,
    signup,
    signin,
    logout,
    clearError,
  };
});
