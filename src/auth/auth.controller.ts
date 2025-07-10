import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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
    summary: 'Register new account',
    description:
      'Step 1: Create new account with email, Nigerian phone number (+234XXXXXXXXXX), gender, date of birth, and 6-digit numeric passcode. SMS OTP will be sent for verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful, SMS OTP sent',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Account with email or phone already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid registration data',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    console.log('📝 [AUTH API] POST /auth/register - New registration');
    console.log('📋 Request Data:', {
      email: registerDto.email,
      phone: registerDto.phone,
      gender: registerDto.gender,
      dateOfBirth: registerDto.dateOfBirth,
    });

    const result = await this.authService.register(registerDto);

    console.log('✅ [AUTH API] Registration successful');
    console.log('📄 Response Data:', result);

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
    summary: 'Verify SMS OTP',
    description:
      'Step 3: Verify the 6-digit OTP code sent via SMS to complete account verification and automatically login',
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
    console.log('📱 Phone:', verifyOtpDto.phone);
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
    summary: 'Resend SMS OTP',
    description:
      'Resend OTP code via SMS if the previous one expired or was not received',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS OTP resent successfully',
    type: OtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Account already verified or other error',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<OtpResponseDto> {
    console.log('🔄 [AUTH API] POST /auth/resend-otp - Resending OTP');
    console.log('📱 Phone:', resendOtpDto.phone);

    const result = await this.authService.resendOtp(resendOtpDto);

    console.log('✅ [AUTH API] OTP resent successfully');
    console.log('📄 Response Data:', result);

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
}
