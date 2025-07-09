import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { SetFeeDto, FeeConfigurationResponse, SetFeeResponse, GetFeesResponse, DeleteFeeResponse, FeeType, GetKycSubmissionsResponse, KycReviewDto, KycReviewResponse, KycSubmissionDetailResponse } from './dto/admin.dto';
export declare class AdminService {
    private prisma;
    private walletService;
    constructor(prisma: PrismaService, walletService: WalletService);
    setFee(setFeeDto: SetFeeDto): Promise<SetFeeResponse>;
    getFees(): Promise<GetFeesResponse>;
    getFeeByType(type: FeeType): Promise<FeeConfigurationResponse | null>;
    deleteFee(type: FeeType): Promise<DeleteFeeResponse>;
    calculateFee(type: FeeType, amount: number): Promise<number>;
    seedDefaultFees(): Promise<void>;
    getKycSubmissions(): Promise<GetKycSubmissionsResponse>;
    getKycSubmissionDetails(userId: string): Promise<KycSubmissionDetailResponse>;
    reviewKycSubmission(userId: string, reviewDto: KycReviewDto): Promise<KycReviewResponse>;
    getPendingKycSubmissions(): Promise<GetKycSubmissionsResponse>;
}
