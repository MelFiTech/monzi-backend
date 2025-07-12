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
} from './dto/admin.dto';
import { KycStatus, Prisma, FeeType as PrismaFeeType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private providerManager: ProviderManagerService,
    private transferProviderManager: TransferProviderManagerService,
    private configService: ConfigService,
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

      if (!user.selfieUrl) {
        throw new BadRequestException('No selfie uploaded for this user');
      }

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
        providerReference: (tx.metadata as any)?.provider_reference || null,
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
          : undefined,
        receiver: tx.toAccount
          ? {
              accountNumber: tx.toAccount.accountNumber,
              accountName: tx.toAccount.accountName,
              bankName: tx.toAccount.bankName,
              bankCode: tx.toAccount.bankCode,
            }
          : undefined,
      }));

      // Calculate stats
      const stats: AdminTransactionStatsDto = {
        totalAmount: (
          await this.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: whereClause,
          })
        )._sum.amount || 0,
        totalFees: 0, // Fees are stored in metadata, would need custom calculation
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
              phone: true,
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

      const adminTransactionDetail: AdminTransactionDetailDto = {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        status: transaction.status,
        reference: transaction.reference,
        description: transaction.description,
        fee: (transaction.metadata as any)?.fee || 0,
        providerReference: (transaction.metadata as any)?.provider_reference || null,
        providerResponse: (transaction.metadata as any)?.provider_response || null,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        user: transaction.user,
        sender: transaction.fromAccount
          ? {
              accountNumber: transaction.fromAccount.accountNumber,
              accountName: transaction.fromAccount.accountName,
              bankName: transaction.fromAccount.bankName,
              bankCode: transaction.fromAccount.bankCode,
            }
          : undefined,
        receiver: transaction.toAccount
          ? {
              accountNumber: transaction.toAccount.accountNumber,
              accountName: transaction.toAccount.accountName,
              bankName: transaction.toAccount.bankName,
              bankCode: transaction.toAccount.bankCode,
            }
          : undefined,
      };

      console.log('✅ [ADMIN SERVICE] Transaction detail retrieved');

      return {
        success: true,
        transaction: adminTransactionDetail,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error retrieving transaction detail:',
        error,
      );
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
        totalFees: 0, // Fees are stored in metadata, would need custom calculation
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

      // Transaction Stats
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
}
