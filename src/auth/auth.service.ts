import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import * as bcrypt from 'bcrypt';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RegisterResponseDto,
  OtpResponseDto,
  AuthResponseDto,
  UserProfileDto,
  SignOutDto,
  SignOutResponseDto,
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private notificationsGateway: NotificationsGateway,
    private pushNotificationsService: PushNotificationsService,
  ) {}

  // Step 1: Register new account
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const { email, phone, gender, dateOfBirth, passcode } = registerDto;

    console.log('🔍 [AUTH] Registration request:', { email, phone, gender, dateOfBirth });

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new BadRequestException('Account with this email already exists');
      }
      if (existingUser.phone === phone) {
        throw new BadRequestException('Account with this phone number already exists');
      }
    }

    // Hash the passcode
    const hashedPasscode = await bcrypt.hash(passcode, 10);

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      // Create user with all required information
      const user = await this.prisma.user.create({
        data: {
          email,
          phone,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          passcode: hashedPasscode,
          otpCode,
          otpExpiresAt,
          isVerified: false,
          isOnboarded: false,
        },
      });

      // Send Email OTP
      await this.sendEmailOtp(email, otpCode, user.id);

      console.log('✅ [AUTH] User registered successfully, Email OTP sent');

      return {
        success: true,
        message: 'Registration successful. Email OTP sent to your email.',
        email,
        otpExpiresAt: otpExpiresAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [AUTH] Registration failed:', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  // Step 2: Login existing user
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, passcode } = loginDto;

    console.log('🔐 [AUTH] Login attempt for:', email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or passcode');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your phone number first');
    }

    if (!user.isOnboarded) {
      throw new UnauthorizedException('Account setup not completed');
    }

    // Verify passcode
    const isValidPasscode = await bcrypt.compare(passcode, user.passcode);
    if (!isValidPasscode) {
      throw new UnauthorizedException('Invalid email or passcode');
    }

    // Reset transaction notification preferences on login
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        transactionNotificationsEnabled: true, // Always enable transaction notifications on login
      },
    });

    // Clear push notification cache for this user
    this.pushNotificationsService.clearUserPreferencesCache(user.id);

    // Generate JWT token
    const payload = { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role };
    const access_token = this.jwtService.sign(payload);

    console.log('✅ [AUTH] Login successful for:', email);
    console.log('🔔 [AUTH] Transaction notifications reset to enabled');

    // Emit real-time notification about login
    this.notificationsGateway.emitNotification(updatedUser.id, {
      title: 'Welcome Back!',
      message: 'You have successfully logged in. Transaction notifications are now enabled.',
      type: 'success',
      data: {
        operation: 'login',
        transactionNotificationsEnabled: true,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      access_token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth.toISOString(),
        isVerified: updatedUser.isVerified,
        isOnboarded: updatedUser.isOnboarded,
        role: updatedUser.role,
      },
    };
  }

  /**
   * Update device token on login (called by mobile app after successful login)
   */
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
  ): Promise<{
    success: boolean;
    message: string;
    deviceUpdated: boolean;
  }> {
    try {
      console.log('📱 [AUTH] Updating device token for user:', userId);
      console.log('🔑 [AUTH] New device token:', deviceToken);

      // Check if user has existing push tokens
      const existingTokens = await this.prisma.pushToken.findMany({
        where: { userId, isActive: true },
        orderBy: { lastUsedAt: 'desc' },
      });

      if (existingTokens.length === 0) {
        // No existing tokens, create new one
        await this.pushNotificationsService.registerPushToken(userId, {
          token: deviceToken,
          ...deviceInfo,
        });

        console.log('✅ [AUTH] Created new device token for user');
        return {
          success: true,
          message: 'Device token registered successfully',
          deviceUpdated: true,
        };
      }

      // Check if the new token is different from the most recent one
      const mostRecentToken = existingTokens[0];
      
      if (mostRecentToken.token === deviceToken) {
        console.log('🔄 [AUTH] Device token unchanged, updating last used time');
        
        // Update last used time for existing token
        await this.prisma.pushToken.update({
          where: { id: mostRecentToken.id },
          data: {
            lastUsedAt: new Date(),
            ...deviceInfo, // Update device info
          },
        });

        return {
          success: true,
          message: 'Device token updated successfully',
          deviceUpdated: false,
        };
      }

      // Different device token detected - update to new device
      console.log('🔄 [AUTH] Different device token detected, switching to new device');

      // Store old tokens for notification
      const oldTokens = existingTokens.map(token => ({
        token: token.token,
        deviceName: token.deviceName || 'Unknown Device',
        platform: token.platform || 'Unknown',
      }));

      // Send push notification to old devices about the device change BEFORE deactivating them
      for (const oldToken of oldTokens) {
        try {
          // Send directly to the old token before it gets deactivated
          await this.pushNotificationsService.sendPushNotificationToUser(userId, {
            title: '🔒 New Device Detected',
            body: `Your Monzi account was accessed from a new device. If this wasn't you, contact support immediately.`,
            data: {
              type: 'security',
              operation: 'device_change',
              oldDevice: oldToken.deviceName,
              newDevice: deviceInfo?.deviceName || 'New Device',
              timestamp: new Date().toISOString(),
            },
            priority: 'high',
          });
        } catch (error) {
          console.error('❌ [AUTH] Failed to send push notification to old device:', error);
        }
      }

      // Deactivate old tokens for this user
      await this.prisma.pushToken.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Register new device token
      await this.pushNotificationsService.registerPushToken(userId, {
        token: deviceToken,
        ...deviceInfo,
      });

      // Send email notification about device change
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        });

        if (user) {
          await this.emailService.sendDeviceChangeEmail({
        email: user.email,
            name: user.firstName || user.email.split('@')[0],
            deviceName: deviceInfo?.deviceName || 'New Device',
            platform: deviceInfo?.platform || 'Unknown',
            timestamp: new Date().toLocaleString('en-US', {
              timeZone: 'Africa/Lagos',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        }
      } catch (error) {
        console.error('❌ [AUTH] Failed to send device change email:', error);
      }

      // Emit real-time notification about device change
      this.notificationsGateway.emitNotification(userId, {
        title: 'New Device Detected',
        message: 'You have logged in on a new device. Push notifications will now be sent to this device.',
        type: 'info',
        data: {
          operation: 'device_change',
          newDeviceToken: deviceToken,
          deviceInfo,
          timestamp: new Date().toISOString(),
        },
      });

      console.log('✅ [AUTH] Device token updated to new device');
      return {
        success: true,
        message: 'Device token updated to new device',
        deviceUpdated: true,
      };
    } catch (error) {
      console.error('❌ [AUTH] Error updating device token:', error);
      return {
        success: false,
        message: 'Failed to update device token',
        deviceUpdated: false,
    };
    }
  }

  // Step 3: Verify Email OTP
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { email, otpCode } = verifyOtpDto;

    console.log('🔍 [AUTH] OTP verification for email:', email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found with this email address');
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    // Accept fixed OTP '123456' for testing/development, or the actual generated OTP
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const allowFixedOtp = isDevelopment || process.env.ALLOW_FIXED_OTP === 'true';
    
    if (allowFixedOtp && otpCode === '123456') {
      console.log('🧪 [AUTH] Fixed OTP "123456" used for testing/development');
    } else if (user.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Mark as verified and onboarded, clear OTP, and reset notification preferences
    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        isOnboarded: true,
        otpCode: null,
        otpExpiresAt: null,
        transactionNotificationsEnabled: true, // Enable transaction notifications for new users
      },
    });

    // Generate JWT token for immediate login
    const payload = { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role };
    const access_token = this.jwtService.sign(payload);

    console.log('✅ [AUTH] OTP verified successfully, user logged in');

    return {
      access_token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth.toISOString(),
        isVerified: updatedUser.isVerified,
        isOnboarded: updatedUser.isOnboarded,
        role: updatedUser.role,
      },
    };
  }

  // Resend Email OTP
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponseDto> {
    const { email } = resendOtpDto;

    console.log('🔄 [AUTH] Resending OTP to email:', email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found with this email address');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    // Generate new OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with new OTP
    await this.prisma.user.update({
      where: { email },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    // Send Email OTP
    await this.sendEmailOtp(email, otpCode, user.id);

    console.log('✅ [AUTH] OTP resent successfully');

    return {
      success: true,
      message: 'Email OTP resent successfully',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Helper methods
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendEmailOtp(email: string, otpCode: string, userId: string): Promise<void> {
    console.log('📧 [EMAIL SERVICE] Sending OTP to:', email);
    console.log('🔑 [EMAIL SERVICE] OTP Code:', otpCode);

    try {
      // Get user name for email personalization
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      // Use email service to send OTP with correct template variables
      await this.emailService.sendOtpEmail({
        email,
        name: user?.email.split('@')[0] || 'User',
        otpCode,
        expirationMinutes: '15',
      });

      console.log('✅ [EMAIL SERVICE] OTP sent successfully');
    } catch (error) {
      console.error('❌ [EMAIL SERVICE] Failed to send OTP:', error);
      throw new BadRequestException('Failed to send Email OTP');
    }
  }

  // JWT validation
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        isOnboarded: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return user;
  }

  // Get user profile
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        isOnboarded: true,
        role: true,
        kycStatus: true,
        bvn: true,
        bvnVerifiedAt: true,
        selfieUrl: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            currency: true,
            virtualAccountNumber: true,
            provider: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      dateOfBirth: user.dateOfBirth.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || null,
      wallet: user.wallet ? {
        ...user.wallet,
        createdAt: user.wallet.createdAt.toISOString(),
        updatedAt: user.wallet.updatedAt.toISOString(),
      } : null,
    };
  }

  // Get user transactions with detailed information
  async getUserTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    type?: string,
    status?: string,
  ) {
    console.log('💸 [AUTH SERVICE] Getting transactions for user:', userId);
    console.log('📊 [AUTH SERVICE] Filters:', { limit, offset, type, status });

    // Build filter conditions
    const whereConditions: any = {
      userId: userId,
    };

    if (type) {
      whereConditions.type = type;
    }

    if (status) {
      whereConditions.status = status;
    }

    // Get transactions with detailed information
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          fromAccount: {
            select: {
              id: true,
              accountNumber: true,
              bankName: true,
              bankCode: true,
              accountName: true,
            },
          },
          toAccount: {
            select: {
              id: true,
              accountNumber: true,
              bankName: true,
              bankCode: true,
              accountName: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({
        where: whereConditions,
      }),
    ]);

    // Get transaction statistics
    const stats = await this.prisma.transaction.aggregate({
      where: { userId: userId },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    // Count transactions by status
    const statusCounts = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: { userId: userId },
      _count: {
        _all: true,
      },
    });

    // Format status counts
    const statusStats = {
      completed: statusCounts.find(s => s.status === 'COMPLETED')?._count._all || 0,
      pending: statusCounts.find(s => s.status === 'PENDING')?._count._all || 0,
      failed: statusCounts.find(s => s.status === 'FAILED')?._count._all || 0,
      cancelled: statusCounts.find(s => s.status === 'CANCELLED')?._count._all || 0,
    };

    // Format transactions
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      fromAccount: transaction.fromAccount ? {
        id: transaction.fromAccount.id,
        accountNumber: transaction.fromAccount.accountNumber,
        bankName: transaction.fromAccount.bankName,
        bankCode: transaction.fromAccount.bankCode,
        accountName: transaction.fromAccount.accountName,
      } : null,
      toAccount: transaction.toAccount ? {
        id: transaction.toAccount.id,
        accountNumber: transaction.toAccount.accountNumber,
        bankName: transaction.toAccount.bankName,
        bankCode: transaction.toAccount.bankCode,
        accountName: transaction.toAccount.accountName,
      } : null,
    }));

    console.log('✅ [AUTH SERVICE] Retrieved', formattedTransactions.length, 'transactions');

    return {
      success: true,
      transactions: formattedTransactions,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      stats: {
        totalAmount: stats._sum.amount || 0,
        totalTransactions: stats._count._all || 0,
        ...statusStats,
      },
    };
  }

  // Get user transaction detail
  async getUserTransactionDetail(
    userId: string,
    transactionId: string,
  ) {
    console.log('🔍 [AUTH SERVICE] Getting transaction detail for user:', userId, 'transaction:', transactionId);

    // Get transaction with detailed information
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: userId, // Ensure user can only access their own transactions
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            wallet: {
              select: {
                id: true,
                virtualAccountNumber: true,
                balance: true,
              },
            },
          },
        },
        fromAccount: {
          select: {
            id: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
            accountName: true,
          },
        },
        toAccount: {
          select: {
            id: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
            accountName: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Extract metadata for additional information
    const metadata = transaction.metadata as any || {};
    const user = transaction.user;
    const wallet = user.wallet;

    // Determine source information
    const source = this.buildTransactionSource(transaction, metadata, user, wallet);

    // Determine destination information
    const destination = this.buildTransactionDestination(transaction, metadata, user, wallet);

    // Build fee information
    const fee = this.buildTransactionFee(transaction, metadata);

    // Build balance impact (from metadata if available)
    const balanceImpact = this.buildBalanceImpact(transaction, metadata);

    // Build timeline
    const timeline = {
      createdAt: transaction.createdAt.toISOString(),
      processingAt: metadata.processingAt ? new Date(metadata.processingAt).toISOString() : undefined,
      completedAt: transaction.status === 'COMPLETED' ? transaction.updatedAt.toISOString() : undefined,
      updatedAt: transaction.updatedAt.toISOString(),
    };

    // Build comprehensive transaction detail
    const transactionDetail = {
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      source,
      destination,
      fee,
      balanceImpact,
      timeline,
      metadata: transaction.metadata,
      providerReference: metadata.providerReference || null,
      providerResponse: metadata.providerResponse || null,
    };

    console.log('✅ [AUTH SERVICE] Transaction detail retrieved successfully');

    return {
      success: true,
      transaction: transactionDetail,
    };
  }

  // Helper method to build transaction source information
  private buildTransactionSource(transaction: any, metadata: any, user: any, wallet: any) {
    if (transaction.fromAccount) {
      return {
        type: 'BANK',
        name: transaction.fromAccount.accountName,
        accountNumber: transaction.fromAccount.accountNumber,
        bankName: transaction.fromAccount.bankName,
        bankCode: transaction.fromAccount.bankCode,
      };
    }

    if (metadata.adminFunding || metadata.adminDebit) {
      return {
        type: 'ADMIN',
        name: 'Monzi Admin',
        provider: 'MONZI',
      };
    }

    if (metadata.provider) {
      return {
        type: 'PROVIDER',
        name: metadata.providerAccountName || 'External Account',
        provider: metadata.provider,
        accountNumber: metadata.accountNumber,
      };
    }

    if (wallet && (transaction.type === 'WITHDRAWAL' || transaction.type === 'TRANSFER')) {
      return {
        type: 'WALLET',
        name: `${user.firstName} ${user.lastName}`,
        accountNumber: wallet.virtualAccountNumber,
        provider: 'MONZI',
      };
    }

    return null;
  }

  // Helper method to build transaction destination information
  private buildTransactionDestination(transaction: any, metadata: any, user: any, wallet: any) {
    if (transaction.toAccount) {
      return {
        type: 'BANK',
        name: transaction.toAccount.accountName,
        accountNumber: transaction.toAccount.accountNumber,
        bankName: transaction.toAccount.bankName,
        bankCode: transaction.toAccount.bankCode,
      };
    }

    if (metadata.recipientBank) {
      return {
        type: 'BANK',
        name: metadata.recipientName || 'External Account',
        accountNumber: metadata.recipientAccount,
        bankName: metadata.recipientBank,
        bankCode: metadata.bankCode,
      };
    }

    if (wallet && (transaction.type === 'DEPOSIT' || transaction.type === 'FUNDING')) {
      return {
        type: 'WALLET',
        name: `${user.firstName} ${user.lastName}`,
        accountNumber: wallet.virtualAccountNumber,
        provider: 'MONZI',
      };
    }

    if (metadata.provider) {
      return {
        type: 'PROVIDER',
        name: metadata.providerAccountName || 'External Account',
        provider: metadata.provider,
      };
    }

    return null;
  }

  // Helper method to build transaction fee information
  private buildTransactionFee(transaction: any, metadata: any) {
    const feeAmount = metadata.fee || 0;
    if (feeAmount > 0) {
      return {
        amount: feeAmount,
        currency: transaction.currency,
        breakdown: metadata.feeBreakdown || null,
      };
    }
    return null;
  }

  // Helper method to build balance impact information
  private buildBalanceImpact(transaction: any, metadata: any) {
    if (metadata.previousBalance !== undefined && metadata.newBalance !== undefined) {
      const previousBalance = metadata.previousBalance;
      const newBalance = metadata.newBalance;
      const balanceChange = newBalance - previousBalance;
      const effectiveAmount = transaction.type === 'WITHDRAWAL' ? 
        transaction.amount + (metadata.fee || 0) : 
        transaction.amount - (metadata.fee || 0);

      return {
        previousBalance,
        newBalance,
        balanceChange,
        effectiveAmount,
      };
    }
    return null;
  }

  // Request OTP for PIN/Passcode reset
  async requestResetOtp(dto: { email: string }): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    console.log('🔐 [AUTH] Requesting reset OTP for:', dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    // Send OTP via email
    await this.sendEmailOtp(dto.email, otpCode, user.id);

    console.log('✅ [AUTH] Reset OTP sent successfully');

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Change Transaction PIN
  async changeTransactionPin(
    userId: string,
    dto: {
      currentPin?: string;
      newPin: string;
      otpCode?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🔐 [AUTH] Changing transaction PIN for user:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    if (!user.wallet) {
      throw new BadRequestException('No wallet found for user');
    }

    // Check if using OTP flow (forgot PIN)
    if (dto.otpCode) {
      // Verify OTP
      if (!user.otpCode || user.otpCode !== dto.otpCode) {
        throw new UnauthorizedException('Invalid OTP code');
      }

      if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
        throw new UnauthorizedException('OTP has expired');
      }

      // Clear OTP after successful verification
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          otpCode: null,
          otpExpiresAt: null,
        },
      });
    } else {
      // Verify current PIN
      if (!dto.currentPin) {
        throw new BadRequestException('Current PIN is required');
      }

      if (!user.wallet.pin) {
        throw new BadRequestException('No PIN set for wallet');
      }

      const isValidPin = await bcrypt.compare(dto.currentPin, user.wallet.pin);
      if (!isValidPin) {
        throw new UnauthorizedException('Invalid current PIN');
      }
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(dto.newPin, 10);

    // Update wallet PIN
    await this.prisma.wallet.update({
      where: { id: user.wallet.id },
      data: { pin: hashedPin },
    });

    console.log('✅ [AUTH] Transaction PIN changed successfully');

    // Emit real-time notification
    if (this.notificationsGateway) {
      this.notificationsGateway.emitNotification(userId, {
        title: 'Transaction PIN Changed',
        message: 'Your transaction PIN has been updated successfully.',
        type: 'success',
        data: {
          operation: 'pin_change',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      message: 'Transaction PIN changed successfully',
    };
  }

  // Change Passcode
  async changePasscode(
    userId: string,
    dto: {
      currentPasscode?: string;
      newPasscode: string;
      otpCode?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🔐 [AUTH] Changing passcode for user:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Check if using OTP flow (forgot passcode)
    if (dto.otpCode) {
      // Verify OTP
      if (!user.otpCode || user.otpCode !== dto.otpCode) {
        throw new UnauthorizedException('Invalid OTP code');
      }

      if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
        throw new UnauthorizedException('OTP has expired');
      }

      // Clear OTP after successful verification
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          otpCode: null,
          otpExpiresAt: null,
        },
      });
    } else {
      // Verify current passcode
      if (!dto.currentPasscode) {
        throw new BadRequestException('Current passcode is required');
      }

      const isValidPasscode = await bcrypt.compare(dto.currentPasscode, user.passcode);
      if (!isValidPasscode) {
        throw new UnauthorizedException('Invalid current passcode');
      }
    }

    // Hash new passcode
    const hashedPasscode = await bcrypt.hash(dto.newPasscode, 10);

    // Update user passcode
    await this.prisma.user.update({
      where: { id: userId },
      data: { passcode: hashedPasscode },
    });

    console.log('✅ [AUTH] Passcode changed successfully');

    // Emit real-time notification
    if (this.notificationsGateway) {
      this.notificationsGateway.emitNotification(userId, {
        title: 'Passcode Changed',
        message: 'Your login passcode has been updated successfully.',
        type: 'success',
        data: {
          operation: 'passcode_change',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      message: 'Passcode changed successfully',
    };
  }

  // Reset Transaction PIN (using OTP, no auth required)
  async resetTransactionPin(dto: {
    email: string;
    otpCode: string;
    newPin: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🔐 [AUTH] Resetting transaction PIN for email:', dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    if (!user.wallet) {
      throw new BadRequestException('No wallet found for user');
    }

    // Verify OTP
    if (!user.otpCode || user.otpCode !== dto.otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(dto.newPin, 10);

    // Update wallet PIN and clear OTP
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: user.wallet.id },
        data: { pin: hashedPin },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiresAt: null,
        },
      }),
    ]);

    console.log('✅ [AUTH] Transaction PIN reset successfully');

    // Emit real-time notification
    if (this.notificationsGateway) {
      this.notificationsGateway.emitNotification(user.id, {
        title: 'Transaction PIN Reset',
        message: 'Your transaction PIN has been reset successfully.',
        type: 'success',
        data: {
          operation: 'pin_reset',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      message: 'Transaction PIN reset successfully',
    };
  }

  // Reset Passcode (using OTP, no auth required)
  async resetPasscode(dto: {
    email: string;
    otpCode: string;
    newPasscode: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🔐 [AUTH] Resetting passcode for email:', dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Verify OTP
    if (!user.otpCode || user.otpCode !== dto.otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Hash new passcode
    const hashedPasscode = await bcrypt.hash(dto.newPasscode, 10);

    // Update user passcode and clear OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        passcode: hashedPasscode,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    console.log('✅ [AUTH] Passcode reset successfully');

    // Emit real-time notification
    if (this.notificationsGateway) {
      this.notificationsGateway.emitNotification(user.id, {
        title: 'Passcode Reset',
        message: 'Your login passcode has been reset successfully.',
        type: 'success',
        data: {
          operation: 'passcode_reset',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      message: 'Passcode reset successfully',
    };
  }

  // Request Account Deletion
  async requestAccountDeletion(
    userId: string,
    dto: { reason: string },
  ): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    console.log('🗑️ [AUTH] Requesting account deletion for user:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already deactivated');
    }

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with OTP
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    // Send OTP via email
    await this.sendEmailOtp(user.email, otpCode, user.id);

    console.log('✅ [AUTH] Account deletion OTP sent successfully');

    return {
      success: true,
      message: 'Account deletion OTP sent to your email',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Confirm Account Deletion
  async confirmAccountDeletion(
    userId: string,
    dto: { otpCode: string },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🗑️ [AUTH] Confirming account deletion for user:', userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already deactivated');
    }

    // Verify OTP
    if (!user.otpCode || user.otpCode !== dto.otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Archive account (set isActive to false)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    console.log('✅ [AUTH] Account deleted successfully');

    // Emit real-time notification
    if (this.notificationsGateway) {
      this.notificationsGateway.emitNotification(userId, {
        title: 'Account Deactivated',
        message: 'Your account has been deactivated successfully.',
        type: 'warning',
        data: {
          operation: 'account_deletion',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  /**
   * Sign out user and update notification preferences
   */
  async signOut(
    userId: string,
    dto: SignOutDto,
  ): Promise<SignOutResponseDto> {
    try {
      console.log('🚪 [AUTH] Sign out request for user:', userId);
      console.log('📱 [AUTH] Notification preferences:', dto);

      // Default values
      const disableTransactionNotifications = dto.disableTransactionNotifications !== false;
      const disablePromotionalNotifications = dto.disablePromotionalNotifications === true;

      // Update user notification preferences
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          transactionNotificationsEnabled: !disableTransactionNotifications,
          promotionalNotificationsEnabled: !disablePromotionalNotifications,
        },
      });

      // Clear push notification cache for this user
      this.pushNotificationsService.clearUserPreferencesCache(userId);

      // Emit sign out notification (real-time websocket notification - always sent)
      this.notificationsGateway.emitNotification(userId, {
        title: 'Sign Out',
        message: `Successfully signed out. ${disableTransactionNotifications ? 'Push notifications disabled' : 'Push notifications remain enabled'}. Transaction notifications will be re-enabled on next login.`,
        type: 'info',
        data: {
          transactionNotificationsDisabled: disableTransactionNotifications,
          promotionalNotificationsDisabled: disablePromotionalNotifications,
        },
      });

      console.log('✅ [AUTH] User signed out successfully');
      console.log('📱 [AUTH] Transaction notifications:', !disableTransactionNotifications);
      console.log('📱 [AUTH] Promotional notifications:', !disablePromotionalNotifications);

      return {
        success: true,
        message: 'Successfully signed out',
        transactionNotificationsDisabled: disableTransactionNotifications,
        promotionalNotificationsDisabled: disablePromotionalNotifications,
      };
    } catch (error) {
      console.error('❌ [AUTH] Sign out failed:', error);
      throw new BadRequestException('Sign out failed. Please try again.');
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    try {
      console.log('🔔 [AUTH] Updating notification preferences for user:', userId);
      console.log('📱 [AUTH] New preferences:', dto);

      const updateData: any = {};

      if (dto.notificationsEnabled !== undefined) {
        updateData.notificationsEnabled = dto.notificationsEnabled;
      }
      if (dto.transactionNotificationsEnabled !== undefined) {
        updateData.transactionNotificationsEnabled = dto.transactionNotificationsEnabled;
      }
      if (dto.promotionalNotificationsEnabled !== undefined) {
        updateData.promotionalNotificationsEnabled = dto.promotionalNotificationsEnabled;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Clear push notification cache for this user
      this.pushNotificationsService.clearUserPreferencesCache(userId);

      // Emit notification preferences update notification (real-time websocket notification - always sent)
      this.notificationsGateway.emitNotification(userId, {
        title: 'Notification Preferences Updated',
        message: 'Your push notification preferences have been updated successfully.',
        type: 'success',
        data: {
          notificationsEnabled: updatedUser.notificationsEnabled,
          transactionNotificationsEnabled: updatedUser.transactionNotificationsEnabled,
          promotionalNotificationsEnabled: updatedUser.promotionalNotificationsEnabled,
        },
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
    } catch (error) {
      console.error('❌ [AUTH] Failed to update notification preferences:', error);
      throw new BadRequestException('Failed to update push notification preferences. Please try again.');
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          notificationsEnabled: true,
          transactionNotificationsEnabled: true,
          promotionalNotificationsEnabled: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        message: 'Push notification preferences retrieved successfully',
        preferences: {
          notificationsEnabled: user.notificationsEnabled,
          transactionNotificationsEnabled: user.transactionNotificationsEnabled,
          promotionalNotificationsEnabled: user.promotionalNotificationsEnabled,
        },
      };
    } catch (error) {
      console.error('❌ [AUTH] Failed to get notification preferences:', error);
      throw new BadRequestException('Failed to get push notification preferences. Please try again.');
    }
  }
}
