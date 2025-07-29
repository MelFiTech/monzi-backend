import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import * as bcrypt from 'bcrypt';
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RegisterResponseDto,
  OtpResponseDto,
  AuthResponseDto,
} from '../dto/auth.dto';

@Injectable()
export class AuthRegistrationService {
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

    console.log('🔍 [AUTH] Registration request:', {
      email,
      phone,
      gender,
      dateOfBirth,
    });

    // Check if user already exists (active)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser && existingUser.isActive) {
      if (existingUser.email === email) {
        throw new BadRequestException('Account with this email already exists');
      }
      if (existingUser.phone === phone) {
        throw new BadRequestException(
          'Account with this phone number already exists',
        );
      }
    }

    // Check for archived user with same email or phone
    const archivedUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
        isActive: false,
      },
    });

    // If we found an archived user, restore that account
    if (archivedUser) {
      console.log('🔄 [AUTH] Found archived user - restoring account');
      
      // Hash the passcode
      const hashedPasscode = await bcrypt.hash(passcode, 10);

      // Generate OTP
      const otpCode = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Restore the archived user with new details
      const restoredUser = await this.prisma.user.update({
        where: { id: archivedUser.id },
        data: {
          email,
          phone,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          passcode: hashedPasscode,
          otpCode,
          otpExpiresAt,
          isActive: true,
          isVerified: false, // Require re-verification
          isOnboarded: false, // Require re-onboarding
          kycStatus: 'PENDING', // Reset KYC status
          kycVerifiedAt: null,
          bvnVerifiedAt: null,
          selfieUrl: null,
          bvnProviderResponse: null,
          metadata: {
            ...(archivedUser.metadata as any || {}),
            restoredAt: new Date().toISOString(),
            restoredFromArchive: true,
            originalArchivedAt: (archivedUser.metadata as any)?.archivedAt,
            originalArchiveReason: (archivedUser.metadata as any)?.archiveReason,
          },
        },
      });

      // Send Email OTP
      await this.sendEmailOtp(email, otpCode, restoredUser.id);

      console.log('✅ [AUTH] Account restored successfully, Email OTP sent');

      return {
        success: true,
        message: 'Account restored successfully. Email OTP sent to your email.',
        email,
        otpExpiresAt: otpExpiresAt.toISOString(),
        restored: true,
      };
    }

    // Create new user (no archived account found)
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
        restored: false,
      };
    } catch (error) {
      console.error('❌ [AUTH] Registration failed:', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  // Step 2: Login for existing users
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, passcode } = loginDto;

    console.log('🔍 [AUTH] Login request:', { email });

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
        pushTokens: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or passcode');
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Verify passcode
    const isPasscodeValid = await bcrypt.compare(passcode, user.passcode);
    if (!isPasscodeValid) {
      throw new UnauthorizedException('Invalid email or passcode');
    }

    // Check if user is active (not archived)
    if (!user.isActive) {
      const archiveReason = (user.metadata as any)?.archiveReason || 'Account deactivated';
      throw new UnauthorizedException(
        `Account is archived. Reason: ${archiveReason}. Please contact support or register again to restore your account.`,
      );
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    console.log('✅ [AUTH] User logged in successfully');

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
        role: user.role,
      },
    };
  }

  // Step 3: Verify Email OTP
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { email, otpCode } = verifyOtpDto;

    console.log('🔍 [AUTH] OTP verification request:', { email });

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
        pushTokens: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user is already verified
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check if OTP is expired
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    // Verify OTP
    if (user.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Update user as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
      include: {
        wallet: true,
        pushTokens: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Generate JWT token
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    const access_token = this.jwtService.sign(payload);

    console.log('✅ [AUTH] Email verified successfully');

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

  // Resend OTP
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponseDto> {
    const { email } = resendOtpDto;

    console.log('🔍 [AUTH] Resend OTP request:', { email });

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user is already verified
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with new OTP
    await this.prisma.user.update({
      where: { id: user.id },
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
      message: 'Email OTP sent successfully',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Generate OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send Email OTP
  private async sendEmailOtp(
    email: string,
    otpCode: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.emailService.sendOtpEmail({
        email,
        name: email.split('@')[0],
        otpCode,
        expirationMinutes: '15',
      });
      console.log('📧 [AUTH] Email OTP sent to:', email);
    } catch (error) {
      console.error('❌ [AUTH] Failed to send email OTP:', error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }
}
