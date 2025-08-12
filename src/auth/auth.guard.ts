import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigurationService } from "../config/configuration.service";

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly configurationService: ConfigurationService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn("Missing Authorization header");
      throw new UnauthorizedException("Missing Authorization header");
    }

    if (!authHeader.startsWith("Bearer ")) {
      this.logger.warn("Invalid Authorization header format");
      throw new UnauthorizedException("Invalid Authorization header format");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!this.configurationService.isValidApiKey(token)) {
      this.logger.warn(
        `Invalid API key attempted: ${token.substring(0, 8)}...`,
      );
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }
}
