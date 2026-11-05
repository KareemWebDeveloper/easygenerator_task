import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service.js';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const cookieName =
      configService.get<string>('AUTH_COOKIE_NAME') || 'eg_auth_token';

    super({
      jwtFromRequest: (req: Request) => {
        if (!req || !req.cookies) {
          return null;
        }
        return req.cookies[cookieName] || null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<UserResponseDto> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    try {
      const user = await this.usersService.findById(payload.sub);
      return user;
    } catch {
      throw new UnauthorizedException('User account no longer exists.');
    }
  }
}
