import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SignUpDto {
  @ApiProperty({
    example: 'alex.developer@easygenerator.com',
    description: 'Valid email address of the user',
  })
  @Transform(trim)
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @ApiProperty({
    example: 'Alex Developer',
    description: 'Name of the user (minimum 3 characters)',
  })
  @Transform(trim)
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name is required.' })
  @MinLength(3, { message: 'Name must be at least 3 characters long.' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long.' })
  name!: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd!',
    description:
      'Password must be 8-128 characters long and contain at least one letter, one number, and one special character.',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(128, { message: 'Password must be at most 128 characters long.' })
  @Matches(/[a-zA-Z]/, {
    message: 'Password must contain at least one letter.',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain at least one number.',
  })
  @Matches(/[^a-zA-Z0-9]/, {
    message: 'Password must contain at least one special character.',
  })
  password!: string;
}
