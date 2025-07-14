import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { TransferProviderManagerService } from '../providers/transfer-provider-manager.service';
import { WalletProvider } from '../providers/base/wallet-provider.interface';
import { TransferProvider } from '../providers/base/transfer-provider.interface';
import {
  SetFeeDto,
  FeeConfigurationResponse,
  SetFeeResponse,
  GetFeesResponse,
  DeleteFeeResponse,
  FeeType,
  KycSubmissionDto,
  GetKycSubmissionsResponse,
  KycReviewDto,
  KycReviewResponse,
  KycSubmissionDetailResponse,
  KycDecision,
  CreateFeeConfigurationDto,
  UpdateFeeConfigurationDto,
  GetUsersResponse,
  AdminUserDto,
  AdminUserStatsDto,
  GetUserDetailResponse,
  AdminUserDetailDto,
  GetTransactionsResponse,
  AdminTransactionDto,
  AdminTransactionStatsDto,
  GetTransactionDetailResponse,
  AdminTransactionDetailDto,
  GetDashboardStatsResponse,
  DashboardStatsDto,
  DashboardUserStatsDto,
  DashboardTransactionStatsDto,
  DashboardWalletStatsDto,
  DeleteUserDto,
  DeleteUserResponse,
  FundWalletDto,
  WalletOperationResponse,
  DebitWalletDto,
  EditUserDto,
  EditUserResponse,
  CreateWalletDto,
  CreateWalletResponse,
  CreateAdminDto,
  CreateAdminResponse,
  UpdateAdminDto,
  UpdateAdminResponse,
  DeleteAdminDto,
  DeleteAdminResponse,
  GetAdminsResponse,
  AdminDto,
  GetAdminLogsResponse,
} from './dto/admin.dto';
import { KycStatus, Prisma, FeeType as PrismaFeeType } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private providerManager: ProviderManagerService,
    private transferProviderManager: TransferProviderManagerService,
    private configService: ConfigService,
    private notificationsGateway: NotificationsGateway,
    private pushNotificationsService: PushNotificationsService,
  ) {}

  async setFee(setFeeDto: SetFeeDto): Promise<SetFeeResponse> {
    console.log('⚙️ [ADMIN SERVICE] Setting fee configuration');
    console.log('📋 [ADMIN SERVICE] Fee data:', setFeeDto);

    // Validate that at least one fee parameter is provided
    if (
      !setFeeDto.percentage &&
      !setFeeDto.fixedAmount &&
      !setFeeDto.minAmount
    ) {
      throw new BadRequestException(
        'At least one fee parameter (percentage, fixedAmount, or minAmount) must be provided',
      );
    }

    // Validate percentage and fixed amount combination
    if (setFeeDto.percentage && setFeeDto.fixedAmount) {
      throw new BadRequestException(
        'Cannot set both percentage and fixed amount for the same fee',
      );
    }

    // Validate min/max fee logic
    if (
      setFeeDto.minAmount &&
      setFeeDto.maxAmount &&
      setFeeDto.minAmount > setFeeDto.maxAmount
    ) {
      throw new BadRequestException(
        'Minimum fee cannot be greater than maximum fee',
      );
    }

    try {
      // Check if fee configuration already exists
      const existingFee = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: setFeeDto.type },
      });

      let feeConfiguration;

      if (existingFee) {
        // Update existing configuration
        console.log('🔄 [ADMIN SERVICE] Updating existing fee configuration');
        feeConfiguration = await this.prisma.feeConfiguration.update({
          where: { feeType: setFeeDto.type },
          data: {
            percentage: setFeeDto.percentage,
            fixedAmount: setFeeDto.fixedAmount,
            minAmount: setFeeDto.minAmount,
            maxAmount: setFeeDto.maxAmount,
            isActive: setFeeDto.isActive ?? true,
          },
        });
      } else {
        // Create new configuration
        console.log('➕ [ADMIN SERVICE] Creating new fee configuration');
        feeConfiguration = await this.prisma.feeConfiguration.create({
          data: {
            feeType: setFeeDto.type,
            percentage: setFeeDto.percentage,
            fixedAmount: setFeeDto.fixedAmount,
            minAmount: setFeeDto.minAmount,
            maxAmount: setFeeDto.maxAmount,
            isActive: setFeeDto.isActive ?? true,
          },
        });
      }

      console.log('✅ [ADMIN SERVICE] Fee configuration saved successfully');

      return {
        success: true,
        message: existingFee
          ? 'Fee configuration updated successfully'
          : 'Fee configuration created successfully',
        feeConfiguration: {
          id: feeConfiguration.id,
          feeType: feeConfiguration.feeType as FeeType,
          percentage: feeConfiguration.percentage,
          fixedAmount: feeConfiguration.fixedAmount,
          minAmount: feeConfiguration.minAmount,
          maxAmount: feeConfiguration.maxAmount,
          isActive: feeConfiguration.isActive,
          createdAt: feeConfiguration.createdAt.toISOString(),
          updatedAt: feeConfiguration.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error setting fee configuration:',
        error,
      );
      throw new BadRequestException('Failed to set fee configuration');
    }
  }

  async getFees(): Promise<GetFeesResponse> {
    console.log('📊 [ADMIN SERVICE] Retrieving all fee configurations');

    try {
      const feeConfigurations = await this.prisma.feeConfiguration.findMany({
        orderBy: { feeType: 'asc' },
      });

      console.log(
        '✅ [ADMIN SERVICE] Retrieved',
        feeConfigurations.length,
        'fee configurations',
      );

      const fees: FeeConfigurationResponse[] = feeConfigurations.map((fee) => ({
        id: fee.id,
        feeType: fee.feeType as FeeType,
        percentage: fee.percentage,
        fixedAmount: fee.fixedAmount,
        minAmount: fee.minAmount,
        maxAmount: fee.maxAmount,
        isActive: fee.isActive,
        createdAt: fee.createdAt.toISOString(),
        updatedAt: fee.updatedAt.toISOString(),
      }));

      return {
        success: true,
        fees,
        total: fees.length,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving fee configurations:',
        error,
      );
      throw new BadRequestException('Failed to retrieve fee configurations');
    }
  }

  async getFeeByType(type: FeeType): Promise<FeeConfigurationResponse | null> {
    console.log(
      '🔍 [ADMIN SERVICE] Retrieving fee configuration for type:',
      type,
    );

    try {
      const feeConfiguration = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: type },
      });

      if (!feeConfiguration) {
        console.log(
          '⚠️ [ADMIN SERVICE] No fee configuration found for type:',
          type,
        );
        return null;
      }

      console.log('✅ [ADMIN SERVICE] Fee configuration found for type:', type);

      return {
        id: feeConfiguration.id,
        feeType: feeConfiguration.feeType as FeeType,
        percentage: feeConfiguration.percentage,
        fixedAmount: feeConfiguration.fixedAmount,
        minAmount: feeConfiguration.minAmount,
        maxAmount: feeConfiguration.maxAmount,
        isActive: feeConfiguration.isActive,
        createdAt: feeConfiguration.createdAt.toISOString(),
        updatedAt: feeConfiguration.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving fee configuration:',
        error,
      );
      throw new BadRequestException('Failed to retrieve fee configuration');
    }
  }

  async deleteFee(type: FeeType): Promise<DeleteFeeResponse> {
    console.log(
      '🗑️ [ADMIN SERVICE] Deleting fee configuration for type:',
      type,
    );

    try {
      const existingFee = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: type },
      });

      if (!existingFee) {
        throw new NotFoundException(
          `Fee configuration for type '${type}' not found`,
        );
      }

      await this.prisma.feeConfiguration.delete({
        where: { feeType: type },
      });

      console.log('✅ [ADMIN SERVICE] Fee configuration deleted successfully');

      return {
        success: true,
        message: 'Fee configuration deleted successfully',
        deletedType: type,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error deleting fee configuration:',
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete fee configuration');
    }
  }

  // Helper method to calculate fee based on configuration
  async calculateFee(type: FeeType, amount: number): Promise<number> {
    const feeConfig = await this.getFeeByType(type);

    if (!feeConfig || !feeConfig.isActive) {
      // No fee configuration or inactive - return 0
      return 0;
    }

    let calculatedFee = 0;

    if (feeConfig.fixedAmount) {
      // Fixed amount fee
      calculatedFee = feeConfig.fixedAmount;
    } else if (feeConfig.percentage) {
      // Percentage-based fee
      calculatedFee = amount * feeConfig.percentage;
    }

    // Apply minimum fee if configured
    if (feeConfig.minAmount && calculatedFee < feeConfig.minAmount) {
      calculatedFee = feeConfig.minAmount;
    }

    // Apply maximum fee if configured
    if (feeConfig.maxAmount && calculatedFee > feeConfig.maxAmount) {
      calculatedFee = feeConfig.maxAmount;
    }

    return Math.round(calculatedFee * 100) / 100; // Round to 2 decimal places
  }

  // Method to seed default fee configurations
  async seedDefaultFees(): Promise<void> {
    console.log('🌱 [ADMIN SERVICE] Seeding default fee configurations');

    const defaultFees = [
      {
        type: FeeType.TRANSFER,
        percentage: 0.015, // 1.5%
        minAmount: 25.0,
        maxAmount: 5000.0,
        isActive: true,
      },
      {
        type: FeeType.WITHDRAWAL,
        fixedAmount: 10.0,
        isActive: true,
      },
      {
        type: FeeType.FUNDING,
        percentage: 0.005, // 0.5%
        minAmount: 0,
        maxAmount: 100.0,
        isActive: false, // Funding usually free
      },
    ];

    for (const feeData of defaultFees) {
      try {
        const existingFee = await this.prisma.feeConfiguration.findUnique({
          where: { feeType: feeData.type },
        });

        if (!existingFee) {
          await this.prisma.feeConfiguration.create({
            data: {
              feeType: feeData.type,
              percentage: feeData.percentage,
              fixedAmount: feeData.fixedAmount,
              minAmount: feeData.minAmount,
              maxAmount: feeData.maxAmount,
              isActive: feeData.isActive,
            },
          });
          console.log(
            '✅ [ADMIN SERVICE] Created default fee for:',
            feeData.type,
          );
        } else {
          console.log(
            '⚠️ [ADMIN SERVICE] Fee already exists for:',
            feeData.type,
          );
        }
      } catch (error) {
        console.error(
          '❌ [ADMIN SERVICE] Error creating default fee for',
          feeData.type,
          ':',
          error,
        );
      }
    }

    console.log('🌱 [ADMIN SERVICE] Default fee seeding completed');
  }

  // ==================== KYC MANAGEMENT METHODS ====================

  async getKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log('📋 [ADMIN SERVICE] Retrieving all KYC submissions');

    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { kycStatus: 'UNDER_REVIEW' },
            { kycStatus: 'APPROVED' },
            { kycStatus: 'REJECTED' },
          ],
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          bvn: true,
          bvnVerifiedAt: true,
          selfieUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const submissions: KycSubmissionDto[] = users.map((user) => ({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : undefined,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      }));

      // Count submissions by status
      const pending = submissions.filter(
        (s) => s.kycStatus === 'UNDER_REVIEW',
      ).length;
      const verified = submissions.filter(
        (s) => s.kycStatus === 'APPROVED',
      ).length;
      const rejected = submissions.filter(
        (s) => s.kycStatus === 'REJECTED',
      ).length;

      console.log(
        '✅ [ADMIN SERVICE] Retrieved',
        submissions.length,
        'KYC submissions',
      );
      console.log(
        '📊 [ADMIN SERVICE] Stats - Pending:',
        pending,
        'Verified:',
        verified,
        'Rejected:',
        rejected,
      );

      return {
        success: true,
        submissions,
        total: submissions.length,
        pending,
        verified,
        rejected,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving KYC submissions:',
        error,
      );
      throw new BadRequestException('Failed to retrieve KYC submissions');
    }
  }

  async getKycSubmissionDetails(
    userId: string,
  ): Promise<KycSubmissionDetailResponse> {
    console.log(
      '🔍 [ADMIN SERVICE] Retrieving KYC submission details for user:',
      userId,
    );

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          bvn: true,
          bvnVerifiedAt: true,
          selfieUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const submission: KycSubmissionDto = {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : undefined,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      };

      // Generate full image URL if selfie exists
      const baseUrl = this.configService?.get<string>('APP_URL') || 'http://localhost:3000';
      const selfieImageUrl = user.selfieUrl
        ? `${baseUrl}${user.selfieUrl}`
        : undefined;

      console.log('✅ [ADMIN SERVICE] KYC submission details retrieved');

      return {
        success: true,
        submission,
        selfieImageUrl,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving KYC submission details:',
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to retrieve KYC submission details',
      );
    }
  }

  async reviewKycSubmission(
    userId: string,
    reviewDto: KycReviewDto,
  ): Promise<KycReviewResponse> {
    console.log(
      '⚖️ [ADMIN SERVICE] Reviewing KYC submission for user:',
      userId,
    );
    console.log('📋 [ADMIN SERVICE] Review decision:', reviewDto.decision);
    console.log('💬 [ADMIN SERVICE] Comment:', reviewDto.comment);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          selfieUrl: true,
          dateOfBirth: true,
          gender: true,
          bvn: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.kycStatus !== 'UNDER_REVIEW') {
        throw new BadRequestException(
          `Cannot review KYC submission. Current status: ${user.kycStatus}`,
        );
      }

      // Admin can approve KYC even without selfie upload
      // This allows manual approval based on other criteria (e.g., BVN verification)
      console.log('ℹ️ [ADMIN SERVICE] Selfie status:', user.selfieUrl ? 'Uploaded' : 'Not uploaded');

      let newStatus: string;
      let walletCreated = false;
      let virtualAccountNumber: string | undefined;

      if (reviewDto.decision === KycDecision.APPROVE) {
        // Approve KYC
        newStatus = 'VERIFIED';

        // Update user status
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: 'APPROVED',
            kycVerifiedAt: new Date(),
          },
        });

        // Create wallet for approved user
        try {
          const wallet = await this.walletService.createWallet(
            userId,
            user.firstName || 'User',
            user.lastName || 'Account',
            user.email,
            user.phone,
            user.dateOfBirth?.toISOString().split('T')[0] || '1990-01-01', // Default DOB if not provided
            (user.gender as 'M' | 'F') || 'M', // Default to Male if not provided
            'Lagos, Nigeria', // Default address
            'Lagos', // Default city
            'Lagos State', // Default state
            user.bvn || undefined,
          );
          walletCreated = true;
          virtualAccountNumber = wallet.virtualAccountNumber;
          console.log(
            '💳 [ADMIN SERVICE] Wallet created for approved user:',
            virtualAccountNumber,
          );
        } catch (walletError) {
          console.error(
            '❌ [ADMIN SERVICE] Error creating wallet:',
            walletError,
          );
          // Don't fail the approval if wallet creation fails, but log it
        }

        console.log('✅ [ADMIN SERVICE] KYC approved for user:', userId);
      } else {
        // Reject KYC
        newStatus = 'REJECTED';

        // Update user status (allow them to restart process)
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: 'REJECTED',
            // Clear selfie to allow re-upload
            selfieUrl: null,
          },
        });

        console.log('❌ [ADMIN SERVICE] KYC rejected for user:', userId);
      }

      const message =
        reviewDto.decision === KycDecision.APPROVE
          ? 'KYC submission approved successfully'
          : 'KYC submission rejected';

      return {
        success: true,
        message,
        newStatus,
        walletCreated,
        virtualAccountNumber,
        userId,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error reviewing KYC submission:',
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to review KYC submission');
    }
  }

  async getPendingKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log('⏳ [ADMIN SERVICE] Retrieving pending KYC submissions');

    try {
      const users = await this.prisma.user.findMany({
        where: {
          kycStatus: 'UNDER_REVIEW',
        },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          bvn: true,
          bvnVerifiedAt: true,
          selfieUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const submissions: KycSubmissionDto[] = users.map((user) => ({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : undefined,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      }));

      console.log(
        '✅ [ADMIN SERVICE] Retrieved',
        submissions.length,
        'pending KYC submissions',
      );

      return {
        success: true,
        submissions,
        total: submissions.length,
        pending: submissions.length,
        verified: 0,
        rejected: 0,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving pending KYC submissions:',
        error,
      );
      throw new BadRequestException(
        'Failed to retrieve pending KYC submissions',
      );
    }
  }

  // ==================== PROVIDER MANAGEMENT METHODS ====================

  async getAvailableProviders(): Promise<{
    success: boolean;
    currentProvider: string;
    providers: Array<{ name: string; provider: string; isActive: boolean }>;
  }> {
    console.log('🏦 [ADMIN SERVICE] Retrieving available wallet providers');

    try {
      const providers = await this.providerManager.getAvailableProviders();
      const currentProvider =
        await this.providerManager.getCurrentProviderName();

      console.log(
        '✅ [ADMIN SERVICE] Retrieved',
        providers.length,
        'available providers',
      );

      return {
        success: true,
        currentProvider,
        providers,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving available providers:',
        error,
      );
      throw new BadRequestException('Failed to retrieve available providers');
    }
  }

  async switchWalletProvider(provider: string): Promise<{
    success: boolean;
    message: string;
    previousProvider: string;
    newProvider: string;
  }> {
    console.log('🔄 [ADMIN SERVICE] Switching wallet provider to:', provider);

    try {
      // Get current provider before switching
      const previousProvider =
        await this.providerManager.getCurrentProviderName();

      // Validate provider
      if (!Object.values(WalletProvider).includes(provider as WalletProvider)) {
        throw new BadRequestException(`Invalid provider: ${provider}`);
      }

      // Switch provider
      const result = await this.providerManager.switchWalletProvider(
        provider as WalletProvider,
      );

      console.log('✅ [ADMIN SERVICE] Wallet provider switched successfully');

      return {
        success: result.success,
        message: result.message,
        previousProvider,
        newProvider: provider,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error switching wallet provider:',
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to switch wallet provider');
    }
  }

  async getCurrentProvider(): Promise<{
    success: boolean;
    provider: string;
    name: string;
  }> {
    console.log('📊 [ADMIN SERVICE] Getting current wallet provider');

    try {
      const providerName = await this.providerManager.getCurrentProviderName();
      const providers = await this.providerManager.getAvailableProviders();
      const currentProvider = providers.find((p) => p.name === providerName);

      console.log(
        '✅ [ADMIN SERVICE] Current provider retrieved:',
        providerName,
      );

      return {
        success: true,
        provider: currentProvider?.provider || 'SMEPLUG',
        name: providerName,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error getting current provider:',
        error,
      );
      throw new BadRequestException('Failed to get current provider');
    }
  }

  // ==================== POLARIS API TEST METHOD ====================

  async testPolarisAccountCreation(testData: any) {
    console.log('🧪 [ADMIN SERVICE] Testing Polaris account creation API');

    try {
      // Get the Polaris provider directly
      const polarisProvider = await this.providerManager.getWalletProvider(
        WalletProvider.POLARIS,
      );

      const walletData = {
        accountName: `${testData.firstName} ${testData.lastName}`,
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        phoneNumber: testData.phone,
        dateOfBirth: this.convertDateFormat(testData.dateOfBirth), // Convert date format
        gender: this.convertGender(testData.gender), // Convert gender format
        address: testData.address || 'Lagos, Nigeria',
        city: testData.city || 'Lagos',
        state: testData.state || 'Lagos State',
        country: 'Nigeria',
        bvn: testData.bvn,
      };

      console.log(
        '📋 [ADMIN SERVICE] Calling Polaris createWallet with data:',
        walletData,
      );

      const result = await polarisProvider.createWallet(walletData);

      console.log('📄 [ADMIN SERVICE] Polaris API response:', result);

      return {
        success: true,
        message: 'Polaris API test completed',
        apiResponse: result,
        requestData: walletData,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Polaris API test failed:', error);
      throw error;
    }
  }

  private convertDateFormat(dateString: string): string {
    // Convert from various formats to YYYY-MM-DD
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        // Check if it's DD-MM-YYYY format
        if (
          parts[0].length === 2 &&
          parts[1].length === 2 &&
          parts[2].length === 4
        ) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
        }
        // Already in YYYY-MM-DD format
        if (parts[0].length === 4) {
          return dateString;
        }
      }
    }
    return dateString; // Return as-is if format is unclear
  }

  private convertGender(gender: string): 'M' | 'F' {
    // Convert gender to single letter format
    const genderLower = gender.toLowerCase();
    if (genderLower.includes('female') || genderLower === 'f') {
      return 'F';
    }
    return 'M'; // Default to male
  }

  // ==================== BUDPAY API TEST METHOD ====================

  async testBudPayWalletCreation(testData: any) {
    console.log('🧪 [ADMIN SERVICE] Testing BudPay wallet creation API');

    try {
      // Get the BudPay provider directly
      const budPayProvider = await this.providerManager.getWalletProvider(
        WalletProvider.BUDPAY,
      );

      const walletData = {
        accountName: `${testData.firstName} ${testData.lastName}`,
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        phoneNumber: testData.phone,
        dateOfBirth: this.convertDateFormat(testData.dateOfBirth), // Convert date format
        gender: this.convertGender(testData.gender), // Convert gender format
        address: testData.address || 'Lagos, Nigeria',
        city: testData.city || 'Lagos',
        state: testData.state || 'Lagos State',
        country: 'Nigeria',
        bvn: testData.bvn,
      };

      console.log(
        '📋 [ADMIN SERVICE] Calling BudPay createWallet with data:',
        walletData,
      );

      const result = await budPayProvider.createWallet(walletData);

      console.log('📄 [ADMIN SERVICE] BudPay API response:', result);

      return {
        success: true,
        message: 'BudPay API test completed',
        apiResponse: result,
        requestData: walletData,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] BudPay API test failed:', error);
      throw error;
    }
  }

  // ==================== TRANSFER PROVIDER MANAGEMENT ====================

  async getAvailableTransferProviders(): Promise<{
    success: boolean;
    currentProvider: string;
    providers: string[];
    isAdminConfigured: boolean;
  }> {
    console.log('🚚 [ADMIN SERVICE] Retrieving available transfer providers');

    try {
      const providerInfo = await this.transferProviderManager.getProviderInfo();

      console.log('✅ [ADMIN SERVICE] Retrieved transfer provider info');

      return {
        success: true,
        currentProvider: providerInfo.currentProvider,
        providers: providerInfo.availableProviders,
        isAdminConfigured: providerInfo.isAdminConfigured,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving transfer providers:',
        error,
      );
      throw new BadRequestException('Failed to retrieve transfer providers');
    }
  }

  async switchTransferProvider(provider: string): Promise<{
    success: boolean;
    message: string;
    previousProvider: string;
    newProvider: string;
  }> {
    console.log('🔄 [ADMIN SERVICE] Switching transfer provider to:', provider);

    try {
      // Get current provider before switching
      const previousProvider =
        await this.transferProviderManager.getCurrentProviderName();

      // Validate provider
      if (
        !Object.values(TransferProvider).includes(provider as TransferProvider)
      ) {
        throw new BadRequestException(`Invalid transfer provider: ${provider}`);
      }

      // Switch provider
      const result = await this.transferProviderManager.switchTransferProvider(
        provider as TransferProvider,
      );

      console.log('✅ [ADMIN SERVICE] Transfer provider switched successfully');

      return {
        success: result.success,
        message: result.message,
        previousProvider,
        newProvider: provider,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error switching transfer provider:',
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to switch transfer provider');
    }
  }

  async getCurrentTransferProvider(): Promise<{
    success: boolean;
    provider: string;
    isAdminConfigured: boolean;
  }> {
    console.log('📊 [ADMIN SERVICE] Getting current transfer provider');

    try {
      const providerInfo = await this.transferProviderManager.getProviderInfo();

      console.log(
        '✅ [ADMIN SERVICE] Current transfer provider retrieved:',
        providerInfo.currentProvider,
      );

      return {
        success: true,
        provider: providerInfo.currentProvider,
        isAdminConfigured: providerInfo.isAdminConfigured,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error getting current transfer provider:',
        error,
      );
      throw new BadRequestException('Failed to get current transfer provider');
    }
  }

  // ==================== TRANSFER API TESTS ====================

  async testBankList(): Promise<{
    success: boolean;
    provider: string;
    bankCount: number;
    banks: Array<{ bankName: string; bankCode: string }>;
  }> {
    console.log('🧪 [ADMIN SERVICE] Testing bank list API');

    try {
      const currentProvider =
        await this.transferProviderManager.getCurrentProviderName();
      const result = await this.transferProviderManager.getBankList();

      if (!result.success) {
        throw new Error(result.message || 'Bank list test failed');
      }

      console.log('✅ [ADMIN SERVICE] Bank list test completed successfully');

      return {
        success: true,
        provider: currentProvider,
        bankCount: result.data?.length || 0,
        banks: result.data || [],
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Bank list test failed:', error);
      throw new BadRequestException(`Bank list test failed: ${error.message}`);
    }
  }

  async testAccountVerification(testData: {
    accountNumber: string;
    bankCode: string;
  }) {
    console.log('🧪 [ADMIN SERVICE] Testing account verification API');
    console.log('📋 [ADMIN SERVICE] Test data:', testData);

    try {
      const currentProvider =
        await this.transferProviderManager.getCurrentProviderName();
      const result = await this.transferProviderManager.verifyAccount({
        accountNumber: testData.accountNumber,
        bankCode: testData.bankCode,
      });

      console.log('✅ [ADMIN SERVICE] Account verification test completed');

      return {
        success: result.success,
        provider: currentProvider,
        message: result.message,
        data: result.data,
        error: result.error,
        testData,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Account verification test failed:',
        error,
      );
      return {
        success: false,
        provider: await this.transferProviderManager.getCurrentProviderName(),
        message: 'Account verification test failed',
        error: error.message,
        testData,
      };
    }
  }

  async testBankTransfer(testData: {
    amount: number;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    accountName: string;
    narration?: string;
  }) {
    console.log('🧪 [ADMIN SERVICE] Testing bank transfer API');
    console.log('📋 [ADMIN SERVICE] Test data:', testData);

    try {
      const currentProvider =
        await this.transferProviderManager.getCurrentProviderName();

      // Default narration following the new format: "FirstName LastInitial"
      const defaultNarration = 'Admin T';

      // Create test transfer data
      const transferData = {
        amount: testData.amount,
        currency: 'NGN',
        accountNumber: testData.accountNumber,
        bankCode: testData.bankCode,
        bankName: testData.bankName,
        accountName: testData.accountName,
        narration: testData.narration || defaultNarration,
        reference: `TEST_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
        senderName: 'Admin Test',
        senderEmail: 'admin@test.com',
        metadata: {
          testMode: true,
          adminTest: true,
        },
      };

      const result =
        await this.transferProviderManager.transferToBank(transferData);

      console.log('✅ [ADMIN SERVICE] Bank transfer test completed');

      return {
        success: result.success,
        provider: currentProvider,
        message: result.message,
        data: result.data,
        error: result.error,
        testData: transferData,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Bank transfer test failed:', error);
      return {
        success: false,
        provider: await this.transferProviderManager.getCurrentProviderName(),
        message: 'Bank transfer test failed',
        error: error.message,
        testData,
      };
    }
  }

  /**
   * Validate a specific wallet balance against transaction history
   */
  async validateWalletBalance(walletId: string) {
    console.log('🔍 [ADMIN SERVICE] Validating wallet balance for:', walletId);

    try {
      const validation =
        await this.walletService.validateWalletBalance(walletId);

      console.log(
        '✅ [ADMIN SERVICE] Wallet validation completed:',
        validation.isValid ? 'VALID' : 'INVALID',
      );

      return validation;
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Wallet validation failed:', error);
      throw error;
    }
  }

  /**
   * Reconcile a specific wallet balance with transaction history
   */
  async reconcileWalletBalance(walletId: string) {
    console.log('🔧 [ADMIN SERVICE] Reconciling wallet balance for:', walletId);

    try {
      const reconciliation =
        await this.walletService.reconcileWalletBalance(walletId);

      console.log('✅ [ADMIN SERVICE] Wallet reconciliation completed');

      return reconciliation;
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Wallet reconciliation failed:', error);
      throw error;
    }
  }

  /**
   * Validate all wallet balances
   */
  async validateAllWallets() {
    console.log('🔍 [ADMIN SERVICE] Validating all wallet balances...');

    try {
      // Get all wallets
      const wallets = await this.prisma.wallet.findMany({
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      console.log(
        `🔍 [ADMIN SERVICE] Found ${wallets.length} wallets to validate`,
      );

      const validations = [];
      let validCount = 0;
      let invalidCount = 0;

      for (const wallet of wallets) {
        try {
          const validation = await this.walletService.validateWalletBalance(
            wallet.id,
          );

          validations.push({
            walletId: wallet.id,
            userId: wallet.userId,
            userEmail: wallet.user.email,
            userName: `${wallet.user.firstName} ${wallet.user.lastName}`,
            virtualAccountNumber: wallet.virtualAccountNumber,
            ...validation,
          });

          if (validation.isValid) {
            validCount++;
          } else {
            invalidCount++;
            console.warn(
              `⚠️ [ADMIN SERVICE] Invalid wallet found: ${wallet.user.email} (${wallet.id})`,
            );
          }
        } catch (error) {
          console.error(
            `❌ [ADMIN SERVICE] Error validating wallet ${wallet.id}:`,
            error,
          );
          validations.push({
            walletId: wallet.id,
            userId: wallet.userId,
            userEmail: wallet.user.email,
            userName: `${wallet.user.firstName} ${wallet.user.lastName}`,
            virtualAccountNumber: wallet.virtualAccountNumber,
            isValid: false,
            error: error.message,
          });
          invalidCount++;
        }
      }

      console.log(
        `✅ [ADMIN SERVICE] Validation complete: ${validCount} valid, ${invalidCount} invalid`,
      );

      return {
        totalWallets: wallets.length,
        validWallets: validCount,
        invalidWallets: invalidCount,
        validations: validations.sort((a, b) =>
          a.isValid === b.isValid ? 0 : a.isValid ? 1 : -1,
        ), // Invalid first
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Failed to validate all wallets:',
        error,
      );
      throw error;
    }
  }

  /**
   * Reset wallet balance to zero and clear associated transactions
   */
  async resetWalletBalance(walletId: string) {
    console.log('🔄 [ADMIN SERVICE] Resetting wallet balance for:', walletId);
    console.warn(
      '⚠️ [ADMIN SERVICE] WARNING: This will permanently delete transactions and reset balance to 0',
    );

    try {
      // Get wallet details first
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!wallet) {
        throw new Error(`Wallet with ID ${walletId} not found`);
      }

      console.log(
        `👤 [ADMIN SERVICE] Resetting wallet for: ${wallet.user.email}`,
      );
      console.log(`💰 [ADMIN SERVICE] Current balance: ₦${wallet.balance}`);

      // Use database transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Get all transactions for this wallet
        const transactions = await tx.walletTransaction.findMany({
          where: {
            OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
          },
        });

        console.log(
          `🗑️ [ADMIN SERVICE] Found ${transactions.length} transactions to delete`,
        );

        // Delete all transactions for this wallet
        await tx.walletTransaction.deleteMany({
          where: {
            OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
          },
        });

        // Clear webhook logs for this wallet's account number
        const webhookLogs = await tx.webhookLog.findMany({
          where: {
            accountNumber: wallet.virtualAccountNumber,
          },
        });

        console.log(
          `🗑️ [ADMIN SERVICE] Found ${webhookLogs.length} webhook logs to clear`,
        );

        await tx.webhookLog.deleteMany({
          where: {
            accountNumber: wallet.virtualAccountNumber,
          },
        });

        // Reset wallet balance to 0
        const updatedWallet = await tx.wallet.update({
          where: { id: walletId },
          data: {
            balance: 0,
            lastTransactionAt: null,
          },
        });

        return {
          wallet: updatedWallet,
          deletedTransactions: transactions.length,
          deletedWebhookLogs: webhookLogs.length,
          oldBalance: wallet.balance,
          newBalance: 0,
        };
      });

      console.log('✅ [ADMIN SERVICE] Wallet reset completed successfully');
      console.log(
        `💰 [ADMIN SERVICE] Balance: ₦${result.oldBalance} → ₦${result.newBalance}`,
      );
      console.log(
        `🗑️ [ADMIN SERVICE] Deleted ${result.deletedTransactions} transactions`,
      );
      console.log(
        `🗑️ [ADMIN SERVICE] Deleted ${result.deletedWebhookLogs} webhook logs`,
      );

      return {
        message: 'Wallet balance reset successfully',
        userEmail: wallet.user.email,
        walletId: wallet.id,
        accountNumber: wallet.virtualAccountNumber,
        oldBalance: result.oldBalance,
        newBalance: result.newBalance,
        deletedTransactions: result.deletedTransactions,
        deletedWebhookLogs: result.deletedWebhookLogs,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Failed to reset wallet balance:',
        error,
      );
      throw error;
    }
  }

  /**
   * Reset wallet balance by account number
   */
  async resetWalletByAccountNumber(accountNumber: string) {
    console.log(
      '🔄 [ADMIN SERVICE] Finding wallet by account number:',
      accountNumber,
    );

    try {
      // Find wallet by account number
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          virtualAccountNumber: accountNumber,
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!wallet) {
        throw new Error(
          `No wallet found with account number: ${accountNumber}`,
        );
      }

      console.log(`✅ [ADMIN SERVICE] Found wallet for: ${wallet.user.email}`);

      // Use the existing reset method
      return this.resetWalletBalance(wallet.id);
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Failed to reset wallet by account number:',
        error,
      );
      throw error;
    }
  }

  async createFeeConfiguration(dto: CreateFeeConfigurationDto) {
    return this.prisma.feeConfiguration.create({
      data: dto,
    });
  }

  async updateFeeConfiguration(id: string, dto: UpdateFeeConfigurationDto) {
    return this.prisma.feeConfiguration.update({
      where: { id },
      data: dto,
    });
  }

  async getFeeConfigurations() {
    return this.prisma.feeConfiguration.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeeConfiguration(id: string) {
    return this.prisma.feeConfiguration.findUnique({
      where: { id },
    });
  }

  async deleteFeeConfiguration(id: string) {
    return this.prisma.feeConfiguration.delete({
      where: { id },
    });
  }

  /**
   * Get provider-specific funding fees
   */
  async getFundingFees() {
    const fundingFees = await this.prisma.feeConfiguration.findMany({
      where: {
        OR: [
          { feeType: FeeType.FUNDING },
          { feeType: FeeType.FUNDING_BUDPAY },
          { feeType: FeeType.FUNDING_SMEPLUG },
          { feeType: FeeType.FUNDING_POLARIS },
        ],
      },
      orderBy: { feeType: 'asc' },
    });

    return fundingFees;
  }

  /**
   * Create or update funding fee for a specific provider
   */
  async setProviderFundingFee(
    provider: string,
    dto: CreateFeeConfigurationDto,
  ) {
    const feeType = `FUNDING_${provider.toUpperCase()}` as FeeType;

    // Check if fee configuration already exists
    const existing = await this.prisma.feeConfiguration.findUnique({
      where: { feeType: feeType },
    });

    if (existing) {
      // Update existing
      return this.prisma.feeConfiguration.update({
        where: { id: existing.id },
        data: {
          ...dto,
          feeType: feeType,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      return this.prisma.feeConfiguration.create({
        data: {
          ...dto,
          feeType: feeType,
        },
      });
    }
  }

  /**
   * Get funding fee for a specific provider
   */
  async getProviderFundingFee(provider: string) {
    const feeType = `FUNDING_${provider.toUpperCase()}` as FeeType;

    const feeConfig = await this.prisma.feeConfiguration.findUnique({
      where: { feeType: feeType },
    });

    if (!feeConfig) {
      // Fallback to generic FUNDING fee
      return this.prisma.feeConfiguration.findUnique({
        where: { feeType: FeeType.FUNDING },
      });
    }

    return feeConfig;
  }

  // ==================== USER MANAGEMENT METHODS ====================

  async getUsers(
    limit: number = 20,
    offset: number = 0,
    status?: string,
    search?: string,
  ): Promise<GetUsersResponse> {
    console.log('📋 [ADMIN SERVICE] Retrieving users with filters:', {
      limit,
      offset,
      status,
      search,
    });

    try {
      // Build where clause based on filters
      const whereClause: any = {};

      if (status) {
        whereClause.kycStatus = status;
      }

      if (search) {
        whereClause.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.user.count({
        where: whereClause,
      });

      // Get users with pagination
      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          kycStatus: true,
          isVerified: true,
          isOnboarded: true,
          createdAt: true,
          updatedAt: true,
          wallet: {
            select: {
              id: true,
              balance: true,
              virtualAccountNumber: true,
              provider: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      const adminUsers: AdminUserDto[] = users.map((user) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth.toISOString(),
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
        walletStatus: user.wallet?.isActive ? 'ACTIVE' : 'INACTIVE',
        walletBalance: user.wallet?.balance || 0,
        virtualAccountNumber: user.wallet?.virtualAccountNumber,
        walletProvider: user.wallet?.provider,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));

      // Calculate stats
      const stats: AdminUserStatsDto = {
        total,
        verified: await this.prisma.user.count({
          where: { kycStatus: 'APPROVED' },
        }),
        pending: await this.prisma.user.count({
          where: { kycStatus: 'PENDING' },
        }),
        rejected: await this.prisma.user.count({
          where: { kycStatus: 'REJECTED' },
        }),
        onboarded: await this.prisma.user.count({
          where: { isOnboarded: true },
        }),
        withWallets: await this.prisma.user.count({
          where: { wallet: { isNot: null } },
        }),
      };

      console.log(
        '✅ [ADMIN SERVICE] Retrieved',
        adminUsers.length,
        'users of',
        total,
        'total',
      );

      return {
        success: true,
        users: adminUsers,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        stats,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving users:', error);
      throw new BadRequestException('Failed to retrieve users');
    }
  }

  async getUserDetail(userId: string): Promise<GetUserDetailResponse> {
    console.log('🔍 [ADMIN SERVICE] Retrieving user detail for user:', userId);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          kycStatus: true,
          isVerified: true,
          isOnboarded: true,
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
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const adminUserDetail: AdminUserDetailDto = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth.toISOString(),
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        wallet: user.wallet
          ? {
              id: user.wallet.id,
              balance: user.wallet.balance,
              currency: user.wallet.currency,
              virtualAccountNumber: user.wallet.virtualAccountNumber,
              provider: user.wallet.provider,
              isActive: user.wallet.isActive,
              createdAt: user.wallet.createdAt.toISOString(),
            }
          : undefined,
      };

      console.log('✅ [ADMIN SERVICE] User detail retrieved');

      return {
        success: true,
        user: adminUserDetail,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving user detail:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve user detail');
    }
  }

  async deleteUser(deleteUserDto: DeleteUserDto): Promise<DeleteUserResponse> {
    console.log('🗑️ [ADMIN SERVICE] Deleting user with criteria:', deleteUserDto);

    try {
      // Find the user first
      const whereClause: any = {};
      if (deleteUserDto.userId) {
        whereClause.id = deleteUserDto.userId;
      } else if (deleteUserDto.email) {
        whereClause.email = deleteUserDto.email;
      }

      const user = await this.prisma.user.findUnique({
        where: whereClause,
        select: {
          id: true,
          email: true,
          wallet: {
            select: {
              id: true,
              virtualAccountNumber: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      console.log('👤 [ADMIN SERVICE] Found user to delete:', user.email);

      // Use transaction to ensure all related data is deleted properly
      const result = await this.prisma.$transaction(async (prisma) => {
        // Count transactions before deletion
        const transactionCount = await prisma.transaction.count({
          where: { userId: user.id },
        });

        // Delete all related records first (due to foreign key constraints)
        
        // Delete push tokens
        await prisma.pushToken.deleteMany({
          where: { userId: user.id },
        });

        // Delete AI approvals
        await prisma.aiApproval.deleteMany({
          where: { userId: user.id },
        });

        // Delete AI queries
        await prisma.aiQuery.deleteMany({
          where: { userId: user.id },
        });

        // Delete OCR scans
        await prisma.ocrScan.deleteMany({
          where: { userId: user.id },
        });

        // Delete wallet transactions (if wallet exists)
        if (user.wallet) {
          await prisma.walletTransaction.deleteMany({
            where: {
              OR: [
                { senderWalletId: user.wallet.id },
                { receiverWalletId: user.wallet.id },
              ],
            },
          });
        }

        // Delete transactions
        await prisma.transaction.deleteMany({
          where: { userId: user.id },
        });

        // Delete wallet (if exists)
        const walletDeleted = user.wallet !== null;
        if (user.wallet) {
          await prisma.wallet.delete({
            where: { id: user.wallet.id },
          });
        }

        // Finally, delete the user
        await prisma.user.delete({
          where: { id: user.id },
        });

        console.log('✅ [ADMIN SERVICE] User and all related data deleted successfully');
        console.log('📊 [ADMIN SERVICE] Deleted:', {
          user: user.email,
          wallet: walletDeleted,
          transactions: transactionCount,
        });

        return {
          walletDeleted,
          transactionsDeleted: transactionCount,
        };
      });

      return {
        success: true,
        message: 'User deleted successfully',
        deletedUserId: user.id,
        deletedUserEmail: user.email,
        walletDeleted: result.walletDeleted,
        transactionsDeleted: result.transactionsDeleted,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error deleting user:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete user');
    }
  }

  async getUserStats(): Promise<AdminUserStatsDto> {
    console.log('📊 [ADMIN SERVICE] Retrieving user statistics');

    try {
      const totalUsers = await this.prisma.user.count();
      const underReview = await this.prisma.user.count({
        where: { kycStatus: 'UNDER_REVIEW' },
      });
      const approved = await this.prisma.user.count({
        where: { kycStatus: 'APPROVED' },
      });
      const rejected = await this.prisma.user.count({
        where: { kycStatus: 'REJECTED' },
      });

      console.log(
        '✅ [ADMIN SERVICE] User statistics retrieved:',
        totalUsers,
        'total users,',
        underReview,
        'pending,',
        approved,
        'approved,',
        rejected,
        'rejected',
      );

      return {
        total: totalUsers,
        verified: approved,
        pending: underReview,
        rejected,
        onboarded: await this.prisma.user.count({
          where: { isOnboarded: true },
        }),
        withWallets: await this.prisma.user.count({
          where: { wallet: { isNot: null } },
        }),
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving user statistics:',
        error,
      );
      throw new BadRequestException('Failed to retrieve user statistics');
    }
  }

  // ==================== TRANSACTION MANAGEMENT METHODS ====================

  async getTransactions(
    limit: number = 20,
    offset: number = 0,
    type?: string,
    status?: string,
    userId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GetTransactionsResponse> {
    console.log('📋 [ADMIN SERVICE] Retrieving transactions with filters:', {
      limit,
      offset,
      type,
      status,
      userId,
      startDate,
      endDate,
    });

    try {
      // Build where clause based on filters
      const whereClause: any = {};

      if (type) {
        whereClause.type = type;
      }

      if (status) {
        whereClause.status = status;
      }

      if (userId) {
        whereClause.userId = userId;
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt.lte = new Date(endDate);
        }
      }

      // Get total count
      const total = await this.prisma.transaction.count({
        where: whereClause,
      });

      // Get transactions with pagination
      const transactions = await this.prisma.transaction.findMany({
        where: whereClause,
        select: {
          id: true,
          amount: true,
          currency: true,
          type: true,
          status: true,
          reference: true,
          description: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          fromAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountName: true,
              bankName: true,
              bankCode: true,
            },
          },
          toAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountName: true,
              bankName: true,
              bankCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      const adminTransactions: AdminTransactionDto[] = transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        reference: tx.reference,
        description: tx.description,
        fee: (tx.metadata as any)?.fee || 0,
        providerReference: (tx.metadata as any)?.providerReference || null,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        user: tx.user,
        sender: tx.fromAccount
          ? {
              accountNumber: tx.fromAccount.accountNumber,
              accountName: tx.fromAccount.accountName,
              bankName: tx.fromAccount.bankName,
              bankCode: tx.fromAccount.bankCode,
            }
          : (tx.metadata as any)?.provider ? {
              accountNumber: (tx.metadata as any)?.accountNumber || '',
              accountName: 'External Account',
              bankName: `${(tx.metadata as any)?.provider} Provider`,
              bankCode: (tx.metadata as any)?.provider || '',
            } : undefined,
        receiver: tx.toAccount
          ? {
              accountNumber: tx.toAccount.accountNumber,
              accountName: tx.toAccount.accountName,
              bankName: tx.toAccount.bankName,
              bankCode: tx.toAccount.bankCode,
            }
          : (tx.metadata as any)?.recipientBank ? {
              accountNumber: (tx.metadata as any)?.recipientAccount || '',
              accountName: (tx.metadata as any)?.recipientName || '',
              bankName: (tx.metadata as any)?.recipientBank || '',
              bankCode: (tx.metadata as any)?.bankCode || '',
            } : undefined,
      }));

      // Calculate stats
      const stats: AdminTransactionStatsDto = {
        totalAmount: (
          await this.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: whereClause,
          })
        )._sum.amount || 0,
        totalFees: adminTransactions.reduce((sum, tx) => sum + tx.fee, 0),
        completed: await this.prisma.transaction.count({
          where: { ...whereClause, status: 'COMPLETED' },
        }),
        pending: await this.prisma.transaction.count({
          where: { ...whereClause, status: 'PENDING' },
        }),
        failed: await this.prisma.transaction.count({
          where: { ...whereClause, status: 'FAILED' },
        }),
        cancelled: await this.prisma.transaction.count({
          where: { ...whereClause, status: 'CANCELLED' },
        }),
      };

      console.log(
        '✅ [ADMIN SERVICE] Retrieved',
        adminTransactions.length,
        'transactions of',
        total,
        'total',
      );

      return {
        success: true,
        transactions: adminTransactions,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        stats,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving transactions:', error);
      throw new BadRequestException('Failed to retrieve transactions');
    }
  }

  async getTransactionDetail(transactionId: string): Promise<GetTransactionDetailResponse> {
    console.log(
      '🔍 [ADMIN SERVICE] Retrieving transaction detail for transaction:',
      transactionId,
    );

    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
        select: {
          id: true,
          amount: true,
          currency: true,
          type: true,
          status: true,
          reference: true,
          description: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          fromAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountName: true,
              bankName: true,
              bankCode: true,
            },
          },
          toAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountName: true,
              bankName: true,
              bankCode: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Determine the primary user (sender for withdrawals/transfers, receiver for deposits)
      const primaryUser = transaction.user;
      
      // Convert wallet transaction type to admin transaction type
      const adminType = transaction.type;

      const adminTransaction: AdminTransactionDetailDto = {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        type: adminType,
        status: transaction.status,
        reference: transaction.reference,
        description: transaction.description,
        fee: (transaction.metadata as any)?.fee || 0,
        providerReference: (transaction.metadata as any)?.providerReference || null,
        providerResponse: null, // Not available in Transaction table
        metadata: transaction.metadata,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        user: primaryUser,
        sender: transaction.fromAccount
          ? {
              accountNumber: transaction.fromAccount.accountNumber,
              accountName: transaction.fromAccount.accountName,
              bankName: transaction.fromAccount.bankName,
              bankCode: transaction.fromAccount.bankCode,
            }
          : (transaction.metadata as any)?.provider ? {
              accountNumber: (transaction.metadata as any)?.accountNumber || '',
              accountName: 'External Account',
              bankName: `${(transaction.metadata as any)?.provider} Provider`,
              bankCode: (transaction.metadata as any)?.provider || '',
            } : undefined,
        receiver: transaction.toAccount
          ? {
              accountNumber: transaction.toAccount.accountNumber,
              accountName: transaction.toAccount.accountName,
              bankName: transaction.toAccount.bankName,
              bankCode: transaction.toAccount.bankCode,
            }
          : (transaction.metadata as any)?.recipientBank ? {
              accountNumber: (transaction.metadata as any)?.recipientAccount || '',
              accountName: (transaction.metadata as any)?.recipientName || '',
              bankName: (transaction.metadata as any)?.recipientBank || '',
              bankCode: (transaction.metadata as any)?.bankCode || '',
            } : undefined,
      };

      console.log('✅ [ADMIN SERVICE] Transaction detail retrieved');

      return {
        success: true,
        transaction: adminTransaction,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving transaction detail:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve transaction detail');
    }
  }

  async getTransactionStats(): Promise<AdminTransactionStatsDto> {
    console.log('📊 [ADMIN SERVICE] Retrieving transaction statistics');

    try {
      const totalTransactions = await this.prisma.transaction.count();
      const completedTransfers = await this.prisma.transaction.count({
        where: { status: 'COMPLETED' },
      });
      const pendingTransfers = await this.prisma.transaction.count({
        where: { status: 'PENDING' },
      });
      const failedTransfers = await this.prisma.transaction.count({
        where: { status: 'FAILED' },
      });
      const cancelledTransfers = await this.prisma.transaction.count({
        where: { status: 'CANCELLED' },
      });
      const totalAmountAgg = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
      });

      // Calculate total fees from metadata
      const allTransactions = await this.prisma.transaction.findMany({
        select: { metadata: true },
      });
      const totalFees = allTransactions.reduce((sum, tx) => {
        const fee = (tx.metadata as any)?.fee || 0;
        return sum + fee;
      }, 0);

      console.log(
        '✅ [ADMIN SERVICE] Transaction statistics retrieved:',
        totalTransactions,
        'total transactions,',
        completedTransfers,
        'completed,',
        failedTransfers,
        'failed,',
        totalAmountAgg._sum.amount,
        'total amount',
      );

      return {
        totalAmount: totalAmountAgg._sum.amount || 0,
        totalFees: totalFees,
        completed: completedTransfers,
        pending: pendingTransfers,
        failed: failedTransfers,
        cancelled: cancelledTransfers,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving transaction statistics:',
        error,
      );
      throw new BadRequestException('Failed to retrieve transaction statistics');
    }
  }

  // ==================== DASHBOARD STATS METHODS ====================

  async getDashboardStats(): Promise<GetDashboardStatsResponse> {
    console.log('📊 [ADMIN SERVICE] Retrieving dashboard statistics');

    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // User Stats
      const userStats: DashboardUserStatsDto = {
        total: await this.prisma.user.count(),
        verified: await this.prisma.user.count({
          where: { kycStatus: 'APPROVED' },
        }),
        pending: await this.prisma.user.count({
          where: { kycStatus: 'PENDING' },
        }),
        rejected: await this.prisma.user.count({
          where: { kycStatus: 'REJECTED' },
        }),
        newThisMonth: await this.prisma.user.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
      };

      // Transaction Stats (from WalletTransaction table)
      const totalVolumeAgg = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
      });

      const todayVolumeAgg = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfToday } },
      });

      const transactionStats: DashboardTransactionStatsDto = {
        total: await this.prisma.transaction.count(),
        completed: await this.prisma.transaction.count({
          where: { status: 'COMPLETED' },
        }),
        pending: await this.prisma.transaction.count({
          where: { status: 'PENDING' },
        }),
        failed: await this.prisma.transaction.count({
          where: { status: 'FAILED' },
        }),
        totalVolume: totalVolumeAgg._sum.amount || 0,
        todayVolume: todayVolumeAgg._sum.amount || 0,
      };

      // Wallet Stats
      const walletBalanceAgg = await this.prisma.wallet.aggregate({
        _sum: { balance: true },
      });

      const walletStats: DashboardWalletStatsDto = {
        total: await this.prisma.wallet.count(),
        active: await this.prisma.wallet.count({
          where: { isActive: true },
        }),
        inactive: await this.prisma.wallet.count({
          where: { isActive: false },
        }),
        totalBalance: walletBalanceAgg._sum.balance || 0,
      };

      const dashboardStats: DashboardStatsDto = {
        users: userStats,
        transactions: transactionStats,
        wallets: walletStats,
      };

      console.log('✅ [ADMIN SERVICE] Dashboard statistics retrieved');

      return {
        success: true,
        stats: dashboardStats,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving dashboard statistics:',
        error,
      );
      throw new BadRequestException('Failed to retrieve dashboard statistics');
    }
  }

  // ==================== WALLET MANAGEMENT METHODS ====================

  async fundWallet(dto: FundWalletDto): Promise<WalletOperationResponse> {
    console.log('💰 [ADMIN SERVICE] Fund wallet request:', dto);

    // Find user by provided identifier
    let user;
    if (dto.userId) {
      user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: { wallet: true },
      });
    } else if (dto.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { wallet: true },
      });
    } else if (dto.accountNumber) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { virtualAccountNumber: dto.accountNumber },
        include: { user: true },
      });
      user = wallet ? { ...wallet.user, wallet } : null;
    } else {
      throw new BadRequestException('Must provide userId, email, or accountNumber');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet) {
      throw new BadRequestException('User does not have a wallet');
    }

    const previousBalance = user.wallet.balance;
    const newBalance = previousBalance + dto.amount;

    // Generate transaction reference
    const reference = `TXN_ADMIN_FUND_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update wallet balance
        const updatedWallet = await prisma.wallet.update({
          where: { id: user.wallet.id },
          data: { balance: newBalance },
        });

        // Create transaction record
        await prisma.transaction.create({
          data: {
            userId: user.id,
            amount: dto.amount,
            currency: 'NGN',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            reference,
            description: dto.description || 'Admin wallet funding',
            metadata: {
              adminFunding: true,
              previousBalance,
              newBalance,
            },
          },
        });

        return updatedWallet;
      });

      console.log('✅ [ADMIN SERVICE] Wallet funded successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // Wallet balance update notification
        this.notificationsGateway.emitWalletBalanceUpdate(user.id, {
          oldBalance: previousBalance,
          newBalance,
          change: dto.amount,
          currency: 'NGN',
          provider: 'ADMIN',
          accountNumber: user.wallet.virtualAccountNumber,
          grossAmount: dto.amount,
          fundingFee: 0,
          netAmount: dto.amount,
          reference,
        });

        // Transaction notification
        this.notificationsGateway.emitTransactionNotification(user.id, {
          type: 'FUNDING',
          amount: dto.amount,
          grossAmount: dto.amount,
          fee: 0,
          currency: 'NGN',
          description: dto.description || 'Admin wallet funding',
          reference,
          provider: 'ADMIN',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });

        // General notification
        this.notificationsGateway.emitNotification(user.id, {
          title: 'Wallet Funded by Admin',
          message: `₦${dto.amount} has been credited to your wallet by admin.`,
          type: 'success',
          data: {
            amount: dto.amount,
            reference,
            adminOperation: true,
          },
        });
      }

      // Send push notification
      if (this.pushNotificationsService) {
        try {
          await this.pushNotificationsService.sendPushNotificationToUser(user.id, {
            title: 'Wallet Funded',
            body: `₦${dto.amount.toLocaleString()} has been credited to your wallet. Your new balance is ₦${newBalance.toLocaleString()}.`,
            data: {
              type: 'funding',
              amount: dto.amount,
              reference,
              newBalance,
            },
            priority: 'high',
          });
          console.log('📱 [ADMIN SERVICE] Push notification sent for wallet funding');
        } catch (pushError) {
          console.error('❌ [ADMIN SERVICE] Failed to send push notification:', pushError);
          // Don't fail the operation if push notification fails
        }
      }

      return {
        success: true,
        message: 'Wallet funded successfully',
        userId: user.id,
        userEmail: user.email,
        previousBalance,
        newBalance,
        amount: dto.amount,
        reference,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error funding wallet:', error);
      throw new BadRequestException('Failed to fund wallet');
    }
  }

  async debitWallet(dto: DebitWalletDto): Promise<WalletOperationResponse> {
    console.log('💸 [ADMIN SERVICE] Debit wallet request:', dto);

    // Find user by provided identifier
    let user;
    if (dto.userId) {
      user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: { wallet: true },
      });
    } else if (dto.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { wallet: true },
      });
    } else if (dto.accountNumber) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { virtualAccountNumber: dto.accountNumber },
        include: { user: true },
      });
      user = wallet ? { ...wallet.user, wallet } : null;
    } else {
      throw new BadRequestException('Must provide userId, email, or accountNumber');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet) {
      throw new BadRequestException('User does not have a wallet');
    }

    const previousBalance = user.wallet.balance;

    if (previousBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Current balance: ₦${previousBalance}, Requested: ₦${dto.amount}`,
      );
    }

    const newBalance = previousBalance - dto.amount;

    // Generate transaction reference
    const reference = `TXN_ADMIN_DEBIT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update wallet balance
        const updatedWallet = await prisma.wallet.update({
          where: { id: user.wallet.id },
          data: { balance: newBalance },
        });

        // Create transaction record
        await prisma.transaction.create({
          data: {
            userId: user.id,
            amount: dto.amount,
            currency: 'NGN',
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            reference,
            description: dto.description || 'Admin wallet debit',
            metadata: {
              adminDebit: true,
              previousBalance,
              newBalance,
            },
          },
        });

        return updatedWallet;
      });

      console.log('✅ [ADMIN SERVICE] Wallet debited successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // Wallet balance update notification
        this.notificationsGateway.emitWalletBalanceUpdate(user.id, {
          oldBalance: previousBalance,
          newBalance,
          change: -dto.amount,
          currency: 'NGN',
          provider: 'ADMIN',
          accountNumber: user.wallet.virtualAccountNumber,
          grossAmount: dto.amount,
          fundingFee: 0,
          netAmount: -dto.amount,
          reference,
        });

        // Transaction notification
        this.notificationsGateway.emitTransactionNotification(user.id, {
          type: 'WITHDRAWAL',
          amount: dto.amount,
          grossAmount: dto.amount,
          fee: 0,
          currency: 'NGN',
          description: dto.description || 'Admin wallet debit',
          reference,
          provider: 'ADMIN',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });

        // General notification
        this.notificationsGateway.emitNotification(user.id, {
          title: 'Wallet Debited by Admin',
          message: `₦${dto.amount} has been debited from your wallet by admin.`,
          type: 'warning',
          data: {
            amount: dto.amount,
            reference,
            adminOperation: true,
          },
        });
      }

      // Send push notification
      if (this.pushNotificationsService) {
        try {
          await this.pushNotificationsService.sendPushNotificationToUser(user.id, {
            title: 'Wallet Debited',
            body: `₦${dto.amount.toLocaleString()} has been debited from your wallet. Your new balance is ₦${newBalance.toLocaleString()}.`,
            data: {
              type: 'withdrawal',
              amount: dto.amount,
              reference,
              newBalance,
            },
            priority: 'high',
          });
          console.log('📱 [ADMIN SERVICE] Push notification sent for wallet debit');
        } catch (pushError) {
          console.error('❌ [ADMIN SERVICE] Failed to send push notification:', pushError);
          // Don't fail the operation if push notification fails
        }
      }

      return {
        success: true,
        message: 'Wallet debited successfully',
        userId: user.id,
        userEmail: user.email,
        previousBalance,
        newBalance,
        amount: dto.amount,
        reference,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error debiting wallet:', error);
      throw new BadRequestException('Failed to debit wallet');
    }
  }

  async editUser(dto: EditUserDto): Promise<EditUserResponse> {
    console.log('✏️ [ADMIN SERVICE] Edit user request:', dto);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Track which fields are being updated
    const updatedFields: string[] = [];
    const updateData: any = {};

    if (dto.email !== undefined) {
      updateData.email = dto.email;
      updatedFields.push('email');
    }
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
      updatedFields.push('phone');
    }
    if (dto.firstName !== undefined) {
      updateData.firstName = dto.firstName;
      updatedFields.push('firstName');
    }
    if (dto.lastName !== undefined) {
      updateData.lastName = dto.lastName;
      updatedFields.push('lastName');
    }
    if (dto.gender !== undefined) {
      updateData.gender = dto.gender;
      updatedFields.push('gender');
    }
    if (dto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
      updatedFields.push('dateOfBirth');
    }
    if (dto.bvn !== undefined) {
      updateData.bvn = dto.bvn;
      updatedFields.push('bvn');
    }
    if (dto.kycStatus !== undefined) {
      updateData.kycStatus = dto.kycStatus;
      updatedFields.push('kycStatus');
    }
    if (dto.isVerified !== undefined) {
      updateData.isVerified = dto.isVerified;
      updatedFields.push('isVerified');
    }
    if (dto.isOnboarded !== undefined) {
      updateData.isOnboarded = dto.isOnboarded;
      updatedFields.push('isOnboarded');
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
      updatedFields.push('isActive');
    }

    if (updatedFields.length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: dto.userId },
        data: updateData,
      });

      console.log('✅ [ADMIN SERVICE] User updated successfully');

      return {
        success: true,
        message: 'User updated successfully',
        userId: updatedUser.id,
        updatedFields,
        updatedAt: updatedUser.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error updating user:', error);
      throw new BadRequestException('Failed to update user');
    }
  }

  async createWallet(dto: CreateWalletDto): Promise<CreateWalletResponse> {
    console.log('🏦 [ADMIN SERVICE] Create wallet request:', dto);

    // Find user by provided identifier
    let user;
    if (dto.userId) {
      user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        include: { wallet: true },
      });
    } else if (dto.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { wallet: true },
      });
    } else {
      throw new BadRequestException('Must provide userId or email');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.wallet) {
      throw new BadRequestException('User already has a wallet');
    }

    try {
      // Temporarily override provider selection for admin creation
      const providerService = await this.providerManager.getWalletProvider(dto.provider);

      // Create wallet account with provider
      const accountResult = await providerService.createWallet({
        firstName: user.firstName || 'User',
        lastName: user.lastName || 'User',
        email: user.email,
        phoneNumber: user.phone,
        gender: user.gender === 'MALE' ? 'M' : 'F',
        dateOfBirth: user.dateOfBirth.toISOString().split('T')[0],
        bvn: user.bvn,
        address: 'Default Address',
        city: 'Default City',
        state: 'Default State',
        country: 'Nigeria',
        accountName: `${user.firstName || 'User'} ${user.lastName || 'User'}`,
      });

      // Hash PIN if provided
      let hashedPin = null;
      if (dto.pin) {
        const bcrypt = require('bcrypt');
        hashedPin = await bcrypt.hash(dto.pin, 10);
      }

      // Create wallet in database with complete provider data
      const wallet = await this.prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          currency: 'NGN',
          virtualAccountNumber: accountResult.data?.accountNumber,
          providerAccountName: accountResult.data?.accountName,
          providerId: accountResult.data?.customerId,
          bankName: accountResult.data?.bankName,
          provider: dto.provider,
          pin: hashedPin,
          isActive: true,
        },
      });

      console.log('💾 [ADMIN SERVICE] Stored provider data:', {
        providerId: accountResult.data?.customerId,
        bankName: accountResult.data?.bankName,
        accountName: accountResult.data?.accountName,
      });

      console.log('✅ [ADMIN SERVICE] Wallet created successfully');

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // General notification for wallet creation
        this.notificationsGateway.emitNotification(user.id, {
          title: 'Wallet Created by Admin',
          message: `Your wallet has been created successfully by admin. Account Number: ${wallet.virtualAccountNumber}`,
          type: 'success',
          data: {
            walletId: wallet.id,
            accountNumber: wallet.virtualAccountNumber,
            provider: wallet.provider,
            adminOperation: true,
          },
        });
      }

      return {
        success: true,
        message: 'Wallet created successfully',
        userId: user.id,
        userEmail: user.email,
        walletId: wallet.id,
        virtualAccountNumber: wallet.virtualAccountNumber,
        provider: wallet.provider,
        createdAt: wallet.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error creating wallet:', error);
      throw new BadRequestException('Failed to create wallet');
    }
  }

  // ==================== ADMIN MANAGEMENT METHODS ====================

  // Role-based permission mapping
  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'SUDO_ADMIN':
        return ['*']; // All permissions
      
      case 'ADMIN':
        return [
          'VIEW_USERS', 'EDIT_USERS', 'DELETE_USERS',
          'VIEW_TRANSACTIONS', 'APPROVE_TRANSACTIONS', 'REVERSE_TRANSACTIONS',
          'VIEW_KYC', 'APPROVE_KYC', 'REJECT_KYC',
          'VIEW_WALLETS', 'FUND_WALLETS', 'DEBIT_WALLETS', 'CREATE_WALLETS',
          'VIEW_FEES', 'SET_FEES', 'DELETE_FEES',
          'VIEW_PROVIDERS', 'SWITCH_PROVIDERS', 'TEST_PROVIDERS',
          'VIEW_DASHBOARD', 'VIEW_LOGS', 'SYSTEM_CONFIG',
          'VIEW_ADMINS', 'EDIT_ADMINS', 'DELETE_ADMINS',
        ];
      
      case 'CUSTOMER_REP':
        return [
          'VIEW_USERS', 'EDIT_USERS',
          'VIEW_TRANSACTIONS', 'APPROVE_TRANSACTIONS',
          'VIEW_KYC', 'APPROVE_KYC', 'REJECT_KYC',
          'VIEW_WALLETS', 'FUND_WALLETS',
          'VIEW_FEES',
          'VIEW_DASHBOARD',
        ];
      
      case 'DEVELOPER':
        return [
          'VIEW_LOGS', 'TEST_PROVIDERS', 'VIEW_DASHBOARD',
          'VIEW_PROVIDERS', 'SYSTEM_CONFIG',
          'VIEW_TRANSACTIONS', 'VIEW_USERS',
        ];
      
      default:
        return [];
    }
  }

  async createAdmin(
    createAdminDto: CreateAdminDto,
    adminId: string,
    adminEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CreateAdminResponse> {
    console.log('👑 [ADMIN SERVICE] Promoting user to admin:', createAdminDto.email);

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createAdminDto.email },
    });

    if (!existingUser) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if user is already an admin
    if (existingUser.role !== 'USER') {
      throw new BadRequestException(`User is already an admin with role: ${existingUser.role}`);
    }

    // Determine permissions
    const permissions = createAdminDto.customPermissions || 
      this.getDefaultPermissions(createAdminDto.role);

    try {
      // Promote user to admin
      const promotedUser = await this.prisma.user.update({
        where: { email: createAdminDto.email },
        data: {
          role: createAdminDto.role,
          // Store permissions as JSON in metadata
          metadata: {
            permissions: permissions,
            isAdmin: true,
            promotedBy: adminEmail,
            promotedAt: new Date().toISOString(),
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          metadata: true,
          updatedAt: true,
        },
      });

      console.log('✅ [ADMIN SERVICE] User promoted to admin successfully:', promotedUser.email);

      // Log the admin action
      await this.logAdminAction(
        adminId,
        adminEmail,
        'CREATE_ADMIN',
        'USER',
        promotedUser.id,
        promotedUser.email,
        {
          role: promotedUser.role,
          permissions: permissions,
          previousRole: 'USER',
        },
        ipAddress,
        userAgent
      );

      return {
        success: true,
        message: 'User promoted to admin successfully',
        userId: promotedUser.id,
        email: promotedUser.email,
        fullName: `${promotedUser.firstName || ''} ${promotedUser.lastName || ''}`.trim(),
        role: promotedUser.role,
        permissions: permissions,
        promotedAt: promotedUser.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Admin promotion failed:', error);
      throw new BadRequestException('Admin promotion failed. Please try again.');
    }
  }

  async getAdmins(
    limit: number = 20,
    offset: number = 0,
    role?: string,
    search?: string,
  ): Promise<GetAdminsResponse> {
    console.log('📋 [ADMIN SERVICE] Retrieving admins with filters:', {
      limit,
      offset,
      role,
      search,
    });

    try {
      // Build where clause based on filters
      const whereClause: any = {
        role: { in: ['ADMIN', 'CUSTOMER_REP', 'DEVELOPER', 'SUDO_ADMIN'] },
      };

      if (role) {
        whereClause.role = role;
      }

      if (search) {
        whereClause.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.user.count({
        where: whereClause,
      });

      // Get admins with pagination
      const admins = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      // Format admins with permissions
      const formattedAdmins = admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        phone: admin.phone,
        firstName: admin.firstName,
        lastName: admin.lastName,
        gender: admin.gender,
        dateOfBirth: admin.dateOfBirth.toISOString(),
        role: admin.role,
        isActive: admin.isActive,
        isVerified: admin.isVerified,
        permissions: (admin.metadata as any)?.permissions || [],
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
      }));

      console.log('✅ [ADMIN SERVICE] Retrieved', formattedAdmins.length, 'admins');

      return {
        success: true,
        message: 'Admins retrieved successfully',
        admins: formattedAdmins,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Failed to retrieve admins:', error);
      throw new BadRequestException('Failed to retrieve admins');
    }
  }

  async getAdminDetail(adminId: string): Promise<AdminDto> {
    console.log('🔍 [ADMIN SERVICE] Getting admin details for:', adminId);

    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['ADMIN', 'CUSTOMER_REP', 'DEVELOPER', 'SUDO_ADMIN'] },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    console.log('✅ [ADMIN SERVICE] Admin details retrieved:', admin.email);

    return {
      id: admin.id,
      email: admin.email,
      phone: admin.phone,
      firstName: admin.firstName,
      lastName: admin.lastName,
      gender: admin.gender,
      dateOfBirth: admin.dateOfBirth.toISOString(),
      role: admin.role,
      isActive: admin.isActive,
      isVerified: admin.isVerified,
      permissions: (admin.metadata as any)?.permissions || [],
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    };
  }

  async updateAdmin(adminId: string, updateAdminDto: UpdateAdminDto): Promise<UpdateAdminResponse> {
    console.log('✏️ [ADMIN SERVICE] Updating admin:', adminId);

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['ADMIN', 'CUSTOMER_REP', 'DEVELOPER', 'SUDO_ADMIN'] },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Build update data
    const updateData: any = {};

    if (updateAdminDto.firstName) updateData.firstName = updateAdminDto.firstName;
    if (updateAdminDto.lastName) updateData.lastName = updateAdminDto.lastName;
    if (updateAdminDto.phone) updateData.phone = updateAdminDto.phone;
    if (updateAdminDto.role) updateData.role = updateAdminDto.role;
    if (updateAdminDto.isActive !== undefined) updateData.isActive = updateAdminDto.isActive;

    // Handle permissions update
    if (updateAdminDto.permissions) {
      const currentMetadata = (existingAdmin.metadata as any) || {};
      updateData.metadata = {
        ...currentMetadata,
        permissions: updateAdminDto.permissions,
      };
    }

    try {
      const updatedAdmin = await this.prisma.user.update({
        where: { id: adminId },
        data: updateData,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
        },
      });

      console.log('✅ [ADMIN SERVICE] Admin updated successfully:', updatedAdmin.email);

      return {
        success: true,
        message: 'Admin updated successfully',
        admin: {
          id: updatedAdmin.id,
          email: updatedAdmin.email,
          phone: updatedAdmin.phone,
          firstName: updatedAdmin.firstName,
          lastName: updatedAdmin.lastName,
          gender: updatedAdmin.gender,
          dateOfBirth: updatedAdmin.dateOfBirth.toISOString(),
          role: updatedAdmin.role,
          isActive: updatedAdmin.isActive,
          isVerified: updatedAdmin.isVerified,
          permissions: (updatedAdmin.metadata as any)?.permissions || [],
          createdAt: updatedAdmin.createdAt.toISOString(),
          updatedAt: updatedAdmin.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Admin update failed:', error);
      throw new BadRequestException('Admin update failed');
    }
  }

  async deleteAdmin(adminId: string, deleteAdminDto: DeleteAdminDto): Promise<DeleteAdminResponse> {
    console.log('🗑️ [ADMIN SERVICE] Deleting admin:', adminId);

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['ADMIN', 'CUSTOMER_REP', 'DEVELOPER', 'SUDO_ADMIN'] },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Prevent deletion of SUDO_ADMIN
    if (existingAdmin.role === 'SUDO_ADMIN') {
      throw new BadRequestException('Cannot delete SUDO_ADMIN account');
    }

    try {
      // Soft delete by deactivating the account
      await this.prisma.user.update({
        where: { id: adminId },
        data: {
          isActive: false,
          metadata: {
            ...(existingAdmin.metadata as any),
            deletedAt: new Date().toISOString(),
            deletedReason: deleteAdminDto.reason,
            deletedBy: 'SUDO_ADMIN', // This will be updated to actual SUDO_ADMIN ID
          },
        },
      });

      console.log('✅ [ADMIN SERVICE] Admin deleted successfully:', existingAdmin.email);

      return {
        success: true,
        message: 'Admin deleted successfully',
        adminId: adminId,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Admin deletion failed:', error);
      throw new BadRequestException('Admin deletion failed');
    }
  }

  async getRolePermissions() {
    console.log('📋 [ADMIN SERVICE] Getting role permissions mapping');

    const roles = {
      SUDO_ADMIN: ['*'],
      ADMIN: this.getDefaultPermissions('ADMIN'),
      CUSTOMER_REP: this.getDefaultPermissions('CUSTOMER_REP'),
      DEVELOPER: this.getDefaultPermissions('DEVELOPER'),
    };

    return {
      success: true,
      message: 'Role permissions retrieved successfully',
      roles,
    };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // ==================== ADMIN ACTION LOGGING ====================

  async logAdminAction(
    adminId: string,
    adminEmail: string,
    action: string,
    targetType?: string,
    targetId?: string,
    targetEmail?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          adminEmail,
          action,
          targetType,
          targetId,
          targetEmail,
          details,
          ipAddress,
          userAgent,
        },
      });

      console.log(`📝 [ADMIN LOG] ${action} by ${adminEmail}`);
    } catch (error) {
      console.error('❌ [ADMIN LOG] Failed to log admin action:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  async getAdminLogs(
    limit: number = 20,
    offset: number = 0,
    action?: string,
    adminEmail?: string,
    targetEmail?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GetAdminLogsResponse> {
    console.log('📋 [ADMIN SERVICE] Retrieving admin logs with filters:', {
      limit,
      offset,
      action,
      adminEmail,
      targetEmail,
      startDate,
      endDate,
    });

    try {
      // Build where clause based on filters
      const whereClause: any = {};

      if (action) {
        whereClause.action = action;
      }

      if (adminEmail) {
        whereClause.adminEmail = { contains: adminEmail, mode: 'insensitive' };
      }

      if (targetEmail) {
        whereClause.targetEmail = { contains: targetEmail, mode: 'insensitive' };
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
        }
      }

      // Get total count
      const total = await this.prisma.adminActionLog.count({
        where: whereClause,
      });

      // Get logs with pagination
      const logs = await this.prisma.adminActionLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      // Format logs
      const formattedLogs = logs.map(log => ({
        id: log.id,
        adminId: log.adminId,
        adminEmail: log.adminEmail,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        targetEmail: log.targetEmail,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
      }));

      console.log('✅ [ADMIN SERVICE] Retrieved', formattedLogs.length, 'admin logs');

      return {
        success: true,
        message: 'Admin logs retrieved successfully',
        logs: formattedLogs,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Failed to retrieve admin logs:', error);
      throw new BadRequestException('Failed to retrieve admin logs');
    }
  }

  async getAdminLogsByAdmin(adminId: string, limit: number = 20, offset: number = 0) {
    return this.getAdminLogs(limit, offset, undefined, undefined, undefined, undefined, undefined);
  }
}
