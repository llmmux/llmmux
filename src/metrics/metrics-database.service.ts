import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApiKeyUsageMetrics, ModelMetrics } from '../types/api-key.types';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Record a request for an API key
   */
  async recordRequest(
    apiKey: string,
    modelName: string,
    success: boolean,
    tokens: number = 0,
    responseTimeMs: number = 0,
    requestPath?: string,
    statusCode?: number,
    errorMessage?: string,
  ): Promise<void> {
    try {
      // Get the API key record to get the ID
      const apiKeyRecord = await this.db.apiKey.findUnique({
        where: { key: apiKey },
        select: { id: true },
      });

      if (!apiKeyRecord) {
        this.logger.warn(`API key not found for metrics recording: ${apiKey.substring(0, 20)}...`);
        return;
      }

      const apiKeyId = apiKeyRecord.id;

      // Record the request log
      await this.db.requestLog.create({
        data: {
          apiKeyId,
          modelName,
          success,
          tokens,
          responseTimeMs,
          requestPath,
          statusCode,
          errorMessage,
        },
      });

      // Update or create metrics record
      await this.db.apiKeyMetric.upsert({
        where: {
          apiKeyId_modelName: {
            apiKeyId,
            modelName,
          },
        },
        update: {
          totalRequests: { increment: 1 },
          successfulRequests: success ? { increment: 1 } : undefined,
          failedRequests: !success ? { increment: 1 } : undefined,
          totalTokens: { increment: BigInt(tokens) },
          totalResponseTimeMs: { increment: BigInt(responseTimeMs) },
          lastRequestAt: new Date(),
        },
        create: {
          apiKeyId,
          modelName,
          totalRequests: 1,
          successfulRequests: success ? 1 : 0,
          failedRequests: success ? 0 : 1,
          totalTokens: BigInt(tokens),
          totalResponseTimeMs: BigInt(responseTimeMs),
          lastRequestAt: new Date(),
        },
      });

      this.logger.debug(
        `Recorded request: ${apiKey.substring(0, 20)}... -> ${modelName} (${success ? 'success' : 'failed'})`,
      );
    } catch (error) {
      this.logger.error(`Failed to record request metrics: ${error.message}`);
    }
  }

  /**
   * Get metrics for a specific API key
   */
  async getApiKeyMetrics(apiKey: string): Promise<ApiKeyUsageMetrics | null> {
    try {
      const apiKeyRecord = await this.db.apiKey.findUnique({
        where: { key: apiKey },
        include: {
          metrics: true,
        },
      });

      if (!apiKeyRecord) {
        return null;
      }

      const modelMetrics: Record<string, ModelMetrics> = {};

      for (const metric of apiKeyRecord.metrics) {
        modelMetrics[metric.modelName] = {
          totalRequests: metric.totalRequests,
          successfulRequests: metric.successfulRequests,
          failedRequests: metric.failedRequests,
          totalTokens: Number(metric.totalTokens),
          averageResponseTime: metric.totalRequests > 0 
            ? Number(metric.totalResponseTimeMs) / metric.totalRequests 
            : 0,
          lastRequestAt: metric.lastRequestAt,
        };
      }

      // Calculate totals
      const totalRequests = apiKeyRecord.metrics.reduce((sum, m) => sum + m.totalRequests, 0);
      const successfulRequests = apiKeyRecord.metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
      const failedRequests = apiKeyRecord.metrics.reduce((sum, m) => sum + m.failedRequests, 0);
      const totalTokens = apiKeyRecord.metrics.reduce((sum, m) => sum + Number(m.totalTokens), 0);
      const totalResponseTimeMs = apiKeyRecord.metrics.reduce((sum, m) => sum + Number(m.totalResponseTimeMs), 0);

      return {
        apiKey: apiKey.substring(0, 20) + '...', // Hide full key
        totalRequests,
        successfulRequests,
        failedRequests,
        totalTokens,
        averageResponseTime: totalRequests > 0 ? totalResponseTimeMs / totalRequests : 0,
        modelMetrics,
        lastRequestAt: apiKeyRecord.lastUsedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get API key metrics: ${error.message}`);
      return null;
    }
  }

  /**
   * Get metrics for all API keys
   */
  async getAllMetrics(): Promise<ApiKeyUsageMetrics[]> {
    try {
      const apiKeys = await this.db.apiKey.findMany({
        include: {
          metrics: true,
        },
      });

      const allMetrics: ApiKeyUsageMetrics[] = [];

      for (const apiKeyRecord of apiKeys) {
        const modelMetrics: Record<string, ModelMetrics> = {};

        for (const metric of apiKeyRecord.metrics) {
          modelMetrics[metric.modelName] = {
            totalRequests: metric.totalRequests,
            successfulRequests: metric.successfulRequests,
            failedRequests: metric.failedRequests,
            totalTokens: Number(metric.totalTokens),
            averageResponseTime: metric.totalRequests > 0 
              ? Number(metric.totalResponseTimeMs) / metric.totalRequests 
              : 0,
            lastRequestAt: metric.lastRequestAt,
          };
        }

        // Calculate totals
        const totalRequests = apiKeyRecord.metrics.reduce((sum, m) => sum + m.totalRequests, 0);
        const successfulRequests = apiKeyRecord.metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
        const failedRequests = apiKeyRecord.metrics.reduce((sum, m) => sum + m.failedRequests, 0);
        const totalTokens = apiKeyRecord.metrics.reduce((sum, m) => sum + Number(m.totalTokens), 0);
        const totalResponseTimeMs = apiKeyRecord.metrics.reduce((sum, m) => sum + Number(m.totalResponseTimeMs), 0);

        allMetrics.push({
          apiKey: apiKeyRecord.key.substring(0, 20) + '...', // Hide full key
          totalRequests,
          successfulRequests,
          failedRequests,
          totalTokens,
          averageResponseTime: totalRequests > 0 ? totalResponseTimeMs / totalRequests : 0,
          modelMetrics,
          lastRequestAt: apiKeyRecord.lastUsedAt,
        });
      }

      return allMetrics;
    } catch (error) {
      this.logger.error(`Failed to get all metrics: ${error.message}`);
      return [];
    }
  }

  /**
   * Get Prometheus-formatted metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    try {
      const allMetrics = await this.getAllMetrics();
      const lines: string[] = [];

      // Add metric definitions
      lines.push('# HELP llmmux_requests_total Total number of requests per API key and model');
      lines.push('# TYPE llmmux_requests_total counter');

      lines.push('# HELP llmmux_requests_successful_total Total number of successful requests per API key and model');
      lines.push('# TYPE llmmux_requests_successful_total counter');

      lines.push('# HELP llmmux_requests_failed_total Total number of failed requests per API key and model');
      lines.push('# TYPE llmmux_requests_failed_total counter');

      lines.push('# HELP llmmux_tokens_total Total number of tokens processed per API key and model');
      lines.push('# TYPE llmmux_tokens_total counter');

      lines.push('# HELP llmmux_response_time_seconds Average response time per API key and model');
      lines.push('# TYPE llmmux_response_time_seconds gauge');

      // Add metrics data
      for (const metrics of allMetrics) {
        for (const [model, modelMetrics] of Object.entries(metrics.modelMetrics)) {
          const labels = `api_key="${metrics.apiKey}",model="${model}"`;
          
          lines.push(`llmmux_requests_total{${labels}} ${modelMetrics.totalRequests}`);
          lines.push(`llmmux_requests_successful_total{${labels}} ${modelMetrics.successfulRequests}`);
          lines.push(`llmmux_requests_failed_total{${labels}} ${modelMetrics.failedRequests}`);
          lines.push(`llmmux_tokens_total{${labels}} ${modelMetrics.totalTokens}`);
          lines.push(`llmmux_response_time_seconds{${labels}} ${(modelMetrics.averageResponseTime / 1000).toFixed(3)}`);
        }
      }

      return lines.join('\n') + '\n';
    } catch (error) {
      this.logger.error(`Failed to generate Prometheus metrics: ${error.message}`);
      return '# Error generating metrics\n';
    }
  }

  /**
   * Clean up old request logs (older than specified days)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.db.requestLog.deleteMany({
        where: {
          requestTimestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} request logs older than ${retentionDays} days`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup old logs: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(): Promise<{
    totalApiKeys: number;
    totalRequests: number;
    totalSuccessfulRequests: number;
    totalFailedRequests: number;
    totalTokens: number;
    uniqueModels: number;
  }> {
    try {
      const [
        totalApiKeys,
        requestStats,
        uniqueModels,
      ] = await Promise.all([
        this.db.apiKey.count(),
        this.db.apiKeyMetric.aggregate({
          _sum: {
            totalRequests: true,
            successfulRequests: true,
            failedRequests: true,
            totalTokens: true,
          },
        }),
        this.db.apiKeyMetric.groupBy({
          by: ['modelName'],
          _count: true,
        }),
      ]);

      return {
        totalApiKeys,
        totalRequests: requestStats._sum.totalRequests || 0,
        totalSuccessfulRequests: requestStats._sum.successfulRequests || 0,
        totalFailedRequests: requestStats._sum.failedRequests || 0,
        totalTokens: Number(requestStats._sum.totalTokens || 0),
        uniqueModels: uniqueModels.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get summary stats: ${error.message}`);
      return {
        totalApiKeys: 0,
        totalRequests: 0,
        totalSuccessfulRequests: 0,
        totalFailedRequests: 0,
        totalTokens: 0,
        uniqueModels: 0,
      };
    }
  }
}
