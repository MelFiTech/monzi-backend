import {
  IsString,
  IsNumber,
  IsObject,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export enum WebhookEventType {
  // Universal events
  ACCOUNT_CREDITED = 'account.credited',
  ACCOUNT_DEBITED = 'account.debited',
  TRANSFER_SUCCESSFUL = 'transfer.successful',
  TRANSFER_FAILED = 'transfer.failed',
  TRANSFER_PENDING = 'transfer.pending',

  // BudPay specific events
  BUDPAY_TRANSACTION_SUCCESSFUL = 'budpay.transaction.successful',
  BUDPAY_TRANSACTION_FAILED = 'budpay.transaction.failed',
  BUDPAY_VIRTUAL_ACCOUNT_CREDITED = 'budpay.virtual_account.credited',
  BUDPAY_PAYOUT_SUCCESSFUL = 'budpay.payout.successful',
  BUDPAY_PAYOUT_FAILED = 'budpay.payout.failed',
  BUDPAY_BVN_SUCCESSFUL = 'budpay.bvn.successful',
  BUDPAY_BVN_FAILED = 'budpay.bvn.failed',

  // SME Plug specific events
  SMEPLUG_WALLET_CREDITED = 'wallet.credited',
  SMEPLUG_WALLET_DEBITED = 'wallet.debited',
  SMEPLUG_TRANSACTION_COMPLETED = 'transaction.completed',

  // Polaris specific events
  POLARIS_ACCOUNT_FUNDED = 'account.funded',
  POLARIS_TRANSACTION_SUCCESS = 'transaction.success',
  POLARIS_TRANSACTION_FAILED = 'transaction.failed',

  // Nyra specific events
  NYRA_WALLET_CREDITED = 'wallet.credited',
  NYRA_WALLET_DEBITED = 'wallet.debited',
  NYRA_TRANSFER_SUCCESSFUL = 'transfer.successful',
  NYRA_TRANSFER_FAILED = 'transfer.failed',
  NYRA_TRANSFER_PENDING = 'transfer.pending',

  // Generic fallback
  OTHER = 'other',
}

export enum WebhookProvider {
  BUDPAY = 'BUDPAY',
  SMEPLUG = 'SMEPLUG',
  POLARIS = 'POLARIS',
  NYRA = 'NYRA',
}

// Base webhook payload interface
export interface BaseWebhookPayload {
  event: string;
  data: any;
  signature?: string;
  timestamp?: string;
  provider: WebhookProvider;
}

// BudPay webhook payload structure (based on official guide)
export interface BudPayWebhookPayload {
  notify: 'transaction' | 'payout' | 'bvn' | 'virtual_account';
  notifyType: 'successful' | 'failed';
  data: {
    id?: number;
    reference?: string;
    amount?: string;
    currency?: string;
    status?: string;
    type?: string; // 'dedicated_account' for virtual account credits
    channel?: string; // 'dedicated_account' for virtual account credits
    gateway?: string; // 'wema' etc
    message?: string;
    fees?: string;
    domain?: string;
    paid_at?: string;
    created_at?: string;
    updated_at?: string;

    // Virtual account specific fields (from actual BudPay webhooks)
    craccount?: string; // Virtual account number
    craccountname?: string; // Virtual account holder name
    bankname?: string; // Sender bank name
    bankcode?: string; // Sender bank code
    narration?: string; // Transaction narration
    sessionid?: string; // Session/transaction ID
    originatorname?: string; // Name of person who sent money
    originatoraccountnumber?: string; // Account number of sender
    requested_amount?: string; // Original requested amount
    settlement_batchid?: string | null;
    ip_address?: string | null;
    card_attempt?: number;

    customer?: {
      id: number;
      customer_code: string;
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
      domain?: string;
      status?: string;
      metadata?: any;
    };
    metadata?: any;
  };
  transferDetails?: {
    amount?: string;
    bankcode?: string;
    bankname?: string;
    craccount?: string; // Credit account (virtual account number)
    narration?: string;
    sessionid?: string;
    craccountname?: string; // Credit account name
    originatorname?: string;
    paymentReference?: string;
    originatoraccountnumber?: string;
  };
}

// SME Plug webhook payload structure
export interface SmePlugWebhookPayload extends BaseWebhookPayload {
  event: string;
  data: {
    transaction_id?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    account_number?: string;
    account_name?: string;
    bank_code?: string;
    bank_name?: string;
    narration?: string;
    created_at?: string;
    metadata?: any;
  };
}

// Polaris webhook payload structure
export interface PolarisWebhookPayload extends BaseWebhookPayload {
  event: string;
  data: {
    transaction_reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    account_number?: string;
    account_name?: string;
    bank_code?: string;
    description?: string;
    timestamp?: string;
    metadata?: any;
  };
}

// Nyra webhook payload structure
export interface NyraWebhookPayload extends BaseWebhookPayload {
  event: string;
  data: {
    wallet_id?: string;
    account_number?: string;
    owners_fullname?: string;
    amount?: number;
    currency?: string;
    status?: string;
    transaction_type?: string; // 'credit' | 'debit'
    reference?: string;
    description?: string;
    timestamp?: string;
    metadata?: any;
  };
}

// Processed webhook data (normalized across providers)
export interface ProcessedWebhookData {
  provider: WebhookProvider;
  eventType: WebhookEventType;
  transactionReference: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  currency?: string;
  status?: string;
  customerEmail?: string;
  customerId?: string;
  bankName?: string;
  bankCode?: string;
  description?: string;
  metadata?: any;
  timestamp?: Date;
  rawPayload: any;
}

// Webhook verification result
export interface WebhookVerificationResult {
  isValid: boolean;
  provider: WebhookProvider;
  eventType: WebhookEventType;
  error?: string;
}

// Webhook processing result
export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  walletUpdated: boolean;
  transaction?: {
    id: string;
    grossAmount?: number;
    fundingFee?: number;
    netAmount?: number;
    reference: string;
    provider?: string;
  };
  wallet?: {
    id: string;
    oldBalance: number;
    newBalance: number;
    change?: number;
  };
  error?: string;
  warning?: string;
  balanceValidation?: {
    preUpdate?: {
      isValid: boolean;
      currentBalance: number;
      calculatedBalance: number;
      discrepancy: number;
      message: string;
    };
    postUpdate?: {
      isValid: boolean;
      currentBalance: number;
      calculatedBalance: number;
      discrepancy: number;
      message: string;
    };
  };
}
