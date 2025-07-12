import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
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
  badge?: number;

  @ApiPropertyOptional({
    example: 'high',
    description: 'Notification priority',
  })
  @IsOptional()
  @IsString()
  priority?: 'default' | 'normal' | 'high';
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
