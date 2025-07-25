import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { 
  CalculateFeeDto, 
  FeeCalculationResponseDto, 
  GetFeeTiersResponseDto 
} from './dto/transaction.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('calculate-fee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate transaction fee',
    description: 'Calculate the fee for a transaction based on amount, type, and provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Fee calculated successfully',
    type: FeeCalculationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async calculateFee(@Body() dto: CalculateFeeDto): Promise<FeeCalculationResponseDto> {
    return this.transactionsService.calculateFee(dto);
  }

  @Get('fee-tiers')
  @ApiOperation({
    summary: 'Get fee tiers',
    description: 'Get all available fee tiers for transactions',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Provider name (e.g., NYRA, BudPay)',
    example: 'NYRA',
  })
  @ApiResponse({
    status: 200,
    description: 'Fee tiers retrieved successfully',
    type: GetFeeTiersResponseDto,
  })
  async getFeeTiers(@Query('provider') provider?: string): Promise<GetFeeTiersResponseDto> {
    return this.transactionsService.getFeeTiers(provider);
  }
}
