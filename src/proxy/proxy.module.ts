import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigurationModule } from "../config/configuration.module";
import { TransformerModule } from "../transformer/transformer.module";
import { ProxyController } from "./proxy.controller";
import { ProxyService } from "./proxy.service";

@Module({
  imports: [ConfigurationModule, AuthModule, TransformerModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
