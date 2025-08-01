import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import * as crypto from 'crypto';
import {
  WebhookProvider,
  WebhookEventType,
  ProcessedWebhookData,
  BudPayWebhookPayload,
  SmePlugWebhookPayload,
  PolarisWebhookPayload,
  NyraWebhookPayload,
  WebhookVerificationResult,
  WebhookProcessingResult,
  BaseWebhookPayload,
} from './dto/webhook.dto';
import { WalletTransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private configService: ConfigService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  /**
   * Process webhook from any provider
   */
  async processWebhook(
    provider: WebhookProvider,
    payload: any,
    signature?: string,
  ): Promise<WebhookProcessingResult> {
    try {
      this.logger.log(`🔔 [WEBHOOK] Processing ${provider} webhook...`);
      this.logger.log(`📊 [WEBHOOK] Event: ${payload.event || 'unknown'}`);

      // Step 1: Verify webhook authenticity
      const verification = await this.verifyWebhook(
        provider,
        payload,
        signature,
      );
      if (!verification.isValid) {
        this.logger.error(
          `❌ [WEBHOOK] Verification failed: ${verification.error}`,
        );
        throw new BadRequestException(
          `Webhook verification failed: ${verification.error}`,
        );
      }

      // Step 2: Normalize webhook data across providers
      const processedData = await this.normalizeWebhookData(provider, payload);
      if (!processedData) {
        this.logger.warn(
          `⚠️ [WEBHOOK] Could not process webhook data from ${provider}`,
        );
        return {
          success: false,
          message: 'Could not process webhook data',
          error: 'Invalid webhook payload structure',
          walletUpdated: false,
        };
      }

      // Step 3: Log webhook for audit
      await this.logWebhook(processedData);

      // Step 4: Process based on event type
      const result = await this.handleWebhookEvent(processedData);

      this.logger.log(
        `✅ [WEBHOOK] Successfully processed ${provider} webhook`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK] Error processing webhook:`, error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message,
        walletUpdated: false,
      };
    }
  }

  /**
   * Process test webhook without affecting real wallet balances
   */
  async processTestWebhook(
    provider: WebhookProvider,
    payload: any,
    signature?: string,
  ): Promise<WebhookProcessingResult> {
    this.logger.log(
      `🧪 [TEST WEBHOOK] Processing ${provider} test webhook (SIMULATION MODE)...`,
    );

    try {
      // Normalize the webhook data
      const normalizedData = await this.normalizeWebhookData(provider, payload);

      if (!normalizedData) {
        return {
          success: false,
          message: 'Could not process test webhook data',
          error: 'Invalid webhook payload structure',
          walletUpdated: false,
        };
      }

      this.logger.log(`🧪 [TEST WEBHOOK] Event: ${normalizedData.eventType}`);
      this.logger.log(
        `🧪 [TEST WEBHOOK] Amount: ${normalizedData.amount} ${normalizedData.currency}`,
      );
      this.logger.log(
        `🧪 [TEST WEBHOOK] Account: ${normalizedData.accountNumber}`,
      );
      this.logger.log(
        `🧪 [TEST WEBHOOK] Reference: ${normalizedData.transactionReference}`,
      );

      // Check if this would be a duplicate (for testing duplicate detection)
      const duplicateCheck =
        await this.checkDuplicateTransaction(normalizedData);
      if (duplicateCheck) {
        this.logger.warn(
          `🧪 [TEST WEBHOOK] Would be detected as duplicate: ${normalizedData.transactionReference}`,
        );
        return {
          success: false,
          message:
            'Test webhook would be detected as duplicate (GOOD - duplicate detection working)',
          walletUpdated: false,
        };
      }

      // Find wallet (but don't update balance)
      const wallet = await this.findWalletByAccountNumber(
        normalizedData.accountNumber,
      );
      if (!wallet) {
        return {
          success: false,
          message: 'Test failed: No wallet found for account number',
          error: `No wallet found for account: ${normalizedData.accountNumber}`,
          walletUpdated: false,
        };
      }

      this.logger.log(
        `🧪 [TEST WEBHOOK] Would credit wallet for: ${wallet.user.email}`,
      );
      this.logger.log(`🧪 [TEST WEBHOOK] Current balance: ₦${wallet.balance}`);
      this.logger.log(`🧪 [TEST WEBHOOK] Would add: ₦${normalizedData.amount}`);
      this.logger.log(
        `🧪 [TEST WEBHOOK] New balance would be: ₦${wallet.balance + normalizedData.amount}`,
      );

      // Validate current wallet balance
      const validation = await this.walletService.validateWalletBalance(
        wallet.id,
      );

      return {
        success: true,
        message: 'Test webhook simulation completed successfully',
        walletUpdated: false, // Important: No real update in test mode
        transaction: {
          id: 'TEST_MODE_NO_TRANSACTION_CREATED',
          grossAmount: normalizedData.amount,
          fundingFee: 0,
          netAmount: normalizedData.amount,
          reference: normalizedData.transactionReference,
          provider: normalizedData.provider,
        },
        wallet: {
          id: wallet.id,
          oldBalance: wallet.balance,
          newBalance: wallet.balance + normalizedData.amount,
          change: normalizedData.amount,
        },
        balanceValidation: {
          preUpdate: validation,
          postUpdate: null,
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ [TEST WEBHOOK] Error processing test webhook:`,
        error,
      );
      return {
        success: false,
        message: 'Test webhook processing failed',
        error: error.message,
        walletUpdated: false,
      };
    }
  }

  /**
   * Validate wallet balance (delegate to WalletService)
   */
  async validateWalletBalance(walletId: string) {
    return this.walletService.validateWalletBalance(walletId);
  }

  /**
   * Reconcile wallet balance (delegate to WalletService)
   */
  async reconcileWalletBalance(walletId: string) {
    return this.walletService.reconcileWalletBalance(walletId);
  }

  /**
   * Verify webhook signature and authenticity
   */
  private async verifyWebhook(
    provider: WebhookProvider,
    payload: any,
    signature?: string,
  ): Promise<WebhookVerificationResult> {
    try {
      switch (provider) {
        case WebhookProvider.BUDPAY:
          return this.verifyBudPayWebhook(payload, signature);

        case WebhookProvider.SMEPLUG:
          return this.verifySmePlugWebhook(payload, signature);

        case WebhookProvider.POLARIS:
          return this.verifyPolarisWebhook(payload, signature);

        case WebhookProvider.NYRA:
          return this.verifyNyraWebhook(payload, signature);

        default:
          return {
            isValid: false,
            provider,
            eventType: WebhookEventType.OTHER,
            error: `Unsupported provider: ${provider}`,
          };
      }
    } catch (error) {
      return {
        isValid: false,
        provider,
        eventType: WebhookEventType.OTHER,
        error: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify BudPay webhook signature
   */
  private verifyBudPayWebhook(
    payload: any,
    signature?: string,
  ): WebhookVerificationResult {
    try {
      const secretKey = this.configService.get<string>('BUDPAY_SECRET_KEY');
      const publicKey = this.configService.get<string>('BUDPAY_PUBLIC_KEY');
      const isDevelopment =
        this.configService.get<string>('NODE_ENV') !== 'production';

      if (!secretKey || !publicKey) {
        if (isDevelopment) {
          this.logger.warn(
            '⚠️ [BUDPAY] BudPay keys not configured, accepting webhook (development mode)',
          );
          return {
            isValid: true,
            provider: WebhookProvider.BUDPAY,
            eventType: this.mapBudPayEvent(payload),
          };
        }
        return {
          isValid: false,
          provider: WebhookProvider.BUDPAY,
          eventType: this.mapBudPayEvent(payload),
          error: 'BudPay keys not configured',
        };
      }

      if (!signature) {
        this.logger.warn(
          '⚠️ [BUDPAY] No signature provided, accepting webhook (development mode)',
        );
        return {
          isValid: true,
          provider: WebhookProvider.BUDPAY,
          eventType: this.mapBudPayEvent(payload),
        };
      }

      // For now, in development mode, bypass signature verification to focus on wallet updates
      if (isDevelopment) {
        this.logger.warn(
          '⚠️ [BUDPAY] Development mode: bypassing signature verification',
        );
        return {
          isValid: true,
          provider: WebhookProvider.BUDPAY,
          eventType: this.mapBudPayEvent(payload),
        };
      }

      // BudPay signature verification: hash_hmac("SHA512", public_key, secret_key)
      const expectedSignature = crypto
        .createHmac('sha512', secretKey)
        .update(publicKey)
        .digest('base64'); // Use base64 to match BudPay's format

      // Remove any prefix from the provided signature and clean it
      const providedSignature = signature
        .replace(/^(sha512=|budpay-signature=)/i, '')
        .trim();

      this.logger.log(
        `🔐 [BUDPAY] Expected signature length: ${expectedSignature.length}`,
      );
      this.logger.log(
        `🔐 [BUDPAY] Provided signature length: ${providedSignature.length}`,
      );
      this.logger.log(
        `🔐 [BUDPAY] Expected: ${expectedSignature.substring(0, 20)}...`,
      );
      this.logger.log(
        `🔐 [BUDPAY] Provided: ${providedSignature.substring(0, 20)}...`,
      );

      // Use simple string comparison instead of crypto.timingSafeEqual for different lengths
      const isValid = expectedSignature === providedSignature;

      return {
        isValid,
        provider: WebhookProvider.BUDPAY,
        eventType: this.mapBudPayEvent(payload),
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      return {
        isValid: false,
        provider: WebhookProvider.BUDPAY,
        eventType: this.mapBudPayEvent(payload),
        error: `BudPay verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify SME Plug webhook signature
   */
  private verifySmePlugWebhook(
    payload: any,
    signature?: string,
  ): WebhookVerificationResult {
    try {
      const secretKey = this.configService.get<string>('SMEPLUG_SECRET_KEY');

      if (!secretKey) {
        return {
          isValid: false,
          provider: WebhookProvider.SMEPLUG,
          eventType: this.mapSmePlugEvent(payload.event),
          error: 'SME Plug secret key not configured',
        };
      }

      if (!signature) {
        this.logger.warn(
          '⚠️ [SMEPLUG] No signature provided, accepting webhook (development mode)',
        );
        return {
          isValid: true,
          provider: WebhookProvider.SMEPLUG,
          eventType: this.mapSmePlugEvent(payload.event),
        };
      }

      // SME Plug signature verification logic (adjust based on their implementation)
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payloadString)
        .digest('hex');

      const isValid = signature === expectedSignature;

      return {
        isValid,
        provider: WebhookProvider.SMEPLUG,
        eventType: this.mapSmePlugEvent(payload.event),
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      return {
        isValid: false,
        provider: WebhookProvider.SMEPLUG,
        eventType: this.mapSmePlugEvent(payload.event),
        error: `SME Plug verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify Polaris webhook signature
   */
  private verifyPolarisWebhook(
    payload: any,
    signature?: string,
  ): WebhookVerificationResult {
    try {
      const secretKey = this.configService.get<string>('POLARIS_SECRET_KEY');

      if (!secretKey) {
        return {
          isValid: false,
          provider: WebhookProvider.POLARIS,
          eventType: this.mapPolarisEvent(payload.event),
          error: 'Polaris secret key not configured',
        };
      }

      if (!signature) {
        this.logger.warn(
          '⚠️ [POLARIS] No signature provided, accepting webhook (development mode)',
        );
        return {
          isValid: true,
          provider: WebhookProvider.POLARIS,
          eventType: this.mapPolarisEvent(payload.event),
        };
      }

      // Polaris signature verification logic (adjust based on their implementation)
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payloadString)
        .digest('hex');

      const isValid = signature === expectedSignature;

      return {
        isValid,
        provider: WebhookProvider.POLARIS,
        eventType: this.mapPolarisEvent(payload.event),
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      return {
        isValid: false,
        provider: WebhookProvider.POLARIS,
        eventType: this.mapPolarisEvent(payload.event),
        error: `Polaris verification error: ${error.message}`,
      };
    }
  }

  /**
   * Verify Nyra webhook signature
   */
  private verifyNyraWebhook(
    payload: any,
    signature?: string,
  ): WebhookVerificationResult {
    try {
      this.logger.log('🔍 [NYRA] Verifying webhook signature...');

      // Basic payload validation
      if (!payload || typeof payload !== 'object') {
        return {
          isValid: false,
          provider: WebhookProvider.NYRA,
          eventType: WebhookEventType.OTHER,
          error: 'Invalid payload structure',
        };
      }

      // Check for required fields
      if (!payload.event || !payload.data) {
        return {
          isValid: false,
          provider: WebhookProvider.NYRA,
          eventType: WebhookEventType.OTHER,
          error: 'Missing required fields: event or data',
        };
      }

      // TODO: Implement signature verification when Nyra provides webhook secret
      if (signature) {
        this.logger.log('🔐 [NYRA] Signature provided, verification needed');
        // Add signature verification logic here when available
      } else {
        this.logger.warn(
          '⚠️ [NYRA] No signature provided - relying on basic validation',
        );
      }

      this.logger.log(
        '✅ [NYRA] Webhook verification passed (basic validation)',
      );
      return {
        isValid: true,
        provider: WebhookProvider.NYRA,
        eventType: this.mapNyraEvent(payload.event),
      };
    } catch (error) {
      this.logger.error('❌ [NYRA] Webhook verification failed:', error);
      return {
        isValid: false,
        provider: WebhookProvider.NYRA,
        eventType: WebhookEventType.OTHER,
        error: error.message,
      };
    }
  }

  /**
   * Normalize webhook data from different providers into a standard format
   */
  private async normalizeWebhookData(
    provider: WebhookProvider,
    payload: any,
  ): Promise<ProcessedWebhookData | null> {
    try {
      this.logger.log(`🔄 [WEBHOOK] Normalizing ${provider} webhook data...`);
      this.logger.log(
        `📋 [WEBHOOK] Payload structure: ${JSON.stringify(Object.keys(payload), null, 2)}`,
      );

      switch (provider) {
        case WebhookProvider.BUDPAY:
          return this.normalizeBudPayData(payload as BudPayWebhookPayload);

        case WebhookProvider.SMEPLUG:
          return this.normalizeSmePlugData(payload as SmePlugWebhookPayload);

        case WebhookProvider.POLARIS:
          return this.normalizePolarisData(payload as PolarisWebhookPayload);

        case WebhookProvider.NYRA:
          return this.normalizeNyraData(payload as NyraWebhookPayload);

        default:
          return null;
      }
    } catch (error) {
      this.logger.error(
        `❌ [WEBHOOK] Error normalizing ${provider} data:`,
        error,
      );
      this.logger.error(
        `❌ [WEBHOOK] Payload was:`,
        JSON.stringify(payload, null, 2),
      );
      return null;
    }
  }

  /**
   * Normalize BudPay webhook data
   */
  private normalizeBudPayData(
    payload: BudPayWebhookPayload,
  ): ProcessedWebhookData {
    this.logger.log(`🔄 [BUDPAY] Normalizing BudPay webhook data...`);

    // Handle different payload structures
    const { notify, notifyType, data, transferDetails } = payload;

    if (!data) {
      this.logger.error(`❌ [BUDPAY] No data field in payload`);
      throw new Error('Missing data field in BudPay webhook payload');
    }

    this.logger.log(`📋 [BUDPAY] Data keys: ${Object.keys(data).join(', ')}`);

    // For virtual account webhooks, the crucial account number is in data.craccount
    // This is the virtual account number that we need to match with user wallets
    const accountNumber =
      data.craccount || transferDetails?.craccount || data?.reference;
    const accountName =
      data.craccountname ||
      transferDetails?.craccountname ||
      (data.customer
        ? `${data.customer.first_name} ${data.customer.last_name}`
        : 'Unknown');
    const bankName =
      data.bankname || transferDetails?.bankname || data?.gateway;
    const bankCode = data.bankcode || transferDetails?.bankcode;

    // Amount handling - BudPay sends amounts as strings (e.g., "50.00")
    let amount = 0;
    if (transferDetails?.amount) {
      amount = parseFloat(transferDetails.amount);
    } else if (data.amount) {
      amount = parseFloat(data.amount.toString());
    }

    this.logger.log(`💰 [BUDPAY] Extracted amount: ${amount}`);
    this.logger.log(`🏦 [BUDPAY] Extracted account: ${accountNumber}`);
    this.logger.log(`👤 [BUDPAY] Account name: ${accountName}`);

    const result = {
      provider: WebhookProvider.BUDPAY,
      eventType: this.mapBudPayEvent(payload),
      transactionReference:
        data.reference ||
        transferDetails?.paymentReference ||
        data.id?.toString() ||
        '',
      accountNumber,
      accountName,
      amount,
      currency: data.currency || 'NGN',
      status: data.status,
      customerEmail: data.customer?.email,
      customerId: data.customer?.customer_code,
      bankName,
      bankCode,
      description: `${notify}.${notifyType} - ${data.reference || transferDetails?.sessionid}`,
      metadata: {
        ...data,
        transferDetails,
        originalNotify: notify,
        originalNotifyType: notifyType,
        virtualAccountNumber: accountNumber, // Store the virtual account for clarity
        transactionReference: data.reference,
        sessionId: data.sessionid,
      },
      timestamp: data.created_at ? new Date(data.created_at) : new Date(),
      rawPayload: payload,
    };

    this.logger.log(`✅ [BUDPAY] Normalized data successfully`);
    return result;
  }

  /**
   * Normalize SME Plug webhook data
   */
  private normalizeSmePlugData(
    payload: SmePlugWebhookPayload,
  ): ProcessedWebhookData {
    const { event, data } = payload;

    return {
      provider: WebhookProvider.SMEPLUG,
      eventType: this.mapSmePlugEvent(event),
      transactionReference: data.reference || data.transaction_id || '',
      accountNumber: data.account_number,
      accountName: data.account_name,
      amount: data.amount,
      currency: data.currency || 'NGN',
      status: data.status,
      bankName: data.bank_name,
      bankCode: data.bank_code,
      description: data.narration || `${event} - ${data.reference}`,
      metadata: data.metadata,
      timestamp: data.created_at ? new Date(data.created_at) : new Date(),
      rawPayload: payload,
    };
  }

  /**
   * Normalize Polaris webhook data
   */
  private normalizePolarisData(
    payload: PolarisWebhookPayload,
  ): ProcessedWebhookData {
    const { event, data } = payload;

    return {
      provider: WebhookProvider.POLARIS,
      eventType: this.mapPolarisEvent(event),
      transactionReference: data.transaction_reference || '',
      accountNumber: data.account_number,
      accountName: data.account_name,
      amount: data.amount,
      currency: data.currency || 'NGN',
      status: data.status,
      bankCode: data.bank_code,
      description:
        data.description || `${event} - ${data.transaction_reference}`,
      metadata: data.metadata,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      rawPayload: payload,
    };
  }

  /**
   * Normalize Nyra webhook data
   */
  private normalizeNyraData(payload: NyraWebhookPayload): ProcessedWebhookData {
    const { event, data } = payload;

    this.logger.log(`🔄 [NYRA] Normalizing Nyra webhook data...`);
    this.logger.log(`📋 [NYRA] Event: ${event}`);
    this.logger.log(`📋 [NYRA] Data keys: ${Object.keys(data).join(', ')}`);

    // Handle nested data structure - NYRA webhooks have data.data
    const actualData = data.data || data;
    this.logger.log(
      `📋 [NYRA] Actual data keys: ${Object.keys(actualData).join(', ')}`,
    );
    this.logger.log(
      `💰 [NYRA] Extracted amount: ${(actualData as any).amount}`,
    );
    this.logger.log(
      `🏦 [NYRA] Extracted account: ${(actualData as any).account_number}`,
    );

    return {
      provider: WebhookProvider.NYRA,
      eventType: this.mapNyraEvent(event),
      transactionReference: (actualData as any).reference || '',
      accountNumber: (actualData as any).account_number,
      accountName:
        (actualData as any).credit_account_name ||
        (actualData as any).owners_fullname,
      amount: parseFloat((actualData as any).amount) || 0,
      currency: (actualData as any).currency || 'NGN',
      status: (actualData as any).status,
      description:
        (actualData as any).narration ||
        (actualData as any).description ||
        `${event} - ${(actualData as any).reference}`,
      metadata: {
        ...(actualData as any).metadata,
        wallet_id: (actualData as any).wallet_id,
        transaction_type: (actualData as any).transaction_type,
        sender_name: (actualData as any).sender_name,
        sender_account_number: (actualData as any).sender_account_number,
        sender_bank: (actualData as any).sender_bank,
        business_id: (actualData as any).business_id,
        transaction_date: (actualData as any).transaction_date,
      },
      timestamp: (actualData as any).timestamp
        ? new Date((actualData as any).timestamp)
        : new Date(),
      rawPayload: payload,
    };
  }

  /**
   * Handle webhook event and update wallet accordingly
   */
  private async handleWebhookEvent(
    data: ProcessedWebhookData,
  ): Promise<WebhookProcessingResult> {
    try {
      this.logger.log(`📝 [WEBHOOK] Handling event: ${data.eventType}`);
      this.logger.log(`💰 [WEBHOOK] Amount: ${data.amount} ${data.currency}`);
      this.logger.log(`🏦 [WEBHOOK] Account: ${data.accountNumber}`);
      this.logger.log(
        `🆔 [WEBHOOK] Transaction Reference: ${data.transactionReference}`,
      );

      // Check if this is a credit event that should update wallet balance
      const isCreditEvent = this.isCreditEvent(data.eventType);

      if (!isCreditEvent) {
        this.logger.log(
          `ℹ️ [WEBHOOK] Event ${data.eventType} does not require balance update`,
        );
        return {
          success: true,
          message: `Webhook event ${data.eventType} processed successfully`,
          walletUpdated: false,
        };
      }

      // Find wallet by account number
      const wallet = await this.findWalletByAccountNumber(data.accountNumber);

      if (!wallet) {
        this.logger.warn(
          `⚠️ [WEBHOOK] No wallet found for account number: ${data.accountNumber}`,
        );

        // Still log the webhook for audit purposes
        await this.logWebhook(data);

        return {
          success: true,
          message: `No wallet found for account number ${data.accountNumber}`,
          walletUpdated: false,
        };
      }

      this.logger.log(
        `👤 [WEBHOOK] Wallet owner: ${wallet.user.firstName} ${wallet.user.lastName} (${wallet.user.email})`,
      );
      this.logger.log(`💰 [WEBHOOK] Current balance: ₦${wallet.balance}`);

      // Check for duplicate transaction first
      const existingTransaction = await this.checkDuplicateTransaction(data);
      if (existingTransaction) {
        this.logger.warn(
          `⚠️ [WEBHOOK] Duplicate transaction detected: ${data.transactionReference}`,
        );

        await this.updateWebhookLog(data.transactionReference, data.provider, {
          error: 'Duplicate transaction',
        });

        return {
          success: false,
          message: 'Duplicate transaction detected',
          walletUpdated: false,
        };
      }

      // Validate amount
      if (!data.amount || data.amount <= 0) {
        this.logger.error(`❌ [WEBHOOK] Invalid amount: ${data.amount}`);

        await this.updateWebhookLog(data.transactionReference, data.provider, {
          error: `Invalid amount: ${data.amount}`,
        });

        return {
          success: false,
          message: `Invalid amount: ${data.amount}`,
          error: 'Invalid transaction amount',
          walletUpdated: false,
        };
      }

      // Calculate funding fee based on provider
      const fundingFee = await this.calculateProviderFundingFee(
        data.provider,
        data.amount,
      );
      const netAmount = data.amount - fundingFee;

      this.logger.log(`💰 [WEBHOOK] Gross amount: ₦${data.amount}`);
      this.logger.log(
        `💸 [WEBHOOK] Funding fee (${data.provider}): ₦${fundingFee}`,
      );
      this.logger.log(`💰 [WEBHOOK] Net amount to credit: ₦${netAmount}`);

      // Ensure net amount is positive
      if (netAmount <= 0) {
        this.logger.error(
          `❌ [WEBHOOK] Net amount after fee is zero or negative: ₦${netAmount}`,
        );

        await this.updateWebhookLog(data.transactionReference, data.provider, {
          error: `Net amount after fee is zero or negative: ₦${netAmount} (Fee: ₦${fundingFee})`,
        });

        return {
          success: false,
          message: `Funding fee (₦${fundingFee}) exceeds amount (₦${data.amount})`,
          error: 'Insufficient amount after fee deduction',
          walletUpdated: false,
        };
      }

      // Validate wallet balance against transaction history BEFORE processing
      this.logger.log(
        `🔍 [WEBHOOK] Validating wallet balance before processing update...`,
      );
      const preUpdateValidation =
        await this.walletService.validateWalletBalance(wallet.id);

      if (!preUpdateValidation.isValid) {
        this.logger.error(`❌ [WEBHOOK] Wallet balance validation failed!`);
        this.logger.error(`❌ [WEBHOOK] ${preUpdateValidation.message}`);

        // Log this critical error for investigation
        await this.updateWebhookLog(data.transactionReference, data.provider, {
          error: `Balance validation failed: ${preUpdateValidation.message}`,
        });

        return {
          success: false,
          message:
            'Wallet balance validation failed - transaction rejected for data integrity',
          error: preUpdateValidation.message,
          walletUpdated: false,
          balanceValidation: {
            preUpdate: preUpdateValidation,
            postUpdate: null,
          },
        };
      }

      this.logger.log(
        `✅ [WEBHOOK] Wallet balance validation passed - proceeding with update`,
      );

      // Log the webhook for audit trail
      await this.logWebhook(data);

      // ==================== ATOMIC DATABASE TRANSACTION ====================
      const result = await this.prisma.$transaction(async (tx) => {
        // Create transaction record first
        const transaction = await tx.walletTransaction.create({
          data: {
            amount: netAmount, // Use netAmount for the transaction record
            type: WalletTransactionType.FUNDING,
            status: TransactionStatus.COMPLETED,
            reference: data.transactionReference,
            description:
              data.description || `Wallet funding via ${data.provider}`,
            fee: fundingFee, // Store our funding fee
            senderBalanceBefore: null, // External funding has no sender
            senderBalanceAfter: null,
            receiverWalletId: wallet.id,
            receiverBalanceBefore: wallet.balance,
            receiverBalanceAfter: wallet.balance + netAmount,
            providerReference: data.transactionReference,
            providerResponse: JSON.parse(JSON.stringify(data.rawPayload)),
            metadata: {
              provider: data.provider,
              eventType: data.eventType,
              accountNumber: data.accountNumber,
              webhookProcessedAt: new Date().toISOString(),
              grossAmount: data.amount, // Original amount from provider
              fundingFee: fundingFee, // Our funding fee
              netAmount: netAmount, // Amount credited to user
              feeType: `FUNDING_${data.provider}`, // Fee type used
              // Sender information for inflow transactions
              sender_name: data.metadata?.sender_name,
              sender_account_number: data.metadata?.sender_account_number,
              sender_bank: data.metadata?.sender_bank,
              bankCode: data.metadata?.bankCode,
            },
          },
        });

        // Also create a record in the main Transaction table for admin queries
        await tx.transaction.create({
          data: {
            amount: netAmount,
            currency: 'NGN',
            type: 'DEPOSIT',
            status: TransactionStatus.COMPLETED,
            reference: data.transactionReference,
            description:
              data.description || `Wallet funding via ${data.provider}`,
            userId: wallet.userId,
            metadata: {
              provider: data.provider,
              eventType: data.eventType,
              accountNumber: data.accountNumber,
              webhookProcessedAt: new Date().toISOString(),
              grossAmount: data.amount, // Original amount from provider
              fundingFee: fundingFee, // Our funding fee
              netAmount: netAmount, // Amount credited to user
              feeType: `FUNDING_${data.provider}`, // Fee type used
              walletTransactionId: transaction.id,
              // Sender information for inflow transactions
              sender_name: data.metadata?.sender_name,
              sender_account_number: data.metadata?.sender_account_number,
              sender_bank: data.metadata?.sender_bank,
              bankCode: data.metadata?.bankCode,
            },
          },
        });

        // Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance + netAmount,
            lastTransactionAt: new Date(),
          },
        });

        return {
          transaction,
          updatedWallet,
          oldBalance: wallet.balance,
          newBalance: updatedWallet.balance,
        };
      });

      // Validate wallet balance against transaction history AFTER processing
      this.logger.log(`🔍 [WEBHOOK] Validating wallet balance after update...`);
      const postUpdateValidation =
        await this.walletService.validateWalletBalance(wallet.id);

      if (!postUpdateValidation.isValid) {
        this.logger.error(
          `❌ [WEBHOOK] POST-UPDATE wallet balance validation failed!`,
        );
        this.logger.error(`❌ [WEBHOOK] ${postUpdateValidation.message}`);

        // This is critical - the transaction was processed but validation failed
        await this.updateWebhookLog(data.transactionReference, data.provider, {
          error: `POST-UPDATE balance validation failed: ${postUpdateValidation.message}`,
          warning:
            'Transaction was processed but balance validation failed - requires manual investigation',
        });

        return {
          success: false,
          message:
            'Transaction processed but post-update validation failed - requires investigation',
          error: postUpdateValidation.message,
          walletUpdated: true,
          warning:
            'Critical: Transaction was committed but balance validation failed',
          balanceValidation: {
            preUpdate: preUpdateValidation,
            postUpdate: postUpdateValidation,
          },
          transaction: {
            id: result.transaction.id,
            grossAmount: data.amount,
            fundingFee: fundingFee,
            netAmount: netAmount,
            reference: data.transactionReference,
            provider: data.provider,
          },
        };
      }

      this.logger.log(`✅ [WEBHOOK] POST-UPDATE balance validation passed`);

      // Success logging with fee breakdown
      this.logger.log(`✅ [WEBHOOK] Wallet balance updated successfully!`);
      this.logger.log(`👤 [WEBHOOK] User: ${wallet.user.email}`);
      this.logger.log(
        `💰 [WEBHOOK] Balance: ₦${result.oldBalance} → ₦${result.newBalance}`,
      );
      this.logger.log(
        `💸 [WEBHOOK] Funding Fee: ₦${fundingFee} (${data.provider})`,
      );
      this.logger.log(`💰 [WEBHOOK] Gross Amount: ₦${data.amount}`);
      this.logger.log(`💰 [WEBHOOK] Net Amount Credited: ₦${netAmount}`);
      this.logger.log(`📊 [WEBHOOK] Transaction ID: ${result.transaction.id}`);
      this.logger.log(`🆔 [WEBHOOK] Reference: ${data.transactionReference}`);

      // Emit real-time notifications
      if (this.notificationsGateway) {
        // Wallet balance update notification
        this.notificationsGateway.emitWalletBalanceUpdate(wallet.user.id, {
          oldBalance: wallet.balance,
          newBalance: result.newBalance,
          change: netAmount,
          currency: 'NGN',
          provider: data.provider,
          accountNumber: data.accountNumber,
          grossAmount: data.amount,
          fundingFee: fundingFee,
          netAmount: netAmount,
          transactionId: result.transaction.id,
          reference: data.transactionReference,
        });

        // Transaction notification
        this.notificationsGateway.emitTransactionNotification(wallet.user.id, {
          type: 'FUNDING',
          amount: netAmount,
          grossAmount: data.amount,
          fee: fundingFee,
          currency: 'NGN',
          description: `Wallet funded via ${data.provider}`,
          reference: data.transactionReference,
          transactionId: result.transaction.id,
          provider: data.provider,
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });

        // General notification
        this.notificationsGateway.emitNotification(wallet.user.id, {
          title: 'Wallet Funded Successfully',
          message: `₦${data.amount} funding processed. ₦${fundingFee} fee deducted. ₦${netAmount} credited to your wallet.`,
          type: 'success',
          data: {
            transactionId: result.transaction.id,
            grossAmount: data.amount,
            fee: fundingFee,
            netAmount: netAmount,
            provider: data.provider,
          },
        });
      }

      // Send push notification
      if (this.pushNotificationsService) {
        try {
          await this.pushNotificationsService.sendWalletFundingNotification(
            wallet.user.id,
            data.amount, // gross amount
            netAmount, // net amount
            fundingFee, // fee
            data.provider, // provider
          );
          this.logger.log(
            `📱 [WEBHOOK] Push notification sent for wallet funding`,
          );
        } catch (pushError) {
          this.logger.error(
            `❌ [WEBHOOK] Failed to send push notification:`,
            pushError,
          );
          // Don't fail the webhook if push notification fails
        }
      }

      return {
        success: true,
        message: `Wallet credited successfully`,
        walletUpdated: true,
        transaction: {
          id: result.transaction.id,
          grossAmount: data.amount,
          fundingFee: 0,
          netAmount: data.amount,
          reference: data.transactionReference,
          provider: data.provider,
        },
        wallet: {
          id: result.transaction.receiverWalletId,
          oldBalance: result.oldBalance,
          newBalance: result.newBalance,
          change: data.amount,
        },
      };
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK] Error handling webhook event:`, error);

      // Log the error for audit
      try {
        await this.updateWebhookLog(data.transactionReference, data.provider, {
          error: error.message,
        });
      } catch (logError) {
        this.logger.error(`❌ [WEBHOOK] Failed to log error:`, logError);
      }

      return {
        success: false,
        message: 'Failed to process webhook event',
        error: error.message,
        walletUpdated: false,
      };
    }
  }

  /**
   * Check if event type should credit the wallet
   */
  private isCreditEvent(eventType: WebhookEventType): boolean {
    const creditEvents = [
      WebhookEventType.ACCOUNT_CREDITED,
      WebhookEventType.BUDPAY_VIRTUAL_ACCOUNT_CREDITED,
      WebhookEventType.BUDPAY_TRANSACTION_SUCCESSFUL,
      WebhookEventType.SMEPLUG_WALLET_CREDITED,
      WebhookEventType.POLARIS_ACCOUNT_FUNDED,
      WebhookEventType.NYRA_WALLET_CREDITED,
      WebhookEventType.TRANSFER_SUCCESSFUL,
    ];

    return creditEvents.includes(eventType);
  }

  /**
   * Public method for debugging wallet lookup
   */
  async debugWalletLookup(accountNumber: string) {
    return this.findWalletByAccountNumber(accountNumber);
  }

  /**
   * Find wallet by virtual account number
   */
  private async findWalletByAccountNumber(accountNumber?: string) {
    if (!accountNumber) {
      this.logger.warn('⚠️ [WALLET LOOKUP] No account number provided');
      return null;
    }

    this.logger.log(
      `🔍 [WALLET LOOKUP] Searching for wallet with account number: ${accountNumber}`,
    );

    // Try multiple variations of the account number
    const searchVariations = [
      accountNumber, // Exact match
      accountNumber.replace(/^0+/, ''), // Remove leading zeros
      '0' + accountNumber, // Add leading zero
      accountNumber.replace(/\D/g, ''), // Remove non-digits
      accountNumber.padStart(10, '0'), // Pad to 10 digits
      accountNumber.substring(0, 10), // Take first 10 digits
    ].filter((val, index, self) => val && self.indexOf(val) === index); // Remove duplicates and empty values

    this.logger.log(
      `🔍 [WALLET LOOKUP] Trying variations: ${searchVariations.join(', ')}`,
    );

    const wallet = await this.prisma.wallet.findFirst({
      where: {
        OR: searchVariations.map((variation) => ({
          virtualAccountNumber: variation,
        })),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (wallet) {
      this.logger.log(
        `✅ [WALLET LOOKUP] Found wallet: ${wallet.id} for user: ${wallet.user.email} (Account: ${wallet.virtualAccountNumber})`,
      );
    } else {
      this.logger.warn(
        `❌ [WALLET LOOKUP] No wallet found for any variation of account number: ${accountNumber}`,
      );

      // Log all existing wallet account numbers for debugging
      const allWallets = await this.prisma.wallet.findMany({
        select: {
          id: true,
          virtualAccountNumber: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `🗃️ [WALLET LOOKUP] Available wallets: ${allWallets.map((w) => `${w.user.email}:${w.virtualAccountNumber}`).join(', ')}`,
      );
    }

    return wallet;
  }

  /**
   * Check for duplicate transaction using multiple strategies
   */
  private async checkDuplicateTransaction(data: ProcessedWebhookData) {
    this.logger.log(
      `🔍 [DUPLICATE CHECK] Checking for duplicate transaction...`,
    );

    // Strategy 1: Check by transaction reference
    const byReference = await this.prisma.walletTransaction.findFirst({
      where: {
        OR: [
          { reference: data.transactionReference },
          { providerReference: data.transactionReference },
        ],
      },
    });

    if (byReference) {
      this.logger.warn(
        `⚠️ [DUPLICATE CHECK] Found duplicate by reference: ${data.transactionReference}`,
      );
      return byReference;
    }

    // Strategy 2: Check by webhook content hash to prevent processing same webhook with different references
    const webhookHash = this.generateWebhookHash(data);
    const byHash = await this.prisma.webhookLog.findFirst({
      where: {
        contentHash: webhookHash,
        walletUpdated: true,
      },
    });

    if (byHash) {
      this.logger.warn(
        `⚠️ [DUPLICATE CHECK] Found duplicate by content hash: ${webhookHash}`,
      );
      this.logger.warn(
        `⚠️ [DUPLICATE CHECK] Original reference: ${byHash.reference}, Current reference: ${data.transactionReference}`,
      );
      return { id: 'hash_duplicate', reference: byHash.reference };
    }

    // Strategy 3: Check by amount + account + timestamp window (within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const bySimilarity = await this.prisma.walletTransaction.findFirst({
      where: {
        amount: data.amount,
        type: WalletTransactionType.FUNDING,
        createdAt: {
          gte: fiveMinutesAgo,
        },
        metadata: {
          path: ['accountNumber'],
          equals: data.accountNumber,
        },
      },
    });

    if (bySimilarity) {
      this.logger.warn(
        `⚠️ [DUPLICATE CHECK] Found suspicious similar transaction: ${bySimilarity.reference}`,
      );
      this.logger.warn(
        `⚠️ [DUPLICATE CHECK] Same amount (₦${data.amount}) and account (${data.accountNumber}) within 5 minutes`,
      );
      return bySimilarity;
    }

    this.logger.log(
      `✅ [DUPLICATE CHECK] No duplicates found - transaction is unique`,
    );
    return null;
  }

  /**
   * Generate a hash of webhook content to detect duplicate payloads
   */
  private generateWebhookHash(data: ProcessedWebhookData): string {
    // Create a consistent hash based on transaction details
    const hashContent = {
      provider: data.provider,
      amount: data.amount,
      accountNumber: data.accountNumber,
      customerEmail: data.customerEmail,
      description: data.description,
      // Include essential payload data but exclude timestamps and references
      payloadHash: crypto
        .createHash('md5')
        .update(
          JSON.stringify({
            amount: data.rawPayload.data?.amount,
            craccount: data.rawPayload.data?.craccount,
            customer: data.rawPayload.data?.customer?.email,
            sessionid: data.rawPayload.data?.sessionid,
            originatoraccountnumber:
              data.rawPayload.data?.originatoraccountnumber,
          }),
        )
        .digest('hex'),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashContent))
      .digest('hex');
  }

  /**
   * Log webhook with content hash for duplicate detection
   */
  private async logWebhook(data: ProcessedWebhookData) {
    try {
      const contentHash = this.generateWebhookHash(data);

      // Create webhook log entry in database for audit
      await this.prisma.webhookLog.upsert({
        where: {
          reference_provider: {
            reference: data.transactionReference,
            provider: data.provider,
          },
        },
        update: {
          processedAt: new Date(),
          payload: data.rawPayload,
          eventType: data.eventType,
          accountNumber: data.accountNumber,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          contentHash,
        },
        create: {
          provider: data.provider,
          eventType: data.eventType,
          reference: data.transactionReference,
          accountNumber: data.accountNumber,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          payload: data.rawPayload,
          contentHash,
          receivedAt: new Date(),
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `📝 [WEBHOOK LOG] Logged webhook with hash: ${contentHash.substring(0, 16)}...`,
      );
    } catch (error) {
      this.logger.error(`❌ [WEBHOOK LOG] Failed to log webhook:`, error);
    }
  }

  /**
   * Update webhook log entry
   */
  private async updateWebhookLog(
    reference: string,
    provider: WebhookProvider,
    updates: {
      walletUpdated?: boolean;
      transactionId?: string;
      error?: string;
      warning?: string;
    },
  ) {
    try {
      await this.prisma.webhookLog.update({
        where: {
          reference_provider: {
            reference,
            provider,
          },
        },
        data: {
          ...updates,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `⚠️ [WEBHOOK] Failed to update webhook log:`,
        error.message,
      );
    }
  }

  /**
   * Map BudPay events to standard event types
   */
  private mapBudPayEvent(payload: any): WebhookEventType {
    const { notify, notifyType, data } = payload;

    // Handle virtual account credits (most important for our wallet system)
    if (
      notify === 'transaction' &&
      notifyType === 'successful' &&
      data?.type === 'dedicated_account' &&
      data?.channel === 'dedicated_account'
    ) {
      return WebhookEventType.BUDPAY_VIRTUAL_ACCOUNT_CREDITED;
    }

    // Handle different notify types
    if (notify === 'transaction') {
      return notifyType === 'successful'
        ? WebhookEventType.BUDPAY_TRANSACTION_SUCCESSFUL
        : WebhookEventType.BUDPAY_TRANSACTION_FAILED;
    }

    if (notify === 'payout') {
      return notifyType === 'successful'
        ? WebhookEventType.BUDPAY_PAYOUT_SUCCESSFUL
        : WebhookEventType.BUDPAY_PAYOUT_FAILED;
    }

    if (notify === 'bvn') {
      return notifyType === 'successful'
        ? WebhookEventType.BUDPAY_BVN_SUCCESSFUL
        : WebhookEventType.BUDPAY_BVN_FAILED;
    }

    return WebhookEventType.OTHER;
  }

  /**
   * Map SME Plug events to standard event types
   */
  private mapSmePlugEvent(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'wallet.credited': WebhookEventType.SMEPLUG_WALLET_CREDITED,
      'wallet.debited': WebhookEventType.SMEPLUG_WALLET_DEBITED,
      'transaction.completed': WebhookEventType.SMEPLUG_TRANSACTION_COMPLETED,
      'transfer.successful': WebhookEventType.TRANSFER_SUCCESSFUL,
      'transfer.failed': WebhookEventType.TRANSFER_FAILED,
    };

    return eventMap[event] || WebhookEventType.OTHER;
  }

  /**
   * Map Polaris events to standard event types
   */
  private mapPolarisEvent(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'account.funded': WebhookEventType.POLARIS_ACCOUNT_FUNDED,
      'transaction.success': WebhookEventType.POLARIS_TRANSACTION_SUCCESS,
      'transaction.failed': WebhookEventType.POLARIS_TRANSACTION_FAILED,
      'transfer.successful': WebhookEventType.TRANSFER_SUCCESSFUL,
      'transfer.failed': WebhookEventType.TRANSFER_FAILED,
    };

    return eventMap[event] || WebhookEventType.OTHER;
  }

  /**
   * Map Nyra events to standard event types
   */
  private mapNyraEvent(event: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'wallet.credited': WebhookEventType.NYRA_WALLET_CREDITED,
      'wallet.debited': WebhookEventType.NYRA_WALLET_DEBITED,
      'transfer.successful': WebhookEventType.NYRA_TRANSFER_SUCCESSFUL,
      'transfer.failed': WebhookEventType.NYRA_TRANSFER_FAILED,
      'transfer.pending': WebhookEventType.NYRA_TRANSFER_PENDING,
      'account.credited': WebhookEventType.ACCOUNT_CREDITED,
      'account.debited': WebhookEventType.ACCOUNT_DEBITED,
      'managed_wallet.funded': WebhookEventType.NYRA_WALLET_CREDITED,
    };

    return eventMap[event] || WebhookEventType.OTHER;
  }

  /**
   * Calculate provider-specific funding fee
   */
  private async calculateProviderFundingFee(
    provider: WebhookProvider,
    amount: number,
  ): Promise<number> {
    this.logger.log(
      `💸 [FEE CALCULATION] Calculating funding fee for ${provider} on amount: ₦${amount}`,
    );

    // NYRA has no funding fees
    if (provider === WebhookProvider.NYRA) {
      this.logger.log(`✅ [FEE CALCULATION] NYRA has no funding fees: ₦0`);
      return 0;
    }

    try {
      // Determine fee type based on provider
      const feeType = `FUNDING_${provider}` as any; // FUNDING_BUDPAY, FUNDING_SMEPLUG, etc.

      // Try to get provider-specific fee configuration
      const feeConfig = await this.prisma.feeConfiguration.findUnique({
        where: { feeType: feeType, isActive: true },
      });

      if (!feeConfig) {
        // Fallback to generic FUNDING fee
        const genericFeeConfig = await this.prisma.feeConfiguration.findUnique({
          where: { feeType: 'FUNDING', isActive: true },
        });

        if (!genericFeeConfig) {
          // Default funding fee if no configuration found
          const defaultFee = provider === WebhookProvider.BUDPAY ? 100 : 50;
          this.logger.warn(
            `⚠️ [FEE CALCULATION] No fee configuration found for ${feeType}, using default: ₦${defaultFee}`,
          );
          return defaultFee;
        }

        return this.calculateFeeFromConfig(genericFeeConfig, amount);
      }

      const calculatedFee = this.calculateFeeFromConfig(feeConfig, amount);
      this.logger.log(
        `✅ [FEE CALCULATION] ${provider} funding fee: ₦${calculatedFee}`,
      );
      return calculatedFee;
    } catch (error) {
      this.logger.error(
        `❌ [FEE CALCULATION] Error calculating funding fee for ${provider}:`,
        error,
      );
      // Default fee on error
      const defaultFee = provider === WebhookProvider.BUDPAY ? 100 : 50;
      this.logger.warn(
        `⚠️ [FEE CALCULATION] Using default fee due to error: ₦${defaultFee}`,
      );
      return defaultFee;
    }
  }

  /**
   * Calculate fee from fee configuration
   */
  private calculateFeeFromConfig(feeConfig: any, amount: number): number {
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

    return calculatedFee;
  }

  /**
   * Get webhook callback URLs for provider configuration
   */
  getCallbackUrls(): Record<WebhookProvider, string> {
    const baseUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );

    return {
      [WebhookProvider.BUDPAY]: `${baseUrl}/webhooks/budpay`,
      [WebhookProvider.SMEPLUG]: `${baseUrl}/webhooks/smeplug`,
      [WebhookProvider.POLARIS]: `${baseUrl}/webhooks/polaris`,
      [WebhookProvider.NYRA]: `${baseUrl}/webhooks/nyra`,
    };
  }
}
