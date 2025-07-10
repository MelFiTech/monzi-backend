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
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    // Join user-specific room
    client.join(`user_${userId}`);

    // Map socket to user
    this.clientUserMap.set(client.id, userId);

    this.logger.log(`👤 User ${userId} joined room (socket: ${client.id})`);

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
   */
  emitWalletBalanceUpdate(
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
   */
  emitTransactionNotification(
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
   */
  emitNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
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
}
