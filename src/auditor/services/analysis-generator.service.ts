import { Injectable, Logger } from '@nestjs/common';
import { GeminiApiService } from './gemini-api.service';
import { AuditorRiskLevel } from '../dto/auditor.dto';

@Injectable()
export class AnalysisGeneratorService {
  private readonly logger = new Logger(AnalysisGeneratorService.name);

  constructor(private readonly geminiApiService: GeminiApiService) {}

  /**
   * Generate financial analysis using Gemini AI
   */
  async generateFinancialAnalysis(systemData: any): Promise<{
    summary: string;
    findings: any;
    recommendations: any;
    riskLevel: AuditorRiskLevel;
  }> {
    try {
      const prompt = this.buildFinancialAnalysisPrompt(systemData);
      const response = await this.geminiApiService.generateContent(prompt);

      // Try to parse structured response
      try {
        const parsed = JSON.parse(response);
        return {
          summary: parsed.summary || 'Financial analysis completed',
          findings: parsed.findings || { analysis: response },
          recommendations: parsed.recommendations || {
            note: 'See analysis for recommendations',
          },
          riskLevel: parsed.riskLevel || AuditorRiskLevel.LOW,
        };
      } catch {
        // Fallback to unstructured response
        return {
          summary: 'Financial analysis completed',
          findings: {
            analysis:
              response || 'Unable to generate financial analysis at this time.',
          },
          recommendations: { note: 'See analysis for recommendations' },
          riskLevel: AuditorRiskLevel.LOW,
        };
      }
    } catch (error) {
      this.logger.error(
        `Error generating financial analysis: ${error.message}`,
      );
      return {
        summary: 'Error generating financial analysis',
        findings: { error: error.message },
        recommendations: { note: 'Please try again or contact support' },
        riskLevel: AuditorRiskLevel.LOW,
      };
    }
  }

  /**
   * Generate risk assessment using Gemini AI
   */
  async generateRiskAssessment(systemData: any): Promise<{
    summary: string;
    findings: any;
    recommendations: any;
    riskLevel: AuditorRiskLevel;
  }> {
    try {
      const prompt = this.buildRiskAssessmentPrompt(systemData);
      const response = await this.geminiApiService.generateContent(prompt);

      try {
        const parsed = JSON.parse(response);
        return {
          summary: parsed.summary || 'Risk assessment completed',
          findings: parsed.findings || { analysis: response },
          recommendations: parsed.recommendations || {
            note: 'See analysis for recommendations',
          },
          riskLevel: parsed.riskLevel || AuditorRiskLevel.MEDIUM,
        };
      } catch {
        return {
          summary: 'Risk assessment completed',
          findings: {
            analysis:
              response || 'Unable to generate risk assessment at this time.',
          },
          recommendations: { note: 'See analysis for recommendations' },
          riskLevel: AuditorRiskLevel.MEDIUM,
        };
      }
    } catch (error) {
      this.logger.error(`Error generating risk assessment: ${error.message}`);
      return {
        summary: 'Error generating risk assessment',
        findings: { error: error.message },
        recommendations: { note: 'Please try again or contact support' },
        riskLevel: AuditorRiskLevel.LOW,
      };
    }
  }

  /**
   * Generate compliance audit using Gemini AI
   */
  async generateComplianceAudit(systemData: any): Promise<{
    summary: string;
    findings: any;
    recommendations: any;
    riskLevel: AuditorRiskLevel;
  }> {
    try {
      const prompt = this.buildComplianceAuditPrompt(systemData);
      const response = await this.geminiApiService.generateContent(prompt);

      try {
        const parsed = JSON.parse(response);
        return {
          summary: parsed.summary || 'Compliance audit completed',
          findings: parsed.findings || { analysis: response },
          recommendations: parsed.recommendations || {
            note: 'See analysis for recommendations',
          },
          riskLevel: parsed.riskLevel || AuditorRiskLevel.LOW,
        };
      } catch {
        return {
          summary: 'Compliance audit completed',
          findings: {
            analysis:
              response || 'Unable to generate compliance audit at this time.',
          },
          recommendations: { note: 'See analysis for recommendations' },
          riskLevel: AuditorRiskLevel.LOW,
        };
      }
    } catch (error) {
      this.logger.error(`Error generating compliance audit: ${error.message}`);
      return {
        summary: 'Error generating compliance audit',
        findings: { error: error.message },
        recommendations: { note: 'Please try again or contact support' },
        riskLevel: AuditorRiskLevel.LOW,
      };
    }
  }

  /**
   * Generate system health analysis
   */
  async generateSystemHealthAnalysis(systemData: any): Promise<string> {
    try {
      const prompt = this.buildSystemHealthPrompt(systemData);
      const response = await this.geminiApiService.generateContent(prompt);
      return (
        response || 'Unable to generate system health analysis at this time.'
      );
    } catch (error) {
      this.logger.error(
        `Error generating system health analysis: ${error.message}`,
      );
      return '❌ Error generating system health analysis. Please try again.';
    }
  }

  /**
   * Build financial analysis prompt
   */
  private buildFinancialAnalysisPrompt(systemData: any): string {
    return `Analyze the following financial system data and provide insights:

System Data:
${JSON.stringify(systemData, null, 2)}

Please provide:
1. Key financial metrics
2. Transaction patterns
3. Revenue trends
4. User engagement insights
5. Recommendations for improvement

Format the response in a clear, bullet-pointed manner with actionable insights.`;
  }

  /**
   * Build risk assessment prompt
   */
  private buildRiskAssessmentPrompt(systemData: any): string {
    return `Assess the risk profile of the following financial system data:

System Data:
${JSON.stringify(systemData, null, 2)}

Please provide:
1. Risk factors identified
2. Risk level assessment (Low/Medium/High)
3. Specific concerns and vulnerabilities
4. Fraud indicators
5. Mitigation recommendations
6. Monitoring suggestions

Format the response in a clear, bullet-pointed manner with specific risk scores where applicable.`;
  }

  /**
   * Build compliance audit prompt
   */
  private buildComplianceAuditPrompt(systemData: any): string {
    return `Conduct a compliance audit of the following financial system data:

System Data:
${JSON.stringify(systemData, null, 2)}

Please provide:
1. Compliance requirements check (Nigerian financial regulations)
2. Potential violations or gaps
3. KYC/AML compliance status
4. Data protection compliance
5. Regulatory considerations
6. Compliance recommendations
7. Action items for improvement

Format the response in a clear, bullet-pointed manner with priority levels.`;
  }

  /**
   * Build system health analysis prompt
   */
  private buildSystemHealthPrompt(systemData: any): string {
    return `Analyze the system health based on the following data:

System Data:
${JSON.stringify(systemData, null, 2)}

Please provide:
1. Overall system health score
2. Performance indicators
3. Error rates and patterns
4. System bottlenecks
5. Uptime analysis
6. Resource utilization
7. Recommendations for optimization

Format the response in a clear, bullet-pointed manner with specific metrics and scores.`;
  }

  /**
   * Generate custom analysis based on provided prompt template
   */
  async generateCustomAnalysis(
    systemData: any,
    analysisType: string,
    customPrompt?: string,
  ): Promise<string> {
    try {
      const prompt =
        customPrompt ||
        this.buildGenericAnalysisPrompt(systemData, analysisType);
      const response = await this.geminiApiService.generateContent(prompt);
      return (
        response || `Unable to generate ${analysisType} analysis at this time.`
      );
    } catch (error) {
      this.logger.error(
        `Error generating ${analysisType} analysis: ${error.message}`,
      );
      return `❌ Error generating ${analysisType} analysis. Please try again.`;
    }
  }

  /**
   * Build generic analysis prompt
   */
  private buildGenericAnalysisPrompt(
    systemData: any,
    analysisType: string,
  ): string {
    return `Perform a ${analysisType} analysis on the following system data:

System Data:
${JSON.stringify(systemData, null, 2)}

Please provide comprehensive insights and recommendations based on the data.
Format the response in a clear, bullet-pointed manner.`;
  }
}
