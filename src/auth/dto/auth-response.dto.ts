import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: ['ADMIN', 'USER'], description: 'User role names', type: [String] })
  roles: string[];

  @ApiProperty({ example: true, description: 'Whether user is active' })
  isActive: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Last login date', nullable: true })
  lastLogin: Date | null;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Access token' })
  access_token: string;

  @ApiProperty({ type: UserResponseDto, description: 'User information' })
  user: UserResponseDto;
}

export class ProfileResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'John', description: 'First name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: ['ADMIN', 'USER'], description: 'User role names', type: [String] })
  roles: string[];

  @ApiProperty({ example: ['users:read', 'users:write'], description: 'User permissions', type: [String] })
  permissions: string[];

  @ApiProperty({ example: true, description: 'Whether user is active' })
  isActive: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Last login date', nullable: true })
  lastLogin: Date | null;
}
