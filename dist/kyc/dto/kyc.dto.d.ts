export declare class VerifyBvnDto {
    bvn: string;
}
export declare class UploadSelfieDto {
    selfie: any;
}
export declare class CompleteKycDto {
    bvn: string;
    selfieUrl: string;
}
export declare class BvnVerificationResponseDto {
    success: boolean;
    message: string;
    bvnData?: {
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        dateOfBirth?: string;
        gender?: string;
        lgaOfOrigin?: string;
        residentialAddress?: string;
        stateOfOrigin?: string;
    };
    kycStatus?: string;
    walletCreated?: boolean;
    verificationErrors?: string[];
    error?: string;
}
export declare class SelfieUploadResponseDto {
    success: boolean;
    message: string;
    selfieUrl?: string;
    verificationScore?: number;
    aiApprovalId?: string;
    walletCreated?: boolean;
    error?: string;
}
export declare class KycStatusResponseDto {
    kycStatus: string;
    isVerified: boolean;
    verifiedAt?: Date;
    bvnVerified?: boolean;
    selfieVerified?: boolean;
    message?: string;
}
export declare class CompleteKycResponseDto {
    success: boolean;
    message: string;
    kycStatus?: string;
    walletCreated?: boolean;
    virtualAccountNumber?: string;
    error?: string;
}
