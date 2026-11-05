import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Senior Decision: Multi-Layered CSRF Defense for Cookie-Based Auth.
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) pass automatically.
 * 2. Origin / Referer Validation: State-changing requests must originate from allowed origins.
 * 3. Custom Anti-CSRF Header Enforcement: 'X-Requested-With' or 'X-CSRF-Protection'.
 *    Browsers never emit custom headers cross-origin without CORS preflight verification.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  constructor(private readonly configService: ConfigService) {}

  private toOrigin(value: string): string | null {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.safeMethods.has(request.method)) {
      return true;
    }

    // 1. Origin / Referer verification (exact origin match, never a prefix match)
    const allowedOrigins = new Set(
      [
        this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8080',
      ].map((url) => this.toOrigin(url)),
    );

    const rawOrigin = request.headers['origin'] || request.headers['referer'];

    if (rawOrigin) {
      const requestOrigin = this.toOrigin(rawOrigin);
      if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
        throw new ForbiddenException(
          'Potential CSRF attack detected. Untrusted request origin.',
        );
      }
    }

    // 2. Custom header validation
    const requestedWith = request.headers['x-requested-with'];
    const csrfProtection = request.headers['x-csrf-protection'];

    if (requestedWith === 'XMLHttpRequest' || csrfProtection === '1') {
      return true;
    }

    throw new ForbiddenException(
      'Potential CSRF attack detected. Missing required custom request headers.',
    );
  }
}
