import { Body, Controller, Logger, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { ChatCompletionRequest, CompletionRequest } from "../types";
import { ProxyService } from "./proxy.service";

@Controller("v1")
@UseGuards(AuthGuard)
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private proxyService: ProxyService) {}

  @Post("chat/completions")
  async chatCompletions(
    @Body() body: ChatCompletionRequest,
    @Res() response: Response,
  ) {
    try {
      this.logger.log(`Chat completion request for model: ${body.model}`);

      if (body.stream) {
        // For streaming responses, we handle the response directly
        await this.proxyService.proxyChatCompletion(body, response);
      } else {
        // For non-streaming responses, return JSON
        const result = await this.proxyService.proxyChatCompletion(
          body,
          response,
        );
        response.json(result);
      }
    } catch (error) {
      this.logger.error(`Chat completion error: ${error.message}`, error.stack);
      response.status(500).json({
        error: "Internal server error",
        message: error.message,
        details: error.response?.data || error.toString(),
      });
    }
  }

  @Post("completions")
  async completions(
    @Body() body: CompletionRequest,
    @Res() response: Response,
  ) {
    this.logger.log(`Completion request for model: ${body.model}`);

    if (body.stream) {
      // For streaming responses, we handle the response directly
      await this.proxyService.proxyCompletion(body, response);
    } else {
      // For non-streaming responses, return JSON
      const result = await this.proxyService.proxyCompletion(body, response);
      response.json(result);
    }
  }
}
