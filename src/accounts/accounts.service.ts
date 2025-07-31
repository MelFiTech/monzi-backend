import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResolveAccountDto,
  BanksListResponseDto,
  ResolveAccountResponseDto,
  SuperResolveAccountDto,
  SuperResolveAccountResponseDto,
} from './dto/accounts.dto';
import { TransferProviderManagerService } from '../providers/transfer-provider-manager.service';
import { BudPayTransferProvider } from '../providers/budpay/budpay-transfer.provider';

@Injectable()
export class AccountsService {
  // Cache for bank mappings to avoid repeated API calls
  private bankMappingsCache: Map<string, string> = new Map();
  private budpayBanksCache: any[] = [];

  // Cache for resolved account numbers to prevent repeated API calls
  private resolvedAccountsCache: Map<string, {
    result: SuperResolveAccountResponseDto;
    timestamp: number;
    expiresAt: number;
  }> = new Map();

  // Request deduplication - prevent multiple simultaneous requests for same account
  private pendingRequests: Map<string, Promise<SuperResolveAccountResponseDto>> = new Map();

  // Cache configuration
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour cleanup interval

  constructor(
    private readonly configService: ConfigService,
    private readonly transferProviderManager: TransferProviderManagerService,
    private readonly budPayTransferProvider: BudPayTransferProvider,
  ) {
    // Start cache cleanup scheduler
    this.scheduleCacheCleanup();
  }

  /**
   * Schedule periodic cache cleanup to prevent memory leaks
   */
  private scheduleCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.resolvedAccountsCache.entries()) {
      if (now > value.expiresAt) {
        this.resolvedAccountsCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [ACCOUNTS CACHE] Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Get cached result for account number
   */
  private getCachedResult(accountNumber: string): SuperResolveAccountResponseDto | null {
    const cached = this.resolvedAccountsCache.get(accountNumber);
    
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`💾 [ACCOUNTS CACHE] Cache HIT for account: ${accountNumber}`);
      return cached.result;
    }
    
    if (cached) {
      console.log(`⏰ [ACCOUNTS CACHE] Cache EXPIRED for account: ${accountNumber}`);
      this.resolvedAccountsCache.delete(accountNumber);
    }
    
    return null;
  }

  /**
   * Cache resolved account result
   */
  private cacheResult(accountNumber: string, result: SuperResolveAccountResponseDto) {
    const now = Date.now();
    const expiresAt = now + this.CACHE_TTL;
    
    this.resolvedAccountsCache.set(accountNumber, {
      result,
      timestamp: now,
      expiresAt,
    });
    
    console.log(`💾 [ACCOUNTS CACHE] Cached result for account: ${accountNumber} (expires in ${this.CACHE_TTL / (60 * 60 * 1000)}h)`);
  }

  // Common Nigerian banks to try first (most likely to have accounts)
  private readonly COMMON_BANKS = [
    // Digital Banks First
    { name: 'OPay', code: '100004' },
    { name: 'Moniepoint', code: '50515' },
    { name: 'PalmPay', code: '100033' },
    { name: 'Kuda Bank', code: '50211' },
    { name: 'VFD Microfinance Bank', code: '566' },
    { name: 'Carbon', code: '565' },
    { name: 'Fairmoney', code: '51318' },
    { name: 'Sparkle', code: '51310' },
    { name: 'Rubies Bank', code: '125' },
    { name: 'Mint', code: '50304' },
    // Traditional Banks
    { name: 'GTBank', code: '058' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'Access Bank', code: '044' },
    { name: 'First Bank', code: '011' },
    { name: 'UBA', code: '033' },
    { name: 'Stanbic IBTC', code: '221' },
    { name: 'Ecobank', code: '050' },
    { name: 'Fidelity Bank', code: '070' },
    { name: 'Union Bank', code: '032' },
    { name: 'Wema Bank', code: '035' },
    { name: 'Polaris Bank', code: '076' },
    { name: 'Keystone Bank', code: '082' },
    { name: 'Providus Bank', code: '101' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'Unity Bank', code: '215' },
  ];

  // List of digital banks to prioritize (by name or code)
  private readonly DIGITAL_BANKS = [
    { name: 'OPay', code: '100004' },
    { name: 'Moniepoint', code: '50515' },
    { name: 'PalmPay', code: '100033' },
    { name: 'Kuda', code: '50211' },
    { name: 'VFD Microfinance Bank', code: '566' },
    { name: 'VBank', code: '566' },
    { name: 'Carbon', code: '565' },
    { name: 'Fairmoney', code: '51318' },
    { name: 'Sparkle', code: '51310' },
    { name: 'Rubies', code: '125' },
    { name: 'Mint', code: '50304' },
    { name: 'ALAT', code: '035A' },
  ];

  // List of commercial banks to try after digital banks
  private readonly COMMERCIAL_BANKS = [
    { name: 'GTBank', code: '058' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'Access Bank', code: '044' },
    { name: 'First Bank', code: '011' },
    { name: 'UBA', code: '033' },
    { name: 'Stanbic IBTC', code: '221' },
    { name: 'Ecobank', code: '050' },
    { name: 'Fidelity Bank', code: '070' },
    { name: 'Union Bank', code: '032' },
    { name: 'Wema Bank', code: '035' },
    { name: 'Polaris Bank', code: '076' },
    { name: 'Keystone Bank', code: '082' },
    { name: 'Providus Bank', code: '101' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'Unity Bank', code: '215' },
  ];

  // NUBAN API configuration
  private readonly NUBAN_API_KEY = 'NUBAN-ODDOGOGF3226';
  private readonly NUBAN_BASE_URL =
    'https://app.nuban.com.ng/api/NUBAN-ODDOGOGF3226';

  // Delay function for rate limiting
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Smart bank code conversion using bank name matching
   * This approach is scalable for all 684+ banks
   */
  private async convertToBudPayBankCode(nyraBankCode: string, bankName: string): Promise<string> {
    // Check cache first
    const cacheKey = `${nyraBankCode}_${bankName}`;
    if (this.bankMappingsCache.has(cacheKey)) {
      return this.bankMappingsCache.get(cacheKey);
    }

    try {
      // Get BudPay bank list if not cached
      if (this.budpayBanksCache.length === 0) {
        console.log('🔄 [SMART MAPPING] Fetching BudPay bank list for dynamic mapping...');
        const budpayBanksResponse = await this.budPayTransferProvider.getBankList();
        if (budpayBanksResponse.success) {
          this.budpayBanksCache = budpayBanksResponse.data;
          console.log(`✅ [SMART MAPPING] Cached ${this.budpayBanksCache.length} BudPay banks`);
        }
      }

      // Find matching bank by name
      const normalizedBankName = this.normalizeBankName(bankName);
      const matchingBank = this.budpayBanksCache.find(bank => 
        this.normalizeBankName(bank.bankName) === normalizedBankName ||
        this.normalizeBankName(bank.bankName).includes(normalizedBankName) ||
        normalizedBankName.includes(this.normalizeBankName(bank.bankName))
      );

      if (matchingBank) {
        const budpayCode = matchingBank.bankCode;
        console.log(`🔄 [SMART MAPPING] Found match: ${bankName} (${nyraBankCode}) -> ${matchingBank.bankName} (${budpayCode})`);
        
        // Cache the result
        this.bankMappingsCache.set(cacheKey, budpayCode);
        return budpayCode;
      }

      // If no match found, return original code (some banks might have same codes)
      console.log(`⚠️ [SMART MAPPING] No match found for ${bankName} (${nyraBankCode}), using original code`);
      this.bankMappingsCache.set(cacheKey, nyraBankCode);
      return nyraBankCode;

    } catch (error) {
      console.log(`❌ [SMART MAPPING] Error converting bank code for ${bankName}:`, error.message);
      // Fallback to original code
      this.bankMappingsCache.set(cacheKey, nyraBankCode);
      return nyraBankCode;
    }
  }

  /**
   * Normalize bank name for better matching
   */
  private normalizeBankName(bankName: string): string {
    return bankName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/\b(plc|limited|ltd|inc|corporation|corp)\b/g, '') // Remove common suffixes
      .trim();
  }

  /**
   * Get list of all banks from active transfer provider
   */
  async getBanks(): Promise<BanksListResponseDto> {
    try {
      console.log(
        '🌐 [TRANSFER PROVIDER] Fetching banks from active provider...',
      );

      const response = await this.transferProviderManager.getBankList();

      if (!response.success) {
        console.log(
          '❌ [TRANSFER PROVIDER] Failed to fetch banks:',
          response.message,
        );
        throw new HttpException(
          response.message || 'Failed to fetch banks from payment provider',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Convert provider response to expected format
      const bankList = {
        status: true,
        banks: response.data.map((bank) => ({
          name: bank.bankName,
          code: bank.bankCode,
        })),
      };

      console.log(
        '✅ [TRANSFER PROVIDER] Banks fetched successfully - Count:',
        bankList.banks.length,
      );
      return bankList;
    } catch (error) {
      console.log(
        '🚨 [TRANSFER PROVIDER] Error fetching banks:',
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error connecting to payment provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Super resolve account number across multiple banks using transfer provider
   */
  async superResolveAccount(
    superResolveDto: SuperResolveAccountDto,
  ): Promise<SuperResolveAccountResponseDto> {
    const startTime = Date.now();
    const accountNumber = superResolveDto.account_number;

    try {
      console.log(
        '🔍 [SUPER RESOLVE] Starting super resolve for account:',
        accountNumber,
      );
      console.log(
        '🏦 [SUPER RESOLVE] Using transfer provider for reliable resolution...',
      );

      // Check cache first
      const cachedResult = this.getCachedResult(accountNumber);
      if (cachedResult) {
        console.log(`💾 [SUPER RESOLVE] Cache HIT for account: ${accountNumber}`);
        return cachedResult;
      }

      // Check for pending requests to prevent duplicate API calls
      if (this.pendingRequests.has(accountNumber)) {
        console.log(`⏳ [SUPER RESOLVE] Waiting for pending request for account: ${accountNumber}`);
        return await this.pendingRequests.get(accountNumber);
      }

      // Create a promise for this request and store it
      const requestPromise = this.performSuperResolve(accountNumber, startTime);
      this.pendingRequests.set(accountNumber, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(accountNumber);
      }
    } catch (error) {
      console.error(
        '🚨 [SUPER RESOLVE] Error in superResolveAccount:',
        error.message,
      );
      throw new HttpException(
        'Error during super resolve process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Perform the actual super resolve operation
   */
  private async performSuperResolve(
    accountNumber: string,
    startTime: number,
  ): Promise<SuperResolveAccountResponseDto> {
    try {
      // Get banks list from transfer provider
      const banksResponse = await this.getBanks();
      if (
        !banksResponse.status ||
        !banksResponse.banks ||
        banksResponse.banks.length === 0
      ) {
        throw new HttpException(
          'Failed to fetch banks list from transfer provider',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const banks = banksResponse.banks;

      // Prioritize digital and commercial banks
      const digitalBankCodes = this.DIGITAL_BANKS.map((b) => b.code);
      const digitalBankNames = this.DIGITAL_BANKS.map((b) =>
        b.name.toLowerCase(),
      );
      const commercialBankCodes = this.COMMERCIAL_BANKS.map((b) => b.code);
      const commercialBankNames = this.COMMERCIAL_BANKS.map((b) =>
        b.name.toLowerCase(),
      );
      const digitalBanks = banks.filter(
        (b) =>
          digitalBankCodes.includes(b.code) ||
          digitalBankNames.some((name) => b.name.toLowerCase().includes(name)),
      );
      const commercialBanks = banks.filter(
        (b) =>
          commercialBankCodes.includes(b.code) ||
          commercialBankNames.some((name) =>
            b.name.toLowerCase().includes(name),
          ),
      );
      // Sort digital and commercial banks in preferred order
      digitalBanks.sort((a, b) => {
        const aIdx = digitalBankCodes.indexOf(a.code);
        const bIdx = digitalBankCodes.indexOf(b.code);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
      commercialBanks.sort((a, b) => {
        const aIdx = commercialBankCodes.indexOf(a.code);
        const bIdx = commercialBankCodes.indexOf(b.code);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });

      // Helper to try a list of banks and return on first match
      const tryBanks = async (
        banksToTry: any[],
      ): Promise<SuperResolveAccountResponseDto | null> => {
        for (let i = 0; i < banksToTry.length; i++) {
          const bank = banksToTry[i];
          const attemptNumber = i + 1;
          try {
            console.log(
              `🚀 [SUPER RESOLVE] Testing attempt ${attemptNumber}/${banksToTry.length}: ${bank.name} (${bank.code})`,
            );
            const verificationResponse =
              await this.transferProviderManager.verifyAccount({
                accountNumber,
                bankCode: bank.code,
              });
            if (
              verificationResponse.success &&
              verificationResponse.data?.accountName
            ) {
              console.log(
                `✅ [SUPER RESOLVE] SUCCESS! Found account in ${bank.name} (Attempt ${attemptNumber})`,
              );
              const result = {
                success: true,
                message: 'Account resolved successfully',
                account_name: verificationResponse.data.accountName,
                account_number: accountNumber,
                bank_name: bank.name,
                bank_code: bank.code,
                banks_tested: attemptNumber,
                execution_time: (Date.now() - startTime) / 1000,
              };
              console.log(
                `🛑 [SUPER RESOLVE] Stopping search after ${attemptNumber} attempts`,
              );
              return result;
            } else {
              console.log(
                `❌ [SUPER RESOLVE] Not found in ${bank.name} (Attempt ${attemptNumber}): ${verificationResponse.message || 'Account not found'}`,
              );
            }
          } catch (error) {
            console.error(
              `❌ [SUPER RESOLVE] Error testing ${bank.name} (Attempt ${attemptNumber}):`,
              error.message,
            );
          }
        }
        return null;
      };

      // Try digital banks first
      let result = await tryBanks(digitalBanks);
      if (result) {
        this.cacheResult(accountNumber, result);
        return result;
      }
      // If not found, try commercial banks
      result = await tryBanks(commercialBanks);
      if (result) {
        this.cacheResult(accountNumber, result);
        return result;
      }
      // If not found in either, stop and return failure
      const executionTime = (Date.now() - startTime) / 1000;
      console.log(
        '❌ [SUPER RESOLVE] NO MATCH FOUND in digital or commercial banks',
      );
      console.log(
        `📊 [SUPER RESOLVE] Tested ${digitalBanks.length + commercialBanks.length} banks in ${executionTime.toFixed(2)}s`,
      );
      this.cacheResult(accountNumber, {
        success: false,
        message: 'Account not found in digital or commercial banks',
        banks_tested: digitalBanks.length + commercialBanks.length,
        execution_time: executionTime,
        error:
          'Account number not found in digital or commercial banks. Please try with a specific bank.',
      });
      return {
        success: false,
        message: 'Account not found in digital or commercial banks',
        banks_tested: digitalBanks.length + commercialBanks.length,
        execution_time: executionTime,
        error:
          'Account number not found in digital or commercial banks. Please try with a specific bank.',
      };
    } catch (error) {
      console.error(
        '🚨 [SUPER RESOLVE] Error in performSuperResolve:',
        error.message,
      );
      throw new HttpException(
        'Error during super resolve process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Resolve bank account to get account holder name using BudPay for better success rate
   */
  async resolveAccount(
    resolveAccountDto: ResolveAccountDto,
  ): Promise<ResolveAccountResponseDto> {
    try {
      console.log(
        '🔍 [BANK SEARCH] Searching for bank:',
        resolveAccountDto.bank_name,
      );

      // First, find the bank code from the bank name using active provider
      const bank = await this.findBankByName(resolveAccountDto.bank_name);

      if (!bank) {
        console.log(
          '❌ [BANK SEARCH] Bank not found:',
          resolveAccountDto.bank_name,
        );
        throw new HttpException(
          `Bank not found: ${resolveAccountDto.bank_name}. Please check the bank name and try again.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log(
        '✅ [BANK SEARCH] Bank found:',
        JSON.stringify(bank, null, 2),
      );
      console.log(
        '🌐 [HYBRID PROVIDER] Using BudPay for account verification (better success rate)...',
      );

      // Convert NYRA bank code to BudPay bank code using smart matching
      const budpayBankCode = await this.convertToBudPayBankCode(bank.code, bank.name);
      console.log(`🔄 [HYBRID PROVIDER] Converting bank code: ${bank.code} -> ${budpayBankCode}`);

      // Use BudPay for account verification
      const budpayResponse = await this.budPayTransferProvider.verifyAccount({
        accountNumber: resolveAccountDto.account_number,
        bankCode: budpayBankCode,
      });

      console.log(
        '📥 [BUDPAY PROVIDER] Account verification response:',
        JSON.stringify(budpayResponse, null, 2),
      );

      if (!budpayResponse.success) {
        console.log(
          '❌ [BUDPAY PROVIDER] Account resolution failed, trying fallback with active provider...',
          budpayResponse.message || 'Unknown error',
        );
        
        // Fallback to active provider if BudPay fails
        const fallbackResponse = await this.transferProviderManager.verifyAccount({
          accountNumber: resolveAccountDto.account_number,
          bankCode: bank.code,
        });

        console.log(
          '📥 [FALLBACK PROVIDER] Account verification response:',
          JSON.stringify(fallbackResponse, null, 2),
        );

        if (!fallbackResponse.success) {
          console.log(
            '❌ [FALLBACK PROVIDER] Account resolution failed:',
            fallbackResponse.message || 'Unknown error',
          );
          throw new HttpException(
            fallbackResponse.message || 'Account resolution failed',
            HttpStatus.BAD_REQUEST,
          );
        }

        console.log(
          '✅ [FALLBACK PROVIDER] Final result:',
          JSON.stringify(fallbackResponse.data, null, 2),
        );

        return {
          status: true,
          account_name: fallbackResponse.data.accountName,
          account_number: resolveAccountDto.account_number,
          bank_name: bank.name,
          bank_code: bank.code,
          message: 'Account resolved successfully (fallback)',
        };
      }

      console.log(
        '✅ [BUDPAY PROVIDER] Final result:',
        JSON.stringify(budpayResponse.data, null, 2),
      );

      return {
        status: true,
        account_name: budpayResponse.data.accountName,
        account_number: resolveAccountDto.account_number,
        bank_name: bank.name,
        bank_code: bank.code,
        message: 'Account resolved successfully (BudPay)',
      };
    } catch (error) {
      console.log(
        '🚨 [ACCOUNTS SERVICE] Error in resolveAccount:',
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error resolving account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find bank by name (helper method)
   * Supports partial matching and common variations
   */
  async findBankByName(
    bankName: string,
  ): Promise<{ code: string; name: string } | null> {
    try {
      console.log('🔎 [BANK MATCHER] Starting search for bank name:', bankName);

      const banksResponse = await this.getBanks();
      const searchTerm = bankName.toLowerCase().trim();
      console.log('🔤 [BANK MATCHER] Normalized search term:', searchTerm);

      // First try exact match
      console.log('🎯 [BANK MATCHER] Trying exact match...');
      let bank = banksResponse.banks.find(
        (bank) => bank.name.toLowerCase() === searchTerm,
      );

      // If not found, try partial match (contains search term)
      if (!bank) {
        console.log(
          '🔍 [BANK MATCHER] Trying partial match (bank name contains search term)...',
        );
        bank = banksResponse.banks.find((bank) =>
          bank.name.toLowerCase().includes(searchTerm),
        );
      }

      // If still not found, try reverse search (search term contains bank name)
      if (!bank) {
        console.log(
          '🔄 [BANK MATCHER] Trying reverse match (search term contains bank name)...',
        );
        bank = banksResponse.banks.find((bank) =>
          searchTerm.includes(bank.name.toLowerCase()),
        );
      }

      // Handle common variations and abbreviations
      if (!bank) {
        console.log(
          '🎭 [BANK MATCHER] Trying common variations and abbreviations...',
        );
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
            '🎪 [BANK MATCHER] Found variation mapping:',
            searchTerm,
            '→',
            variation,
          );
          bank = banksResponse.banks.find((bank) =>
            bank.name.toLowerCase().includes(variation.toLowerCase()),
          );
        }
      }

      // Advanced fuzzy matching for close spellings (but prioritize exact matches)
      if (!bank) {
        console.log('🔍 [BANK MATCHER] Trying fuzzy matching...');

        // Remove common words and try matching
        const cleanedSearch = searchTerm
          .replace(
            /\b(bank|microfinance|mfb|plc|limited|ltd|psb|nigeria)\b/g,
            '',
          )
          .trim();

        if (cleanedSearch && cleanedSearch.length > 2) {
          // First try to find banks that start with the cleaned search term
          bank = banksResponse.banks.find((bank) => {
            const cleanedBankName = bank.name
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
            bank = banksResponse.banks.find((bank) => {
              const cleanedBankName = bank.name
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

      if (bank) {
        console.log(
          '✅ [BANK MATCHER] Match found:',
          JSON.stringify(bank, null, 2),
        );
      } else {
        console.log('❌ [BANK MATCHER] No match found for:', bankName);
        console.log(
          '💡 [BANK MATCHER] Suggestion: Try using full bank name or common abbreviations like GTB, UBA, Kuda, OPay, etc.',
        );
      }

      return bank || null;
    } catch (error) {
      console.log('🚨 [BANK MATCHER] Error in findBankByName:', error.message);
      return null;
    }
  }

}
