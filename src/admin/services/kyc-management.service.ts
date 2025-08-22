import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import { EmailService } from '../../email/email.service';
import {
  GetKycSubmissionsResponse,
  KycSubmissionDetailResponse,
  KycReviewDto,
  KycReviewResponse,
} from '../dto/admin.dto';

enum KycDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

@Injectable()
export class KycManagementService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private pushNotificationsService: PushNotificationsService,
    private emailService: EmailService,
  ) {}

  async getKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log('🔍 [KYC SERVICE] Getting all KYC submissions');

    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { kycStatus: 'PENDING' },
            { kycStatus: 'UNDER_REVIEW' },
            { kycStatus: 'APPROVED' },
            { kycStatus: 'REJECTED' },
          ],
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          kycStatus: true,
          bvn: true,
          selfieUrl: true,
          createdAt: true,
          kycVerifiedAt: true,
          bvnVerifiedAt: true,
          bvnProviderResponse: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const submissions = users.map((user) => {
        // Generate full name
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || 'N/A';

        // Extract Identity Pass data
        let bvnProviderResponse = null;
        let bvnCloudinaryUrl = null;
        let bvnBase64Image = null;
        let bvnFullData = null;

        if (user.bvnProviderResponse) {
          try {
            bvnProviderResponse = typeof user.bvnProviderResponse === 'string' 
              ? JSON.parse(user.bvnProviderResponse) 
              : user.bvnProviderResponse;
          } catch (error) {
            console.error('Error parsing bvnProviderResponse:', error);
          }
        }

        if (user.metadata) {
          try {
            const metadata = typeof user.metadata === 'string' 
              ? JSON.parse(user.metadata) 
              : user.metadata;
            
            bvnCloudinaryUrl = metadata.bvnCloudinaryUrl || null;
            bvnBase64Image = metadata.bvnBase64Image || null;
            bvnFullData = metadata.bvnFullData || null;
          } catch (error) {
            console.error('Error parsing user metadata:', error);
          }
        }

        return {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          fullName: fullName,
          kycStatus: user.kycStatus,
          bvn: user.bvn,
          hasSelfie: !!user.selfieUrl,
          selfieUrl: user.selfieUrl,
          submittedAt: user.createdAt.toISOString(),
          verifiedAt: user.kycVerifiedAt?.toISOString() || null,
          bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || null,
          createdAt: user.createdAt.toISOString(),
          // Include Identity Pass data
          bvnProviderResponse,
          bvnCloudinaryUrl,
          bvnBase64Image,
          bvnFullData,
        };
      });

      const total = submissions.length;

      const stats = {
        total: submissions.length,
        pending: submissions.filter((s) => s.kycStatus === 'PENDING').length,
        verified: submissions.filter((s) => s.kycStatus === 'APPROVED').length,
        rejected: submissions.filter((s) => s.kycStatus === 'REJECTED').length,
      };

      console.log('✅ [KYC SERVICE] KYC submissions retrieved successfully');
      console.log('📊 Total submissions:', total);

      return {
        success: true,
        submissions,
        total,
        pending: stats.pending,
        verified: stats.verified,
        rejected: stats.rejected,
      };
    } catch (error) {
      console.error('❌ [KYC SERVICE] Error getting KYC submissions:', error);
      throw new BadRequestException('Failed to get KYC submissions');
    }
  }

  async getPendingKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log('⏳ [KYC SERVICE] Getting pending KYC submissions');

    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { kycStatus: 'PENDING' },
            { kycStatus: 'UNDER_REVIEW' },
          ],
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          kycStatus: true,
          bvn: true,
          selfieUrl: true,
          createdAt: true,
          kycVerifiedAt: true,
          bvnVerifiedAt: true,
          bvnProviderResponse: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const submissions = users.map((user) => {
        // Generate full name
        const fullName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || 'N/A';

        // Extract Identity Pass data
        let bvnProviderResponse = null;
        let bvnCloudinaryUrl = null;
        let bvnBase64Image = null;
        let bvnFullData = null;

        if (user.bvnProviderResponse) {
          try {
            bvnProviderResponse = typeof user.bvnProviderResponse === 'string' 
              ? JSON.parse(user.bvnProviderResponse) 
              : user.bvnProviderResponse;
          } catch (error) {
            console.error('Error parsing bvnProviderResponse:', error);
          }
        }

        if (user.metadata) {
          try {
            const metadata = typeof user.metadata === 'string' 
              ? JSON.parse(user.metadata) 
              : user.metadata;
            
            bvnCloudinaryUrl = metadata.bvnCloudinaryUrl || null;
            bvnBase64Image = metadata.bvnBase64Image || null;
            bvnFullData = metadata.bvnFullData || null;
          } catch (error) {
            console.error('Error parsing user metadata:', error);
          }
        }

        return {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          fullName: fullName,
          kycStatus: user.kycStatus,
          bvn: user.bvn,
          hasSelfie: !!user.selfieUrl,
          selfieUrl: user.selfieUrl,
          submittedAt: user.createdAt.toISOString(),
          verifiedAt: user.kycVerifiedAt?.toISOString() || null,
          bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || null,
          createdAt: user.createdAt.toISOString(),
          // Include Identity Pass data
          bvnProviderResponse,
          bvnCloudinaryUrl,
          bvnBase64Image,
          bvnFullData,
        };
      });

      const total = submissions.length;

      const stats = {
        total: submissions.length,
        pending: submissions.filter((s) => s.kycStatus === 'PENDING').length,
        verified: submissions.filter((s) => s.kycStatus === 'APPROVED').length,
        rejected: submissions.filter((s) => s.kycStatus === 'REJECTED').length,
      };

      console.log('✅ [KYC SERVICE] Pending KYC submissions retrieved successfully');
      console.log('📊 Total pending submissions:', total);

      return {
        success: true,
        submissions,
        total,
        pending: stats.pending,
        verified: stats.verified,
        rejected: stats.rejected,
      };
    } catch (error) {
      console.error('❌ [KYC SERVICE] Error getting pending KYC submissions:', error);
      throw new BadRequestException('Failed to get pending KYC submissions');
    }
  }

  async getKycSubmissionDetails(
    userId: string,
  ): Promise<KycSubmissionDetailResponse> {
    console.log(
      '🔍 [KYC SERVICE] Getting KYC submission details for user:',
      userId,
    );

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          kycStatus: true,
          bvn: true,
          selfieUrl: true,
          createdAt: true,
          kycVerifiedAt: true,
          bvnVerifiedAt: true,
          isVerified: true,
          bvnProviderResponse: true,
          metadata: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Generate full name
      const fullName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || 'N/A';

      // Generate full image URL - handle both Cloudinary and local URLs correctly
      const selfieImageUrl = user.selfieUrl 
        ? (user.selfieUrl.startsWith('http') 
            ? user.selfieUrl  // Already a full URL (Cloudinary)
            : `${process.env.BASE_URL || 'http://localhost:3000'}${user.selfieUrl}`)  // Local path
        : undefined;

      // Extract Identity Pass data from metadata
      let bvnProviderResponse = null;
      let bvnCloudinaryUrl = null;
      let bvnBase64Image = null;
      let bvnFullData = null;

      if (user.bvnProviderResponse) {
        try {
          bvnProviderResponse = typeof user.bvnProviderResponse === 'string' 
            ? JSON.parse(user.bvnProviderResponse) 
            : user.bvnProviderResponse;
        } catch (error) {
          console.error('Error parsing bvnProviderResponse:', error);
        }
      }

      if (user.metadata) {
        try {
          const metadata = typeof user.metadata === 'string' 
            ? JSON.parse(user.metadata) 
            : user.metadata;
          
          bvnCloudinaryUrl = metadata.bvnCloudinaryUrl || null;
          bvnBase64Image = metadata.bvnBase64Image || null;
          bvnFullData = metadata.bvnFullData || null;
        } catch (error) {
          console.error('Error parsing user metadata:', error);
        }
      }

      const submission = {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName: fullName,
        kycStatus: user.kycStatus,
        bvn: user.bvn,
        hasSelfie: !!user.selfieUrl,
        selfieUrl: user.selfieUrl,
        submittedAt: user.createdAt.toISOString(),
        verifiedAt: user.kycVerifiedAt?.toISOString() || null,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || null,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
      };

      console.log(
        '✅ [KYC SERVICE] KYC submission details retrieved successfully',
      );

      return {
        success: true,
        submission,
        selfieImageUrl,
        bvnProviderResponse,
        bvnCloudinaryUrl,
        bvnBase64Image,
        bvnFullData,
      };
    } catch (error) {
      console.error(
        '❌ [KYC SERVICE] Error getting KYC submission details:',
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get KYC submission details');
    }
  }

  async reviewKycSubmission(
    userId: string,
    reviewDto: KycReviewDto,
  ): Promise<KycReviewResponse> {
    console.log('⚖️ [KYC SERVICE] Reviewing KYC submission for user:', userId);
    console.log('📝 Decision:', reviewDto.decision);
    console.log('💬 Comment:', reviewDto.comment);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          kycStatus: true,
          bvn: true,
          selfieUrl: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.kycStatus !== 'PENDING' && user.kycStatus !== 'UNDER_REVIEW') {
        throw new BadRequestException(
          `Cannot review KYC submission. Current status: ${user.kycStatus}. Only PENDING and UNDER_REVIEW statuses can be reviewed.`,
        );
      }

      // Admin can approve KYC even without selfie upload
      // This allows manual approval based on other criteria (e.g., BVN verification)
      console.log(
        'ℹ️ [KYC SERVICE] Selfie status:',
        user.selfieUrl ? 'Uploaded' : 'Not uploaded',
      );

      let newStatus: string;
      let walletCreated = false;
      let virtualAccountNumber: string | undefined;
      let message: string;

      if (reviewDto.decision === KycDecision.APPROVE) {
        // Approve KYC
        newStatus = 'VERIFIED';
        message = 'KYC approved successfully';

        // Update user status with complete verification
        const now = new Date();
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: 'APPROVED',
            kycVerifiedAt: now,
            bvnVerifiedAt: now, // Set BVN verification timestamp
            isVerified: true, // Set user as verified
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
            '💳 [KYC SERVICE] Wallet created for approved user:',
            virtualAccountNumber,
          );
        } catch (walletError) {
          console.error('❌ [KYC SERVICE] Error creating wallet:', walletError);
          // Don't fail the approval if wallet creation fails, but log it
        }

        console.log('✅ [KYC SERVICE] KYC approved for user:', userId);
        console.log('🔐 [KYC SERVICE] BVN verification timestamp set');
        console.log('🔐 [KYC SERVICE] Biometric verification status set');
        console.log('✅ [KYC SERVICE] User verification status set to true');

        // Send notifications to user
        try {
          // Send push notification
          await this.pushNotificationsService.sendPushNotificationToUser(
            userId,
            {
              title: '🎉 KYC Approved!',
              body: 'Your account has been verified. Your wallet is now ready to use!',
              data: {
                type: 'KYC_APPROVED',
                walletCreated: walletCreated,
                virtualAccountNumber: virtualAccountNumber,
              },
              priority: 'high',
              sound: 'default',
            },
          );

          // Send email notification
          const userFullName =
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName || user.lastName || 'User';

          await this.emailService.sendKycApprovalEmail({
            email: user.email,
            name: userFullName,
            walletCreated: walletCreated,
            virtualAccountNumber: virtualAccountNumber,
            walletProvider: 'Monzi',
          });

          console.log(
            '📧 [KYC SERVICE] KYC approval notifications sent successfully',
          );
        } catch (notificationError) {
          console.error(
            '❌ [KYC SERVICE] Error sending KYC approval notifications:',
            notificationError,
          );
          // Don't fail the approval if notifications fail
        }
      } else {
        // Reject KYC
        newStatus = 'REJECTED';
        message = 'KYC rejected';

        // Update user status (allow them to restart process)
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: 'REJECTED',
            // Clear selfie to allow re-upload
            selfieUrl: null,
          },
        });

        console.log('❌ [KYC SERVICE] KYC rejected for user:', userId);

        // Send rejection notification
        try {
          await this.pushNotificationsService.sendPushNotificationToUser(
            userId,
            {
              title: 'KYC Update',
              body: 'Your KYC submission requires attention. Please check your email for details.',
              data: {
                type: 'KYC_REJECTED',
                comment: reviewDto.comment,
              },
              priority: 'high',
              sound: 'default',
            },
          );

          console.log('📧 [KYC SERVICE] KYC rejection notification sent');
        } catch (notificationError) {
          console.error(
            '❌ [KYC SERVICE] Error sending KYC rejection notification:',
            notificationError,
          );
        }
      }

      return {
        success: true,
        userId,
        newStatus,
        walletCreated,
        virtualAccountNumber,
        message,
      };
    } catch (error) {
      console.error('❌ [KYC SERVICE] Error reviewing KYC submission:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to review KYC submission');
    }
  }
}
