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
var RavenKycProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RavenKycProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let RavenKycProvider = RavenKycProvider_1 = class RavenKycProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RavenKycProvider_1.name);
        this.baseUrl = this.configService.get('RAVEN_BASE_URL');
        this.secretKey = this.configService.get('RAVEN_SECRET_KEY');
        if (!this.baseUrl || !this.secretKey) {
            throw new Error('Raven API credentials not configured properly');
        }
        this.axiosInstance = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
                'accept': 'application/json',
            },
        });
        this.logger.log('Raven KYC Provider initialized successfully');
    }
    async verifyBvn(bvn) {
        this.logger.log(`🔍 [RAVEN KYC] Starting BVN verification for: ${bvn}`);
        try {
            if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
                return {
                    success: false,
                    message: 'Invalid BVN format. BVN must be 11 digits.',
                    error: 'INVALID_BVN_FORMAT'
                };
            }
            const requestData = {
                bvn: bvn
            };
            this.logger.log(`📤 [RAVEN KYC] Sending BVN verification request to Raven API`);
            const response = await this.axiosInstance.post('/bvn/verify', requestData);
            this.logger.log(`📥 [RAVEN KYC] Response received from Raven API`);
            this.logger.log(`📊 [RAVEN KYC] Response status: ${response.data.status}`);
            if (response.data.status === 'success') {
                const { data } = response.data;
                const result = {
                    success: true,
                    message: response.data.message,
                    data: {
                        firstName: data.firstname,
                        lastName: data.lastname,
                        phoneNumber: data.phone_number,
                        dateOfBirth: data.date_of_birth,
                        gender: data.gender,
                        lgaOfOrigin: data.lgaOfOrigin,
                        residentialAddress: data.residentialAddress,
                        stateOfOrigin: data.stateOfOrigin || data.state_of_origin,
                    }
                };
                this.logger.log(`✅ [RAVEN KYC] BVN verification successful for: ${data.firstname} ${data.lastname}`);
                this.logger.log(`📱 [RAVEN KYC] Phone: ${data.phone_number}, DOB: ${data.date_of_birth}, Gender: ${data.gender}`);
                return result;
            }
            else {
                this.logger.warn(`⚠️ [RAVEN KYC] BVN verification failed: ${response.data.message}`);
                return {
                    success: false,
                    message: response.data.message,
                    error: 'BVN_VERIFICATION_FAILED'
                };
            }
        }
        catch (error) {
            this.logger.error(`❌ [RAVEN KYC] Error during BVN verification:`, error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || 'BVN verification failed';
                this.logger.error(`🚨 [RAVEN KYC] HTTP Error ${status}: ${message}`);
                return {
                    success: false,
                    message: `BVN verification failed: ${message}`,
                    error: `HTTP_${status}`
                };
            }
            else if (error.request) {
                this.logger.error(`🌐 [RAVEN KYC] Network error: ${error.message}`);
                return {
                    success: false,
                    message: 'Network error occurred during BVN verification',
                    error: 'NETWORK_ERROR'
                };
            }
            else {
                this.logger.error(`🔥 [RAVEN KYC] Unexpected error: ${error.message}`);
                return {
                    success: false,
                    message: 'An unexpected error occurred during BVN verification',
                    error: 'UNEXPECTED_ERROR'
                };
            }
        }
    }
};
exports.RavenKycProvider = RavenKycProvider;
exports.RavenKycProvider = RavenKycProvider = RavenKycProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RavenKycProvider);
//# sourceMappingURL=raven-kyc.provider.js.map