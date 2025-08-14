import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { ModelsModule } from "./models/models.module";
import { ProxyModule } from "./proxy/proxy.module";
import { MetricsModule } from "./metrics/metrics.module";
import { AdminModule } from "./admin/admin.module";
import { DatabaseModule } from "./database/database.module";
import { MetricsMiddleware } from "./middleware/metrics.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),
    DatabaseModule,
    ProxyModule,
    HealthModule,
    ModelsModule,
    MetricsModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .forRoutes('*');
  }
}
