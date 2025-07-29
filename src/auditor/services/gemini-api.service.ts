import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

@Injectable()
export class GeminiApiService {
  private readonly logger = new Logger(GeminiApiService.name);
  private readonly apiKey: string;
  private readonly baseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private readonly defaultModel = 'gemini-1.5-flash';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        '⚠️ Gemini API key not configured. AI features will be limited.',
      );
    }
  }

  /**
   * Send a message to Gemini API
   */
  async sendMessage(
    messages: GeminiMessage[],
    options?: GeminiOptions,
  ): Promise<{
    response: string;
    usage: { input_tokens: number; output_tokens: number };
  }> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const requestData = {
        contents: messages,
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 8000,
          topK: 32,
          topP: 1,
        },
        ...(options?.systemPrompt && {
          systemInstruction: {
            parts: [{ text: options.systemPrompt }],
          },
        }),
      };

      this.logger.debug('📤 Sending request to Gemini API');

      const response = await firstValueFrom(
        this.httpService.post<GeminiResponse>(
          `${this.baseUrl}?key=${this.apiKey}`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const geminiResponse = response.data;
      const responseText =
        geminiResponse.candidates[0]?.content?.parts[0]?.text || '';

      this.logger.debug('📥 Received response from Gemini API');

      return {
        response: responseText,
        usage: {
          input_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
          output_tokens:
            geminiResponse.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (error) {
      this.logger.error('❌ Error calling Gemini API:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Generate content using Gemini AI with a simple prompt
   */
  async generateContent(
    prompt: string,
    options?: GeminiOptions,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ];

      const result = await this.sendMessage(messages, {
        temperature: options?.temperature || 0.7,
        maxTokens: options?.maxTokens || 4000,
        ...options,
      });

      return result.response;
    } catch (error) {
      this.logger.error('❌ Error generating Gemini content:', error);
      throw error;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Check Gemini AI service health
   */
  async checkHealth(): Promise<{
    available: boolean;
    model: string;
    latency?: number;
    response?: string;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const testResponse = await this.generateContent(
        'Hello, this is a health check.',
      );
      const latency = Date.now() - startTime;

      return {
        available: true,
        model: 'Gemini AI',
        latency,
        response: testResponse ? 'OK' : 'No response',
      };
    } catch (error) {
      this.logger.error(`Gemini AI health check failed: ${error.message}`);
      return {
        available: false,
        model: 'Gemini AI',
        error: error.message,
      };
    }
  }
}
