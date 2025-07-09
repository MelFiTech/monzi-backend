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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const accounts_service_1 = require("./accounts.service");
const accounts_dto_1 = require("./dto/accounts.dto");
let AccountsController = class AccountsController {
    constructor(accountsService) {
        this.accountsService = accountsService;
    }
    async getBanks() {
        console.log('🏦 [ACCOUNTS API] GET /accounts/banks - Fetching banks list...');
        const result = await this.accountsService.getBanks();
        console.log(`✅ [ACCOUNTS API] Banks list retrieved - Found ${result.banks?.length || 0} banks`);
        return result;
    }
    async resolveAccount(resolveAccountDto) {
        console.log('🔍 [ACCOUNTS API] POST /accounts/resolve - Request received:');
        console.log('📝 Request Data:', JSON.stringify(resolveAccountDto, null, 2));
        try {
            const result = await this.accountsService.resolveAccount(resolveAccountDto);
            console.log('✅ [ACCOUNTS API] Account resolved successfully:');
            console.log('📄 Response Data:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.log('❌ [ACCOUNTS API] Account resolution failed:');
            console.log('🚨 Error:', error.message);
            throw error;
        }
    }
};
exports.AccountsController = AccountsController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get list of all banks',
        description: 'Fetch all available banks with their codes and names from Smeplug'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Banks list retrieved successfully',
        type: accounts_dto_1.BanksListResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 502, description: 'Failed to fetch from payment provider' }),
    (0, common_1.Get)('banks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "getBanks", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Resolve bank account details',
        description: 'Get account holder name from account number and bank name. The bank name will be automatically matched to find the correct bank code.'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account resolved successfully',
        type: accounts_dto_1.ResolveAccountResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid account details or bank not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, common_1.Post)('resolve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accounts_dto_1.ResolveAccountDto]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "resolveAccount", null);
exports.AccountsController = AccountsController = __decorate([
    (0, swagger_1.ApiTags)('Accounts'),
    (0, common_1.Controller)('accounts'),
    __metadata("design:paramtypes", [accounts_service_1.AccountsService])
], AccountsController);
//# sourceMappingURL=accounts.controller.js.map