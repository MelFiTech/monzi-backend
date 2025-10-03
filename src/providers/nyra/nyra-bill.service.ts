import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NyraBillProvider, DataPlan, DataPurchaseRequest, AirtimePurchaseRequest } from './nyra-bill.provider';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { PushNotificationsService } from '../../push-notifications/push-notifications.service';
import { WalletTransactionType, TransactionStatus, TransactionType } from '@prisma/client';

export interface BillPurchaseResult {
  success: boolean;
  reference: string;
  amount: number;
  status: string;
  message: string;
}

@Injectable()
export class NyraBillService {
  private readonly logger = new Logger(NyraBillService.name);

  constructor(
    private readonly nyraBillProvider: NyraBillProvider,
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  /**
   * Get all available bill services
   */
  async getServices() {
    try {
      this.logger.log('Fetching available bill services');
      return await this.nyraBillProvider.getServices();
    } catch (error) {
      this.logger.error('Error fetching services:', error);
      throw new Error(`Failed to fetch services: ${error.message}`);
    }
  }

  /**
   * Get data plans for a specific network
   */
  async getDataPlans(network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE'): Promise<DataPlan[]> {
    try {
      this.logger.log(`Fetching data plans for ${network}`);
      return await this.nyraBillProvider.getDataPlans(network);
    } catch (error) {
      this.logger.error(`Error fetching data plans for ${network}:`, error);
      throw new Error(`Failed to fetch data plans for ${network}: ${error.message}`);
    }
  }

  /**
   * Purchase data bundle for a user
   */
  async purchaseData(
    userId: string,
    phoneNumber: string,
    bundleId: string,
    amount: number,
  ): Promise<BillPurchaseResult> {
    try {
      this.logger.log(`Processing data purchase for user ${userId}, phone: ${phoneNumber}, amount: ${amount}`);

      // Get user's wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: { userId },
        include: { user: true },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Check if user has sufficient balance
      if (wallet.balance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Format phone number
      const formattedPhone = this.nyraBillProvider.formatPhoneNumber(phoneNumber);

      // Detect network to validate the bundle
      const network = this.detectNetworkFromPhone(formattedPhone);
      if (!network) {
        throw new BadRequestException('Unable to detect network from phone number');
      }

      // Get available data plans for this network
      const dataPlans = await this.nyraBillProvider.getDataPlans(network);
      
      // Find the specific bundle and validate its cost
      const selectedPlan = dataPlans.find(plan => plan.bundle_id === bundleId);
      if (!selectedPlan) {
        throw new BadRequestException('Selected data plan not found');
      }

      const planCost = parseInt(selectedPlan.amount);
      
      // Validate that the user is paying the correct amount
      if (amount !== planCost) {
        throw new BadRequestException(`Amount mismatch. Plan costs ₦${planCost.toLocaleString()}, but you're paying ₦${amount.toLocaleString()}`);
      }

      // Check if user has sufficient balance for the actual plan cost
      if (wallet.balance < planCost) {
        throw new BadRequestException(`Insufficient balance. Plan costs ₦${planCost.toLocaleString()}, but you only have ₦${wallet.balance.toLocaleString()}`);
      }

      // Prepare request with actual plan cost
      const request: DataPurchaseRequest = {
        phone_number: formattedPhone,
        bundle_id: bundleId,
        amount: planCost, // Use actual plan cost, not user input
      };

      this.logger.log(`Purchasing ${selectedPlan.data_bundle} for ₦${planCost.toLocaleString()}`);

      // Make the purchase
      const response = await this.nyraBillProvider.purchaseData(request);

      if (response.success) {
        // Use atomic transaction to ensure data consistency
        const result = await this.prisma.$transaction(async (tx) => {
          // Record wallet transaction
          const walletTransaction = await tx.walletTransaction.create({
            data: {
              amount: planCost, // Use actual plan cost
              type: WalletTransactionType.WITHDRAWAL,
              status: TransactionStatus.COMPLETED,
              reference: response.data.reference,
              description: `Data purchase for ${formattedPhone} - ${selectedPlan.data_bundle}`,
              fee: 0, // No additional fee for now
              senderWalletId: wallet.id,
              senderBalanceBefore: wallet.balance,
              senderBalanceAfter: wallet.balance - planCost,
              providerReference: response.data.reference,
              providerResponse: JSON.parse(JSON.stringify(response)),
              metadata: {
                phoneNumber: formattedPhone,
                bundleId: bundleId,
                provider: 'NYRA',
                transactionType: 'DATA_PURCHASE',
                originalAmount: planCost,
                planName: selectedPlan.data_bundle,
                network: network,
              },
            },
          });

          // Also create a record in the main Transaction table for wallet history
          const mainTransaction = await tx.transaction.create({
            data: {
              amount: planCost, // Use actual plan cost
              currency: 'NGN',
              type: 'WITHDRAWAL',
              status: TransactionStatus.COMPLETED,
              reference: response.data.reference,
              description: `Data purchase for ${formattedPhone} - ${selectedPlan.data_bundle}`,
              userId: userId,
              metadata: {
                fee: 0,
                phoneNumber: formattedPhone,
                bundleId: bundleId,
                provider: 'NYRA',
                transactionType: 'DATA_PURCHASE',
                originalAmount: planCost,
                planName: selectedPlan.data_bundle,
                network: network,
                walletTransactionId: walletTransaction.id,
                providerReference: response.data.reference,
                providerStatus: response.data.status,
              },
            },
          });

          // Update wallet balance
          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: wallet.balance - planCost, // Use actual plan cost
              lastTransactionAt: new Date(),
            },
          });

          return { walletTransaction, mainTransaction, updatedWallet };
        });

        this.logger.log(`Data purchase successful. Reference: ${response.data.reference}`);

        // Emit real-time notifications
        if (this.notificationsGateway) {
          // Wallet balance update notification
          this.notificationsGateway.emitWalletBalanceUpdate(userId, {
            oldBalance: wallet.balance,
            newBalance: result.updatedWallet.balance,
            change: -planCost,
            currency: 'NGN',
            provider: 'BILL_PAYMENT',
            accountNumber: wallet.virtualAccountNumber,
            grossAmount: planCost,
            fundingFee: 0,
            netAmount: -planCost,
            transactionId: result.mainTransaction.id,
            reference: response.data.reference,
          });

          // Transaction notification
          this.notificationsGateway.emitTransactionNotification(userId, {
            type: 'WITHDRAWAL',
            amount: planCost,
            grossAmount: planCost,
            fee: 0,
            currency: 'NGN',
            description: `Data purchase for ${formattedPhone} - ${selectedPlan.data_bundle}`,
            reference: response.data.reference,
            provider: 'BILL_PAYMENT',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
          });

          // General notification
          this.notificationsGateway.emitNotification(userId, {
            title: 'Data Purchase Successful',
            message: `You purchased ${selectedPlan.data_bundle} for ${formattedPhone}`,
            type: 'success',
            data: {
              amount: planCost,
              phoneNumber: formattedPhone,
              planName: selectedPlan.data_bundle,
              newBalance: result.updatedWallet.balance,
              reference: response.data.reference,
              network: network,
            },
          });
        }

        // Send push notification
        if (this.pushNotificationsService) {
          await this.pushNotificationsService.sendPushNotificationToUser(userId, {
            title: 'Data Purchase Successful',
            body: `You purchased ${selectedPlan.data_bundle} for ${formattedPhone}`,
            data: {
              type: 'bill_payment',
              transactionType: 'DATA_PURCHASE',
              amount: planCost,
              phoneNumber: formattedPhone,
              planName: selectedPlan.data_bundle,
              reference: response.data.reference,
              network: network,
            },
            priority: 'high',
          });
        }

        return {
          success: true,
          reference: response.data.reference,
          amount: planCost, // Return actual plan cost
          status: response.data.status,
          message: `Data purchase successful - ${selectedPlan.data_bundle}`,
        };
      } else {
        throw new Error(response.message || 'Data purchase failed');
      }
    } catch (error) {
      this.logger.error('Error purchasing data:', error);
      throw new Error(`Data purchase failed: ${error.message}`);
    }
  }

  /**
   * Purchase airtime for a user
   */
  async purchaseAirtime(
    userId: string,
    phoneNumber: string,
    amount: number,
  ): Promise<BillPurchaseResult> {
    try {
      this.logger.log(`Processing airtime purchase for user ${userId}, phone: ${phoneNumber}, amount: ${amount}`);

      // Get user's wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: { userId },
        include: { user: true },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Check if user has sufficient balance
      if (wallet.balance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Format phone number
      const formattedPhone = this.nyraBillProvider.formatPhoneNumber(phoneNumber);

      // Prepare request
      const request: AirtimePurchaseRequest = {
        phone_number: formattedPhone,
        amount: amount,
      };

      // Make the purchase
      const response = await this.nyraBillProvider.purchaseAirtime(request);

      if (response.success) {
        // Use atomic transaction to ensure data consistency
        const result = await this.prisma.$transaction(async (tx) => {
          // Record wallet transaction
          const walletTransaction = await tx.walletTransaction.create({
            data: {
              amount: amount,
              type: WalletTransactionType.WITHDRAWAL,
              status: TransactionStatus.COMPLETED,
              reference: response.data.reference,
              description: `Airtime purchase for ${formattedPhone}`,
              fee: 0, // No additional fee for now
              senderWalletId: wallet.id,
              senderBalanceBefore: wallet.balance,
              senderBalanceAfter: wallet.balance - amount,
              providerReference: response.data.reference,
              providerResponse: JSON.parse(JSON.stringify(response)),
              metadata: {
                phoneNumber: formattedPhone,
                provider: 'NYRA',
                transactionType: 'AIRTIME_PURCHASE',
                originalAmount: amount,
              },
            },
          });

          // Also create a record in the main Transaction table for wallet history
          const mainTransaction = await tx.transaction.create({
            data: {
              amount: amount,
              currency: 'NGN',
              type: 'WITHDRAWAL',
              status: TransactionStatus.COMPLETED,
              reference: response.data.reference,
              description: `Airtime purchase for ${formattedPhone}`,
              userId: userId,
              metadata: {
                fee: 0,
                phoneNumber: formattedPhone,
                provider: 'NYRA',
                transactionType: 'AIRTIME_PURCHASE',
                originalAmount: amount,
                walletTransactionId: walletTransaction.id,
                providerReference: response.data.reference,
                providerStatus: response.data.status,
              },
            },
          });

          // Update wallet balance
          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: wallet.balance - amount,
              lastTransactionAt: new Date(),
            },
          });

          return { walletTransaction, mainTransaction, updatedWallet };
        });

        this.logger.log(`Airtime purchase successful. Reference: ${response.data.reference}`);

        // Emit real-time notifications
        if (this.notificationsGateway) {
          // Wallet balance update notification
          this.notificationsGateway.emitWalletBalanceUpdate(userId, {
            oldBalance: wallet.balance,
            newBalance: result.updatedWallet.balance,
            change: -amount,
            currency: 'NGN',
            provider: 'BILL_PAYMENT',
            accountNumber: wallet.virtualAccountNumber,
            grossAmount: amount,
            fundingFee: 0,
            netAmount: -amount,
            transactionId: result.mainTransaction.id,
            reference: response.data.reference,
          });

          // Transaction notification
          this.notificationsGateway.emitTransactionNotification(userId, {
            type: 'WITHDRAWAL',
            amount: amount,
            grossAmount: amount,
            fee: 0,
            currency: 'NGN',
            description: `Airtime purchase for ${formattedPhone}`,
            reference: response.data.reference,
            provider: 'BILL_PAYMENT',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
          });

          // General notification
          this.notificationsGateway.emitNotification(userId, {
            title: 'Airtime Purchase Successful',
            message: `You purchased ₦${amount.toLocaleString()} for ${formattedPhone}`,
            type: 'success',
            data: {
              amount: amount,
              phoneNumber: formattedPhone,
              newBalance: result.updatedWallet.balance,
              reference: response.data.reference,
            },
          });
        }

        // Send push notification
        if (this.pushNotificationsService) {
          await this.pushNotificationsService.sendPushNotificationToUser(userId, {
            title: 'Airtime Purchase Successful',
            body: `You purchased ₦${amount.toLocaleString()} airtime for ${formattedPhone}`,
            data: {
              type: 'bill_payment',
              transactionType: 'AIRTIME_PURCHASE',
              amount: amount,
              phoneNumber: formattedPhone,
              reference: response.data.reference,
            },
            priority: 'high',
          });
        }

        return {
          success: true,
          reference: response.data.reference,
          amount: response.data.amount,
          status: response.data.status,
          message: 'Airtime purchase successful',
        };
      } else {
        throw new Error(response.message || 'Airtime purchase failed');
      }
    } catch (error) {
      this.logger.error('Error purchasing airtime:', error);
      throw new Error(`Airtime purchase failed: ${error.message}`);
    }
  }

  /**
   * Get user's bill purchase history
   */
  async getBillHistory(userId: string, limit: string = '20', offset: string = '0') {
    try {
      const wallet = await this.prisma.wallet.findFirst({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const transactions = await this.prisma.walletTransaction.findMany({
        where: {
          senderWalletId: wallet.id,
          OR: [
            {
              metadata: {
                path: ['transactionType'],
                equals: 'DATA_PURCHASE',
              },
            },
            {
              metadata: {
                path: ['transactionType'],
                equals: 'AIRTIME_PURCHASE',
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      return transactions.map(tx => {
        const metadata = tx.metadata as any;
        return {
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          type: metadata?.transactionType,
          phoneNumber: metadata?.phoneNumber,
          status: tx.status,
          createdAt: tx.createdAt,
          description: tx.description,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching bill history:', error);
      throw new Error(`Failed to fetch bill history: ${error.message}`);
    }
  }

  /**
   * Detect network from phone number
   */
  private detectNetworkFromPhone(phoneNumber: string): 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE' | null {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const formatted = phoneNumber.startsWith('0') ? phoneNumber : '0' + phoneNumber;
    
    // Nigerian mobile network prefixes
    const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906'];
    const airtelPrefixes = ['0802', '0808', '0708', '0812', '0901', '0902', '0904', '0907'];
    const gloPrefixes = ['0805', '0807', '0811', '0815', '0705', '0905'];
    const nineMobilePrefixes = ['0809', '0817', '0818', '0908', '0909'];
    
    for (const prefix of mtnPrefixes) {
      if (formatted.startsWith(prefix)) {
        return 'MTN';
      }
    }
    
    for (const prefix of airtelPrefixes) {
      if (formatted.startsWith(prefix)) {
        return 'AIRTEL';
      }
    }
    
    for (const prefix of gloPrefixes) {
      if (formatted.startsWith(prefix)) {
        return 'GLO';
      }
    }
    
    for (const prefix of nineMobilePrefixes) {
      if (formatted.startsWith(prefix)) {
        return '9MOBILE';
      }
    }
    
    return null;
  }
}
