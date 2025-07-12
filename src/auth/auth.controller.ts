import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
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
    description: 'Registration failed - validation errors or user already exists',
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
      'Resend the 6-digit OTP code to the user\'s email if they didn\'t receive it or if it expired',
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
  async resendOtp(
    @Body() resendOtpDto: ResendOtpDto,
  ): Promise<OtpResponseDto> {
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
    description: 'Filter by transaction type (TRANSFER, PAYMENT, WITHDRAWAL, DEPOSIT)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by transaction status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)',
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
              amount: { type: 'number', example: 5000.00 },
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
                }
              },
              toAccount: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'acc_456' },
                  accountNumber: { type: 'string', example: '3089415578' },
                  bankName: { type: 'string', example: 'GTBank' },
                  bankCode: { type: 'string', example: '000013' },
                  accountName: { type: 'string', example: 'Jane Smith' },
                }
              }
            }
          }
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        stats: {
          type: 'object',
          properties: {
            totalAmount: { type: 'number', example: 250000.00 },
            totalTransactions: { type: 'number', example: 150 },
            completed: { type: 'number', example: 145 },
            pending: { type: 'number', example: 3 },
            failed: { type: 'number', example: 2 },
            cancelled: { type: 'number', example: 0 },
          }
        }
      }
    }
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
    console.log('💸 [AUTH API] GET /auth/transactions - User transactions request');
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
    console.log('📄 Found', result.transactions.length, 'transactions of', result.total, 'total');

    return result;
  }
}
