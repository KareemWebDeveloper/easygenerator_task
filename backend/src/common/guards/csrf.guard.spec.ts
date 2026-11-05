import { describe, it, expect } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard.js';

function contextFor(method: string, headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard({
    get: (_key: string, fallback: string) => fallback,
  } as any);

  it('allows safe methods without checks', () => {
    expect(guard.canActivate(contextFor('GET', {}))).toBe(true);
  });

  it('allows trusted origin with custom header', () => {
    const ctx = contextFor('POST', {
      origin: 'http://localhost:5173',
      'x-requested-with': 'XMLHttpRequest',
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('accepts a trusted Referer with a path', () => {
    const ctx = contextFor('POST', {
      referer: 'http://localhost:5173/signin',
      'x-requested-with': 'XMLHttpRequest',
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects look-alike origins that only share a prefix with a trusted one', () => {
    const ctx = contextFor('POST', {
      origin: 'http://localhost:5173.evil.com',
      'x-requested-with': 'XMLHttpRequest',
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects malformed origins', () => {
    const ctx = contextFor('POST', { origin: 'not a url', 'x-requested-with': 'XMLHttpRequest' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects mutating requests without the custom header', () => {
    const ctx = contextFor('POST', { origin: 'http://localhost:5173' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
