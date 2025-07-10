import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
  KycDecision 
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private providerManager: ProviderManagerService,
    private transferProviderManager: TransferProviderManagerService,
  ) {}

  async setFee(setFeeDto: SetFeeDto): Promise<SetFeeResponse> {
    console.log('⚙️ [ADMIN SERVICE] Setting fee configuration');
    console.log('📋 [ADMIN SERVICE] Fee data:', setFeeDto);

    // Validate that at least one fee parameter is provided
    if (!setFeeDto.percentage && !setFeeDto.fixedAmount && !setFeeDto.minAmount) {
      throw new BadRequestException('At least one fee parameter (percentage, fixedAmount, or minAmount) must be provided');
    }

    // Validate percentage and fixed amount combination
    if (setFeeDto.percentage && setFeeDto.fixedAmount) {
      throw new BadRequestException('Cannot set both percentage and fixed amount for the same fee');
    }

    // Validate min/max fee logic
    if (setFeeDto.minAmount && setFeeDto.maxAmount && setFeeDto.minAmount > setFeeDto.maxAmount) {
      throw new BadRequestException('Minimum fee cannot be greater than maximum fee');
    }

    try {
      // Check if fee configuration already exists
      const existingFee = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: setFeeDto.type }
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
          }
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
          }
        });
      }

      console.log('✅ [ADMIN SERVICE] Fee configuration saved successfully');

      return {
        success: true,
        message: existingFee ? 'Fee configuration updated successfully' : 'Fee configuration created successfully',
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
        }
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error setting fee configuration:', error);
      throw new BadRequestException('Failed to set fee configuration');
    }
  }

  async getFees(): Promise<GetFeesResponse> {
    console.log('📊 [ADMIN SERVICE] Retrieving all fee configurations');

    try {
      const feeConfigurations = await this.prisma.feeConfiguration.findMany({
        orderBy: { feeType: 'asc' }
      });

      console.log('✅ [ADMIN SERVICE] Retrieved', feeConfigurations.length, 'fee configurations');

      const fees: FeeConfigurationResponse[] = feeConfigurations.map(fee => ({
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
        total: fees.length
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving fee configurations:', error);
      throw new BadRequestException('Failed to retrieve fee configurations');
    }
  }

  async getFeeByType(type: FeeType): Promise<FeeConfigurationResponse | null> {
    console.log('🔍 [ADMIN SERVICE] Retrieving fee configuration for type:', type);

    try {
      const feeConfiguration = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: type }
      });

      if (!feeConfiguration) {
        console.log('⚠️ [ADMIN SERVICE] No fee configuration found for type:', type);
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
      console.error('❌ [ADMIN SERVICE] Error retrieving fee configuration:', error);
      throw new BadRequestException('Failed to retrieve fee configuration');
    }
  }

  async deleteFee(type: FeeType): Promise<DeleteFeeResponse> {
    console.log('🗑️ [ADMIN SERVICE] Deleting fee configuration for type:', type);

    try {
      const existingFee = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: type }
      });

      if (!existingFee) {
        throw new NotFoundException(`Fee configuration for type '${type}' not found`);
      }

      await this.prisma.feeConfiguration.delete({
        where: { feeType: type }
      });

      console.log('✅ [ADMIN SERVICE] Fee configuration deleted successfully');

      return {
        success: true,
        message: 'Fee configuration deleted successfully',
        deletedType: type
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error deleting fee configuration:', error);
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
        minAmount: 25.00,
        maxAmount: 5000.00,
        isActive: true,
      },
      {
        type: FeeType.WITHDRAWAL,
        fixedAmount: 10.00,
        isActive: true,
      },
      {
        type: FeeType.FUNDING,
        percentage: 0.005, // 0.5%
        minAmount: 0,
        maxAmount: 100.00,
        isActive: false, // Funding usually free
      }
    ];

    for (const feeData of defaultFees) {
      try {
        const existingFee = await this.prisma.feeConfiguration.findUnique({
          where: { feeType: feeData.type }
        });

        if (!existingFee) {
          await this.prisma.feeConfiguration.create({
            data: { 
              feeType: feeData.type, 
              percentage: feeData.percentage,
              fixedAmount: feeData.fixedAmount,
              minAmount: feeData.minAmount,
              maxAmount: feeData.maxAmount,
              isActive: feeData.isActive
            }
          });
          console.log('✅ [ADMIN SERVICE] Created default fee for:', feeData.type);
        } else {
          console.log('⚠️ [ADMIN SERVICE] Fee already exists for:', feeData.type);
        }
      } catch (error) {
        console.error('❌ [ADMIN SERVICE] Error creating default fee for', feeData.type, ':', error);
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
            { kycStatus: 'REJECTED' }
          ]
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
        orderBy: { updatedAt: 'desc' }
      });

      const submissions: KycSubmissionDto[] = users.map(user => ({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      }));

      // Count submissions by status
      const pending = submissions.filter(s => s.kycStatus === 'UNDER_REVIEW').length;
      const verified = submissions.filter(s => s.kycStatus === 'APPROVED').length;
      const rejected = submissions.filter(s => s.kycStatus === 'REJECTED').length;

      console.log('✅ [ADMIN SERVICE] Retrieved', submissions.length, 'KYC submissions');
      console.log('📊 [ADMIN SERVICE] Stats - Pending:', pending, 'Verified:', verified, 'Rejected:', rejected);

      return {
        success: true,
        submissions,
        total: submissions.length,
        pending,
        verified,
        rejected,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving KYC submissions:', error);
      throw new BadRequestException('Failed to retrieve KYC submissions');
    }
  }

  async getKycSubmissionDetails(userId: string): Promise<KycSubmissionDetailResponse> {
    console.log('🔍 [ADMIN SERVICE] Retrieving KYC submission details for user:', userId);

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
        }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const submission: KycSubmissionDto = {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      };

      // Generate full image URL if selfie exists
      const selfieImageUrl = user.selfieUrl ? 
        `http://localhost:3000${user.selfieUrl}` : undefined;

      console.log('✅ [ADMIN SERVICE] KYC submission details retrieved');

      return {
        success: true,
        submission,
        selfieImageUrl,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving KYC submission details:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve KYC submission details');
    }
  }

  async reviewKycSubmission(userId: string, reviewDto: KycReviewDto): Promise<KycReviewResponse> {
    console.log('⚖️ [ADMIN SERVICE] Reviewing KYC submission for user:', userId);
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
        }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.kycStatus !== 'UNDER_REVIEW') {
        throw new BadRequestException(`Cannot review KYC submission. Current status: ${user.kycStatus}`);
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
          }
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
            user.bvn || undefined
          );
          walletCreated = true;
          virtualAccountNumber = wallet.virtualAccountNumber;
          console.log('💳 [ADMIN SERVICE] Wallet created for approved user:', virtualAccountNumber);
        } catch (walletError) {
          console.error('❌ [ADMIN SERVICE] Error creating wallet:', walletError);
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
          }
        });

        console.log('❌ [ADMIN SERVICE] KYC rejected for user:', userId);
      }

      const message = reviewDto.decision === KycDecision.APPROVE 
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
      console.error('❌ [ADMIN SERVICE] Error reviewing KYC submission:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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
          kycStatus: 'UNDER_REVIEW'
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
        orderBy: { updatedAt: 'desc' }
      });

      const submissions: KycSubmissionDto[] = users.map(user => ({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString(),
        selfieUrl: user.selfieUrl,
        submittedAt: user.updatedAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      }));

      console.log('✅ [ADMIN SERVICE] Retrieved', submissions.length, 'pending KYC submissions');

      return {
        success: true,
        submissions,
        total: submissions.length,
        pending: submissions.length,
        verified: 0,
        rejected: 0,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving pending KYC submissions:', error);
      throw new BadRequestException('Failed to retrieve pending KYC submissions');
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
      const currentProvider = await this.providerManager.getCurrentProviderName();

      console.log('✅ [ADMIN SERVICE] Retrieved', providers.length, 'available providers');

      return {
        success: true,
        currentProvider,
        providers,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error retrieving available providers:', error);
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
      const previousProvider = await this.providerManager.getCurrentProviderName();

      // Validate provider
      if (!Object.values(WalletProvider).includes(provider as WalletProvider)) {
        throw new BadRequestException(`Invalid provider: ${provider}`);
      }

      // Switch provider
      const result = await this.providerManager.switchWalletProvider(provider as WalletProvider);

      console.log('✅ [ADMIN SERVICE] Wallet provider switched successfully');

      return {
        success: result.success,
        message: result.message,
        previousProvider,
        newProvider: provider,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error switching wallet provider:', error);
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
      const currentProvider = providers.find(p => p.name === providerName);

      console.log('✅ [ADMIN SERVICE] Current provider retrieved:', providerName);

      return {
        success: true,
        provider: currentProvider?.provider || 'SMEPLUG',
        name: providerName,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error getting current provider:', error);
      throw new BadRequestException('Failed to get current provider');
    }
  }

  // ==================== POLARIS API TEST METHOD ====================
  
  async testPolarisAccountCreation(testData: any) {
    console.log('🧪 [ADMIN SERVICE] Testing Polaris account creation API');
    
    try {
      // Get the Polaris provider directly
      const polarisProvider = await this.providerManager.getWalletProvider(WalletProvider.POLARIS);
      
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

      console.log('📋 [ADMIN SERVICE] Calling Polaris createWallet with data:', walletData);
      
      const result = await polarisProvider.createWallet(walletData);
      
      console.log('📄 [ADMIN SERVICE] Polaris API response:', result);
      
      return {
        success: true,
        message: 'Polaris API test completed',
        apiResponse: result,
        requestData: walletData
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
        if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
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
      const budPayProvider = await this.providerManager.getWalletProvider(WalletProvider.BUDPAY);
      
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

      console.log('📋 [ADMIN SERVICE] Calling BudPay createWallet with data:', walletData);
      
      const result = await budPayProvider.createWallet(walletData);
      
      console.log('📄 [ADMIN SERVICE] BudPay API response:', result);
      
      return {
        success: true,
        message: 'BudPay API test completed',
        apiResponse: result,
        requestData: walletData
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
      console.error('❌ [ADMIN SERVICE] Error retrieving transfer providers:', error);
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
      const previousProvider = await this.transferProviderManager.getCurrentProviderName();

      // Validate provider
      if (!Object.values(TransferProvider).includes(provider as TransferProvider)) {
        throw new BadRequestException(`Invalid transfer provider: ${provider}`);
      }

      // Switch provider
      const result = await this.transferProviderManager.switchTransferProvider(provider as TransferProvider);

      console.log('✅ [ADMIN SERVICE] Transfer provider switched successfully');

      return {
        success: result.success,
        message: result.message,
        previousProvider,
        newProvider: provider,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error switching transfer provider:', error);
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

      console.log('✅ [ADMIN SERVICE] Current transfer provider retrieved:', providerInfo.currentProvider);

      return {
        success: true,
        provider: providerInfo.currentProvider,
        isAdminConfigured: providerInfo.isAdminConfigured,
      };

    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error getting current transfer provider:', error);
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
      const currentProvider = await this.transferProviderManager.getCurrentProviderName();
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

  async testAccountVerification(testData: { accountNumber: string; bankCode: string }) {
    console.log('🧪 [ADMIN SERVICE] Testing account verification API');
    console.log('📋 [ADMIN SERVICE] Test data:', testData);

    try {
      const currentProvider = await this.transferProviderManager.getCurrentProviderName();
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
      console.error('❌ [ADMIN SERVICE] Account verification test failed:', error);
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
      const currentProvider = await this.transferProviderManager.getCurrentProviderName();
      
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

      const result = await this.transferProviderManager.transferToBank(transferData);

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
} 