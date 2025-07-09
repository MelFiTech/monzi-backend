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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const auth_dto_1 = require("./dto/auth.dto");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        console.log('📝 [AUTH API] POST /auth/register - New registration');
        console.log('📋 Request Data:', {
            email: registerDto.email,
            phone: registerDto.phone,
            gender: registerDto.gender,
            dateOfBirth: registerDto.dateOfBirth
        });
        const result = await this.authService.register(registerDto);
        console.log('✅ [AUTH API] Registration successful');
        console.log('📄 Response Data:', result);
        return result;
    }
    async login(loginDto) {
        console.log('🔐 [AUTH API] POST /auth/login - Login attempt');
        console.log('📧 Email:', loginDto.email);
        const result = await this.authService.login(loginDto);
        console.log('✅ [AUTH API] Login successful');
        console.log('📄 Response Data:', {
            access_token: '***',
            user: result.user
        });
        return result;
    }
    async verifyOtp(verifyOtpDto) {
        console.log('🔍 [AUTH API] POST /auth/verify-otp - OTP verification');
        console.log('📱 Phone:', verifyOtpDto.phone);
        console.log('🔑 OTP:', verifyOtpDto.otpCode);
        const result = await this.authService.verifyOtp(verifyOtpDto);
        console.log('✅ [AUTH API] OTP verified successfully');
        console.log('📄 Response Data:', {
            access_token: '***',
            user: result.user
        });
        return result;
    }
    async resendOtp(resendOtpDto) {
        console.log('🔄 [AUTH API] POST /auth/resend-otp - Resending OTP');
        console.log('📱 Phone:', resendOtpDto.phone);
        const result = await this.authService.resendOtp(resendOtpDto);
        console.log('✅ [AUTH API] OTP resent successfully');
        console.log('📄 Response Data:', result);
        return result;
    }
    async getProfile(req) {
        console.log('👤 [AUTH API] GET /auth/profile - Profile request');
        console.log('🆔 User ID:', req.user.id);
        const result = await this.authService.getProfile(req.user.id);
        console.log('✅ [AUTH API] Profile retrieved successfully');
        return result;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({
        summary: 'Register new account',
        description: 'Step 1: Create new account with email, Nigerian phone number (+234XXXXXXXXXX), gender, date of birth, and 6-digit numeric passcode. SMS OTP will be sent for verification.'
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Registration successful, SMS OTP sent',
        type: auth_dto_1.RegisterResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Account with email or phone already exists'
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid registration data'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({
        summary: 'Login existing user',
        description: 'Step 2: Login with email and 6-digit passcode for verified users'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login successful',
        type: auth_dto_1.AuthResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid credentials or account not verified'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify SMS OTP',
        description: 'Step 3: Verify the 6-digit OTP code sent via SMS to complete account verification and automatically login'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'OTP verified successfully, user logged in',
        type: auth_dto_1.AuthResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid or expired OTP'
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'User not found'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('resend-otp'),
    (0, swagger_1.ApiOperation)({
        summary: 'Resend SMS OTP',
        description: 'Resend OTP code via SMS if the previous one expired or was not received'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'SMS OTP resent successfully',
        type: auth_dto_1.OtpResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Account already verified or other error'
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'User not found'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ResendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendOtp", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get user profile',
        description: 'Get the current authenticated user profile information'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User profile retrieved successfully',
        type: auth_dto_1.UserProfileDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid or missing token'
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map