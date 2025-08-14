import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from './configuration.service';
import { ModelDiscoveryService } from './model-discovery.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let configService: ConfigService;
  let modelDiscoveryService: ModelDiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ModelDiscoveryService,
          useValue: {
            getDiscoveredBackend: jest.fn(),
            getAllDiscoveredBackends: jest.fn(),
            getAllDiscoveredModelNames: jest.fn(),
            getDiscoveryStats: jest.fn(),
            forceDiscovery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configService = module.get<ConfigService>(ConfigService);
    modelDiscoveryService = module.get<ModelDiscoveryService>(ModelDiscoveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseBackends', () => {
    it('should parse valid BACKENDS configuration', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('qwen3-8b:localhost:8001,gpt-4:localhost:8002')
        .mockReturnValueOnce('test-key-1,test-key-2');
      
      (configService.get as jest.Mock) = mockGet;

      // Re-instantiate to trigger parsing
      const testService = new ConfigurationService(configService, modelDiscoveryService);

      const backend = testService.getBackendForModel('qwen3-8b');
      expect(backend).toEqual({
        modelName: 'qwen3-8b',
        host: 'localhost',
        port: 8001,
        baseUrl: 'http://localhost:8001/v1',
      });
    });

    it('should handle empty BACKENDS configuration', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('')
        .mockReturnValueOnce('test-key');
      
      (configService.get as jest.Mock) = mockGet;
      (modelDiscoveryService.getAllDiscoveredBackends as jest.Mock).mockReturnValue([]);
      
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const backends = testService.getAllBackends();
      
      expect(backends).toEqual([]);
    });

    it('should skip invalid BACKENDS entries', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('valid:localhost:8001,invalid:entry,another:localhost:8002')
        .mockReturnValueOnce('test-key');
      
      (configService.get as jest.Mock) = mockGet;
      (modelDiscoveryService.getAllDiscoveredModelNames as jest.Mock).mockReturnValue([]);
      
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const modelNames = testService.getAllModelNames();
      
      expect(modelNames).toContain('valid');
      expect(modelNames).toContain('another');
      expect(modelNames).not.toContain('invalid');
    });
  });

  describe('getBackendForModel', () => {
    beforeEach(() => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('static:localhost:8001');
      
      (configService.get as jest.Mock) = mockGet;
    });

    it('should return static backend when available', () => {
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const backend = testService.getBackendForModel('static');
      
      expect(backend).toEqual({
        modelName: 'static',
        host: 'localhost',
        port: 8001,
        baseUrl: 'http://localhost:8001/v1',
      });
    });

    it('should fallback to discovered backend when static not found', () => {
      const discoveredBackend = {
        modelName: 'discovered',
        host: 'remote',
        port: 8002,
        baseUrl: 'http://remote:8002/v1',
      };
      
      (modelDiscoveryService.getDiscoveredBackend as jest.Mock).mockReturnValue(discoveredBackend);
      
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const backend = testService.getBackendForModel('discovered');
      
      expect(backend).toEqual(discoveredBackend);
    });

    it('should return undefined when model not found', () => {
      (modelDiscoveryService.getDiscoveredBackend as jest.Mock).mockReturnValue(undefined);
      
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const backend = testService.getBackendForModel('nonexistent');
      
      expect(backend).toBeUndefined();
    });
  });

  describe('getAllBackends', () => {
    it('should combine static and discovered backends with static precedence', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('static:localhost:8001')
        .mockReturnValueOnce('test-key');
      
      (configService.get as jest.Mock) = mockGet;

      const discoveredBackends = [
        {
          modelName: 'discovered',
          host: 'remote',
          port: 8002,
          baseUrl: 'http://remote:8002/v1',
        },
        {
          modelName: 'static', // Should be overridden by static config
          host: 'different',
          port: 8003,
          baseUrl: 'http://different:8003/v1',
        },
      ];
      
      (modelDiscoveryService.getAllDiscoveredBackends as jest.Mock).mockReturnValue(discoveredBackends);
      
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const backends = testService.getAllBackends();
      
      expect(backends).toHaveLength(2);
      expect(backends.find(b => b.modelName === 'static')?.host).toBe('localhost');
      expect(backends.find(b => b.modelName === 'discovered')?.host).toBe('remote');
    });
  });

  describe('configuration getters', () => {
    it('should return correct port', () => {
      (configService.get as jest.Mock).mockReturnValue(3000);
      expect(service.getPort()).toBe(3000);
    });

    it('should return default port when not configured', () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);
      expect(service.getPort()).toBe(undefined); // ConfigurationService doesn't provide default port
    });

    it('should return CORS enabled status', () => {
      (configService.get as jest.Mock).mockReturnValue(true);
      expect(service.isCorsEnabled()).toBe(true);
    });

    it('should return CORS origin', () => {
      (configService.get as jest.Mock).mockReturnValue('https://example.com');
      expect(service.getCorsOrigin()).toBe('https://example.com');
    });
  });

  describe('getDiscoveryStats', () => {
    it('should return combined discovery statistics', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('static1:localhost:8001,static2:localhost:8002')
        .mockReturnValueOnce('test-key');
      
      (configService.get as jest.Mock) = mockGet;

      const mockStats = {
        serversConfigured: 2,
        modelsDiscovered: 3,
        lastDiscovery: new Date(),
      };
      
      (modelDiscoveryService.getDiscoveryStats as jest.Mock).mockReturnValue(mockStats);
      (modelDiscoveryService.getAllDiscoveredModelNames as jest.Mock).mockReturnValue(['disc1', 'disc2', 'disc3']);
      
      const testService = new ConfigurationService(configService, modelDiscoveryService);
      const stats = testService.getDiscoveryStats();
      
      expect(stats).toEqual({
        staticBackends: 2,
        discoveredBackends: 3,
        totalModels: 5, // 2 static + 3 discovered
        discoveryEnabled: true,
      });
    });
  });

  describe('forceModelDiscovery', () => {
    it('should call force discovery on model discovery service', async () => {
      await service.forceModelDiscovery();
      expect(modelDiscoveryService.forceDiscovery).toHaveBeenCalled();
    });
  });
});
