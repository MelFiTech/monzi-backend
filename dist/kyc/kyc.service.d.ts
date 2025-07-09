import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { RavenKycProvider } from '../providers/raven/raven-kyc.provider';
import { GeminiAiProvider } from '../providers/ai/gemini.provider';
import { VerifyBvnDto, BvnVerificationResponseDto, SelfieUploadResponseDto, KycStatusResponseDto } from './dto/kyc.dto';
export declare class KycService {
    private readonly prisma;
    private readonly configService;
    private readonly walletService;
    private readonly ravenKycProvider;
    private readonly geminiAiProvider;
    private readonly smeplugBaseUrl;
    private readonly smeplugApiKey;
    constructor(prisma: PrismaService, configService: ConfigService, walletService: WalletService, ravenKycProvider: RavenKycProvider, geminiAiProvider: GeminiAiProvider);
    verifyBvn(verifyBvnDto: VerifyBvnDto, userId: string): Promise<BvnVerificationResponseDto>;
    uploadSelfie(file: Express.Multer.File, userId: string): Promise<SelfieUploadResponseDto>;
    getKycStatus(userId: string): Promise<KycStatusResponseDto>;
    private simulateFaceVerification;
    private getKycStatusMessage;
}
