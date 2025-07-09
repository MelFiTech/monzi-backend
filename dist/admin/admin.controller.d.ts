import { AdminService } from './admin.service';
import { SetFeeDto, SetFeeResponse, GetFeesResponse, DeleteFeeResponse, FeeConfigurationResponse, FeeType, GetKycSubmissionsResponse, KycSubmissionDetailResponse, KycReviewDto, KycReviewResponse } from './dto/admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    setFee(setFeeDto: SetFeeDto): Promise<SetFeeResponse>;
    getFees(): Promise<GetFeesResponse>;
    getFeeByType(type: FeeType): Promise<FeeConfigurationResponse | null>;
    deleteFee(type: FeeType): Promise<DeleteFeeResponse>;
    seedDefaultFees(): Promise<{
        success: boolean;
        message: string;
    }>;
    calculateFee(type: FeeType, body: {
        amount: number;
    }): Promise<{
        success: boolean;
        amount: number;
        fee: number;
        totalAmount: number;
        feeType: string;
    }>;
    getKycSubmissions(): Promise<GetKycSubmissionsResponse>;
    getPendingKycSubmissions(): Promise<GetKycSubmissionsResponse>;
    getKycSubmissionDetails(userId: string): Promise<KycSubmissionDetailResponse>;
    reviewKycSubmission(userId: string, reviewDto: KycReviewDto): Promise<KycReviewResponse>;
}
