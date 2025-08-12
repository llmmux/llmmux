import { Test, TestingModule } from '@nestjs/testing';
import { ProxyService } from './proxy.service';
import { ConfigurationService } from '../config/configuration.service';
import { ResponseTransformerService } from '../transformer/response-transformer.service';

describe('ProxyService', () => {
  let service: ProxyService;
  let configService: ConfigurationService;
  let transformerService: ResponseTransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ConfigurationService,
          useValue: {
            getBackendForModel: jest.fn(),
            getAllBackends: jest.fn(),
          },
        },
        {
          provide: ResponseTransformerService,
          useValue: {
            transformGptOssResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    configService = module.get<ConfigurationService>(ConfigurationService);
    transformerService = module.get<ResponseTransformerService>(ResponseTransformerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('proxyChatCompletion', () => {
    it('should find backend for model successfully', () => {
      const mockBackend = {
        modelName: 'gpt-3.5-turbo',
        host: 'localhost',
        port: 8000,
        baseUrl: 'http://localhost:8000/v1',
      };
      
      jest.spyOn(configService, 'getBackendForModel').mockReturnValue(mockBackend);

      const result = configService.getBackendForModel('gpt-3.5-turbo');

      expect(result).toEqual(mockBackend);
      expect(configService.getBackendForModel).toHaveBeenCalledWith('gpt-3.5-turbo');
    });

    it('should handle missing backend gracefully', () => {
      jest.spyOn(configService, 'getBackendForModel').mockReturnValue(undefined);

      const result = configService.getBackendForModel('non-existent-model');

      expect(result).toBeUndefined();
      expect(configService.getBackendForModel).toHaveBeenCalledWith('non-existent-model');
    });
  });

  describe('proxyCompletion', () => {
    it('should find backend for completion model', () => {
      const mockBackend = {
        modelName: 'text-davinci-003',
        host: 'localhost',
        port: 8000,
        baseUrl: 'http://localhost:8000/v1',
      };
      
      jest.spyOn(configService, 'getBackendForModel').mockReturnValue(mockBackend);

      const result = configService.getBackendForModel('text-davinci-003');

      expect(result).toEqual(mockBackend);
      expect(configService.getBackendForModel).toHaveBeenCalledWith('text-davinci-003');
    });
  });
});
