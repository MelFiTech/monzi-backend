import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { FeeType } from '../admin/dto/admin.dto';
import { TransferDto, WalletDetailsResponse, TransferResponse } from './dto/wallet.dto';
import { WalletTransactionType, TransactionStatus } from '@prisma/client';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { TransferProviderManagerService } from '../providers/transfer-provider-manager.service';
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
  ) {}

  /**
   * Generate default narration from user's name
   * Format: "FirstName LastInitial" (e.g., "John S" for "John Smith")
   */
  private generateDefaultNarration(firstName: string, lastName: string): string {
    const firstNameTrimmed = firstName?.trim() || '';
    const lastNameTrimmed = lastName?.trim() || '';
    const lastInitial = lastNameTrimmed.charAt(0).toUpperCase();
    
    return lastInitial ? `${firstNameTrimmed} ${lastInitial}` : firstNameTrimmed;
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
    userBvn?: string
  ): Promise<any> {
    console.log('💳 [WALLET CREATE] Creating wallet for user:', userId);
    
    // Check if wallet already exists
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId }
    });

    if (existingWallet) {
      console.log('⚠️ [WALLET CREATE] Wallet already exists for user:', userId);
      return existingWallet;
    }

    try {
      // Get the active wallet provider
      const walletProvider = await this.providerManager.getActiveWalletProvider();
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
        console.error('❌ [WALLET CREATE] Provider wallet creation failed:', providerResult.error);
        throw new BadRequestException(providerResult.error || 'Failed to create wallet');
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
        }
      });

      console.log('✅ [WALLET CREATE] Wallet created successfully:', {
        accountNumber: wallet.virtualAccountNumber,
        provider: providerName,
        customerId: wallet.providerId
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
      throw new BadRequestException('Failed to create wallet: ' + error.message);
    }
  }

  // Direct fee calculation method to avoid circular dependency
  async calculateFee(feeType: FeeType, amount: number): Promise<number> {
    console.log('💰 [FEE CALCULATION] Calculating fee for type:', feeType, 'amount:', amount);
    
    try {
      const feeConfig = await this.prisma.feeConfiguration.findUnique({
        where: { type: feeType, isActive: true }
      });

      if (!feeConfig) {
        // Default fee if no configuration found
        console.log('⚠️ [FEE CALCULATION] No fee configuration found for type:', feeType);
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
      if (feeConfig.minimumFee && calculatedFee < feeConfig.minimumFee) {
        calculatedFee = feeConfig.minimumFee;
      }

      // Apply maximum fee
      if (feeConfig.maximumFee && calculatedFee > feeConfig.maximumFee) {
        calculatedFee = feeConfig.maximumFee;
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
          select: { firstName: true, lastName: true }
        }
      }
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
      dailyLimit: wallet.dailyLimit,
      monthlyLimit: wallet.monthlyLimit,
      lastTransactionAt: wallet.lastTransactionAt?.toISOString(),
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  async setWalletPin(userId: string, pin: string): Promise<{ success: boolean; message: string }> {
    console.log('🔐 [SET PIN] Setting wallet PIN for user:', userId);

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    await this.prisma.wallet.update({
      where: { userId },
      data: { pin: hashedPin }
    });

    console.log('✅ [SET PIN] Wallet PIN set successfully');

    return {
      success: true,
      message: 'Wallet PIN set successfully'
    };
  }

  async verifyWalletPin(userId: string, pin: string): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId }
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

  async checkSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet.balance >= amount;
  }

  async transferToBank(userId: string, transferDto: TransferDto): Promise<TransferResponse> {
    console.log('💸 [TRANSFER] Processing bank transfer for user:', userId);
    console.log('💸 [TRANSFER] Transfer details:', {
      amount: transferDto.amount,
      accountNumber: transferDto.accountNumber,
      bankName: transferDto.bankName,
      accountName: transferDto.accountName
    });

    // Get user wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new ForbiddenException('Wallet is inactive');
    }

    // Verify PIN
    await this.verifyWalletPin(userId, transferDto.pin);

    // Calculate fee using dynamic fee configuration
    const fee = await this.calculateFee(FeeType.TRANSFER, transferDto.amount);
    const totalDeduction = transferDto.amount + fee;

    // Check sufficient balance
    if (wallet.balance < totalDeduction) {
      throw new BadRequestException(`Insufficient balance. Required: ₦${totalDeduction.toFixed(2)}, Available: ₦${wallet.balance.toFixed(2)}`);
    }

    // Generate transaction reference
    const reference = `TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Generate default narration if not provided
    const defaultNarration = this.generateDefaultNarration(wallet.user.firstName, wallet.user.lastName);

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
          fee: fee
        }
      };

      // Send transfer request to active provider
      const providerResponse = await this.transferProviderManager.transferToBank(transferData);

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
            providerFee: providerResponse.data?.fee
          }
        }
      });

      // Update wallet balance
      const updatedWallet = await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance - totalDeduction,
          lastTransactionAt: new Date()
        }
      });

      console.log('✅ [TRANSFER] Transfer completed successfully');
      console.log('💰 [TRANSFER] New balance:', updatedWallet.balance);

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
      await this.prisma.walletTransaction.create({
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
            error: error.message
          }
        }
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
        (bank) => bank.bankName.toLowerCase() === searchTerm
      );

      // If not found, try partial match (bank name contains search term)
      if (!bank) {
        bank = bankListResponse.data.find(
          (bank) => bank.bankName.toLowerCase().includes(searchTerm)
        );
      }

      // If still not found, try reverse search (search term contains bank name)
      if (!bank) {
        bank = bankListResponse.data.find(
          (bank) => searchTerm.includes(bank.bankName.toLowerCase())
        );
      }

      if (!bank) {
        console.log('❌ [BANK CODE] Bank not found:', bankName);
        throw new BadRequestException(`Bank not found: ${bankName}. Please check the bank name and try again.`);
      }

      console.log('✅ [BANK CODE] Bank found:', bank.bankName, 'Code:', bank.bankCode);
      return bank.bankCode;

    } catch (error) {
      console.error('❌ [BANK CODE] Error looking up bank code:', error);
      throw new BadRequestException(`Failed to lookup bank code for: ${bankName}. ${error.message}`);
    }
  }



  async getWalletTransactions(userId: string, limit: number = 20, offset: number = 0) {
    console.log('📊 [TRANSACTIONS] Getting wallet transactions for user:', userId);

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        OR: [
          { senderWalletId: wallet.id },
          { receiverWalletId: wallet.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        senderWallet: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        receiverWallet: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        },
        bankAccount: true
      }
    });

    console.log('✅ [TRANSACTIONS] Retrieved', transactions.length, 'transactions');

    return transactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      fee: transaction.fee,
      createdAt: transaction.createdAt.toISOString(),
      metadata: transaction.metadata,
      sender: transaction.senderWallet ? {
        name: `${transaction.senderWallet.user.firstName} ${transaction.senderWallet.user.lastName}`,
        accountNumber: transaction.senderWallet.virtualAccountNumber
      } : null,
      receiver: transaction.receiverWallet ? {
        name: `${transaction.receiverWallet.user.firstName} ${transaction.receiverWallet.user.lastName}`,
        accountNumber: transaction.receiverWallet.virtualAccountNumber
      } : null,
      bankAccount: transaction.bankAccount,
    }));
  }
} 