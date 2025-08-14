import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiKeyService } from "./api-key.service";

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Validate API key using database-managed keys only
    const isValid = await this.apiKeyService.isValidApiKey(token);
    if (!isValid) {
      this.logger.warn(
        `Invalid API key attempted: ${token.substring(0, 8)}...`,
      );
      throw new UnauthorizedException("Invalid API key");
    }

    // Record API key usage
    await this.apiKeyService.recordKeyUsage(token);

    // Store the API key in request for later use
    request.apiKey = token;

    // Check model access if this is a model-specific request
    const model = this.extractModelFromRequest(request);
    if (model) {
      const hasAccess = await this.apiKeyService.hasModelAccess(token, model);
      if (!hasAccess) {
        this.logger.warn(
          `API key ${token.substring(0, 8)}... denied access to model: ${model}`
        );
        throw new ForbiddenException(`Access denied to model: ${model}`);
      }
    }

    return true;
  }

  private extractModelFromRequest(request: any): string | null {
    // Extract model from request body (chat completions, completions)
    if (request.body?.model) {
      return request.body.model;
    }

    // Extract model from URL path (e.g., /v1/models/{model})
    const modelMatch = request.url.match(/\/v1\/models\/([^/?]+)/);
    if (modelMatch) {
      return modelMatch[1];
    }

    return null;
  }
}
