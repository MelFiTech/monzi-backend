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
  SendPromotionalNotificationDto,
  NotificationHistoryResponse,
  GetNotificationHistoryDto,
  BulkSendAllUsersDto,
  SendBulkPushNotificationByEmailDto,
  SendBulkPushNotificationMixedDto,
} from './dto/push-notifications.dto';

@ApiTags('Push Notifications')
@Controller('push-notifications')
export class PushNotificationsController {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send push notification to current user',
    description:
      'Send a push notification to the authenticated user (testing purpose)',
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

  // ==================== ADMIN ENDPOINTS (NO AUTH REQUIRED) ====================

  @Post('send/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send bulk push notifications (Admin)',
    description: 'Send push notifications to multiple users by user IDs',
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

  @Post('send/bulk/by-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send bulk push notifications by email (Admin)',
    description: 'Send push notifications to multiple users by email addresses',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk push notifications sent successfully',
    type: PushNotificationResponse,
  })
  async sendBulkPushNotificationByEmail(
    @Body() dto: SendBulkPushNotificationByEmailDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.sendBulkPushNotificationByEmail(dto);
  }

  @Post('send/bulk/mixed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send bulk push notifications by mixed IDs and emails (Admin)',
    description:
      'Send push notifications to multiple users by user IDs and/or email addresses',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk push notifications sent successfully',
    type: PushNotificationResponse,
  })
  async sendBulkPushNotificationMixed(
    @Body() dto: SendBulkPushNotificationMixedDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.sendBulkPushNotificationMixed(dto);
  }

  @Post('send/promotional')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send promotional notifications (Admin)',
    description:
      'Send promotional notifications to multiple users (admin functionality)',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotional notifications sent successfully',
    type: PushNotificationResponse,
  })
  async sendPromotionalNotification(
    @Body() dto: SendPromotionalNotificationDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.sendPromotionalNotification(
      dto.userIds,
      dto,
    );
  }

  @Post('send/all-users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send notification to all users (Admin)',
    description:
      'Send push notification to all active users with notifications enabled',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent to all users successfully',
    type: PushNotificationResponse,
  })
  async sendToAllUsers(
    @Body() dto: BulkSendAllUsersDto,
  ): Promise<PushNotificationResponse> {
    return this.pushNotificationsService.sendToAllUsers(
      dto.title,
      dto.body,
      dto.data,
      dto.priority,
      dto.sound,
      dto.badge,
      dto.channelId,
      dto.ttl,
      dto.categoryId,
      dto.mutableContent,
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
    description: 'Number of days since last use',
    example: 30,
  })
  async cleanupInactiveTokens(@Query('days') days?: string) {
    // Parse the days parameter or use default
    const daysNumber = days ? parseInt(days, 10) : 30;

    // Validate the parsed number
    if (isNaN(daysNumber) || daysNumber < 1) {
      return {
        success: false,
        message: 'Invalid days parameter. Must be a positive number.',
        data: { cleanedUp: 0 },
      };
    }

    const cleanedUp =
      await this.pushNotificationsService.cleanupInactiveTokens(daysNumber);
    return {
      success: true,
      message: `Cleaned up ${cleanedUp} inactive tokens`,
      data: { cleanedUp },
    };
  }

  // ==================== USER ENDPOINTS (AUTH REQUIRED) ====================

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user notification statistics',
    description: 'Retrieve notification statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics retrieved successfully',
  })
  async getNotificationStats(@Request() req: any) {
    const stats = await this.pushNotificationsService.getNotificationStats(
      req.user.id,
    );
    return {
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('admin/stats')
  @ApiOperation({
    summary: 'Get global notification statistics (Admin)',
    description: 'Retrieve global notification statistics for all users',
  })
  @ApiResponse({
    status: 200,
    description: 'Global notification statistics retrieved successfully',
  })
  async getGlobalNotificationStats() {
    const stats = await this.pushNotificationsService.getNotificationStats();
    return {
      success: true,
      message: 'Global notification statistics retrieved successfully',
      data: stats,
    };
  }

  @Post('test/wallet-funding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification history',
    description: 'Retrieve notification history for the authenticated user',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of notifications to return (max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of notifications to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by notification type',
    example: 'TRANSACTION',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'Filter by notification channel',
    example: 'PUSH',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by notification status',
    example: 'DELIVERED',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter from date (ISO string)',
    example: '2025-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter to date (ISO string)',
    example: '2025-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification history retrieved successfully',
    type: NotificationHistoryResponse,
  })
  async getNotificationHistory(
    @Request() req: any,
    @Query() query: GetNotificationHistoryDto,
  ) {
    const result = await this.pushNotificationsService.getNotificationHistory(
      req.user.id,
      query.limit,
      query.offset,
      query.type,
      query.channel,
      query.status,
      query.fromDate,
      query.toDate,
    );

    return {
      success: true,
      message: 'Notification history retrieved successfully',
      data: result.notifications,
      pagination: {
        total: result.total,
        limit: query.limit || 20,
        offset: query.offset || 0,
        hasMore: result.hasMore,
      },
    };
  }

  @Post('history/:notificationId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read by the user',
  })
  @ApiParam({
    name: 'notificationId',
    description: 'ID of the notification to mark as read',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
  })
  async markNotificationAsRead(
    @Request() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    return this.pushNotificationsService.markNotificationAsRead(
      req.user.id,
      notificationId,
    );
  }
}
