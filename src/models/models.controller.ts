import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ConfigurationService } from "../config/configuration.service";
import { AuthGuard } from "../auth/auth.guard";
import { ModelInfo } from "../types";

@Controller("v1/models")
@UseGuards(AuthGuard)
export class ModelsController {
  constructor(private configurationService: ConfigurationService) {}

  @Get()
  getModels() {
    const modelNames = this.configurationService.getAllModelNames();
    const models: ModelInfo[] = modelNames.map((modelName) => ({
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
  getDiscoveryStats() {
    return this.configurationService.getDiscoveryStats();
  }

  @Post("discovery/refresh")
  async refreshDiscovery() {
    await this.configurationService.forceModelDiscovery();
    return {
      success: true,
      message: "Model discovery refreshed",
      stats: this.configurationService.getDiscoveryStats(),
    };
  }
}
