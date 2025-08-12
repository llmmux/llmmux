import { Test, TestingModule } from '@nestjs/testing';
import { ModelsController } from './models.controller';
import { ConfigurationService } from '../config/configuration.service';

describe('ModelsController', () => {
  let controller: ModelsController;
  let configurationService: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelsController],
      providers: [
        {
          provide: ConfigurationService,
          useValue: {
            getAllModelNames: jest.fn(),
            getDiscoveryStats: jest.fn(),
            forceModelDiscovery: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ModelsController>(ModelsController);
    configurationService = module.get<ConfigurationService>(ConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getModels', () => {
    it('should return list of available models', () => {
      const mockModelNames = ['model-1', 'model-2'];

      (configurationService.getAllModelNames as jest.Mock).mockReturnValue(mockModelNames);

      const result = controller.getModels();

      expect(result).toEqual({
        object: 'list',
        data: [
          {
            id: 'model-1',
            object: 'model',
            created: expect.any(Number),
            owned_by: 'vllm',
          },
          {
            id: 'model-2',
            object: 'model',
            created: expect.any(Number),
            owned_by: 'vllm',
          },
        ],
      });
      expect(configurationService.getAllModelNames).toHaveBeenCalled();
    });

    it('should return empty list when no models available', () => {
      (configurationService.getAllModelNames as jest.Mock).mockReturnValue([]);

      const result = controller.getModels();

      expect(result).toEqual({
        object: 'list',
        data: [],
      });
      expect(configurationService.getAllModelNames).toHaveBeenCalled();
    });

    it('should handle service errors', () => {
      (configurationService.getAllModelNames as jest.Mock).mockImplementation(() => {
        throw new Error('Service error');
      });

      expect(() => controller.getModels()).toThrow('Service error');
    });

    it('should create models with correct timestamps', () => {
      const mockModelNames = ['test-model'];

      (configurationService.getAllModelNames as jest.Mock).mockReturnValue(mockModelNames);

      const beforeCall = Math.floor(Date.now() / 1000);
      const result = controller.getModels();
      const afterCall = Math.floor(Date.now() / 1000);

      expect(result.data[0].created).toBeGreaterThanOrEqual(beforeCall);
      expect(result.data[0].created).toBeLessThanOrEqual(afterCall);
    });
  });

  describe('getDiscoveryStats', () => {
    it('should return discovery statistics', () => {
      const mockStats = {
        staticBackends: 2,
        discoveredBackends: 1,
        totalModels: 3,
        discoveryEnabled: true,
      };

      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockStats);

      const result = controller.getDiscoveryStats();

      expect(result).toEqual(mockStats);
      expect(configurationService.getDiscoveryStats).toHaveBeenCalled();
    });
  });

  describe('refreshDiscovery', () => {
    it('should refresh model discovery', async () => {
      const mockStats = {
        staticBackends: 2,
        discoveredBackends: 2,
        totalModels: 4,
        discoveryEnabled: true,
      };

      (configurationService.forceModelDiscovery as jest.Mock).mockResolvedValue(undefined);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockStats);

      const result = await controller.refreshDiscovery();

      expect(result).toEqual({
        success: true,
        message: 'Model discovery refreshed',
        stats: mockStats,
      });
      expect(configurationService.forceModelDiscovery).toHaveBeenCalled();
      expect(configurationService.getDiscoveryStats).toHaveBeenCalled();
    });

    it('should handle discovery errors', async () => {
      (configurationService.forceModelDiscovery as jest.Mock).mockRejectedValue(
        new Error('Discovery failed')
      );

      await expect(controller.refreshDiscovery()).rejects.toThrow('Discovery failed');
    });
  });
});
