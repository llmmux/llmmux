import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Local type definitions to avoid Prisma import issues
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface RoleType {
  id: number;
  name: string;
  description?: string;
  permissions?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserType {
  id: number;
  username: string;
  email: string;
  password: string;
  roleId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  createdById?: number;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  roleId?: number;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface UserWithRole extends UserType {
  role: RoleType;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastLogin: Date | null;
  };
  token: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
  roleId: number;
  roleName: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: DatabaseService) {}

  async createUser(createUserDto: CreateUserDto, createdById?: number): Promise<UserWithRole> {
    const { username, email, password, roleId } = createUserDto;

    // Check if user already exists
    const existingUser = await (this.prisma as any).user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Validate role exists
    const role = await (this.prisma as any).role.findUnique({
      where: { id: roleId || 1 } // Default to USER role (id: 1)
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await (this.prisma as any).user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        roleId: roleId || 1,
        createdById
      },
      include: {
        role: true
      }
    });

    // Log user creation
    await this.logUserAction({
      userId: user.id,
      actionBy: createdById,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id.toString(),
      newValues: {
        username: user.username,
        email: user.email,
        role: role.name
      }
    });

    return user;
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { username, password } = loginDto;

    // Find user with role
    const user = await (this.prisma as any).user.findUnique({
      where: { username },
      include: { role: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await this.logUserAction({
        userId: user.id,
        action: 'LOGIN_FAILED',
        success: false,
        errorMessage: 'Invalid password'
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = this.generateJwtToken(user);

    // Log successful login
    await this.logUserAction({
      userId: user.id,
      action: 'LOGIN',
      success: true
    });

    return { user: this.sanitizeUserResponse(user), token };
  }

  // Sanitize user data for API responses - removes sensitive fields
  private sanitizeUserResponse(user: UserWithRole): any {
    const { password, createdById, updatedAt, roleId, ...sanitizedUser } = user;
    return {
      ...sanitizedUser,
      role: user.role.name
    };
  }

  // Sanitize user data for profile responses - includes permissions
  private sanitizeUserProfile(user: UserWithRole): any {
    const { password, createdById, updatedAt, roleId, ...sanitizedUser } = user;
    return {
      ...sanitizedUser,
      role: user.role.name,
      permissions: Array.isArray(user.role.permissions) ? user.role.permissions as string[] : []
    };
  }

  async validateToken(token: string): Promise<UserWithRole> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
      
      const user = await (this.prisma as any).user.findUnique({
        where: { id: decoded.userId },
        include: { role: true }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  generateJwtToken(user: UserWithRole): string {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
      permissions: Array.isArray(user.role.permissions) ? user.role.permissions as string[] : []
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    return jwt.sign(payload, secret, { expiresIn: '24h' } as any);
  }

  async getUserById(id: number): Promise<UserWithRole | null> {
    return (this.prisma as any).user.findUnique({
      where: { id },
      include: { role: true }
    });
  }

  async getUserProfileById(id: number): Promise<any> {
    const user = await this.getUserById(id);
    if (!user) {
      return null;
    }
    return this.sanitizeUserProfile(user);
  }

  async getUserByUsername(username: string): Promise<UserWithRole | null> {
    return (this.prisma as any).user.findUnique({
      where: { username },
      include: { role: true }
    });
  }

  async getAllUsers(): Promise<UserWithRole[]> {
    return (this.prisma as any).user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllUsersSanitized(): Promise<any[]> {
    const users = await this.getAllUsers();
    return users.map(user => this.sanitizeUserResponse(user));
  }

  async updateUserRole(userId: number, newRoleId: number, updatedById: number): Promise<UserWithRole> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newRole = await (this.prisma as any).role.findUnique({
      where: { id: newRoleId }
    });

    if (!newRole) {
      throw new NotFoundException('Role not found');
    }

    const oldRole = user.role;

    const updatedUser = await (this.prisma as any).user.update({
      where: { id: userId },
      data: { roleId: newRoleId },
      include: { role: true }
    });

    // Log role change
    await this.logUserAction({
      userId: userId,
      actionBy: updatedById,
      action: 'ROLE_CHANGE',
      entityType: 'USER',
      entityId: userId.toString(),
      oldValues: { role: oldRole.name },
      newValues: { role: newRole.name }
    });

    return updatedUser;
  }

  async deactivateUser(userId: number, deactivatedById: number): Promise<UserWithRole> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await (this.prisma as any).user.update({
      where: { id: userId },
      data: { isActive: false },
      include: { role: true }
    });

    // Log user deactivation
    await this.logUserAction({
      userId: userId,
      actionBy: deactivatedById,
      action: 'DEACTIVATE',
      entityType: 'USER',
      entityId: userId.toString(),
      oldValues: { isActive: true },
      newValues: { isActive: false }
    });

    return updatedUser;
  }

  hasPermission(user: UserWithRole, requiredPermission: string): boolean {
    const permissions = Array.isArray(user.role.permissions) ? user.role.permissions as string[] : [];
    
    // Check for exact permission match
    if (permissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions
    const permissionParts = requiredPermission.split(':');
    if (permissionParts.length === 2) {
      const [resource] = permissionParts;
      if (permissions.includes(`${resource}:*`)) {
        return true;
      }
    }

    // Check for global wildcard
    if (permissions.includes('*')) {
      return true;
    }

    return false;
  }

  async getRoleHierarchy(roleName: string): Promise<number> {
    const hierarchies = {
      'USER': 1,
      'ADMIN': 2,
      'SUPER_ADMIN': 3
    };
    return hierarchies[roleName] || 0;
  }

  async canManageUser(managerUser: UserWithRole, targetUserId: number): Promise<boolean> {
    const targetUser = await this.getUserById(targetUserId);
    if (!targetUser) {
      return false;
    }

    const managerLevel = await this.getRoleHierarchy(managerUser.role.name);
    const targetLevel = await this.getRoleHierarchy(targetUser.role.name);

    // Manager must have higher or equal role level to manage target user
    return managerLevel >= targetLevel;
  }

  // Legacy method for backward compatibility
  hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.USER]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPER_ADMIN]: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  private async logUserAction(logData: {
    userId: number;
    actionBy?: number;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      // Temporarily use any to bypass TypeScript issues
      const userLogModel = (this.prisma as any).userLog;
      if (userLogModel) {
        await userLogModel.create({
          data: {
            userId: logData.userId,
            actionBy: logData.actionBy,
            action: logData.action,
            entityType: logData.entityType,
            entityId: logData.entityId,
            oldValues: logData.oldValues,
            newValues: logData.newValues,
            ipAddress: logData.ipAddress || '127.0.0.1',
            userAgent: logData.userAgent || 'System',
            success: logData.success ?? true,
            errorMessage: logData.errorMessage
          }
        });
      }
    } catch (error) {
      console.error('Failed to log user action:', error);
      // Don't throw error for logging failures
    }
  }
}
