import { Test, TestingModule } from '@nestjs/testing';
import { ResponseTransformerService } from './response-transformer.service';

describe('ResponseTransformerService', () => {
  let service: ResponseTransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseTransformerService],
    }).compile();

    service = module.get<ResponseTransformerService>(ResponseTransformerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transformGptOssResponse', () => {
    it('should return response unchanged for non-GPT-OSS models', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I assist you today?',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = service.transformGptOssResponse(response as any);
      expect(result).toEqual(response);
    });

    it('should transform GPT-OSS responses', () => {
      const gptOssResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-oss-test',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response from GPT-OSS model',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = service.transformGptOssResponse(gptOssResponse as any);
      expect(result.model).toBe('gpt-oss-test');
      expect(result.choices).toBeDefined();
    });

    it('should handle responses with tool calls', () => {
      const responseWithTools = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-oss-function',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location": "Boston"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };

      const result = service.transformGptOssResponse(responseWithTools as any);
      expect(result.choices[0].message.tool_calls).toBeDefined();
    });

    it('should handle empty or malformed responses gracefully', () => {
      const emptyResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-oss-empty',
        choices: [],
      };

      const result = service.transformGptOssResponse(emptyResponse as any);
      expect(result.choices).toEqual([]);
    });
  });
});
