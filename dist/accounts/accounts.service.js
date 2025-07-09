"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AccountsService = class AccountsService {
    constructor(configService) {
        this.configService = configService;
        this.smeplugBaseUrl = this.configService.get('SMEPLUG_BASE_URL');
        this.smeplugApiKey = this.configService.get('SMEPLUG_API_KEY');
    }
    async getBanks() {
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
                throw new common_1.HttpException('Failed to fetch banks from payment provider', common_1.HttpStatus.BAD_GATEWAY);
            }
            const data = await response.json();
            console.log('✅ [SMEPLUG API] Banks fetched successfully - Count:', data.banks?.length || 0);
            return data;
        }
        catch (error) {
            console.log('🚨 [SMEPLUG API] Error fetching banks:', error.message);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Error connecting to payment provider', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async resolveAccount(resolveAccountDto) {
        try {
            console.log('🔍 [BANK SEARCH] Searching for bank:', resolveAccountDto.bank_name);
            const bank = await this.findBankByName(resolveAccountDto.bank_name);
            if (!bank) {
                console.log('❌ [BANK SEARCH] Bank not found:', resolveAccountDto.bank_name);
                throw new common_1.HttpException(`Bank not found: ${resolveAccountDto.bank_name}. Please check the bank name and try again.`, common_1.HttpStatus.BAD_REQUEST);
            }
            console.log('✅ [BANK SEARCH] Bank found:', JSON.stringify(bank, null, 2));
            console.log('🌐 [SMEPLUG API] Calling POST /transfer/resolveaccount...');
            const requestBody = {
                bank_code: bank.code,
                account_number: resolveAccountDto.account_number,
            };
            console.log('📤 [SMEPLUG API] Request body:', JSON.stringify(requestBody, null, 2));
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
                throw new common_1.HttpException(data.message || 'Failed to resolve account', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = {
                status: data.status,
                account_name: data.name,
                account_number: resolveAccountDto.account_number,
                bank_name: bank.name,
                bank_code: bank.code,
                message: 'Account resolved successfully',
            };
            console.log('✅ [ACCOUNTS SERVICE] Final result:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.log('🚨 [ACCOUNTS SERVICE] Error in resolveAccount:', error.message);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Error resolving account', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async findBankByName(bankName) {
        try {
            console.log('🔎 [BANK MATCHER] Starting search for bank name:', bankName);
            const banksResponse = await this.getBanks();
            const searchTerm = bankName.toLowerCase().trim();
            console.log('🔤 [BANK MATCHER] Normalized search term:', searchTerm);
            console.log('🎯 [BANK MATCHER] Trying exact match...');
            let bank = banksResponse.banks.find((bank) => bank.name.toLowerCase() === searchTerm);
            if (!bank) {
                console.log('🔍 [BANK MATCHER] Trying partial match (bank name contains search term)...');
                bank = banksResponse.banks.find((bank) => bank.name.toLowerCase().includes(searchTerm));
            }
            if (!bank) {
                console.log('🔄 [BANK MATCHER] Trying reverse match (search term contains bank name)...');
                bank = banksResponse.banks.find((bank) => searchTerm.includes(bank.name.toLowerCase()));
            }
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
                    bank = banksResponse.banks.find((bank) => bank.name.toLowerCase().includes(variation.toLowerCase()));
                }
            }
            if (bank) {
                console.log('✅ [BANK MATCHER] Match found:', JSON.stringify(bank, null, 2));
            }
            else {
                console.log('❌ [BANK MATCHER] No match found for:', bankName);
            }
            return bank || null;
        }
        catch (error) {
            console.log('🚨 [BANK MATCHER] Error in findBankByName:', error.message);
            return null;
        }
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map