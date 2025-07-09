import { ConfigService } from '@nestjs/config';
import { ResolveAccountDto, BanksListResponseDto, ResolveAccountResponseDto } from './dto/accounts.dto';
export declare class AccountsService {
    private readonly configService;
    private readonly smeplugBaseUrl;
    private readonly smeplugApiKey;
    constructor(configService: ConfigService);
    getBanks(): Promise<BanksListResponseDto>;
    resolveAccount(resolveAccountDto: ResolveAccountDto): Promise<ResolveAccountResponseDto>;
    findBankByName(bankName: string): Promise<{
        code: string;
        name: string;
    } | null>;
}
