import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApiKeyConfig, CreateApiKeyRequest, UpdateApiKeyRequest } from '../types/api-key.types';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate a new API key string
   */
  private generateApiKey(): string {
    const prefix = 'sk-llmmux';
    const randomPart = randomBytes(24).toString('hex');
    return `${prefix}-${randomPart}`;
  }

  /**
   * Create a new API key
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<ApiKeyConfig> {
    const key = this.generateApiKey();
    
    try {
      const result = await this.db.$transaction(async (tx) => {
        // Create the API key
        const apiKey = await tx.apiKey.create({
          data: {
            key,
            name: request.name,
            description: request.description,
            owner: request.owner,
            tags: request.tags || [],
            rateLimitRpm: request.rateLimitRpm,
            rateLimitRpd: request.rateLimitRpd,
            expiresAt: request.expiresAt,
          },
        });

        // Create permissions
        const permissions = await tx.apiKeyPermission.create({
          data: {
            apiKeyId: apiKey.id,
            allowAll: request.permissions?.allowAll ?? true,
            allowedModels: request.permissions?.allowedModels || [],
            deniedModels: request.permissions?.deniedModels || [],
          },
        });

        return { apiKey, permissions };
      });

      this.logger.log(`Created API key: ${request.name} (${key.substring(0, 20)}...)`);

      return {
        id: result.apiKey.id,
        key: result.apiKey.key,
        name: result.apiKey.name,
        description: result.apiKey.description,
        owner: result.apiKey.owner,
        tags: Array.isArray(result.apiKey.tags) ? result.apiKey.tags as string[] : [],
        rateLimitRpm: result.apiKey.rateLimitRpm,
        rateLimitRpd: result.apiKey.rateLimitRpd,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
        expiresAt: result.apiKey.expiresAt,
        lastUsedAt: result.apiKey.lastUsedAt,
        permissions: {
          allowAll: result.permissions.allowAll,
          allowedModels: Array.isArray(result.permissions.allowedModels) ? result.permissions.allowedModels as string[] : [],
          deniedModels: Array.isArray(result.permissions.deniedModels) ? result.permissions.deniedModels as string[] : [],
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create API key: ${error.message}`);
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * Get API key by key string
   */
  async getApiKey(key: string): Promise<ApiKeyConfig | null> {
    try {
      const result = await this.db.apiKey.findUnique({
        where: { key },
        include: {
          permissions: true,
        },
      });

      if (!result) {
        return null;
      }

      // Update last used timestamp
      await this.db.apiKey.update({
        where: { key },
        data: { lastUsedAt: new Date() },
      });

      return {
        id: result.id,
        key: result.key,
        name: result.name,
        description: result.description,
        owner: result.owner,
        tags: Array.isArray(result.tags) ? result.tags as string[] : [],
        rateLimitRpm: result.rateLimitRpm,
        rateLimitRpd: result.rateLimitRpd,
        isActive: result.isActive,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        lastUsedAt: result.lastUsedAt,
        permissions: result.permissions ? {
          allowAll: result.permissions.allowAll,
          allowedModels: Array.isArray(result.permissions.allowedModels) ? result.permissions.allowedModels as string[] : [],
          deniedModels: Array.isArray(result.permissions.deniedModels) ? result.permissions.deniedModels as string[] : [],
        } : {
          allowAll: true,
          allowedModels: [],
          deniedModels: [],
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get API key: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all API keys
   */
  async getAllApiKeys(): Promise<ApiKeyConfig[]> {
    try {
      const results = await this.db.apiKey.findMany({
        include: {
          permissions: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return results.map(result => ({
        id: result.id,
        key: result.key,
        name: result.name,
        description: result.description,
        owner: result.owner,
        tags: Array.isArray(result.tags) ? result.tags as string[] : [],
        rateLimitRpm: result.rateLimitRpm,
        rateLimitRpd: result.rateLimitRpd,
        isActive: result.isActive,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        lastUsedAt: result.lastUsedAt,
        permissions: result.permissions ? {
          allowAll: result.permissions.allowAll,
          allowedModels: Array.isArray(result.permissions.allowedModels) ? result.permissions.allowedModels as string[] : [],
          deniedModels: Array.isArray(result.permissions.deniedModels) ? result.permissions.deniedModels as string[] : [],
        } : {
          allowAll: true,
          allowedModels: [],
          deniedModels: [],
        },
      }));
    } catch (error) {
      this.logger.error(`Failed to get all API keys: ${error.message}`);
      return [];
    }
  }

  /**
   * Update an existing API key
   */
  async updateApiKey(id: number, request: UpdateApiKeyRequest): Promise<ApiKeyConfig | null> {
    try {
      const result = await this.db.$transaction(async (tx) => {
        // Update the API key
        const apiKey = await tx.apiKey.update({
          where: { id },
          data: {
            name: request.name,
            description: request.description,
            owner: request.owner,
            tags: request.tags,
            rateLimitRpm: request.rateLimitRpm,
            rateLimitRpd: request.rateLimitRpd,
            isActive: request.isActive,
            expiresAt: request.expiresAt,
          },
        });

        // Update permissions if provided
        let permissions = null;
        if (request.permissions) {
          permissions = await tx.apiKeyPermission.upsert({
            where: { apiKeyId: id },
            update: {
              allowAll: request.permissions.allowAll,
              allowedModels: request.permissions.allowedModels,
              deniedModels: request.permissions.deniedModels,
            },
            create: {
              apiKeyId: id,
              allowAll: request.permissions.allowAll ?? true,
              allowedModels: request.permissions.allowedModels || [],
              deniedModels: request.permissions.deniedModels || [],
            },
          });
        } else {
          permissions = await tx.apiKeyPermission.findUnique({
            where: { apiKeyId: id },
          });
        }

        return { apiKey, permissions };
      });

      this.logger.log(`Updated API key: ${result.apiKey.name} (ID: ${id})`);

      return {
        id: result.apiKey.id,
        key: result.apiKey.key,
        name: result.apiKey.name,
        description: result.apiKey.description,
        owner: result.apiKey.owner,
        tags: Array.isArray(result.apiKey.tags) ? result.apiKey.tags as string[] : [],
        rateLimitRpm: result.apiKey.rateLimitRpm,
        rateLimitRpd: result.apiKey.rateLimitRpd,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
        expiresAt: result.apiKey.expiresAt,
        lastUsedAt: result.apiKey.lastUsedAt,
        permissions: result.permissions ? {
          allowAll: result.permissions.allowAll,
          allowedModels: Array.isArray(result.permissions.allowedModels) ? result.permissions.allowedModels as string[] : [],
          deniedModels: Array.isArray(result.permissions.deniedModels) ? result.permissions.deniedModels as string[] : [],
        } : {
          allowAll: true,
          allowedModels: [],
          deniedModels: [],
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update API key: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(id: number): Promise<boolean> {
    try {
      await this.db.apiKey.delete({
        where: { id },
      });

      this.logger.log(`Deleted API key with ID: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete API key: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate API key and check permissions
   */
  async validateApiKey(key: string): Promise<ApiKeyConfig | null> {
    const apiKey = await this.getApiKey(key);
    
    if (!apiKey) {
      return null;
    }

    // Check if key is active
    if (!apiKey.isActive) {
      this.logger.debug(`API key is inactive: ${key.substring(0, 20)}...`);
      return null;
    }

    // Check if key has expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.debug(`API key has expired: ${key.substring(0, 20)}...`);
      return null;
    }

    return apiKey;
  }

  /**
   * Check if API key has access to a specific model
   */
  async hasModelAccess(key: string, model: string): Promise<boolean> {
    const apiKey = await this.validateApiKey(key);
    
    if (!apiKey) {
      return false;
    }

    const permissions = apiKey.permissions;

    // If allowAll is true and model is not in deniedModels
    if (permissions.allowAll) {
      return !permissions.deniedModels.includes(model);
    }

    // If allowAll is false, model must be in allowedModels
    return permissions.allowedModels.includes(model);
  }

  /**
   * Legacy compatibility methods
   */
  isValidApiKey(apiKey: string): Promise<boolean> {
    return this.validateApiKey(apiKey).then(result => result !== null);
  }

  async getApiKeyConfig(apiKey: string): Promise<ApiKeyConfig | undefined> {
    const result = await this.getApiKey(apiKey);
    return result || undefined;
  }

  recordKeyUsage(apiKey: string): Promise<void> {
    // This is handled automatically in getApiKey method
    return Promise.resolve();
  }
}
