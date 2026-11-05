import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '663e27a94b8efc001c34a1b2',
    description: 'Unique user identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'engineer@easygenerator.com',
    description: 'User email address (normalized)',
  })
  email!: string;

  @ApiProperty({
    example: 'Senior Engineer',
    description: 'Full display name of the user',
  })
  name!: string;

  @ApiProperty({
    example: '2026-11-05T01:30:00.000Z',
    description: 'Account creation timestamp',
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2026-11-05T01:30:00.000Z',
    description: 'Account update timestamp',
  })
  updatedAt?: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
