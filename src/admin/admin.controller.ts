import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ValidationPipe,
  HttpStatus,
  Put,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { FeeType } from '@prisma/client';
import {
  SetFeeDto,
  SetFeeResponse,
  GetFeesResponse,
  DeleteFeeResponse,
  FeeConfigurationResponse,
  GetKycSubmissionsResponse,
  KycSubmissionDetailResponse,
  KycReviewDto,
  KycReviewResponse,
  CreateFeeConfigurationDto,
  UpdateFeeConfigurationDto,
  GetUsersResponse,
  GetUserDetailResponse,
  GetTransactionsResponse,
  GetTransactionDetailResponse,
  GetDashboardStatsResponse,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('fees')
  @ApiOperation({
    summary: 'Set or update fee configuration',
    description:
      'Configure fees for different transaction types. Can set percentage-based or fixed amount fees with optional minimum and maximum limits.',
  })
  @ApiBody({ type: SetFeeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Fee configuration created or updated successfully',
    type: SetFeeResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid fee configuration data',
  })
  async setFee(
    @Body(ValidationPipe) setFeeDto: SetFeeDto,
  ): Promise<SetFeeResponse> {
    console.log('⚙️ [ADMIN API] POST /admin/fees - Setting fee configuration');
    console.log('📝 Request Data:', setFeeDto);

    const result = await this.adminService.setFee(setFeeDto);

    console.log('✅ [ADMIN API] Fee configuration set successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Get('fees')
  @ApiOperation({
    summary: 'Get all fee configurations',
    description: 'Retrieve all configured fees for different transaction types',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee configurations retrieved successfully',
    type: GetFeesResponse,
  })
  async getFees(): Promise<GetFeesResponse> {
    console.log(
      '📊 [ADMIN API] GET /admin/fees - Retrieving all fee configurations',
    );

    const result = await this.adminService.getFees();

    console.log('✅ [ADMIN API] Fee configurations retrieved successfully');
    console.log('📄 Response Data:', {
      ...result,
      fees: `${result.fees.length} fee configurations`,
    });

    return result;
  }

  @Get('fees/:type')
  @ApiOperation({
    summary: 'Get fee configuration by type',
    description: 'Retrieve fee configuration for a specific transaction type',
  })
  @ApiParam({
    name: 'type',
    enum: FeeType,
    description: 'Fee type to retrieve',
    example: 'TRANSFER',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee configuration retrieved successfully',
    type: FeeConfigurationResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee configuration not found',
  })
  async getFeeByType(
    @Param('type') type: FeeType,
  ): Promise<FeeConfigurationResponse | null> {
    console.log(
      '🔍 [ADMIN API] GET /admin/fees/:type - Retrieving fee for type:',
      type,
    );

    const result = await this.adminService.getFeeByType(type);

    if (result) {
      console.log('✅ [ADMIN API] Fee configuration found for type:', type);
      console.log('📄 Response Data:', result);
    } else {
      console.log('⚠️ [ADMIN API] No fee configuration found for type:', type);
    }

    return result;
  }

  @Delete('fees/:type')
  @ApiOperation({
    summary: 'Delete fee configuration',
    description: 'Remove fee configuration for a specific transaction type',
  })
  @ApiParam({
    name: 'type',
    enum: FeeType,
    description: 'Fee type to delete',
    example: 'TRANSFER',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee configuration deleted successfully',
    type: DeleteFeeResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee configuration not found',
  })
  async deleteFee(@Param('type') type: FeeType): Promise<DeleteFeeResponse> {
    console.log(
      '🗑️ [ADMIN API] DELETE /admin/fees/:type - Deleting fee for type:',
      type,
    );

    const result = await this.adminService.deleteFee(type);

    console.log('✅ [ADMIN API] Fee configuration deleted successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Post('fees/seed')
  @ApiOperation({
    summary: 'Seed default fee configurations',
    description:
      'Initialize the system with default fee configurations for common transaction types',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Default fee configurations seeded successfully',
  })
  async seedDefaultFees(): Promise<{ success: boolean; message: string }> {
    console.log('🌱 [ADMIN API] POST /admin/fees/seed - Seeding default fees');

    await this.adminService.seedDefaultFees();

    console.log('✅ [ADMIN API] Default fees seeded successfully');

    return {
      success: true,
      message: 'Default fee configurations seeded successfully',
    };
  }

  @Post('fees/:type/calculate')
  @ApiOperation({
    summary: 'Calculate fee for amount',
    description:
      'Calculate the fee that would be charged for a specific amount and fee type',
  })
  @ApiParam({
    name: 'type',
    enum: FeeType,
    description: 'Fee type to calculate',
    example: 'TRANSFER',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          example: 1000,
          description: 'Amount to calculate fee for',
        },
      },
      required: ['amount'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        amount: { type: 'number', example: 1000 },
        fee: { type: 'number', example: 25 },
        totalAmount: { type: 'number', example: 1025 },
        feeType: { type: 'string', example: 'TRANSFER' },
      },
    },
  })
  async calculateFee(
    @Param('type') type: FeeType,
    @Body() body: { amount: number },
  ): Promise<{
    success: boolean;
    amount: number;
    fee: number;
    totalAmount: number;
    feeType: string;
  }> {
    console.log(
      '🧮 [ADMIN API] POST /admin/fees/:type/calculate - Calculating fee',
    );
    console.log('📝 Type:', type, 'Amount:', body.amount);

    const fee = await this.adminService.calculateFee(type, body.amount);
    const totalAmount = body.amount + fee;

    console.log('✅ [ADMIN API] Fee calculated successfully');
    console.log('📄 Fee:', fee, 'Total:', totalAmount);

    return {
      success: true,
      amount: body.amount,
      fee,
      totalAmount,
      feeType: type,
    };
  }

  // ==================== KYC MANAGEMENT ENDPOINTS ====================

  @Get('kyc/submissions')
  @ApiOperation({
    summary: 'Get all KYC submissions',
    description:
      'Retrieve all KYC submissions with their current status (pending, verified, rejected)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC submissions retrieved successfully',
    type: GetKycSubmissionsResponse,
  })
  async getKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log(
      '📋 [ADMIN API] GET /admin/kyc/submissions - Retrieving all KYC submissions',
    );

    const result = await this.adminService.getKycSubmissions();

    console.log('✅ [ADMIN API] KYC submissions retrieved successfully');
    console.log(
      '📊 [ADMIN API] Total:',
      result.total,
      'Pending:',
      result.pending,
      'Verified:',
      result.verified,
      'Rejected:',
      result.rejected,
    );

    return result;
  }

  @Get('kyc/submissions/pending')
  @ApiOperation({
    summary: 'Get pending KYC submissions',
    description: 'Retrieve only KYC submissions that are pending admin review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending KYC submissions retrieved successfully',
    type: GetKycSubmissionsResponse,
  })
  async getPendingKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log(
      '⏳ [ADMIN API] GET /admin/kyc/submissions/pending - Retrieving pending KYC submissions',
    );

    const result = await this.adminService.getPendingKycSubmissions();

    console.log(
      '✅ [ADMIN API] Pending KYC submissions retrieved successfully',
    );
    console.log('📊 [ADMIN API] Total pending:', result.total);

    return result;
  }

  @Get('kyc/submissions/:userId')
  @ApiOperation({
    summary: 'Get KYC submission details',
    description:
      "Retrieve detailed information about a specific user's KYC submission including uploaded images",
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get KYC submission for',
    example: 'cuid123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC submission details retrieved successfully',
    type: KycSubmissionDetailResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getKycSubmissionDetails(
    @Param('userId') userId: string,
  ): Promise<KycSubmissionDetailResponse> {
    console.log(
      '🔍 [ADMIN API] GET /admin/kyc/submissions/:userId - Retrieving KYC submission details',
    );
    console.log('👤 User ID:', userId);

    const result = await this.adminService.getKycSubmissionDetails(userId);

    console.log('✅ [ADMIN API] KYC submission details retrieved successfully');
    console.log('📄 Status:', result.submission.kycStatus);

    return result;
  }

  @Put('kyc/submissions/:userId/review')
  @ApiOperation({
    summary: 'Review KYC submission',
    description:
      "Approve or reject a user's KYC submission. When approved, a wallet is automatically created for the user.",
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to review KYC submission for',
    example: 'cuid123',
  })
  @ApiBody({ type: KycReviewDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC submission reviewed successfully',
    type: KycReviewResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid review data or submission cannot be reviewed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async reviewKycSubmission(
    @Param('userId') userId: string,
    @Body(ValidationPipe) reviewDto: KycReviewDto,
  ): Promise<KycReviewResponse> {
    console.log(
      '⚖️ [ADMIN API] PUT /admin/kyc/submissions/:userId/review - Reviewing KYC submission',
    );
    console.log('👤 User ID:', userId);
    console.log('📝 Decision:', reviewDto.decision);
    console.log('💬 Comment:', reviewDto.comment);

    const result = await this.adminService.reviewKycSubmission(
      userId,
      reviewDto,
    );

    console.log('✅ [ADMIN API] KYC submission reviewed successfully');
    console.log('📄 New Status:', result.newStatus);
    console.log('💳 Wallet Created:', result.walletCreated);

    return result;
  }

  // ==================== PROVIDER MANAGEMENT ENDPOINTS ====================

  @Get('providers')
  @ApiOperation({
    summary: 'Get available wallet providers',
    description:
      'Retrieve list of all available wallet providers and their current status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available providers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        currentProvider: { type: 'string', example: 'SMEPLUG' },
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'SME Plug' },
              provider: { type: 'string', example: 'SMEPLUG' },
              isActive: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  async getAvailableProviders(): Promise<{
    success: boolean;
    currentProvider: string;
    providers: Array<{ name: string; provider: string; isActive: boolean }>;
  }> {
    console.log(
      '🏦 [ADMIN API] GET /admin/providers - Retrieving available wallet providers',
    );

    const result = await this.adminService.getAvailableProviders();

    console.log('✅ [ADMIN API] Available providers retrieved successfully');
    console.log('📄 Current Provider:', result.currentProvider);

    return result;
  }

  @Post('providers/switch')
  @ApiOperation({
    summary: 'Switch wallet provider',
    description:
      'Switch the global wallet provider. All new wallet creations will use the selected provider.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['SMEPLUG', 'POLARIS', 'BUDPAY'],
          example: 'BUDPAY',
          description: 'Provider to switch to',
        },
      },
      required: ['provider'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider switched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Wallet provider successfully switched to POLARIS',
        },
        previousProvider: { type: 'string', example: 'SMEPLUG' },
        newProvider: { type: 'string', example: 'POLARIS' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid provider or provider not available',
  })
  async switchWalletProvider(@Body() body: { provider: string }): Promise<{
    success: boolean;
    message: string;
    previousProvider: string;
    newProvider: string;
  }> {
    console.log(
      '🔄 [ADMIN API] POST /admin/providers/switch - Switching wallet provider',
    );
    console.log('🏦 New Provider:', body.provider);

    const result = await this.adminService.switchWalletProvider(body.provider);

    console.log('✅ [ADMIN API] Wallet provider switched successfully');
    console.log('📄 Response:', result);

    return result;
  }

  @Get('providers/current')
  @ApiOperation({
    summary: 'Get current active provider',
    description: 'Get the currently active wallet provider name',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current provider retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        provider: { type: 'string', example: 'SMEPLUG' },
        name: { type: 'string', example: 'SME Plug' },
      },
    },
  })
  async getCurrentProvider(): Promise<{
    success: boolean;
    provider: string;
    name: string;
  }> {
    console.log(
      '📊 [ADMIN API] GET /admin/providers/current - Getting current provider',
    );

    const result = await this.adminService.getCurrentProvider();

    console.log('✅ [ADMIN API] Current provider retrieved successfully');
    console.log('📄 Current Provider:', result.provider);

    return result;
  }

  // ==================== POLARIS API TEST ====================

  @Post('test-polaris-api')
  @ApiOperation({ summary: 'Test Polaris Bank API account creation directly' })
  async testPolarisApi(@Body() testData: any) {
    console.log('🧪 [POLARIS TEST] Testing Polaris Bank API directly');

    try {
      const result =
        await this.adminService.testPolarisAccountCreation(testData);
      return result;
    } catch (error) {
      console.error('❌ [POLARIS TEST] Error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.stack,
      };
    }
  }

  // ==================== BUDPAY API TEST ====================

  @Post('test-budpay-api')
  @ApiOperation({ summary: 'Test BudPay API wallet creation directly' })
  async testBudPayApi(@Body() testData: any) {
    console.log('🧪 [BUDPAY TEST] Testing BudPay API directly');

    try {
      const result = await this.adminService.testBudPayWalletCreation(testData);
      return result;
    } catch (error) {
      console.error('❌ [BUDPAY TEST] Error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || error.stack,
      };
    }
  }

  // ==================== TRANSFER PROVIDER MANAGEMENT ====================

  @Get('transfer-providers')
  @ApiOperation({
    summary: 'Get available transfer providers',
    description:
      'Get list of available transfer providers and current active provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer providers retrieved successfully',
  })
  async getAvailableTransferProviders(): Promise<{
    success: boolean;
    currentProvider: string;
    providers: string[];
    isAdminConfigured: boolean;
  }> {
    console.log(
      '📊 [ADMIN API] GET /admin/transfer-providers - Getting available transfer providers',
    );

    const result = await this.adminService.getAvailableTransferProviders();

    console.log('✅ [ADMIN API] Transfer providers retrieved successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Post('transfer-providers/switch')
  @ApiOperation({
    summary: 'Switch transfer provider',
    description:
      'Switch the active transfer provider for bank transfers, bank lists, and account verification',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['BUDPAY', 'SMEPLUG'],
          example: 'BUDPAY',
          description: 'Transfer provider to switch to',
        },
      },
      required: ['provider'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer provider switched successfully',
  })
  async switchTransferProvider(@Body() body: { provider: string }): Promise<{
    success: boolean;
    message: string;
    previousProvider: string;
    newProvider: string;
  }> {
    console.log(
      '🔄 [ADMIN API] POST /admin/transfer-providers/switch - Switching transfer provider',
    );
    console.log('📝 Request Data:', body);

    const result = await this.adminService.switchTransferProvider(
      body.provider,
    );

    console.log('✅ [ADMIN API] Transfer provider switched successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Get('transfer-providers/current')
  @ApiOperation({
    summary: 'Get current transfer provider',
    description: 'Get information about the currently active transfer provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current transfer provider retrieved successfully',
  })
  async getCurrentTransferProvider(): Promise<{
    success: boolean;
    provider: string;
    isAdminConfigured: boolean;
  }> {
    console.log(
      '🔍 [ADMIN API] GET /admin/transfer-providers/current - Getting current transfer provider',
    );

    const result = await this.adminService.getCurrentTransferProvider();

    console.log(
      '✅ [ADMIN API] Current transfer provider retrieved successfully',
    );
    console.log('📄 Response Data:', result);

    return result;
  }

  // ==================== TRANSFER API TESTS ====================

  @Get('test-bank-list')
  @ApiOperation({
    summary: 'Test bank list API',
    description: 'Test bank list retrieval from the active transfer provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bank list test completed',
  })
  async testBankList(): Promise<{
    success: boolean;
    provider: string;
    bankCount: number;
    banks: Array<{ bankName: string; bankCode: string }>;
  }> {
    console.log(
      '🧪 [ADMIN API] GET /admin/test-bank-list - Testing bank list API',
    );

    const result = await this.adminService.testBankList();

    console.log('✅ [ADMIN API] Bank list test completed');
    return result;
  }

  @Post('test-account-verification')
  @ApiOperation({
    summary: 'Test account verification API',
    description: 'Test account verification with the active transfer provider',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        accountNumber: {
          type: 'string',
          example: '0123456789',
          description: 'Account number to verify',
        },
        bankCode: {
          type: 'string',
          example: '058',
          description: 'Bank code for the account',
        },
      },
      required: ['accountNumber', 'bankCode'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account verification test completed',
  })
  async testAccountVerification(
    @Body() testData: { accountNumber: string; bankCode: string },
  ) {
    console.log(
      '🧪 [ADMIN API] POST /admin/test-account-verification - Testing account verification API',
    );
    console.log('📝 Request Data:', testData);

    const result = await this.adminService.testAccountVerification(testData);

    console.log('✅ [ADMIN API] Account verification test completed');
    return result;
  }

  @Post('test-bank-transfer')
  @ApiOperation({
    summary: 'Test bank transfer functionality',
    description: 'Test the bank transfer system with active transfer provider',
  })
  async testBankTransfer(@Body() transferData: any) {
    return this.adminService.testBankTransfer(transferData);
  }

  @Get('validate-wallet/:walletId')
  @ApiOperation({
    summary: 'Validate wallet balance against transaction history',
    description: 'Check if wallet balance matches the sum of all transactions',
  })
  async validateWalletBalance(@Param('walletId') walletId: string) {
    try {
      const validation =
        await this.adminService.validateWalletBalance(walletId);
      return {
        success: true,
        validation,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('reconcile-wallet/:walletId')
  @ApiOperation({
    summary: 'Reconcile wallet balance with transaction history',
    description:
      'Correct wallet balance to match transaction history if there are discrepancies',
  })
  async reconcileWalletBalance(@Param('walletId') walletId: string) {
    try {
      const reconciliation =
        await this.adminService.reconcileWalletBalance(walletId);
      return {
        success: true,
        reconciliation,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('validate-all-wallets')
  @ApiOperation({
    summary: 'Validate all wallet balances',
    description: 'Check all wallets for balance discrepancies',
  })
  async validateAllWallets() {
    try {
      const validations = await this.adminService.validateAllWallets();
      return {
        success: true,
        validations,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('reset-wallet/:walletId')
  @ApiOperation({
    summary: 'Reset wallet balance to zero (ADMIN ONLY)',
    description:
      'Reset wallet balance and clear test transactions - USE WITH EXTREME CAUTION',
  })
  async resetWalletBalance(@Param('walletId') walletId: string) {
    try {
      const result = await this.adminService.resetWalletBalance(walletId);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('reset-wallet-by-account/:accountNumber')
  async resetWalletByAccount(@Param('accountNumber') accountNumber: string) {
    return this.adminService.resetWalletByAccountNumber(accountNumber);
  }

  // ==================== FEE CONFIGURATION ENDPOINTS ====================

  @Get('fee-configurations')
  async getFeeConfigurations() {
    return this.adminService.getFeeConfigurations();
  }

  @Get('fee-configurations/:id')
  async getFeeConfiguration(@Param('id') id: string) {
    return this.adminService.getFeeConfiguration(id);
  }

  @Post('fee-configurations')
  async createFeeConfiguration(@Body() dto: CreateFeeConfigurationDto) {
    return this.adminService.createFeeConfiguration(dto);
  }

  @Put('fee-configurations/:id')
  async updateFeeConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdateFeeConfigurationDto,
  ) {
    return this.adminService.updateFeeConfiguration(id, dto);
  }

  @Delete('fee-configurations/:id')
  async deleteFeeConfiguration(@Param('id') id: string) {
    return this.adminService.deleteFeeConfiguration(id);
  }

  // ==================== FUNDING FEES ENDPOINTS ====================

  @Get('funding-fees')
  async getFundingFees() {
    const fees = await this.adminService.getFundingFees();
    return {
      success: true,
      message: 'Funding fees retrieved successfully',
      data: fees,
      providers: {
        BUDPAY: fees.find((f) => f.feeType === FeeType.FUNDING_BUDPAY) || null,
        SMEPLUG:
          fees.find((f) => f.feeType === FeeType.FUNDING_SMEPLUG) || null,
        POLARIS:
          fees.find((f) => f.feeType === FeeType.FUNDING_POLARIS) || null,
        GENERIC: fees.find((f) => f.feeType === FeeType.FUNDING) || null,
      },
    };
  }

  @Get('funding-fees/:provider')
  async getProviderFundingFee(@Param('provider') provider: string) {
    const feeConfig = await this.adminService.getProviderFundingFee(provider);
    return {
      success: true,
      message: `Funding fee for ${provider} retrieved successfully`,
      data: feeConfig,
      provider: provider.toUpperCase(),
    };
  }

  @Post('funding-fees/:provider')
  async setProviderFundingFee(
    @Param('provider') provider: string,
    @Body() dto: CreateFeeConfigurationDto,
  ) {
    const validProviders = ['BUDPAY', 'SMEPLUG', 'POLARIS'];
    const providerUpper = provider.toUpperCase();

    if (!validProviders.includes(providerUpper)) {
      throw new BadRequestException(
        `Invalid provider. Must be one of: ${validProviders.join(', ')}`,
      );
    }

    const result = await this.adminService.setProviderFundingFee(
      providerUpper,
      dto,
    );

    return {
      success: true,
      message: `Funding fee for ${providerUpper} set successfully`,
      data: result,
      provider: providerUpper,
      feeDetails: {
        fixedAmount: result.fixedAmount,
        percentage: result.percentage,
        minAmount: result.minAmount,
        maxAmount: result.maxAmount,
        isActive: result.isActive,
      },
    };
  }

  // ==================== USER MANAGEMENT ENDPOINTS ====================

  @Get('users')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve all users with pagination and filtering options',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of users to return (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of users to skip (default: 0)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by KYC status (PENDING, UNDER_REVIEW, APPROVED, REJECTED)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by email, phone, or name',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: GetUsersResponse,
  })
  async getUsers(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<GetUsersResponse> {
    console.log('👥 [ADMIN API] GET /admin/users - Retrieving users');
    console.log('📊 [ADMIN API] Query params:', { limit, offset, status, search });

    const result = await this.adminService.getUsers(
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
      status,
      search,
    );

    console.log('✅ [ADMIN API] Users retrieved successfully');
    console.log('📄 [ADMIN API] Found', result.users.length, 'users of', result.total, 'total');

    return result;
  }

  @Get('users/:userId')
  @ApiOperation({
    summary: 'Get user details',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get details for',
    example: 'cmcypf6hk00001gk3itv4ybwo',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User details retrieved successfully',
    type: GetUserDetailResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getUserDetail(@Param('userId') userId: string): Promise<GetUserDetailResponse> {
    console.log('🔍 [ADMIN API] GET /admin/users/:userId - Getting user details');
    console.log('👤 [ADMIN API] User ID:', userId);

    const result = await this.adminService.getUserDetail(userId);

    console.log('✅ [ADMIN API] User details retrieved successfully');
    console.log('📄 [ADMIN API] User:', result.user.email);

    return result;
  }

  // ==================== TRANSACTION MANAGEMENT ENDPOINTS ====================

  @Get('transactions')
  @ApiOperation({
    summary: 'Get all transactions',
    description: 'Retrieve all transactions with pagination and filtering options',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to return (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of transactions to skip (default: 0)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by transaction type (DEPOSIT, WITHDRAWAL, TRANSFER)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status (PENDING, COMPLETED, FAILED, CANCELLED)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by specific user ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter to date (ISO string)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transactions retrieved successfully',
    type: GetTransactionsResponse,
  })
  async getTransactions(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<GetTransactionsResponse> {
    console.log('💸 [ADMIN API] GET /admin/transactions - Retrieving transactions');
    console.log('📊 [ADMIN API] Query params:', { limit, offset, type, status, userId, startDate, endDate });

    const result = await this.adminService.getTransactions(
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
      type,
      status,
      userId,
      startDate,
      endDate,
    );

    console.log('✅ [ADMIN API] Transactions retrieved successfully');
    console.log('📄 [ADMIN API] Found', result.transactions.length, 'transactions of', result.total, 'total');

    return result;
  }

  @Get('transactions/:transactionId')
  @ApiOperation({
    summary: 'Get transaction details',
    description: 'Retrieve detailed information about a specific transaction',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID to get details for',
    example: 'txn123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction details retrieved successfully',
    type: GetTransactionDetailResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  async getTransactionDetail(@Param('transactionId') transactionId: string): Promise<GetTransactionDetailResponse> {
    console.log('🔍 [ADMIN API] GET /admin/transactions/:transactionId - Getting transaction details');
    console.log('💳 [ADMIN API] Transaction ID:', transactionId);

    const result = await this.adminService.getTransactionDetail(transactionId);

    console.log('✅ [ADMIN API] Transaction details retrieved successfully');
    console.log('📄 [ADMIN API] Transaction:', result.transaction.reference);

    return result;
  }

  // ==================== DASHBOARD STATS ENDPOINTS ====================

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Retrieve comprehensive statistics for the admin dashboard',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard statistics retrieved successfully',
    type: GetDashboardStatsResponse,
  })
  async getDashboardStats(): Promise<GetDashboardStatsResponse> {
    console.log('📊 [ADMIN API] GET /admin/dashboard/stats - Retrieving dashboard statistics');

    const result = await this.adminService.getDashboardStats();

    console.log('✅ [ADMIN API] Dashboard statistics retrieved successfully');
    console.log('📄 [ADMIN API] Stats:', {
      users: result.stats.users.total,
      transactions: result.stats.transactions.total,
      wallets: result.stats.wallets.total,
    });

    return result;
  }
}
