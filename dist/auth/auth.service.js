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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const { email, phone, gender, dateOfBirth, passcode } = registerDto;
        console.log('📝 [AUTH] New registration attempt');
        console.log('📧 Email:', email);
        console.log('📱 Phone:', phone);
        console.log('👤 Gender:', gender);
        console.log('🎂 DOB:', dateOfBirth);
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone }
                ]
            }
        });
        if (existingUser) {
            if (existingUser.email === email) {
                throw new common_1.ConflictException('An account with this email already exists');
            }
            if (existingUser.phone === phone) {
                throw new common_1.ConflictException('An account with this phone number already exists');
            }
        }
        const hashedPasscode = await bcrypt.hash(passcode, 12);
        const otpCode = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        try {
            await this.prisma.user.create({
                data: {
                    email,
                    phone,
                    gender,
                    dateOfBirth: new Date(dateOfBirth),
                    passcode: hashedPasscode,
                    otpCode,
                    otpExpiresAt,
                    isVerified: false,
                    isOnboarded: false,
                }
            });
            await this.sendSmsOtp(phone, otpCode);
            console.log('✅ [AUTH] User registered successfully, SMS OTP sent');
            return {
                success: true,
                message: 'Registration successful. SMS OTP sent to your phone.',
                phone,
                otpExpiresAt: otpExpiresAt.toISOString(),
            };
        }
        catch (error) {
            console.error('❌ [AUTH] Registration failed:', error);
            throw new common_1.BadRequestException('Registration failed. Please try again.');
        }
    }
    async login(loginDto) {
        const { email, passcode } = loginDto;
        console.log('🔐 [AUTH] Login attempt for:', email);
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or passcode');
        }
        if (!user.isVerified) {
            throw new common_1.UnauthorizedException('Please verify your phone number first');
        }
        if (!user.isOnboarded) {
            throw new common_1.UnauthorizedException('Account setup not completed');
        }
        const isValidPasscode = await bcrypt.compare(passcode, user.passcode);
        if (!isValidPasscode) {
            throw new common_1.UnauthorizedException('Invalid email or passcode');
        }
        const payload = { sub: user.id, email: user.email };
        const access_token = this.jwtService.sign(payload);
        console.log('✅ [AUTH] Login successful for:', email);
        return {
            access_token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth.toISOString(),
                isVerified: user.isVerified,
                isOnboarded: user.isOnboarded,
            },
        };
    }
    async verifyOtp(verifyOtpDto) {
        const { phone, otpCode } = verifyOtpDto;
        console.log('🔍 [AUTH] OTP verification for phone:', phone);
        const user = await this.prisma.user.findUnique({
            where: { phone },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found with this phone number');
        }
        if (!user.otpCode || !user.otpExpiresAt) {
            throw new common_1.BadRequestException('No OTP found. Please request a new one.');
        }
        if (new Date() > user.otpExpiresAt) {
            throw new common_1.BadRequestException('OTP has expired. Please request a new one.');
        }
        if (user.otpCode !== otpCode) {
            throw new common_1.BadRequestException('Invalid OTP code');
        }
        const updatedUser = await this.prisma.user.update({
            where: { phone },
            data: {
                isVerified: true,
                isOnboarded: true,
                otpCode: null,
                otpExpiresAt: null,
            },
        });
        const payload = { sub: updatedUser.id, email: updatedUser.email };
        const access_token = this.jwtService.sign(payload);
        console.log('✅ [AUTH] OTP verified successfully, user logged in');
        return {
            access_token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                phone: updatedUser.phone,
                gender: updatedUser.gender,
                dateOfBirth: updatedUser.dateOfBirth.toISOString(),
                isVerified: updatedUser.isVerified,
                isOnboarded: updatedUser.isOnboarded,
            },
        };
    }
    async resendOtp(resendOtpDto) {
        const { phone } = resendOtpDto;
        console.log('🔄 [AUTH] Resending OTP to phone:', phone);
        const user = await this.prisma.user.findUnique({
            where: { phone },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found with this phone number');
        }
        if (user.isVerified) {
            throw new common_1.BadRequestException('Account is already verified');
        }
        const otpCode = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.prisma.user.update({
            where: { phone },
            data: {
                otpCode,
                otpExpiresAt,
            },
        });
        await this.sendSmsOtp(phone, otpCode);
        console.log('✅ [AUTH] OTP resent successfully');
        return {
            success: true,
            message: 'SMS OTP resent successfully',
            expiresAt: otpExpiresAt.toISOString(),
        };
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendSmsOtp(phone, otpCode) {
        console.log('📱 [SMS SERVICE] Sending OTP to:', phone);
        console.log('🔑 [SMS SERVICE] OTP Code:', otpCode);
        console.log(`🚀 SMS OTP for ${phone}: ${otpCode}`);
    }
    async validateUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                gender: true,
                dateOfBirth: true,
                firstName: true,
                lastName: true,
                isVerified: true,
                isOnboarded: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                gender: true,
                dateOfBirth: true,
                firstName: true,
                lastName: true,
                isVerified: true,
                isOnboarded: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            ...user,
            dateOfBirth: user.dateOfBirth.toISOString(),
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map