import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuditorController } from './auditor.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { QueryAnalyzerService } from './services/query-analyzer.service';
import { QueryExecutorService } from './services/query-executor.service';
import { ResponseGeneratorService } from './services/response-generator.service';
import { GeminiAiOrchestratorService } from './services/gemini-ai-orchestrator.service';
import { GeminiApiService } from './services/gemini-api.service';
import { ResponseEnhancerService } from './services/response-enhancer.service';
import { AnalysisGeneratorService } from './services/analysis-generator.service';
import { SmartMessageProcessorService } from './services/smart-message-processor.service';
import { AdminEndpointMapperService } from './services/admin-endpoint-mapper.service';

@Module({
  imports: [HttpModule],
  controllers: [AuditorController],
  providers: [
    PrismaService,
    MetricsCollectorService,
    QueryAnalyzerService,
    QueryExecutorService,
    ResponseGeneratorService,
    GeminiApiService,
    ResponseEnhancerService,
    AnalysisGeneratorService,
    SmartMessageProcessorService,
    GeminiAiOrchestratorService,
    AdminEndpointMapperService,
  ],
  exports: [
    MetricsCollectorService,
    QueryAnalyzerService,
    QueryExecutorService,
    ResponseGeneratorService,
    GeminiApiService,
    ResponseEnhancerService,
    AnalysisGeneratorService,
    SmartMessageProcessorService,
    GeminiAiOrchestratorService,
    AdminEndpointMapperService,
  ],
})
export class AuditorModule {}
