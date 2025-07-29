import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthSecurityService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Request OTP for PIN/Passcode reset
  async requestResetOtp(dto: { email: string }): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    const { email } = dto;

    console.log('🔍 [AUTH] Request reset OTP:', { email });

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate OTP
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

    console.log('✅ [AUTH] Reset OTP sent successfully');

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Change Transaction PIN
  async changeTransactionPin(
    userId: string,
    dto: {
      currentPin?: string;
      newPin: string;
      otpCode?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { currentPin, newPin, otpCode } = dto;

    console.log('🔍 [AUTH] Change transaction PIN request:', { userId });

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate new PIN format
    if (!/^\d{4}$/.test(newPin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    // Check if user has wallet with PIN
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new BadRequestException('No wallet found for user');
    }

    if (!wallet.pin) {
      // First time setting PIN, only OTP is required
      if (!otpCode) {
        throw new BadRequestException(
          'OTP is required for first-time PIN setup',
        );
      }

      // Verify OTP
      await this.verifyOtp(user, otpCode);

      // Hash and save new PIN
      const hashedPin = await bcrypt.hash(newPin, 10);
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { pin: hashedPin },
      });

      console.log('✅ [AUTH] Transaction PIN set successfully');
      return {
        success: true,
        message: 'Transaction PIN set successfully',
      };
    }

    // User has existing PIN
    if (currentPin && otpCode) {
      throw new BadRequestException(
        'Provide either current PIN or OTP, not both',
      );
    }

    if (!currentPin && !otpCode) {
      throw new BadRequestException('Provide either current PIN or OTP');
    }

    if (currentPin) {
      // Verify current PIN
      const isPinValid = await bcrypt.compare(currentPin, wallet.pin);
      if (!isPinValid) {
        throw new BadRequestException('Invalid current PIN');
      }
    } else if (otpCode) {
      // Verify OTP
      await this.verifyOtp(user, otpCode);
    }

    // Hash and save new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pin: hashedPin },
    });

    console.log('✅ [AUTH] Transaction PIN changed successfully');
    return {
      success: true,
      message: 'Transaction PIN changed successfully',
    };
  }

  // Change Passcode
  async changePasscode(
    userId: string,
    dto: {
      currentPasscode?: string;
      newPasscode: string;
      otpCode?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { currentPasscode, newPasscode, otpCode } = dto;

    console.log('🔍 [AUTH] Change passcode request:', { userId });

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate new passcode format
    if (!/^\d{6}$/.test(newPasscode)) {
      throw new BadRequestException('Passcode must be exactly 6 digits');
    }

    if (currentPasscode && otpCode) {
      throw new BadRequestException(
        'Provide either current passcode or OTP, not both',
      );
    }

    if (!currentPasscode && !otpCode) {
      throw new BadRequestException('Provide either current passcode or OTP');
    }

    if (currentPasscode) {
      // Verify current passcode
      const isPasscodeValid = await bcrypt.compare(
        currentPasscode,
        user.passcode,
      );
      if (!isPasscodeValid) {
        throw new BadRequestException('Invalid current passcode');
      }
    } else if (otpCode) {
      // Verify OTP
      await this.verifyOtp(user, otpCode);
    }

    // Hash and save new passcode
    const hashedPasscode = await bcrypt.hash(newPasscode, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passcode: hashedPasscode },
    });

    console.log('✅ [AUTH] Passcode changed successfully');
    return {
      success: true,
      message: 'Passcode changed successfully',
    };
  }

  // Reset Transaction PIN
  async resetTransactionPin(dto: {
    email: string;
    otpCode: string;
    newPin: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const { email, otpCode, newPin } = dto;

    console.log('🔍 [AUTH] Reset transaction PIN request:', { email });

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate new PIN format
    if (!/^\d{4}$/.test(newPin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    // Verify OTP
    await this.verifyOtp(user, otpCode);

    // Get user's wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new BadRequestException('No wallet found for user');
    }

    // Hash and save new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pin: hashedPin },
    });

    console.log('✅ [AUTH] Transaction PIN reset successfully');
    return {
      success: true,
      message: 'Transaction PIN reset successfully',
    };
  }

  // Reset Passcode
  async resetPasscode(dto: {
    email: string;
    otpCode: string;
    newPasscode: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const { email, otpCode, newPasscode } = dto;

    console.log('🔍 [AUTH] Reset passcode request:', { email });

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate new passcode format
    if (!/^\d{6}$/.test(newPasscode)) {
      throw new BadRequestException('Passcode must be exactly 6 digits');
    }

    // Verify OTP
    await this.verifyOtp(user, otpCode);

    // Hash and save new passcode
    const hashedPasscode = await bcrypt.hash(newPasscode, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passcode: hashedPasscode },
    });

    console.log('✅ [AUTH] Passcode reset successfully');
    return {
      success: true,
      message: 'Passcode reset successfully',
    };
  }

  // Request Account Deletion
  async requestAccountDeletion(
    userId: string,
    dto: { reason: string },
  ): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    const { reason } = dto;

    console.log('🔍 [AUTH] Request account deletion:', { userId });

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with deletion OTP
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    // Send Email OTP
    await this.sendEmailOtp(user.email, otpCode, userId);

    console.log('✅ [AUTH] Account deletion OTP sent successfully');

    return {
      success: true,
      message: 'Account deletion OTP sent successfully',
      expiresAt: otpExpiresAt.toISOString(),
    };
  }

  // Confirm Account Deletion
  async confirmAccountDeletion(
    userId: string,
    dto: { otpCode: string },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { otpCode } = dto;

    console.log('🔍 [AUTH] Confirm account deletion:', { userId });

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        transactions: {
          where: {
            status: {
              in: ['PENDING', 'PROCESSING']
            }
          }
        }
      }
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify OTP
    await this.verifyOtp(user, otpCode);

    // Always perform soft delete (archive) for user self-deletion
    console.log('📦 [AUTH] Performing soft delete (archive) for user self-deletion');
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        otpCode: null,
        otpExpiresAt: null,
        metadata: {
          ...(user.metadata as any || {}),
          archivedAt: new Date().toISOString(),
          archiveReason: 'User self-deletion',
          originalEmail: user.email,
          originalPhone: user.phone,
          originalBvn: user.bvn,
          selfDeletion: true,
        },
      },
    });

    console.log('✅ [AUTH] Account archived successfully (soft delete)');
    return {
      success: true,
      message: 'Account archived successfully (soft delete)',
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

  // Verify OTP
  private async verifyOtp(user: any, otpCode: string): Promise<void> {
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (user.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }
  }
}
