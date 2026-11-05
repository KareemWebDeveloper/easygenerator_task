import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service.js';
import { SignUpDto } from './dto/signup.dto.js';
import { SignInDto } from './dto/signin.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getAccessCookieOptions(): { cookieName: string; options: CookieOptions } {
    const cookieName =
      this.configService.get<string>('AUTH_COOKIE_NAME') || 'eg_auth_token';
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const maxAgeMs = 15 * 60 * 1000; // 15 minutes

    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/',
    };

    return { cookieName, options };
  }

  private getRefreshCookieOptions(): { cookieName: string; options: CookieOptions } {
    const cookieName =
      this.configService.get<string>('REFRESH_COOKIE_NAME') || 'eg_refresh_token';
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/api/v1/auth',
    };

    return { cookieName, options };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const access = this.getAccessCookieOptions();
    const refresh = this.getRefreshCookieOptions();

    res.cookie(access.cookieName, accessToken, access.options);
    res.cookie(refresh.cookieName, refreshToken, refresh.options);
  }

  private clearAuthCookies(res: Response): void {
    const access = this.getAccessCookieOptions();
    const refresh = this.getRefreshCookieOptions();

    res.clearCookie(access.cookieName, {
      httpOnly: access.options.httpOnly,
      secure: access.options.secure,
      sameSite: access.options.sameSite,
      path: access.options.path,
    });

    res.clearCookie(refresh.cookieName, {
      httpOnly: refresh.options.httpOnly,
      secure: refresh.options.secure,
      sameSite: refresh.options.sameSite,
      path: refresh.options.path,
    });
  }

  @Post('signup')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates account, automatically establishes session via HttpOnly cookies (access & refresh), and returns safe UserResponseDto.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered and authenticated successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Account with email already exists.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed.',
  })
  async signup(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, accessToken, refreshToken } =
      await this.authService.signup(signUpDto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Post('signin')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in to existing account',
    description:
      'Verifies credentials, sets short-lived access and long-lived refresh HttpOnly cookies, and returns safe UserResponseDto.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password.',
  })
  async signin(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, accessToken, refreshToken } =
      await this.authService.signin(signInDto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return user;
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sliding Session Token Refresh',
    description:
      'Reads HttpOnly refresh cookie, performs refresh token rotation, emits fresh access/refresh cookies, and returns active user profile.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session refreshed successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or revoked refresh token.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const refreshCookieName =
      this.configService.get<string>('REFRESH_COOKIE_NAME') || 'eg_refresh_token';
    const rawRefreshToken = req.cookies?.[refreshCookieName];

    try {
      const { user, accessToken, refreshToken } =
        await this.authService.refreshSession(rawRefreshToken);

      this.setAuthCookies(res, accessToken, refreshToken);
      return user;
    } catch (err) {
      this.clearAuthCookies(res);
      throw err;
    }
  }

  @Post('logout')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out and clear session',
    description: 'Clears access and refresh HttpOnly cookies and invalidates refresh token session.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully.',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshCookieName =
      this.configService.get<string>('REFRESH_COOKIE_NAME') || 'eg_refresh_token';
    const rawRefreshToken = req.cookies?.[refreshCookieName];

    await this.authService.logoutSession(rawRefreshToken);
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('eg_auth_token')
  @ApiOperation({
    summary: 'Get current authenticated user',
    description:
      'Protected endpoint returning the active session profile from HttpOnly cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active session user data.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Valid auth cookie required.',
  })
  getMe(@CurrentUser() user: UserResponseDto): UserResponseDto {
    return user;
  }
}
