import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import {
  GetUsersResponse,
  GetUserDetailResponse,
  DeleteUserDto,
  DeleteUserResponse,
  EditUserDto,
  EditUserResponse,
  CreateWalletDto,
  CreateWalletResponse,
  AdminUserStatsDto,
} from '../dto/admin.dto';

@Injectable()
export class UserManagementService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async getUsers(
    limit: number = 20,
    offset: number = 0,
    status?: string,
    search?: string,
  ): Promise<GetUsersResponse> {
    console.log('🔍 [USER SERVICE] Getting users with filters:', {
      limit,
      offset,
      status,
      search,
    });

    try {
      const where: any = {};

      if (status) {
        where.kycStatus = status;
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
            dateOfBirth: true,
            kycStatus: true,
            isVerified: true,
            createdAt: true,
            kycVerifiedAt: true,
            bvnVerifiedAt: true,
            isOnboarded: true,
            updatedAt: true,
            wallet: {
              select: {
                id: true,
                balance: true,
                isFrozen: true,
                virtualAccountNumber: true,
                provider: true,
                isActive: true,
                currency: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.user.count({ where }),
      ]);

      const formattedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth.toISOString(),
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
        kycVerifiedAt: user.kycVerifiedAt?.toISOString() || null,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || null,
        isOnboarded: user.isOnboarded,
        updatedAt: user.updatedAt.toISOString(),
        // Wallet information mapping
        walletStatus: user.wallet ? (user.wallet.isFrozen ? 'FROZEN' : user.wallet.isActive ? 'ACTIVE' : 'INACTIVE') : undefined,
        walletBalance: user.wallet ? user.wallet.balance : undefined,
        virtualAccountNumber: user.wallet ? user.wallet.virtualAccountNumber : undefined,
        walletProvider: user.wallet ? user.wallet.provider : undefined,
        hasWallet: !!user.wallet,
        walletCount: user.wallet ? 1 : 0,
        totalBalance: user.wallet ? user.wallet.balance : 0,
        frozenWallets: user.wallet && user.wallet.isFrozen ? 1 : 0,
      }));

      console.log('✅ [USER SERVICE] Users retrieved successfully');
      console.log('📊 Total users:', total);
      console.log('📄 Retrieved users:', formattedUsers.length);

      return {
        success: true,
        users: formattedUsers,
        total,
        limit,
        page: Math.floor(offset / limit) + 1,
        stats: {
          total: total,
          verified: formattedUsers.filter((u) => u.isVerified).length,
          pending: 0, // Placeholder
          rejected: 0, // Placeholder
          onboarded: formattedUsers.filter((u) => u.isOnboarded).length,
          withWallets: formattedUsers.filter((u) => u.hasWallet).length,
        },
      };
    } catch (error) {
      console.error('❌ [USER SERVICE] Error getting users:', error);
      throw new BadRequestException('Failed to get users');
    }
  }

  async getUserDetail(userId: string): Promise<GetUserDetailResponse> {
    console.log('🔍 [USER SERVICE] Getting user details for:', userId);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const userDetail = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth.toISOString(),
        gender: user.gender,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        bvn: user.bvn,
        createdAt: user.createdAt.toISOString(),
        kycVerifiedAt: user.kycVerifiedAt?.toISOString() || null,
        bvnVerifiedAt: user.bvnVerifiedAt?.toISOString() || null,
        isOnboarded: user.isOnboarded,
        updatedAt: user.updatedAt.toISOString(),
        // Wallet information mapping - match the AdminUserDetailDto structure
        wallet: user.wallet ? {
          id: user.wallet.id,
          balance: user.wallet.balance,
          currency: user.wallet.currency,
          virtualAccountNumber: user.wallet.virtualAccountNumber,
          provider: user.wallet.provider,
          isActive: user.wallet.isActive,
          createdAt: user.wallet.createdAt.toISOString(),
        } : undefined,
        // Additional wallet-related fields for consistency with user list
        walletStatus: user.wallet ? (user.wallet.isFrozen ? 'FROZEN' : user.wallet.isActive ? 'ACTIVE' : 'INACTIVE') : undefined,
        walletBalance: user.wallet ? user.wallet.balance : undefined,
        virtualAccountNumber: user.wallet ? user.wallet.virtualAccountNumber : undefined,
        walletProvider: user.wallet ? user.wallet.provider : undefined,
        hasWallet: !!user.wallet,
        walletCount: user.wallet ? 1 : 0,
        totalBalance: user.wallet ? user.wallet.balance : 0,
        frozenWallets: user.wallet && user.wallet.isFrozen ? 1 : 0,
        recentTransactions: [], // Placeholder - implement transaction fetching
      };

      console.log('✅ [USER SERVICE] User details retrieved successfully');

      return {
        success: true,
        user: userDetail,
      };
    } catch (error) {
      console.error('❌ [USER SERVICE] Error getting user details:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get user details');
    }
  }

  async deleteUser(deleteUserDto: DeleteUserDto): Promise<DeleteUserResponse> {
    console.log('🗑️ [USER SERVICE] Deleting user:', deleteUserDto.email || deleteUserDto.userId);

    try {
      // Find user by email or userId
      const whereClause = deleteUserDto.email 
        ? { email: deleteUserDto.email }
        : { id: deleteUserDto.userId };

      const user = await this.prisma.user.findUnique({
        where: whereClause,
        include: {
          wallet: true,
          transactions: {
            where: {
              status: {
                in: ['PENDING', 'PROCESSING']
              }
            }
          }
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user has active transactions
      const hasActiveTransactions = user.transactions.length > 0;
      
      // Check if user has wallet with balance
      const hasWalletBalance = user.wallet && user.wallet.balance > 0;

      console.log('🔍 [USER SERVICE] User data check:');
      console.log(`- Has active transactions: ${hasActiveTransactions} (${user.transactions.length} transactions)`);
      console.log(`- Has wallet balance: ${hasWalletBalance} (${user.wallet?.balance || 0} balance)`);
      console.log(`- Wallet exists: ${!!user.wallet}`);

      // If user has active transactions or wallet balance, perform soft delete (archive)
      if (hasActiveTransactions || hasWalletBalance) {
        console.log('📦 [USER SERVICE] User has active data - performing soft delete (archive)');
        
        // Archive the user (soft delete)
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            metadata: {
              ...(user.metadata as any || {}),
              archivedAt: new Date().toISOString(),
              archiveReason: 'Deleted by admin',
              originalEmail: user.email,
              originalPhone: user.phone,
              originalBvn: user.bvn,
              adminDeletion: true,
            },
          },
        });

        console.log('✅ [USER SERVICE] User archived successfully');

        return {
          success: true,
          message: 'User archived successfully (soft delete) - user had active transactions or wallet balance',
          deletedUserId: user.id,
          deletedUserEmail: user.email,
          walletDeleted: false,
          transactionsDeleted: 0,
          archived: true,
        };
      }

      // If no active data, perform hard delete
      console.log('🗑️ [USER SERVICE] User has no active data - performing hard delete');
      
      // Delete user and all related data (cascade)
      await this.prisma.user.delete({
        where: { id: user.id },
      });

      console.log('✅ [USER SERVICE] User deleted successfully (hard delete)');

      return {
        success: true,
        message: 'User deleted successfully (hard delete)',
        deletedUserId: user.id,
        deletedUserEmail: user.email,
        walletDeleted: !!user.wallet,
        transactionsDeleted: 0,
        archived: false,
      };
    } catch (error) {
      console.error('❌ [USER SERVICE] Error deleting user:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete user');
    }
  }

  async editUser(dto: EditUserDto): Promise<EditUserResponse> {
    console.log('✏️ [USER SERVICE] Editing user:', dto.userId);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updateData: any = {};

      if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
      if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.dateOfBirth !== undefined)
        updateData.dateOfBirth = dto.dateOfBirth;
      if (dto.gender !== undefined) updateData.gender = dto.gender;
      if (dto.bvn !== undefined) updateData.bvn = dto.bvn;
      if (dto.kycStatus !== undefined) updateData.kycStatus = dto.kycStatus;
      if (dto.isVerified !== undefined) updateData.isVerified = dto.isVerified;

      await this.prisma.user.update({
        where: { id: dto.userId },
        data: updateData,
      });

      console.log('✅ [USER SERVICE] User updated successfully');

      return {
        success: true,
        message: 'User updated successfully',
        userId: user.id,
        updatedFields: Object.keys(dto),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [USER SERVICE] Error editing user:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to edit user');
    }
  }

  async createWallet(dto: CreateWalletDto): Promise<CreateWalletResponse> {
    console.log('💳 [USER SERVICE] Creating wallet for user:', dto.userId);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user already has a wallet
      const existingWallet = await this.prisma.wallet.findFirst({
        where: { userId: dto.userId },
      });

      if (existingWallet) {
        throw new BadRequestException('User already has a wallet');
      }

      const wallet = await this.walletService.createWallet(
        user.id,
        user.firstName || 'User',
        user.lastName || 'Name',
        user.email,
        user.phone,
        user.dateOfBirth?.toISOString().split('T')[0] || '1990-01-01',
        user.gender === 'MALE' ? 'M' : 'F',
        undefined, // address
        undefined, // city
        undefined, // state
        user.bvn,
      );

      console.log('✅ [USER SERVICE] Wallet created successfully');

      return {
        success: true,
        message: 'Wallet created successfully',
        walletId: wallet.id,
        userId: user.id,
        userEmail: user.email,
        virtualAccountNumber: wallet.virtualAccountNumber,
        provider: wallet.provider,
        createdAt: wallet.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [USER SERVICE] Error creating wallet:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create wallet: ' + error.message);
    }
  }

  async getUserStats(): Promise<AdminUserStatsDto> {
    console.log('📊 [USER SERVICE] Getting user statistics');

    try {
      const [totalUsers, verifiedUsers, usersWithWallets, newThisMonth] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.user.count({ where: { isVerified: true } }),
          this.prisma.user.count({
            where: { wallet: { isNot: null } },
          }),
          this.prisma.user.count({
            where: {
              createdAt: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
          }),
        ]);

      return {
        total: totalUsers,
        verified: verifiedUsers,
        pending: 0, // Placeholder
        rejected: 0, // Placeholder
        onboarded: totalUsers, // Placeholder
        withWallets: usersWithWallets,
      };
    } catch (error) {
      console.error('❌ [USER SERVICE] Error getting user statistics:', error);
      throw new BadRequestException('Failed to get user statistics');
    }
  }
}
