// Transfer Provider Interface
export interface TransferProviderInterface {
  // Transfer Methods
  transferToBank(data: BankTransferData): Promise<BankTransferResult>;

  // Bank Information Methods
  getBankList(): Promise<BankListResult>;
  verifyAccount(
    data: AccountVerificationData,
  ): Promise<AccountVerificationResult>;
}

// Transfer Data Types
export interface BankTransferData {
  amount: number;
  currency: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  narration: string;
  reference: string;
  senderName: string;
  senderEmail: string;
  metadata?: Record<string, any>;
}

export interface BankTransferResult {
  success: boolean;
  message: string;
  data?: {
    reference: string;
    amount: number;
    fee: number;
    currency: string;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    narration: string;
    status: string;
    providerReference?: string;
    metadata?: Record<string, any>;
  };
  error?: string;
}

// Bank List Data Types
export interface BankListResult {
  success: boolean;
  message: string;
  currency: string;
  data?: Array<{
    bankName: string;
    bankCode: string;
  }>;
  error?: string;
}

// Account Verification Data Types
export interface AccountVerificationData {
  accountNumber: string;
  bankCode: string;
  currency?: string;
}

export interface AccountVerificationResult {
  success: boolean;
  message: string;
  data?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  };
  error?: string;
}

// Provider Type Enum
export enum TransferProvider {
  BUDPAY = 'BUDPAY',
  SMEPLUG = 'SMEPLUG',
  POLARIS = 'POLARIS',
  NYRA = 'NYRA',
}
