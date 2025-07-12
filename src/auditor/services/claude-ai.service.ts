import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditorMessageRole, AuditorReportType, AuditorRiskLevel } from '../dto/auditor.dto';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable()
export class ClaudeAiService {
  private readonly logger = new Logger(ClaudeAiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('CLAUDE_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('⚠️ Claude API key not configured. Auditor system will be limited.');
    }
  }

  /**
   * Send a message to Claude API
   */
  async sendMessage(
    messages: ClaudeMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    },
  ): Promise<{ response: string; usage: { input_tokens: number; output_tokens: number } }> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const requestData = {
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 8000,
        temperature: options?.temperature || 0.7,
        messages: messages,
        ...(options?.systemPrompt && { system: options.systemPrompt }),
      };

      this.logger.debug('📤 Sending request to Claude API');
      this.logger.debug(`🤖 Model: ${requestData.model}`);
      this.logger.debug(`📝 Messages: ${messages.length}`);

      const response = await firstValueFrom(
        this.httpService.post<ClaudeResponse>(this.baseUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }),
      );

      const claudeResponse = response.data;
      const responseText = claudeResponse.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      this.logger.debug('📥 Received response from Claude API');
      this.logger.debug(`📊 Input tokens: ${claudeResponse.usage.input_tokens}`);
      this.logger.debug(`📊 Output tokens: ${claudeResponse.usage.output_tokens}`);

      return {
        response: responseText,
        usage: claudeResponse.usage,
      };
    } catch (error) {
      this.logger.error('❌ Error calling Claude API:', error);
      if (error.response?.data) {
        this.logger.error('📋 Claude API Error:', error.response.data);
      }
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Generate financial analysis
   */
  async generateFinancialAnalysis(
    metricsData: any,
    timeframe: string = 'last 30 days',
  ): Promise<{ summary: string; findings: any; recommendations: any; riskLevel: AuditorRiskLevel }> {
    const systemPrompt = `You are Prime, an AI financial auditor for a Nigerian fintech platform called Monzi. 
    Your role is to analyze financial data and provide insights, risk assessments, and recommendations.
    
    Focus on:
    - Transaction patterns and anomalies
    - User behavior analysis
    - Risk indicators
    - Compliance with Nigerian financial regulations
    - Fraud detection patterns
    - System performance metrics
    
    Provide structured responses with clear findings and actionable recommendations.
    Always assess risk levels as LOW, MEDIUM, HIGH, or CRITICAL.`;

    const userMessage = `Please analyze the following financial data for ${timeframe}:
    
    ${JSON.stringify(metricsData, null, 2)}
    
    Provide a comprehensive financial analysis including:
    1. Summary of key metrics
    2. Notable patterns or anomalies
    3. Risk assessment
    4. Compliance considerations
    5. Actionable recommendations
    
    Format your response as a structured JSON with the following fields:
    - summary: Brief overview
    - findings: Key discoveries and patterns
    - recommendations: Specific actions to take
    - riskLevel: Overall risk assessment (LOW/MEDIUM/HIGH/CRITICAL)`;

    const messages: ClaudeMessage[] = [
      { role: 'user', content: userMessage },
    ];

    const result = await this.sendMessage(messages, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 4000,
    });

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(result.response);
      return {
        summary: parsed.summary || 'Analysis completed',
        findings: parsed.findings || {},
        recommendations: parsed.recommendations || {},
        riskLevel: parsed.riskLevel || AuditorRiskLevel.LOW,
      };
    } catch {
      // If not JSON, structure the response manually
      return {
        summary: 'Financial analysis completed',
        findings: { analysis: result.response },
        recommendations: { note: 'See analysis for recommendations' },
        riskLevel: AuditorRiskLevel.LOW,
      };
    }
  }

  /**
   * Generate risk assessment
   */
  async generateRiskAssessment(
    userData: any,
    transactionData: any,
  ): Promise<{ summary: string; findings: any; recommendations: any; riskLevel: AuditorRiskLevel }> {
    const systemPrompt = `You are Prime, an AI risk assessment specialist for Monzi fintech platform.
    Analyze user behavior and transaction patterns to identify potential risks including:
    - Fraud indicators
    - Money laundering patterns
    - Unusual transaction behavior
    - Account takeover risks
    - Compliance violations
    
    Assess risk levels accurately and provide specific mitigation strategies.`;

    const userMessage = `Analyze the following data for risk assessment:
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    Transaction Data:
    ${JSON.stringify(transactionData, null, 2)}
    
    Provide a comprehensive risk assessment with:
    1. Risk summary
    2. Specific risk indicators found
    3. Mitigation recommendations
    4. Overall risk level
    
    Format as structured JSON with summary, findings, recommendations, and riskLevel fields.`;

    const messages: ClaudeMessage[] = [
      { role: 'user', content: userMessage },
    ];

    const result = await this.sendMessage(messages, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 3000,
    });

    try {
      const parsed = JSON.parse(result.response);
      return {
        summary: parsed.summary || 'Risk assessment completed',
        findings: parsed.findings || {},
        recommendations: parsed.recommendations || {},
        riskLevel: parsed.riskLevel || AuditorRiskLevel.LOW,
      };
    } catch {
      return {
        summary: 'Risk assessment completed',
        findings: { analysis: result.response },
        recommendations: { note: 'See analysis for recommendations' },
        riskLevel: AuditorRiskLevel.MEDIUM,
      };
    }
  }

  /**
   * Process Prime chat message
   */
  async processPrimeChatMessage(
    message: string,
    sessionId: string,
    context?: {
      metrics?: any;
      userContext?: any;
      includeMetrics?: boolean;
    },
  ): Promise<{ response: string; metadata: any }> {
    const systemPrompt = `You are Prime, the AI auditor for Monzi, a Nigerian fintech platform.
    You are knowledgeable about:
    - Financial regulations in Nigeria
    - Fintech operations and best practices
    - Risk management and fraud detection
    - Data analysis and metrics interpretation
    - Compliance and audit procedures
    
    Provide helpful, accurate, and actionable insights. Always be professional and thorough.
    When discussing financial data, be specific and analytical.
    
    Current session: ${sessionId}`;

    let userMessage = message;
    
    if (context?.includeMetrics && context?.metrics) {
      userMessage += `\n\nCurrent system metrics:\n${JSON.stringify(context.metrics, null, 2)}`;
    }

    const messages: ClaudeMessage[] = [
      { role: 'user', content: userMessage },
    ];

    const result = await this.sendMessage(messages, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return {
      response: result.response,
      metadata: {
        sessionId,
        tokens: result.usage,
        timestamp: new Date(),
        includeMetrics: context?.includeMetrics || false,
      },
    };
  }

  /**
   * Generate compliance audit report
   */
  async generateComplianceAudit(
    systemData: any,
  ): Promise<{ summary: string; findings: any; recommendations: any; riskLevel: AuditorRiskLevel }> {
    const systemPrompt = `You are Prime, a compliance auditor for Monzi fintech platform.
    Focus on Nigerian financial regulations including:
    - CBN (Central Bank of Nigeria) regulations
    - KYC/AML compliance
    - Payment system regulations
    - Data protection requirements
    - Consumer protection guidelines
    
    Identify compliance gaps and provide specific remediation steps.`;

    const userMessage = `Review the following system data for compliance audit:
    
    ${JSON.stringify(systemData, null, 2)}
    
    Provide a comprehensive compliance audit covering:
    1. Regulatory compliance status
    2. Identified compliance gaps
    3. Risk exposure
    4. Remediation recommendations
    5. Overall compliance risk level
    
    Format as structured JSON with summary, findings, recommendations, and riskLevel fields.`;

    const messages: ClaudeMessage[] = [
      { role: 'user', content: userMessage },
    ];

    const result = await this.sendMessage(messages, {
      systemPrompt,
      temperature: 0.1,
      maxTokens: 4000,
    });

    try {
      const parsed = JSON.parse(result.response);
      return {
        summary: parsed.summary || 'Compliance audit completed',
        findings: parsed.findings || {},
        recommendations: parsed.recommendations || {},
        riskLevel: parsed.riskLevel || AuditorRiskLevel.LOW,
      };
    } catch {
      return {
        summary: 'Compliance audit completed',
        findings: { analysis: result.response },
        recommendations: { note: 'See analysis for recommendations' },
        riskLevel: AuditorRiskLevel.LOW,
      };
    }
  }

  /**
   * Check Claude API health
   */
  async checkHealth(): Promise<{ available: boolean; model: string; latency?: number }> {
    if (!this.apiKey) {
      return { available: false, model: 'N/A' };
    }

    try {
      const startTime = Date.now();
      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Health check - please respond with "OK"' },
      ];

      await this.sendMessage(messages, {
        maxTokens: 100,
        temperature: 0,
      });

      const latency = Date.now() - startTime;
      
      return {
        available: true,
        model: this.defaultModel,
        latency,
      };
    } catch (error) {
      this.logger.error('❌ Claude health check failed:', error);
      return {
        available: false,
        model: this.defaultModel,
      };
    }
  }
} 