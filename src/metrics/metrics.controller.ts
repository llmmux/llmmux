import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { ApiKeyService } from '../auth/api-key.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Metrics')
@Controller('metrics')
@ApiBearerAuth('ApiKeyAuth')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Get('/prometheus')
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: 'Get Prometheus metrics',
    description: 'Export usage metrics in Prometheus format for monitoring integration'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prometheus metrics exported successfully',
    content: {
      'text/plain': {
        example: `# HELP llmmux_requests_total Total number of requests per API key and model
# TYPE llmmux_requests_total counter
llmmux_requests_total{api_key="sk-test-ollama-key...",model="llama3.2:latest"} 1`
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  @Get('/summary')
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: 'Get metrics summary',
    description: 'Get overview statistics and metrics for all API keys'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        overview: {
          type: 'object',
          properties: {
            totalApiKeys: { type: 'number', example: 2 },
            totalRequests: { type: 'number', example: 42 },
            totalSuccessfulRequests: { type: 'number', example: 40 },
            totalFailedRequests: { type: 'number', example: 2 },
            totalTokens: { type: 'number', example: 1337 },
            uniqueModels: { type: 'number', example: 3 }
          }
        },
        metrics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              apiKey: { type: 'string', example: 'sk-test-ollama-key...' },
              totalRequests: { type: 'number', example: 42 },
              successfulRequests: { type: 'number', example: 40 },
              failedRequests: { type: 'number', example: 2 },
              totalTokens: { type: 'number', example: 1337 },
              averageResponseTime: { type: 'number', example: 1250.5 }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getSummaryStats() {
    const stats = await this.metricsService.getSummaryStats();
    const allMetrics = await this.metricsService.getAllMetrics();
    
    return {
      overview: stats,
      metrics: allMetrics,
    };
  }

  @Get('/api-keys/:apiKey')
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: 'Get API key metrics',
    description: 'Get detailed usage metrics for a specific API key'
  })
  @ApiParam({ 
    name: 'apiKey', 
    description: 'API key to get metrics for',
    example: 'sk-test-ollama-key'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API key metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', example: 'sk-test-ollama-key...' },
        totalRequests: { type: 'number', example: 42 },
        successfulRequests: { type: 'number', example: 40 },
        failedRequests: { type: 'number', example: 2 },
        totalTokens: { type: 'number', example: 1337 },
        averageResponseTime: { type: 'number', example: 1250.5 },
        modelMetrics: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              totalRequests: { type: 'number', example: 20 },
              successfulRequests: { type: 'number', example: 19 },
              failedRequests: { type: 'number', example: 1 },
              totalTokens: { type: 'number', example: 650 },
              averageResponseTime: { type: 'number', example: 1100.2 },
              lastRequestAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'API key not found',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'No metrics found for this API key' },
        apiKey: { type: 'string', example: 'sk-test-ollama-key...' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async getApiKeyMetrics(@Param('apiKey') apiKey: string) {
    const metrics = await this.metricsService.getApiKeyMetrics(apiKey);
    
    if (!metrics) {
      return {
        error: 'No metrics found for this API key',
        apiKey: apiKey.substring(0, 20) + '...',
      };
    }

    return metrics;
  }

  @Get('/cleanup')
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: 'Cleanup old logs',
    description: 'Remove old request logs older than specified number of days'
  })
  @ApiQuery({ 
    name: 'days', 
    required: false, 
    description: 'Number of days to retain logs (default: 90)',
    example: 90,
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Log cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cleaned up 150 old log entries' },
        retentionDays: { type: 'number', example: 90 },
        deletedCount: { type: 'number', example: 150 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async cleanupOldLogs(@Query('days') days?: string) {
    const retentionDays = days ? parseInt(days, 10) : 90;
    const deletedCount = await this.metricsService.cleanupOldLogs(retentionDays);
    
    return {
      message: `Cleaned up ${deletedCount} old log entries`,
      retentionDays,
      deletedCount,
    };
  }
}
