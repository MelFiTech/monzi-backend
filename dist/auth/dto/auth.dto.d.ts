export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare class RegisterDto {
    email: string;
    phone: string;
    gender: Gender;
    dateOfBirth: string;
    passcode: string;
}
export declare class LoginDto {
    email: string;
    passcode: string;
}
export declare class VerifyOtpDto {
    phone: string;
    otpCode: string;
}
export declare class ResendOtpDto {
    phone: string;
}
export declare class RegisterResponseDto {
    success: boolean;
    message: string;
    phone: string;
    otpExpiresAt: string;
}
export declare class OtpResponseDto {
    success: boolean;
    message: string;
    expiresAt: string;
}
export declare class AuthResponseDto {
    access_token: string;
    user: {
        id: string;
        email: string;
        phone: string;
        gender: string;
        dateOfBirth: string;
        isVerified: boolean;
        isOnboarded: boolean;
    };
}
export declare class UserProfileDto {
    id: string;
    email: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    firstName?: string;
    lastName?: string;
    isVerified: boolean;
    isOnboarded: boolean;
    createdAt: string;
    updatedAt: string;
}
