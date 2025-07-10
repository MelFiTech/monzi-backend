import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  IWalletProvider,
  WalletCreationData,
  WalletCreationResult,
  WalletBalanceData,
  WalletBalanceResult,
  WalletTransactionData,
  WalletTransactionResult,
} from '../base/wallet-provider.interface';

// BudPay API Interfaces
interface BudPayCreateCustomerPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  metadata?: string;
}

interface BudPayCreateCustomerResponse {
  status: boolean;
  message: string;
  data: {
    email: string;
    domain: string;
    customer_code: string;
    id: number;
    created_at: string;
    updated_at: string;
  };
}

interface BudPayCreateDedicatedAccountPayload {
  customer: string; // customer_code from customer creation
}

interface BudPayCreateDedicatedAccountResponse {
  status: boolean;
  message: string;
  data: {
    bank: {
      name: string;
      id: number;
      bank_code: string;
      prefix: string;
    };
    account_name: string;
    account_number: string;
    currency: string;
    status: string | null;
    reference: string;
    assignment: string;
    id: number;
    created_at: string;
    updated_at: string;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
    };
  };
}

@Injectable()
export class BudPayWalletProvider implements IWalletProvider {
  private readonly logger = new Logger(BudPayWalletProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('BUDPAY_BASE_URL');
    this.secretKey = this.configService.get<string>('BUDPAY_SECRET_KEY');
    this.publicKey = this.configService.get<string>('BUDPAY_PUBLIC_KEY');

    this.logger.log('BudPay Wallet Provider initialized');
  }

  getProviderName(): string {
    return 'BUDPAY';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.secretKey}`,
    };
  }

  /**
   * Find existing dedicated account by email, name, and phone
   */
  private async findExistingDedicatedAccount(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
  ): Promise<{ success: boolean; accountData?: any; error?: string }> {
    try {
      this.logger.log(`🔍 Searching for existing dedicated account for:`);
      this.logger.log(`   📧 Email: ${email}`);
      this.logger.log(`   👤 Name: ${firstName} ${lastName}`);
      this.logger.log(`   📱 Phone: ${phone}`);

      // Step 1: List all dedicated accounts
      const listResponse = await firstValueFrom(
        this.httpService.get<any>(`${this.baseUrl}/list_dedicated_accounts`, {
          headers: this.getHeaders(),
        }),
      );

      if (!listResponse.data.status || !listResponse.data.data) {
        this.logger.error('❌ Failed to list dedicated accounts');
        return { success: false, error: 'Failed to list dedicated accounts' };
      }

      this.logger.log(
        `📋 Found ${listResponse.data.data.length} dedicated accounts, searching for matches...`,
      );

      // Step 2: Find account with multiple matching criteria
      const accounts = listResponse.data.data;
      let matchingAccount = null;
      let matchReason = '';

      // 🔍 DEBUG: Log all accounts to see what we're working with
      this.logger.log('🔍 [DEBUG] All available accounts:');
      accounts.forEach((account: any, index: number) => {
        this.logger.log(
          `   ${index + 1}. Email: ${account.customer?.email || 'N/A'} | Name: ${account.customer?.first_name || 'N/A'} ${account.customer?.last_name || 'N/A'} | Phone: ${account.customer?.phone || 'N/A'}`,
        );
      });

      // Priority 1: Exact email match (case insensitive)
      matchingAccount = accounts.find((account: any) => {
        if (!account.customer || !account.customer.email) return false;
        const match =
          account.customer.email.toLowerCase().trim() ===
          email.toLowerCase().trim();
        if (match)
          this.logger.log(`🎯 [MATCH] Email exact: ${account.customer.email}`);
        return match;
      });

      if (matchingAccount) {
        matchReason = 'email-exact';
        this.logger.log(
          `✅ Found match by EXACT EMAIL: ${matchingAccount.customer.email}`,
        );
      }

      // Priority 2: Name combination match (case insensitive, trimmed)
      if (!matchingAccount) {
        matchingAccount = accounts.find((account: any) => {
          if (!account.customer) return false;

          const customerFirstName = (account.customer.first_name || '')
            .toLowerCase()
            .trim();
          const customerLastName = (account.customer.last_name || '')
            .toLowerCase()
            .trim();
          const searchFirstName = firstName.toLowerCase().trim();
          const searchLastName = lastName.toLowerCase().trim();

          const match =
            customerFirstName === searchFirstName &&
            customerLastName === searchLastName;
          if (match)
            this.logger.log(
              `🎯 [MATCH] Name exact: ${customerFirstName} ${customerLastName}`,
            );
          return match;
        });

        if (matchingAccount) {
          matchReason = 'name-exact';
          this.logger.log(
            `✅ Found match by EXACT NAME: ${matchingAccount.customer.first_name} ${matchingAccount.customer.last_name}`,
          );
        }
      }

      // Priority 3: Phone number match (flexible formatting)
      if (!matchingAccount && phone) {
        // Clean phone numbers for comparison (remove spaces, dashes, plus signs)
        const cleanSearchPhone = phone.replace(/[\s\-\+\(\)]/g, '');

        matchingAccount = accounts.find((account: any) => {
          if (!account.customer || !account.customer.phone) return false;

          const customerPhone = account.customer.phone.replace(
            /[\s\-\+\(\)]/g,
            '',
          );
          const match = customerPhone === cleanSearchPhone;
          if (match)
            this.logger.log(
              `🎯 [MATCH] Phone exact: ${customerPhone} vs ${cleanSearchPhone}`,
            );
          return match;
        });

        if (matchingAccount) {
          matchReason = 'phone-exact';
          this.logger.log(
            `✅ Found match by EXACT PHONE: ${matchingAccount.customer.phone}`,
          );
        }
      }

      // Priority 4: Partial email match (same domain, similar local part)
      if (!matchingAccount) {
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const emailLocal = email.split('@')[0]?.toLowerCase();

        matchingAccount = accounts.find((account: any) => {
          if (!account.customer || !account.customer.email) return false;

          const customerEmail = account.customer.email.toLowerCase();
          const customerDomain = customerEmail.split('@')[1]?.toLowerCase();
          const customerLocal = customerEmail.split('@')[0]?.toLowerCase();

          // Match if same domain AND (exact local OR similar local)
          const domainMatch = customerDomain === emailDomain;
          const localMatch = customerLocal === emailLocal;
          const similarLocal =
            Math.abs(customerLocal.length - emailLocal.length) <= 1 &&
            (customerLocal.includes(emailLocal) ||
              emailLocal.includes(customerLocal));

          const match = domainMatch && (localMatch || similarLocal);
          if (match)
            this.logger.log(
              `🎯 [MATCH] Email partial: ${customerEmail} (domain: ${domainMatch}, local: ${localMatch || similarLocal})`,
            );
          return match;
        });

        if (matchingAccount) {
          matchReason = 'email-partial';
          this.logger.log(
            `✅ Found match by PARTIAL EMAIL: ${matchingAccount.customer.email}`,
          );
        }
      }

      // Priority 5: Fuzzy name match (handles extra spaces, capitalization)
      if (!matchingAccount) {
        const normalizeString = (str: string) =>
          str.toLowerCase().replace(/\s+/g, ' ').trim();
        const searchFullName = normalizeString(`${firstName} ${lastName}`);

        matchingAccount = accounts.find((account: any) => {
          if (!account.customer) return false;

          const customerFullName = normalizeString(
            `${account.customer.first_name || ''} ${account.customer.last_name || ''}`,
          );
          const match = customerFullName === searchFullName;
          if (match)
            this.logger.log(
              `🎯 [MATCH] Name fuzzy: "${customerFullName}" vs "${searchFullName}"`,
            );
          return match;
        });

        if (matchingAccount) {
          matchReason = 'name-fuzzy';
          this.logger.log(
            `✅ Found match by FUZZY NAME: ${matchingAccount.customer.first_name} ${matchingAccount.customer.last_name}`,
          );
        }
      }

      if (!matchingAccount) {
        this.logger.log(
          `❌ No dedicated account found after all search attempts`,
        );
        this.logger.log(`🔍 [DEBUG] Search criteria used:`);
        this.logger.log(
          `   📧 Email: "${email}" (domain: ${email.split('@')[1]}, local: ${email.split('@')[0]})`,
        );
        this.logger.log(`   👤 Name: "${firstName}" + "${lastName}"`);
        this.logger.log(
          `   📱 Phone: "${phone}" (cleaned: ${phone.replace(/[\s\-\+\(\)]/g, '')})`,
        );
        return {
          success: false,
          error: 'No existing dedicated account found for this user',
        };
      }

      this.logger.log(
        `✅ Found matching account ID: ${matchingAccount.id} (matched by: ${matchReason})`,
      );
      this.logger.log(
        `   📊 Customer: ${matchingAccount.customer.first_name} ${matchingAccount.customer.last_name}`,
      );
      this.logger.log(`   📧 Email: ${matchingAccount.customer.email}`);
      this.logger.log(
        `   📱 Phone: ${matchingAccount.customer.phone || 'N/A'}`,
      );

      // Step 3: Get detailed account information
      const detailResponse = await firstValueFrom(
        this.httpService.get<any>(
          `${this.baseUrl}/dedicated_account/${matchingAccount.id}`,
          { headers: this.getHeaders() },
        ),
      );

      if (!detailResponse.data.status || !detailResponse.data.data) {
        this.logger.error(
          `❌ Failed to get details for account ID: ${matchingAccount.id}`,
        );
        return { success: false, error: 'Failed to get account details' };
      }

      const accountDetails = detailResponse.data.data;

      this.logger.log(`✅ Retrieved account details:`, {
        accountNumber: accountDetails.dedicated_account.account_number,
        accountName: accountDetails.dedicated_account.account_name,
        customerCode: accountDetails.customer.customer_code,
        matchedBy: matchReason,
      });

      // Step 4: Format the data in the same structure as createWallet
      const formattedData = {
        accountNumber: accountDetails.dedicated_account.account_number,
        accountName: accountDetails.dedicated_account.account_name,
        customerId: accountDetails.customer.customer_code,
        bankName: accountDetails.provider.bank_name,
        bankCode: accountDetails.provider.bank_code,
        currency: accountDetails.dedicated_account.currency,
        status: accountDetails.dedicated_account.status,
        providerReference:
          accountDetails.dedicated_account.reference ||
          matchingAccount.reference,
        metadata: {
          budPayAccountId: accountDetails.dedicated_account.id,
          budPayCustomerId: accountDetails.customer.id,
          bankPrefix: accountDetails.provider.prefix,
          assignment: accountDetails.assignment,
          createdAt: accountDetails.dedicated_account.created_at,
          matchedBy: matchReason, // Track how we found this account
        },
      };

      return { success: true, accountData: formattedData };
    } catch (error) {
      this.logger.error(
        '❌ Error finding existing dedicated account:',
        error.message,
      );
      return {
        success: false,
        error: `Error searching for existing account: ${error.message}`,
      };
    }
  }

  /**
   * More intensive search for when BudPay claims account exists but regular search fails
   */
  private async findExistingDedicatedAccountIntensive(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
  ): Promise<{ success: boolean; accountData?: any; error?: string }> {
    try {
      this.logger.log(`🔍 [INTENSIVE] Starting intensive search for: ${email}`);

      // Step 1: List all dedicated accounts
      const listResponse = await firstValueFrom(
        this.httpService.get<any>(`${this.baseUrl}/list_dedicated_accounts`, {
          headers: this.getHeaders(),
        }),
      );

      if (!listResponse.data.status || !listResponse.data.data) {
        this.logger.error('❌ Failed to list dedicated accounts');
        return { success: false, error: 'Failed to list dedicated accounts' };
      }

      const accounts = listResponse.data.data;
      this.logger.log(
        `📋 [INTENSIVE] Found ${accounts.length} total accounts, performing deep analysis...`,
      );

      // Create search variations
      const emailVariations = [
        email.toLowerCase().trim(),
        email.toUpperCase().trim(),
        email.trim(),
      ];

      const nameVariations = [
        `${firstName} ${lastName}`.toLowerCase().trim(),
        `${firstName} ${lastName}`.toUpperCase().trim(),
        `${firstName.toLowerCase()} ${lastName.toLowerCase()}`,
        `${firstName.toUpperCase()} ${lastName.toUpperCase()}`,
        `${lastName} ${firstName}`.toLowerCase().trim(), // Sometimes names are swapped
        `${lastName}, ${firstName}`.toLowerCase().trim(),
      ];

      const phoneVariations = phone
        ? [
            phone.replace(/[\s\-\+\(\)]/g, ''),
            phone.replace(/^\+234/, '0'), // Convert +234 to 0
            phone.replace(/^0/, '+234'), // Convert 0 to +234
            phone,
            phone.replace(/[\s\-]/g, ''),
          ]
        : [];

      this.logger.log(`🔍 [INTENSIVE] Search variations:`);
      this.logger.log(`   📧 Email variations: ${emailVariations.length}`);
      this.logger.log(`   👤 Name variations: ${nameVariations.length}`);
      this.logger.log(`   📱 Phone variations: ${phoneVariations.length}`);

      // Search with each variation
      for (const account of accounts) {
        if (!account.customer) continue;

        const customerEmail = (account.customer.email || '').trim();
        const customerFirstName = (account.customer.first_name || '').trim();
        const customerLastName = (account.customer.last_name || '').trim();
        const customerPhone = (account.customer.phone || '').trim();
        const customerFullName =
          `${customerFirstName} ${customerLastName}`.trim();

        // Email matching
        for (const emailVar of emailVariations) {
          if (customerEmail.toLowerCase() === emailVar.toLowerCase()) {
            this.logger.log(`🎯 [INTENSIVE] MATCH by email: ${customerEmail}`);
            return await this.getAccountDetails(account.id);
          }
        }

        // Name matching
        for (const nameVar of nameVariations) {
          if (customerFullName.toLowerCase() === nameVar.toLowerCase()) {
            this.logger.log(
              `🎯 [INTENSIVE] MATCH by name: "${customerFullName}" matched "${nameVar}"`,
            );
            return await this.getAccountDetails(account.id);
          }
        }

        // Phone matching
        if (phoneVariations.length > 0) {
          const cleanCustomerPhone = customerPhone.replace(/[\s\-\+\(\)]/g, '');
          for (const phoneVar of phoneVariations) {
            const cleanPhoneVar = phoneVar.replace(/[\s\-\+\(\)]/g, '');
            if (cleanCustomerPhone === cleanPhoneVar) {
              this.logger.log(
                `🎯 [INTENSIVE] MATCH by phone: ${customerPhone} (cleaned: ${cleanCustomerPhone})`,
              );
              return await this.getAccountDetails(account.id);
            }
          }
        }

        // Substring matching for emails (typo tolerance)
        const emailLocal = email.split('@')[0]?.toLowerCase();
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const customerEmailLocal = customerEmail.split('@')[0]?.toLowerCase();
        const customerEmailDomain = customerEmail.split('@')[1]?.toLowerCase();

        if (emailDomain && customerEmailDomain === emailDomain) {
          // Same domain - check if local parts are similar
          if (emailLocal && customerEmailLocal) {
            const similarity = this.calculateStringSimilarity(
              emailLocal,
              customerEmailLocal,
            );
            if (similarity > 0.8) {
              // 80% similarity
              this.logger.log(
                `🎯 [INTENSIVE] MATCH by email similarity: ${customerEmail} (${(similarity * 100).toFixed(1)}% similar)`,
              );
              return await this.getAccountDetails(account.id);
            }
          }
        }

        // Name substring matching (for extra names, titles, etc.)
        const searchNameParts = `${firstName} ${lastName}`
          .toLowerCase()
          .split(/\s+/);
        const customerNameParts = `${customerFirstName} ${customerLastName}`
          .toLowerCase()
          .split(/\s+/);

        let nameMatchCount = 0;
        for (const searchPart of searchNameParts) {
          for (const customerPart of customerNameParts) {
            if (searchPart === customerPart && searchPart.length > 2) {
              nameMatchCount++;
            }
          }
        }

        if (nameMatchCount >= 2) {
          // At least 2 name parts match
          this.logger.log(
            `🎯 [INTENSIVE] MATCH by name parts: ${customerFullName} (${nameMatchCount} parts matched)`,
          );
          return await this.getAccountDetails(account.id);
        }
      }

      this.logger.log(
        `❌ [INTENSIVE] No matches found even with intensive search`,
      );
      return {
        success: false,
        error: 'No existing dedicated account found even with intensive search',
      };
    } catch (error) {
      this.logger.error(
        '❌ [INTENSIVE] Error during intensive search:',
        error.message,
      );
      return {
        success: false,
        error: `Intensive search failed: ${error.message}`,
      };
    }
  }

  /**
   * Calculate string similarity (simple algorithm)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create or get existing customer and account
   */
  private async createOrGetCustomer(data: WalletCreationData): Promise<{
    success: boolean;
    customerCode?: string;
    accountData?: any;
    error?: string;
  }> {
    const customerPayload: BudPayCreateCustomerPayload = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phoneNumber,
      metadata: JSON.stringify({
        bvn: data.bvn,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      }),
    };

    try {
      this.logger.log('🔄 Attempting to create BudPay customer...');
      const customerResponse = await firstValueFrom(
        this.httpService.post<BudPayCreateCustomerResponse>(
          `${this.baseUrl}/customer`,
          customerPayload,
          { headers: this.getHeaders() },
        ),
      );

      if (customerResponse.data.status) {
        const customerCode = customerResponse.data.data.customer_code;
        this.logger.log(
          `✅ New BudPay customer created with code: ${customerCode}`,
        );
        return { success: true, customerCode };
      } else {
        return { success: false, error: customerResponse.data.message };
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';

      // Check if error is "Customer already exist"
      if (
        error.response?.status === 401 ||
        errorMessage.toLowerCase().includes('customer already exist')
      ) {
        this.logger.log(
          '⚠️ Customer already exists! Searching for existing dedicated account...',
        );

        // Use the new approach: find existing dedicated account
        const accountResult = await this.findExistingDedicatedAccount(
          data.email,
          data.firstName,
          data.lastName,
          data.phoneNumber,
        );

        if (accountResult.success) {
          this.logger.log(
            `✅ Found existing dedicated account for: ${data.email}`,
          );
          return {
            success: true,
            accountData: accountResult.accountData,
            customerCode: accountResult.accountData.customerId,
          };
        } else {
          // 🚀 NEW LOGIC: If customer exists but no dedicated account found, get customer code and create new account
          this.logger.log(
            '💡 Customer exists but no dedicated account found. Attempting to retrieve customer and create dedicated account...',
          );

          // Try to get customer code by searching customers
          const customerCode = await this.getCustomerCodeByEmail(data.email);

          if (customerCode) {
            this.logger.log(`✅ Found existing customer code: ${customerCode}`);
            return { success: true, customerCode };
          } else {
            this.logger.log(
              '❌ Could not retrieve customer code for existing customer',
            );
            return {
              success: false,
              error:
                'Customer exists but could not retrieve customer details. Please contact support.',
            };
          }
        }
      }

      // 🚨 SPECIFIC HANDLING: "Dedicated Account already created for Customer"
      if (
        errorMessage.toLowerCase().includes('dedicated account already created')
      ) {
        this.logger.log(
          '🔍 BudPay says dedicated account already exists. Performing intensive search...',
        );

        // More aggressive search with detailed logging
        const accountResult = await this.findExistingDedicatedAccountIntensive(
          data.email,
          data.firstName,
          data.lastName,
          data.phoneNumber,
        );

        if (accountResult.success) {
          this.logger.log(
            `✅ Found existing dedicated account through intensive search for: ${data.email}`,
          );
          return {
            success: true,
            accountData: accountResult.accountData,
            customerCode: accountResult.accountData.customerId,
          };
        } else {
          // As a last resort, use any customer code we can find
          const customerCode = await this.getCustomerCodeByEmail(data.email);
          if (customerCode) {
            this.logger.log(
              `🆘 Using customer code for manual recovery: ${customerCode}`,
            );
            return { success: true, customerCode };
          }

          this.logger.error(
            '🚨 Critical: BudPay says account exists but we cannot find it anywhere',
          );
          return {
            success: false,
            error:
              'Account exists but cannot be located. Please contact support with this error.',
          };
        }
      }

      // Other errors
      this.logger.error(`❌ Customer creation failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get customer code by email (fallback method)
   */
  private async getCustomerCodeByEmail(email: string): Promise<string | null> {
    try {
      this.logger.log(
        `🔍 Attempting to retrieve customer code for email: ${email}`,
      );

      // Try different BudPay endpoints to get customer info
      // Method 1: Try to list customers (if endpoint exists)
      try {
        const response = await firstValueFrom(
          this.httpService.get<any>(
            `${this.baseUrl}/customers?email=${encodeURIComponent(email)}`,
            { headers: this.getHeaders() },
          ),
        );

        if (response.data.status && response.data.data?.length > 0) {
          const customerCode = response.data.data[0].customer_code;
          this.logger.log(
            `✅ Found customer code via customer list: ${customerCode}`,
          );
          return customerCode;
        }
      } catch (listError) {
        this.logger.log('⚠️ Customer list endpoint not available or failed');
      }

      // Method 2: Extract from dedicated accounts (more detailed search)
      const listResponse = await firstValueFrom(
        this.httpService.get<any>(`${this.baseUrl}/list_dedicated_accounts`, {
          headers: this.getHeaders(),
        }),
      );

      if (listResponse.data.status && listResponse.data.data) {
        this.logger.log(
          `🔍 Searching ${listResponse.data.data.length} dedicated accounts for any trace of email: ${email}`,
        );

        // More flexible search - check email domains, partial matches
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const emailLocal = email.split('@')[0]?.toLowerCase();

        for (const account of listResponse.data.data) {
          if (account.customer && account.customer.email) {
            const customerEmail = account.customer.email.toLowerCase();
            const customerDomain = customerEmail.split('@')[1]?.toLowerCase();
            const customerLocal = customerEmail.split('@')[0]?.toLowerCase();

            // Exact match
            if (customerEmail === email.toLowerCase()) {
              this.logger.log(
                `✅ Found exact email match: ${account.customer.customer_code}`,
              );
              return account.customer.customer_code;
            }

            // Domain + local part similarity (for typos)
            if (
              customerDomain === emailDomain &&
              (customerLocal === emailLocal ||
                Math.abs(customerLocal.length - emailLocal.length) <= 2)
            ) {
              this.logger.log(
                `✅ Found similar email match: ${customerEmail} -> ${account.customer.customer_code}`,
              );
              return account.customer.customer_code;
            }
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error('❌ Error retrieving customer code:', error.message);
      return null;
    }
  }

  /**
   * Get detailed account information for a specific account ID
   */
  private async getAccountDetails(
    accountId: string,
  ): Promise<{ success: boolean; accountData?: any; error?: string }> {
    try {
      this.logger.log(`📝 Getting detailed account info for ID: ${accountId}`);

      const detailResponse = await firstValueFrom(
        this.httpService.get<any>(
          `${this.baseUrl}/dedicated_account/${accountId}`,
          { headers: this.getHeaders() },
        ),
      );

      if (!detailResponse.data.status) {
        this.logger.error(`❌ Failed to get account details for ${accountId}`);
        return { success: false, error: 'Failed to get account details' };
      }

      const accountData = detailResponse.data.data;
      const formattedData = {
        accountNumber: accountData.account_number,
        accountName: accountData.account_name,
        bankName: accountData.bank?.name || 'Unknown Bank',
        bankCode: accountData.bank?.code || '',
        customerId: accountData.customer?.customer_code || '',
        reference: accountData.reference || accountId,
        accountId: accountId,
        status: accountData.status || 'unknown',
      };

      this.logger.log(
        `✅ Account details retrieved for: ${formattedData.accountName}`,
      );
      this.logger.log(
        `   🏦 Bank: ${formattedData.bankName} (${formattedData.bankCode})`,
      );
      this.logger.log(`   🔢 Account: ${formattedData.accountNumber}`);
      this.logger.log(`   🆔 Customer: ${formattedData.customerId}`);

      return { success: true, accountData: formattedData };
    } catch (error) {
      this.logger.error(
        `❌ Error getting account details for ${accountId}:`,
        error.message,
      );
      return {
        success: false,
        error: `Failed to get account details: ${error.message}`,
      };
    }
  }

  async createWallet(data: WalletCreationData): Promise<WalletCreationResult> {
    this.logger.log(
      `Creating BudPay wallet for: ${data.firstName} ${data.lastName}`,
    );

    try {
      // Step 1: Create or get existing customer
      const customerResult = await this.createOrGetCustomer(data);

      if (!customerResult.success) {
        this.logger.error(
          `❌ Customer operation failed: ${customerResult.error}`,
        );
        return {
          success: false,
          message: 'Customer creation/retrieval failed',
          error: customerResult.error,
        };
      }

      // Check if we got existing account data (customer already exists scenario)
      if (customerResult.accountData) {
        this.logger.log(
          `🎯 Using existing dedicated account for: ${data.email}`,
        );
        return {
          success: true,
          message: 'Existing wallet account retrieved successfully',
          data: customerResult.accountData,
        };
      }

      // If no existing account data, proceed with normal flow (new customer)
      const customerCode = customerResult.customerCode;
      this.logger.log(
        `🎯 Creating new dedicated account for customer: ${customerCode}`,
      );

      // Step 2: Create Dedicated Virtual Account
      const accountPayload: BudPayCreateDedicatedAccountPayload = {
        customer: customerCode,
      };

      this.logger.log('Creating BudPay dedicated virtual account...');
      const accountResponse = await firstValueFrom(
        this.httpService.post<BudPayCreateDedicatedAccountResponse>(
          `${this.baseUrl}/dedicated_virtual_account`,
          accountPayload,
          { headers: this.getHeaders() },
        ),
      );

      if (!accountResponse.data.status) {
        this.logger.error(
          `BudPay virtual account creation failed: ${accountResponse.data.message}`,
        );
        return {
          success: false,
          message: 'Virtual account creation failed',
          error: accountResponse.data.message,
        };
      }

      const accountData = accountResponse.data.data;
      this.logger.log(
        `✅ BudPay virtual account created: ${accountData.account_number}`,
      );

      return {
        success: true,
        message: 'Wallet created successfully',
        data: {
          accountNumber: accountData.account_number,
          accountName: accountData.account_name,
          customerId: customerCode,
          bankName: accountData.bank.name,
          bankCode: accountData.bank.bank_code,
          currency: accountData.currency,
          status: accountData.status || 'active',
          providerReference: accountData.reference,
          metadata: {
            budPayAccountId: accountData.id,
            budPayCustomerId: accountData.customer.id,
            bankPrefix: accountData.bank.prefix,
            assignment: accountData.assignment,
            createdAt: accountData.created_at,
          },
        },
      };
    } catch (error) {
      this.logger.error('❌ BudPay wallet creation error:', error);

      // 🚨 SPECIFIC HANDLING: "Dedicated Account already created for Customer" in dedicated account creation
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';

      if (
        errorMessage.toLowerCase().includes('dedicated account already created')
      ) {
        this.logger.log(
          '🔍 Dedicated account already exists for customer. Performing intensive search...',
        );

        // More aggressive search with detailed logging
        const accountResult = await this.findExistingDedicatedAccountIntensive(
          data.email,
          data.firstName,
          data.lastName,
          data.phoneNumber,
        );

        if (accountResult.success) {
          this.logger.log(
            `✅ Found existing dedicated account through intensive search for: ${data.email}`,
          );
          return {
            success: true,
            message: 'Existing wallet account retrieved successfully',
            data: accountResult.accountData,
          };
        } else {
          this.logger.error(
            '🚨 Critical: BudPay says dedicated account exists but we cannot find it anywhere',
          );
          return {
            success: false,
            message:
              'Account exists but cannot be located. Please contact support with this error.',
            error:
              'Account exists but cannot be located. Please contact support with this error.',
          };
        }
      }

      if (error.response?.data) {
        const errorData = error.response.data;
        return {
          success: false,
          message: 'Wallet creation failed',
          error:
            errorData.message || errorData.error || 'Unknown error occurred',
        };
      }

      return {
        success: false,
        message: 'Wallet creation failed',
        error: error.message || 'Network error occurred',
      };
    }
  }

  async getWalletBalance(
    data: WalletBalanceData,
  ): Promise<WalletBalanceResult> {
    // BudPay balance inquiry implementation would go here
    // For now, return a placeholder implementation
    this.logger.log(
      `Getting wallet balance for account: ${data.accountNumber}`,
    );

    return {
      success: false,
      balance: 0,
      currency: 'NGN',
      accountNumber: data.accountNumber,
      error: 'Balance inquiry not implemented for BudPay provider',
    };
  }

  async processTransaction(
    data: WalletTransactionData,
  ): Promise<WalletTransactionResult> {
    // BudPay transaction processing implementation would go here
    // For now, return a placeholder implementation
    this.logger.log(`Processing transaction: ${data.reference}`);

    return {
      success: false,
      message: 'Transaction processing not implemented for BudPay provider',
      error: 'Transaction processing not implemented for BudPay provider',
    };
  }
}
