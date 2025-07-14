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
  SendBulkPushNotificationByEmailDto,
  SendBulkPushNotificationMixedDto,
} from './dto/push-notifications.dto';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private expo: Expo;
  private userPreferencesCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONCURRENT_NOTIFICATIONS = 100;

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

    // Schedule automatic cleanup every 24 hours
    this.scheduleAutomaticCleanup();
  }

  /**
   * Get user notification preferences with caching
   */
  private async getUserPreferences(userId: string): Promise<{
    notificationsEnabled: boolean;
    transactionNotificationsEnabled: boolean;
    promotionalNotificationsEnabled: boolean;
  }> {
    const cacheKey = `user_prefs_${userId}`;
    const now = Date.now();
    
    // Check cache first
    if (this.userPreferencesCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && now < expiry) {
        return this.userPreferencesCache.get(cacheKey);
      }
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          notificationsEnabled: true,
          transactionNotificationsEnabled: true,
          promotionalNotificationsEnabled: true,
        },
      });

      const preferences = user || {
        notificationsEnabled: true,
        transactionNotificationsEnabled: true,
        promotionalNotificationsEnabled: true,
      };

      // Cache the result
      this.userPreferencesCache.set(cacheKey, preferences);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

      return preferences;
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error fetching user preferences:`, error);
      return {
        notificationsEnabled: true,
        transactionNotificationsEnabled: true,
        promotionalNotificationsEnabled: true,
      };
    }
  }

  /**
   * Clear user preferences cache
   */
  clearUserPreferencesCache(userId: string) {
    const cacheKey = `user_prefs_${userId}`;
    this.userPreferencesCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Schedule automatic cleanup of inactive tokens
   */
  private scheduleAutomaticCleanup() {
    setInterval(async () => {
      try {
        await this.cleanupInactiveTokens();
        this.cleanupCache();
      } catch (error) {
        this.logger.error('❌ [PUSH] Error during automatic cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run every 24 hours
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.userPreferencesCache.delete(key);
        this.cacheExpiry.delete(key);
      }
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

      // Check user notification preferences with caching
      const preferences = await this.getUserPreferences(userId);

      if (!preferences.notificationsEnabled) {
        this.logger.log(
          `🔕 [PUSH] Skipping push notification for user ${userId} - all notifications disabled`,
        );
        return {
          success: false,
          message: 'Push notifications disabled for user',
          error: 'Notifications disabled',
        };
      }

      // Check if it's a promotional notification
      const isPromotional = dto.data?.type === 'promotional';
      const isTransaction = dto.data?.type === 'transaction' || dto.data?.type === 'wallet' || dto.data?.type === 'funding' || dto.data?.type === 'transfer';

      if (isPromotional && !preferences.promotionalNotificationsEnabled) {
        this.logger.log(
          `🔕 [PUSH] Skipping promotional push notification for user ${userId} - promotional notifications disabled`,
        );
        return {
          success: false,
          message: 'Promotional notifications disabled for user',
          error: 'Promotional notifications disabled',
        };
      }

      if (isTransaction && !preferences.transactionNotificationsEnabled) {
        this.logger.log(
          `🔕 [PUSH] Skipping transaction push notification for user ${userId} - transaction notifications disabled`,
        );
        return {
          success: false,
          message: 'Transaction notifications disabled for user',
          error: 'Transaction notifications disabled',
        };
      }

      this.logger.log(`🔔 [PUSH] Sending notification to user: ${userId}`);

      // Get active push tokens for user
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          id: true,
          token: true,
        },
      });

      if (pushTokens.length === 0) {
        this.logger.warn(
          `⚠️ [PUSH] No active push tokens found for user: ${userId}`,
        );
        return {
          success: false,
          message: 'No active push tokens found for user',
          error: 'No push tokens registered',
        };
      }

      const tokens = pushTokens.map((pt) => pt.token);

      // Log to notification history
      await this.logNotificationHistory(
        userId,
        dto.data?.type || 'GENERAL',
        'PUSH',
        dto.title,
        dto.body,
        dto.data,
        tokens[0], // Use first token for reference
        dto.data?.reference,
        { tokenCount: tokens.length },
      );

      // Send push notifications
      const result = await this.sendPushNotifications(tokens, dto, pushTokens);

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
      this.logger.error(`❌ [PUSH] Error sending push notification:`, error);
      return {
        success: false,
        message: 'Failed to send push notification',
        error: error.message,
      };
    }
  }

  /**
   * Send bulk push notifications to multiple users
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

      if (!dto.userIds || dto.userIds.length === 0) {
        return {
          success: false,
          message: 'No user IDs provided',
          error: 'userIds array is empty',
        };
      }

      // Get all push tokens for the specified users
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId: { in: dto.userIds },
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notificationsEnabled: true,
              transactionNotificationsEnabled: true,
              promotionalNotificationsEnabled: true,
            },
          },
        },
      });

      if (pushTokens.length === 0) {
        return {
          success: false,
          message: 'No active push tokens found for specified users',
          error: 'No recipients',
        };
      }

      // Filter tokens based on user preferences
      const eligibleTokens = pushTokens.filter((tokenRecord) => {
        const { user } = tokenRecord;
        return user.notificationsEnabled;
      });

      if (eligibleTokens.length === 0) {
        return {
          success: false,
          message: 'No users with notifications enabled found',
          error: 'No eligible recipients',
        };
      }

      this.logger.log(
        `📡 [PUSH] Sending bulk notification to ${eligibleTokens.length} users`,
      );

      // Log notifications to history
      const historyPromises = eligibleTokens.map((tokenRecord) =>
        this.logNotificationHistory(
          tokenRecord.user.id,
          dto.data?.type || 'GENERAL',
          'PUSH',
          dto.title,
          dto.body,
          dto.data,
          tokenRecord.token,
          undefined,
          { bulk: true, totalRecipients: eligibleTokens.length },
        ),
      );
      await Promise.all(historyPromises);

      const tokens = eligibleTokens.map((tokenRecord) => tokenRecord.token);
      const result = await this.sendPushNotifications(tokens, dto, eligibleTokens);

      return result;
    } catch (error) {
      this.logger.error(`❌ [PUSH] Bulk notification error:`, error);
      return {
        success: false,
        message: 'Failed to send bulk push notification',
        error: error.message,
      };
    }
  }

  /**
   * Send bulk push notifications to users by email addresses
   */
  async sendBulkPushNotificationByEmail(
    dto: SendBulkPushNotificationByEmailDto,
  ): Promise<PushNotificationResponse> {
    try {
      if (!this.expo) {
        return {
          success: false,
          message: 'Push notifications not configured',
          error: 'EXPO_ACCESS_TOKEN not set',
        };
      }

      if (!dto.userEmails || dto.userEmails.length === 0) {
        return {
          success: false,
          message: 'No user emails provided',
          error: 'userEmails array is empty',
        };
      }

      // Get user IDs from email addresses
      const users = await this.prisma.user.findMany({
        where: {
          email: { in: dto.userEmails },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (users.length === 0) {
        return {
          success: false,
          message: 'No active users found with provided email addresses',
          error: 'No valid recipients',
        };
      }

      const userIds = users.map(user => user.id);

      // Get all push tokens for the specified users
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId: { in: userIds },
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notificationsEnabled: true,
              transactionNotificationsEnabled: true,
              promotionalNotificationsEnabled: true,
            },
          },
        },
      });

      if (pushTokens.length === 0) {
        return {
          success: false,
          message: 'No active push tokens found for specified users',
          error: 'No recipients',
        };
      }

      // Filter tokens based on user preferences
      const eligibleTokens = pushTokens.filter((tokenRecord) => {
        const { user } = tokenRecord;
        return user.notificationsEnabled;
      });

      if (eligibleTokens.length === 0) {
        return {
          success: false,
          message: 'No users with notifications enabled found',
          error: 'No eligible recipients',
        };
      }

      this.logger.log(
        `📡 [PUSH] Sending bulk notification by email to ${eligibleTokens.length} users`,
      );

      // Log notifications to history
      const historyPromises = eligibleTokens.map((tokenRecord) =>
        this.logNotificationHistory(
          tokenRecord.user.id,
          dto.data?.type || 'GENERAL',
          'PUSH',
          dto.title,
          dto.body,
          dto.data,
          tokenRecord.token,
          undefined,
          { 
            bulk: true, 
            byEmail: true, 
            totalRecipients: eligibleTokens.length,
            emailsProvided: dto.userEmails.length,
            usersFound: users.length 
          },
        ),
      );
      await Promise.all(historyPromises);

      const tokens = eligibleTokens.map((tokenRecord) => tokenRecord.token);
      const result = await this.sendPushNotifications(tokens, dto, eligibleTokens);

      return {
        ...result,
        data: {
          ...result.data,
          emailsProvided: dto.userEmails.length,
          usersFound: users.length,
          eligibleUsers: eligibleTokens.length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Bulk notification by email error:`, error);
      return {
        success: false,
        message: 'Failed to send bulk push notification by email',
        error: error.message,
      };
    }
  }

  /**
   * Send bulk push notifications to users by mixed IDs and emails
   */
  async sendBulkPushNotificationMixed(
    dto: SendBulkPushNotificationMixedDto,
  ): Promise<PushNotificationResponse> {
    try {
      if (!this.expo) {
        return {
          success: false,
          message: 'Push notifications not configured',
          error: 'EXPO_ACCESS_TOKEN not set',
        };
      }

      if ((!dto.userIds || dto.userIds.length === 0) && (!dto.userEmails || dto.userEmails.length === 0)) {
        return {
          success: false,
          message: 'No user IDs or emails provided',
          error: 'Both userIds and userEmails arrays are empty',
        };
      }

      let allUserIds: string[] = [];

      // Add direct user IDs
      if (dto.userIds && dto.userIds.length > 0) {
        allUserIds = [...allUserIds, ...dto.userIds];
      }

      // Get user IDs from email addresses
      if (dto.userEmails && dto.userEmails.length > 0) {
        const users = await this.prisma.user.findMany({
          where: {
            email: { in: dto.userEmails },
            isActive: true,
          },
          select: {
            id: true,
            email: true,
          },
        });

        const userIdsFromEmails = users.map(user => user.id);
        allUserIds = [...allUserIds, ...userIdsFromEmails];
      }

      // Remove duplicates
      const uniqueUserIds = [...new Set(allUserIds)];

      if (uniqueUserIds.length === 0) {
        return {
          success: false,
          message: 'No valid users found',
          error: 'No valid recipients',
        };
      }

      // Get all push tokens for the specified users
      const pushTokens = await this.prisma.pushToken.findMany({
        where: {
          userId: { in: uniqueUserIds },
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notificationsEnabled: true,
              transactionNotificationsEnabled: true,
              promotionalNotificationsEnabled: true,
            },
          },
        },
      });

      if (pushTokens.length === 0) {
        return {
          success: false,
          message: 'No active push tokens found for specified users',
          error: 'No recipients',
        };
      }

      // Filter tokens based on user preferences
      const eligibleTokens = pushTokens.filter((tokenRecord) => {
        const { user } = tokenRecord;
        return user.notificationsEnabled;
      });

      if (eligibleTokens.length === 0) {
        return {
          success: false,
          message: 'No users with notifications enabled found',
          error: 'No eligible recipients',
        };
      }

      this.logger.log(
        `📡 [PUSH] Sending mixed bulk notification to ${eligibleTokens.length} users`,
      );

      // Log notifications to history
      const historyPromises = eligibleTokens.map((tokenRecord) =>
        this.logNotificationHistory(
          tokenRecord.user.id,
          dto.data?.type || 'GENERAL',
          'PUSH',
          dto.title,
          dto.body,
          dto.data,
          tokenRecord.token,
          undefined,
          { 
            bulk: true, 
            mixed: true, 
            totalRecipients: eligibleTokens.length,
            idsProvided: dto.userIds?.length || 0,
            emailsProvided: dto.userEmails?.length || 0,
            uniqueUsers: uniqueUserIds.length
          },
        ),
      );
      await Promise.all(historyPromises);

      const tokens = eligibleTokens.map((tokenRecord) => tokenRecord.token);
      const result = await this.sendPushNotifications(tokens, dto, eligibleTokens);

      return {
        ...result,
        data: {
          ...result.data,
          idsProvided: dto.userIds?.length || 0,
          emailsProvided: dto.userEmails?.length || 0,
          uniqueUsers: uniqueUserIds.length,
          eligibleUsers: eligibleTokens.length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Mixed bulk notification error:`, error);
      return {
        success: false,
        message: 'Failed to send mixed bulk push notification',
        error: error.message,
      };
    }
  }

  /**
   * Send promotional notification (admin only)
   */
  async sendPromotionalNotification(
    userIds: string[],
    dto: SendPushNotificationDto,
  ): Promise<PushNotificationResponse> {
    const promotionalDto = {
      ...dto,
      data: {
        ...dto.data,
        type: 'promotional',
      },
    };

    return this.sendBulkPushNotification({
      ...promotionalDto,
      userIds,
    });
  }

  /**
   * Core method to send push notifications via Expo with receipt handling
   */
  private async sendPushNotifications(
    tokens: string[],
    dto: SendPushNotificationDto,
    pushTokens?: Array<{ id: string; token: string }>,
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

      // Create push messages with enhanced configuration
      const messages: ExpoPushMessage[] = validTokens.map((token) => ({
        to: token,
        title: dto.title,
        body: dto.body,
        data: dto.data || {},
        sound: dto.sound || 'default',
        badge: dto.badge,
        priority: dto.priority || 'default',
        channelId: dto.data?.type === 'transaction' ? 'transactions' : 'general',
        ttl: 3600, // 1 hour TTL
      }));

      this.logger.log(`📤 [PUSH] Sending ${messages.length} notifications...`);

      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          
          // Add delay between chunks to avoid rate limiting
          if (chunks.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
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

      // Handle device registration errors and cleanup
      await this.handlePushTicketErrors(tickets, pushTokens);

      // Handle receipts for successful notifications
      if (successCount > 0) {
        setTimeout(() => {
          this.handlePushReceipts(tickets);
        }, 15000); // Wait 15 seconds before checking receipts
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
          tickets: tickets.map(t => ({ 
            id: t.status === 'ok' ? t.id : undefined, 
            status: t.status 
          })),
        },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error in sendPushNotifications:`, error);
      throw error;
    }
  }

  /**
   * Handle push ticket errors and cleanup invalid tokens
   */
  private async handlePushTicketErrors(
    tickets: ExpoPushTicket[],
    pushTokens?: Array<{ id: string; token: string }>,
  ) {
    const deviceNotRegisteredErrors = tickets.filter(
      (ticket) =>
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered',
    );

    if (deviceNotRegisteredErrors.length > 0) {
      this.logger.warn(
        `⚠️ [PUSH] ${deviceNotRegisteredErrors.length} devices not registered, cleaning up...`,
      );

      // If we have token information, disable specific tokens
      if (pushTokens) {
        const invalidTokenIds = deviceNotRegisteredErrors
          .map((ticket, index) => pushTokens[index]?.id)
          .filter(Boolean);

        if (invalidTokenIds.length > 0) {
          await this.prisma.pushToken.updateMany({
            where: { id: { in: invalidTokenIds } },
            data: { isActive: false },
          });
        }
      }
    }

    // Handle other error types
    const invalidCredentialsErrors = tickets.filter(
      (ticket) =>
        ticket.status === 'error' &&
        ticket.details?.error === 'InvalidCredentials',
    );

    if (invalidCredentialsErrors.length > 0) {
      this.logger.error(
        `❌ [PUSH] Invalid credentials for ${invalidCredentialsErrors.length} notifications`,
      );
    }
  }

  /**
   * Handle push receipts to track delivery
   */
  private async handlePushReceipts(tickets: ExpoPushTicket[]) {
    try {
      if (!this.expo) return;

      const receiptIds = tickets
        .filter((ticket): ticket is ExpoPushTicket & { id: string } => 
          ticket.status === 'ok' && typeof ticket.id === 'string')
        .map(ticket => ticket.id);

      if (receiptIds.length === 0) return;

      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          
          let deliveredCount = 0;
          let failedCount = 0;

          for (const receiptId in receipts) {
            const receipt = receipts[receiptId];
            
            if (receipt.status === 'ok') {
              deliveredCount++;
            } else {
              failedCount++;
              this.logger.warn(
                `⚠️ [PUSH] Receipt error for ${receiptId}: ${receipt.message}`,
              );
            }
          }

          this.logger.log(
            `📧 [PUSH] Receipt results: ${deliveredCount} delivered, ${failedCount} failed`,
          );
        } catch (error) {
          this.logger.error(`❌ [PUSH] Error getting receipts:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error handling receipts:`, error);
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
        OR: [
          { isActive: false },
          { lastUsedAt: { lt: cutoffDate } },
        ],
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
    try {
      const preferences = await this.getUserPreferences(userId);

      if (!preferences.notificationsEnabled || !preferences.transactionNotificationsEnabled) {
        this.logger.log(
          `🔕 [PUSH] Skipping wallet funding notification for user ${userId} - transaction notifications disabled`,
        );
        return {
          success: false,
          message: 'Transaction notifications disabled for user',
          error: 'Transaction notifications disabled',
        };
      }

      return this.sendPushNotificationToUser(userId, {
        title: '💰 Wallet Funded',
        body: `₦${amount.toLocaleString()} received via ${provider}. Net: ₦${netAmount.toLocaleString()}`,
        data: {
          type: 'funding',
          amount,
          netAmount,
          fee,
          provider,
        },
        priority: 'high',
      });
    } catch (error) {
      this.logger.error(
        `❌ [PUSH] Error sending wallet funding notification:`,
        error,
      );
      return {
        success: false,
        message: 'Failed to send wallet funding notification',
        error: error.message,
      };
    }
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
    try {
      const preferences = await this.getUserPreferences(userId);

      if (!preferences.notificationsEnabled || !preferences.transactionNotificationsEnabled) {
        this.logger.log(
          `🔕 [PUSH] Skipping transaction notification for user ${userId} - transaction notifications disabled`,
        );
        return {
          success: false,
          message: 'Transaction notifications disabled for user',
          error: 'Transaction notifications disabled',
        };
      }

      const statusEmoji = status === 'COMPLETED' ? '✅' : status === 'FAILED' ? '❌' : '⏳';
      const typeText = type.toLowerCase();

      return this.sendPushNotificationToUser(userId, {
        title: `${statusEmoji} ${type} ${status}`,
        body: `₦${amount.toLocaleString()} ${typeText} ${status.toLowerCase()}. Ref: ${reference}`,
        data: {
          type: 'transaction',
          transactionType: type,
          amount,
          reference,
          status,
        },
        priority: status === 'COMPLETED' ? 'high' : 'normal',
      });
    } catch (error) {
      this.logger.error(
        `❌ [PUSH] Error sending transaction notification:`,
        error,
      );
      return {
        success: false,
        message: 'Failed to send transaction notification',
        error: error.message,
      };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [totalSent, totalDelivered, totalFailed, activeTokens, lastSent] =
      await Promise.all([
        this.prisma.notificationHistory.count({
          where: { ...where, status: { not: 'PENDING' } },
        }),
        this.prisma.notificationHistory.count({
          where: { ...where, status: 'DELIVERED' },
        }),
        this.prisma.notificationHistory.count({
          where: { ...where, status: 'FAILED' },
        }),
        this.prisma.pushToken.count({
          where: userId ? { userId, isActive: true } : { isActive: true },
        }),
        this.prisma.notificationHistory.findFirst({
          where,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      activeTokens,
      lastSent: lastSent?.createdAt,
    };
  }

  // ==================== NOTIFICATION HISTORY METHODS ====================

  /**
   * Map data type to valid NotificationType
   */
  private mapToNotificationType(dataType: string): string {
    const typeMapping: { [key: string]: string } = {
      'funding': 'WALLET_FUNDING',
      'debit': 'WALLET_DEBIT',
      'wallet': 'TRANSACTION',
      'transaction': 'TRANSACTION',
      'transfer': 'TRANSFER',
      'withdrawal': 'WITHDRAWAL',
      'promotional': 'PROMOTIONAL',
      'system': 'SYSTEM',
      'security': 'SECURITY',
      'kyc': 'KYC',
      'general': 'GENERAL',
    };

    const upperType = dataType.toLowerCase();
    return typeMapping[upperType] || 'GENERAL';
  }

  /**
   * Log notification to history
   */
  private async logNotificationHistory(
    userId: string,
    type: string,
    channel: string,
    title: string,
    body: string,
    data?: any,
    pushToken?: string,
    reference?: string,
    metadata?: any,
  ) {
    try {
      const validNotificationType = this.mapToNotificationType(type);
      
      return await this.prisma.notificationHistory.create({
        data: {
          userId,
          type: validNotificationType as any,
          channel: channel.toUpperCase() as any,
          title,
          body,
          data,
          pushToken,
          reference,
          metadata,
          status: 'SENT' as any,
        },
      });
    } catch (error) {
      this.logger.error(`❌ [HISTORY] Failed to log notification:`, error);
      this.logger.error(`❌ [HISTORY] Type mapping issue - original: ${type}, mapped: ${this.mapToNotificationType(type)}`);
    }
  }

  /**
   * Update notification status in history
   */
  private async updateNotificationStatus(
    userId: string,
    pushToken: string,
    status: string,
    failureReason?: string,
  ) {
    try {
      const notification = await this.prisma.notificationHistory.findFirst({
        where: {
          userId,
          pushToken,
          status: 'SENT',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (notification) {
        await this.prisma.notificationHistory.update({
          where: { id: notification.id },
          data: {
            status: status.toUpperCase() as any,
            deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
            failureReason,
          },
        });
      }
    } catch (error) {
      this.logger.error(`❌ [HISTORY] Failed to update notification status:`, error);
    }
  }

  /**
   * Get user notification history
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    type?: string,
    channel?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const where: any = { userId };

    if (type) {
      where.type = type.toUpperCase();
    }

    if (channel) {
      where.channel = channel.toUpperCase();
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notificationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          channel: true,
          title: true,
          body: true,
          data: true,
          status: true,
          deliveredAt: true,
          readAt: true,
          failureReason: true,
          reference: true,
          createdAt: true,
        },
      }),
      this.prisma.notificationHistory.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notificationHistory.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.prisma.notificationHistory.update({
      where: { id: notificationId },
      data: {
        status: 'READ' as any,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * Send notification to all users (Admin only)
   */
  async sendToAllUsers(
    title: string,
    body: string,
    data?: any,
    priority: 'default' | 'normal' | 'high' = 'normal',
    sound?: string,
    badge?: number,
    channelId?: string,
    ttl?: number,
    categoryId?: string,
    mutableContent?: boolean,
  ) {
    try {
      if (!this.expo) {
        return {
          success: false,
          message: 'Push notifications not configured',
          error: 'EXPO_ACCESS_TOKEN not set',
        };
      }

      // Get all active push tokens with user preferences
      const activeTokens = await this.prisma.pushToken.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              notificationsEnabled: true,
              promotionalNotificationsEnabled: true,
            },
          },
        },
      });

      if (activeTokens.length === 0) {
        return {
          success: false,
          message: 'No active push tokens found',
          error: 'No recipients',
        };
      }

      // Filter tokens based on user preferences
      const eligibleTokens = activeTokens.filter((tokenRecord) => {
        const { user } = tokenRecord;
        return user.notificationsEnabled && user.promotionalNotificationsEnabled;
      });

      if (eligibleTokens.length === 0) {
        return {
          success: false,
          message: 'No users with notifications enabled found',
          error: 'No eligible recipients',
        };
      }

      this.logger.log(
        `📡 [PUSH] Sending notification to all users (${eligibleTokens.length} recipients)`,
      );

      // Log notifications to history
      const historyPromises = eligibleTokens.map((tokenRecord) =>
        this.logNotificationHistory(
          tokenRecord.user.id,
          'PROMOTIONAL',
          'PUSH',
          title,
          body,
          data,
          tokenRecord.token,
          undefined,
          { broadcast: true, totalRecipients: eligibleTokens.length },
        ),
      );
      await Promise.all(historyPromises);

      // Prepare notifications
      const messages = eligibleTokens.map((tokenRecord) => ({
        to: tokenRecord.token,
        title,
        body,
        data: {
          ...data,
          type: 'promotional',
        },
        priority,
        sound,
        badge,
        channelId,
        ttl,
        categoryId,
        mutableContent,
      }));

      // Send in chunks
      const chunkSize = 100;
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          
          // Process tickets and update history
          for (let j = 0; j < chunk.length; j++) {
            const ticket = ticketChunk[j];
            const tokenRecord = eligibleTokens[i + j];
            
            if (ticket.status === 'ok') {
              totalSent++;
            } else {
              totalFailed++;
              await this.updateNotificationStatus(
                tokenRecord.user.id,
                tokenRecord.token,
                'FAILED',
                ticket.message || 'Unknown error',
              );
            }
          }

          // Add delay between chunks
          if (i + chunkSize < messages.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (chunkError) {
          this.logger.error(`❌ [PUSH] Chunk send failed:`, chunkError);
          totalFailed += chunk.length;
          
          // Mark all in chunk as failed
          const failurePromises = chunk.map((msg, j) => {
            const tokenRecord = eligibleTokens[i + j];
            return this.updateNotificationStatus(
              tokenRecord.user.id,
              tokenRecord.token,
              'FAILED',
              chunkError.message || 'Chunk send failed',
            );
          });
          await Promise.all(failurePromises);
        }
      }

      this.logger.log(
        `✅ [PUSH] Broadcast complete: ${totalSent} sent, ${totalFailed} failed`,
      );

      return {
        success: true,
        message: `Notification sent to all users`,
        data: {
          totalRecipients: eligibleTokens.length,
          totalSent,
          totalFailed,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [PUSH] Error sending to all users:`, error);
      return {
        success: false,
        message: 'Failed to send notification to all users',
        error: error.message,
      };
    }
  }
}
