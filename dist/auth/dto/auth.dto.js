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
exports.UserProfileDto = exports.AuthResponseDto = exports.OtpResponseDto = exports.RegisterResponseDto = exports.ResendOtpDto = exports.VerifyOtpDto = exports.LoginDto = exports.RegisterDto = exports.Gender = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'user@example.com',
        description: 'User email address'
    }),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+2348123456789',
        description: 'Nigerian phone number in format +234XXXXXXXXXX'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+234[789][01]\d{8}$/, {
        message: 'Phone number must be a valid Nigerian number starting with +234 followed by 10 digits'
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: Gender,
        example: 'MALE',
        description: 'User gender'
    }),
    (0, class_validator_1.IsEnum)(Gender, { message: 'Gender must be MALE, FEMALE, or OTHER' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '1990-01-15',
        description: 'Date of birth in YYYY-MM-DD format'
    }),
    (0, class_validator_1.IsDateString)({}, { message: 'Date of birth must be a valid date in YYYY-MM-DD format' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '123456',
        description: '6-digit numeric passcode'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'Passcode must be exactly 6 digits' }),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Passcode must contain only numbers' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "passcode", void 0);
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'user@example.com',
        description: 'User email address'
    }),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '123456',
        description: '6-digit numeric passcode'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'Passcode must be exactly 6 digits' }),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Passcode must contain only numbers' }),
    __metadata("design:type", String)
], LoginDto.prototype, "passcode", void 0);
class VerifyOtpDto {
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+2348123456789',
        description: 'Phone number where OTP was sent'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+234[789][01]\d{8}$/, {
        message: 'Phone number must be a valid Nigerian number starting with +234 followed by 10 digits'
    }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '123456',
        description: '6-digit OTP code received via SMS'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6, { message: 'OTP must be exactly 6 digits' }),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'OTP must contain only numbers' }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "otpCode", void 0);
class ResendOtpDto {
}
exports.ResendOtpDto = ResendOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+2348123456789',
        description: 'Phone number to resend OTP to'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+234[789][01]\d{8}$/, {
        message: 'Phone number must be a valid Nigerian number starting with +234 followed by 10 digits'
    }),
    __metadata("design:type", String)
], ResendOtpDto.prototype, "phone", void 0);
class RegisterResponseDto {
}
exports.RegisterResponseDto = RegisterResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Registration success status' }),
    __metadata("design:type", Boolean)
], RegisterResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Registration successful. SMS OTP sent to your phone.', description: 'Response message' }),
    __metadata("design:type", String)
], RegisterResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2348123456789', description: 'Phone number where OTP was sent' }),
    __metadata("design:type", String)
], RegisterResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T12:05:00Z', description: 'OTP expiration time' }),
    __metadata("design:type", String)
], RegisterResponseDto.prototype, "otpExpiresAt", void 0);
class OtpResponseDto {
}
exports.OtpResponseDto = OtpResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Operation success status' }),
    __metadata("design:type", Boolean)
], OtpResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SMS OTP sent successfully', description: 'Response message' }),
    __metadata("design:type", String)
], OtpResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T12:05:00Z', description: 'OTP expiration time' }),
    __metadata("design:type", String)
], OtpResponseDto.prototype, "expiresAt", void 0);
class AuthResponseDto {
}
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' }),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User information',
        type: 'object',
        properties: {
            id: { type: 'string', example: 'cuid123' },
            email: { type: 'string', example: 'user@example.com' },
            phone: { type: 'string', example: '+2348123456789' },
            gender: { type: 'string', example: 'MALE' },
            dateOfBirth: { type: 'string', example: '1990-01-15T00:00:00Z' },
            isVerified: { type: 'boolean', example: true },
            isOnboarded: { type: 'boolean', example: true },
        }
    }),
    __metadata("design:type", Object)
], AuthResponseDto.prototype, "user", void 0);
class UserProfileDto {
}
exports.UserProfileDto = UserProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cuid123', description: 'User ID' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com', description: 'Email address' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2348123456789', description: 'Phone number' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MALE', description: 'Gender' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1990-01-15T00:00:00Z', description: 'Date of birth' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', description: 'First name (optional)' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', description: 'Last name (optional)' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Email verification status' }),
    __metadata("design:type", Boolean)
], UserProfileDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Account setup completion status' }),
    __metadata("design:type", Boolean)
], UserProfileDto.prototype, "isOnboarded", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'Account creation date' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01T00:00:00Z', description: 'Last update date' }),
    __metadata("design:type", String)
], UserProfileDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=auth.dto.js.map