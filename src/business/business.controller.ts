import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ClientAuthGuard } from '../auth/client-auth.guard';
import { BusinessService } from './business.service';
import {
  BusinessWalletBalanceResponse,
  BusinessWalletBalanceErrorResponse,
} from './dto/business.dto';

@ApiTags('Business')
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('wallets/wallet_balance')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({
    summary: 'Get Business Wallet Balance',
    description: 'Retrieves the balance of the primary wallet for the business associated with the authenticated API client.',
  })
  @ApiHeader({
    name: 'x-client-id',
    description: 'The client ID (required)',
    required: true,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <client_secret> (required)',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet balance fetched successfully',
    type: BusinessWalletBalanceResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'If the client ID or secret is invalid',
    type: BusinessWalletBalanceErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'If the API client is not authorized for the business',
    type: BusinessWalletBalanceErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'If the business or its wallet is not found',
    type: BusinessWalletBalanceErrorResponse,
  })
  async getBusinessWalletBalance(
    @Headers('x-client-id') clientId: string,
    @Headers('authorization') authorization: string,
  ): Promise<BusinessWalletBalanceResponse> {
    console.log('🏦 [BUSINESS API] GET /business/wallets/wallet_balance - Request received');
    console.log('🔐 [BUSINESS API] Client ID:', clientId);

    const result = await this.businessService.getBusinessWalletBalance();

    console.log('✅ [BUSINESS API] Business wallet balance retrieved successfully');
    console.log('📄 Response Data:', result);

    return result;
  }
} 