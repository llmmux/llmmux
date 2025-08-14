import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  // Swagger Configuration
  const port = configService.get<number>("PORT", 8080);
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  
  const configBuilder = new DocumentBuilder()
    .setTitle("LLMMux API")
    .setDescription("Production-ready LLM multiplexer and proxy with OpenAI-compatible API, multi-backend support, function calling, and comprehensive metrics tracking")
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "Enter your API key (e.g., sk-test-ollama-key)",
      },
      "ApiKeyAuth"
    )
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token for admin operations",
      },
      "JwtAuth"
    );

  // Add servers based on environment
  if (nodeEnv === "production") {
    configBuilder.addServer("https://llmmux.channels-ai.online", "Production Server");
  } else {
    configBuilder.addServer(`http://localhost:${port}`, "Development Server");
  }

  const config = configBuilder
    .addTag("Authentication", "User login and JWT token management")
    .addTag("OpenAI Compatible", "OpenAI-compatible chat completions and completions")
    .addTag("Models", "Model discovery and management")
    .addTag("Health", "Health checks and system status")
    .addTag("Metrics", "Usage metrics and monitoring")
    .addTag("Admin", "API key management and administration (Admin only)")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Swagger UI at /api
  SwaggerModule.setup("api", app, document, {
    customSiteTitle: "LLMMux API Documentation",
    customfavIcon: "/favicon.ico",
    customCss: `
      .topbar-wrapper { display: none }
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #3b82f6; font-size: 2rem; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
    },
  });

  // Scalar API Reference at /docs
  app.use("/docs", (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>LLMMux API Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <script
          id="api-reference"
          data-url="/api-json"
          data-configuration='${JSON.stringify({
            theme: "purple",
            layout: "modern",
            defaultHttpClient: {
              targetKey: "javascript",
              clientKey: "fetch"
            },
            authentication: {
              preferredSecurityScheme: "ApiKeyAuth",
              apiKey: {
                token: "sk-test-ollama-key"
              }
            }
          })}'></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>`;
    res.send(html);
  });

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

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Health check available at: http://localhost:${port}/healthz`);
  logger.log(`Models endpoint available at: http://localhost:${port}/v1/models`);
  logger.log(`📚 Swagger UI available at: http://localhost:${port}/api`);
  logger.log(`📖 Scalar Docs available at: http://localhost:${port}/docs`);
}

bootstrap();
