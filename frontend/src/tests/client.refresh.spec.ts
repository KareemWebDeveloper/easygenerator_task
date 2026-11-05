import { describe, it, expect } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { apiClient } from '../api/client';

function response(config: InternalAxiosRequestConfig, status: number, data: unknown = {}): AxiosResponse {
  return { data, status, statusText: String(status), headers: {}, config };
}

describe('apiClient sliding-session refresh', () => {
  it('shares a single /auth/refresh call across concurrent 401s', async () => {
    let refreshCalls = 0;
    let refreshed = false;

    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        refreshed = true;
        return response(config, 200);
      }
      if (!refreshed) {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response(config, 401));
      }
      return response(config, 200, { ok: true });
    };

    const results = await Promise.all([
      apiClient.get('/auth/me'),
      apiClient.get('/auth/me'),
      apiClient.get('/auth/me'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });
});
