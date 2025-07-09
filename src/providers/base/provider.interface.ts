export interface BvnVerificationData {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  lgaOfOrigin?: string;
  residentialAddress?: string;
  stateOfOrigin?: string;
}

export interface BvnVerificationResult {
  success: boolean;
  message: string;
  data?: BvnVerificationData;
  error?: string;
}

export interface BankData {
  bankName: string;
  bankCode: string;
  slug?: string;
}

export interface AccountResolutionData {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}

export interface AccountResolutionResult {
  success: boolean;
  message: string;
  data?: AccountResolutionData;
  error?: string;
}

export interface TransferData {
  amount: number;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reference: string;
  narration: string;
}

export interface TransferResult {
  success: boolean;
  message: string;
  transactionId?: string;
  reference?: string;
  status?: string;
  error?: string;
}

export interface IKycProvider {
  verifyBvn(bvn: string): Promise<BvnVerificationResult>;
}

export interface IAccountProvider {
  getBankList(): Promise<BankData[]>;
  resolveAccount(accountNumber: string, bankCode: string): Promise<AccountResolutionResult>;
}

export interface ITransferProvider {
  sendTransfer(transferData: TransferData): Promise<TransferResult>;
}

export interface IPaymentProvider extends IAccountProvider, ITransferProvider {
  // Combined interface for providers that support both account resolution and transfers
} 