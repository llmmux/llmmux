import { Controller, Get, Logger } from "@nestjs/common";
import axios from "axios";
import { ConfigurationService } from "../config/configuration.service";

@Controller("healthz")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private configurationService: ConfigurationService) {}

  @Get()
  async getHealth() {
    const backends = this.configurationService.getAllBackends();
    const healthChecks = [];

    for (const backend of backends) {
      try {
        const response = await axios.get(`${backend.baseUrl}/models`, {
          timeout: 5000,
        });

        healthChecks.push({
          model: backend.modelName,
          status: "healthy",
          url: backend.baseUrl,
          responseTime: response.headers["x-response-time"] || "unknown",
        });
      } catch (error) {
        this.logger.warn(
          `Health check failed for ${backend.modelName}: ${error.message}`,
        );
        healthChecks.push({
          model: backend.modelName,
          status: "unhealthy",
          url: backend.baseUrl,
          error: error.message,
        });
      }
    }

    const healthyCount = healthChecks.filter(
      (check) => check.status === "healthy",
    ).length;
    const totalCount = healthChecks.length;
    const discoveryStats = this.configurationService.getDiscoveryStats();

    return {
      status: healthyCount === totalCount ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      backends: healthChecks,
      discovery: {
        enabled: discoveryStats.discoveryEnabled,
        staticBackends: discoveryStats.staticBackends,
        discoveredBackends: discoveryStats.discoveredBackends,
        totalModels: discoveryStats.totalModels,
      },
      summary: {
        healthy: healthyCount,
        total: totalCount,
      },
    };
  }
}
