import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

// Request DTO for account resolution
export class ResolveAccountDto {
  @ApiProperty({
    example: '3089415578',
    description: 'Bank account number to resolve',
  })
  @IsString()
  @IsNotEmpty()
  account_number: string;

  @ApiProperty({
    example: 'First Bank of Nigeria',
    description: 'Bank name to resolve the account with',
  })
  @IsString()
  @IsNotEmpty()
  bank_name: string;
}

// Request DTO for super resolve (account number only)
export class SuperResolveAccountDto {
  @ApiProperty({
    example: '3089415578',
    description: 'Bank account number to resolve across multiple banks',
  })
  @IsString()
  @IsNotEmpty()
  account_number: string;
}

// Response DTO for single bank
export class BankDto {
  @ApiProperty({ example: '000016' })
  code: string;

  @ApiProperty({ example: 'First Bank of Nigeria' })
  name: string;
}

// Response DTO for banks list
export class BanksListResponseDto {
  @ApiProperty()
  status: boolean;

  @ApiProperty({ type: [BankDto] })
  banks: BankDto[];
}

// Response DTO for account resolution
export class ResolveAccountResponseDto {
  @ApiProperty()
  status: boolean;

  @ApiProperty({ example: 'JOHN DOE' })
  account_name?: string;

  @ApiProperty({ example: '3089415578' })
  account_number?: string;

  @ApiProperty({ example: 'First Bank of Nigeria' })
  bank_name?: string;

  @ApiProperty({ example: '000016' })
  bank_code?: string;

  @ApiProperty({ example: 'Account resolved successfully' })
  message?: string;

  @ApiProperty({ required: false })
  error?: string;
}

// Response DTO for super resolve
export class SuperResolveAccountResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ example: 'Account resolved successfully' })
  message: string;

  @ApiProperty({ example: 'OBAJE GOODNESS ENYO' })
  account_name?: string;

  @ApiProperty({ example: '3089415578' })
  account_number?: string;

  @ApiProperty({ example: 'First Bank of Nigeria' })
  bank_name?: string;

  @ApiProperty({ example: '011' })
  bank_code?: string;

  @ApiProperty({ example: 4 })
  banks_tested?: number;

  @ApiProperty({ example: 0.16 })
  execution_time?: number;

  @ApiProperty({ required: false })
  error?: string;
}
