import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BackendConfig } from "../types";
import { ModelDiscoveryService } from "./model-discovery.service";

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  private backends: Map<string, BackendConfig> = new Map();
  private apiKeys: Set<string> = new Set();

  constructor(
    private configService: ConfigService,
    private modelDiscoveryService: ModelDiscoveryService,
  ) {
    this.parseBackends();
    this.parseApiKeys();
  }

  private parseBackends(): void {
    const backendsConfig = this.configService.get<string>("BACKENDS", "");

    if (!backendsConfig) {
      this.logger.warn("No BACKENDS configuration found");
      return;
    }

    const backendEntries = backendsConfig.split(",");

    for (const entry of backendEntries) {
      const [modelName, host, port] = entry.trim().split(":");

      if (!modelName || !host || !port) {
        this.logger.warn(`Invalid backend configuration: ${entry}`);
        continue;
      }

      const config: BackendConfig = {
        modelName: modelName.trim(),
        host: host.trim(),
        port: parseInt(port.trim()),
        baseUrl: `http://${host.trim()}:${port.trim()}/v1`,
      };

      this.backends.set(config.modelName, config);
      this.logger.log(
        `Configured backend: ${config.modelName} -> ${config.baseUrl}`,
      );
    }
  }

  private parseApiKeys(): void {
    const apiKeysConfig = this.configService.get<string>("API_KEYS", "");

    if (!apiKeysConfig) {
      this.logger.warn(
        "No API_KEYS configuration found - authentication disabled",
      );
      return;
    }

    const keys = apiKeysConfig.split(",");

    for (const key of keys) {
      const trimmedKey = key.trim();
      if (trimmedKey) {
        this.apiKeys.add(trimmedKey);
      }
    }

    this.logger.log(`Configured ${this.apiKeys.size} API keys`);
  }

  getBackendForModel(modelName: string): BackendConfig | undefined {
    // First check statically configured backends
    const staticBackend = this.backends.get(modelName);
    if (staticBackend) {
      return staticBackend;
    }

    // Then check auto-discovered backends
    return this.modelDiscoveryService.getDiscoveredBackend(modelName);
  }

  getAllBackends(): BackendConfig[] {
    const staticBackends = Array.from(this.backends.values());
    const discoveredBackends =
      this.modelDiscoveryService.getAllDiscoveredBackends();

    // Combine and deduplicate backends (static takes precedence)
    const allBackends = new Map<string, BackendConfig>();

    // Add discovered backends first
    for (const backend of discoveredBackends) {
      allBackends.set(backend.modelName, backend);
    }

    // Add static backends (overwrites discovered ones if same model name)
    for (const backend of staticBackends) {
      allBackends.set(backend.modelName, backend);
    }

    return Array.from(allBackends.values());
  }

  getAllModelNames(): string[] {
    const staticModels = Array.from(this.backends.keys());
    const discoveredModels =
      this.modelDiscoveryService.getAllDiscoveredModelNames();

    // Combine and deduplicate model names
    const allModels = new Set([...staticModels, ...discoveredModels]);
    return Array.from(allModels);
  }

  isValidApiKey(apiKey: string): boolean {
    if (this.apiKeys.size === 0) {
      // If no API keys configured, allow all requests
      return true;
    }
    return this.apiKeys.has(apiKey);
  }

  getPort(): number {
    return this.configService.get<number>("PORT", 8080);
  }

  isCorsEnabled(): boolean {
    return this.configService.get<boolean>("ENABLE_CORS", false);
  }

  getCorsOrigin(): string {
    return this.configService.get<string>("CORS_ORIGIN", "*");
  }

  getDiscoveryStats(): {
    staticBackends: number;
    discoveredBackends: number;
    totalModels: number;
    discoveryEnabled: boolean;
  } {
    const discoveryStats = this.modelDiscoveryService.getDiscoveryStats();

    return {
      staticBackends: this.backends.size,
      discoveredBackends: discoveryStats.modelsDiscovered,
      totalModels: this.getAllModelNames().length,
      discoveryEnabled: discoveryStats.serversConfigured > 0,
    };
  }

  async forceModelDiscovery(): Promise<void> {
    await this.modelDiscoveryService.forceDiscovery();
  }
}
