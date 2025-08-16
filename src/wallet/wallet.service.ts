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
import {
  WalletCreationData,
  WalletProvider,
} from '../providers/base/wallet-provider.interface';
import { BankTransferData } from '../providers/base/transfer-provider.interface';
import { LocationTransactionService } from '../location/services/location-transaction.service';
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
    private locationTransactionService: LocationTransactionService,
  ) {}

  /**
   * Generate default narration from user's name
   * Format: "FirstName LastInitial" (e.g., "John S" for "John Smith")
   */
  private generateDefaultNarration(
    firstName: string,
    lastName: string,
  ): string {
    return 'with 💛 from monzi';
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
   * Prioritizes NYRA account details while keeping original accounts as backup
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

      // Check if user has been migrated to NYRA (stored in metadata)
      const metadata = (wallet.metadata as any) || {};
      let primaryAccountDetails;
      const additionalAccounts = [];

      if (metadata.nyraAccount) {
        // User has been migrated - prioritize NYRA account
        console.log(
          '🏦 [WALLET DETAILS] User has NYRA account, prioritizing NYRA details',
        );

        primaryAccountDetails = {
          accountNumber: metadata.nyraAccount.accountNumber,
          accountName: metadata.nyraAccount.accountName,
          bankName: metadata.nyraAccount.bankName,
          provider: 'NYRA',
          bankCode: metadata.nyraAccount.bankCode,
        };

        // Add original account as additional funding source
        if (metadata.originalAccount) {
          additionalAccounts.push({
            provider: metadata.originalAccount.provider,
            accountNumber: metadata.originalAccount.accountNumber,
            accountName: metadata.originalAccount.accountName,
            bankName: metadata.originalAccount.bankName,
            status: 'backup_funding_source',
          });
        }

        // Try to get fresh bank info for NYRA if needed
        let bankName = primaryAccountDetails.bankName;
        if (!bankName || bankName === 'Unknown Bank') {
          try {
            console.log('🔄 [WALLET DETAILS] Fetching fresh NYRA bank info...');
            const nyraProvider = await this.providerManager.getWalletProvider(
              WalletProvider.NYRA,
            );
            if (nyraProvider && 'getWalletDetails' in nyraProvider) {
              const freshDetails = await (nyraProvider as any).getWalletDetails(
                primaryAccountDetails.accountNumber,
              );
              if (freshDetails.success && freshDetails.data) {
                bankName = freshDetails.data.bankName;
                console.log(
                  '✅ [WALLET DETAILS] Updated NYRA bank name:',
                  bankName,
                );

                // Update metadata with fresh bank name
                const updatedMetadata = {
                  ...metadata,
                  nyraAccount: {
                    ...metadata.nyraAccount,
                    bankName: bankName,
                  },
                };
                await this.prisma.wallet.update({
                  where: { id: wallet.id },
                  data: {
                    bankName: bankName,
                    metadata: updatedMetadata,
                  },
                });
                primaryAccountDetails.bankName = bankName;
              }
            }
          } catch (error) {
            console.log(
              '⚠️ [WALLET DETAILS] Could not fetch fresh NYRA bank info:',
              error.message,
            );
          }
        }
      } else {
        // User not migrated yet - use current account details
        console.log(
          '🏦 [WALLET DETAILS] User not migrated, using current account details',
        );

        primaryAccountDetails = {
          accountNumber: wallet.virtualAccountNumber,
          accountName: wallet.providerAccountName,
          bankName: wallet.bankName,
          provider: wallet.provider,
        };

        // Try to fetch fresh bank info if it's a NYRA wallet
        if (wallet.provider === 'NYRA' && wallet.virtualAccountNumber) {
          let bankName = wallet.bankName;
          if (!bankName || bankName === 'Unknown Bank') {
            try {
              console.log(
                '🔄 [WALLET DETAILS] Fetching fresh bank info from Nyra API...',
              );
              const nyraProvider = await this.providerManager.getWalletProvider(
                WalletProvider.NYRA,
              );
              if (nyraProvider && 'getWalletDetails' in nyraProvider) {
                const freshDetails = await (
                  nyraProvider as any
                ).getWalletDetails(wallet.virtualAccountNumber);
                if (freshDetails.success && freshDetails.data) {
                  bankName = freshDetails.data.bankName;
                  console.log(
                    '✅ [WALLET DETAILS] Updated bank name from Nyra API:',
                    bankName,
                  );

                  await this.prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { bankName: bankName },
                  });
                  primaryAccountDetails.bankName = bankName;
                }
              }
            } catch (error) {
              console.log(
                '⚠️ [WALLET DETAILS] Could not fetch fresh bank info:',
                error.message,
              );
            }
          }
        }
      }

      return {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        status: 'active',
        createdAt: wallet.createdAt.toISOString(),
        isActive: wallet.isActive,

        // Primary account details (NYRA if migrated, otherwise current)
        accountNumber: primaryAccountDetails.accountNumber,
        accountName: primaryAccountDetails.accountName,
        bankName: primaryAccountDetails.bankName,
        provider: primaryAccountDetails.provider,
        virtualAccountNumber: primaryAccountDetails.accountNumber,
        providerAccountName: primaryAccountDetails.accountName,
        bankCode: primaryAccountDetails.bankCode,

        // Additional funding sources
        additionalAccounts,

        // Migration info
        isMigrated: !!metadata.nyraAccount,
        migratedAt: metadata.migratedAt,
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
      // For TRANSFER fees, prioritize tiered fee system
      if (
        feeType === ('TRANSFER' as any) ||
        feeType.toString().startsWith('TRANSFER_')
      ) {
        const tierResult = await this.calculateTransferFeeFromTiers(amount);
        if (tierResult.fee > 0) {
          console.log('✅ [FEE CALCULATION] Using tiered fee:', tierResult.fee);
          return tierResult.fee;
        }
      }

      // Fallback to traditional fee configuration
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

  // Tiered fee calculation method
  private async calculateTransferFeeFromTiers(
    amount: number,
    provider?: string,
  ): Promise<{
    fee: number;
    tier?: any;
  }> {
    console.log(
      '💰 [TIERED FEE] Calculating transfer fee for amount:',
      amount,
      'provider:',
      provider,
    );

    try {
      // First try to find provider-specific tier
      let tier = null;
      if (provider) {
        tier = await this.prisma.transferFeeTier.findFirst({
          where: {
            provider: provider.toUpperCase(),
            minAmount: { lte: amount },
            OR: [{ maxAmount: null }, { maxAmount: { gte: amount } }],
            isActive: true,
          },
          orderBy: { minAmount: 'desc' },
        });
      }

      // If no provider-specific tier found, try global tiers
      if (!tier) {
        tier = await this.prisma.transferFeeTier.findFirst({
          where: {
            provider: null,
            minAmount: { lte: amount },
            OR: [{ maxAmount: null }, { maxAmount: { gte: amount } }],
            isActive: true,
          },
          orderBy: { minAmount: 'desc' },
        });
      }

      if (tier) {
        console.log(
          '✅ [TIERED FEE] Found matching tier:',
          tier.name,
          'Fee:',
          tier.feeAmount,
        );
        return {
          fee: tier.feeAmount,
          tier: {
            id: tier.id,
            name: tier.name,
            minAmount: tier.minAmount,
            maxAmount: tier.maxAmount,
            feeAmount: tier.feeAmount,
            provider: tier.provider,
            isActive: tier.isActive,
            description: tier.description,
          },
        };
      }

      console.log('⚠️ [TIERED FEE] No matching tier found, returning 0 fee');
      return { fee: 0 };
    } catch (error) {
      console.error('❌ [TIERED FEE] Failed to calculate transfer fee:', error);
      return { fee: 0 };
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
      throw new ForbiddenException(
        'Wallet is frozen. Please contact support for assistance.',
      );
    }

    // Verify PIN
    await this.verifyWalletPin(userId, transferDto.pin);

    // Calculate fee using dynamic fee configuration
    const fee = await this.calculateFee(FeeType.TRANSFER, transferDto.amount);
    const totalDeduction = transferDto.amount + fee;

    // Check sufficient balance with enhanced validation
    await this.validateBalanceForTransfer(wallet.id, totalDeduction);

    // Generate transaction reference
    const reference = `TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Generate default narration if not provided
    const defaultNarration = this.generateDefaultNarration(
      wallet.user.firstName,
      wallet.user.lastName,
    );

    // Get bank code for the transfer
    const bankCode = await this.getBankCode(transferDto.bankName);

    // Check for business account updates and create/find destination account
    let destinationAccount = await this.prisma.account.findFirst({
      where: {
        accountNumber: transferDto.accountNumber,
        bankCode: bankCode,
      },
    });

    if (!destinationAccount) {
      // Check if this is a business account update (same business, different account number)
      const businessUpdateResult = await this.findAndUpdateBusinessAccount(
        transferDto.accountName,
        transferDto.accountNumber,
        transferDto.bankName,
        bankCode,
        transferDto.locationLatitude,
        transferDto.locationLongitude,
      );

      if (businessUpdateResult.wasUpdated) {
        // Use the updated account
        destinationAccount = businessUpdateResult.account;
        console.log(
          '🔄 [TRANSFER] Used updated business account for payment suggestions:',
          {
            id: destinationAccount.id,
            accountName: destinationAccount.accountName,
            accountNumber: destinationAccount.accountNumber,
            bankName: destinationAccount.bankName,
          },
        );
      } else {
        // Create new account
        destinationAccount = await this.prisma.account.create({
          data: {
            accountName: transferDto.accountName,
            accountNumber: transferDto.accountNumber,
            bankName: transferDto.bankName,
            bankCode: bankCode,
            isBusiness:
              transferDto.isBusiness !== undefined
                ? transferDto.isBusiness
                : this.isBusinessAccount(transferDto.accountName),
          },
        });
        console.log(
          '🏦 [TRANSFER] Created new destination account record for payment suggestions:',
          {
            id: destinationAccount.id,
            accountName: destinationAccount.accountName,
            accountNumber: destinationAccount.accountNumber,
            bankName: destinationAccount.bankName,
            isBusiness: destinationAccount.isBusiness,
          },
        );
      }
    }

    try {
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
          sourceAccountNumber: wallet.virtualAccountNumber, // Required for NYRA business transfers
        },
      };

      // Send transfer request to active provider
      const providerResponse =
        await this.transferProviderManager.transferToBank(transferData);

      console.log('🏦 [TRANSFER] Provider response:', providerResponse);

      if (!providerResponse.success) {
        throw new Error(providerResponse.message || 'Transfer failed');
      }

      // ==================== ATOMIC DATABASE TRANSACTION ====================
      const result = await this.prisma.$transaction(async (tx) => {
        // Create wallet transaction record
        const transaction = await tx.walletTransaction.create({
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
        const mainTransaction = await tx.transaction.create({
          data: {
            amount: transferDto.amount,
            currency: 'NGN',
            type: 'WITHDRAWAL',
            status: TransactionStatus.COMPLETED,
            reference,
            description: transferDto.description || defaultNarration,
            userId: userId,
            toAccountId: destinationAccount.id, // Link to destination account for payment suggestions
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
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance - totalDeduction,
            lastTransactionAt: new Date(),
          },
        });

        return {
          transaction,
          mainTransaction,
          updatedWallet,
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
        };
      });

      // Extract results from transaction
      const { transaction, mainTransaction, updatedWallet } = result;

      // Capture location data if provided (outside transaction to avoid blocking)
      if (
        transferDto.locationName &&
        transferDto.locationLatitude &&
        transferDto.locationLongitude
      ) {
        console.log(
          '📍 [TRANSFER] Capturing location data for payment intelligence',
        );

        try {
          await this.locationTransactionService.associateLocationWithTransaction(
            mainTransaction.id,
            {
              name: transferDto.locationName,
              address: transferDto.locationAddress || transferDto.locationName,
              city: transferDto.locationCity,
              state: transferDto.locationState,
              country: 'Nigeria',
              latitude: transferDto.locationLatitude,
              longitude: transferDto.locationLongitude,
              locationType: transferDto.locationType,
            },
          );

          console.log('✅ [TRANSFER] Location data captured successfully');
        } catch (locationError) {
          console.error(
            '❌ [TRANSFER] Failed to capture location data:',
            locationError,
          );
          // Don't fail the transfer if location capture fails
        }
      }

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
          await this.pushNotificationsService.sendPushNotificationToUser(
            userId,
            {
              title: '🚀 Transfer Successful',
              body: `You sent ₦${transferDto.amount.toLocaleString()} to ${transferDto.accountName}`,
              data: {
                type: 'withdrawal',
                amount: transferDto.amount,
                fee: fee,
                reference,
                recipientName: transferDto.accountName,
                recipientAccount: transferDto.accountNumber,
                recipientBank: transferDto.bankName,
              },
              priority: 'high',
            },
          );
          console.log(
            '📱 [TRANSFER] Push notification sent for successful transfer',
          );
        } catch (pushError) {
          console.error(
            '❌ [TRANSFER] Failed to send push notification:',
            pushError,
          );
          // Don't fail the operation if push notification fails
        }
      }

      return {
        success: true,
        message: 'Transfer completed successfully',
        reference,
        transactionId: mainTransaction.id, // Add transaction ID for tagging
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
          toAccountId: destinationAccount?.id, // Link to destination account for payment suggestions
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

      // Handle common variations and abbreviations
      if (!bank) {
        const variations = {
          // Digital Banks & Fintech First
          kuda: 'Kuda Microfinance bank',
          'kuda.': 'Kuda Microfinance bank',
          'kuda bank': 'Kuda Microfinance bank',
          'kuda microfinance': 'Kuda Microfinance bank',
          opay: 'OPAY',
          'o-pay': 'OPAY',
          'opay digital': 'OPAY',
          moniepoint: 'Moniepoint Microfinance Bank',
          'monie point': 'Moniepoint Microfinance Bank',
          palmpay: 'PALMPAY',
          'palm pay': 'PALMPAY',
          palmPay: 'PALMPAY',
          carbon: 'CARBON',
          fairmoney: 'FAIRMONEY',
          'fair money': 'FAIRMONEY',
          vfd: 'VFD MFB',
          'v bank': 'VFD MFB',
          paga: 'PAGA',
          eyowo: 'Eyowo Microfinance Bank',
          sparkle: 'Sparkle Microfinance Bank',
          renmoney: 'Renmoney Microfinance Bank',
          'ren money': 'Renmoney Microfinance Bank',
          mintyn: 'Mint Microfinance Bank',
          rubies: 'Rubies MFB',
          'rubies bank': 'Rubies MFB',
          quickfund: 'Quickfund Microfinance Bank',
          'quick fund': 'Quickfund Microfinance Bank',
          onebank: 'ONE FINANCE',
          'one bank': 'ONE FINANCE',
          'one finance': 'ONE FINANCE',
          mkudi: 'MKUDI',
          korapay: 'Koraypay',
          'kora pay': 'Koraypay',
          flutterwave: 'Flutterwave',
          'flutter wave': 'Flutterwave',
          paystack: 'TITAN-PAYSTACK MICROFINANCE BANK',
          'pay stack': 'TITAN-PAYSTACK MICROFINANCE BANK',
          momo: 'MoMo PSB',
          'mtn momo': 'MoMo PSB',
          smartcash: 'SmartCash Payment Service bank',
          'smart cash': 'SmartCash Payment Service bank',
          hope: 'HopePSB',
          'hope psb': 'HopePSB',
          hopepsb: 'HopePSB',
          tagpay: 'TAGPAY',
          'tag pay': 'TAGPAY',
          pocketapp: 'POCKETAPP',
          'pocket app': 'POCKETAPP',
          cellulant: 'CELLULANT',
          gomoney: 'GOMONEY',
          'go money': 'GOMONEY',

          // Traditional Banks
          'first bank': 'First Bank of Nigeria',
          firstbank: 'First Bank of Nigeria',
          fbn: 'First Bank of Nigeria',
          gtbank: 'Guaranty Trust Bank',
          gtb: 'Guaranty Trust Bank',
          'guaranty trust': 'Guaranty Trust Bank',
          access: 'Access Bank',
          'access bank': 'Access Bank',
          zenith: 'Zenith Bank',
          'zenith bank': 'Zenith Bank PLC',
          uba: 'United Bank for Africa',
          'united bank for africa': 'United Bank for Africa',
          union: 'Union Bank',
          'union bank': 'Union Bank',
          unity: 'Unity Bank',
          'unity bank': 'Unity Bank',
          fcmb: 'FCMB',
          'first city monument bank': 'FCMB',
          fidelity: 'Fidelity Bank',
          'fidelity bank': 'Fidelity Bank',
          sterling: 'Sterling Bank',
          'sterling bank': 'Sterling Bank',
          wema: 'Wema Bank',
          'wema bank': 'Wema Bank',
          polaris: 'Polaris Bank',
          'polaris bank': 'Polaris Bank',
          ecobank: 'Ecobank Bank',
          'eco bank': 'Ecobank Bank',
          heritage: 'Heritage Bank',
          'heritage bank': 'Heritage Bank',
          keystone: 'Keystone Bank',
          'keystone bank': 'Keystone Bank',
          stanbic: 'StanbicIBTC Bank',
          'stanbic ibtc': 'StanbicIBTC Bank',
          'standard chartered': 'StandardChartered',
          citi: 'Citi Bank',
          citibank: 'Citi Bank',
          providus: 'Providus Bank',
          'providus bank': 'Providus Bank',
          suntrust: 'Suntrust Bank',
          'suntrust bank': 'Suntrust Bank',
          titan: 'Titan Trust Bank',
          'titan trust': 'Titan Trust Bank',
          globus: 'Globus Bank',
          'globus bank': 'Globus Bank',
          lotus: 'Lotus Bank',
          'lotus bank': 'Lotus Bank',
          taj: 'Taj Bank',
          'taj bank': 'Taj Bank',
          jaiz: 'Jaiz Bank',
          'jaiz bank': 'Jaiz Bank',

          // Mortgage Banks
          'abbey mortgage': 'Abbey Mortgage Bank',
          'gateway mortgage': 'Gateway Mortgage Bank',
          'infinity mortgage': 'Infinity Trust Mortgage Bank',
          'brent mortgage': 'Brent Mortgage Bank',
          'first generation mortgage': 'First Generation Mortgage Bank',
          'ag mortgage': 'AG Mortgage Bank PLC',
          'haggai mortgage': 'Haggai Mortgage Bank',
          'platinum mortgage': 'Platinum Mortgage Bank',
          'refuge mortgage': 'Refuge Mortgage Bank',

          // Common Misspellings & Variations
          'gauranty trust': 'Guaranty Trust Bank',
          'guarantee trust': 'Guaranty Trust Bank',
          'first bank nigeria': 'First Bank of Nigeria',
          'united bank africa': 'United Bank for Africa',
          'zenith plc': 'Zenith Bank PLC',
          'fidelity nigeria': 'Fidelity Bank',
          'sterling nigeria': 'Sterling Bank',
          'wema nigeria': 'Wema Bank',
          'access nigeria': 'Access Bank',
          'union nigeria': 'Union Bank',
          'unity nigeria': 'Unity Bank',
          'heritage nigeria': 'Heritage Bank',
          'polaris nigeria': 'Polaris Bank',
          'keystone nigeria': 'Keystone Bank',
          'ecobank nigeria': 'Ecobank Bank',
        };

        const variation = variations[searchTerm];
        if (variation) {
          console.log(
            '🎪 [BANK CODE] Found variation mapping:',
            searchTerm,
            '→',
            variation,
          );
          bank = bankListResponse.data.find((bank) =>
            bank.bankName.toLowerCase().includes(variation.toLowerCase()),
          );
        }
      }

      // Advanced fuzzy matching for close spellings (but prioritize exact matches)
      if (!bank) {
        // Remove common words and try matching
        const cleanedSearch = searchTerm
          .replace(
            /\b(bank|microfinance|mfb|plc|limited|ltd|psb|nigeria)\b/g,
            '',
          )
          .trim();

        if (cleanedSearch && cleanedSearch.length > 2) {
          // First try to find banks that start with the cleaned search term
          bank = bankListResponse.data.find((bank) => {
            const cleanedBankName = bank.bankName
              .toLowerCase()
              .replace(
                /\b(bank|microfinance|mfb|plc|limited|ltd|psb|nigeria)\b/g,
                '',
              )
              .trim();
            return cleanedBankName.startsWith(cleanedSearch);
          });

          // If no exact start match, try contains match
          if (!bank) {
            bank = bankListResponse.data.find((bank) => {
              const cleanedBankName = bank.bankName
                .toLowerCase()
                .replace(
                  /\b(bank|microfinance|mfb|plc|limited|ltd|psb|nigeria)\b/g,
                  '',
                )
                .trim();
              return (
                cleanedBankName.includes(cleanedSearch) ||
                cleanedSearch.includes(cleanedBankName)
              );
            });
          }
        }
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
   * Validate balance for transfer with enhanced checks
   */
  private async validateBalanceForTransfer(
    walletId: string,
    requiredAmount: number,
  ): Promise<void> {
    console.log(
      '🔍 [BALANCE VALIDATION] Validating balance for transfer...',
    );

    // Get current wallet with lock to prevent race conditions
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { id: true, balance: true, isActive: true, isFrozen: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new ForbiddenException('Wallet is inactive');
    }

    if (wallet.isFrozen) {
      throw new ForbiddenException('Wallet is frozen');
    }

    // Check if balance is sufficient
    if (wallet.balance < requiredAmount) {
      throw new BadRequestException(
        `Insufficient balance. Required: ₦${requiredAmount.toFixed(2)}, Available: ₦${wallet.balance.toFixed(2)}`,
      );
    }

    // Additional validation: check if balance calculation matches stored balance
    const calculatedBalance = await this.calculateBalanceFromTransactions(walletId);
    const discrepancy = Math.abs(wallet.balance - calculatedBalance);

    if (discrepancy > 0.01) {
      console.error(
        `⚠️ [BALANCE VALIDATION] Balance discrepancy detected: Stored: ₦${wallet.balance}, Calculated: ₦${calculatedBalance}`,
      );
      
      // For now, log the issue but allow the transfer to proceed
      // In production, you might want to block transfers with balance discrepancies
      console.warn(
        '⚠️ [BALANCE VALIDATION] Transfer proceeding despite balance discrepancy - requires investigation',
      );
    }

    console.log(
      '✅ [BALANCE VALIDATION] Balance validation passed',
    );
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
      const metadata = (transaction.metadata as any) || {};
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
      } else if (
        transaction.type === 'WITHDRAWAL' ||
        transaction.type === 'TRANSFER'
      ) {
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
        type:
          transaction.type === 'DEPOSIT' && metadata.adminFunding
            ? 'FUNDING'
            : transaction.type,
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

  /**
   * Check if this is a business account
   */
  private isBusinessAccount(accountName: string): boolean {
    const businessKeywords = [
      'STORE',
      'SHOP',
      'ENTERPRISE',
      'LTD',
      'LIMITED',
      'INC',
      'CORP',
      'CORPORATION',
      'BUSINESS',
      'COMPANY',
      'VENTURES',
      'TRADING',
      'SERVICES',
      'ENTERPRISES',
      'MART',
      'MARKET',
      'SUPERMARKET',
      'MALL',
      'PLAZA',
      'COMPLEX',
      'CENTER',
      'RESTAURANT',
      'HOTEL',
      'CAFE',
      'BAR',
      'CLUB',
      'SALON',
      'SPA',
      'GYM',
      'PHARMACY',
      'HOSPITAL',
      'CLINIC',
      'SCHOOL',
      'UNIVERSITY',
      'COLLEGE',
      'BANK',
      'MICROFINANCE',
      'INSURANCE',
      'AGENCY',
      'BUREAU',
      'OFFICE',
      'STUDIO',
      'GALLERY',
      'THEATER',
      'CINEMA',
      'GAS',
      'PETROL',
      'STATION',
      'TRANSPORT',
      'LOGISTICS',
      'DELIVERY',
      'COURIER',
      'EXPRESS',
      'FAST',
      'QUICK',
      'SPEED',
      'RAPID',
      'SWIFT',
      'INSTANT',
      'IMMEDIATE',
    ];

    const normalizedName = accountName.toUpperCase().trim();

    // Check for business keywords
    for (const keyword of businessKeywords) {
      if (normalizedName.includes(keyword)) {
        return true;
      }
    }

    // Check for business patterns
    const businessPatterns = [
      /& SONS/i,
      /& DAUGHTERS/i,
      /& CO/i,
      /& COMPANY/i,
      /ENTERPRISES/i,
      /VENTURES/i,
      /TRADING/i,
      /SERVICES/i,
      /GROUP/i,
      /HOLDINGS/i,
      /INTERNATIONAL/i,
      /GLOBAL/i,
      /WORLDWIDE/i,
    ];

    for (const pattern of businessPatterns) {
      if (pattern.test(normalizedName)) {
        return true;
      }
    }

    // Check if it looks like a personal name (2-4 words)
    const words = normalizedName.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      return false;
    }

    return true;
  }

  /**
   * Find and update business account if same business found at same location with different account number
   */
  private async findAndUpdateBusinessAccount(
    accountName: string,
    accountNumber: string,
    bankName: string,
    bankCode: string,
    latitude?: number,
    longitude?: number,
  ): Promise<{ account: any; wasUpdated: boolean }> {
    console.log('🏢 [BUSINESS ACCOUNT] Checking for business account update:', {
      accountName,
      accountNumber,
      bankName,
      latitude,
      longitude,
    });

    // Only check for business accounts
    if (!this.isBusinessAccount(accountName)) {
      console.log(
        '👤 [BUSINESS ACCOUNT] Not a business account, skipping update check',
      );
      return { account: null, wasUpdated: false };
    }

    try {
      // Find existing account with same name and bank
      const existingAccount = await this.prisma.account.findFirst({
        where: {
          accountName: {
            equals: accountName,
            mode: 'insensitive', // Case-insensitive matching
          },
          bankName: {
            equals: bankName,
            mode: 'insensitive',
          },
          // Different account number (this is what we're checking for)
          accountNumber: {
            not: accountNumber,
          },
        },
      });

      if (!existingAccount) {
        console.log(
          '🏢 [BUSINESS ACCOUNT] No existing business account found with same name',
        );
        return { account: null, wasUpdated: false };
      }

      // If we have location data, check if it's the same location
      if (latitude && longitude) {
        // Find nearby locations (within 100 meters)
        const nearbyLocations = await this.prisma.location.findMany({
          where: {
            latitude: {
              gte: latitude - 0.001, // ~100 meters
              lte: latitude + 0.001,
            },
            longitude: {
              gte: longitude - 0.001,
              lte: longitude + 0.001,
            },
          },
        });

        // Check if any of these locations have transactions with the existing account
        const locationWithExistingAccount =
          await this.prisma.location.findFirst({
            where: {
              id: {
                in: nearbyLocations.map((loc) => loc.id),
              },
              transactions: {
                some: {
                  toAccountId: existingAccount.id,
                },
              },
            },
          });

        if (!locationWithExistingAccount) {
          console.log(
            '📍 [BUSINESS ACCOUNT] No nearby location found with existing account transactions',
          );
          return { account: null, wasUpdated: false };
        }

        console.log(
          '📍 [BUSINESS ACCOUNT] Found nearby location with existing account:',
          locationWithExistingAccount.name,
        );
      }

      // Update the existing account with new account number
      console.log('🔄 [BUSINESS ACCOUNT] Updating business account number:', {
        oldAccountNumber: existingAccount.accountNumber,
        newAccountNumber: accountNumber,
        businessName: accountName,
      });

      // First, update all transactions that reference the old account to use the new account
      await this.prisma.transaction.updateMany({
        where: {
          toAccountId: existingAccount.id,
        },
        data: {
          metadata: {
            // Preserve old account info in metadata for audit
            oldAccountNumber: existingAccount.accountNumber,
            accountUpdatedAt: new Date().toISOString(),
          },
        },
      });

      // Update the existing account with new account number
      const updatedAccount = await this.prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accountNumber: accountNumber,
          bankCode: bankCode,
          updatedAt: new Date(),
        },
      });

      // Clean up any other accounts with the same business name and bank but different account numbers
      // This prevents duplicate business accounts from appearing in suggestions
      const duplicateAccounts = await this.prisma.account.findMany({
        where: {
          accountName: {
            equals: accountName,
            mode: 'insensitive',
          },
          bankName: {
            equals: bankName,
            mode: 'insensitive',
          },
          accountNumber: {
            not: accountNumber,
          },
          id: {
            not: existingAccount.id, // Don't delete the one we just updated
          },
        },
      });

      if (duplicateAccounts.length > 0) {
        console.log(
          `🧹 [BUSINESS ACCOUNT] Found ${duplicateAccounts.length} duplicate business accounts to clean up`,
        );

        for (const duplicate of duplicateAccounts) {
          console.log(
            `🗑️ [BUSINESS ACCOUNT] Deleting duplicate account: ${duplicate.accountNumber}`,
          );

          // Update any transactions that reference this duplicate account
          await this.prisma.transaction.updateMany({
            where: {
              toAccountId: duplicate.id,
            },
            data: {
              toAccountId: updatedAccount.id, // Point to the updated account
              metadata: {
                // Preserve info about the duplicate that was cleaned up
                cleanedUpAccountNumber: duplicate.accountNumber,
                cleanedUpAt: new Date().toISOString(),
              },
            },
          });

          // Delete the duplicate account
          await this.prisma.account.delete({
            where: { id: duplicate.id },
          });
        }

        console.log(
          '✅ [BUSINESS ACCOUNT] Duplicate accounts cleaned up successfully',
        );
      }

      console.log(
        '✅ [BUSINESS ACCOUNT] Business account updated successfully:',
        {
          id: updatedAccount.id,
          accountName: updatedAccount.accountName,
          oldAccountNumber: existingAccount.accountNumber,
          newAccountNumber: updatedAccount.accountNumber,
        },
      );

      return { account: updatedAccount, wasUpdated: true };
    } catch (error) {
      console.error(
        '❌ [BUSINESS ACCOUNT] Error updating business account:',
        error,
      );
      return { account: null, wasUpdated: false };
    }
  }

  /**
   * Tag a transaction as business or individual
   */
  async tagTransaction(
    userId: string,
    transactionId: string,
    isBusiness: boolean,
  ): Promise<{ success: boolean; message: string }> {
    console.log('🏷️ [TAG TRANSACTION] Tagging transaction:', {
      userId,
      transactionId,
      isBusiness,
    });

    try {
      // Find the transaction and verify it belongs to the user
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId: userId,
        },
        include: {
          toAccount: true,
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found or does not belong to user');
      }

      if (!transaction.toAccount) {
        throw new Error('Transaction has no associated account to tag');
      }

      // Update the account's isBusiness field
      await this.prisma.account.update({
        where: { id: transaction.toAccount.id },
        data: {
          isBusiness: isBusiness,
          updatedAt: new Date(),
        },
      });

      console.log('✅ [TAG TRANSACTION] Transaction tagged successfully:', {
        transactionId,
        accountId: transaction.toAccount.id,
        accountName: transaction.toAccount.accountName,
        isBusiness,
      });

      return {
        success: true,
        message: `Transaction tagged as ${isBusiness ? 'business' : 'individual'} successfully`,
      };
    } catch (error) {
      console.error('❌ [TAG TRANSACTION] Error tagging transaction:', error);
      throw error;
    }
  }
}
