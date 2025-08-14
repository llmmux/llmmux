import { Body, Controller, Logger, Post, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiProperty } from '@nestjs/swagger';
import { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { ChatCompletionRequest, CompletionRequest } from "../types";
import { ProxyService } from "./proxy.service";

class ChatCompletionDto {
  @ApiProperty({ description: 'Model name to use for completion', example: 'llama3.2:latest' })
  model: string;

  @ApiProperty({ 
    description: 'List of messages for the conversation',
    example: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ]
  })
  messages: Array<{ role: string; content: string }>;

  @ApiProperty({ 
    description: 'Whether to stream the response', 
    example: false, 
    required: false 
  })
  stream?: boolean;

  @ApiProperty({ 
    description: 'Maximum number of tokens to generate', 
    example: 150, 
    required: false 
  })
  max_tokens?: number;

  @ApiProperty({ 
    description: 'Temperature for sampling (0.0 to 2.0)', 
    example: 0.7, 
    required: false 
  })
  temperature?: number;

  @ApiProperty({ 
    description: 'Top-p sampling parameter', 
    example: 1.0, 
    required: false 
  })
  top_p?: number;
}

class CompletionDto {
  @ApiProperty({ description: 'Model name to use for completion', example: 'llama3.2:latest' })
  model: string;

  @ApiProperty({ description: 'The prompt to generate completions for', example: 'Once upon a time' })
  prompt: string;

  @ApiProperty({ 
    description: 'Whether to stream the response', 
    example: false, 
    required: false 
  })
  stream?: boolean;

  @ApiProperty({ 
    description: 'Maximum number of tokens to generate', 
    example: 150, 
    required: false 
  })
  max_tokens?: number;

  @ApiProperty({ 
    description: 'Temperature for sampling (0.0 to 2.0)', 
    example: 0.7, 
    required: false 
  })
  temperature?: number;

  @ApiProperty({ 
    description: 'Top-p sampling parameter', 
    example: 1.0, 
    required: false 
  })
  top_p?: number;
}

@ApiTags('Completions')
@Controller("v1")
@UseGuards(AuthGuard)
@ApiBearerAuth('ApiKeyAuth')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private proxyService: ProxyService) {}

  @Post("chat/completions")
  @ApiOperation({ 
    summary: 'Create chat completion',
    description: 'Generate a chat completion using the specified model. Supports both streaming and non-streaming responses.'
  })
  @ApiBody({ type: ChatCompletionDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Chat completion generated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'chatcmpl-abc123' },
            object: { type: 'string', example: 'chat.completion' },
            created: { type: 'number', example: 1642694400 },
            model: { type: 'string', example: 'llama3.2:latest' },
            choices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number', example: 0 },
                  message: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', example: 'assistant' },
                      content: { type: 'string', example: 'Hello! I am doing well, thank you for asking.' }
                    }
                  },
                  finish_reason: { type: 'string', example: 'stop' }
                }
              }
            },
            usage: {
              type: 'object',
              properties: {
                prompt_tokens: { type: 'number', example: 25 },
                completion_tokens: { type: 'number', example: 15 },
                total_tokens: { type: 'number', example: 40 }
              }
            }
          }
        }
      },
      'text/plain': {
        example: 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  @ApiResponse({ status: 403, description: 'Forbidden - Model not permitted for this API key' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
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
  @ApiOperation({ 
    summary: 'Create completion',
    description: 'Generate a text completion using the specified model. Supports both streaming and non-streaming responses.'
  })
  @ApiBody({ type: CompletionDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Completion generated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cmpl-abc123' },
            object: { type: 'string', example: 'text_completion' },
            created: { type: 'number', example: 1642694400 },
            model: { type: 'string', example: 'llama3.2:latest' },
            choices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string', example: ' in a land far, far away...' },
                  index: { type: 'number', example: 0 },
                  finish_reason: { type: 'string', example: 'stop' }
                }
              }
            },
            usage: {
              type: 'object',
              properties: {
                prompt_tokens: { type: 'number', example: 4 },
                completion_tokens: { type: 'number', example: 10 },
                total_tokens: { type: 'number', example: 14 }
              }
            }
          }
        }
      },
      'text/plain': {
        example: 'data: {"choices":[{"text":" in a land"}]}\n\ndata: [DONE]\n\n'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  @ApiResponse({ status: 403, description: 'Forbidden - Model not permitted for this API key' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
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
