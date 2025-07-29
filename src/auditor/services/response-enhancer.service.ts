import { Injectable, Logger } from '@nestjs/common';
import { GeminiApiService, GeminiMessage } from './gemini-api.service';
import { UserQuery } from './query-analyzer.service';

@Injectable()
export class ResponseEnhancerService {
  private readonly logger = new Logger(ResponseEnhancerService.name);

  constructor(private readonly geminiApiService: GeminiApiService) {}

  /**
   * Enhance response with Gemini AI for natural language polish
   */
  async enhanceResponseWithAI(
    structuredResponse: string,
    originalMessage: string,
    userQuery: UserQuery,
  ): Promise<string> {
    // If no API key, return structured response as is
    if (!this.geminiApiService.isConfigured()) {
      return structuredResponse;
    }

    try {
      const systemPrompt = this.buildSystemPrompt(originalMessage, userQuery);

      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: structuredResponse }],
        },
      ];

      const result = await this.geminiApiService.sendMessage(messages, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      return result.response || structuredResponse;
    } catch (error) {
      this.logger.warn(
        '⚠️ Failed to enhance response with AI, using structured response',
      );
      return structuredResponse;
    }
  }

  /**
   * Build system prompt for response enhancement
   */
  private buildSystemPrompt(
    originalMessage: string,
    userQuery: UserQuery,
  ): string {
    return `You are Prime, a friendly AI assistant for the Monzi fintech platform. 

Your job is to take a structured response and make it sound more natural and conversational while keeping all the important information.

Guidelines:
- Keep all data, numbers, and facts exactly as provided
- Make the tone friendly and helpful
- Use natural language flow
- Keep emojis but don't overuse them
- Maintain the bullet points and structure where helpful
- Add encouraging phrases and helpful suggestions
- Make it sound like you're talking to a friend

The user asked: "${originalMessage}"
Query type: ${userQuery.type}

Take the structured response below and make it sound more natural and friendly:`;
  }

  /**
   * Enhance multiple responses in batch
   */
  async enhanceMultipleResponses(
    responses: Array<{
      structuredResponse: string;
      originalMessage: string;
      userQuery: UserQuery;
    }>,
  ): Promise<string[]> {
    const enhancedResponses = await Promise.all(
      responses.map(({ structuredResponse, originalMessage, userQuery }) =>
        this.enhanceResponseWithAI(
          structuredResponse,
          originalMessage,
          userQuery,
        ),
      ),
    );

    return enhancedResponses;
  }
}
