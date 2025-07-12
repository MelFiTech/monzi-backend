import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsObject, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AuditorMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum AuditorReportType {
  FINANCIAL_ANALYSIS = 'FINANCIAL_ANALYSIS',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  COMPLIANCE_AUDIT = 'COMPLIANCE_AUDIT',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  FRAUD_DETECTION = 'FRAUD_DETECTION',
}

export enum AuditorRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Configuration DTOs
export class CreateAuditorConfigurationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  maxTokens?: number;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  encryptionKey?: string;
}

export class UpdateAuditorConfigurationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  maxTokens?: number;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  encryptionKey?: string;
}

// Chat DTOs
export class CreateAuditorChatDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  configId: string;

  @IsString()
  adminUserId: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class SendAuditorMessageDto {
  @IsString()
  chatId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(AuditorMessageRole)
  role?: AuditorMessageRole;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PrimeChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  configId?: string;

  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean;

  @IsOptional()
  @IsBoolean()
  generateReport?: boolean;
}

// Report DTOs
export class GenerateAuditorReportDto {
  @IsString()
  chatId: string;

  @IsEnum(AuditorReportType)
  type: AuditorReportType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(AuditorRiskLevel)
  riskLevel?: AuditorRiskLevel;

  @IsOptional()
  @IsObject()
  findings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  recommendations?: Record<string, any>;
}

export class AnalysisRequestDto {
  @IsEnum(AuditorReportType)
  type: AuditorReportType;

  @IsOptional()
  @IsString()
  timeframe?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionIds?: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

// Metrics DTOs
export class CreateAuditorMetricsDto {
  @IsString()
  period: string;

  @IsString()
  periodType: string;

  @IsOptional()
  @IsNumber()
  totalUsers?: number;

  @IsOptional()
  @IsNumber()
  totalTransactions?: number;

  @IsOptional()
  @IsNumber()
  totalVolume?: number;

  @IsOptional()
  @IsNumber()
  averageTransaction?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  successRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  failureRate?: number;

  @IsOptional()
  @IsNumber()
  fraudAlerts?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  systemHealth?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CollectMetricsDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  periodType?: string;

  @IsOptional()
  @IsBoolean()
  realTime?: boolean;
}

// Response DTOs
export class AuditorResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export class PrimeChatResponse {
  success: boolean;
  message: string;
  response?: string;
  sessionId?: string;
  chatId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class AnalysisResponse {
  success: boolean;
  message: string;
  analysis?: {
    summary: string;
    findings: Record<string, any>;
    recommendations: Record<string, any>;
    riskLevel: AuditorRiskLevel;
  };
  reportId?: string;
  timestamp: Date;
}

export class HealthCheckResponse {
  success: boolean;
  status: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connected: boolean;
    latency: number;
  };
  claude: {
    available: boolean;
    model: string;
  };
  timestamp: Date;
} 