import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  CreateAdminDto,
  CreateAdminResponse,
  GetAdminsResponse,
  AdminDto,
  UpdateAdminDto,
  UpdateAdminResponse,
  DeleteAdminDto,
  DeleteAdminResponse,
  GetAdminLogsResponse,
} from '../dto/admin.dto';

@Injectable()
export class AdminManagementService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createAdmin(
    createAdminDto: CreateAdminDto,
    adminId: string,
    adminEmail: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CreateAdminResponse> {
    try {
      console.log('👤 [ADMIN SERVICE] Creating new admin');
      console.log('📄 Admin Data:', {
        email: createAdminDto.email,
        role: createAdminDto.role,
      });

      // Check if admin already exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: createAdminDto.email },
      });

      if (existingAdmin) {
        throw new BadRequestException('Admin with this email already exists');
      }

      // Create admin user
      const admin = await this.prisma.user.create({
        data: {
          email: createAdminDto.email,
          firstName: createAdminDto.email.split('@')[0], // Placeholder
          lastName: 'Admin', // Placeholder
          phone: '', // Placeholder
          gender: 'M' as any, // Placeholder
          dateOfBirth: new Date('1990-01-01'), // Placeholder
          passcode: 'admin123', // Placeholder
          role: createAdminDto.role,
          isVerified: true,
          isOnboarded: true,
        },
      });

      console.log('✅ [ADMIN SERVICE] Admin created successfully');
      console.log('📄 Admin ID:', admin.id);

      // Log the action
      await this.logAdminAction(
        adminId,
        adminEmail,
        'CREATE_ADMIN',
        'ADMIN',
        admin.id,
        admin.email,
        { role: createAdminDto.role },
        ipAddress,
        userAgent,
      );

      return {
        success: true,
        message: 'Admin created successfully',
        userId: admin.id,
        email: admin.email,
        fullName: `${admin.firstName} ${admin.lastName}`,
        role: admin.role,
        permissions: this.getDefaultPermissions(admin.role),
        promotedAt: admin.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error creating admin:', error);
      throw error;
    }
  }

  async getAdmins(
    limit: number = 20,
    offset: number = 0,
    role?: string,
    search?: string,
  ): Promise<GetAdminsResponse> {
    try {
      console.log('👥 [ADMIN SERVICE] Getting admins list');

      const where: any = {
        role: { in: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'] },
      };

      if (role) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [admins, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.user.count({ where }),
      ]);

      console.log('✅ [ADMIN SERVICE] Admins retrieved successfully');
      console.log('📊 Total admins:', total);
      console.log('📄 Retrieved admins:', admins.length);

      return {
        success: true,
        message: 'Admins retrieved successfully',
        admins: admins.map((admin) => ({
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          phone: '', // Placeholder
          gender: 'M' as any, // Placeholder
          dateOfBirth: new Date().toISOString(), // Placeholder
          role: admin.role,
          isActive: admin.isActive,
          isVerified: true, // Placeholder
          permissions: [], // Placeholder
          createdAt: admin.createdAt.toISOString(),
          updatedAt: new Date().toISOString(), // Placeholder
        })),
        total,
        limit,
        page: Math.floor(offset / limit) + 1,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error getting admins:', error);
      throw new BadRequestException('Failed to get admins');
    }
  }

  async getAdminDetail(adminId: string): Promise<AdminDto> {
    try {
      console.log('👤 [ADMIN SERVICE] Getting admin detail:', adminId);

      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      console.log('✅ [ADMIN SERVICE] Admin detail retrieved successfully');

      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: '', // Placeholder
        gender: 'M' as any, // Placeholder
        dateOfBirth: new Date().toISOString(), // Placeholder
        role: admin.role,
        isActive: admin.isActive,
        isVerified: true, // Placeholder
        permissions: [], // Placeholder
        createdAt: admin.createdAt.toISOString(),
        updatedAt: new Date().toISOString(), // Placeholder
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error getting admin detail:', error);
      throw error;
    }
  }

  async updateAdmin(
    adminId: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<UpdateAdminResponse> {
    try {
      console.log('✏️ [ADMIN SERVICE] Updating admin:', adminId);

      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      await this.prisma.user.update({
        where: { id: adminId },
        data: {
          firstName: updateAdminDto.firstName,
          lastName: updateAdminDto.lastName,
          role: updateAdminDto.role,
          isActive: updateAdminDto.isActive,
        },
      });

      console.log('✅ [ADMIN SERVICE] Admin updated successfully');

      return {
        success: true,
        message: 'Admin updated successfully',
        admin: {
          id: adminId,
          email: admin.email,
          firstName: updateAdminDto.firstName,
          lastName: updateAdminDto.lastName,
          phone: '', // Placeholder
          gender: 'M' as any, // Placeholder
          dateOfBirth: new Date().toISOString(), // Placeholder
          role: updateAdminDto.role,
          isActive: updateAdminDto.isActive,
          isVerified: true, // Placeholder
          permissions: [], // Placeholder
          createdAt: admin.createdAt.toISOString(),
          updatedAt: admin.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error updating admin:', error);
      throw error;
    }
  }

  async deleteAdmin(
    adminId: string,
    deleteAdminDto: DeleteAdminDto,
  ): Promise<DeleteAdminResponse> {
    try {
      console.log('🗑️ [ADMIN SERVICE] Deleting admin:', adminId);

      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      await this.prisma.user.delete({
        where: { id: adminId },
      });

      console.log('✅ [ADMIN SERVICE] Admin deleted successfully');

      return {
        success: true,
        message: 'Admin deleted successfully',
        adminId: adminId,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error deleting admin:', error);
      throw error;
    }
  }

  async getRolePermissions() {
    console.log('🔐 [ADMIN SERVICE] Getting role permissions');

    try {
      const permissions = {
        SUDO_ADMIN: [
          'ALL_PERMISSIONS',
          'CREATE_ADMIN',
          'DELETE_ADMIN',
          'MANAGE_USERS',
          'MANAGE_TRANSACTIONS',
          'MANAGE_WALLETS',
          'MANAGE_KYC',
          'VIEW_LOGS',
          'SYSTEM_CONFIG',
        ],
        ADMIN: [
          'MANAGE_USERS',
          'MANAGE_TRANSACTIONS',
          'MANAGE_WALLETS',
          'MANAGE_KYC',
          'VIEW_LOGS',
        ],
        CUSTOMER_REP: [
          'VIEW_USERS',
          'VIEW_TRANSACTIONS',
          'VIEW_KYC',
          'BASIC_SUPPORT',
        ],
      };

      console.log('✅ [ADMIN SERVICE] Role permissions retrieved successfully');

      return {
        success: true,
        permissions,
      };
    } catch (error) {
      console.error(
        '❌ [ADMIN SERVICE] Error getting role permissions:',
        error,
      );
      throw new BadRequestException('Failed to get role permissions');
    }
  }

  async logAdminAction(
    adminId: string,
    adminEmail: string,
    action: string,
    targetType?: string,
    targetId?: string,
    targetEmail?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          adminEmail,
          action,
          targetType,
          targetId,
          targetEmail,
          details,
          ipAddress,
          userAgent,
        },
      });

      console.log('📝 [ADMIN SERVICE] Admin action logged:', action);
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error logging admin action:', error);
      // Don't throw error for logging failures
    }
  }

  async getAdminLogs(
    limit: number = 20,
    offset: number = 0,
    action?: string,
    adminEmail?: string,
    targetEmail?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<GetAdminLogsResponse> {
    console.log('📋 [ADMIN SERVICE] Getting admin logs with filters:', {
      limit,
      offset,
      action,
      adminEmail,
      targetEmail,
      startDate,
      endDate,
    });

    try {
      const where: any = {};

      if (action) {
        where.action = action;
      }

      if (adminEmail) {
        where.adminEmail = adminEmail;
      }

      if (targetEmail) {
        where.targetEmail = targetEmail;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [logs, total] = await Promise.all([
        this.prisma.adminActionLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.adminActionLog.count({ where }),
      ]);

      console.log('✅ [ADMIN SERVICE] Admin logs retrieved successfully');
      console.log('📊 Total logs:', total);
      console.log('📄 Retrieved logs:', logs.length);

      return {
        success: true,
        message: 'Admin logs retrieved successfully',
        logs: logs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          adminId: log.adminId,
          adminEmail: log.adminEmail,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          targetEmail: log.targetEmail,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        })),
        total,
        limit,
        page: Math.floor(offset / limit) + 1,
      };
    } catch (error) {
      console.error('❌ [ADMIN SERVICE] Error getting admin logs:', error);
      throw new BadRequestException('Failed to get admin logs');
    }
  }

  private generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'SUDO_ADMIN':
        return [
          'ALL_PERMISSIONS',
          'CREATE_ADMIN',
          'DELETE_ADMIN',
          'MANAGE_USERS',
          'MANAGE_TRANSACTIONS',
          'MANAGE_WALLETS',
          'MANAGE_KYC',
          'VIEW_LOGS',
          'SYSTEM_CONFIG',
        ];
      case 'ADMIN':
        return [
          'MANAGE_USERS',
          'MANAGE_TRANSACTIONS',
          'MANAGE_WALLETS',
          'MANAGE_KYC',
          'VIEW_LOGS',
        ];
      case 'CUSTOMER_REP':
        return ['VIEW_USERS', 'VIEW_TRANSACTIONS', 'VIEW_KYC', 'BASIC_SUPPORT'];
      default:
        return ['BASIC_VIEW'];
    }
  }
}
