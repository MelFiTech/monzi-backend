import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
  Put,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RegisterResponseDto,
  OtpResponseDto,
  AuthResponseDto,
  UserProfileDto,
  OtpRequestResponseDto,
  RequestPinResetOtpDto,
  SecurityOperationResponseDto,
  ChangeTransactionPinDto,
  ChangePasscodeDto,
  ResetTransactionPinDto,
  ResetPasscodeDto,
  RequestAccountDeletionDto,
  ConfirmAccountDeletionDto,
  SignOutDto,
  SignOutResponseDto,
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
  TransactionDetailResponseDto,
  UpdateDeviceTokenOnLoginDto,
  DeviceTokenUpdateResponseDto,
  ReportTransactionDto,
  ReportTransactionResponseDto,
  GetTransactionReportsResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register new user account',
    description:
      'Step 1: Register a new user account. This will create the user and send a 6-digit OTP to their email for verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, Email OTP sent',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Registration failed - validation errors or user already exists',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    console.log('🔍 [AUTH API] POST /auth/register - New registration');
    console.log('📧 Email:', registerDto.email);
    console.log('📱 Phone:', registerDto.phone);
    console.log('👤 Gender:', registerDto.gender);
    console.log('🎂 DOB:', registerDto.dateOfBirth);

    const result = await this.authService.register(registerDto);

    console.log('✅ [AUTH API] Registration successful');
    console.log('📄 Response Data:', {
      success: result.success,
      message: result.message,
      email: result.email,
      otpExpiresAt: result.otpExpiresAt,
    });

    return result;
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login existing user',
    description:
      'Step 2: Login with email and 6-digit passcode for verified users',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account not verified',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    console.log('🔐 [AUTH API] POST /auth/login - Login attempt');
    console.log('📧 Email:', loginDto.email);

    const result = await this.authService.login(loginDto);

    console.log('✅ [AUTH API] Login successful');
    console.log('📄 Response Data:', {
      access_token: '***',
      user: result.user,
    });

    return result;
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify Email OTP',
    description:
      'Step 3: Verify the 6-digit OTP code sent via email to complete account verification and automatically login',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, user logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<AuthResponseDto> {
    console.log('🔍 [AUTH API] POST /auth/verify-otp - OTP verification');
    console.log('📧 Email:', verifyOtpDto.email);
    console.log('🔑 OTP:', verifyOtpDto.otpCode);

    const result = await this.authService.verifyOtp(verifyOtpDto);

    console.log('✅ [AUTH API] OTP verified successfully');
    console.log('📄 Response Data:', {
      access_token: '***',
      user: result.user,
    });

    return result;
  }

  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend Email OTP',
    description:
      "Resend the 6-digit OTP code to the user's email if they didn't receive it or if it expired",
  })
  @ApiResponse({
    status: 200,
    description: 'Email OTP resent successfully',
    type: OtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot resend OTP - user already verified or other error',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<OtpResponseDto> {
    console.log('🔍 [AUTH API] POST /auth/resend-otp - Resend OTP');
    console.log('📧 Email:', resendOtpDto.email);

    const result = await this.authService.resendOtp(resendOtpDto);

    console.log('✅ [AUTH API] OTP resent successfully');
    console.log('📄 Response Data:', {
      success: result.success,
      message: result.message,
      expiresAt: result.expiresAt,
    });

    return result;
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refresh the current access token to get a new one with extended validity',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    console.log('🔄 [AUTH API] POST /auth/refresh - Token refresh request');

    const result = await this.authService.refreshToken(refreshTokenDto.access_token);

    console.log('✅ [AUTH API] Token refreshed successfully');
    console.log('📄 Response Data:', {
      success: result.success,
      message: result.message,
      access_token: '***',
      expiresAt: result.expiresAt,
      user: result.user,
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get the current authenticated user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(@Request() req): Promise<UserProfileDto> {
    console.log('👤 [AUTH API] GET /auth/profile - Profile request');
    console.log('🆔 User ID:', req.user.id);

    const result = await this.authService.getProfile(req.user.id);

    console.log('✅ [AUTH API] Profile retrieved successfully');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user transactions',
    description: 'Get detailed transaction history for the authenticated user',
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
    description:
      'Filter by transaction type (TRANSFER, PAYMENT, WITHDRAWAL, DEPOSIT)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description:
      'Filter by transaction status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)',
  })
  @ApiResponse({
    status: 200,
    description: 'User transactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'txn_123' },
              amount: { type: 'number', example: 5000.0 },
              currency: { type: 'string', example: 'NGN' },
              type: { type: 'string', example: 'TRANSFER' },
              status: { type: 'string', example: 'COMPLETED' },
              reference: { type: 'string', example: 'TXN_1234567890' },
              description: { type: 'string', example: 'Transfer to John Doe' },
              metadata: { type: 'object', example: {} },
              createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
              updatedAt: { type: 'string', example: '2024-01-15T10:32:00Z' },
              fromAccount: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'acc_123' },
                  accountNumber: { type: 'string', example: '9038123456' },
                  bankName: { type: 'string', example: 'First Bank' },
                  bankCode: { type: 'string', example: '000016' },
                  accountName: { type: 'string', example: 'John Doe' },
                },
              },
              toAccount: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'acc_456' },
                  accountNumber: { type: 'string', example: '3089415578' },
                  bankName: { type: 'string', example: 'GTBank' },
                  bankCode: { type: 'string', example: '000013' },
                  accountName: { type: 'string', example: 'Jane Smith' },
                },
              },
            },
          },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        stats: {
          type: 'object',
          properties: {
            totalAmount: { type: 'number', example: 250000.0 },
            totalTransactions: { type: 'number', example: 150 },
            completed: { type: 'number', example: 145 },
            pending: { type: 'number', example: 3 },
            failed: { type: 'number', example: 2 },
            cancelled: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getUserTransactions(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    console.log(
      '💸 [AUTH API] GET /auth/transactions - User transactions request',
    );
    console.log('🆔 User ID:', req.user.id);
    console.log('📊 Query params:', { limit, offset, type, status });

    const result = await this.authService.getUserTransactions(
      req.user.id,
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
      type,
      status,
    );

    console.log('✅ [AUTH API] User transactions retrieved successfully');
    console.log(
      '📄 Found',
      result.transactions.length,
      'transactions of',
      result.total,
      'total',
    );

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detailed transaction information by ID',
    description:
      'Retrieve specific transaction details by its unique identifier.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction details retrieved successfully',
    type: TransactionDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction ID or transaction not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getTransactionById(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TransactionDetailResponseDto> {
    console.log(
      '🔍 [AUTH API] GET /auth/transactions/:id - Get transaction by ID',
    );
    console.log('🆔 User ID:', req.user.id);
    console.log('🔗 Transaction ID:', id);

    const result = await this.authService.getUserTransactionDetail(
      req.user.id,
      id,
    );

    console.log('✅ [AUTH API] Transaction details retrieved successfully');
    console.log('📄 Response:', result);

    return result;
  }

  @Post('transactions/:id/report')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Report a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 201,
    description: 'Transaction reported successfully',
    type: ReportTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or already reported',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async reportTransaction(
    @Request() req,
    @Param('id') transactionId: string,
    @Body() reportDto: ReportTransactionDto,
  ): Promise<ReportTransactionResponseDto> {
    console.log(
      '🚨 [AUTH API] POST /auth/transactions/:id/report - Report transaction',
    );
    console.log('🆔 User ID:', req.user.id);
    console.log('🔗 Transaction ID:', transactionId);

    const result = await this.authService.reportTransaction(
      req.user.id,
      transactionId,
      reportDto,
    );
    console.log('✅ [AUTH API] Transaction reported successfully');
    console.log('📄 Response:', result);
    return result;
  }

  @Get('transaction-reports')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user transaction reports' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of reports to return',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of reports to skip',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction reports retrieved successfully',
    type: GetTransactionReportsResponseDto,
  })
  async getUserTransactionReports(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<GetTransactionReportsResponseDto> {
    console.log(
      '📋 [AUTH API] GET /auth/transaction-reports - Get user transaction reports',
    );
    console.log('🆔 User ID:', req.user.id);

    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.authService.getUserTransactionReports(
      req.user.id,
      limitNum,
      offsetNum,
    );
    console.log('✅ [AUTH API] Transaction reports retrieved successfully');
    console.log('📄 Response:', result);
    return result;
  }

  @Post('request-reset-otp')
  @ApiOperation({
    summary: 'Request OTP for PIN/Passcode reset',
    description:
      'Request a 6-digit OTP code to reset transaction PIN or passcode',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: OtpRequestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async requestResetOtp(
    @Body() dto: RequestPinResetOtpDto,
  ): Promise<OtpRequestResponseDto> {
    console.log(
      '🔐 [AUTH API] POST /auth/request-reset-otp - Request reset OTP',
    );
    console.log('📧 Email:', dto.email);

    const result = await this.authService.requestResetOtp(dto);

    console.log('✅ [AUTH API] Reset OTP sent successfully');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-transaction-pin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change transaction PIN',
    description:
      'Change the 4-digit wallet transaction PIN. Can use current PIN or OTP for verification. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction PIN changed successfully',
    type: SecurityOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid PIN or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid current PIN or OTP',
  })
  async changeTransactionPin(
    @Request() req,
    @Body() dto: ChangeTransactionPinDto,
  ): Promise<SecurityOperationResponseDto> {
    console.log('🔐 [AUTH API] POST /auth/change-transaction-pin - Change PIN');
    console.log('🆔 User ID:', req.user.id);

    const result = await this.authService.changeTransactionPin(
      req.user.id,
      dto,
    );

    console.log('✅ [AUTH API] Transaction PIN changed successfully');

    return result;
  }

  @Post('reset-transaction-pin')
  @ApiOperation({
    summary: 'Reset transaction PIN using OTP',
    description:
      'Reset the 4-digit wallet transaction PIN using OTP. No authentication required - use this when user forgot their PIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction PIN reset successfully',
    type: SecurityOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid PIN or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OTP code',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async resetTransactionPin(
    @Body() dto: ResetTransactionPinDto,
  ): Promise<SecurityOperationResponseDto> {
    console.log('🔐 [AUTH API] POST /auth/reset-transaction-pin - Reset PIN');
    console.log('📧 Email:', dto.email);

    const result = await this.authService.resetTransactionPin(dto);

    console.log('✅ [AUTH API] Transaction PIN reset successfully');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-passcode')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change login passcode',
    description:
      'Change the 6-digit login passcode. Can use current passcode or OTP for verification. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Passcode changed successfully',
    type: SecurityOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid passcode or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid current passcode or OTP',
  })
  async changePasscode(
    @Request() req,
    @Body() dto: ChangePasscodeDto,
  ): Promise<SecurityOperationResponseDto> {
    console.log('🔐 [AUTH API] POST /auth/change-passcode - Change passcode');
    console.log('🆔 User ID:', req.user.id);

    const result = await this.authService.changePasscode(req.user.id, dto);

    console.log('✅ [AUTH API] Passcode changed successfully');

    return result;
  }

  @Post('reset-passcode')
  @ApiOperation({
    summary: 'Reset login passcode using OTP',
    description:
      'Reset the 6-digit login passcode using OTP. No authentication required - use this when user forgot their passcode.',
  })
  @ApiResponse({
    status: 200,
    description: 'Passcode reset successfully',
    type: SecurityOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid passcode or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OTP code',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async resetPasscode(
    @Body() dto: ResetPasscodeDto,
  ): Promise<SecurityOperationResponseDto> {
    console.log('🔐 [AUTH API] POST /auth/reset-passcode - Reset passcode');
    console.log('📧 Email:', dto.email);

    const result = await this.authService.resetPasscode(dto);

    console.log('✅ [AUTH API] Passcode reset successfully');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('request-account-deletion')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request account deletion',
    description:
      'Request to delete/deactivate the user account. An OTP will be sent for confirmation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deletion OTP sent successfully',
    type: OtpRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Account is already deactivated',
  })
  async requestAccountDeletion(
    @Request() req,
    @Body() dto: RequestAccountDeletionDto,
  ): Promise<OtpRequestResponseDto> {
    console.log(
      '🗑️ [AUTH API] POST /auth/request-account-deletion - Request deletion',
    );
    console.log('🆔 User ID:', req.user.id);
    console.log('📝 Reason:', dto.reason);

    const result = await this.authService.requestAccountDeletion(
      req.user.id,
      dto,
    );

    console.log('✅ [AUTH API] Account deletion OTP sent successfully');

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-account-deletion')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm account deletion',
    description:
      'Confirm account deletion with OTP code. This will deactivate the account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
    type: SecurityOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or other error',
  })
  async confirmAccountDeletion(
    @Request() req,
    @Body() dto: ConfirmAccountDeletionDto,
  ): Promise<SecurityOperationResponseDto> {
    console.log('🗑️ [AUTH API] POST /auth/confirm-account-deletion');
    console.log('👤 User ID:', req.user.id);

    const result = await this.authService.confirmAccountDeletion(
      req.user.id,
      dto,
    );

    console.log('✅ [AUTH API] Account deletion confirmed');
    console.log('📄 Response:', result);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('sign-out')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sign out user',
    description:
      'Sign out user and optionally disable transaction notifications while keeping promotional notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'User signed out successfully',
    type: SignOutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Sign out failed',
  })
  async signOut(
    @Request() req,
    @Body() dto: SignOutDto,
  ): Promise<SignOutResponseDto> {
    console.log('🚪 [AUTH API] POST /auth/sign-out');
    console.log('👤 User ID:', req.user.id);
    console.log('📱 Options:', dto);

    const result = await this.authService.signOut(req.user.id, dto);

    console.log('✅ [AUTH API] Sign out successful');
    console.log('📄 Response:', result);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Put('notification-preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update push notification preferences',
    description:
      'Update user push notification preferences for different types of notifications. These preferences only affect push notifications, not real-time websocket notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to update notification preferences',
  })
  async updateNotificationPreferences(
    @Request() req,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    console.log('🔔 [AUTH API] PUT /auth/notification-preferences');
    console.log('👤 User ID:', req.user.id);
    console.log('📱 New preferences:', dto);

    const result = await this.authService.updateNotificationPreferences(
      req.user.id,
      dto,
    );

    console.log('✅ [AUTH API] Notification preferences updated');
    console.log('📄 Response:', result);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('notification-preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get push notification preferences',
    description:
      'Get current user push notification preferences. These preferences only affect push notifications, not real-time websocket notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to get notification preferences',
  })
  async getNotificationPreferences(
    @Request() req,
  ): Promise<NotificationPreferencesResponseDto> {
    console.log('🔔 [AUTH API] GET /auth/notification-preferences');
    console.log('👤 User ID:', req.user.id);

    const result = await this.authService.getNotificationPreferences(
      req.user.id,
    );

    console.log('✅ [AUTH API] Notification preferences retrieved');
    console.log('📄 Response:', result);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-device-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update device token on login',
    description:
      'Update the device token for the authenticated user. This should be called after successful login to ensure push notifications go to the current device.',
  })
  @ApiResponse({
    status: 200,
    description: 'Device token updated successfully',
    type: DeviceTokenUpdateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to update device token',
  })
  async updateDeviceTokenOnLogin(
    @Request() req,
    @Body() dto: UpdateDeviceTokenOnLoginDto,
  ): Promise<DeviceTokenUpdateResponseDto> {
    console.log('📱 [AUTH API] POST /auth/update-device-token');
    console.log('👤 User ID:', req.user.id);
    console.log('🔑 Device token:', dto.deviceToken);

    const result = await this.authService.updateDeviceTokenOnLogin(
      req.user.id,
      dto.deviceToken,
      {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        platform: dto.platform,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        buildVersion: dto.buildVersion,
        appOwnership: dto.appOwnership,
        executionEnvironment: dto.executionEnvironment,
        isDevice: dto.isDevice,
        brand: dto.brand,
        manufacturer: dto.manufacturer,
      },
    );

    console.log('✅ [AUTH API] Device token updated');
    console.log('📄 Response:', result);

    return result;
  }
}
