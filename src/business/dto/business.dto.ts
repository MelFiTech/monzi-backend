import { ApiProperty } from '@nestjs/swagger';

export class BusinessWalletBalanceResponse {
  @ApiProperty({
    example: true,
    description: 'Operation success status',
  })
  success: boolean;

  @ApiProperty({
    example: 'Wallet balance fetched successfully',
    description: 'Response message',
  })
  message: string;

  @ApiProperty({
    example: {
      businessId: '2c0a64ab4da2c10abfff0971',
      businessName: 'Monzi Business',
      balance: 5000000.0,
    },
    description: 'Business wallet data',
  })
  data: {
    businessId: string;
    businessName: string;
    balance: number;
  };
}

export class BusinessWalletBalanceErrorResponse {
  @ApiProperty({
    example: false,
    description: 'Operation success status',
  })
  success: boolean;

  @ApiProperty({
    example: 'Unauthorized - Invalid client credentials',
    description: 'Error message',
  })
  message: string;

  @ApiProperty({
    example: 'UNAUTHORIZED',
    description: 'Error type',
  })
  error?: string;
} 