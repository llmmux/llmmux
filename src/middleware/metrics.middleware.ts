import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../metrics/metrics.service';

export interface RequestWithMetrics extends Request {
  apiKey?: string;
  startTime?: number;
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricsMiddleware.name);

  constructor(private readonly metricsService: MetricsService) {}

  use(req: RequestWithMetrics, res: Response, next: NextFunction) {
    // Record start time
    req.startTime = Date.now();

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody: any;
    let isSuccess = false;

    // Override res.send to capture response
    res.send = function(body: any) {
      responseBody = body;
      isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      return originalSend.call(this, body);
    };

    // Override res.json to capture response
    res.json = function(body: any) {
      responseBody = body;
      isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      return originalJson.call(this, body);
    };

    // Record metrics after response is sent
    res.on('finish', () => {
      this.recordMetrics(req, res, responseBody, isSuccess);
    });

    next();
  }

  private recordMetrics(
    req: RequestWithMetrics, 
    res: Response, 
    responseBody: any, 
    isSuccess: boolean
  ): void {
    const apiKey = req.apiKey;
    if (!apiKey) {
      return; // Skip metrics for unauthenticated requests
    }

    const model = this.extractModel(req, responseBody);
    if (!model) {
      return; // Skip metrics for non-model requests
    }

    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    const tokens = this.extractTokenCount(responseBody);

    this.metricsService.recordRequest(
      apiKey,
      model,
      isSuccess,
      tokens,
      responseTime
    );

    this.logger.debug(
      `Metrics recorded: API Key ${apiKey.substring(0, 8)}..., ` +
      `Model: ${model}, Success: ${isSuccess}, Tokens: ${tokens}, ` +
      `Response Time: ${responseTime}ms`
    );
  }

  private extractModel(req: RequestWithMetrics, responseBody: any): string | null {
    // Try to get model from request body
    if (req.body?.model) {
      return req.body.model;
    }

    // Try to get model from response (for streaming responses)
    if (typeof responseBody === 'string') {
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed.model) {
          return parsed.model;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    if (responseBody?.model) {
      return responseBody.model;
    }

    // Extract from URL (e.g., /v1/models/{model})
    const modelMatch = req.url.match(/\/v1\/models\/([^/?]+)/);
    if (modelMatch) {
      return modelMatch[1];
    }

    return null;
  }

  private extractTokenCount(responseBody: any): number {
    if (!responseBody) {
      return 0;
    }

    // Try to parse string responses
    if (typeof responseBody === 'string') {
      try {
        const parsed = JSON.parse(responseBody);
        return parsed.usage?.total_tokens || 0;
      } catch (e) {
        return 0;
      }
    }

    // Get from object responses
    return responseBody?.usage?.total_tokens || 0;
  }
}
