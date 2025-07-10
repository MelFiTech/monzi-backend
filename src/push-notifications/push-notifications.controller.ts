import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PushNotificationsService } from './push-notifications.service';
import {
  RegisterPushTokenDto,
  SendPushNotificationDto,
  SendBulkPushNotificationDto,
  PushNotificationResponse,
} from './dto/push-notifications.dto';

@ApiTags('Push Notifications')
@Controller('push-notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushNotificationsController {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register push notification token',
    description:
      'Register an Expo push notification token for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Push token registered successfully',
    type: PushNotificationResponse,
  })
  async registerPushToken(
    @Request() req: any,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.registerPushToken(req.user.id, dto);
  }

  @Delete('token/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove push notification token',
    description:
      'Remove a specific push notification token for the authenticated user',
  })
  @ApiParam({
    name: 'token',
    description: 'The push token to remove',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @ApiResponse({
    status: 200,
    description: 'Push token removed successfully',
    type: PushNotificationResponse,
  })
  async removePushToken(
    @Request() req: any,
    @Param('token') token: string,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.removePushToken(req.user.id, token);
  }

  @Get('tokens')
  @ApiOperation({
    summary: 'Get user push tokens',
    description:
      'Retrieve all push notification tokens for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Push tokens retrieved successfully',
  })
  async getUserPushTokens(@Request() req: any) {
    const tokens = await this.pushNotificationsService.getUserPushTokens(
      req.user.id,
    );
    return {
      success: true,
      message: 'Push tokens retrieved successfully',
      data: tokens,
    };
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send push notification to current user',
    description:
      'Send a push notification to the authenticated user (testing/admin purpose)',
  })
  @ApiResponse({
    status: 200,
    description: 'Push notification sent successfully',
    type: PushNotificationResponse,
  })
  async sendPushNotification(
    @Request() req: any,
    @Body() dto: SendPushNotificationDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.sendPushNotificationToUser(
      req.user.id,
      dto,
    );
  }

  @Post('send/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send bulk push notifications (Admin)',
    description:
      'Send push notifications to multiple users (admin functionality)',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk push notifications sent successfully',
    type: PushNotificationResponse,
  })
  async sendBulkPushNotification(
    @Body() dto: SendBulkPushNotificationDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.sendBulkPushNotification(dto);
  }

  @Post('test/wallet-funding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test wallet funding notification',
    description:
      'Send a test wallet funding notification to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Test notification sent successfully',
    type: PushNotificationResponse,
  })
  async testWalletFundingNotification(@Request() req: any) {
    return this.pushNotificationsService.sendWalletFundingNotification(
      req.user.id,
      1000, // gross amount
      900, // net amount
      100, // fee
      'BUDPAY',
    );
  }

  @Post('test/transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test transaction notification',
    description:
      'Send a test transaction notification to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Test notification sent successfully',
    type: PushNotificationResponse,
  })
  async testTransactionNotification(
    @Request() req: any,
    @Query('type') type: 'FUNDING' | 'TRANSFER' | 'WITHDRAWAL' = 'FUNDING',
    @Query('amount') amount: number = 1000,
    @Query('status') status: 'COMPLETED' | 'FAILED' | 'PENDING' = 'COMPLETED',
  ) {
    return this.pushNotificationsService.sendTransactionNotification(
      req.user.id,
      type,
      amount,
      `TEST_${Date.now()}`,
      status,
    );
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup inactive tokens (Admin)',
    description: 'Remove inactive push tokens older than specified days',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Days since last used (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  async cleanupInactiveTokens(@Query('days') days?: number) {
    const cleanedCount =
      await this.pushNotificationsService.cleanupInactiveTokens(days || 30);
    return {
      success: true,
      message: `Cleaned up ${cleanedCount} inactive push tokens`,
      data: { cleanedCount },
    };
  }
}
