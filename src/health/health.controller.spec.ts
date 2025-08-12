import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { ConfigurationService } from "../config/configuration.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("HealthController", () => {
  let controller: HealthController;
  let configurationService: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ConfigurationService,
          useValue: {
            getAllBackends: jest.fn(),
            getDiscoveryStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    configurationService = module.get<ConfigurationService>(ConfigurationService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getHealth", () => {
    it("should return healthy status when all backends are healthy", async () => {
      const mockBackends = [
        { modelName: "model1", baseUrl: "http://localhost:8000" },
        { modelName: "model2", baseUrl: "http://localhost:8001" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 2,
        discoveredBackends: 0,
        totalModels: 2,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      mockedAxios.get.mockResolvedValue({
        data: { models: [] },
        headers: { "x-response-time": "50ms" },
      });

      const result = await controller.getHealth();

      expect(result.status).toBe("healthy");
      expect(result.backends).toHaveLength(2);
      expect(result.backends[0].status).toBe("healthy");
      expect(result.backends[1].status).toBe("healthy");
      expect(result.summary.healthy).toBe(2);
      expect(result.summary.total).toBe(2);
    });

    it("should return degraded status when some backends are unhealthy", async () => {
      const mockBackends = [
        { modelName: "model1", baseUrl: "http://localhost:8000" },
        { modelName: "model2", baseUrl: "http://localhost:8001" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 2,
        discoveredBackends: 0,
        totalModels: 2,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      mockedAxios.get
        .mockResolvedValueOnce({
          data: { models: [] },
          headers: { "x-response-time": "50ms" },
        })
        .mockRejectedValueOnce(new Error("Connection refused"));

      const result = await controller.getHealth();

      expect(result.status).toBe("degraded");
      expect(result.backends).toHaveLength(2);
      expect(result.backends[0].status).toBe("healthy");
      expect(result.backends[1].status).toBe("unhealthy");
      expect(result.backends[1].error).toBe("Connection refused");
      expect(result.summary.healthy).toBe(1);
      expect(result.summary.total).toBe(2);
    });

    it("should handle timeout errors", async () => {
      const mockBackends = [
        { modelName: "timeout-model", baseUrl: "http://slow:8000" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 1,
        discoveredBackends: 0,
        totalModels: 1,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      const timeoutError = new Error("timeout of 5000ms exceeded");
      mockedAxios.get.mockRejectedValue(timeoutError);

      const result = await controller.getHealth();

      expect(result.status).toBe("degraded");
      expect(result.backends[0].status).toBe("unhealthy");
      expect(result.backends[0].error).toBe("timeout of 5000ms exceeded");
    });

    it("should include discovery information", async () => {
      const mockBackends = [
        { modelName: "static-model", baseUrl: "http://localhost:8000" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 1,
        discoveredBackends: 2,
        totalModels: 3,
        discoveryEnabled: true,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      mockedAxios.get.mockResolvedValue({
        data: { models: [] },
        headers: {},
      });

      const result = await controller.getHealth();

      expect(result.discovery).toEqual({
        enabled: true,
        staticBackends: 1,
        discoveredBackends: 2,
        totalModels: 3,
      });
    });

    it("should return valid timestamp", async () => {
      const mockBackends = [];
      const mockDiscoveryStats = {
        staticBackends: 0,
        discoveredBackends: 0,
        totalModels: 0,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      const beforeCall = new Date();
      const result = await controller.getHealth();
      const afterCall = new Date();

      const resultTimestamp = new Date(result.timestamp);

      expect(resultTimestamp).toBeInstanceOf(Date);
      expect(resultTimestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(resultTimestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it("should handle empty backends list", async () => {
      const mockBackends = [];
      const mockDiscoveryStats = {
        staticBackends: 0,
        discoveredBackends: 0,
        totalModels: 0,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      const result = await controller.getHealth();

      expect(result.status).toBe("healthy"); // No backends = healthy
      expect(result.backends).toHaveLength(0);
      expect(result.summary.healthy).toBe(0);
      expect(result.summary.total).toBe(0);
    });

    it("should include response time when available", async () => {
      const mockBackends = [
        { modelName: "fast-model", baseUrl: "http://localhost:8000" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 1,
        discoveredBackends: 0,
        totalModels: 1,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      mockedAxios.get.mockResolvedValue({
        data: { models: [] },
        headers: { "x-response-time": "25ms" },
      });

      const result = await controller.getHealth();

      expect(result.backends[0].responseTime).toBe("25ms");
    });

    it("should handle missing response time header", async () => {
      const mockBackends = [
        { modelName: "model", baseUrl: "http://localhost:8000" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 1,
        discoveredBackends: 0,
        totalModels: 1,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      mockedAxios.get.mockResolvedValue({
        data: { models: [] },
        headers: {},
      });

      const result = await controller.getHealth();

      expect(result.backends[0].responseTime).toBe("unknown");
    });

    it("should handle network errors gracefully", async () => {
      const mockBackends = [
        { modelName: "unreachable-model", baseUrl: "http://unreachable:8000" },
      ];

      const mockDiscoveryStats = {
        staticBackends: 1,
        discoveredBackends: 0,
        totalModels: 1,
        discoveryEnabled: false,
      };

      (configurationService.getAllBackends as jest.Mock).mockReturnValue(mockBackends);
      (configurationService.getDiscoveryStats as jest.Mock).mockReturnValue(mockDiscoveryStats);

      const networkError = new Error("ENOTFOUND unreachable");
      mockedAxios.get.mockRejectedValue(networkError);

      const result = await controller.getHealth();

      expect(result.status).toBe("degraded");
      expect(result.backends[0].status).toBe("unhealthy");
      expect(result.backends[0].error).toBe("ENOTFOUND unreachable");
    });
  });
});
