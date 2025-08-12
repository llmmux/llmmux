import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ConfigurationModule } from "../config/configuration.module";

@Module({
  imports: [ConfigurationModule],
  controllers: [HealthController],
})
export class HealthModule {}
