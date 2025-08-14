import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModelDiscoveryService } from './model-discovery.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ModelDiscoveryService', () => {
  let service: ModelDiscoveryService;
  let configService: ConfigService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ModelDiscoveryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ModelDiscoveryService>(ModelDiscoveryService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    service.stopPeriodicDiscovery();
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseVllmServers', () => {
    it('should parse VLLM_SERVERS configuration', () => {
      const mockGet = jest.fn().mockReturnValue('localhost:8000,remote:8001');
      (configService.get as jest.Mock) = mockGet;

      const _testService = new ModelDiscoveryService(configService);
      expect(mockGet).toHaveBeenCalledWith('VLLM_SERVERS', '');
    });

    it('should fallback to BACKENDS configuration when VLLM_SERVERS empty', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('') // VLLM_SERVERS
        .mockReturnValueOnce('model1:localhost:8000,model2:remote:8001'); // BACKENDS

      (configService.get as jest.Mock) = mockGet;

      const _testService = new ModelDiscoveryService(configService);
      expect(mockGet).toHaveBeenCalledWith('VLLM_SERVERS', '');
      expect(mockGet).toHaveBeenCalledWith('BACKENDS', '');
    });

    it('should handle invalid server configurations', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('valid:8000,invalid,another:8001')
        .mockReturnValueOnce('');

      (configService.get as jest.Mock) = mockGet;

      // Should not throw
      expect(() => new ModelDiscoveryService(configService)).not.toThrow();
    });
  });

  describe('discoverModelsFromServer', () => {
    it('should discover models from a healthy server', async () => {
      const mockModels = {
        data: {
          data: [
            { id: 'model1', object: 'model', created: 123456, owned_by: 'vllm' },
            { id: 'model2', object: 'model', created: 123457, owned_by: 'vllm' },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockModels);

      const mockGet = jest.fn().mockReturnValue('localhost:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      await testService.forceDiscovery();

      const discoveredModels = testService.getAllDiscoveredModelNames();
      expect(discoveredModels).toContain('model1');
      expect(discoveredModels).toContain('model2');
    });

    it('should handle server connection errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const mockGet = jest.fn().mockReturnValue('unreachable:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      
      // Should not throw
      await expect(testService.forceDiscovery()).resolves.not.toThrow();
      
      const discoveredModels = testService.getAllDiscoveredModelNames();
      expect(discoveredModels).toEqual([]);
    });

    it('should handle invalid response format', async () => {
      const invalidResponse = { data: { invalid: 'format' } };
      mockedAxios.get.mockResolvedValueOnce(invalidResponse);

      const mockGet = jest.fn().mockReturnValue('localhost:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      await testService.forceDiscovery();

      const discoveredModels = testService.getAllDiscoveredModelNames();
      expect(discoveredModels).toEqual([]);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.name = 'ETIMEDOUT';
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const mockGet = jest.fn().mockReturnValue('slow:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      
      await expect(testService.forceDiscovery()).resolves.not.toThrow();
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      const mockModels = {
        data: {
          data: [
            { id: 'test-model', object: 'model', created: 123456, owned_by: 'vllm' },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockModels);

      const mockGet = jest.fn().mockReturnValue('localhost:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      await testService.forceDiscovery();
      service = testService;
    });

    it('should return discovered backend for model', () => {
      const backend = service.getDiscoveredBackend('test-model');
      expect(backend).toEqual({
        modelName: 'test-model',
        host: 'localhost',
        port: 8000,
        baseUrl: 'http://localhost:8000/v1',
      });
    });

    it('should return undefined for non-existent model', () => {
      const backend = service.getDiscoveredBackend('non-existent');
      expect(backend).toBeUndefined();
    });

    it('should return all discovered backends', () => {
      const backends = service.getAllDiscoveredBackends();
      expect(backends).toHaveLength(1);
      expect(backends[0].modelName).toBe('test-model');
    });

    it('should return all discovered model names', () => {
      const modelNames = service.getAllDiscoveredModelNames();
      expect(modelNames).toEqual(['test-model']);
    });
  });

  describe('getDiscoveryStats', () => {
    it('should return discovery statistics', () => {
      const mockGet = jest.fn().mockReturnValue('server1:8000,server2:8001');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      const stats = testService.getDiscoveryStats();

      expect(stats.serversConfigured).toBe(2);
      expect(stats.modelsDiscovered).toBe(0);
      expect(stats.lastDiscovery).toBeInstanceOf(Date);
    });
  });

  describe('periodic discovery', () => {
    it('should start and stop periodic discovery', () => {
      const mockGet = jest.fn().mockReturnValue('localhost:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      
      // Should start periodic discovery if servers configured
      expect(() => testService.stopPeriodicDiscovery()).not.toThrow();
    });

    it('should not start periodic discovery when no servers configured', () => {
      const mockGet = jest.fn().mockReturnValue('');
      (configService.get as jest.Mock) = mockGet;

      // Should not throw when no servers configured
      expect(() => new ModelDiscoveryService(configService)).not.toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('should trigger initial discovery when servers are configured', async () => {
      const mockModels = {
        data: {
          data: [{ id: 'initial-model', object: 'model', created: 123456, owned_by: 'vllm' }],
        },
      };

      mockedAxios.get.mockResolvedValue(mockModels);

      const mockGet = jest.fn().mockReturnValue('localhost:8000');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      await testService.onModuleInit();

      const models = testService.getAllDiscoveredModelNames();
      expect(models).toContain('initial-model');
    });

    it('should not crash when no servers configured', async () => {
      const mockGet = jest.fn().mockReturnValue('');
      (configService.get as jest.Mock) = mockGet;

      const testService = new ModelDiscoveryService(configService);
      
      await expect(testService.onModuleInit()).resolves.not.toThrow();
    });
  });
});
