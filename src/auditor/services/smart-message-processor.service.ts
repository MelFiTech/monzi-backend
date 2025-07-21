import { Injectable, Logger } from '@nestjs/common';
import { QueryAnalyzerService, UserQuery } from './query-analyzer.service';
import { QueryExecutorService, QueryIntent } from './query-executor.service';
import { ResponseGeneratorService } from './response-generator.service';
import { ResponseEnhancerService } from './response-enhancer.service';
import { GeminiApiService } from './gemini-api.service';

export interface SmartMessageContext {
  metrics?: any;
  userContext?: any;
  includeMetrics?: boolean;
}

export interface SmartMessageResult {
  response: string;
  metadata: {
    model: string;
    sessionId: string;
    timestamp: Date;
    userQuery: UserQuery;
    backendQueries: QueryIntent[];
    backendData: Record<string, any>;
    tokens?: {
      input_tokens: number;
      output_tokens: number;
    };
    error?: string;
  };
  backendQueries?: QueryIntent[];
}

@Injectable()
export class SmartMessageProcessorService {
  private readonly logger = new Logger(SmartMessageProcessorService.name);

  constructor(
    private readonly queryAnalyzer: QueryAnalyzerService,
    private readonly queryExecutor: QueryExecutorService,
    private readonly responseGenerator: ResponseGeneratorService,
    private readonly responseEnhancer: ResponseEnhancerService,
    private readonly geminiApiService: GeminiApiService,
  ) {}

  /**
   * Main method for processing smart messages
   */
  async processSmartMessage(
    message: string,
    sessionId: string,
    context?: SmartMessageContext,
  ): Promise<SmartMessageResult> {
    try {
      // Step 1: Analyze the user query to understand intent
      const userQuery = this.queryAnalyzer.analyzeUserQuery(message);
      this.logger.debug(`🔍 Query analyzed: ${userQuery.type}`);

      // Step 2: Generate query intents based on the analysis
      const queryIntents = this.queryExecutor.generateQueryIntents(userQuery);
      this.logger.debug(`📋 Generated ${queryIntents.length} query intents`);

      // Step 3: Execute backend queries
      let backendData = {};
      if (queryIntents.length > 0) {
        backendData = await this.queryExecutor.executeBackendQueries(queryIntents);
        this.logger.debug(`✅ Executed ${Object.keys(backendData).length} backend queries`);
      }

      // Step 4: Generate friendly, context-aware response
      const response = this.responseGenerator.generateComprehensiveResponse(
        message,
        userQuery,
        backendData,
        context
      );

      // Step 5: Enhance response with Gemini AI for natural language polish
      const enhancedResponse = await this.responseEnhancer.enhanceResponseWithAI(
        response,
        message,
        userQuery
      );

      return {
        response: enhancedResponse,
        metadata: {
          model: this.geminiApiService.getDefaultModel(),
          sessionId,
          timestamp: new Date(),
          userQuery,
          backendQueries: queryIntents,
          backendData,
        },
        backendQueries: queryIntents,
      };
    } catch (error) {
      this.logger.error('❌ Error in smart message processing:', error);

      // Fallback response
      return {
        response: "Sorry, I encountered an issue while processing your request. Please try again or ask me something else!",
        metadata: {
          model: this.geminiApiService.getDefaultModel(),
          sessionId,
          timestamp: new Date(),
          userQuery: { type: 'GENERAL_QUERY' },
          backendQueries: [],
          backendData: {},
          error: error.message,
        },
      };
    }
  }

  /**
   * Process user query with enhanced Gemini AI integration
   */
  async processQuery(message: string): Promise<string> {
    try {
      this.logger.log(`Processing query: ${message}`);

      // Step 1: Analyze the query
      const userQuery = this.queryAnalyzer.analyzeUserQuery(message);
      this.logger.log(`Query type: ${userQuery.type}`);

      // Step 2: Generate query intents based on the analysis
      const queryIntents = this.queryExecutor.generateQueryIntents(userQuery);

      // Step 3: Execute backend queries
      const backendData = await this.queryExecutor.executeBackendQueries(queryIntents);
      this.logger.log(`Backend data collected for ${Object.keys(backendData).length} endpoints`);

      // Step 4: Generate initial response
      const response = this.responseGenerator.generateComprehensiveResponse(
        message,
        userQuery,
        backendData
      );

      // Step 5: Enhance with Gemini AI
      const enhancedResponse = await this.responseEnhancer.enhanceResponseWithAI(
        response,
        message,
        userQuery
      );

      return enhancedResponse;
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`, error.stack);
      return `❌ Sorry, I encountered an error while processing your request. Please try again or contact support if the issue persists.\n\nError: ${error.message}`;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async processPrimeChatMessage(
    message: string,
    sessionId: string,
    context?: SmartMessageContext,
  ): Promise<{ response: string; metadata: any }> {
    const result = await this.processSmartMessage(message, sessionId, context);
    return {
      response: result.response,
      metadata: result.metadata,
    };
  }

  /**
   * Process multiple messages in batch
   */
  async processMultipleMessages(
    messages: Array<{
      message: string;
      sessionId: string;
      context?: SmartMessageContext;
    }>
  ): Promise<SmartMessageResult[]> {
    const results = await Promise.all(
      messages.map(({ message, sessionId, context }) =>
        this.processSmartMessage(message, sessionId, context)
      )
    );

    return results;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalProcessed: number;
    averageProcessingTime: number;
    successRate: number;
  } {
    // This would be implemented with actual metrics tracking
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 100,
    };
  }
}