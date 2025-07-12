import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuditorController } from './auditor.controller';
import { ClaudeAiService } from './services/claude-ai.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  controllers: [AuditorController],
  providers: [
    ClaudeAiService,
    MetricsCollectorService,
    PrismaService,
  ],
  exports: [
    ClaudeAiService,
    MetricsCollectorService,
  ],
})
export class AuditorModule {} 