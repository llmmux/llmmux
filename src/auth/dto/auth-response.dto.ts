import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'admin', description: 'Username' })
  username: string;

  @ApiProperty({ example: 'admin@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: 'ADMIN', description: 'User role name' })
  role: string;

  @ApiProperty({ example: true, description: 'Whether user is active' })
  isActive: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Last login date', nullable: true })
  lastLogin: Date | null;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'User information' })
  user: UserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' })
  token: string;
}

export class ProfileResponseDto extends UserResponseDto {
  @ApiProperty({ example: ['api_key:use', 'profile:read'], description: 'User permissions' })
  permissions: string[];
}
