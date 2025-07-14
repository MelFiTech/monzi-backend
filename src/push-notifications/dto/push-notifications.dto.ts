import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  IsIn,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterPushTokenDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push notification token',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    example: 'iPhone12,1',
    description: 'Device identifier',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    example: "John's iPhone",
    description: 'Device name as set by the user',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    example: 'ios',
    description: 'Platform (ios, android, web)',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    example: '17.0',
    description: 'Operating system version',
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'App version',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'App build version',
  })
  @IsOptional()
  @IsString()
  buildVersion?: string;

  @ApiPropertyOptional({
    example: 'standalone',
    description: 'App ownership (standalone, expo, guest)',
  })
  @IsOptional()
  @IsString()
  appOwnership?: string;

  @ApiPropertyOptional({
    example: 'storeClient',
    description: 'Execution environment (storeClient, standalone, bareWorkflow)',
  })
  @IsOptional()
  @IsString()
  executionEnvironment?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether running on a physical device',
  })
  @IsOptional()
  @IsBoolean()
  isDevice?: boolean;

  @ApiPropertyOptional({
    example: 'Apple',
    description: 'Device brand',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'Apple',
    description: 'Device manufacturer',
  })
  @IsOptional()
  @IsString()
  manufacturer?: string;
}

export class SendPushNotificationDto {
  @ApiProperty({ example: 'Wallet Funded!', description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Your wallet has been credited with ₦1,000',
    description: 'Notification message body',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Additional data to send with notification',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ example: 'default', description: 'Sound to play' })
  @IsOptional()
  @IsString()
  sound?: string;

  @ApiPropertyOptional({ example: 1, description: 'Badge count' })
  @IsOptional()
  @IsNumber()
  badge?: number;

  @ApiPropertyOptional({
    example: 'high',
    description: 'Notification priority',
  })
  @IsOptional()
  @IsIn(['default', 'normal', 'high'])
  priority?: 'default' | 'normal' | 'high';

  @ApiPropertyOptional({
    example: 'transactions',
    description: 'Android notification channel ID',
  })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Time to live in seconds',
  })
  @IsOptional()
  @IsNumber()
  ttl?: number;

  @ApiPropertyOptional({
    example: 'transaction_alert',
    description: 'iOS notification category',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Allow notification content to be modified',
  })
  @IsOptional()
  @IsBoolean()
  mutableContent?: boolean;
}

export class SendBulkPushNotificationDto extends SendPushNotificationDto {
  @ApiProperty({
    example: ['user1', 'user2'],
    description: 'Array of user IDs to send notification to',
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class SendBulkPushNotificationByEmailDto extends SendPushNotificationDto {
  @ApiProperty({
    example: ['user1@example.com', 'user2@example.com'],
    description: 'Array of user email addresses to send notification to',
  })
  @IsArray()
  @IsString({ each: true })
  userEmails: string[];
}

export class SendBulkPushNotificationMixedDto extends SendPushNotificationDto {
  @ApiProperty({
    example: ['user1', 'user2'],
    description: 'Array of user IDs to send notification to',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({
    example: ['user1@example.com', 'user2@example.com'],
    description: 'Array of user email addresses to send notification to',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userEmails?: string[];
}

export class SendPromotionalNotificationDto extends SendPushNotificationDto {
  @ApiProperty({
    example: ['user1', 'user2'],
    description: 'Array of user IDs to send promotional notification to',
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({
    example: 'SAVE50',
    description: 'Promotional code or identifier',
  })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({
    example: 'flash_sale',
    description: 'Campaign identifier',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;
}

export class PushNotificationResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: any;

  @ApiPropertyOptional()
  error?: string;
}

export class ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
  ttl?: number;
}

export class ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?:
      | 'DeviceNotRegistered'
      | 'InvalidCredentials'
      | 'MessageTooBig'
      | 'MessageRateExceeded';
  };
}

export class ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?:
      | 'DeviceNotRegistered'
      | 'MessageTooBig'
      | 'MessageRateExceeded'
      | 'InvalidCredentials';
  };
}

export class NotificationStatsResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({
    description: 'Notification statistics',
    type: 'object',
    properties: {
      totalTokens: { type: 'number', example: 150 },
      activeTokens: { type: 'number', example: 120 },
      inactiveTokens: { type: 'number', example: 30 },
      cacheSize: { type: 'number', example: 45 },
    },
  })
  data: {
    totalTokens: number;
    activeTokens: number;
    inactiveTokens: number;
    cacheSize: number;
  };
}

// ==================== NOTIFICATION HISTORY DTOs ====================

export class NotificationHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ required: false })
  data?: any;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  deliveredAt?: Date;

  @ApiProperty({ required: false })
  readAt?: Date;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty({ required: false })
  reference?: string;

  @ApiProperty()
  createdAt: Date;
}

export class GetNotificationHistoryDto {
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiProperty({ required: false, enum: ['TRANSACTION', 'WALLET_FUNDING', 'WALLET_DEBIT', 'TRANSFER', 'WITHDRAWAL', 'PROMOTIONAL', 'SYSTEM', 'SECURITY', 'KYC', 'GENERAL'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, enum: ['PUSH', 'WEBSOCKET', 'EMAIL', 'SMS'] })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ required: false, enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class NotificationHistoryResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [NotificationHistoryDto] })
  data: NotificationHistoryDto[];

  @ApiProperty()
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export class MarkNotificationReadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  notificationId: string;
}

export class BulkSendAllUsersDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  data?: any;

  @ApiProperty({ required: false, enum: ['default', 'normal', 'high'] })
  @IsOptional()
  @IsString()
  priority?: 'default' | 'normal' | 'high' = 'normal';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sound?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  badge?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  ttl?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  mutableContent?: boolean;
}
