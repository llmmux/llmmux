import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { ConfigurationService } from '../config/configuration.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let configService: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: ConfigurationService,
          useValue: {
            isValidApiKey: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    configService = module.get<ConfigurationService>(ConfigurationService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: Partial<ExecutionContext>;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };
    });

    it('should allow access when API key is valid', () => {
      jest.spyOn(configService, 'isValidApiKey').mockReturnValue(true);
      mockRequest.headers.authorization = 'Bearer valid-token';

      const result = guard.canActivate(mockContext as ExecutionContext);

      expect(result).toBe(true);
      expect(configService.isValidApiKey).toHaveBeenCalledWith('valid-token');
    });

    it('should throw exception when no authorization header is present', () => {
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Missing Authorization header');
    });

    it('should throw exception when authorization header does not start with Bearer', () => {
      mockRequest.headers.authorization = 'Basic token123';

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Invalid Authorization header format');
    });

    it('should throw exception when API key is invalid', () => {
      jest.spyOn(configService, 'isValidApiKey').mockReturnValue(false);
      mockRequest.headers.authorization = 'Bearer invalid-token';

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Invalid API key');
    });

    it('should handle missing authorization header gracefully', () => {
      delete mockRequest.headers.authorization;

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Missing Authorization header');
    });

    it('should handle empty authorization header', () => {
      mockRequest.headers.authorization = '';

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Missing Authorization header');
    });

    it('should handle authorization header with only Bearer', () => {
      mockRequest.headers.authorization = 'Bearer';

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Invalid Authorization header format');
    });

    it('should handle authorization header with Bearer and spaces', () => {
      mockRequest.headers.authorization = 'Bearer   ';

      jest.spyOn(configService, 'isValidApiKey').mockReturnValue(false);

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Invalid API key');
    });

    it('should extract token correctly from Bearer header', () => {
      jest.spyOn(configService, 'isValidApiKey').mockReturnValue(true);
      mockRequest.headers.authorization = 'Bearer  valid-token  ';

      const result = guard.canActivate(mockContext as ExecutionContext);

      expect(result).toBe(true);
      expect(configService.isValidApiKey).toHaveBeenCalledWith(' valid-token  ');
    });

    it('should handle case-sensitive Bearer keyword correctly', () => {
      mockRequest.headers.authorization = 'bearer valid-token';

      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockContext as ExecutionContext))
        .toThrow('Invalid Authorization header format');
    });

    it('should validate token with configuration service', () => {
      jest.spyOn(configService, 'isValidApiKey').mockReturnValue(true);
      mockRequest.headers.authorization = 'Bearer test-key-123';

      const result = guard.canActivate(mockContext as ExecutionContext);

      expect(result).toBe(true);
      expect(configService.isValidApiKey).toHaveBeenCalledWith('test-key-123');
    });
  });
});
