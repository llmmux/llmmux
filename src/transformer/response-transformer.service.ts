import { Injectable, Logger } from "@nestjs/common";

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: any;
}

@Injectable()
export class ResponseTransformerService {
  private readonly logger = new Logger(ResponseTransformerService.name);

  /**
   * Transform GPT-OSS non-standard tool calling format to OpenAI-compatible format
   */
  transformGptOssResponse(
    response: ChatCompletionResponse,
  ): ChatCompletionResponse {
    // Only process GPT-OSS models
    if (!response.model.includes("gpt-oss")) {
      return response;
    }

    const transformedResponse = { ...response };

    // Process each choice
    transformedResponse.choices = response.choices.map((choice, index) => {
      const transformedChoice = { ...choice };

      if (
        choice.message.content &&
        this.containsToolCall(choice.message.content)
      ) {
        try {
          const toolCalls = this.parseToolCallsFromContent(
            choice.message.content,
          );

          if (toolCalls.length > 0) {
            // Set tool_calls and clear content
            transformedChoice.message = {
              ...choice.message,
              content: null,
              tool_calls: toolCalls,
            };

            // Update finish_reason if it was about tool calling
            if (
              choice.finish_reason === "stop" ||
              choice.finish_reason === "length"
            ) {
              transformedChoice.finish_reason = "tool_calls";
            }

            this.logger.log(
              `Transformed GPT-OSS tool calls for choice ${index}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to parse tool calls from GPT-OSS response: ${error.message}`,
          );
          // Keep original response if parsing fails
        }
      }

      return transformedChoice;
    });

    return transformedResponse;
  }

  /**
   * Check if content contains tool call JSON
   */
  private containsToolCall(content: string): boolean {
    // Look for patterns like {"name": "function_name", "arguments": {...}} or [{"name": "function_name", "parameters": {...}}]
    const singleToolCallPattern =
      /\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{/;
    const arrayToolCallPattern =
      /\[\s*\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"(parameters|arguments)"\s*:\s*\{/;
    return (
      singleToolCallPattern.test(content) || arrayToolCallPattern.test(content)
    );
  }

  /**
   * Parse tool calls from GPT-OSS content format
   */
  private parseToolCallsFromContent(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    try {
      // Clean up the content - remove extra whitespace and newlines
      const cleanedContent = content.replace(/\s+/g, " ").trim();

      let parsedTools: any[];

      // Check if it's a single object or array
      if (cleanedContent.startsWith("[")) {
        // Array format: [{"name": "func", "parameters": {...}}]
        const jsonMatch = cleanedContent.match(/\[(.*)\]/);
        if (!jsonMatch) {
          return [];
        }
        const jsonStr = `[${jsonMatch[1]}]`;
        parsedTools = JSON.parse(jsonStr);
      } else {
        // Single object format: {"name": "func", "arguments": {...}}
        parsedTools = [JSON.parse(cleanedContent)];
      }

      if (Array.isArray(parsedTools)) {
        parsedTools.forEach((tool, _index) => {
          // Handle both "parameters" and "arguments" keys
          const params = tool.parameters || tool.arguments;
          if (tool.name && params) {
            const toolCall: ToolCall = {
              id: `call_${this.generateId()}`,
              type: "function",
              function: {
                name: tool.name,
                arguments: JSON.stringify(params),
              },
            };
            toolCalls.push(toolCall);
          }
        });
      }
    } catch (error) {
      this.logger.warn(`Error parsing tool calls: ${error.message}`);
    }

    return toolCalls;
  }

  /**
   * Generate a unique ID for tool calls
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
