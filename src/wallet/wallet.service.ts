import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  WalletTransactionType,
  TransactionStatus,
  FeeType,
} from '@prisma/client';
import {
  TransferDto,
  WalletDetailsResponse,
  TransferResponse,
} from './dto/wallet.dto';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { TransferProviderManagerService } from '../providers/transfer-provider-manager.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { WalletCreationData } from '../providers/base/wallet-provider.interface';
import { BankTransferData } from '../providers/base/transfer-provider.interface';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private providerManager: ProviderManagerService,
    private transferProviderManager: TransferProviderManagerService,
    private pushNotificationsService: PushNotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Generate default narration from user's name
   * Format: "FirstName LastInitial" (e.g., "John S" for "John Smith")
   */
  private generateDefaultNarration(
    firstName: string,
    lastName: string,
  ): string {
    const firstNameTrimmed = firstName?.trim() || '';
    const lastNameTrimmed = lastName?.trim() || '';
    const lastInitial = lastNameTrimmed.charAt(0).toUpperCase();

    return lastInitial
      ? `${firstNameTrimmed} ${lastInitial}`
      : firstNameTrimmed;
  }

  async createWallet(
    userId: string,
    userFirstName: string,
    userLastName: string,
    userEmail: string,
    userPhone: string,
    userDateOfBirth: string,
    userGender: 'M' | 'F',
    userAddress?: string,
    userCity?: string,
    userState?: string,
    userBvn?: string,
  ): Promise<any> {
    console.log('💳 [WALLET CREATE] Creating wallet for user:', userId);

    // Check if wallet already exists
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (existingWallet) {
      console.log('⚠️ [WALLET CREATE] Wallet already exists for user:', userId);
      return existingWallet;
    }

    try {
      // Get the active wallet provider
      const walletProvider =
        await this.providerManager.getActiveWalletProvider();
      const providerName = await this.providerManager.getCurrentProviderName();

      console.log(`🏦 [WALLET CREATE] Using provider: ${providerName}`);

      // Prepare wallet creation data
      const walletData: WalletCreationData = {
        accountName: `${userFirstName} ${userLastName}`.trim(),
        firstName: userFirstName,
        lastName: userLastName,
        email: userEmail,
        phoneNumber: userPhone,
        dateOfBirth: userDateOfBirth,
        gender: userGender,
        address: userAddress || 'Lagos, Nigeria',
        city: userCity || 'Lagos',
        state: userState || 'Lagos State',
        country: 'Nigeria',
        bvn: userBvn,
      };

      // Create wallet through provider
      const providerResult = await walletProvider.createWallet(walletData);

      if (!providerResult.success) {
        console.error(
          '❌ [WALLET CREATE] Provider wallet creation failed:',
          providerResult.error,
        );
        throw new BadRequestException(
          providerResult.error || 'Failed to create wallet',
        );
      }

      // Save wallet to database
      const wallet = await this.prisma.wallet.create({
        data: {
          userId,
          virtualAccountNumber: providerResult.data.accountNumber,
          providerAccountName: providerResult.data.accountName,
          providerId: providerResult.data.customerId,
          provider: providerName,
          bankName: providerResult.data.bankName,
          currency: providerResult.data.currency || 'NGN',
        },
      });

      console.log('✅ [WALLET CREATE] Wallet created successfully:', {
        accountNumber: wallet.virtualAccountNumber,
        provider: providerName,
        customerId: wallet.providerId,
      });

      return {
        ...wallet,
        provider: providerName,
        bankName: providerResult.data.bankName,
        bankCode: providerResult.data.bankCode,
        status: providerResult.data.status,
      };
    } catch (error) {
      console.error('❌ [WALLET CREATE] Error creating wallet:', error);
      throw new BadRequestException(
        'Failed to create wallet: ' + error.message,
      );
    }
  }

  /**
   * Ensure wallet exists for KYC-verified users
   * This handles the edge case where KYC passed but wallet creation failed due to "customer already exists"
   */
  async ensureWalletExists(userId: string): Promise<any> {
    console.log(
      '🔍 [WALLET RECOVERY] Checking wallet status for user:',
      userId,
    );

    // Check if wallet already exists
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (existingWallet) {
      console.log(
        '✅ [WALLET RECOVERY] Wallet already exists for user:',
        userId,
      );
      return existingWallet;
    }

    // Check if user has verified KYC but no wallet (the edge case)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        kycStatus: true,
        bvn: true,
        bvnVerifiedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Only attempt recovery for KYC-verified users without wallets
    if (user.kycStatus !== 'APPROVED' || !user.bvnVerifiedAt) {
      console.log(
        '⚠️ [WALLET RECOVERY] User not eligible for wallet recovery - KYC not completed',
      );
      throw new BadRequestException('Please complete KYC verification first');
    }

    console.log(
      '🔄 [WALLET RECOVERY] KYC-verified user without wallet detected, attempting recovery...',
    );
    console.log(
      '👤 [WALLET RECOVERY] User:',
      user.firstName,
      user.lastName,
      '(' + user.email + ')',
    );

    try {
      // Attempt to create/recover wallet using the existing createWallet method
      // This will now use our improved BudPay provider that searches for existing accounts
      const recoveredWallet = await this.createWallet(
        userId,
        user.firstName || 'User',
        user.lastName || 'Account',
        user.email,
        user.phone,
        user.dateOfBirth?.toISOString().split('T')[0] || '1990-01-01',
        (user.gender as 'M' | 'F') || 'M',
        'Lagos, Nigeria', // Default address
        'Lagos', // Default city
        'Lagos State', // Default state
        user.bvn || undefined,
      );

      console.log('✅ [WALLET RECOVERY] Wallet recovery successful!');
      console.log(
        '🏦 [WALLET RECOVERY] Account Number:',
        recoveredWallet.virtualAccountNumber,
      );

      return recoveredWallet;
    } catch (error) {
      console.error(
        '❌ [WALLET RECOVERY] Wallet recovery failed:',
        error.message,
      );
      throw new BadRequestException(`Wallet recovery failed: ${error.message}`);
    }
  }

  /**
   * Get wallet details with automatic recovery for verified users
   */
  async getWalletDetailsWithRecovery(userId: string): Promise<any> {
    console.log('💳 [WALLET DETAILS] Getting wallet details for user:', userId);

    try {
      // First try to get existing wallet
      let wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      // If no wallet but user is KYC verified, attempt recovery
      if (!wallet) {
        console.log(
          '💡 [WALLET DETAILS] No wallet found, attempting automatic recovery...',
        );
        wallet = await this.ensureWalletExists(userId);
      }

      if (!wallet) {
        throw new BadRequestException('Unable to retrieve or create wallet');
      }

      console.log('✅ [WALLET DETAILS] Wallet details retrieved successfully');

      return {
        id: wallet.id,
        balance: wallet.balance,
        accountNumber: wallet.virtualAccountNumber,
        accountName: wallet.providerAccountName,
        bankName: wallet.bankName,
        provider: wallet.provider,
        currency: wallet.currency,
        status: 'active',
        createdAt: wallet.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ [WALLET DETAILS] Error getting wallet details:', error);
      throw error;
    }
  }

  // Direct fee calculation method to avoid circular dependency
  async calculateFee(feeType: FeeType, amount: number): Promise<number> {
    console.log(
      '💰 [FEE CALCULATION] Calculating fee for type:',
      feeType,
      'amount:',
      amount,
    );

    try {
      const feeConfig = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: feeType, isActive: true },
      });

      if (!feeConfig) {
        // Default fee if no configuration found
        console.log(
          '⚠️ [FEE CALCULATION] No fee configuration found for type:',
          feeType,
        );
        return 25; // Default ₦25 fee
      }

      let calculatedFee = 0;

      // Calculate percentage-based fee
      if (feeConfig.percentage) {
        calculatedFee = amount * feeConfig.percentage;
      }

      // Add fixed amount fee
      if (feeConfig.fixedAmount) {
        calculatedFee += feeConfig.fixedAmount;
      }

      // Apply minimum fee
      if (feeConfig.minAmount && calculatedFee < feeConfig.minAmount) {
        calculatedFee = feeConfig.minAmount;
      }

      // Apply maximum fee
      if (feeConfig.maxAmount && calculatedFee > feeConfig.maxAmount) {
        calculatedFee = feeConfig.maxAmount;
      }

      console.log('✅ [FEE CALCULATION] Fee calculated:', calculatedFee);
      return calculatedFee;
    } catch (error) {
      console.error('❌ [FEE CALCULATION] Error calculating fee:', error);
      return 25; // Default ₦25 fee on error
    }
  }

  async getWalletDetails(userId: string): Promise<WalletDetailsResponse> {
    console.log('📊 [WALLET DETAILS] Getting wallet details for user:', userId);

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Use the provider that created this specific wallet (not current system provider)
    const providerName = wallet.provider || 'UNKNOWN';
    const bankName = wallet.bankName || 'Unknown Bank';

    console.log('✅ [WALLET DETAILS] Wallet details retrieved successfully');

    return {
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      virtualAccountNumber: wallet.virtualAccountNumber,
      providerAccountName: wallet.providerAccountName,
      providerName,
      bankName,
      isActive: wallet.isActive,
      isFrozen: wallet.isFrozen,
      dailyLimit: wallet.dailyLimit,
      monthlyLimit: wallet.monthlyLimit,
      lastTransactionAt: wallet.lastTransactionAt?.toISOString(),
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  async setWalletPin(
    userId: string,
    pin: string,
  ): Promise<{ success: boolean; message: string }> {
    console.log('🔐 [SET PIN] Setting wallet PIN for user:', userId);

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    await this.prisma.wallet.update({
      where: { userId },
      data: { pin: hashedPin },
    });

    console.log('✅ [SET PIN] Wallet PIN set successfully');

    return {
      success: true,
      message: 'Wallet PIN set successfully',
    };
  }

  async verifyWalletPin(userId: string, pin: string): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || !wallet.pin) {
      throw new UnauthorizedException('Wallet PIN not set');
    }

    const isValidPin = await bcrypt.compare(pin, wallet.pin);
    if (!isValidPin) {
      throw new UnauthorizedException('Invalid wallet PIN');
    }

    return true;
  }

  /**
   * Check if wallet PIN is set (without exposing the actual PIN)
   */
  async checkWalletPinStatus(userId: string): Promise<{
    hasPinSet: boolean;
    message: string;
    walletExists: boolean;
  }> {
    console.log('🔐 [WALLET SERVICE] Checking PIN status for user:', userId);

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        pin: true,
        isActive: true,
      },
    });

    if (!wallet) {
      console.log('❌ [WALLET SERVICE] Wallet not found for user:', userId);
      return {
        hasPinSet: false,
        message: 'Wallet not found',
        walletExists: false,
      };
    }

    const hasPinSet =
      wallet.pin !== null && wallet.pin !== undefined && wallet.pin.length > 0;

    console.log('✅ [WALLET SERVICE] PIN status checked:', {
      hasPinSet,
      walletActive: wallet.isActive,
    });

    return {
      hasPinSet,
      message: hasPinSet ? 'PIN is set' : 'No PIN set for this wallet',
      walletExists: true,
    };
  }

  async checkSufficientBalance(
    userId: string,
    amount: number,
  ): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet.balance >= amount;
  }

  async transferToBank(
    userId: string,
    transferDto: TransferDto,
  ): Promise<TransferResponse> {
    console.log('💸 [TRANSFER] Processing bank transfer for user:', userId);
    console.log('💸 [TRANSFER] Transfer details:', {
      amount: transferDto.amount,
      accountNumber: transferDto.accountNumber,
      bankName: transferDto.bankName,
      accountName: transferDto.accountName,
    });

    // Get user wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new ForbiddenException('Wallet is inactive');
    }

    if (wallet.isFrozen) {
      throw new ForbiddenException('Wallet is frozen. Please contact support for assistance.');
    }

    // Verify PIN
    await this.verifyWalletPin(userId, transferDto.pin);

    // Calculate fee using dynamic fee configuration
    const fee = await this.calculateFee(FeeType.TRANSFER, transferDto.amount);
    const totalDeduction = transferDto.amount + fee;

    // Check sufficient balance
    if (wallet.balance < totalDeduction) {
      throw new BadRequestException(
        `Insufficient balance. Required: ₦${totalDeduction.toFixed(2)}, Available: ₦${wallet.balance.toFixed(2)}`,
      );
    }

    // Generate transaction reference
    const reference = `TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Generate default narration if not provided
    const defaultNarration = this.generateDefaultNarration(
      wallet.user.firstName,
      wallet.user.lastName,
    );

    try {
      // Get bank code for the transfer
      const bankCode = await this.getBankCode(transferDto.bankName);

      // Prepare transfer data for provider
      const transferData: BankTransferData = {
        amount: transferDto.amount,
        currency: 'NGN',
        accountNumber: transferDto.accountNumber,
        bankCode,
        bankName: transferDto.bankName,
        accountName: transferDto.accountName,
        narration: transferDto.description || defaultNarration,
        reference,
        senderName: `${wallet.user.firstName} ${wallet.user.lastName}`,
        senderEmail: wallet.user.email,
        metadata: {
          userId: userId,
          walletId: wallet.id,
          fee: fee,
        },
      };

      // Send transfer request to active provider
      const providerResponse =
        await this.transferProviderManager.transferToBank(transferData);

      console.log('🏦 [TRANSFER] Provider response:', providerResponse);

      if (!providerResponse.success) {
        throw new Error(providerResponse.message || 'Transfer failed');
      }

      // Create wallet transaction record
      const transaction = await this.prisma.walletTransaction.create({
        data: {
          amount: transferDto.amount,
          type: WalletTransactionType.WITHDRAWAL,
          status: TransactionStatus.COMPLETED,
          reference,
          description: transferDto.description || defaultNarration,
          fee,
          senderWalletId: wallet.id,
          senderBalanceBefore: wallet.balance,
          senderBalanceAfter: wallet.balance - totalDeduction,
          providerReference: providerResponse.data?.reference || reference,
          providerResponse: JSON.parse(JSON.stringify(providerResponse)),
          metadata: {
            recipientBank: transferDto.bankName,
            recipientAccount: transferDto.accountNumber,
            recipientName: transferDto.accountName,
            bankCode,
            providerStatus: providerResponse.data?.status,
            providerFee: providerResponse.data?.fee,
          },
        },
      });

      // Also create a record in the main Transaction table for admin queries
      await this.prisma.transaction.create({
        data: {
          amount: transferDto.amount,
          currency: 'NGN',
          type: 'WITHDRAWAL',
          status: TransactionStatus.COMPLETED,
          reference,
          description: transferDto.description || defaultNarration,
          userId: userId,
          metadata: {
            fee,
            recipientBank: transferDto.bankName,
            recipientAccount: transferDto.accountNumber,
            recipientName: transferDto.accountName,
            bankCode,
            walletTransactionId: transaction.id,
            providerReference: providerResponse.data?.reference || reference,
            providerStatus: providerResponse.data?.status,
            providerFee: providerResponse.data?.fee,
          },
        },
      });

      // Update wallet balance
      const updatedWallet = await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance - totalDeduction,
          lastTransactionAt: new Date(),
        },
      });

      console.log('✅ [TRANSFER] Transfer completed successfully');
      console.log('💰 [TRANSFER] New balance:', updatedWallet.balance);

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // Wallet balance update notification
        this.notificationsGateway.emitWalletBalanceUpdate(userId, {
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
          change: -totalDeduction,
          currency: 'NGN',
          provider: 'TRANSFER',
          accountNumber: wallet.virtualAccountNumber,
          grossAmount: transferDto.amount,
          fundingFee: fee,
          netAmount: -totalDeduction,
          reference,
        });

        // Transaction notification
        this.notificationsGateway.emitTransactionNotification(userId, {
          type: 'WITHDRAWAL',
          amount: transferDto.amount,
          grossAmount: transferDto.amount,
          fee: fee,
          currency: 'NGN',
          description: transferDto.description || defaultNarration,
          reference,
          provider: 'TRANSFER',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });

        // General notification
        this.notificationsGateway.emitNotification(userId, {
          title: 'Transfer Completed Successfully',
          message: `₦${transferDto.amount.toLocaleString()} transferred to ${transferDto.accountName}. Fee: ₦${fee.toLocaleString()}. New balance: ₦${updatedWallet.balance.toLocaleString()}.`,
          type: 'success',
          data: {
            amount: transferDto.amount,
            fee: fee,
            newBalance: updatedWallet.balance,
            reference,
            recipientName: transferDto.accountName,
            recipientAccount: transferDto.accountNumber,
            recipientBank: transferDto.bankName,
          },
        });
      }

      // Send push notification
      if (this.pushNotificationsService) {
        try {
          await this.pushNotificationsService.sendPushNotificationToUser(userId, {
            title: '💸 Transfer Completed',
            body: `₦${transferDto.amount.toLocaleString()} transferred to ${transferDto.accountName}. New balance: ₦${updatedWallet.balance.toLocaleString()}.`,
            data: {
              type: 'withdrawal',
              amount: transferDto.amount,
              fee: fee,
              newBalance: updatedWallet.balance,
              reference,
              recipientName: transferDto.accountName,
              recipientAccount: transferDto.accountNumber,
              recipientBank: transferDto.bankName,
            },
            priority: 'high',
          });
          console.log('📱 [TRANSFER] Push notification sent for successful transfer');
        } catch (pushError) {
          console.error('❌ [TRANSFER] Failed to send push notification:', pushError);
          // Don't fail the operation if push notification fails
        }
      }

      return {
        success: true,
        message: 'Transfer completed successfully',
        reference,
        amount: transferDto.amount,
        fee,
        newBalance: updatedWallet.balance,
        recipientName: transferDto.accountName,
        recipientAccount: transferDto.accountNumber,
        recipientBank: transferDto.bankName,
      };
    } catch (error) {
      console.error('❌ [TRANSFER] Transfer failed:', error);

      // Create failed transaction record
      const failedTransaction = await this.prisma.walletTransaction.create({
        data: {
          amount: transferDto.amount,
          type: WalletTransactionType.WITHDRAWAL,
          status: TransactionStatus.FAILED,
          reference,
          description: transferDto.description || defaultNarration,
          fee,
          senderWalletId: wallet.id,
          senderBalanceBefore: wallet.balance,
          senderBalanceAfter: wallet.balance, // No change on failure
          metadata: {
            recipientBank: transferDto.bankName,
            recipientAccount: transferDto.accountNumber,
            recipientName: transferDto.accountName,
            error: error.message,
          },
        },
      });

      // Also create a record in the main Transaction table for admin queries
      await this.prisma.transaction.create({
        data: {
          amount: transferDto.amount,
          currency: 'NGN',
          type: 'WITHDRAWAL',
          status: TransactionStatus.FAILED,
          reference,
          description: transferDto.description || defaultNarration,
          userId: userId,
          metadata: {
            fee,
            recipientBank: transferDto.bankName,
            recipientAccount: transferDto.accountNumber,
            recipientName: transferDto.accountName,
            walletTransactionId: failedTransaction.id,
            error: error.message,
          },
        },
      });

      throw new BadRequestException(`Transfer failed: ${error.message}`);
    }
  }

  private async getBankCode(bankName: string): Promise<string> {
    console.log('🏦 [BANK CODE] Looking up bank code for:', bankName);

    try {
      // Get bank list from active transfer provider
      const bankListResponse = await this.transferProviderManager.getBankList();

      if (!bankListResponse.success || !bankListResponse.data) {
        throw new Error('Failed to retrieve bank list from provider');
      }

      const searchTerm = bankName.toLowerCase().trim();
      console.log('🔤 [BANK CODE] Normalized search term:', searchTerm);

      // First try exact match
      let bank = bankListResponse.data.find(
        (bank) => bank.bankName.toLowerCase() === searchTerm,
      );

      // If not found, try partial match (bank name contains search term)
      if (!bank) {
        bank = bankListResponse.data.find((bank) =>
          bank.bankName.toLowerCase().includes(searchTerm),
        );
      }

      // If still not found, try reverse search (search term contains bank name)
      if (!bank) {
        bank = bankListResponse.data.find((bank) =>
          searchTerm.includes(bank.bankName.toLowerCase()),
        );
      }

      if (!bank) {
        console.log('❌ [BANK CODE] Bank not found:', bankName);
        throw new BadRequestException(
          `Bank not found: ${bankName}. Please check the bank name and try again.`,
        );
      }

      console.log(
        '✅ [BANK CODE] Bank found:',
        bank.bankName,
        'Code:',
        bank.bankCode,
      );
      return bank.bankCode;
    } catch (error) {
      console.error('❌ [BANK CODE] Error looking up bank code:', error);
      throw new BadRequestException(
        `Failed to lookup bank code for: ${bankName}. ${error.message}`,
      );
    }
  }

  /**
   * Validate wallet balance against transaction history
   * This ensures the wallet balance always matches the sum of all transactions
   */
  async validateWalletBalance(walletId: string): Promise<{
    isValid: boolean;
    currentBalance: number;
    calculatedBalance: number;
    discrepancy: number;
    message: string;
  }> {
    console.log(
      '🔍 [BALANCE VALIDATION] Validating wallet balance for wallet:',
      walletId,
    );

    try {
      // Get current wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = wallet.balance;
      console.log(
        '💰 [BALANCE VALIDATION] Current wallet balance:',
        currentBalance,
      );

      // Calculate balance from transaction history
      const calculatedBalance =
        await this.calculateBalanceFromTransactions(walletId);
      console.log(
        '🧮 [BALANCE VALIDATION] Calculated balance from transactions:',
        calculatedBalance,
      );

      const discrepancy = Math.abs(currentBalance - calculatedBalance);
      const isValid = discrepancy < 0.01; // Allow for minor floating point differences

      const result = {
        isValid,
        currentBalance,
        calculatedBalance,
        discrepancy,
        message: isValid
          ? 'Wallet balance is valid and matches transaction history'
          : `Wallet balance discrepancy detected! Current: ₦${currentBalance}, Expected: ₦${calculatedBalance}, Difference: ₦${discrepancy}`,
      };

      if (isValid) {
        console.log('✅ [BALANCE VALIDATION] Wallet balance is valid');
      } else {
        console.error('❌ [BALANCE VALIDATION] Balance discrepancy detected!');
        console.error(
          `❌ [BALANCE VALIDATION] Current: ₦${currentBalance}, Expected: ₦${calculatedBalance}, Difference: ₦${discrepancy}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        '❌ [BALANCE VALIDATION] Error validating wallet balance:',
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate expected balance from transaction history
   */
  private async calculateBalanceFromTransactions(
    walletId: string,
  ): Promise<number> {
    console.log(
      '🧮 [BALANCE CALCULATION] Calculating balance from transactions for wallet:',
      walletId,
    );

    // Get all COMPLETED transactions for this wallet (both as sender and receiver)
    // Failed transactions should not affect the balance calculation
    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        AND: [
          {
            OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
          },
          {
            status: 'COMPLETED', // Only count completed transactions
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(
      `🧮 [BALANCE CALCULATION] Found ${transactions.length} transactions`,
    );

    let calculatedBalance = 0;

    for (const transaction of transactions) {
      if (transaction.senderWalletId === walletId) {
        // This wallet sent money (debit)
        calculatedBalance -= transaction.amount + (transaction.fee || 0);
        console.log(
          `➖ [BALANCE CALCULATION] Debit: -₦${transaction.amount + (transaction.fee || 0)} (Amount: ₦${transaction.amount}, Fee: ₦${transaction.fee || 0})`,
        );
      } else if (transaction.receiverWalletId === walletId) {
        // This wallet received money (credit)
        calculatedBalance += transaction.amount;
        console.log(`➕ [BALANCE CALCULATION] Credit: +₦${transaction.amount}`);
      }
    }

    console.log(
      '🧮 [BALANCE CALCULATION] Final calculated balance:',
      calculatedBalance,
    );
    return calculatedBalance;
  }

  /**
   * Reconcile wallet balance with transaction history
   * This method corrects the wallet balance if there's a discrepancy
   */
  async reconcileWalletBalance(
    walletId: string,
    adminUserId?: string,
  ): Promise<{
    success: boolean;
    oldBalance: number;
    newBalance: number;
    discrepancy: number;
    message: string;
  }> {
    console.log(
      '🔧 [BALANCE RECONCILIATION] Starting balance reconciliation for wallet:',
      walletId,
    );

    try {
      // First validate to see if there's a discrepancy
      const validation = await this.validateWalletBalance(walletId);

      if (validation.isValid) {
        return {
          success: true,
          oldBalance: validation.currentBalance,
          newBalance: validation.currentBalance,
          discrepancy: 0,
          message: 'No reconciliation needed - balance is already correct',
        };
      }

      // Update wallet balance to match calculated balance
      const updatedWallet = await this.prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: validation.calculatedBalance,
          lastTransactionAt: new Date(),
        },
      });

      // Log the reconciliation
      console.log(
        '✅ [BALANCE RECONCILIATION] Balance reconciled successfully',
      );
      console.log(
        `✅ [BALANCE RECONCILIATION] Old balance: ₦${validation.currentBalance}`,
      );
      console.log(
        `✅ [BALANCE RECONCILIATION] New balance: ₦${validation.calculatedBalance}`,
      );
      console.log(
        `✅ [BALANCE RECONCILIATION] Discrepancy corrected: ₦${validation.discrepancy}`,
      );

      return {
        success: true,
        oldBalance: validation.currentBalance,
        newBalance: validation.calculatedBalance,
        discrepancy: validation.discrepancy,
        message: `Balance reconciled successfully. Corrected discrepancy of ₦${validation.discrepancy}`,
      };
    } catch (error) {
      console.error(
        '❌ [BALANCE RECONCILIATION] Error reconciling balance:',
        error,
      );
      throw error;
    }
  }

  async getWalletTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    console.log(
      '📊 [TRANSACTIONS] Getting wallet transactions for user:',
      userId,
    );

    // Get user's wallet for additional info
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        virtualAccountNumber: true,
        balance: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Get all user transactions from the transaction table (unified approach)
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        fromAccount: {
          select: {
            id: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
            accountName: true,
          },
        },
        toAccount: {
          select: {
            id: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
            accountName: true,
          },
        },
      },
    });

    console.log(
      '✅ [TRANSACTIONS] Retrieved',
      transactions.length,
      'transactions',
    );

    // Transform to match the expected wallet transaction format
    return transactions.map((transaction) => {
      const metadata = transaction.metadata as any || {};
      const user = transaction.user;

      // Determine sender information
      let sender = null;
      if (transaction.fromAccount) {
        sender = {
          name: transaction.fromAccount.accountName,
          accountNumber: transaction.fromAccount.accountNumber,
        };
      } else if (metadata.adminFunding || metadata.adminDebit) {
        sender = {
          name: 'Monzi Admin',
          accountNumber: 'ADMIN',
        };
      } else if (metadata.provider) {
        sender = {
          name: metadata.providerAccountName || 'External Account',
          accountNumber: metadata.accountNumber || 'EXT',
        };
      } else if (transaction.type === 'WITHDRAWAL' || transaction.type === 'TRANSFER') {
        sender = {
          name: `${user.firstName} ${user.lastName}`,
          accountNumber: wallet.virtualAccountNumber,
        };
      }

      // Determine receiver information
      let receiver = null;
      if (transaction.toAccount) {
        receiver = {
          name: transaction.toAccount.accountName,
          accountNumber: transaction.toAccount.accountNumber,
        };
      } else if (metadata.recipientBank) {
        receiver = {
          name: metadata.recipientName || 'External Account',
          accountNumber: metadata.recipientAccount,
        };
             } else if (transaction.type === 'DEPOSIT') {
         receiver = {
           name: `${user.firstName} ${user.lastName}`,
           accountNumber: wallet.virtualAccountNumber,
         };
       } else if (metadata.provider) {
        receiver = {
          name: metadata.providerAccountName || 'External Account',
          accountNumber: metadata.accountNumber || 'EXT',
        };
      }

             return {
      id: transaction.id,
      amount: transaction.amount,
         type: transaction.type === 'DEPOSIT' && metadata.adminFunding ? 'FUNDING' : transaction.type,
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
         fee: metadata.fee || 0,
      createdAt: transaction.createdAt.toISOString(),
      metadata: transaction.metadata,
         sender,
         receiver,
         bankAccount: transaction.fromAccount || transaction.toAccount || null,
       };
    });
  }
}
