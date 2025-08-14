import { Controller, Get, Post, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigurationService } from "../config/configuration.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiKeyService } from "../auth/api-key.service";
import { ModelInfo } from "../types";

@ApiTags('Models')
@Controller("v1/models")
@UseGuards(AuthGuard)
@ApiBearerAuth('ApiKeyAuth')
export class ModelsController {
  constructor(
    private configurationService: ConfigurationService,
    private apiKeyService: ApiKeyService
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'List available models',
    description: 'Get a list of models available to the authenticated API key based on permissions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Models retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        object: { type: 'string', example: 'list' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'llama3.2:latest' },
              object: { type: 'string', example: 'model' },
              created: { type: 'number', example: 1642694400 },
              owned_by: { type: 'string', example: 'vllm' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  getModels(@Request() req: any) {
    const apiKey = req.apiKey;
    const allModelNames = this.configurationService.getAllModelNames();
    
    // Filter models based on API key permissions
    const allowedModels = allModelNames.filter(modelName => 
      this.apiKeyService.hasModelAccess(apiKey, modelName)
    );

    const models: ModelInfo[] = allowedModels.map((modelName) => ({
      id: modelName,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "vllm",
    }));

    return {
      object: "list",
      data: models,
    };
  }

  @Get("discovery/stats")
  @ApiOperation({ 
    summary: 'Get model discovery statistics',
    description: 'Get statistics about model discovery including static and discovered backends'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Discovery statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        discoveryEnabled: { type: 'boolean', example: true },
        staticBackends: { type: 'number', example: 2 },
        discoveredBackends: { type: 'number', example: 1 },
        totalModels: { type: 'number', example: 5 },
        lastDiscovery: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  getDiscoveryStats() {
    return this.configurationService.getDiscoveryStats();
  }

  @Post("discovery/refresh")
  @ApiOperation({ 
    summary: 'Refresh model discovery',
    description: 'Force a refresh of model discovery to find new available models'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Model discovery refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Model discovery refreshed' },
        stats: {
          type: 'object',
          properties: {
            discoveryEnabled: { type: 'boolean', example: true },
            staticBackends: { type: 'number', example: 2 },
            discoveredBackends: { type: 'number', example: 1 },
            totalModels: { type: 'number', example: 5 },
            lastDiscovery: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async refreshDiscovery() {
    await this.configurationService.forceModelDiscovery();
    return {
      success: true,
      message: "Model discovery refreshed",
      stats: this.configurationService.getDiscoveryStats(),
    };
  }
}
