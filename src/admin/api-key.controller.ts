import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { ApiKeyService } from '../auth/api-key.service';
import { MetricsService } from '../metrics/metrics.service';
import { JwtAuthGuard, Roles } from '../auth/jwt-auth.guard';
import { UserRole } from '../auth/user.service';
import { CreateApiKeyRequest, UpdateApiKeyRequest, ModelPermissions } from '../types/api-key.types';

class CreateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key', example: 'Production Key' })
  name: string;

  @ApiProperty({ 
    description: 'List of models this key can access', 
    example: ['llama3.2:latest', 'codellama:latest'],
    type: [String] 
  })
  models: string[];

  @ApiProperty({ 
    description: 'Rate limit per minute', 
    example: 100,
    minimum: 1,
    maximum: 10000
  })
  rateLimit: number;
}

class UpdateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key', example: 'Updated Production Key', required: false })
  name?: string;

  @ApiProperty({ 
    description: 'List of models this key can access', 
    example: ['llama3.2:latest', 'codellama:latest'],
    type: [String],
    required: false
  })
  models?: string[];

  @ApiProperty({ 
    description: 'Rate limit per minute', 
    example: 200,
    minimum: 1,
    maximum: 10000,
    required: false
  })
  rateLimit?: number;

  @ApiProperty({ 
    description: 'Whether the API key is active', 
    example: true,
    required: false
  })
  active?: boolean;
}

class UpdatePermissionsDto {
  @ApiProperty({ 
    description: 'Model permissions for the API key',
    example: {
      'llama3.2:latest': { enabled: true, rateLimit: 50 },
      'codellama:latest': { enabled: true, rateLimit: 30 }
    }
  })
  permissions: ModelPermissions;
}

class CleanupLogsDto {
  @ApiProperty({ 
    description: 'Number of days to retain logs', 
    example: 90,
    required: false,
    minimum: 1,
    maximum: 365
  })
  retentionDays?: number;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth('JwtAuth')
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('/keys')
  @ApiOperation({ 
    summary: 'Get all API keys',
    description: 'Retrieve all API keys with their configurations and summary statistics'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API keys retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Production Key' },
              key: { type: 'string', example: 'sk-test-ollama-abc123...' },
              active: { type: 'boolean', example: true },
              rateLimit: { type: 'number', example: 100 },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        stats: {
          type: 'object',
          properties: {
            totalApiKeys: { type: 'number', example: 2 },
            totalRequests: { type: 'number', example: 42 },
            totalSuccessfulRequests: { type: 'number', example: 40 },
            totalFailedRequests: { type: 'number', example: 2 },
            totalTokens: { type: 'number', example: 1337 },
            uniqueModels: { type: 'number', example: 3 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
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
  @ApiOperation({ 
    summary: 'Get API key by ID',
    description: 'Get detailed information about a specific API key including metrics'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'API key ID',
    example: '1',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API key retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Production Key' },
            key: { type: 'string', example: 'sk-test-ollama-abc123...' },
            active: { type: 'boolean', example: true },
            rateLimit: { type: 'number', example: 100 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        metrics: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number', example: 42 },
            successfulRequests: { type: 'number', example: 40 },
            failedRequests: { type: 'number', example: 2 },
            totalTokens: { type: 'number', example: 1337 },
            averageResponseTime: { type: 'number', example: 1250.5 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
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
  @ApiOperation({ 
    summary: 'Create new API key',
    description: 'Create a new API key with specified name, model access, and rate limits'
  })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({ 
    status: 201, 
    description: 'API key created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'API key created successfully' },
        key: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Production Key' },
            key: { type: 'string', example: 'sk-test-ollama-abc123...' },
            active: { type: 'boolean', example: true },
            rateLimit: { type: 'number', example: 100 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
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
  @ApiOperation({ 
    summary: 'Update API key',
    description: 'Update an existing API key configuration'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'API key ID',
    example: '1',
    type: 'string'
  })
  @ApiBody({ type: UpdateApiKeyDto })
  @ApiResponse({ 
    status: 200, 
    description: 'API key updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'API key updated successfully' },
        key: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Updated Production Key' },
            key: { type: 'string', example: 'sk-test-ollama-abc123...' },
            active: { type: 'boolean', example: true },
            rateLimit: { type: 'number', example: 200 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
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
  @ApiOperation({ 
    summary: 'Delete API key',
    description: 'Permanently delete an API key and all associated data'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'API key ID',
    example: '1',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API key deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'API key deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
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
  @ApiOperation({ 
    summary: 'Update API key permissions',
    description: 'Update model permissions for a specific API key'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'API key ID',
    example: '1',
    type: 'string'
  })
  @ApiBody({ type: UpdatePermissionsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'API key permissions updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'API key permissions updated successfully' },
        permissions: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', example: true },
              rateLimit: { type: 'number', example: 50 }
            }
          },
          example: {
            'llama3.2:latest': { enabled: true, rateLimit: 50 },
            'codellama:latest': { enabled: true, rateLimit: 30 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid permissions data' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
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
  @ApiOperation({ 
    summary: 'Cleanup old logs',
    description: 'Remove old request logs older than specified retention period'
  })
  @ApiBody({ type: CleanupLogsDto })
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
