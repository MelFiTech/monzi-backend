import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiAiOrchestratorService } from './services/gemini-ai-orchestrator.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import {
  CreateAuditorConfigurationDto,
  UpdateAuditorConfigurationDto,
  PrimeChatMessageDto,
  GenerateAuditorReportDto,
  AnalysisRequestDto,
  CreateAuditorMetricsDto,
  CollectMetricsDto,
  AuditorResponse,
  PrimeChatResponse,
  AnalysisResponse,
  HealthCheckResponse,
  AuditorMessageRole,
  AuditorReportType,
  AuditorRiskLevel,
} from './dto/auditor.dto';

@Controller('admin/auditor')
export class AuditorController {
  private readonly logger = new Logger(AuditorController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiAiService: GeminiAiOrchestratorService,
    private readonly metricsCollectorService: MetricsCollectorService,
  ) {}

  /**
   * Create auditor configuration
   */
  @Post('config')
  async createConfiguration(
    @Body() dto: CreateAuditorConfigurationDto,
  ): Promise<AuditorResponse> {
    try {
      const config = await this.prisma.auditorConfiguration.create({
        data: {
          name: dto.name,
          description: dto.description,
          model: dto.model || 'claude-3-5-sonnet-20241022',
          temperature: dto.temperature || 0.7,
          maxTokens: dto.maxTokens || 8000,
          systemPrompt: dto.systemPrompt,
          isActive: dto.isActive ?? true,
          encryptionKey: dto.encryptionKey,
        },
      });

      this.logger.log(`✅ Created auditor configuration: ${config.name}`);

      return {
        success: true,
        message: 'Auditor configuration created successfully',
        data: config,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error creating auditor configuration:', error);
      throw new HttpException(
        'Failed to create auditor configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get auditor configuration
   */
  @Get('config/:id')
  async getConfiguration(@Param('id') id: string): Promise<AuditorResponse> {
    try {
      const config = await this.prisma.auditorConfiguration.findUnique({
        where: { id },
        include: {
          chats: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!config) {
        throw new HttpException(
          'Configuration not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'Configuration retrieved successfully',
        data: config,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error getting auditor configuration:', error);
      throw new HttpException(
        'Failed to get auditor configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update auditor configuration
   */
  @Put('config/:id')
  async updateConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdateAuditorConfigurationDto,
  ): Promise<AuditorResponse> {
    try {
      const config = await this.prisma.auditorConfiguration.update({
        where: { id },
        data: dto,
      });

      this.logger.log(`✅ Updated auditor configuration: ${config.name}`);

      return {
        success: true,
        message: 'Configuration updated successfully',
        data: config,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error updating auditor configuration:', error);
      throw new HttpException(
        'Failed to update auditor configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all configurations
   */
  @Get('config')
  async getAllConfigurations(): Promise<AuditorResponse> {
    try {
      const configs = await this.prisma.auditorConfiguration.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { chats: true },
          },
        },
      });

      return {
        success: true,
        message: 'Configurations retrieved successfully',
        data: configs,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error getting auditor configurations:', error);
      throw new HttpException(
        'Failed to get auditor configurations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Prime chat endpoint
   */
  @Post('prime/message')
  async primeChatMessage(
    @Body() dto: PrimeChatMessageDto,
  ): Promise<PrimeChatResponse> {
    try {
      this.logger.log(
        `🤖 Prime chat message: ${dto.message.substring(0, 100)}...`,
      );

      let sessionId = dto.sessionId;
      let chat;

      if (sessionId) {
        // Find existing chat
        chat = await this.prisma.auditorChat.findUnique({
          where: { sessionId },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      }

      if (!chat) {
        // Create new chat session
        sessionId = `prime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Get or create default configuration
        let config = await this.prisma.auditorConfiguration.findFirst({
          where: { isActive: true },
        });

        if (!config) {
          config = await this.prisma.auditorConfiguration.create({
            data: {
              name: 'Default Prime Configuration',
              description: 'Default configuration for Prime AI auditor',
              model: 'gemini-1.5-flash',
              temperature: 0.7,
              maxTokens: 8000,
              isActive: true,
            },
          });
        }

        chat = await this.prisma.auditorChat.create({
          data: {
            title: `Prime Chat - ${new Date().toLocaleDateString()}`,
            configId: config.id,
            adminUserId: 'system', // TODO: Get from JWT token
            sessionId,
            isActive: true,
          },
          include: {
            messages: true,
          },
        });
      }

      // Store user message
      await this.prisma.auditorMessage.create({
        data: {
          chatId: chat.id,
          role: AuditorMessageRole.USER,
          content: dto.message,
          metadata: {
            includeMetrics: dto.includeMetrics,
            generateReport: dto.generateReport,
          },
        },
      });

      // Get metrics if requested
      let metrics = null;
      if (dto.includeMetrics) {
        metrics = await this.metricsCollectorService.getRealTimeMetrics();
      }

      // Process message with enhanced Gemini AI
      const geminiResponse = await this.geminiAiService.processSmartMessage(
        dto.message,
        sessionId,
        {
          metrics,
          includeMetrics: dto.includeMetrics,
        },
      );

      // Store Gemini response
      await this.prisma.auditorMessage.create({
        data: {
          chatId: chat.id,
          role: AuditorMessageRole.ASSISTANT,
          content: geminiResponse.response,
          metadata: geminiResponse.metadata,
          tokens:
            geminiResponse.metadata.tokens?.input_tokens +
            geminiResponse.metadata.tokens?.output_tokens,
        },
      });

      // Generate report if requested
      if (dto.generateReport) {
        await this.prisma.auditorReport.create({
          data: {
            chatId: chat.id,
            type: AuditorReportType.SYSTEM_HEALTH,
            title: 'Prime Chat Report',
            content: geminiResponse.response,
            summary: 'Report generated from Prime chat interaction',
            riskLevel: AuditorRiskLevel.LOW,
          },
        });
      }

      this.logger.log(
        `✅ Prime chat response generated for session: ${sessionId}`,
      );

      return {
        success: true,
        message: 'Prime chat response generated successfully',
        response: geminiResponse.response,
        sessionId,
        chatId: chat.id,
        metadata: geminiResponse.metadata,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error in Prime chat:', error);
      throw new HttpException(
        'Failed to process Prime chat message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get Prime chat history
   */
  @Get('prime/history/:sessionId')
  async getPrimeChatHistory(
    @Param('sessionId') sessionId: string,
  ): Promise<AuditorResponse> {
    try {
      const chat = await this.prisma.auditorChat.findUnique({
        where: { sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          reports: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!chat) {
        throw new HttpException('Chat session not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'Chat history retrieved successfully',
        data: chat,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error getting Prime chat history:', error);
      throw new HttpException(
        'Failed to get Prime chat history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate analysis report
   */
  @Post('analyze')
  async generateAnalysis(
    @Body() dto: AnalysisRequestDto,
  ): Promise<AnalysisResponse> {
    try {
      this.logger.log(`📊 Generating ${dto.type} analysis`);

      let analysisResult;

      if (dto.type === AuditorReportType.FINANCIAL_ANALYSIS) {
        const metrics = await this.metricsCollectorService.collectMetrics(
          dto.timeframe || 'last_30_days',
          'daily',
        );
        analysisResult =
          await this.geminiAiService.generateFinancialAnalysis(metrics);
      } else if (dto.type === AuditorReportType.RISK_ASSESSMENT) {
        // Get user and transaction data
        const userData = dto.userIds
          ? await this.getUserData(dto.userIds)
          : null;
        const transactionData = dto.transactionIds
          ? await this.getTransactionData(dto.transactionIds)
          : null;

        analysisResult = await this.geminiAiService.generateRiskAssessment({
          userData,
          transactionData,
        });
      } else if (dto.type === AuditorReportType.COMPLIANCE_AUDIT) {
        const systemData = await this.getSystemData();
        analysisResult =
          await this.geminiAiService.generateComplianceAudit(systemData);
      } else {
        throw new HttpException(
          'Unsupported analysis type',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create a temporary system chat for this report
      // Get or create default configuration first
      let config = await this.prisma.auditorConfiguration.findFirst({
        where: { isActive: true },
      });

      if (!config) {
        config = await this.prisma.auditorConfiguration.create({
          data: {
            name: 'System Reports Configuration',
            description: 'Configuration for system-generated reports',
            model: 'gemini-1.5-flash',
            temperature: 0.3,
            maxTokens: 8000,
            isActive: true,
          },
        });
      }

      // Create a unique session ID for this report
      const reportSessionId = `system-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create a system chat for this report
      const systemChat = await this.prisma.auditorChat.create({
        data: {
          title: `${dto.type} Report - ${new Date().toLocaleDateString()}`,
          configId: config.id,
          adminUserId: 'system-generated', // Simple string, no FK constraint
          sessionId: reportSessionId,
          isActive: true,
        },
      });

      // Store report
      const report = await this.prisma.auditorReport.create({
        data: {
          chatId: systemChat.id,
          type: dto.type,
          title: `${dto.type} Report - ${new Date().toLocaleDateString()}`,
          content: analysisResult.summary,
          summary: analysisResult.summary,
          riskLevel: analysisResult.riskLevel,
          findings: analysisResult.findings,
          recommendations: analysisResult.recommendations,
        },
      });

      this.logger.log(`✅ Analysis report generated: ${report.id}`);

      return {
        success: true,
        message: 'Analysis completed successfully',
        analysis: analysisResult,
        reportId: report.id,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error generating analysis:', error);
      throw new HttpException(
        'Failed to generate analysis',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get metrics
   */
  @Get('metrics')
  async getMetrics(
    @Query() query: CollectMetricsDto,
  ): Promise<AuditorResponse> {
    try {
      const period = query.period || 'current';
      const periodType = query.periodType || 'daily';

      let metrics;

      if (query.realTime) {
        metrics = await this.metricsCollectorService.getRealTimeMetrics();
      } else {
        metrics = await this.metricsCollectorService.getStoredMetrics(
          period,
          periodType,
        );
        if (!metrics) {
          // Collect and store metrics if not available
          metrics = await this.metricsCollectorService.collectMetrics(
            period,
            periodType,
          );
          await this.metricsCollectorService.storeMetrics(
            metrics,
            period,
            periodType,
          );
        }
      }

      return {
        success: true,
        message: 'Metrics retrieved successfully',
        data: metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error getting metrics:', error);
      throw new HttpException(
        'Failed to get metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Store metrics
   */
  @Post('metrics')
  async storeMetrics(
    @Body() dto: CreateAuditorMetricsDto,
  ): Promise<AuditorResponse> {
    try {
      const metrics = await this.prisma.auditorMetrics.create({
        data: dto,
      });

      return {
        success: true,
        message: 'Metrics stored successfully',
        data: metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error storing metrics:', error);
      throw new HttpException(
        'Failed to store metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get reports
   */
  @Get('reports')
  async getReports(
    @Query('type') type?: AuditorReportType,
    @Query('limit') limit?: number,
  ): Promise<AuditorResponse> {
    try {
      const reports = await this.prisma.auditorReport.findMany({
        where: type ? { type } : {},
        orderBy: { createdAt: 'desc' },
        take: limit || 50,
        include: {
          chat: {
            select: {
              id: true,
              title: true,
              sessionId: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Reports retrieved successfully',
        data: reports,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error getting reports:', error);
      throw new HttpException(
        'Failed to get reports',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate report
   */
  @Post('reports/generate')
  async generateReport(
    @Body() dto: GenerateAuditorReportDto,
  ): Promise<AuditorResponse> {
    try {
      const report = await this.prisma.auditorReport.create({
        data: {
          chatId: dto.chatId,
          type: dto.type,
          title: dto.title,
          content: 'Report generated',
          summary: dto.summary,
          riskLevel: dto.riskLevel || AuditorRiskLevel.LOW,
          findings: dto.findings,
          recommendations: dto.recommendations,
        },
      });

      return {
        success: true,
        message: 'Report generated successfully',
        data: report,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error generating report:', error);
      throw new HttpException(
        'Failed to generate report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * System health check
   */
  @Get('health')
  async getHealthCheck(): Promise<HealthCheckResponse> {
    try {
      const startTime = Date.now();

      // Check database
      const dbStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStartTime;

      // Check Gemini API
      const geminiHealth = await this.geminiAiService.checkHealth();

      // Get system metrics
      const systemHealth =
        await this.metricsCollectorService.getSystemHealthSummary();

      // Get memory usage
      const memoryUsage = process.memoryUsage();

      return {
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        database: {
          connected: true,
          latency: dbLatency,
        },
        claude: geminiHealth,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        uptime: process.uptime(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        database: {
          connected: false,
          latency: 0,
        },
        claude: {
          available: false,
          model: 'N/A',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Helper methods
   */
  private async getUserData(userIds: string[]) {
    return await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        transactions: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
        wallet: true,
      },
    });
  }

  private async getTransactionData(transactionIds: string[]) {
    return await this.prisma.transaction.findMany({
      where: { id: { in: transactionIds } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isVerified: true,
            kycStatus: true,
          },
        },
        fromAccount: true,
        toAccount: true,
      },
    });
  }

  private async getSystemData() {
    const [users, transactions, wallets] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.transaction.count(),
      this.prisma.wallet.count(),
    ]);

    return {
      totalUsers: users,
      totalTransactions: transactions,
      totalWallets: wallets,
      timestamp: new Date(),
    };
  }
}
