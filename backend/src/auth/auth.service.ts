import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service.js';
import { SignUpDto } from './dto/signup.dto.js';
import { SignInDto } from './dto/signin.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema.js';

export interface AuthResult {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  familyId: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  /**
   * Hashes plain text password using memory-hard Argon2id (OWASP recommendation).
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  private dummyHashPromise?: Promise<string>;

  private getDummyHash(): Promise<string> {
    this.dummyHashPromise ??= this.hashPassword(uuidv4());
    return this.dummyHashPromise;
  }

  /**
   * Verifies plain text password against stored Argon2id hash.
   */
  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  /**
   * Generates a short-lived signed JWT access token (15m).
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
    });
  }

  /**
   * Generates a 7-day refresh token, persists its SHA-256 hash in MongoDB,
   * and tracks session family ID for reuse detection.
   */
  async generateRefreshToken(
    userId: string,
    email: string,
    familyId?: string,
  ): Promise<{ refreshToken: string; familyId: string }> {
    const sessionFamilyId = familyId || uuidv4();
    const tokenId = uuidv4();

    const payload: RefreshTokenPayload = {
      sub: userId,
      email,
      familyId: sessionFamilyId,
      jti: tokenId,
    };

    const refreshSecret = this.configService.getOrThrow<string>(
      'JWT_REFRESH_SECRET',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash,
      familyId: sessionFamilyId,
      isRevoked: false,
      expiresAt,
    });

    return { refreshToken, familyId: sessionFamilyId };
  }

  /**
   * Registers a new user, hashes password with Argon2id, generates access & refresh tokens,
   * and returns safe UserResponseDto with dual tokens.
   */
  async signup(signUpDto: SignUpDto): Promise<AuthResult> {
    const passwordHash = await this.hashPassword(signUpDto.password);

    const user = await this.usersService.create({
      email: signUpDto.email,
      name: signUpDto.name,
      passwordHash,
    });

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const { refreshToken } = await this.generateRefreshToken(
      user.id,
      user.email,
    );

    this.logger.log(`New user registered and authenticated: ${user.email}`);
    return { user, accessToken, refreshToken };
  }

  /**
   * Authenticates user credentials and returns safe UserResponseDto with dual tokens.
   */
  async signin(signInDto: SignInDto): Promise<AuthResult> {
    const userDoc = await this.usersService.findByEmail(
      signInDto.email,
      true, // explicitly project hidden passwordHash
    );

    if (!userDoc || !userDoc.passwordHash) {
      // Burn the same Argon2 cost as a real verify so response time doesn't reveal whether the email exists
      await this.verifyPassword(await this.getDummyHash(), signInDto.password);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await this.verifyPassword(
      userDoc.passwordHash,
      signInDto.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user = new UserResponseDto({
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      createdAt: (userDoc as any).createdAt,
      updatedAt: (userDoc as any).updatedAt,
    });

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const { refreshToken } = await this.generateRefreshToken(
      user.id,
      user.email,
    );

    this.logger.log(`User successfully signed in: ${user.email}`);
    return { user, accessToken, refreshToken };
  }

  /**
   * Sliding Sessions: Rotates the refresh token and issues a fresh 15-minute access token.
   * Includes Reuse Detection: If a previously revoked refresh token is presented,
   * ALL tokens in the session family are revoked immediately.
   */
  async refreshSession(rawRefreshToken: string): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const refreshSecret = this.configService.getOrThrow<string>(
      'JWT_REFRESH_SECRET',
    );

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        rawRefreshToken,
        { secret: refreshSecret },
      );
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token. Please sign in again.',
      );
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const storedToken = await this.refreshTokenModel.findOne({ tokenHash });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not recognized.');
    }

    // Reuse Attack Detection
    if (storedToken.isRevoked) {
      this.logger.warn(
        `SECURITY ALERT: Refresh token reuse detected for family ${storedToken.familyId}. Revoking all tokens in session family.`,
      );
      // Revoke all tokens belonging to this family
      await this.refreshTokenModel.updateMany(
        { familyId: storedToken.familyId },
        { isRevoked: true },
      );
      throw new UnauthorizedException(
        'Security Alert: Refresh token reuse detected. All sessions have been revoked for your safety.',
      );
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      storedToken.isRevoked = true;
      await storedToken.save();
      throw new UnauthorizedException(
        'Refresh token has expired. Please sign in again.',
      );
    }

    // Revoke current token (rotation)
    storedToken.isRevoked = true;
    await storedToken.save();

    // Fetch active user profile
    const user = await this.usersService.findById(payload.sub);

    // Issue new access token and rotated refresh token within SAME family
    const newAccessToken = await this.generateAccessToken(user.id, user.email);
    const { refreshToken: newRefreshToken } = await this.generateRefreshToken(
      user.id,
      user.email,
      storedToken.familyId,
    );

    this.logger.log(`Session successfully refreshed for user: ${user.email}`);
    return {
      user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Invalidates active session refresh token on logout.
   */
  async logoutSession(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawRefreshToken)
        .digest('hex');

      await this.refreshTokenModel.updateOne(
        { tokenHash },
        { isRevoked: true },
      );
    } catch (err) {
      this.logger.warn('Error revoking refresh token on logout:', err);
    }
  }
}
