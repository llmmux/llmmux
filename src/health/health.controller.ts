import { Controller, Get, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import axios from "axios";
import { ConfigurationService } from "../config/configuration.service";

@ApiTags('Health')
@Controller("healthz")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private configurationService: ConfigurationService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Service health check',
    description: 'Comprehensive health check that tests all configured backends and returns their status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { 
          type: 'string', 
          enum: ['healthy', 'degraded'], 
          example: 'healthy',
          description: 'Overall service status'
        },
        timestamp: { 
          type: 'string', 
          format: 'date-time',
          example: '2024-01-15T10:30:00.000Z'
        },
        backends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              model: { type: 'string', example: 'llama3.2:latest' },
              status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
              url: { type: 'string', example: 'http://localhost:11434' },
              responseTime: { type: 'string', example: '45ms' },
              error: { type: 'string', example: 'Connection timeout' }
            }
          }
        },
        discovery: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', example: true },
            staticBackends: { type: 'number', example: 2 },
            discoveredBackends: { type: 'number', example: 1 },
            totalModels: { type: 'number', example: 5 }
          }
        },
        summary: {
          type: 'object',
          properties: {
            healthy: { type: 'number', example: 2 },
            total: { type: 'number', example: 3 }
          }
        }
      }
    }
  })
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
