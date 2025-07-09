import { AccountsService } from './accounts.service';
import { ResolveAccountDto, BanksListResponseDto, ResolveAccountResponseDto } from './dto/accounts.dto';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    getBanks(): Promise<BanksListResponseDto>;
    resolveAccount(resolveAccountDto: ResolveAccountDto): Promise<ResolveAccountResponseDto>;
}
