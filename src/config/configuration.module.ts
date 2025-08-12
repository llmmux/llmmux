import { Module } from "@nestjs/common";
import { ConfigurationService } from "./configuration.service";
import { ModelDiscoveryService } from "./model-discovery.service";

@Module({
  providers: [ConfigurationService, ModelDiscoveryService],
  exports: [ConfigurationService, ModelDiscoveryService],
})
export class ConfigurationModule {}
