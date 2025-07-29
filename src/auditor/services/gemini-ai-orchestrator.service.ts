import { Injectable, Logger } from '@nestjs/common';
import {
  SmartMessageProcessorService,
  SmartMessageContext,
} from './smart-message-processor.service';
import { AnalysisGeneratorService } from './analysis-generator.service';
import { GeminiApiService } from './gemini-api.service';
import { QueryIntent } from './query-executor.service';

@Injectable()
export class GeminiAiOrchestratorService {
  private readonly logger = new Logger(GeminiAiOrchestratorService.name);

  constructor(
    private readonly smartMessageProcessor: SmartMessageProcessorService,
    private readonly analysisGenerator: AnalysisGeneratorService,
    private readonly geminiApiService: GeminiApiService,
  ) {}

  /**
   * Main method for processing smart messages
   */
  async processSmartMessage(
    message: string,
    sessionId: string,
    context?: SmartMessageContext,
  ): Promise<{
    response: string;
    metadata: any;
    backendQueries?: QueryIntent[];
  }> {
    const result = await this.smartMessageProcessor.processSmartMessage(
      message,
      sessionId,
      context,
    );
    return {
      response: result.response,
      metadata: result.metadata,
      backendQueries: result.backendQueries,
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  async processPrimeChatMessage(
    message: string,
    sessionId: string,
    context?: SmartMessageContext,
  ): Promise<{ response: string; metadata: any }> {
    const result = await this.smartMessageProcessor.processPrimeChatMessage(
      message,
      sessionId,
      context,
    );
    return {
      response: result.response,
      metadata: result.metadata,
    };
  }

  /**
   * Process user query with enhanced Gemini AI integration
   */
  async processQuery(message: string): Promise<string> {
    return await this.smartMessageProcessor.processQuery(message);
  }

  /**
   * Generate financial analysis using Gemini AI
   */
  async generateFinancialAnalysis(systemData: any): Promise<{
    summary: string;
    findings: any;
    recommendations: any;
    riskLevel: any;
  }> {
    return await this.analysisGenerator.generateFinancialAnalysis(systemData);
  }

  /**
   * Generate risk assessment using Gemini AI
   */
  async generateRiskAssessment(systemData: any): Promise<{
    summary: string;
    findings: any;
    recommendations: any;
    riskLevel: any;
  }> {
    return await this.analysisGenerator.generateRiskAssessment(systemData);
  }

  /**
   * Generate compliance audit using Gemini AI
   */
  async generateComplianceAudit(systemData: any): Promise<{
    summary: string;
    findings: any;
    recommendations: any;
    riskLevel: any;
  }> {
    return await this.analysisGenerator.generateComplianceAudit(systemData);
  }

  /**
   * Generate system health analysis
   */
  async generateSystemHealthAnalysis(systemData: any): Promise<string> {
    return await this.analysisGenerator.generateSystemHealthAnalysis(
      systemData,
    );
  }

  /**
   * Generate custom analysis
   */
  async generateCustomAnalysis(
    systemData: any,
    analysisType: string,
    customPrompt?: string,
  ): Promise<string> {
    return await this.analysisGenerator.generateCustomAnalysis(
      systemData,
      analysisType,
      customPrompt,
    );
  }

  /**
   * Check Gemini AI service health
   */
  async checkHealth(): Promise<any> {
    return await this.geminiApiService.checkHealth();
  }

  /**
   * Check if Gemini API is configured
   */
  isConfigured(): boolean {
    return this.geminiApiService.isConfigured();
  }

  /**
   * Get default model name
   */
  getDefaultModel(): string {
    return this.geminiApiService.getDefaultModel();
  }
}
