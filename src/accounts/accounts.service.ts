import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResolveAccountDto, BanksListResponseDto, ResolveAccountResponseDto } from './dto/accounts.dto';
import { TransferProviderManagerService } from '../providers/transfer-provider-manager.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly transferProviderManager: TransferProviderManagerService,
  ) {}

  /**
   * Get list of all banks from active transfer provider
   */
  async getBanks(): Promise<BanksListResponseDto> {
    try {
      console.log('🌐 [TRANSFER PROVIDER] Fetching banks from active provider...');
      
      const response = await this.transferProviderManager.getBankList();
      
      if (!response.success) {
        console.log('❌ [TRANSFER PROVIDER] Failed to fetch banks:', response.message);
        throw new HttpException(
          response.message || 'Failed to fetch banks from payment provider',
          HttpStatus.BAD_GATEWAY
        );
      }

      // Convert provider response to expected format
      const bankList = {
        status: true,
        banks: response.data.map(bank => ({
          name: bank.bankName,
          code: bank.bankCode
        }))
      };

      console.log('✅ [TRANSFER PROVIDER] Banks fetched successfully - Count:', bankList.banks.length);
      return bankList;
    } catch (error) {
      console.log('🚨 [TRANSFER PROVIDER] Error fetching banks:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error connecting to payment provider',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Resolve bank account to get account holder name
   */
  async resolveAccount(resolveAccountDto: ResolveAccountDto): Promise<ResolveAccountResponseDto> {
    try {
      console.log('🔍 [BANK SEARCH] Searching for bank:', resolveAccountDto.bank_name);
      
      // First, find the bank code from the bank name
      const bank = await this.findBankByName(resolveAccountDto.bank_name);
      
      if (!bank) {
        console.log('❌ [BANK SEARCH] Bank not found:', resolveAccountDto.bank_name);
        throw new HttpException(
          `Bank not found: ${resolveAccountDto.bank_name}. Please check the bank name and try again.`,
          HttpStatus.BAD_REQUEST
        );
      }

      console.log('✅ [BANK SEARCH] Bank found:', JSON.stringify(bank, null, 2));
      console.log('🌐 [TRANSFER PROVIDER] Verifying account with active provider...');
      
      // Now resolve the account using the found bank code
      const response = await this.transferProviderManager.verifyAccount({
        accountNumber: resolveAccountDto.account_number,
        bankCode: bank.code,
      });

      console.log('📥 [TRANSFER PROVIDER] Account verification response:', JSON.stringify(response, null, 2));

      if (!response.success) {
        console.log('❌ [TRANSFER PROVIDER] Account resolution failed:', response.message || 'Unknown error');
        throw new HttpException(
          response.message || 'Failed to resolve account',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = {
        status: true,
        account_name: response.data.accountName,
        account_number: resolveAccountDto.account_number,
        bank_name: bank.name, // Return the exact bank name from our search
        bank_code: bank.code, // Include the bank code for reference
        message: 'Account resolved successfully',
      };

      console.log('✅ [ACCOUNTS SERVICE] Final result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log('🚨 [ACCOUNTS SERVICE] Error in resolveAccount:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error resolving account',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Find bank by name (helper method)
   * Supports partial matching and common variations
   */
  async findBankByName(bankName: string): Promise<{ code: string; name: string } | null> {
    try {
      console.log('🔎 [BANK MATCHER] Starting search for bank name:', bankName);
      
      const banksResponse = await this.getBanks();
      const searchTerm = bankName.toLowerCase().trim();
      console.log('🔤 [BANK MATCHER] Normalized search term:', searchTerm);
      
      // First try exact match
      console.log('🎯 [BANK MATCHER] Trying exact match...');
      let bank = banksResponse.banks.find(
        (bank) => bank.name.toLowerCase() === searchTerm
      );

      // If not found, try partial match (contains search term)
      if (!bank) {
        console.log('🔍 [BANK MATCHER] Trying partial match (bank name contains search term)...');
        bank = banksResponse.banks.find(
          (bank) => bank.name.toLowerCase().includes(searchTerm)
        );
      }

      // If still not found, try reverse search (search term contains bank name)
      if (!bank) {
        console.log('🔄 [BANK MATCHER] Trying reverse match (search term contains bank name)...');
        bank = banksResponse.banks.find(
          (bank) => searchTerm.includes(bank.name.toLowerCase())
        );
      }

      // Handle common variations and abbreviations
      if (!bank) {
        console.log('🎭 [BANK MATCHER] Trying common variations and abbreviations...');
        const variations = {
          // Traditional Banks
          'first bank': 'First Bank of Nigeria',
          'firstbank': 'First Bank of Nigeria',
          'fbn': 'First Bank of Nigeria',
          'gtbank': 'Guaranty Trust Bank',
          'gtb': 'Guaranty Trust Bank',
          'guaranty trust': 'Guaranty Trust Bank',
          'access': 'Access Bank',
          'access bank': 'Access Bank',
          'zenith': 'Zenith Bank',
          'zenith bank': 'Zenith Bank PLC',
          'uba': 'United Bank for Africa',
          'united bank for africa': 'United Bank for Africa',
          'union': 'Union Bank',
          'union bank': 'Union Bank',
          'unity': 'Unity Bank',
          'unity bank': 'Unity Bank',
          'fcmb': 'FCMB',
          'first city monument bank': 'FCMB',
          'fidelity': 'Fidelity Bank',
          'fidelity bank': 'Fidelity Bank',
          'sterling': 'Sterling Bank',
          'sterling bank': 'Sterling Bank',
          'wema': 'Wema Bank',
          'wema bank': 'Wema Bank',
          'polaris': 'Polaris Bank',
          'polaris bank': 'Polaris Bank',
          'ecobank': 'Ecobank Bank',
          'eco bank': 'Ecobank Bank',
          'heritage': 'Heritage Bank',
          'heritage bank': 'Heritage Bank',
          'keystone': 'Keystone Bank',
          'keystone bank': 'Keystone Bank',
          'stanbic': 'StanbicIBTC Bank',
          'stanbic ibtc': 'StanbicIBTC Bank',
          'standard chartered': 'StandardChartered',
          'citi': 'Citi Bank',
          'citibank': 'Citi Bank',
          'providus': 'Providus Bank',
          'providus bank': 'Providus Bank',
          'suntrust': 'Suntrust Bank',
          'suntrust bank': 'Suntrust Bank',
          'titan': 'Titan Trust Bank',
          'titan trust': 'Titan Trust Bank',
          'globus': 'Globus Bank',
          'globus bank': 'Globus Bank',
          'lotus': 'Lotus Bank',
          'lotus bank': 'Lotus Bank',
          'taj': 'Taj Bank',
          'taj bank': 'Taj Bank',
          'jaiz': 'Jaiz Bank',
          'jaiz bank': 'Jaiz Bank',
          
          // Digital Banks & Fintech
          'kuda': 'Kuda Microfinance Bank',
          'kuda bank': 'Kuda Microfinance Bank',
          'opay': 'OPAY',
          'o-pay': 'OPAY',
          'opay digital': 'OPAY',
          'moniepoint': 'Moniepoint Microfinance Bank',
          'monie point': 'Moniepoint Microfinance Bank',
          'palmpay': 'PALMPAY',
          'palm pay': 'PALMPAY',
          'palmPay': 'PALMPAY',
          'carbon': 'CARBON',
          'fairmoney': 'FAIRMONEY',
          'fair money': 'FAIRMONEY',
          'vfd': 'VFD MFB',
          'v bank': 'VFD MFB',
          'paga': 'PAGA',
          'eyowo': 'Eyowo Microfinance Bank',
          'sparkle': 'Sparkle Microfinance Bank',
          'renmoney': 'Renmoney Microfinance Bank',
          'ren money': 'Renmoney Microfinance Bank',
          'mintyn': 'Mint Microfinance Bank',
          'mint': 'Mint Microfinance Bank',
          'rubies': 'Rubies MFB',
          'rubies bank': 'Rubies MFB',
          'quickfund': 'Quickfund Microfinance Bank',
          'quick fund': 'Quickfund Microfinance Bank',
          'onebank': 'ONE FINANCE',
          'one bank': 'ONE FINANCE',
          'one finance': 'ONE FINANCE',
          'mkudi': 'MKUDI',
          'korapay': 'Koraypay',
          'kora pay': 'Koraypay',
          'flutterwave': 'Flutterwave',
          'flutter wave': 'Flutterwave',
          'paystack': 'TITAN-PAYSTACK MICROFINANCE BANK',
          'pay stack': 'TITAN-PAYSTACK MICROFINANCE BANK',
          'momo': 'MoMo PSB',
          'mtn momo': 'MoMo PSB',
          'smartcash': 'SmartCash Payment Service bank',
          'smart cash': 'SmartCash Payment Service bank',
          'hope': 'HopePSB',
          'hope psb': 'HopePSB',
          'hopepsb': 'HopePSB',
          'tagpay': 'TAGPAY',
          'tag pay': 'TAGPAY',
          'pocketapp': 'POCKETAPP',
          'pocket app': 'POCKETAPP',
          'cellulant': 'CELLULANT',
          'gomoney': 'GOMONEY',
          'go money': 'GOMONEY',
          
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
          console.log('🎪 [BANK MATCHER] Found variation mapping:', searchTerm, '→', variation);
          bank = banksResponse.banks.find(
            (bank) => bank.name.toLowerCase().includes(variation.toLowerCase())
          );
        }
      }

      // Advanced fuzzy matching for close spellings
      if (!bank) {
        console.log('🔍 [BANK MATCHER] Trying fuzzy matching...');
        
        // Remove common words and try matching
        const cleanedSearch = searchTerm
          .replace(/\b(bank|microfinance|mfb|plc|limited|ltd|psb|nigeria)\b/g, '')
          .trim();
          
        if (cleanedSearch && cleanedSearch.length > 2) {
          bank = banksResponse.banks.find((bank) => {
            const cleanedBankName = bank.name.toLowerCase()
              .replace(/\b(bank|microfinance|mfb|plc|limited|ltd|psb|nigeria)\b/g, '')
              .trim();
            return cleanedBankName.includes(cleanedSearch) || cleanedSearch.includes(cleanedBankName);
          });
        }
      }

      if (bank) {
        console.log('✅ [BANK MATCHER] Match found:', JSON.stringify(bank, null, 2));
      } else {
        console.log('❌ [BANK MATCHER] No match found for:', bankName);
        console.log('💡 [BANK MATCHER] Suggestion: Try using full bank name or common abbreviations like GTB, UBA, Kuda, OPay, etc.');
      }

      return bank || null;
    } catch (error) {
      console.log('🚨 [BANK MATCHER] Error in findBankByName:', error.message);
      return null;
    }
  }
}
