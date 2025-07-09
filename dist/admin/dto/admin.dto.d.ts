export declare enum FeeType {
    TRANSFER = "TRANSFER",
    WITHDRAWAL = "WITHDRAWAL",
    FUNDING = "FUNDING",
    CURRENCY_EXCHANGE = "CURRENCY_EXCHANGE",
    MONTHLY_MAINTENANCE = "MONTHLY_MAINTENANCE"
}
export declare enum KycDecision {
    APPROVE = "APPROVE",
    REJECT = "REJECT"
}
export declare class SetFeeDto {
    type: FeeType;
    percentage?: number;
    fixedAmount?: number;
    minimumFee?: number;
    maximumFee?: number;
    isActive?: boolean;
    description?: string;
}
export declare class FeeConfigurationResponse {
    id: string;
    type: FeeType;
    percentage?: number;
    fixedAmount?: number;
    minimumFee?: number;
    maximumFee?: number;
    isActive: boolean;
    description?: string;
    createdAt: string;
    updatedAt: string;
}
export declare class SetFeeResponse {
    success: boolean;
    message: string;
    feeConfiguration: FeeConfigurationResponse;
}
export declare class GetFeesResponse {
    success: boolean;
    fees: FeeConfigurationResponse[];
    total: number;
}
export declare class DeleteFeeResponse {
    success: boolean;
    message: string;
    deletedType: string;
}
export declare class KycSubmissionDto {
    userId: string;
    email: string;
    phone: string;
    fullName?: string;
    kycStatus: string;
    bvn?: string;
    bvnVerifiedAt?: string;
    selfieUrl?: string;
    submittedAt: string;
    createdAt: string;
}
export declare class GetKycSubmissionsResponse {
    success: boolean;
    submissions: KycSubmissionDto[];
    total: number;
    pending: number;
    verified: number;
    rejected: number;
}
export declare class KycReviewDto {
    decision: KycDecision;
    comment?: string;
}
export declare class KycReviewResponse {
    success: boolean;
    message: string;
    newStatus: string;
    walletCreated?: boolean;
    virtualAccountNumber?: string;
    userId: string;
}
export declare class KycSubmissionDetailResponse {
    success: boolean;
    submission: KycSubmissionDto;
    selfieImageUrl?: string;
}
