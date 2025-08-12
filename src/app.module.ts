import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { ModelsModule } from "./models/models.module";
import { ProxyModule } from "./proxy/proxy.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),
    ProxyModule,
    HealthModule,
    ModelsModule,
  ],
})
export class AppModule {}
