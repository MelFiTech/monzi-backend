import { ConfigService } from '@nestjs/config';
import { IKycProvider, BvnVerificationResult } from '../base/provider.interface';
export declare class RavenKycProvider implements IKycProvider {
    private configService;
    private readonly logger;
    private readonly axiosInstance;
    private readonly baseUrl;
    private readonly secretKey;
    constructor(configService: ConfigService);
    verifyBvn(bvn: string): Promise<BvnVerificationResult>;
}
