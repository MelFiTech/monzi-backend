import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import {
  UpdateDeviceTokenOnLoginDto,
  DeviceTokenUpdateResponseDto,
  SignOutDto,
  SignOutResponseDto,
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
} from '../dto/auth.dto';

@Injectable()
export class AuthNotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private pushNotificationsService: PushNotificationsService,
  ) {}

  // Update device token on login
  async updateDeviceTokenOnLogin(
    userId: string,
    deviceToken: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      platform?: string;
      osVersion?: string;
      appVersion?: string;
      buildVersion?: string;
      appOwnership?: string;
      executionEnvironment?: string;
      isDevice?: boolean;
      brand?: string;
      manufacturer?: string;
    },
  ): Promise<DeviceTokenUpdateResponseDto> {
    console.log('🔍 [AUTH] Update device token request:', { userId, deviceToken });

    // Check if this token already exists globally
    const existingToken = await this.prisma.pushToken.findUnique({
      where: { token: deviceToken },
    });

    // Check if device token already exists for this user and is active
    const userActiveToken = await this.prisma.pushToken.findFirst({
      where: {
        userId,
        token: deviceToken,
        isActive: true,
      },
    });

    if (userActiveToken) {
      console.log('✅ [AUTH] Device token already exists for this user');
      return {
        success: true,
        message: 'Device token already registered',
        deviceUpdated: false,
      };
    }

    if (existingToken) {
      // If token exists for another user, update it to be active for this user and update device info
      await this.prisma.pushToken.update({
        where: { token: deviceToken },
        data: {
          userId,
          deviceId: deviceInfo?.deviceId,
          deviceName: deviceInfo?.deviceName,
          platform: deviceInfo?.platform,
          osVersion: deviceInfo?.osVersion,
          appVersion: deviceInfo?.appVersion,
          buildVersion: deviceInfo?.buildVersion,
          appOwnership: deviceInfo?.appOwnership,
          executionEnvironment: deviceInfo?.executionEnvironment,
          isDevice: deviceInfo?.isDevice,
          brand: deviceInfo?.brand,
          manufacturer: deviceInfo?.manufacturer,
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      // Deactivate all existing tokens for this user
      await this.prisma.pushToken.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Create new device token
      await this.prisma.pushToken.create({
        data: {
          userId,
          token: deviceToken,
          deviceId: deviceInfo?.deviceId,
          deviceName: deviceInfo?.deviceName,
          platform: deviceInfo?.platform,
          osVersion: deviceInfo?.osVersion,
          appVersion: deviceInfo?.appVersion,
          buildVersion: deviceInfo?.buildVersion,
          appOwnership: deviceInfo?.appOwnership,
          executionEnvironment: deviceInfo?.executionEnvironment,
          isDevice: deviceInfo?.isDevice,
          brand: deviceInfo?.brand,
          manufacturer: deviceInfo?.manufacturer,
          isActive: true,
        },
      });
    }

    console.log('✅ [AUTH] Device token updated successfully');
    return {
      success: true,
      message: 'Device token updated to new device',
      deviceUpdated: true,
    };
  }

  // Sign out
  async signOut(
    userId: string,
    dto: SignOutDto,
  ): Promise<SignOutResponseDto> {
    const { disableTransactionNotifications, disablePromotionalNotifications } = dto;

    console.log('🔍 [AUTH] Sign out request:', { userId, disableTransactionNotifications, disablePromotionalNotifications });

    let transactionNotificationsDisabled = false;
    let promotionalNotificationsDisabled = false;

    // Update notification preferences if requested
    if (disableTransactionNotifications || disablePromotionalNotifications) {
      const updateData: any = {};

      if (disableTransactionNotifications) {
        updateData.transactionNotificationsEnabled = false;
        transactionNotificationsDisabled = true;
      }

      if (disablePromotionalNotifications) {
        updateData.promotionalNotificationsEnabled = false;
        promotionalNotificationsDisabled = true;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    // Deactivate all push tokens for this user
    await this.prisma.pushToken.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    console.log('✅ [AUTH] User signed out successfully');
    return {
      success: true,
      message: 'Successfully signed out',
      transactionNotificationsDisabled,
      promotionalNotificationsDisabled,
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    const { notificationsEnabled, transactionNotificationsEnabled, promotionalNotificationsEnabled } = dto;

    console.log('🔍 [AUTH] Update notification preferences:', { userId, notificationsEnabled, transactionNotificationsEnabled, promotionalNotificationsEnabled });

    const updateData: any = {};

    if (notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = notificationsEnabled;
    }

    if (transactionNotificationsEnabled !== undefined) {
      updateData.transactionNotificationsEnabled = transactionNotificationsEnabled;
    }

    if (promotionalNotificationsEnabled !== undefined) {
      updateData.promotionalNotificationsEnabled = promotionalNotificationsEnabled;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    console.log('✅ [AUTH] Notification preferences updated successfully');

    return {
      success: true,
      message: 'Push notification preferences updated successfully',
      preferences: {
        notificationsEnabled: updatedUser.notificationsEnabled,
        transactionNotificationsEnabled: updatedUser.transactionNotificationsEnabled,
        promotionalNotificationsEnabled: updatedUser.promotionalNotificationsEnabled,
      },
    };
  }

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    console.log('🔍 [AUTH] Get notification preferences:', { userId });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationsEnabled: true,
        transactionNotificationsEnabled: true,
        promotionalNotificationsEnabled: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    console.log('✅ [AUTH] Notification preferences retrieved successfully');

    return {
      success: true,
      message: 'Push notification preferences retrieved successfully',
      preferences: {
        notificationsEnabled: user.notificationsEnabled,
        transactionNotificationsEnabled: user.transactionNotificationsEnabled,
        promotionalNotificationsEnabled: user.promotionalNotificationsEnabled,
      },
    };
  }
} 