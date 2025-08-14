import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService, UserRole } from './user.service';

// Decorator to specify required roles
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('Missing Authorization header');
      throw new UnauthorizedException('Missing Authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn('Invalid Authorization header format');
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Validate JWT token and get user with role
      const user = await this.userService.validateToken(token);
      
      // Store user info in request
      request.user = user;

      // Check role requirements
      const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
      if (requiredRoles && requiredRoles.length > 0) {
        const userRoles = user.userRoles
          .filter(ur => ur.isActive && (!ur.expiresAt || ur.expiresAt > new Date()))
          .map(ur => ur.role.name as UserRole);
        
        const hasRequiredRole = requiredRoles.some(requiredRole => 
          userRoles.some(userRole => this.userService.hasRole(userRole, requiredRole))
        );

        if (!hasRequiredRole) {
          this.logger.warn(
            `User ${user.firstName} ${user.lastName} (${user.email}) with roles [${userRoles.join(', ')}] attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`
          );
          throw new ForbiddenException('Insufficient permissions');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.warn(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
