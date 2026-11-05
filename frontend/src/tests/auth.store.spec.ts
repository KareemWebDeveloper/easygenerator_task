import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useAuthStore (Pinia)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with tokenless state and null user', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isInitialized).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should restore session successfully when /auth/me returns user profile', async () => {
    const mockUser = {
      id: '123',
      email: 'test@easygenerator.com',
      name: 'Test Candidate',
    };
    (apiClient.get as any).mockResolvedValueOnce({ data: mockUser });

    const store = useAuthStore();
    const result = await store.restoreSession();

    expect(result).toBe(true);
    expect(store.user).toEqual(mockUser);
    expect(store.isAuthenticated).toBe(true);
    expect(store.isInitialized).toBe(true);
  });

  it('should handle unauthenticated session restoration gracefully without throwing', async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error('401 Unauthorized'));

    const store = useAuthStore();
    const result = await store.restoreSession();

    expect(result).toBe(false);
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.isInitialized).toBe(true);
  });

  it('should automatically authenticate upon successful signup without requiring signin', async () => {
    const mockUser = {
      id: '456',
      email: 'newuser@easygenerator.com',
      name: 'New User',
    };
    (apiClient.post as any).mockResolvedValueOnce({ data: mockUser });

    const store = useAuthStore();
    const user = await store.signup({
      email: 'newuser@easygenerator.com',
      name: 'New User',
      password: 'SecureP@ssw0rd123!',
    });

    expect(user).toEqual(mockUser);
    expect(store.user).toEqual(mockUser);
    expect(store.isAuthenticated).toBe(true);
  });

  it('should sign in user and update authentication state', async () => {
    const mockUser = {
      id: '789',
      email: 'existing@easygenerator.com',
      name: 'Existing User',
    };
    (apiClient.post as any).mockResolvedValueOnce({ data: mockUser });

    const store = useAuthStore();
    const user = await store.signin({
      email: 'existing@easygenerator.com',
      password: 'SecureP@ssw0rd123!',
    });

    expect(user).toEqual(mockUser);
    expect(store.isAuthenticated).toBe(true);
  });

  it('should clear user state upon logout', async () => {
    const store = useAuthStore();
    store.user = { id: '789', email: 'user@test.com', name: 'User' };
    (apiClient.post as any).mockResolvedValueOnce({ data: { message: 'Logged out' } });

    await store.logout();

    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });
});
