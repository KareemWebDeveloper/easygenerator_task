import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { UserResponseDto } from './dto/user-response.dto.js';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Creates a new user with normalized email.
   * Catches MongoDB duplicate key error 11000 and maps it to ConflictException (HTTP 409).
   */
  async create(data: CreateUserData): Promise<UserResponseDto> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedName = data.name.trim();

    try {
      const createdUser = await this.userModel.create({
        email: normalizedEmail,
        name: normalizedName,
        passwordHash: data.passwordHash,
      });

      return new UserResponseDto({
        id: createdUser._id.toString(),
        email: createdUser.email,
        name: createdUser.name,
        createdAt: (createdUser as any).createdAt,
        updatedAt: (createdUser as any).updatedAt,
      });
    } catch (error: any) {
      // MongoDB duplicate key error code is 11000
      if (error?.code === 11000) {
        throw new ConflictException(
          'An account with this email address already exists.',
        );
      }
      throw new InternalServerErrorException(
        'An error occurred while creating the user account.',
      );
    }
  }

  /**
   * Finds a user by normalized email, optionally projecting the hidden passwordHash.
   */
  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const query = this.userModel.findOne({ email: normalizedEmail });

    if (includePassword) {
      query.select('+passwordHash');
    }

    return query.exec();
  }

  /**
   * Finds a user by ID and returns safe public response DTO.
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return new UserResponseDto({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    });
  }
}
