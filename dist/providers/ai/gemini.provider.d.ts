import { ConfigService } from '@nestjs/config';
import { IAiProvider, SelfieVerificationRequest, SelfieVerificationResult } from '../base/ai-provider.interface';
export declare class GeminiAiProvider implements IAiProvider {
    private configService;
    private readonly logger;
    private readonly axiosInstance;
    private readonly apiKey;
    private readonly apiUrl;
    constructor(configService: ConfigService);
    verifySelfie(request: SelfieVerificationRequest): Promise<SelfieVerificationResult>;
    private buildVerificationPrompt;
    private parseGeminiResponse;
}
