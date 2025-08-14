import { Controller, Post, Get, Body, UseGuards, Request, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserService, UserRole, CreateUserDto, LoginDto } from './user.service';
import { JwtAuthGuard, Roles } from './jwt-auth.guard';
import { LoginResponseDto, UserResponseDto, ProfileResponseDto } from './dto/auth-response.dto';

class CreateUserRequestDto implements CreateUserDto {
  @ApiProperty({ description: 'Username (3-50 characters)', example: 'admin' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ description: 'Email address', example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password (minimum 8 characters)', example: 'securepassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ 
    description: 'User role', 
    enum: UserRole, 
    example: UserRole.ADMIN,
    required: false 
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

class LoginRequestDto implements LoginDto {
  @ApiProperty({ description: 'Username', example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password', example: 'securepassword123' })
  @IsString()
  password: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JwtAuth')
  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Create a new user account (Admin/Super Admin only)'
  })
  @ApiBody({ type: CreateUserRequestDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    type: UserResponseDto
  })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async register(@Body(ValidationPipe) createUserDto: CreateUserRequestDto): Promise<UserResponseDto> {
    const user = await this.userService.createUser(createUserDto);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user and receive JWT token'
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body(ValidationPipe) loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.userService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JwtAuth')
  @ApiOperation({ 
    summary: 'Get user profile',
    description: 'Get current user profile information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    type: ProfileResponseDto
  })
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.userService.getUserProfileById(req.user.id);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JwtAuth')
  @ApiOperation({ 
    summary: 'List all users',
    description: 'Get list of all users (Admin/Super Admin only)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    type: [UserResponseDto]
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getAllUsers(): Promise<UserResponseDto[]> {
    return this.userService.getAllUsersSanitized();
  }
}
