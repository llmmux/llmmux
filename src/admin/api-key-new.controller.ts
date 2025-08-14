import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyService } from '../auth/api-key.service';
import { MetricsService } from '../metrics/metrics.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateApiKeyRequest, UpdateApiKeyRequest, ModelPermissions } from '../types/api-key.types';

@Controller('admin')
@UseGuards(AuthGuard)
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('/keys')
  async getAllApiKeys() {
    const keys = await this.apiKeyService.getAllApiKeys();
    const summaryStats = await this.metricsService.getSummaryStats();
    
    return {
      keys: keys.map(key => ({
        ...key,
        key: key.key.substring(0, 20) + '...', // Hide full key
      })),
      stats: summaryStats,
    };
  }

  @Get('/keys/:id')
  async getApiKey(@Param('id') id: string) {
    const apiId = parseInt(id, 10);
    const keys = await this.apiKeyService.getAllApiKeys();
    const config = keys.find(k => k.id === apiId);
    
    if (!config) {
      throw new HttpException('API key not found', HttpStatus.NOT_FOUND);
    }

    const metrics = await this.metricsService.getApiKeyMetrics(config.key);
    
    return {
      config: {
        ...config,
        key: config.key.substring(0, 20) + '...', // Hide full key
      },
      metrics,
    };
  }

  @Post('/keys')
  async createApiKey(@Body() request: CreateApiKeyRequest) {
    try {
      const newKey = await this.apiKeyService.createApiKey(request);
      
      return {
        message: 'API key created successfully',
        key: {
          ...newKey,
          key: newKey.key.substring(0, 20) + '...', // Hide full key in response
        },
      };
    } catch (error) {
      throw new HttpException(`Failed to create API key: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('/keys/:id')
  async updateApiKey(@Param('id') id: string, @Body() request: UpdateApiKeyRequest) {
    const apiId = parseInt(id, 10);
    
    try {
      const updatedKey = await this.apiKeyService.updateApiKey(apiId, request);
      
      if (!updatedKey) {
        throw new HttpException('API key not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'API key updated successfully',
        key: {
          ...updatedKey,
          key: updatedKey.key.substring(0, 20) + '...', // Hide full key
        },
      };
    } catch (error) {
      throw new HttpException(`Failed to update API key: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('/keys/:id')
  async deleteApiKey(@Param('id') id: string) {
    const apiId = parseInt(id, 10);
    
    const success = await this.apiKeyService.deleteApiKey(apiId);
    
    if (!success) {
      throw new HttpException('API key not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'API key deleted successfully',
    };
  }

  @Post('/keys/:id/permissions')
  async updateApiKeyPermissions(
    @Param('id') id: string,
    @Body() permissions: ModelPermissions,
  ) {
    const apiId = parseInt(id, 10);
    
    try {
      const updatedKey = await this.apiKeyService.updateApiKey(apiId, { permissions });
      
      if (!updatedKey) {
        throw new HttpException('API key not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'API key permissions updated successfully',
        permissions: updatedKey.permissions,
      };
    } catch (error) {
      throw new HttpException(`Failed to update permissions: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('/cleanup-logs')
  async cleanupLogs(@Body() body: { retentionDays?: number }) {
    const retentionDays = body.retentionDays || 90;
    const deletedCount = await this.metricsService.cleanupOldLogs(retentionDays);
    
    return {
      message: `Cleaned up ${deletedCount} old log entries`,
      retentionDays,
      deletedCount,
    };
  }
}
