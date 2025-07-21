export interface WalletCreationData {
  accountName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string; // ISO date format
  gender: 'M' | 'F';
  title?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  bvn?: string; // Required for some providers
}

export interface WalletCreationResult {
  success: boolean;
  message: string;
  data?: {
    accountNumber: string;
    accountName: string;
    customerId: string;
    bankName: string;
    bankCode: string;
    currency: string;
    status: string;
    providerReference?: string;
    metadata?: any;
  };
  error?: string;
}

export interface WalletBalanceData {
  accountNumber: string;
  customerId?: string;
}

export interface WalletBalanceResult {
  success: boolean;
  balance: number;
  currency: string;
  accountNumber: string;
  error?: string;
}

export interface WalletTransactionData {
  amount: number;
  fromAccountNumber: string;
  toAccountNumber: string;
  toBankCode: string;
  reference: string;
  description: string;
  customerId?: string;
}

export interface WalletTransactionResult {
  success: boolean;
  message: string;
  transactionId?: string;
  reference?: string;
  status?: string;
  fee?: number;
  error?: string;
}

export interface IWalletProvider {
  /**
   * Create a new wallet/virtual account for a user
   */
  createWallet(data: WalletCreationData): Promise<WalletCreationResult>;

  /**
   * Get wallet balance
   */
  getWalletBalance(data: WalletBalanceData): Promise<WalletBalanceResult>;

  /**
   * Process wallet transaction
   */
  processTransaction(
    data: WalletTransactionData,
  ): Promise<WalletTransactionResult>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

export enum WalletProvider {
  SMEPLUG = 'SMEPLUG',
  POLARIS = 'POLARIS',
  BUDPAY = 'BUDPAY',
  NYRA = 'NYRA',
}
