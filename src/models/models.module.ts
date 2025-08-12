import { Module } from "@nestjs/common";
import { ModelsController } from "./models.controller";
import { ConfigurationModule } from "../config/configuration.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ConfigurationModule, AuthModule],
  controllers: [ModelsController],
})
export class ModelsModule {}
