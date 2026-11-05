import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockRefreshTokenModel: any;

  beforeEach(() => {
    mockUsersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('test.jwt.token'),
      verifyAsync: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret-min-32-chars-key-string-1234';
        if (key === 'JWT_REFRESH_SECRET') return 'test-jwt-refresh-secret-min-32-chars-1234';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'test-jwt-refresh-secret-min-32-chars-1234';
        throw new Error(`Missing config: ${key}`);
      }),
    };

    mockRefreshTokenModel = {
      create: vi.fn().mockResolvedValue({}),
      findOne: vi.fn(),
      updateOne: vi.fn(),
      updateMany: vi.fn(),
    };

    authService = new AuthService(
      mockUsersService,
      mockJwtService,
      mockConfigService,
      mockRefreshTokenModel,
    );
  });

  describe('Password Hashing with Argon2id', () => {
    it('should hash a password with Argon2id and verify it successfully', async () => {
      const password = 'SecureP@ssw0rd123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');

      const isValid = await authService.verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword(hash, 'WrongPassword!');
      expect(isInvalid).toBe(false);
    });
  });

  describe('signup', () => {
    it('should hash password, create user, generate dual tokens, and return user DTO', async () => {
      const signUpDto = {
        email: 'test@example.com',
        name: 'Test Candidate',
        password: 'ValidP@ssw0rd1',
      };

      const createdUserDto = {
        id: '663e27a94b8efc001c34a1b2',
        email: 'test@example.com',
        name: 'Test Candidate',
      };

      mockUsersService.create.mockResolvedValue(createdUserDto);

      const result = await authService.signup(signUpDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: signUpDto.email,
          name: signUpDto.name,
          passwordHash: expect.stringContaining('$argon2id$'),
        }),
      );

      expect(result).toEqual({
        user: createdUserDto,
        accessToken: 'test.jwt.token',
        refreshToken: 'test.jwt.token',
      });
    });
  });

  describe('signin', () => {
    it('should authenticate valid credentials, generate dual tokens, and return result', async () => {
      const password = 'ValidP@ssw0rd1';
      const hash = await authService.hashPassword(password);

      mockUsersService.findByEmail.mockResolvedValue({
        _id: '663e27a94b8efc001c34a1b2',
        email: 'test@example.com',
        name: 'Test Candidate',
        passwordHash: hash,
      });

      const result = await authService.signin({
        email: 'test@example.com',
        password,
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('test.jwt.token');
      expect(result.refreshToken).toBe('test.jwt.token');
    });

    it('should reject invalid credentials with UnauthorizedException', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.signin({
          email: 'unknown@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should still run an Argon2 verify for unknown emails to equalize timing', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const verifySpy = vi.spyOn(authService, 'verifyPassword');

      await expect(
        authService.signin({ email: 'unknown@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(verifySpy).toHaveBeenCalledTimes(1);
      expect(verifySpy.mock.calls[0][0]).toContain('$argon2id$');
    });
  });

  describe('Sliding Sessions & Reuse Detection', () => {
    it('should throw UnauthorizedException when refresh token reuse is detected', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: '663e27a94b8efc001c34a1b2',
        email: 'test@example.com',
        familyId: 'family-123',
        jti: 'jti-123',
      });

      // Simulate an already revoked token being re-submitted
      mockRefreshTokenModel.findOne.mockResolvedValue({
        familyId: 'family-123',
        isRevoked: true,
      });

      await expect(
        authService.refreshSession('reused.refresh.token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
        { familyId: 'family-123' },
        { isRevoked: true },
      );
    });
  });
});
