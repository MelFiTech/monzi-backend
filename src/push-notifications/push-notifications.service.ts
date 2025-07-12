import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  Expo,
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushReceipt,
  ExpoPushToken,
} from 'expo-server-sdk';
import {
  RegisterPushTokenDto,
  SendPushNotificationDto,
  SendBulkPushNotificationDto,
  PushNotificationResponse,
} from './dto/push-notifications.dto';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private expo: Expo;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Expo SDK
    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');

    if (!accessToken) {
      this.logger.warn(
        '⚠️ [PUSH] EXPO_ACCESS_TOKEN not configured - push notifications will be disabled',
      );
      this.expo = null;
    } else {
      this.expo = new Expo({ accessToken });
      this.logger.log('✅ [PUSH] Expo SDK initialized successfully');
    }
  }

  /**
   * Register a push token for a user
   */
  async registerPushToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<PushNotificationResponse> {
    try {
      this.logger.log(`📱 [PUSH] Registering push token for user: ${userId}`);

      // Validate the push token format
      if (!Expo.isExpoPushToken(dto.token)) {
        throw new BadRequestException('Invalid Expo push token format');
      }

      // Check if token already exists for this user
      const existingToken = await this.prisma.pushToken.findFirst({
        where: {
          userId,
          token: dto.token,
        },
      });

      if (existingToken) {
        // Update existing token with all device information
        await this.prisma.pushToken.update({
          where: { id: existingToken.id },
          data: {
            deviceId: dto.deviceId,
            deviceName: dto.deviceName,
            platform: dto.platform,
            osVersion: dto.osVersion,
            appVersion: dto.appVersion,
            buildVersion: dto.buildVersion,
            appOwnership: dto.appOwnership,
            executionEnvironment: dto.executionEnvironment,
            isDevice: dto.isDevice,
            brand: dto.brand,
            manufacturer: dto.manufacturer,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });

        this.logger.log(
          `🔄 [PUSH] Updated existing push token for user: ${userId}`,
        );
        this.logger.log(
          `📱 [PUSH] Device: ${dto.deviceName || dto.deviceId || 'Unknown'} (${dto.platform} ${dto.osVersion})`,
        );
        return {
          success: true,
          message: 'Push token updated successfully',
          data: { tokenId: existingToken.id },
        };
      }

      // Create new token with all device information
      const pushToken = await this.prisma.pushToken.create({
        data: {
          userId,
          token: dto.token,
          deviceId: dto.deviceId,
          deviceName: dto.deviceName,
          platform: dto.platform,
          osVersion: dto.osVersion,
          appVersion: dto.appVersion,
          buildVersion: dto.buildVersion,
          appOwnership: dto.appOwnership,
          executionEnvironment: dto.executionEnvironment,
          isDevice: dto.isDevice,
          brand: dto.brand,
          manufacturer: dto.manufacturer,
          isActive: true,
        },
      });

      this.logger.log(
        `✅ [PUSH] Registered new push token for user: ${userId}`,
      );
      this.logger.log(
        `📱 [PUSH] Device: ${dto.deviceName || dto.deviceId || 'Unknown'} (${dto.platform} ${dto.osVersion})`,
      );
      return {
        success: true,
        message: 'Push token registered successfully',
        data: { tokenId: pushToken.id },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error registering push token:`, error);
      return {
        success: false,
        message: 'Failed to register push token',
        error: error.message,
      };
    }
  }

  /**
   * Remove a push token
   */
  async removePushToken(
    userId: string,
    token: string,
  ): Promise<PushNotificationResponse> {
    try {
      const pushToken = await this.prisma.pushToken.findFirst({
        where: { userId, token },
      });

      if (!pushToken) {
        return {
          success: false,
          message: 'Push token not found',
          error: 'Token not registered for this user',
        };
      }

      await this.prisma.pushToken.delete({
        where: { id: pushToken.id },
      });

      this.logger.log(`🗑️ [PUSH] Removed push token for user: ${userId}`);
      return {
        success: true,
        message: 'Push token removed successfully',
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error removing push token:`, error);
      return {
        success: false,
        message: 'Failed to remove push token',
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendPushNotificationToUser(
    userId: string,
    dto: SendPushNotificationDto,
  ): Promise<PushNotificationResponse> {
    try {
      if (!this.expo) {
        return {
          success: false,
          message: 'Push notifications not configured',
          error: 'EXPO_ACCESS_TOKEN not set',
        };
      }

      this.logger.log(`🔔 [PUSH] Sending notification to user: ${userId}`);
      this.logger.log(`📱 [PUSH] Title: ${dto.title}`);
      this.logger.log(`📝 [PUSH] Body: ${dto.body}`);

      // Get active push tokens for user
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (pushTokens.length === 0) {
        this.logger.warn(
          `⚠️ [PUSH] No active push tokens found for user: ${userId}`,
        );
        return {
          success: false,
          message: 'No active push tokens found for user',
          error: 'User has no registered devices',
        };
      }

      const tokens = pushTokens.map((pt) => pt.token);
      this.logger.log(
        `📱 [PUSH] Found ${tokens.length} active tokens for user`,
      );

      // Send notifications
      const result = await this.sendPushNotifications(tokens, dto);

      // Update lastUsedAt for successful tokens
      if (result.success) {
        await this.prisma.pushToken.updateMany({
          where: {
            userId,
            token: { in: tokens },
          },
          data: {
            lastUsedAt: new Date(),
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error(
        `❌ [PUSH] Error sending notification to user ${userId}:`,
        error,
      );
      return {
        success: false,
        message: 'Failed to send push notification',
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendBulkPushNotification(
    dto: SendBulkPushNotificationDto,
  ): Promise<PushNotificationResponse> {
    try {
      if (!this.expo) {
        return {
          success: false,
          message: 'Push notifications not configured',
          error: 'EXPO_ACCESS_TOKEN not set',
        };
      }

      this.logger.log(
        `🔔 [PUSH] Sending bulk notification to ${dto.userIds.length} users`,
      );

      // Get all active push tokens for the users
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId: { in: dto.userIds },
          isActive: true,
        },
      });

      if (pushTokens.length === 0) {
        return {
          success: false,
          message: 'No active push tokens found for any of the users',
          error: 'No registered devices found',
        };
      }

      const tokens = pushTokens.map((pt) => pt.token);
      this.logger.log(
        `📱 [PUSH] Found ${tokens.length} active tokens across ${dto.userIds.length} users`,
      );

      // Send notifications
      const result = await this.sendPushNotifications(tokens, dto);

      // Update lastUsedAt for all tokens used
      if (result.success) {
        await this.prisma.pushToken.updateMany({
          where: {
            token: { in: tokens },
          },
          data: {
            lastUsedAt: new Date(),
          },
        });
      }

      return {
        ...result,
        data: {
          ...result.data,
          usersTargeted: dto.userIds.length,
          tokensUsed: tokens.length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error sending bulk notification:`, error);
      return {
        success: false,
        message: 'Failed to send bulk push notification',
        error: error.message,
      };
    }
  }

  /**
   * Core method to send push notifications via Expo
   */
  private async sendPushNotifications(
    tokens: string[],
    dto: SendPushNotificationDto,
  ): Promise<PushNotificationResponse> {
    try {
      // Validate all tokens
      const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
      const invalidTokens = tokens.filter(
        (token) => !Expo.isExpoPushToken(token),
      );

      if (invalidTokens.length > 0) {
        this.logger.warn(
          `⚠️ [PUSH] Found ${invalidTokens.length} invalid tokens, removing them...`,
        );

        // Remove invalid tokens from database
        await this.prisma.pushToken.updateMany({
          where: { token: { in: invalidTokens } },
          data: { isActive: false },
        });
      }

      if (validTokens.length === 0) {
        return {
          success: false,
          message: 'No valid push tokens to send to',
          error: 'All tokens were invalid',
        };
      }

      // Create push messages
      const messages: ExpoPushMessage[] = validTokens.map((token) => ({
        to: token,
        title: dto.title,
        body: dto.body,
        data: dto.data || {},
        sound: dto.sound || 'default',
        badge: dto.badge,
        priority: dto.priority || 'default',
      }));

      this.logger.log(`📤 [PUSH] Sending ${messages.length} notifications...`);

      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error(`❌ [PUSH] Error sending chunk:`, error);
          // Continue with other chunks
        }
      }

      // Process tickets and handle errors
      const successCount = tickets.filter(
        (ticket) => ticket.status === 'ok',
      ).length;
      const errorCount = tickets.filter(
        (ticket) => ticket.status === 'error',
      ).length;

      // Handle device registration errors
      const deviceNotRegisteredErrors = tickets.filter(
        (ticket) =>
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered',
      ).length;

      if (deviceNotRegisteredErrors > 0) {
        this.logger.warn(
          `⚠️ [PUSH] ${deviceNotRegisteredErrors} devices not registered, cleaning up...`,
        );
        // You might want to remove these tokens from the database
      }

      this.logger.log(
        `✅ [PUSH] Notification results: ${successCount} sent, ${errorCount} failed`,
      );

      return {
        success: successCount > 0,
        message: `Push notifications processed: ${successCount} sent, ${errorCount} failed`,
        data: {
          totalSent: successCount,
          totalFailed: errorCount,
          tickets: tickets,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error in sendPushNotifications:`, error);
      throw error;
    }
  }

  /**
   * Get user's push tokens
   */
  async getUserPushTokens(userId: string) {
    return this.prisma.pushToken.findMany({
      where: { userId },
      select: {
        id: true,
        token: true,
        deviceId: true,
        deviceName: true,
        platform: true,
        osVersion: true,
        appVersion: true,
        buildVersion: true,
        appOwnership: true,
        executionEnvironment: true,
        isDevice: true,
        brand: true,
        manufacturer: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Clean up inactive tokens
   */
  async cleanupInactiveTokens(daysSinceLastUsed: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastUsed);

    const result = await this.prisma.pushToken.deleteMany({
      where: {
        OR: [{ isActive: false }, { lastUsedAt: { lt: cutoffDate } }],
      },
    });

    this.logger.log(
      `🧹 [PUSH] Cleaned up ${result.count} inactive push tokens`,
    );
    return result.count;
  }

  /**
   * Send wallet funding notification
   */
  async sendWalletFundingNotification(
    userId: string,
    amount: number,
    netAmount: number,
    fee: number,
    provider: string,
  ) {
    const notification = {
      title: '💰 Wallet Funded!',
      body: `₦${amount.toLocaleString()} processed. ₦${fee} fee deducted. ₦${netAmount.toLocaleString()} credited to your wallet.`,
      data: {
        type: 'wallet_funding',
        amount,
        netAmount,
        fee,
        provider,
        timestamp: new Date().toISOString(),
      },
      sound: 'default',
      priority: 'high' as const,
    };

    return this.sendPushNotificationToUser(userId, notification);
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    userId: string,
    type: 'FUNDING' | 'TRANSFER' | 'WITHDRAWAL',
    amount: number,
    reference: string,
    status: 'COMPLETED' | 'FAILED' | 'PENDING',
  ) {
    const typeEmoji = {
      FUNDING: '💰',
      TRANSFER: '📤',
      WITHDRAWAL: '💸',
    };

    const statusEmoji = {
      COMPLETED: '✅',
      FAILED: '❌',
      PENDING: '⏳',
    };

    const notification = {
      title: `${typeEmoji[type]} ${type} ${statusEmoji[status]}`,
      body: `₦${amount.toLocaleString()} ${type.toLowerCase()} ${status.toLowerCase()}`,
      data: {
        type: 'transaction',
        transactionType: type,
        amount,
        reference,
        status,
        timestamp: new Date().toISOString(),
      },
      sound: 'default',
      priority:
        status === 'COMPLETED' ? ('high' as const) : ('normal' as const),
    };

    return this.sendPushNotificationToUser(userId, notification);
  }
}
