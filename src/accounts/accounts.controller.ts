import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ResolveAccountDto,
  BanksListResponseDto,
  ResolveAccountResponseDto,
  SuperResolveAccountDto,
  SuperResolveAccountResponseDto,
} from './dto/accounts.dto';

@ApiTags('Accounts')
@Controller('accounts')
// @UseGuards(JwtAuthGuard) // Disabled for testing
// @ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiOperation({
    summary: 'Get list of all banks',
    description:
      'Fetch all available banks with their codes and names from Smeplug',
  })
  @ApiResponse({
    status: 200,
    description: 'Banks list retrieved successfully',
    type: BanksListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 502,
    description: 'Failed to fetch from payment provider',
  })
  @Get('banks')
  async getBanks() {
    console.log(
      '🏦 [ACCOUNTS API] GET /accounts/banks - Fetching banks list...',
    );
    const result = await this.accountsService.getBanks();
    console.log(
      `✅ [ACCOUNTS API] Banks list retrieved - Found ${result.banks?.length || 0} banks`,
    );
    return result;
  }

  @ApiOperation({
    summary: 'Resolve bank account details',
    description:
      'Get account holder name from account number and bank name. The bank name will be automatically matched to find the correct bank code.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account resolved successfully',
    type: ResolveAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account details or bank not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('resolve')
  async resolveAccount(@Body() resolveAccountDto: ResolveAccountDto) {
    console.log('🔍 [ACCOUNTS API] POST /accounts/resolve - Request received:');
    console.log('📝 Request Data:', JSON.stringify(resolveAccountDto, null, 2));

    try {
      const result =
        await this.accountsService.resolveAccount(resolveAccountDto);
      console.log('✅ [ACCOUNTS API] Account resolved successfully:');
      console.log('📄 Response Data:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log('❌ [ACCOUNTS API] Account resolution failed:');
      console.log('🚨 Error:', error.message);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Super resolve account number across multiple banks',
    description:
      'Automatically try to resolve an account number across multiple common Nigerian banks using the NUBAN API. This endpoint will test the account number against 15 major banks and return the first successful match.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account resolved successfully',
    type: SuperResolveAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account number or resolution failed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during resolution process',
  })
  @Post('super-resolve')
  async superResolveAccount(@Body() superResolveDto: SuperResolveAccountDto) {
    console.log('🔍 [ACCOUNTS API] POST /accounts/super-resolve - Request received:');
    console.log('📝 Request Data:', JSON.stringify(superResolveDto, null, 2));

    try {
      const result = await this.accountsService.superResolveAccount(superResolveDto);
      
      if (result.success) {
        console.log('✅ [ACCOUNTS API] Super resolve successful:');
        console.log('📄 Response Data:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ [ACCOUNTS API] Super resolve failed:');
        console.log('📄 Response Data:', JSON.stringify(result, null, 2));
      }
      
      return result;
    } catch (error) {
      console.log('❌ [ACCOUNTS API] Super resolve error:');
      console.log('🚨 Error:', error.message);
      throw error;
    }
  }
}
