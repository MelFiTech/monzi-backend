import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResolveAccountDto, BanksListResponseDto, ResolveAccountResponseDto } from './dto/accounts.dto';

@Injectable()
export class AccountsService {
  private readonly smeplugBaseUrl: string;
  private readonly smeplugApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.smeplugBaseUrl = this.configService.get<string>('SMEPLUG_BASE_URL');
    this.smeplugApiKey = this.configService.get<string>('SMEPLUG_API_KEY');
  }

  /**
   * Get list of all banks from Smeplug
   */
  async getBanks(): Promise<BanksListResponseDto> {
    try {
      console.log('🌐 [SMEPLUG API] Calling GET /transfer/banks...');
      console.log('🔗 URL:', `${this.smeplugBaseUrl}/transfer/banks`);
      
      const response = await fetch(`${this.smeplugBaseUrl}/transfer/banks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.smeplugApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [SMEPLUG API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ [SMEPLUG API] Failed to fetch banks:', response.status);
        throw new HttpException(
          'Failed to fetch banks from payment provider',
          HttpStatus.BAD_GATEWAY
        );
      }

      const data = await response.json();
      console.log('✅ [SMEPLUG API] Banks fetched successfully - Count:', data.banks?.length || 0);
      return data;
    } catch (error) {
      console.log('🚨 [SMEPLUG API] Error fetching banks:', error.message);
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
      console.log('🌐 [SMEPLUG API] Calling POST /transfer/resolveaccount...');
      
      const requestBody = {
        bank_code: bank.code,
        account_number: resolveAccountDto.account_number,
      };
      console.log('📤 [SMEPLUG API] Request body:', JSON.stringify(requestBody, null, 2));

      // Now resolve the account using the found bank code
      const response = await fetch(`${this.smeplugBaseUrl}/transfer/resolveaccount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.smeplugApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 [SMEPLUG API] Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📥 [SMEPLUG API] Raw response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.log('❌ [SMEPLUG API] Account resolution failed:', data.message || 'Unknown error');
        throw new HttpException(
          data.message || 'Failed to resolve account',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = {
        status: data.status,
        account_name: data.name, // Smeplug returns 'name' field, not 'account_name'
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

      // Handle common variations
      if (!bank) {
        console.log('🎭 [BANK MATCHER] Trying common variations...');
        const variations = {
          'first bank': 'First Bank of Nigeria',
          'firstbank': 'First Bank of Nigeria',
          'gtbank': 'GTBank Plc',
          'gtb': 'GTBank Plc',
          'access': 'Access Bank',
          'zenith': 'ZENITH BANK PLC',
          'uba': 'United Bank for Africa',
          'union': 'Union Bank',
          'unity': 'Unity Bank',
          'fcmb': 'FCMB',
          'fidelity': 'Fidelity Bank',
          'sterling': 'Sterling Bank',
          'wema': 'Wema Bank',
          'polaris': 'POLARIS BANK',
          'kuda': 'Kuda.',
          'opay': 'Opay Digital Services Limited',
          'moniepoint': 'Moniepoint',
          'palmpay': 'PALMPAY'
        };

        const variation = variations[searchTerm];
        if (variation) {
          console.log('🎪 [BANK MATCHER] Found variation mapping:', searchTerm, '→', variation);
          bank = banksResponse.banks.find(
            (bank) => bank.name.toLowerCase().includes(variation.toLowerCase())
          );
        }
      }

      if (bank) {
        console.log('✅ [BANK MATCHER] Match found:', JSON.stringify(bank, null, 2));
      } else {
        console.log('❌ [BANK MATCHER] No match found for:', bankName);
      }

      return bank || null;
    } catch (error) {
      console.log('🚨 [BANK MATCHER] Error in findBankByName:', error.message);
      return null;
    }
  }
}
