import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { BackendConfig, ModelInfo } from "../types";

interface VllmServerConfig {
  host: string;
  port: number;
  baseUrl: string;
}

@Injectable()
export class ModelDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ModelDiscoveryService.name);
  private discoveredBackends: Map<string, BackendConfig> = new Map();
  private vllmServers: VllmServerConfig[] = [];
  private discoveryInterval: ReturnType<typeof setInterval> | null = null;
  private readonly DISCOVERY_INTERVAL_MS = 30000; // 30 seconds
  private readonly REQUEST_TIMEOUT_MS = 5000; // 5 seconds

  constructor(private configService: ConfigService) {
    this.parseVllmServers();
  }

  async onModuleInit() {
    if (this.vllmServers.length > 0) {
      this.logger.log(
        `Starting model discovery for ${this.vllmServers.length} vLLM servers`,
      );
      await this.discoverModels();
      this.startPeriodicDiscovery();
    } else {
      this.logger.log("No vLLM servers configured for auto-discovery");
    }
  }

  private parseVllmServers(): void {
    // Support both old BACKENDS format and new VLLM_SERVERS format
    const vllmServersConfig = this.configService.get<string>(
      "VLLM_SERVERS",
      "",
    );

    if (vllmServersConfig) {
      // New format: host:port,host:port
      const serverEntries = vllmServersConfig.split(",");

      for (const entry of serverEntries) {
        const [host, port] = entry.trim().split(":");

        if (!host || !port) {
          this.logger.warn(`Invalid vLLM server configuration: ${entry}`);
          continue;
        }

        const serverConfig: VllmServerConfig = {
          host: host.trim(),
          port: parseInt(port.trim()),
          baseUrl: `http://${host.trim()}:${port.trim()}/v1`,
        };

        this.vllmServers.push(serverConfig);
        this.logger.log(
          `Added vLLM server for discovery: ${serverConfig.baseUrl}`,
        );
      }
    } else {
      // Fallback: try to extract servers from old BACKENDS format (without model names)
      const backendsConfig = this.configService.get<string>("BACKENDS", "");
      if (backendsConfig) {
        const backendEntries = backendsConfig.split(",");

        for (const entry of backendEntries) {
          const parts = entry.trim().split(":");
          if (parts.length >= 2) {
            const host = parts[parts.length - 2];
            const port = parts[parts.length - 1];

            const serverConfig: VllmServerConfig = {
              host: host.trim(),
              port: parseInt(port.trim()),
              baseUrl: `http://${host.trim()}:${port.trim()}/v1`,
            };

            // Avoid duplicates
            const exists = this.vllmServers.some(
              (server) =>
                server.host === serverConfig.host &&
                server.port === serverConfig.port,
            );

            if (!exists) {
              this.vllmServers.push(serverConfig);
              this.logger.log(
                `Extracted vLLM server from BACKENDS: ${serverConfig.baseUrl}`,
              );
            }
          }
        }
      }
    }
  }

  private async discoverModels(): Promise<void> {
    const discoveryPromises = this.vllmServers.map((server) =>
      this.discoverModelsFromServer(server),
    );

    try {
      await Promise.allSettled(discoveryPromises);
      this.logger.log(
        `Discovery completed. Found ${this.discoveredBackends.size} models across ${this.vllmServers.length} servers`,
      );
    } catch (error) {
      this.logger.error("Error during model discovery", error);
    }
  }

  private async discoverModelsFromServer(
    server: VllmServerConfig,
  ): Promise<void> {
    try {
      this.logger.debug(`Discovering models from ${server.baseUrl}`);

      const response = await axios.get(`${server.baseUrl}/models`, {
        timeout: this.REQUEST_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
        },
      });

      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        const models: ModelInfo[] = response.data.data;

        for (const model of models) {
          const backendConfig: BackendConfig = {
            modelName: model.id,
            host: server.host,
            port: server.port,
            baseUrl: server.baseUrl,
          };

          this.discoveredBackends.set(model.id, backendConfig);
          this.logger.debug(
            `Discovered model: ${model.id} from ${server.baseUrl}`,
          );
        }

        this.logger.log(
          `Discovered ${models.length} models from ${server.baseUrl}`,
        );
      } else {
        this.logger.warn(
          `Invalid response format from ${server.baseUrl}/models`,
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          this.logger.warn(`vLLM server not reachable: ${server.baseUrl}`);
        } else {
          this.logger.warn(
            `Error discovering models from ${server.baseUrl}: ${error.message}`,
          );
        }
      } else {
        this.logger.error(
          `Unexpected error discovering models from ${server.baseUrl}`,
          error,
        );
      }
    }
  }

  private startPeriodicDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    this.discoveryInterval = setInterval(async () => {
      await this.discoverModels();
    }, this.DISCOVERY_INTERVAL_MS);

    this.logger.log(
      `Started periodic model discovery (interval: ${this.DISCOVERY_INTERVAL_MS}ms)`,
    );
  }

  public stopPeriodicDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
      this.logger.log("Stopped periodic model discovery");
    }
  }

  public getDiscoveredBackend(modelName: string): BackendConfig | undefined {
    return this.discoveredBackends.get(modelName);
  }

  public getAllDiscoveredBackends(): BackendConfig[] {
    return Array.from(this.discoveredBackends.values());
  }

  public getAllDiscoveredModelNames(): string[] {
    return Array.from(this.discoveredBackends.keys());
  }

  public getDiscoveryStats(): {
    serversConfigured: number;
    modelsDiscovered: number;
    lastDiscovery: Date;
  } {
    return {
      serversConfigured: this.vllmServers.length,
      modelsDiscovered: this.discoveredBackends.size,
      lastDiscovery: new Date(),
    };
  }

  // Force immediate discovery (useful for health checks or manual refresh)
  public async forceDiscovery(): Promise<void> {
    this.logger.log("Forcing immediate model discovery");
    await this.discoverModels();
  }
}
