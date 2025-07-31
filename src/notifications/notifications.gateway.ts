import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationTrackingService } from '../location/services/location-tracking.service';
import { LocationUpdateDto, LocationSubscriptionDto } from '../location/dto/location-tracking.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private clientUserMap = new Map<string, string>(); // socketId -> userId

  constructor(
    private prisma: PrismaService,
    private locationTrackingService: LocationTrackingService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.clientUserMap.get(client.id);
    if (userId) {
      this.clientUserMap.delete(client.id);
      this.logger.log(`📱 User ${userId} disconnected (socket: ${client.id})`);
    } else {
      this.logger.log(`🔌 Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('join_user_room')
  async handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    // Join user-specific room
    client.join(`user_${userId}`);

    // Map socket to user
    this.clientUserMap.set(client.id, userId);

    this.logger.log(`👤 User ${userId} joined room (socket: ${client.id})`);

    // Auto-subscribe to location tracking if user has it enabled
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          locationNotificationsEnabled: true,
        },
      });

      if (user && user.locationNotificationsEnabled) {
        // Auto-subscribe to location tracking
        client.join(`location_${userId}`);
        
        this.logger.log(`📍 [WEBSOCKET] Auto-subscribed user ${userId} to location tracking`);
        
        client.emit('location:auto_subscribed', {
          success: true,
          message: 'Auto-subscribed to location tracking',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `❌ [WEBSOCKET] Error auto-subscribing to location tracking:`,
        error.message,
      );
    }

    // Send confirmation
    client.emit('joined_room', {
      userId,
      message: 'Successfully joined notifications room',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leave_user_room')
  handleLeaveUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    // Leave user-specific room
    client.leave(`user_${userId}`);

    // Remove socket mapping
    this.clientUserMap.delete(client.id);

    this.logger.log(`👤 User ${userId} left room (socket: ${client.id})`);

    // Send confirmation
    client.emit('left_room', {
      userId,
      message: 'Successfully left notifications room',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit wallet balance update to specific user
   * Real-time websocket notifications are always sent regardless of push notification preferences
   */
  async emitWalletBalanceUpdate(
    userId: string,
    data: {
      oldBalance: number;
      newBalance: number;
      change?: number;
      currency?: string;
      provider?: string;
      accountNumber: string;
      grossAmount?: number;
      fundingFee?: number;
      netAmount?: number;
      transactionId?: string;
      reference: string;
    },
  ) {
    this.logger.log(
      `💰 Emitting wallet balance update to user ${userId} (room: user_${userId})`,
    );
    this.logger.log(
      `💰 Balance: ₦${data.oldBalance} → ₦${data.newBalance} (+₦${data.change || data.newBalance - data.oldBalance})`,
    );

    this.server.to(`user_${userId}`).emit('wallet_balance_updated', {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit transaction notification to specific user
   * Real-time websocket notifications are always sent regardless of push notification preferences
   */
  async emitTransactionNotification(
    userId: string,
    data: {
      type: 'FUNDING' | 'TRANSFER' | 'WITHDRAWAL';
      amount: number;
      grossAmount?: number;
      fee?: number;
      currency?: string;
      description: string;
      reference: string;
      transactionId?: string;
      provider?: string;
      status: string;
      timestamp: string | Date;
    },
  ) {
    this.logger.log(`💳 Emitting transaction notification to user ${userId}`);

    this.server.to(`user_${userId}`).emit('transaction_notification', {
      ...data,
      timestamp:
        typeof data.timestamp === 'string'
          ? new Date(data.timestamp)
          : data.timestamp,
    });
  }

  /**
   * Emit general notification to specific user
   * Real-time websocket notifications are always sent regardless of push notification preferences
   */
  async emitNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error' | 'promotional';
      data?: any;
    },
  ) {
    this.logger.log(
      `🔔 Emitting notification to user ${userId}: ${notification.title}`,
    );

    this.server.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
      id: Math.random().toString(36).substr(2, 9),
    });
  }

  /**
   * Emit promotional notification (admin-only)
   * Real-time websocket notifications are always sent regardless of push notification preferences
   */
  async emitPromotionalNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      data?: any;
    },
  ) {
    this.logger.log(
      `📢 Emitting promotional notification to user ${userId}: ${notification.title}`,
    );

    this.server.to(`user_${userId}`).emit('notification', {
      ...notification,
      type: 'promotional',
      timestamp: new Date(),
      id: Math.random().toString(36).substr(2, 9),
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  /**
   * Get users in specific room
   */
  async getUsersInRoom(roomName: string): Promise<string[]> {
    const sockets = await this.server.in(roomName).fetchSockets();
    return sockets.map((socket) => socket.id);
  }

  // ==================== LOCATION TRACKING HANDLERS ====================

  /**
   * Handle location updates from frontend
   */
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdateDto & { userId: string },
  ) {
    const { userId, ...locationData } = data;

    this.logger.log(
      `📍 [WEBSOCKET] Location update from user ${userId}: ${locationData.latitude}, ${locationData.longitude}`,
    );

    try {
      // Update user location and check for nearby payment locations
      const proximityResult = await this.locationTrackingService.updateUserLocation(
        userId,
        locationData,
      );

      // Send proximity result back to client
      client.emit('location:proximity_result', {
        success: true,
        proximityResult,
        timestamp: new Date().toISOString(),
      });

      // If user is nearby a payment location, emit real-time notification
      if (proximityResult.isNearby) {
        this.server.to(`user_${userId}`).emit('location:nearby_payment_location', {
          locationName: proximityResult.locationName,
          distance: proximityResult.distance,
          locationAddress: proximityResult.locationAddress,
          locationId: proximityResult.locationId,
          paymentSuggestions: proximityResult.paymentSuggestions.map(suggestion => ({
            accountNumber: suggestion.accountNumber,
            bankName: suggestion.bankName,
            accountName: suggestion.accountName,
            bankCode: suggestion.bankCode,
            frequency: suggestion.frequency,
            lastTransactionDate: suggestion.lastTransactionDate,
          })),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `❌ [WEBSOCKET] Error handling location update:`,
        error.message,
      );

      client.emit('location:error', {
        success: false,
        message: 'Failed to process location update',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle location tracking subscription
   */
  @SubscribeMessage('location:subscribe')
  async handleLocationSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationSubscriptionDto,
  ) {
    const { userId, enabled, updateFrequency = 30, proximityRadius = 40 } = data;

    this.logger.log(
      `📍 [WEBSOCKET] Location subscription request from user ${userId}: enabled=${enabled}`,
    );

    try {
      // Check user's location notification preference
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          locationNotificationsEnabled: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Only allow subscription if user has location notifications enabled
      if (enabled && !user.locationNotificationsEnabled) {
        client.emit('location:error', {
          success: false,
          message: 'Location notifications are disabled in settings',
          error: 'LOCATION_NOTIFICATIONS_DISABLED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (enabled) {
        // Join location tracking room
        client.join(`location_${userId}`);
        
        this.logger.log(
          `✅ [WEBSOCKET] User ${userId} subscribed to location tracking`,
        );

        client.emit('location:subscribed', {
          success: true,
          message: 'Location tracking enabled',
          updateFrequency,
          proximityRadius,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Leave location tracking room
        client.leave(`location_${userId}`);
        
        // Remove user from location tracking
        this.locationTrackingService.removeUserLocation(userId);

        this.logger.log(
          `❌ [WEBSOCKET] User ${userId} unsubscribed from location tracking`,
        );

        client.emit('location:unsubscribed', {
          success: true,
          message: 'Location tracking disabled',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `❌ [WEBSOCKET] Error handling location subscription:`,
        error.message,
      );

      client.emit('location:error', {
        success: false,
        message: 'Failed to update location subscription',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle location tracking unsubscription
   */
  @SubscribeMessage('location:unsubscribe')
  async handleLocationUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    this.logger.log(
      `📍 [WEBSOCKET] Location unsubscription request from user ${userId}`,
    );

    try {
      // Leave location tracking room
      client.leave(`location_${userId}`);
      
      // Remove user from location tracking
      this.locationTrackingService.removeUserLocation(userId);

      this.logger.log(
        `❌ [WEBSOCKET] User ${userId} unsubscribed from location tracking`,
      );

      client.emit('location:unsubscribed', {
        success: true,
        message: 'Location tracking disabled',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `❌ [WEBSOCKET] Error handling location unsubscription:`,
        error.message,
      );

      client.emit('location:error', {
        success: false,
        message: 'Failed to unsubscribe from location tracking',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get user's current location
   */
  @SubscribeMessage('location:get_current')
  async handleGetCurrentLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    try {
      const userLocation = this.locationTrackingService.getUserLocation(userId);

      client.emit('location:current_location', {
        success: true,
        location: userLocation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `❌ [WEBSOCKET] Error getting current location:`,
        error.message,
      );

      client.emit('location:error', {
        success: false,
        message: 'Failed to get current location',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
