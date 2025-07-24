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
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
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
  DeleteUserDto,
  DeleteUserResponse,
  GetTransactionsResponse,
  GetTransactionDetailResponse,
  GetDashboardStatsResponse,
  FundWalletDto,
  WalletOperationResponse,
  DebitWalletDto,
  EditUserDto,
  EditUserResponse,
  CreateWalletDto,
  CreateWalletResponse,
  CreateAdminDto,
  CreateAdminResponse,
  GetAdminsResponse,
  AdminDto,
  UpdateAdminDto,
  UpdateAdminResponse,
  DeleteAdminDto,
  DeleteAdminResponse,
  GetAdminLogsResponse,
  FreezeWalletDto,
  UnfreezeWalletDto,
  WalletFreezeResponse,
  TotalWalletBalanceResponse,
  ProviderWalletDetailsResponse,
  GetProviderWalletDetailsQueryDto,
  CreateTransferFeeTierDto,
  UpdateTransferFeeTierDto,
  TransferFeeTierResponse,
  GetTransferFeeTiersResponse,
  GetAdminTransactionReportsResponseDto,
  UpdateAdminReportStatusDto,
  UpdateAdminReportStatusResponseDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Removed legacy fee system - now using simplified tiered transfer fees only

  // ==================== KYC MANAGEMENT ENDPOINTS ====================

  @Get('kyc/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({
    summary: 'Test bank transfer functionality',
    description: 'Test the bank transfer system with active transfer provider',
  })
  async testBankTransfer(@Body() transferData: any) {
    return this.adminService.testBankTransfer(transferData);
  }

  @Get('validate-wallet/:walletId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  async resetWalletByAccount(@Param('accountNumber') accountNumber: string) {
    return this.adminService.resetWalletByAccountNumber(accountNumber);
  }

  // ==================== REMOVED COMPLEX FEE ENDPOINTS ====================
  // All complex fee configuration endpoints removed
  // Only simplified transfer fee tiers remain below

  // ==================== TRANSFER FEE TIERS (UNIVERSAL) ====================

  @Get('transfer-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all transfer fee tiers',
    description: 'Retrieve all transfer fee tiers with amount-based pricing (applies to all providers)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer fee tiers retrieved successfully',
    type: GetTransferFeeTiersResponse,
  })
  async getTransferFeeTiers(): Promise<GetTransferFeeTiersResponse> {
    console.log('📊 [ADMIN API] GET /admin/transfer-fees - Retrieving transfer fee tiers');
    const result = await this.adminService.getTransferFeeTiers();
    console.log('✅ [ADMIN API] Transfer fee tiers retrieved successfully');
    console.log('📄 Response Data:', { totalTiers: result.tiers.length });
    return result;
  }

  @Post('transfer-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create transfer fee tier',
    description: 'Create a new transfer fee tier for amount-based pricing (applies to all providers)',
  })
  @ApiBody({ type: CreateTransferFeeTierDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transfer fee tier created successfully',
    type: TransferFeeTierResponse,
  })
  async createTransferFeeTier(
    @Body() dto: CreateTransferFeeTierDto,
  ): Promise<TransferFeeTierResponse> {
    console.log('➕ [ADMIN API] POST /admin/transfer-fees - Creating transfer fee tier');
    console.log('📝 Request Data:', dto);
    const result = await this.adminService.createTransferFeeTier(dto);
    console.log('✅ [ADMIN API] Transfer fee tier created successfully');
    console.log('📄 Response Data:', result);
    return result;
  }

  @Put('transfer-fees/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update transfer fee tier',
    description: 'Update an existing transfer fee tier',
  })
  @ApiParam({ name: 'id', description: 'Transfer fee tier ID' })
  @ApiBody({ type: UpdateTransferFeeTierDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer fee tier updated successfully',
    type: TransferFeeTierResponse,
  })
  async updateTransferFeeTier(
    @Param('id') id: string,
    @Body() dto: UpdateTransferFeeTierDto,
  ): Promise<TransferFeeTierResponse> {
    console.log('✏️ [ADMIN API] PUT /admin/transfer-fees/:id - Updating transfer fee tier');
    console.log('📝 Tier ID:', id, 'Data:', dto);
    const result = await this.adminService.updateTransferFeeTier(id, dto);
    console.log('✅ [ADMIN API] Transfer fee tier updated successfully');
    console.log('📄 Response Data:', result);
    return result;
  }

  @Delete('transfer-fees/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete transfer fee tier',
    description: 'Delete a transfer fee tier',
  })
  @ApiParam({ name: 'id', description: 'Transfer fee tier ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer fee tier deleted successfully',
  })
  async deleteTransferFeeTier(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    console.log('🗑️ [ADMIN API] DELETE /admin/transfer-fees/:id - Deleting transfer fee tier');
    console.log('📝 Tier ID:', id);
    await this.adminService.deleteTransferFeeTier(id);
    console.log('✅ [ADMIN API] Transfer fee tier deleted successfully');
    return {
      success: true,
      message: 'Transfer fee tier deleted successfully'
    };
  }

  @Post('transfer-fees/calculate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Calculate transfer fee for amount',
    description: 'Calculate the transfer fee based on amount and tier structure (applies to all providers)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 5000, description: 'Transfer amount' },
      },
      required: ['amount'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer fee calculated successfully',
  })
  async calculateTransferFee(
    @Body() body: { amount: number },
  ): Promise<{
    success: boolean;
    amount: number;
    fee: number;
    totalAmount: number;
    tier?: TransferFeeTierResponse;
  }> {
    console.log('🧮 [ADMIN API] POST /admin/transfer-fees/calculate - Calculating transfer fee');
    console.log('📝 Amount:', body.amount);
    const result = await this.adminService.calculateTransferFeeFromTiers(body.amount);
    console.log('✅ [ADMIN API] Transfer fee calculated successfully');
    console.log('📄 Fee:', result.fee, 'Total:', body.amount + result.fee);
    return {
      success: true,
      amount: body.amount,
      fee: result.fee,
      totalAmount: body.amount + result.fee,
      tier: result.tier,
    };
  }

  @Post('transfer-fees/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Seed default transfer fee tiers',
    description: 'Create default universal transfer fee tiers (₦10-₦9,999: ₦25, ₦10,000-₦49,999: ₦50, ₦50,000+: ₦100)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Default transfer fee tiers seeded successfully',
  })
  async seedDefaultTransferFeeTiers(): Promise<{ success: boolean; message: string; data: any[] }> {
    console.log('🌱 [ADMIN API] POST /admin/transfer-fees/seed - Seeding default transfer fee tiers');
    const result = await this.adminService.seedDefaultTransferFeeTiers();
    console.log('✅ [ADMIN API] Default transfer fee tiers seeded successfully');
    return result;
  }

  // Removed provider-specific funding fees - only universal transfer fee tiers remain

  // ==================== USER MANAGEMENT ENDPOINTS ====================

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve all users with pagination, filtering, and search capabilities',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of users to retrieve (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of users to skip for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by user status (active, inactive, verified, unverified)',
    example: 'active',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search users by email, phone, or name',
    example: 'john@example.com',
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
  @ApiOperation({
    summary: 'Get user details',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get details for',
    example: 'cuid123',
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

  @Delete('users')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user by ID or email. This will also delete associated wallet, transactions, and other related data.',
  })
  @ApiBody({
    type: DeleteUserDto,
    description: 'Provide either userId or email to delete the user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
    type: DeleteUserResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request - must provide either userId or email',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async deleteUser(@Body(ValidationPipe) deleteUserDto: DeleteUserDto): Promise<DeleteUserResponse> {
    console.log('🗑️ [ADMIN API] DELETE /admin/users - Deleting user');
    console.log('📝 [ADMIN API] Delete criteria:', deleteUserDto);

    if (!deleteUserDto.userId && !deleteUserDto.email) {
      throw new BadRequestException('Either userId or email must be provided');
    }

    const result = await this.adminService.deleteUser(deleteUserDto);

    console.log('✅ [ADMIN API] User deleted successfully');
    console.log('📄 [ADMIN API] Deleted user:', result.deletedUserEmail);

    return result;
  }

  // ==================== TRANSACTION MANAGEMENT ENDPOINTS ====================

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN, UserRole.CUSTOMER_REP)
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

  @Post('fund-wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Fund user wallet',
    description: 'Admin endpoint to fund a user wallet by userId, email, or account number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet funded successfully',
    type: WalletOperationResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or insufficient data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or wallet not found',
  })
  async fundWallet(
    @Body(ValidationPipe) dto: FundWalletDto,
  ): Promise<WalletOperationResponse> {
    console.log('💰 [ADMIN API] POST /admin/fund-wallet - Fund wallet request');
    console.log('📝 Request data:', {
      userId: dto.userId,
      email: dto.email,
      accountNumber: dto.accountNumber,
      amount: dto.amount,
      description: dto.description,
    });

    const result = await this.adminService.fundWallet(dto);

    console.log('✅ [ADMIN API] Wallet funded successfully');
    console.log('📄 Response data:', {
      success: result.success,
      userId: result.userId,
      amount: result.amount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      reference: result.reference,
    });

    return result;
  }

  @Post('debit-wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Debit user wallet',
    description: 'Admin endpoint to debit from a user wallet by userId, email, or account number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet debited successfully',
    type: WalletOperationResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request, insufficient balance, or insufficient data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or wallet not found',
  })
  async debitWallet(
    @Body(ValidationPipe) dto: DebitWalletDto,
  ): Promise<WalletOperationResponse> {
    console.log('💸 [ADMIN API] POST /admin/debit-wallet - Debit wallet request');
    console.log('📝 Request data:', {
      userId: dto.userId,
      email: dto.email,
      accountNumber: dto.accountNumber,
      amount: dto.amount,
      description: dto.description,
    });

    const result = await this.adminService.debitWallet(dto);

    console.log('✅ [ADMIN API] Wallet debited successfully');
    console.log('📄 Response data:', {
      success: result.success,
      userId: result.userId,
      amount: result.amount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      reference: result.reference,
    });

    return result;
  }

  @Put('edit-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Edit user information',
    description: 'Admin endpoint to edit any user field including email, phone, names, KYC status, etc.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: EditUserResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or no fields to update',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async editUser(
    @Body(ValidationPipe) dto: EditUserDto,
  ): Promise<EditUserResponse> {
    console.log('✏️ [ADMIN API] PUT /admin/edit-user - Edit user request');
    console.log('📝 Request data:', {
      userId: dto.userId,
      updatingFields: Object.keys(dto).filter(key => key !== 'userId' && dto[key] !== undefined),
    });

    const result = await this.adminService.editUser(dto);

    console.log('✅ [ADMIN API] User updated successfully');
    console.log('📄 Response data:', {
      success: result.success,
      userId: result.userId,
      updatedFields: result.updatedFields,
    });

    return result;
  }

  @Post('create-wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create wallet for user',
    description: 'Admin endpoint to create a wallet for a user with specific provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet created successfully',
    type: CreateWalletResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or user already has wallet',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async createWallet(
    @Body(ValidationPipe) dto: CreateWalletDto,
  ): Promise<CreateWalletResponse> {
    console.log('🏦 [ADMIN API] POST /admin/create-wallet - Create wallet request');
    console.log('📝 Request data:', {
      userId: dto.userId,
      email: dto.email,
      provider: dto.provider,
      hasPin: !!dto.pin,
    });

    const result = await this.adminService.createWallet(dto);

    console.log('✅ [ADMIN API] Wallet created successfully');
    console.log('📄 Response data:', {
      success: result.success,
      userId: result.userId,
      walletId: result.walletId,
      virtualAccountNumber: result.virtualAccountNumber,
      provider: result.provider,
    });

    return result;
  }

  // ==================== ADMIN MANAGEMENT ENDPOINTS ====================

  @Post('create-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Promote existing user to admin',
    description: 'SUDO_ADMIN only: Promote an existing user to admin role with specific permissions',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User promoted to admin successfully',
    type: CreateAdminResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid admin data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Requires SUDO_ADMIN role',
  })
  async createAdmin(
    @Request() req,
    @Body(ValidationPipe) createAdminDto: CreateAdminDto,
  ): Promise<CreateAdminResponse> {
    console.log('👑 [ADMIN API] POST /admin/create-admin - Promoting user to admin');
    console.log('📝 Request Data:', {
      email: createAdminDto.email,
      role: createAdminDto.role,
      permissions: createAdminDto.customPermissions,
    });

    const result = await this.adminService.createAdmin(
      createAdminDto,
      req.user.id,
      req.user.email,
      req.ip,
      req.headers['user-agent']
    );

    console.log('✅ [ADMIN API] User promoted to admin successfully');
    console.log('📄 Response Data:', {
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
      permissions: result.permissions,
    });

    return result;
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all admin users',
    description: 'Retrieve all admin users with pagination and filtering',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of admins to return (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of admins to skip (default: 0)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by admin role',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by email, name, or phone',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admins retrieved successfully',
    type: GetAdminsResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Requires ADMIN or SUDO_ADMIN role',
  })
  async getAdmins(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ): Promise<GetAdminsResponse> {
    console.log('👥 [ADMIN API] GET /admin/admins - Retrieving admins');
    console.log('📊 Query params:', { limit, offset, role, search });

    const result = await this.adminService.getAdmins(
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
      role,
      search,
    );

    console.log('✅ [ADMIN API] Admins retrieved successfully');
    console.log('📄 Found', result.admins.length, 'admins of', result.total, 'total');

    return result;
  }

  @Get('admins/:adminId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin details',
    description: 'Retrieve detailed information about a specific admin',
  })
  @ApiParam({
    name: 'adminId',
    description: 'Admin ID to get details for',
    example: 'admin123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin details retrieved successfully',
    type: AdminDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Requires ADMIN or SUDO_ADMIN role',
  })
  async getAdminDetail(@Param('adminId') adminId: string): Promise<AdminDto> {
    console.log('🔍 [ADMIN API] GET /admin/admins/:adminId - Getting admin details');
    console.log('👤 Admin ID:', adminId);

    const result = await this.adminService.getAdminDetail(adminId);

    console.log('✅ [ADMIN API] Admin details retrieved successfully');
    console.log('📄 Admin:', result.email);

    return result;
  }

  @Put('admins/:adminId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update admin user',
    description: 'SUDO_ADMIN only: Update admin information, role, and permissions',
  })
  @ApiParam({
    name: 'adminId',
    description: 'Admin ID to update',
    example: 'admin123',
  })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin updated successfully',
    type: UpdateAdminResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Requires SUDO_ADMIN role',
  })
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body(ValidationPipe) updateAdminDto: UpdateAdminDto,
  ): Promise<UpdateAdminResponse> {
    console.log('✏️ [ADMIN API] PUT /admin/admins/:adminId - Updating admin');
    console.log('👤 Admin ID:', adminId);
    console.log('📝 Update Data:', updateAdminDto);

    const result = await this.adminService.updateAdmin(adminId, updateAdminDto);

    console.log('✅ [ADMIN API] Admin updated successfully');
    console.log('📄 Updated Admin:', result.admin.email);

    return result;
  }

  @Delete('admins/:adminId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete admin user',
    description: 'SUDO_ADMIN only: Delete an admin user (soft delete)',
  })
  @ApiParam({
    name: 'adminId',
    description: 'Admin ID to delete',
    example: 'admin123',
  })
  @ApiBody({ type: DeleteAdminDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin deleted successfully',
    type: DeleteAdminResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid deletion data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Requires SUDO_ADMIN role',
  })
  async deleteAdmin(
    @Param('adminId') adminId: string,
    @Body(ValidationPipe) deleteAdminDto: DeleteAdminDto,
  ): Promise<DeleteAdminResponse> {
    console.log('🗑️ [ADMIN API] DELETE /admin/admins/:adminId - Deleting admin');
    console.log('👤 Admin ID:', adminId);
    console.log('📝 Reason:', deleteAdminDto.reason);

    const result = await this.adminService.deleteAdmin(adminId, deleteAdminDto);

    console.log('✅ [ADMIN API] Admin deleted successfully');
    console.log('📄 Deleted Admin ID:', result.adminId);

    return result;
  }

  @Get('roles/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get role permissions mapping',
    description: 'SUDO_ADMIN only: Get the default permissions for each role',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Role permissions retrieved successfully' },
        roles: {
          type: 'object',
          properties: {
            ADMIN: {
              type: 'array',
              items: { type: 'string' },
              example: ['VIEW_USERS', 'VIEW_TRANSACTIONS', 'VIEW_KYC', 'APPROVE_KYC'],
            },
            CUSTOMER_REP: {
              type: 'array',
              items: { type: 'string' },
              example: ['VIEW_USERS', 'VIEW_TRANSACTIONS', 'VIEW_KYC'],
            },
            DEVELOPER: {
              type: 'array',
              items: { type: 'string' },
              example: ['VIEW_LOGS', 'TEST_PROVIDERS', 'VIEW_DASHBOARD'],
            },
            SUDO_ADMIN: {
              type: 'array',
              items: { type: 'string' },
              example: ['*'],
            },
          },
        },
      },
    },
  })
  async getRolePermissions() {
    console.log('📋 [ADMIN API] GET /admin/roles/permissions - Getting role permissions');

    const result = await this.adminService.getRolePermissions();

    console.log('✅ [ADMIN API] Role permissions retrieved successfully');

    return result;
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get admin action logs',
    description: 'Retrieve logs of all admin actions with filtering and pagination',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    description: 'Filter by action type (e.g., CREATE_ADMIN, UPDATE_ADMIN, DELETE_ADMIN)',
  })
  @ApiQuery({
    name: 'adminEmail',
    required: false,
    type: String,
    description: 'Filter by admin email',
  })
  @ApiQuery({
    name: 'targetEmail',
    required: false,
    type: String,
    description: 'Filter by target user email',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter logs from this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter logs until this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of logs to return (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of logs to skip (default: 0)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin logs retrieved successfully',
    type: GetAdminLogsResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Requires ADMIN or SUDO_ADMIN role',
  })
  async getAdminLogs(
    @Query('action') action?: string,
    @Query('adminEmail') adminEmail?: string,
    @Query('targetEmail') targetEmail?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<GetAdminLogsResponse> {
    console.log('📋 [ADMIN API] GET /admin/logs - Retrieving admin logs');
    console.log('📊 Query params:', { 
      action, adminEmail, targetEmail, startDate, endDate, limit, offset 
    });

    const result = await this.adminService.getAdminLogs(
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
      action,
      adminEmail,
      targetEmail,
      startDate,
      endDate,
    );

    console.log('✅ [ADMIN API] Admin logs retrieved successfully');
    console.log('📄 Found', result.logs.length, 'logs of', result.total, 'total');

    return result;
  }

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get wallet balance (Admin only)',
    description: 'Get wallet balance by user ID, email, or account number',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID to get wallet balance for',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'User email to get wallet balance for',
  })
  @ApiQuery({
    name: 'accountNumber',
    required: false,
    type: String,
    description: 'Account number to get wallet balance for',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        userId: { type: 'string', example: 'cmd123' },
        userEmail: { type: 'string', example: 'user@example.com' },
        balance: { type: 'number', example: 5000.0 },
        currency: { type: 'string', example: 'NGN' },
        formattedBalance: { type: 'string', example: '₦5,000.00' },
        accountNumber: { type: 'string', example: '1234567890' },
        accountName: { type: 'string', example: 'John Doe' },
        bankName: { type: 'string', example: 'Wema Bank' },
        provider: { type: 'string', example: 'BUDPAY' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Must provide userId, email, or accountNumber',
  })
  @ApiResponse({
    status: 404,
    description: 'User or wallet not found',
  })
  async getWalletBalance(
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Query('accountNumber') accountNumber?: string,
  ) {
    console.log('💰 [ADMIN API] GET /admin/wallet/balance - Request received');
    console.log('🔍 [ADMIN API] Query params:', { userId, email, accountNumber });

    if (!userId && !email && !accountNumber) {
      throw new BadRequestException('Must provide userId, email, or accountNumber');
    }

    const result = await this.adminService.getWalletBalance({
      userId,
      email,
      accountNumber,
    });

    console.log('✅ [ADMIN API] Wallet balance retrieved successfully');
    console.log('📄 Response Data:', {
      success: result.success,
      userId: result.userId,
      balance: result.balance,
      accountNumber: result.accountNumber,
    });

    return result;
  }

  @Get('wallet/total-balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get total wallet balance across all users',
    description: 'Retrieve the sum of all wallet balances and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Total wallet balance retrieved successfully',
    type: TotalWalletBalanceResponse,
  })
  async getTotalWalletBalance(): Promise<TotalWalletBalanceResponse> {
    console.log('💰 [ADMIN API] GET /admin/wallet/total-balance - Request received');

    const result = await this.adminService.getTotalWalletBalance();

    console.log('✅ [ADMIN API] Total wallet balance retrieved successfully');
    console.log('📄 Response Data:', {
      totalBalance: result.totalBalance,
      totalWallets: result.totalWallets,
      activeWallets: result.activeWallets,
      frozenWallets: result.frozenWallets,
    });

    return result;
  }

  @Post('wallet/freeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Freeze a user wallet',
    description: 'Freeze a wallet to prevent transactions. Must provide userId, email, or accountNumber',
  })
  @ApiBody({ type: FreezeWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet frozen successfully',
    type: WalletFreezeResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Must provide userId, email, or accountNumber',
  })
  @ApiResponse({
    status: 404,
    description: 'User or wallet not found',
  })
  async freezeWallet(
    @Request() req,
    @Body(ValidationPipe) freezeWalletDto: FreezeWalletDto,
  ): Promise<WalletFreezeResponse> {
    console.log('❄️ [ADMIN API] POST /admin/wallet/freeze - Request received');
    console.log('👤 [ADMIN API] Admin ID:', req.user.id);
    console.log('📝 [ADMIN API] Request Data:', freezeWalletDto);

    if (!freezeWalletDto.userId && !freezeWalletDto.email && !freezeWalletDto.accountNumber) {
      throw new BadRequestException('Must provide userId, email, or accountNumber');
    }

    const result = await this.adminService.freezeWallet(
      freezeWalletDto,
      req.user.id,
      req.user.email,
    );

    console.log('✅ [ADMIN API] Wallet frozen successfully');
    console.log('📄 Response Data:', {
      success: result.success,
      userId: result.userId,
      isFrozen: result.isFrozen,
      reason: result.reason,
    });

    return result;
  }

  @Post('wallet/unfreeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUDO_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unfreeze a user wallet',
    description: 'Unfreeze a wallet to allow transactions again. Must provide userId, email, or accountNumber',
  })
  @ApiBody({ type: UnfreezeWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet unfrozen successfully',
    type: WalletFreezeResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Must provide userId, email, or accountNumber',
  })
  @ApiResponse({
    status: 404,
    description: 'User or wallet not found',
  })
  async unfreezeWallet(
    @Request() req,
    @Body(ValidationPipe) unfreezeWalletDto: UnfreezeWalletDto,
  ): Promise<WalletFreezeResponse> {
    console.log('🔥 [ADMIN API] POST /admin/wallet/unfreeze - Request received');
    console.log('👤 [ADMIN API] Admin ID:', req.user.id);
    console.log('📝 [ADMIN API] Request Data:', unfreezeWalletDto);

    if (!unfreezeWalletDto.userId && !unfreezeWalletDto.email && !unfreezeWalletDto.accountNumber) {
      throw new BadRequestException('Must provide userId, email, or accountNumber');
    }

    const result = await this.adminService.unfreezeWallet(
      unfreezeWalletDto,
      req.user.id,
      req.user.email,
    );

    console.log('✅ [ADMIN API] Wallet unfrozen successfully');
    console.log('📄 Response Data:', {
      success: result.success,
      userId: result.userId,
      isFrozen: result.isFrozen,
      reason: result.reason,
    });

    return result;
  }

  @Get('wallet/provider-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get provider wallet details',
    description: 'Retrieve detailed information about the current wallet provider account including balance and status',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    type: String,
    description: 'Provider to get wallet details for (optional - uses current provider if not specified)',
    example: 'NYRA',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider wallet details retrieved successfully',
    type: ProviderWalletDetailsResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider wallet not found',
  })
  async getProviderWalletDetails(
    @Query(ValidationPipe) query: GetProviderWalletDetailsQueryDto,
  ): Promise<ProviderWalletDetailsResponse> {
    console.log('🏦 [ADMIN API] GET /admin/wallet/provider-details - Retrieving provider wallet details');
    console.log('📊 Query params:', query);

    const result = await this.adminService.getProviderWalletDetails(query.provider);

    console.log('✅ [ADMIN API] Provider wallet details retrieved successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Get('wallet/nyra-business-balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get NYRA Business Wallet Balance',
    description: 'Retrieve the current balance of the NYRA business wallet',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NYRA business wallet balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            businessId: { type: 'string' },
            businessName: { type: 'string' },
            balance: { type: 'number' },
            formattedBalance: { type: 'string' },
            currency: { type: 'string' },
            lastUpdated: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions',
  })
  async getNyraBusinessWalletBalance() {
    console.log('🏦 [ADMIN API] GET /admin/wallet/nyra-business-balance - Retrieving NYRA business wallet balance');

    const result = await this.adminService.getNyraBusinessWalletBalance();

    console.log('✅ [ADMIN API] NYRA business wallet balance retrieved successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Get('webhooks/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get webhook logs',
    description: 'Retrieve webhook processing logs with filtering options',
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Filter by provider' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (processed, pending, error)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of logs to skip' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook logs retrieved successfully',
  })
  async getWebhookLogs(
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    console.log('📋 [ADMIN API] GET /admin/webhooks/logs - Retrieving webhook logs');
    console.log('📊 Query params:', { provider, status, limit, offset });

    const result = await this.adminService.getWebhookLogs({
      provider,
      status,
      limit: limit || 50,
      offset: offset || 0,
    });

    console.log('✅ [ADMIN API] Webhook logs retrieved successfully');
    console.log('📄 Response Data:', {
      total: result.total,
      processed: result.processed,
      pending: result.pending,
      errors: result.errors,
    });

    return result;
  }

  // ==================== NYRA MIGRATION ENDPOINTS ====================

  @Post('migrate-to-nyra')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUDO_ADMIN)
  @ApiOperation({
    summary: 'Migrate existing users to NYRA accounts',
    description: 'Creates NYRA accounts for existing users while keeping their original accounts as backup funding sources. Supports dry-run mode for testing.',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Run in dry-run mode without making actual changes',
    example: true,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Migrate specific user by ID (optional)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit number of users to process (default: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Migration completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Migration completed: 15/20 users migrated successfully' },
        totalUsers: { type: 'number', example: 20 },
        processedUsers: { type: 'number', example: 20 },
        successfulMigrations: { type: 'number', example: 15 },
        failedMigrations: { type: 'number', example: 5 },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              email: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              email: { type: 'string' },
              status: { type: 'string', enum: ['success', 'failed', 'skipped'] },
              oldProvider: { type: 'string' },
              oldAccountNumber: { type: 'string' },
              nyraAccountNumber: { type: 'string' },
              nyraAccountName: { type: 'string' },
              nyraBankName: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Migration failed',
  })
  async migrateUsersToNyra(
    @Query('dryRun') dryRun?: boolean,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
  ) {
    console.log('🔄 [ADMIN API] POST /admin/migrate-to-nyra - Request received');
    console.log('⚙️ [ADMIN API] Options:', { dryRun, userId, limit });

    const result = await this.adminService.migrateUsersToNyra({
      dryRun: dryRun === true || (dryRun as any) === 'true',
      userId,
      limit: limit ? Number(limit) : undefined,
    });

    console.log('✅ [ADMIN API] Migration completed');
    console.log('📄 [ADMIN API] Summary:', {
      success: result.success,
      total: result.totalUsers,
      successful: result.successfulMigrations,
      failed: result.failedMigrations,
    });

    return result;
  }

  // ==================== TRANSACTION REPORTS ENDPOINTS ====================

  @Get('transaction-reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUDO_ADMIN, UserRole.CUSTOMER_REP)
  @ApiOperation({ summary: 'Get all transaction reports' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of reports to return', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of reports to skip', type: Number })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by report status', type: String })
  @ApiResponse({
    status: 200,
    description: 'Transaction reports retrieved successfully',
    type: GetAdminTransactionReportsResponseDto,
  })
  async getTransactionReports(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ): Promise<GetAdminTransactionReportsResponseDto> {
    console.log('📋 [ADMIN API] GET /admin/transaction-reports - Get transaction reports');
    
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.adminService.getTransactionReports(limitNum, offsetNum, status);
    console.log('✅ [ADMIN API] Transaction reports retrieved successfully');
    return result;
  }

  @Put('transaction-reports/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUDO_ADMIN, UserRole.CUSTOMER_REP)
  @ApiOperation({ summary: 'Update transaction report status' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report status updated successfully',
    type: UpdateAdminReportStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async updateTransactionReportStatus(
    @Request() req,
    @Param('id') reportId: string,
    @Body() updateDto: UpdateAdminReportStatusDto,
  ): Promise<UpdateAdminReportStatusResponseDto> {
    console.log('🔄 [ADMIN API] PUT /admin/transaction-reports/:id/status - Update report status');
    console.log('🆔 Admin ID:', req.user.id);
    console.log('📋 Report ID:', reportId);

    const result = await this.adminService.updateTransactionReportStatus(reportId, req.user.id, updateDto);
    console.log('✅ [ADMIN API] Report status updated successfully');
    return result;
  }

  // ==================== RESET AND MAINTENANCE ENDPOINTS ====================
}
