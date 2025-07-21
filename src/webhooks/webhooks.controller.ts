import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  Req,
  Res,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookProvider } from './dto/webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Get webhook callback URLs for all providers
   */
  @Get('callback-urls')
  @ApiOperation({
    summary: 'Get webhook callback URLs for provider configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook callback URLs retrieved successfully',
  })
  getCallbackUrls() {
    this.logger.log('📋 [WEBHOOK] Callback URLs requested');

    const urls = this.webhooksService.getCallbackUrls();

    return {
      success: true,
      message: 'Webhook callback URLs',
      data: urls,
    };
  }

  /**
   * BudPay webhook endpoint
   */
  @Post('budpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle BudPay webhooks' })
  @ApiHeader({
    name: 'merchantsignature',
    description: 'BudPay merchant signature',
    required: false,
  })
  @ApiHeader({
    name: 'payloadsignature',
    description: 'BudPay payload signature',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleBudPayWebhook(
    @Body() payload: any,
    @Headers('merchantsignature') merchantSignature?: string,
    @Headers('payloadsignature') payloadSignature?: string,
    @Headers('x-budpay-signature') legacySignature?: string,
    @Req() req?: Request,
  ) {
    this.logger.log('🔔 [BUDPAY] Webhook received');
    this.logger.log('📊 [BUDPAY] Headers:', req?.headers);
    this.logger.log('💾 [BUDPAY] Payload:', JSON.stringify(payload, null, 2));

    try {
      // Use the signature that BudPay actually sends (merchantsignature or payloadsignature)
      const signature =
        merchantSignature || payloadSignature || legacySignature;

      const result = await this.webhooksService.processWebhook(
        WebhookProvider.BUDPAY,
        payload,
        signature,
      );

      this.logger.log(`✅ [BUDPAY] Webhook processed: ${result.success}`);

      return {
        success: result.success,
        message: result.message,
        processed: result.success,
        walletUpdated: result.walletUpdated,
        transaction: result.transaction,
        wallet: result.wallet,
        error: result.error,
        warning: result.warning,
        balanceValidation: result.balanceValidation,
      };
    } catch (error) {
      this.logger.error('❌ [BUDPAY] Webhook processing failed:', error);
      throw new BadRequestException(
        `BudPay webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * SME Plug webhook endpoint
   */
  @Post('smeplug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle SME Plug webhooks' })
  @ApiHeader({
    name: 'X-SMEPlug-Signature',
    description: 'SME Plug webhook signature',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleSmePlugWebhook(
    @Body() payload: any,
    @Headers('x-smeplug-signature') signature?: string,
    @Req() req?: Request,
  ) {
    this.logger.log('🔔 [SMEPLUG] Webhook received');
    this.logger.log('📊 [SMEPLUG] Headers:', req?.headers);
    this.logger.log('💾 [SMEPLUG] Payload:', JSON.stringify(payload, null, 2));

    try {
      const result = await this.webhooksService.processWebhook(
        WebhookProvider.SMEPLUG,
        payload,
        signature,
      );

      this.logger.log(`✅ [SMEPLUG] Webhook processed: ${result.success}`);

      return {
        success: result.success,
        message: result.message,
        processed: result.success,
        walletUpdated: result.walletUpdated,
        transaction: result.transaction,
        wallet: result.wallet,
        error: result.error,
        warning: result.warning,
        balanceValidation: result.balanceValidation,
      };
    } catch (error) {
      this.logger.error('❌ [SMEPLUG] Webhook processing failed:', error);
      throw new BadRequestException(
        `SME Plug webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Polaris webhook endpoint
   */
  @Post('polaris')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Polaris webhooks' })
  @ApiHeader({
    name: 'X-Polaris-Signature',
    description: 'Polaris webhook signature',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handlePolarisWebhook(
    @Body() payload: any,
    @Headers('x-polaris-signature') signature?: string,
    @Req() req?: Request,
  ) {
    this.logger.log('🔔 [POLARIS] Webhook received');
    this.logger.log('📊 [POLARIS] Headers:', req?.headers);
    this.logger.log('💾 [POLARIS] Payload:', JSON.stringify(payload, null, 2));

    try {
      const result = await this.webhooksService.processWebhook(
        WebhookProvider.POLARIS,
        payload,
        signature,
      );

      this.logger.log(`✅ [POLARIS] Webhook processed: ${result.success}`);

      return {
        success: result.success,
        message: result.message,
        processed: result.success,
        walletUpdated: result.walletUpdated,
        transaction: result.transaction,
        wallet: result.wallet,
        error: result.error,
        warning: result.warning,
        balanceValidation: result.balanceValidation,
      };
    } catch (error) {
      this.logger.error('❌ [POLARIS] Webhook processing failed:', error);
      throw new BadRequestException(
        `Polaris webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Nyra webhook endpoint
   */
  @Post('nyra')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Nyra webhooks' })
  @ApiHeader({
    name: 'X-Nyra-Signature',
    description: 'Nyra webhook signature',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleNyraWebhook(
    @Body() payload: any,
    @Headers('x-nyra-signature') signature?: string,
    @Req() req?: Request,
  ) {
    this.logger.log('🔔 [NYRA] Webhook received');
    this.logger.log('📊 [NYRA] Headers:', req?.headers);
    this.logger.log('💾 [NYRA] Payload:', JSON.stringify(payload, null, 2));

    try {
      const result = await this.webhooksService.processWebhook(
        WebhookProvider.NYRA,
        payload,
        signature,
      );

      this.logger.log(`✅ [NYRA] Webhook processed: ${result.success}`);

      return {
        success: result.success,
        message: result.message,
        processed: result.success,
        walletUpdated: result.walletUpdated,
        transaction: result.transaction,
        wallet: result.wallet,
        error: result.error,
        warning: result.warning,
        balanceValidation: result.balanceValidation,
      };
    } catch (error) {
      this.logger.error('❌ [NYRA] Webhook processing failed:', error);
      throw new BadRequestException(
        `Nyra webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Generic webhook endpoint (fallback for unknown providers)
   */
  @Post('generic/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle generic webhooks from any provider' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleGenericWebhook(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature?: string,
    @Req() req?: Request,
  ) {
    const provider = req?.params?.provider?.toUpperCase() as WebhookProvider;

    this.logger.log(`🔔 [${provider}] Generic webhook received`);
    this.logger.log(`📊 [${provider}] Headers:`, req?.headers);
    this.logger.log(
      `💾 [${provider}] Payload:`,
      JSON.stringify(payload, null, 2),
    );

    // Validate provider
    if (!Object.values(WebhookProvider).includes(provider)) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    try {
      const result = await this.webhooksService.processWebhook(
        provider,
        payload,
        signature,
      );

      this.logger.log(
        `✅ [${provider}] Generic webhook processed: ${result.success}`,
      );

      return {
        success: result.success,
        message: result.message,
        processed: result.success,
        walletUpdated: result.walletUpdated,
        transaction: result.transaction,
        wallet: result.wallet,
        error: result.error,
        warning: result.warning,
        balanceValidation: result.balanceValidation,
      };
    } catch (error) {
      this.logger.error(
        `❌ [${provider}] Generic webhook processing failed:`,
        error,
      );
      throw new BadRequestException(
        `${provider} webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Health check endpoint for webhook service
   */
  @Get('health')
  @ApiOperation({ summary: 'Webhook service health check' })
  @ApiResponse({ status: 200, description: 'Webhook service is healthy' })
  healthCheck() {
    return {
      success: true,
      message: 'Webhook service is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      endpoints: this.webhooksService.getCallbackUrls(),
    };
  }

  /**
   * Test webhook endpoint for development
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook processing (development only)' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook processed successfully',
  })
  async testWebhook(
    @Body()
    testData: {
      provider: WebhookProvider;
      event: string;
      amount: number;
      accountNumber: string;
      reference: string;
    },
  ) {
    this.logger.log('🧪 [TEST] Test webhook received');

    // Create mock webhook payload
    const mockPayload = {
      event: testData.event,
      data: {
        reference: testData.reference,
        amount:
          testData.provider === WebhookProvider.BUDPAY
            ? testData.amount * 100
            : testData.amount, // BudPay uses kobo
        currency: 'NGN',
        status: 'successful',
        account: {
          account_number: testData.accountNumber,
          account_name: 'Test Account',
          bank_name: 'Test Bank',
        },
        created_at: new Date().toISOString(),
      },
    };

    try {
      const result = await this.webhooksService.processWebhook(
        testData.provider,
        mockPayload,
      );

      this.logger.log(`✅ [TEST] Test webhook processed: ${result.success}`);

      return {
        success: result.success,
        message: `Test webhook for ${testData.provider} processed successfully`,
        data: {
          provider: testData.provider,
          event: testData.event,
          walletUpdated: result.walletUpdated,
          transaction: result.transaction,
          wallet: result.wallet,
          error: result.error,
          warning: result.warning,
          balanceValidation: result.balanceValidation,
        },
      };
    } catch (error) {
      this.logger.error('❌ [TEST] Test webhook processing failed:', error);
      throw new BadRequestException(
        `Test webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Test BudPay webhook with real data
   */
  @Post('test/budpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test BudPay webhook processing with real data' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook processed successfully',
  })
  async testBudPayWebhook(@Body() testPayload?: any) {
    this.logger.log('🧪 [TEST] Testing BudPay webhook processing...');

    // Use the actual payload from the logs if no test payload provided
    const payload = testPayload || {
      data: {
        id: 18119110,
        fees: '50',
        plan: null,
        type: 'dedicated_account',
        amount: '50',
        domain: 'live',
        status: 'success',
        channel: 'dedicated_account',
        message: 'Account credited successfully',
        paid_at: '07/10/2025 15:43:59',
        bankcode: '090267',
        bankname: 'Kuda Microfinance Bank',
        currency: 'NGN',
        customer: {
          id: 8253154,
          email: 'abdulldsgnr@gmail.com',
          phone: '+2348092186064',
          domain: 'live',
          status: 'active',
          metadata:
            '{"bvn":"22456310616","address":"Lagos, Nigeria","city":"Lagos","state":"Lagos State","country":"Nige',
          last_name: 'MOHAMMAD',
          first_name: 'ABDULLAHI',
          customer_code: 'CUS_ef4kcxc16hj6msn',
        },
        metadata: '',
        craccount: '7562096065',
        narration: 'FT/Kuda/MOHAMMAD, OGIRI/SEND',
        reference: '090267250710154355897000323718',
        sessionid: '090267250710154355897000323718',
        created_at: '2025-07-10T15:43:59',
        ip_address: null,
        updated_at: '2025-07-10T14:43:59',
        card_attempt: 0,
        craccountname: 'MYNYRA LIMITED / ABDULLAHI MOHAMMAD',
        originatorname: 'MOHAMMAD, OGIRIMA ABDULLAHI',
        requested_amount: '100.0',
        settlement_batchid: null,
        originatoraccountnumber: '2000323718',
      },
      notify: 'transaction',
      notifyType: 'successful',
    };

    try {
      this.logger.log('🧪 [TEST] Processing test webhook...');

      const result = await this.webhooksService.processWebhook(
        WebhookProvider.BUDPAY,
        payload,
        undefined, // No signature for test
      );

      this.logger.log(`✅ [TEST] Test webhook processed: ${result.success}`);

      return {
        success: result.success,
        message: `Test webhook for ${WebhookProvider.BUDPAY} processed successfully`,
        data: {
          provider: WebhookProvider.BUDPAY,
          event: 'transaction',
          walletUpdated: result.walletUpdated,
          transaction: result.transaction,
          wallet: result.wallet,
          error: result.error,
          warning: result.warning,
          balanceValidation: result.balanceValidation,
        },
      };
    } catch (error) {
      this.logger.error('❌ [TEST] Test webhook processing failed:', error);
      throw new BadRequestException(
        `Test webhook processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Test BudPay webhook with new transaction (for testing balance updates)
   */
  @Post('test/budpay/new')
  async testBudPayWebhookNew(@Req() req: Request) {
    this.logger.log(
      '🧪 [TEST NEW] Testing BudPay webhook with simulation mode...',
    );

    const uniqueId = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueReference = `TEST_${uniqueId}_${randomSuffix}`;

    this.logger.log(`🧪 [TEST NEW] Using unique reference: ${uniqueReference}`);
    this.logger.warn(
      `⚠️ [TEST MODE] This is a TEST webhook - will not affect real wallet balances`,
    );

    // Create a properly structured BudPay webhook payload
    const testPayload = {
      notify: 'transaction',
      notifyType: 'successful',
      data: {
        reference: uniqueReference,
        amount: '1000.00', // ₦1000 test amount
        currency: 'NGN',
        status: 'successful',
        craccount: '7562096065', // Test virtual account number
        craccountname: 'TEST USER ACCOUNT',
        bankname: 'Test Bank',
        bankcode: '999',
        sessionid: `session_${uniqueId}`,
        created_at: new Date().toISOString(),
        customer: {
          id: 12345,
          customer_code: 'TEST_CUSTOMER',
          email: 'abdulldsgnr@gmail.com',
          first_name: 'Test',
          last_name: 'User',
        },
        gateway: 'test',
      },
      transferDetails: {
        amount: '1000.00',
        craccount: '7562096065',
        craccountname: 'TEST USER ACCOUNT',
        sessionid: `session_${uniqueId}`,
      },
    };

    try {
      // IMPORTANT: Use test mode for webhooks
      const result = await this.webhooksService.processTestWebhook(
        WebhookProvider.BUDPAY,
        testPayload,
        null, // No signature for test
      );

      this.logger.log(
        `🧪 [TEST NEW] Test result: ${JSON.stringify(result, null, 2)}`,
      );

      return {
        success: true,
        message: 'Test webhook simulation completed (no real balance changes)',
        reference: uniqueReference,
        result,
        warning: 'This was a TEST - no real wallet balances were affected',
      };
    } catch (error) {
      this.logger.error(`🧪 [TEST NEW] Test failed:`, error);
      return {
        success: false,
        message: 'Test webhook failed',
        error: error.message,
      };
    }
  }

  @Post('fix-wallet-balance/:walletId')
  @ApiOperation({
    summary: 'Fix wallet balance discrepancy (ADMIN ONLY)',
    description:
      'Reconcile wallet balance with transaction history - USE WITH CAUTION',
  })
  async fixWalletBalance(@Param('walletId') walletId: string) {
    this.logger.warn(
      `🔧 [FIX WALLET] Attempting to fix wallet balance for: ${walletId}`,
    );

    try {
      // First validate the current state
      const validation =
        await this.webhooksService.validateWalletBalance(walletId);

      if (validation.isValid) {
        return {
          success: true,
          message: 'Wallet balance is already correct - no fix needed',
          currentBalance: validation.currentBalance,
          calculatedBalance: validation.calculatedBalance,
        };
      }

      // Fix the balance
      const result =
        await this.webhooksService.reconcileWalletBalance(walletId);

      return {
        success: true,
        message: 'Wallet balance fixed successfully',
        ...result,
      };
    } catch (error) {
      this.logger.error(`❌ [FIX WALLET] Failed to fix wallet:`, error);
      return {
        success: false,
        message: 'Failed to fix wallet balance',
        error: error.message,
      };
    }
  }

  /**
   * Debug: Check wallet by account number
   */
  @Get('debug/wallet/:accountNumber')
  @ApiOperation({ summary: 'Debug: Find wallet by account number' })
  @ApiResponse({ status: 200, description: 'Wallet lookup result' })
  async debugWalletLookup(@Param('accountNumber') accountNumber: string) {
    this.logger.log(
      `🔍 [DEBUG] Looking up wallet for account: ${accountNumber}`,
    );

    try {
      const result =
        await this.webhooksService.debugWalletLookup(accountNumber);

      return {
        success: true,
        accountNumber,
        walletFound: !!result,
        wallet: result
          ? {
              id: result.id,
              virtualAccountNumber: result.virtualAccountNumber,
              balance: result.balance,
              user: result.user,
            }
          : null,
      };
    } catch (error) {
      this.logger.error('🔍 [DEBUG] Wallet lookup failed:', error);
      return {
        success: false,
        accountNumber,
        error: error.message,
      };
    }
  }

  /**
   * Get wallet balance for testing
   */
  @Get('debug/balance/:accountNumber')
  @ApiOperation({ summary: 'Debug: Get wallet balance by account number' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved' })
  async debugWalletBalance(@Param('accountNumber') accountNumber: string) {
    this.logger.log(`💰 [DEBUG] Getting balance for account: ${accountNumber}`);

    try {
      const wallet =
        await this.webhooksService.debugWalletLookup(accountNumber);

      if (!wallet) {
        return {
          success: false,
          accountNumber,
          message: 'Wallet not found',
        };
      }

      return {
        success: true,
        accountNumber,
        wallet: {
          id: wallet.id,
          virtualAccountNumber: wallet.virtualAccountNumber,
          balance: wallet.balance,
          formattedBalance: `₦${wallet.balance.toFixed(2)}`,
          lastTransactionAt: wallet.lastTransactionAt,
          user: {
            email: wallet.user.email,
            name: `${wallet.user.firstName} ${wallet.user.lastName}`,
          },
        },
      };
    } catch (error) {
      this.logger.error('💰 [DEBUG] Balance lookup failed:', error);
      return {
        success: false,
        accountNumber,
        error: error.message,
      };
    }
  }
}
