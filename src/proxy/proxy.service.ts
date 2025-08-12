import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { ConfigurationService } from "../config/configuration.service";
import { ResponseTransformerService } from "../transformer/response-transformer.service";
import { ChatCompletionRequest, CompletionRequest } from "../types";

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private configurationService: ConfigurationService,
    private responseTransformerService: ResponseTransformerService,
  ) {}

  async proxyChatCompletion(request: ChatCompletionRequest, response: any) {
    const backend = this.configurationService.getBackendForModel(request.model);

    if (!backend) {
      throw new NotFoundException(`Model '${request.model}' not found`);
    }

    const targetUrl = `${backend.baseUrl}/chat/completions`;

    try {
      this.logger.log(
        `Proxying chat completion request to ${targetUrl} for model ${request.model}`,
      );

      if (request.stream) {
        return this.handleStreamingRequest(targetUrl, request, response);
      } else {
        return this.handleNonStreamingRequest(targetUrl, request);
      }
    } catch (error) {
      this.logger.error(
        `Error proxying request to ${targetUrl}:`,
        error.message,
      );
      throw new BadRequestException(
        `Failed to proxy request: ${error.message}`,
      );
    }
  }

  async proxyCompletion(request: CompletionRequest, response: any) {
    const backend = this.configurationService.getBackendForModel(request.model);

    if (!backend) {
      throw new NotFoundException(`Model '${request.model}' not found`);
    }

    const targetUrl = `${backend.baseUrl}/completions`;

    try {
      this.logger.log(
        `Proxying completion request to ${targetUrl} for model ${request.model}`,
      );

      if (request.stream) {
        return this.handleStreamingRequest(targetUrl, request, response);
      } else {
        return this.handleNonStreamingRequest(targetUrl, request);
      }
    } catch (error) {
      this.logger.error(
        `Error proxying request to ${targetUrl}:`,
        error.message,
      );
      throw new BadRequestException(
        `Failed to proxy request: ${error.message}`,
      );
    }
  }

  private async handleNonStreamingRequest(
    targetUrl: string,
    requestBody: any,
  ): Promise<any> {
    const axiosResponse: AxiosResponse = await axios.post(
      targetUrl,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120000, // 2 minutes timeout
      },
    );

    let responseData = axiosResponse.data;

    // Check if this is a GPT-OSS model response that needs transformation
    if (requestBody.model && requestBody.model.includes("gpt-oss")) {
      responseData =
        this.responseTransformerService.transformGptOssResponse(responseData);
    }

    return responseData;
  }

  private async handleStreamingRequest(
    targetUrl: string,
    requestBody: any,
    response: any,
  ): Promise<void> {
    try {
      const axiosResponse = await axios.post(targetUrl, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
        responseType: "stream",
        timeout: 120000, // 2 minutes timeout
      });

      // Set appropriate headers for streaming
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache");
      response.setHeader("Connection", "keep-alive");

      // Forward the stream
      axiosResponse.data.pipe(response);

      // Handle stream events
      axiosResponse.data.on("error", (error) => {
        this.logger.error("Stream error:", error);
        if (!response.headersSent) {
          response.status(500).json({ error: "Stream error" });
        }
      });

      axiosResponse.data.on("end", () => {
        this.logger.log("Stream completed successfully");
      });
    } catch (error) {
      this.logger.error("Streaming request failed:", error.message);
      if (!response.headersSent) {
        response.status(500).json({ error: "Streaming request failed" });
      }
    }
  }
}
