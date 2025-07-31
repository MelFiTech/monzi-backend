import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location.service';
import { LocationPrecisionService } from './location-precision.service';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import {
  LocationUpdateDto,
  ProximityResultDto,
  LocationNotificationDto,
} from '../dto/location-tracking.dto';

interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  lastUpdated: Date;
}

@Injectable()
export class LocationTrackingService {
  private readonly logger = new Logger(LocationTrackingService.name);
  
  // Track active user locations
  private activeUserLocations = new Map<string, UserLocation>();
  
  // Track recent notifications to prevent spam
  private recentNotifications = new Map<string, Set<string>>(); // userId -> Set of locationIds
  
  // Configuration
  private readonly PROXIMITY_RADIUS = 40; // meters
  private readonly NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly LOCATION_UPDATE_INTERVAL = 30; // seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly locationPrecisionService: LocationPrecisionService,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  /**
   * Update user location and check for nearby payment locations
   */
  async updateUserLocation(
    userId: string,
    locationData: LocationUpdateDto,
  ): Promise<ProximityResultDto> {
    try {
      this.logger.log(
        `📍 [LOCATION TRACKING] Updating location for user ${userId}: ${locationData.latitude}, ${locationData.longitude}`,
      );

      // Update user location in memory
      this.activeUserLocations.set(userId, {
        userId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        lastUpdated: new Date(),
      });

      // Check for nearby locations with payment details
      const proximityResult = await this.checkProximityToPaymentLocations(
        userId,
        locationData.latitude,
        locationData.longitude,
      );

      if (proximityResult.isNearby) {
        this.logger.log(
          `🎯 [LOCATION TRACKING] User ${userId} is near payment location: ${proximityResult.locationName} (${proximityResult.distance}m)`,
        );

        // Send location-based notification if not recently sent
        await this.sendLocationNotificationIfNeeded(
          userId,
          proximityResult,
        );
      }

      return proximityResult;
    } catch (error) {
      this.logger.error(
        `❌ [LOCATION TRACKING] Error updating user location:`,
        error.message,
      );
      return {
        isNearby: false,
      };
    }
  }

  /**
   * Check if user is near any locations with payment details
   */
  private async checkProximityToPaymentLocations(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<ProximityResultDto> {
    try {
      // Get nearby locations with payment suggestions
      const nearbyLocations = await this.locationPrecisionService.getNearbyLocationsWithSuggestions(
        latitude,
        longitude,
        this.PROXIMITY_RADIUS,
        5, // Limit to 5 closest locations
      );

      if (nearbyLocations.length === 0) {
        return { isNearby: false };
      }

      // Get the closest location
      const closestLocation = nearbyLocations[0];
      
      if (!closestLocation || closestLocation.paymentSuggestions.length === 0) {
        return { isNearby: false };
      }

      return {
        isNearby: true,
        locationName: closestLocation.name,
        distance: closestLocation.distance,
        locationAddress: closestLocation.address,
        locationId: closestLocation.locationId,
        paymentSuggestions: closestLocation.paymentSuggestions,
      };
    } catch (error) {
      this.logger.error(
        `❌ [LOCATION TRACKING] Error checking proximity:`,
        error.message,
      );
      return { isNearby: false };
    }
  }

  /**
   * Send location-based notification if not recently sent
   */
  private async sendLocationNotificationIfNeeded(
    userId: string,
    proximityResult: ProximityResultDto,
  ): Promise<void> {
    try {
      if (!proximityResult.locationId) {
        return;
      }

      // Check if notification was recently sent for this location
      const recentNotificationsForUser = this.recentNotifications.get(userId) || new Set();
      const notificationKey = `${userId}_${proximityResult.locationId}`;
      
      if (recentNotificationsForUser.has(notificationKey)) {
        this.logger.log(
          `⏰ [LOCATION TRACKING] Notification recently sent for user ${userId} at location ${proximityResult.locationId}`,
        );
        return;
      }

      // Check user notification preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          notificationsEnabled: true,
          locationNotificationsEnabled: true,
        },
      });

      if (!user || !user.notificationsEnabled || !user.locationNotificationsEnabled) {
        this.logger.log(
          `🔕 [LOCATION TRACKING] Location notifications disabled for user ${userId}`,
        );
        return;
      }

      // Create notification data
      const notificationData = this.createLocationNotificationData(proximityResult);

      // Send push notification
      const notificationResult = await this.pushNotificationsService.sendPushNotificationToUser(
        userId,
        {
          title: notificationData.title,
          body: notificationData.body,
          data: {
            type: 'location',
            locationId: notificationData.locationId,
            locationName: notificationData.locationName,
            locationAddress: notificationData.locationAddress,
            distance: notificationData.distance,
            paymentSuggestions: notificationData.paymentSuggestions,
          },
          priority: 'high',
        },
      );

      if (notificationResult.success) {
        this.logger.log(
          `✅ [LOCATION TRACKING] Location notification sent to user ${userId} for location ${proximityResult.locationName}`,
        );

        // Mark notification as sent
        recentNotificationsForUser.add(notificationKey);
        this.recentNotifications.set(userId, recentNotificationsForUser);

        // Clean up old notifications after cooldown period
        setTimeout(() => {
          const userNotifications = this.recentNotifications.get(userId);
          if (userNotifications) {
            userNotifications.delete(notificationKey);
          }
        }, this.NOTIFICATION_COOLDOWN);
      } else {
        this.logger.error(
          `❌ [LOCATION TRACKING] Failed to send location notification to user ${userId}:`,
          notificationResult.message,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [LOCATION TRACKING] Error sending location notification:`,
        error.message,
      );
    }
  }

  /**
   * Create location notification data with truncated title
   */
  private createLocationNotificationData(
    proximityResult: ProximityResultDto,
  ): LocationNotificationDto {
    const locationName = proximityResult.locationName || 'Unknown Location';
    const truncatedLocationName = this.truncateLocationName(locationName, 20);

    return {
      title: `Back at ${truncatedLocationName}? 👀`,
      body: 'Account details available, Tap to pay now',
      type: 'location',
      locationId: proximityResult.locationId!,
      locationName: proximityResult.locationName!,
      locationAddress: proximityResult.locationAddress!,
      distance: proximityResult.distance!,
      paymentSuggestions: proximityResult.paymentSuggestions || [],
    };
  }

  /**
   * Truncate location name to fit notification title
   */
  private truncateLocationName(locationName: string, maxLength: number = 20): string {
    if (locationName.length <= maxLength) {
      return locationName;
    }

    // Try to truncate at word boundaries
    const words = locationName.split(' ');
    let truncated = '';

    for (const word of words) {
      if ((truncated + ' ' + word).length <= maxLength) {
        truncated += (truncated ? ' ' : '') + word;
      } else {
        break;
      }
    }

    return truncated || locationName.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get user's current location
   */
  getUserLocation(userId: string): UserLocation | null {
    return this.activeUserLocations.get(userId) || null;
  }

  /**
   * Remove user from location tracking
   */
  removeUserLocation(userId: string): void {
    this.activeUserLocations.delete(userId);
    this.recentNotifications.delete(userId);
    this.logger.log(`🗑️ [LOCATION TRACKING] Removed user ${userId} from location tracking`);
  }

  /**
   * Get all active user locations
   */
  getActiveUserLocations(): Map<string, UserLocation> {
    return this.activeUserLocations;
  }

  /**
   * Clean up old location data
   */
  cleanupOldLocations(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

    for (const [userId, location] of this.activeUserLocations.entries()) {
      if (location.lastUpdated < cutoffTime) {
        this.activeUserLocations.delete(userId);
        this.logger.log(`🧹 [LOCATION TRACKING] Cleaned up old location for user ${userId}`);
      }
    }
  }
} 