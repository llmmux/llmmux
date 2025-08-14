export interface ApiKeyConfig {
  id: number;
  key: string;
  name: string;
  description?: string;
  owner?: string;
  tags: string[];
  rateLimitRpm?: number;
  rateLimitRpd?: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  permissions: ModelPermissions;
}

export interface ModelPermissions {
  allowedModels: string[]; // Specific models allowed
  deniedModels: string[];  // Specific models denied
  allowAll: boolean;       // If true, allow all models unless denied
}

export interface ApiKeyMetadata {
  created: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  description?: string;
  owner?: string;
  tags?: string[];
}

export interface ApiKeyUsageMetrics {
  apiKey: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  lastRequestAt?: Date;
  modelMetrics: Record<string, ModelMetrics>;
}

export interface ModelMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  lastRequestAt?: Date;
}

export interface ModelUsageStats {
  requests: number;
  tokens: number;
  errors: number;
  avgResponseTime: number;
  lastUsed: Date;
}

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  owner?: string;
  tags?: string[];
  rateLimitRpm?: number;
  rateLimitRpd?: number;
  expiresAt?: Date;
  permissions?: Partial<ModelPermissions>;
}

export interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
  owner?: string;
  tags?: string[];
  rateLimitRpm?: number;
  rateLimitRpd?: number;
  isActive?: boolean;
  expiresAt?: Date;
  permissions?: Partial<ModelPermissions>;
}
