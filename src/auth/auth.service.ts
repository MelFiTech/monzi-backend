import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RegisterResponseDto,
  OtpResponseDto,
  AuthResponseDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Step 1: Register new account
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const { email, phone, gender, dateOfBirth, passcode } = registerDto;

    console.log('📝 [AUTH] New registration attempt');
    console.log('📧 Email:', email);
    console.log('📱 Phone:', phone);
    console.log('👤 Gender:', gender);
    console.log('🎂 DOB:', dateOfBirth);

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      if (existingUser.phone === phone) {
        throw new ConflictException(
          'An account with this phone number already exists',
        );
      }
    }

    // Hash the passcode
    const hashedPasscode = await bcrypt.hash(passcode, 12);

    // Generate 6-digit OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    try {
      // Create user with all required information
      await this.prisma.user.create({
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

      // Send SMS OTP (for now, we'll log it - integrate SMS service in production)
      await this.sendSmsOtp(phone, otpCode);

      console.log('✅ [AUTH] User registered successfully, SMS OTP sent');

      return {
        success: true,
        message: 'Registration successful. SMS OTP sent to your phone.',
        phone,
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

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    console.log('✅ [AUTH] Login successful for:', email);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth.toISOString(),
        isVerified: user.isVerified,
        isOnboarded: user.isOnboarded,
      },
    };
  }

  // Step 3: Verify SMS OTP
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { phone, otpCode } = verifyOtpDto;

    console.log('🔍 [AUTH] OTP verification for phone:', phone);

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('User not found with this phone number');
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

    // Mark as verified and onboarded, clear OTP
    const updatedUser = await this.prisma.user.update({
      where: { phone },
      data: {
        isVerified: true,
        isOnboarded: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Generate JWT token for immediate login
    const payload = { sub: updatedUser.id, email: updatedUser.email };
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
      },
    };
  }

  // Resend SMS OTP
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponseDto> {
    const { phone } = resendOtpDto;

    console.log('🔄 [AUTH] Resending OTP to phone:', phone);

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('User not found with this phone number');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    // Generate new OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update user with new OTP
    await this.prisma.user.update({
      where: { phone },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    // Send SMS OTP
    await this.sendSmsOtp(phone, otpCode);

    console.log('✅ [AUTH] OTP resent successfully');

    return {
      success: true,
      message: 'SMS OTP resent successfully',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Helper methods
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendSmsOtp(phone: string, otpCode: string): Promise<void> {
    console.log('📱 [SMS SERVICE] Sending OTP to:', phone);
    console.log('🔑 [SMS SERVICE] OTP Code:', otpCode);

    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, or Nigerian SMS provider)
    // For now, we'll just log it for development
    console.log(`🚀 SMS OTP for ${phone}: ${otpCode}`);

    // In production, replace this with actual SMS service call:
    /*
    try {
      await smsService.send({
        to: phone,
        message: `Your Monzi verification code is: ${otpCode}. Valid for 5 minutes.`,
      });
      console.log('✅ [SMS SERVICE] OTP sent successfully');
    } catch (error) {
      console.error('❌ [SMS SERVICE] Failed to send OTP:', error);
      throw new BadRequestException('Failed to send SMS OTP');
    }
    */
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
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
        createdAt: true,
        updatedAt: true,
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
    };
  }
}
