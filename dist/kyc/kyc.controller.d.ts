import { KycService } from './kyc.service';
import { VerifyBvnDto, BvnVerificationResponseDto, SelfieUploadResponseDto, KycStatusResponseDto } from './dto/kyc.dto';
export declare class KycController {
    private readonly kycService;
    constructor(kycService: KycService);
    verifyBvn(verifyBvnDto: VerifyBvnDto, req: any): Promise<BvnVerificationResponseDto>;
    uploadSelfie(file: Express.Multer.File, req: any): Promise<SelfieUploadResponseDto>;
    getKycStatus(req: any): Promise<KycStatusResponseDto>;
}
