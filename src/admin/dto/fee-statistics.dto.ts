import { ApiProperty } from '@nestjs/swagger';

export class FeeStatisticsDto {
  @ApiProperty({ example: 125000.0, description: 'Total fees collected' })
  totalFees: number;

  @ApiProperty({ example: 4500, description: 'Total transactions with fees' })
  totalTransactions: number;

  @ApiProperty({ example: 27.78, description: 'Average fee per transaction' })
  averageFee: number;

  @ApiProperty({
    example: {
      TRANSFER: 80000.0,
      WITHDRAWAL: 30000.0,
      FUNDING: 15000.0,
    },
    description: 'Fees broken down by transaction type',
  })
  feesByType: Record<string, number>;

  @ApiProperty({
    example: {
      COMPLETED: 120000.0,
      PENDING: 3000.0,
      FAILED: 2000.0,
    },
    description: 'Fees broken down by transaction status',
  })
  feesByStatus: Record<string, number>;

  @ApiProperty({
    example: {
      NYRA: 60000.0,
      BUDPAY: 40000.0,
      SMEPLUG: 25000.0,
    },
    description: 'Fees broken down by provider',
  })
  feesByProvider: Record<string, number>;
}

export class PeriodFeeStatisticsDto extends FeeStatisticsDto {
  @ApiProperty({ example: 'this_month', description: 'Period identifier' })
  period: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Period start date' })
  startDate: Date;

  @ApiProperty({ example: '2024-01-31T23:59:59.999Z', description: 'Period end date' })
  endDate: Date;

  @ApiProperty({
    example: [
      { date: '2024-01-01', fees: 5000.0, transactions: 150 },
      { date: '2024-01-02', fees: 4800.0, transactions: 145 },
    ],
    description: 'Daily breakdown of fees and transactions',
  })
  dailyBreakdown: Array<{
    date: string;
    fees: number;
    transactions: number;
  }>;
}

export class GetFeeStatisticsResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'Fee statistics retrieved successfully' })
  message: string;

  @ApiProperty({ type: FeeStatisticsDto, description: 'Fee statistics data' })
  data: FeeStatisticsDto;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Response timestamp' })
  timestamp: string;
}

export class GetPeriodFeeStatisticsResponseDto {
  @ApiProperty({ example: true, description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ example: 'Period fee statistics retrieved successfully' })
  message: string;

  @ApiProperty({ type: PeriodFeeStatisticsDto, description: 'Period fee statistics data' })
  data: PeriodFeeStatisticsDto;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Response timestamp' })
  timestamp: string;
}

export class GetFeeStatisticsQueryDto {
  @ApiProperty({
    example: 'today',
    description: 'Period for fee statistics',
    enum: ['today', 'this_week', 'this_month', 'last_30_days', 'custom'],
    required: false,
  })
  period?: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Custom start date (YYYY-MM-DD)',
    required: false,
  })
  startDate?: string;

  @ApiProperty({
    example: '2024-01-31',
    description: 'Custom end date (YYYY-MM-DD)',
    required: false,
  })
  endDate?: string;
}
