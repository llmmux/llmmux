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
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  createdById?: number;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleIds?: number[]; // Array of role IDs for multiple roles
}

export interface LoginDto {
  email: string;  // Email-only authentication
  password: string;
}

export interface UserWithRoles extends UserType {
  userRoles: Array<{
    id: number;
    roleId: number;
    isActive: boolean;
    assignedAt: Date;
    expiresAt?: Date;
    role: RoleType;
  }>;
}

export interface LoginResult {
  access_token: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[]; // Array of role names
    isActive: boolean;
    createdAt: Date;
    lastLogin: Date | null;
  };
}

export interface JwtPayload {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  roleName: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: DatabaseService) {}

  async createUser(createUserDto: CreateUserDto, createdById?: number): Promise<UserWithRoles> {
    const { firstName, lastName, email, password, roleIds = [1] } = createUserDto; // Default to USER role (id: 1)

    // Check if user already exists
    const existingUser = await (this.prisma as any).user.findFirst({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate roles exist
    const roles = await (this.prisma as any).role.findMany({
      where: { id: { in: roleIds } }
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await (this.prisma as any).user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        createdById
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      }
    });

    // Assign roles to user
    for (const roleId of roleIds) {
      await (this.prisma as any).userRole.create({
        data: {
          userId: user.id,
          roleId,
          assignedBy: createdById,
          isActive: true
        }
      });
    }

    // Fetch user with roles
    const userWithRoles = await this.getUserById(user.id);

    // Log user creation
    await this.logUserAction({
      userId: user.id,
      actionBy: createdById,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id.toString(),
      newValues: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: roles.map(r => r.name)
      }
    });

    return userWithRoles!;
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const { email, password } = loginDto;

    // Find user with roles
    const user = await (this.prisma as any).user.findUnique({
      where: { email },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      }
    });

    if (!user || !user.isActive) {
      // Log failed login attempt
      await this.logUserAction({
        userId: user?.id || 0,
        action: 'LOGIN_FAILED',
        success: false,
        errorMessage: `Invalid credentials for email: ${email}`
      });
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

    return { access_token: token, user: this.sanitizeUserResponse(user) };
  }

  // Sanitize user data for API responses - removes sensitive fields
  private sanitizeUserResponse(user: UserWithRoles): any {
    const { password: _password, createdById: _createdById, updatedAt: _updatedAt, ...sanitizedUser } = user;
    return {
      ...sanitizedUser,
      roles: user.userRoles
        .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()))
        .map(ur => ur.role.name)
    };
  }

  // Sanitize user data for profile responses - includes permissions
  private sanitizeUserProfile(user: UserWithRoles): any {
    const { password: _password, createdById: _createdById, updatedAt: _updatedAt, ...sanitizedUser } = user;
    const activeRoles = user.userRoles
      .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()));
    
    const allPermissions = new Set<string>();
    activeRoles.forEach(ur => {
      if (Array.isArray(ur.role.permissions)) {
        (ur.role.permissions as string[]).forEach(p => allPermissions.add(p));
      }
    });
    
    return {
      ...sanitizedUser,
      roles: activeRoles.map(ur => ur.role.name),
      permissions: Array.from(allPermissions)
    };
  }

  async validateToken(token: string): Promise<UserWithRoles> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
      
      const user = await (this.prisma as any).user.findUnique({
        where: { id: decoded.userId },
        include: {
          userRoles: {
            where: { isActive: true },
            include: { role: true }
          }
        }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  generateJwtToken(user: UserWithRoles): string {
    const activeRoles = user.userRoles
      .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()));
    
    const allPermissions = new Set<string>();
    activeRoles.forEach(ur => {
      if (Array.isArray(ur.role.permissions)) {
        (ur.role.permissions as string[]).forEach(p => allPermissions.add(p));
      }
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: activeRoles[0]?.roleId || 1, // Primary role for backward compatibility
      roleName: activeRoles[0]?.role.name || 'USER',
      permissions: Array.from(allPermissions)
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    return jwt.sign(payload, secret, { expiresIn: '24h' } as any);
  }

  async getUserById(id: number): Promise<UserWithRoles | null> {
    return (this.prisma as any).user.findUnique({
      where: { id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      }
    });
  }

  async getUserByEmail(email: string): Promise<UserWithRoles | null> {
    return (this.prisma as any).user.findUnique({
      where: { email },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      }
    });
  }

  async getUserProfileById(id: number): Promise<any> {
    const user = await this.getUserById(id);
    if (!user) {
      return null;
    }
    return this.sanitizeUserProfile(user);
  }

  async getAllUsers(): Promise<UserWithRoles[]> {
    return (this.prisma as any).user.findMany({
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllUsersSanitized(): Promise<any[]> {
    const users = await this.getAllUsers();
    return users.map(user => this.sanitizeUserResponse(user));
  }

  async updateUserRole(userId: number, newRoleId: number, updatedById: number): Promise<UserWithRoles> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newRole = await (this.prisma as any).role.findUnique({
      where: { id: newRoleId }
    });

    if (!newRole) {
      throw new NotFoundException('Role not found');
    }

    // Get current active roles for logging
    const oldRoles = user.userRoles.map(ur => ur.role.name);

    // Deactivate old user roles
    await (this.prisma as any).userRole.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    // Add new role
    await (this.prisma as any).userRole.create({
      data: {
        userId,
        roleId: newRoleId,
        assignedBy: updatedById,
        isActive: true
      }
    });

    const updatedUser = await this.getUserById(userId);

    // Log role change
    await this.logUserAction({
      userId: userId,
      actionBy: updatedById,
      action: 'ROLE_CHANGE',
      entityType: 'USER',
      entityId: userId.toString(),
      oldValues: { roles: oldRoles },
      newValues: { roles: [newRole.name] }
    });

    return updatedUser!;
  }

  async deactivateUser(userId: number, deactivatedById: number): Promise<UserWithRoles> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await (this.prisma as any).user.update({
      where: { id: userId },
      data: { isActive: false },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true }
        }
      }
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

  hasPermission(user: UserWithRoles, requiredPermission: string): boolean {
    const activeRoles = user.userRoles
      .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()));
    
    for (const userRole of activeRoles) {
      const permissions = Array.isArray(userRole.role.permissions) ? userRole.role.permissions as string[] : [];
      
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

  async canManageUser(managerUser: UserWithRoles, targetUserId: number): Promise<boolean> {
    const targetUser = await this.getUserById(targetUserId);
    if (!targetUser) {
      return false;
    }

    // Get highest role level for both users
    const managerRoles = managerUser.userRoles
      .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()));
    const targetRoles = targetUser.userRoles
      .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()));

    const managerMaxLevel = Math.max(...await Promise.all(
      managerRoles.map(ur => this.getRoleHierarchy(ur.role.name))
    ));
    
    const targetMaxLevel = Math.max(...await Promise.all(
      targetRoles.map(ur => this.getRoleHierarchy(ur.role.name))
    ));

    // Manager must have higher or equal role level to manage target user
    return managerMaxLevel >= targetMaxLevel;
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
