export declare class ResolveAccountDto {
    account_number: string;
    bank_name: string;
}
export declare class BankDto {
    code: string;
    name: string;
}
export declare class BanksListResponseDto {
    status: boolean;
    banks: BankDto[];
}
export declare class ResolveAccountResponseDto {
    status: boolean;
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    bank_code?: string;
    message?: string;
    error?: string;
}
