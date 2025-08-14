import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { ApiKeyService } from './api-key.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let apiKeyService: ApiKeyService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: ApiKeyService,
          useValue: {
            isValidApiKey: jest.fn(),
            recordKeyUsage: jest.fn(),
            hasModelAccess: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
  });

  afterEach(async () => {
    await module.close();
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
        url: '/v1/models/test-model',
        method: 'GET',
      };
      
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };
    });

    it('should allow access when API key is valid', async () => {
      jest.spyOn(apiKeyService, 'isValidApiKey').mockResolvedValue(true);
      jest.spyOn(apiKeyService, 'recordKeyUsage').mockResolvedValue();
      jest.spyOn(apiKeyService, 'hasModelAccess').mockResolvedValue(true);
      mockRequest.headers.authorization = 'Bearer valid-token';

      const result = await guard.canActivate(mockContext as ExecutionContext);

      expect(result).toBe(true);
      expect(apiKeyService.isValidApiKey).toHaveBeenCalledWith('valid-token');
      expect(apiKeyService.hasModelAccess).toHaveBeenCalledWith('valid-token', 'test-model');
    });

    it('should throw exception when no authorization header is present', async () => {
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Missing Authorization header');
    });

    it('should throw exception when authorization header does not start with Bearer', async () => {
      mockRequest.headers.authorization = 'Basic token123';

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Invalid Authorization header format');
    });

    it('should throw exception when API key is invalid', async () => {
      jest.spyOn(apiKeyService, 'isValidApiKey').mockResolvedValue(false);
      mockRequest.headers.authorization = 'Bearer invalid-token';

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Invalid API key');
    });

    it('should handle missing authorization header gracefully', async () => {
      delete mockRequest.headers.authorization;

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Missing Authorization header');
    });

    it('should handle empty authorization header', async () => {
      mockRequest.headers.authorization = '';

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Missing Authorization header');
    });

    it('should handle authorization header with only Bearer', async () => {
      mockRequest.headers.authorization = 'Bearer';

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Invalid Authorization header format');
    });

    it('should handle authorization header with Bearer and spaces', async () => {
      mockRequest.headers.authorization = 'Bearer   ';

      jest.spyOn(apiKeyService, 'isValidApiKey').mockResolvedValue(false);

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Invalid API key');
    });

    it('should extract token correctly from Bearer header', async () => {
      jest.spyOn(apiKeyService, 'isValidApiKey').mockResolvedValue(true);
      jest.spyOn(apiKeyService, 'recordKeyUsage').mockResolvedValue();
      jest.spyOn(apiKeyService, 'hasModelAccess').mockResolvedValue(true);
      mockRequest.headers.authorization = 'Bearer  valid-token  ';

      const result = await guard.canActivate(mockContext as ExecutionContext);

      expect(result).toBe(true);
      expect(apiKeyService.isValidApiKey).toHaveBeenCalledWith(' valid-token  ');
    });

    it('should handle case-sensitive Bearer keyword correctly', async () => {
      mockRequest.headers.authorization = 'bearer valid-token';

      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockContext as ExecutionContext))
        .rejects.toThrow('Invalid Authorization header format');
    });

    it('should validate token with api key service', async () => {
      jest.spyOn(apiKeyService, 'isValidApiKey').mockResolvedValue(true);
      jest.spyOn(apiKeyService, 'recordKeyUsage').mockResolvedValue();
      jest.spyOn(apiKeyService, 'hasModelAccess').mockResolvedValue(true);
      mockRequest.headers.authorization = 'Bearer test-key-123';

      const result = await guard.canActivate(mockContext as ExecutionContext);

      expect(result).toBe(true);
      expect(apiKeyService.isValidApiKey).toHaveBeenCalledWith('test-key-123');
      expect(apiKeyService.hasModelAccess).toHaveBeenCalledWith('test-key-123', 'test-model');
    });
  });
});
