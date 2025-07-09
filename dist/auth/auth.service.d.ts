import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, VerifyOtpDto, ResendOtpDto, RegisterResponseDto, OtpResponseDto, AuthResponseDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<RegisterResponseDto>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto>;
    resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponseDto>;
    private generateOtp;
    private sendSmsOtp;
    validateUser(userId: string): Promise<{
        email: string;
        phone: string;
        gender: import("generated/prisma").$Enums.Gender;
        dateOfBirth: Date;
        id: string;
        isVerified: boolean;
        isOnboarded: boolean;
        firstName: string;
        lastName: string;
    }>;
    getProfile(userId: string): Promise<{
        dateOfBirth: string;
        createdAt: string;
        updatedAt: string;
        email: string;
        phone: string;
        gender: import("generated/prisma").$Enums.Gender;
        id: string;
        isVerified: boolean;
        isOnboarded: boolean;
        firstName: string;
        lastName: string;
    }>;
}
