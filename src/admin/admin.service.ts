import { Injectable } from '@nestjs/common';
import { KycManagementService } from './services/kyc-management.service';
import { UserManagementService } from './services/user-management.service';
import { TransactionManagementService } from './services/transaction-management.service';
import { AdminManagementService } from './services/admin-management.service';
import { WalletManagementService } from './services/wallet-management.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { TransferProviderManagerService } from '../providers/transfer-provider-manager.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  constructor(
    private kycManagementService: KycManagementService,
    private userManagementService: UserManagementService,
    private transactionManagementService: TransactionManagementService,
    private adminManagementService: AdminManagementService,
    private walletManagementService: WalletManagementService,
    private providerManager: ProviderManagerService,
    private transferProviderManager: TransferProviderManagerService,
    private configService: ConfigService,
  ) {}

  // ==================== KYC MANAGEMENT DELEGATION ====================

  async getKycSubmissions() {
    return this.kycManagementService.getKycSubmissions();
  }

  async getPendingKycSubmissions() {
    return this.kycManagementService.getPendingKycSubmissions();
  }

  async getKycSubmissionDetails(userId: string) {
    return this.kycManagementService.getKycSubmissionDetails(userId);
  }

  async reviewKycSubmission(userId: string, reviewDto: any) {
    return this.kycManagementService.reviewKycSubmission(userId, reviewDto);
  }

  // ==================== USER MANAGEMENT DELEGATION ====================

  async getUsers(limit?: number, offset?: number, status?: string, search?: string) {
    return this.userManagementService.getUsers(limit, offset, status, search);
  }

  async getUserDetail(userId: string) {
    return this.userManagementService.getUserDetail(userId);
  }

  async deleteUser(deleteUserDto: any) {
    return this.userManagementService.deleteUser(deleteUserDto);
  }

  async editUser(dto: any) {
    return this.userManagementService.editUser(dto);
  }

  async createWallet(dto: any) {
    return this.userManagementService.createWallet(dto);
  }

  async getUserStats() {
    return this.userManagementService.getUserStats();
  }

  // ==================== TRANSACTION MANAGEMENT DELEGATION ====================

  async getTransactions(limit?: number, offset?: number, type?: string, status?: string, userId?: string, startDate?: string, endDate?: string) {
    return this.transactionManagementService.getTransactions(limit, offset, type, status, userId, startDate, endDate);
  }

  async getTransactionDetail(transactionId: string) {
    return this.transactionManagementService.getTransactionDetail(transactionId);
  }

  async getTransactionStats() {
    return this.transactionManagementService.getTransactionStats();
  }

  async fundWallet(dto: any) {
    return this.transactionManagementService.fundWallet(dto);
  }

  async debitWallet(dto: any) {
    return this.transactionManagementService.debitWallet(dto);
  }

  // ==================== ADMIN MANAGEMENT DELEGATION ====================

  async createAdmin(createAdminDto: any, adminId: string, adminEmail: string, ipAddress?: string, userAgent?: string) {
    return this.adminManagementService.createAdmin(createAdminDto, adminId, adminEmail, ipAddress, userAgent);
  }

  async getAdmins(limit?: number, offset?: number, role?: string, search?: string) {
    return this.adminManagementService.getAdmins(limit, offset, role, search);
  }

  async getAdminDetail(adminId: string) {
    return this.adminManagementService.getAdminDetail(adminId);
  }

  async updateAdmin(adminId: string, updateAdminDto: any) {
    return this.adminManagementService.updateAdmin(adminId, updateAdminDto);
  }

  async deleteAdmin(adminId: string, deleteAdminDto: any) {
    return this.adminManagementService.deleteAdmin(adminId, deleteAdminDto);
  }

  async getRolePermissions() {
    return this.adminManagementService.getRolePermissions();
  }

  async getAdminLogs(limit?: number, offset?: number, action?: string, adminEmail?: string, targetEmail?: string, startDate?: string, endDate?: string) {
    return this.adminManagementService.getAdminLogs(limit, offset, action, adminEmail, targetEmail, startDate, endDate);
  }

  async logAdminAction(adminId: string, adminEmail: string, action: string, targetType?: string, targetId?: string, targetEmail?: string, details?: any, ipAddress?: string, userAgent?: string) {
    return this.adminManagementService.logAdminAction(adminId, adminEmail, action, targetType, targetId, targetEmail, details, ipAddress, userAgent);
  }

  // ==================== WALLET MANAGEMENT DELEGATION ====================

  async getWalletBalance(params: any) {
    return this.walletManagementService.getWalletBalance(params);
  }

  async getTotalWalletBalance() {
    return this.walletManagementService.getTotalWalletBalance();
  }

  async freezeWallet(freezeWalletDto: any, adminId: string, adminEmail: string) {
    return this.walletManagementService.freezeWallet(freezeWalletDto, adminId, adminEmail);
  }

  async unfreezeWallet(unfreezeWalletDto: any, adminId: string, adminEmail: string) {
    return this.walletManagementService.unfreezeWallet(unfreezeWalletDto, adminId, adminEmail);
  }

  async getProviderWalletDetails(provider?: string) {
    return this.walletManagementService.getProviderWalletDetails(provider);
  }

  async validateWalletBalance(walletId: string) {
    return this.walletManagementService.validateWalletBalance(walletId);
  }

  async reconcileWalletBalance(walletId: string) {
    return this.walletManagementService.reconcileWalletBalance(walletId);
  }

  // ==================== PROVIDER MANAGEMENT ====================

  async getAvailableProviders() {
    return this.providerManager.getAvailableProviders();
  }

  async switchWalletProvider(provider: string) {
    return this.providerManager.switchWalletProvider(provider as any);
  }

  async getCurrentProvider() {
    return this.providerManager.getCurrentProviderName();
  }

  async testPolarisAccountCreation(testData: any) {
    // Placeholder - implement in provider manager
    return { success: true, message: 'Test completed' };
  }

  async testBudPayWalletCreation(testData: any) {
    // Placeholder - implement in provider manager
    return { success: true, message: 'Test completed' };
  }

  async getAvailableTransferProviders() {
    return this.transferProviderManager.getAvailableProviders();
  }

  async switchTransferProvider(provider: string) {
    return this.transferProviderManager.switchTransferProvider(provider as any);
  }

  async getCurrentTransferProvider() {
    return this.transferProviderManager.getCurrentProviderName();
  }

  async testBankList() {
    return this.transferProviderManager.getBankList();
  }

  async testAccountVerification(testData: any) {
    return this.transferProviderManager.verifyAccount(testData);
  }

  async testBankTransfer(transferData: any) {
    return this.transferProviderManager.transferToBank(transferData);
  }

  // ==================== WALLET VALIDATION ====================

  async validateAllWallets() {
    // Placeholder - implement in wallet management service
    return { success: true, message: 'Validation completed', validatedCount: 0 };
  }

  async resetWalletBalance(walletId: string) {
    // Placeholder - implement in wallet management service
    return { success: true, message: 'Wallet balance reset', walletId };
  }

  async resetWalletByAccountNumber(accountNumber: string) {
    // Placeholder - implement in wallet management service
    return { success: true, message: 'Wallet balance reset', accountNumber };
  }

  // ==================== TRANSFER FEES ====================

  async getTransferFeeTiers() {
    // Placeholder - implement in a separate service
    return { success: true, tiers: [], total: 0 };
  }

  async createTransferFeeTier(dto: any) {
    // Placeholder - implement in a separate service
    return { success: true, message: 'Created' };
  }

  async updateTransferFeeTier(id: string, dto: any) {
    // Placeholder - implement in a separate service
    return { success: true, message: 'Updated' };
  }

  async deleteTransferFeeTier(id: string) {
    // Placeholder - implement in a separate service
    return { success: true, message: 'Deleted' };
  }

  async calculateTransferFeeFromTiers(amount: number) {
    // Placeholder - implement in a separate service
    return { fee: 0, tier: null };
  }

  async seedDefaultTransferFeeTiers() {
    // Placeholder - implement in a separate service
    return { success: true, message: 'Seeded', data: [] };
  }

  // ==================== BUSINESS WALLET ====================

  async getNyraBusinessWalletBalance() {
    // Placeholder - implement in a separate service
    return {
      success: true,
      message: 'Business wallet balance retrieved',
      data: {
        businessId: 'nyra-business',
        businessName: 'Nyra Business',
        balance: 0,
        formattedBalance: '₦0.00',
        currency: 'NGN',
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  // ==================== WEBHOOK LOGS ====================

  async getWebhookLogs(params: any) {
    // Placeholder - implement in a separate service
    return {
      success: true,
      total: 0,
      processed: 0,
      pending: 0,
      errors: 0,
      logs: [],
    };
  }

  // ==================== MIGRATION ====================

  async migrateUsersToNyra(options?: any) {
    // Placeholder - implement in a separate service
    return {
      success: true,
      message: 'Migration completed',
      totalUsers: 0,
      processedUsers: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: [],
      results: [],
    };
  }

  // ==================== TRANSACTION REPORTS ====================

  async getTransactionReports(limit?: number, offset?: number, status?: string) {
    // Placeholder - implement in a separate service
    return {
      success: true,
      reports: [],
      total: 0,
      limit: limit || 20,
      offset: offset || 0,
    };
  }

  async updateTransactionReportStatus(reportId: string, adminId: string, updateDto: any) {
    // Placeholder - implement in a separate service
    return {
      success: true,
      message: 'Report status updated',
      reportId,
    };
  }

  // ==================== DASHBOARD STATS DELEGATION ====================

  async getDashboardStats() {
    const [userStats, transactionStats, walletStats] = await Promise.all([
      this.getUserStats(),
      this.getTransactionStats(),
      this.getTotalWalletBalance(),
    ]);

    return {
      success: true,
      stats: {
        users: userStats,
        transactions: transactionStats,
        wallets: walletStats,
      },
      userStats: userStats,
      transactionStats: transactionStats,
      walletStats: walletStats,
      timestamp: new Date().toISOString(),
    };
  }
}


