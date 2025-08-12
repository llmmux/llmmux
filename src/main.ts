import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  // Enable CORS if configured
  const enableCors = configService.get<boolean>("ENABLE_CORS", false);
  if (enableCors) {
    const corsOrigin = configService.get<string>("CORS_ORIGIN", "*");
    app.enableCors({
      origin: corsOrigin === "*" ? true : corsOrigin.split(","),
      credentials: true,
    });
    logger.log(`CORS enabled with origin: ${corsOrigin}`);
  }

  const port = configService.get<number>("PORT", 8080);
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Health check available at: http://localhost:${port}/healthz`);
  logger.log(
    `Models endpoint available at: http://localhost:${port}/v1/models`,
  );
}

bootstrap();
