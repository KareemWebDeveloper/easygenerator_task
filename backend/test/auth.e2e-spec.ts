import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { ProblemDetailsExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Auth Lifecycle & Concurrency (e2e)', () => {
  let app: INestApplication;
  const uniqueTimestamp = Date.now();
  const testUser = {
    email: `candidate.${uniqueTimestamp}@easygenerator.com`,
    name: 'Senior Candidate',
    password: 'SecureP@ssw0rd123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('easygenerator-cookie-signer-secret-2026'));
    app.useGlobalFilters(new ProblemDetailsExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should reject requests missing custom CSRF header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser);

      expect(res.status).toBe(403);
      expect(res.body.title).toContain('Forbidden');
    });

    it('should successfully register user, set HttpOnly cookie, and return UserResponseDto', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testUser.email.toLowerCase());
      expect(res.body.name).toBe(testUser.name);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');

      // Verify Set-Cookie headers are issued for both access and refresh tokens
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('eg_auth_token='))).toBe(true);
      expect(cookies.some((c: string) => c.includes('eg_refresh_token='))).toBe(true);
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should return 409 Conflict when attempting to register the same email again', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          email: testUser.email.toUpperCase(), // Test case-insensitive normalization
          name: 'Duplicate Candidate',
          password: 'SecureP@ssw0rd123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.title).toBe('Conflict');
      expect(res.body.detail).toContain('already exists');
    });
  });

  describe('Senior Decision: Concurrency Testing on Signup Race Conditions', () => {
    it('should handle simultaneous identical signup requests without duplicate accounts', async () => {
      const concurrentEmail = `race.${Date.now()}@easygenerator.com`;
      const payload = {
        email: concurrentEmail,
        name: 'Concurrent Runner',
        password: 'SecureP@ssw0rd123!',
      };

      // Fire two identical signup requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/auth/signup')
          .set('X-Requested-With', 'XMLHttpRequest')
          .send(payload),
        request(app.getHttpServer())
          .post('/api/v1/auth/signup')
          .set('X-Requested-With', 'XMLHttpRequest')
          .send(payload),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request must succeed (201) and the duplicate must be rejected with 409 Conflict
      expect(statuses).toEqual([201, 409]);
    });
  });

  describe('POST /api/v1/auth/signin & GET /api/v1/auth/me', () => {
    let authCookie: string;

    it('should reject invalid credentials with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          email: testUser.email,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.title).toBe('Unauthorized');
    });

    it('should authenticate valid credentials and capture HttpOnly cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email.toLowerCase());

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      authCookie = cookies[0];
    });

    it('should allow access to protected /api/v1/auth/me using the cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email.toLowerCase());
      expect(res.body.name).toBe(testUser.name);
    });

    it('should deny access to protected /api/v1/auth/me without cookie', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear the authentication cookie upon logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully.');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      // Cookie should be cleared (empty value or expired date)
      expect(cookies.some((c: string) => c.includes('eg_auth_token=;'))).toBe(true);
    });
  });
});
