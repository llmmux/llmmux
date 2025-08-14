import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiKeyService } from '../auth/api-key.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Get('/prometheus')
  @UseGuards(AuthGuard)
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  @Get('/summary')
  @UseGuards(AuthGuard)
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
