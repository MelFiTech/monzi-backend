import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransferDto, WalletDetailsResponse, TransferResponse, SetWalletPinDto } from './dto/wallet.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('details')
  @ApiOperation({ summary: 'Get wallet details including balance and account info' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet details retrieved successfully',
    type: WalletDetailsResponse 
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletDetails(@Request() req): Promise<WalletDetailsResponse> {
    console.log('📊 [WALLET API] GET /wallet/details - Request received');
    console.log('👤 [WALLET API] User ID:', req.user.id);

    const walletDetails = await this.walletService.getWalletDetails(req.user.id);

    console.log('✅ [WALLET API] Wallet details retrieved successfully');
    console.log('📄 Response Data:', {
      balance: walletDetails.balance,
      virtualAccountNumber: walletDetails.virtualAccountNumber,
      isActive: walletDetails.isActive
    });

    return walletDetails;
  }

  @Post('set-pin')
  @ApiOperation({ summary: 'Set or update wallet PIN' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet PIN set successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Wallet PIN set successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid PIN format' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async setWalletPin(@Request() req, @Body() setPinDto: SetWalletPinDto) {
    console.log('🔐 [WALLET API] POST /wallet/set-pin - Request received');
    console.log('👤 [WALLET API] User ID:', req.user.id);

    const result = await this.walletService.setWalletPin(req.user.id, setPinDto.pin);

    console.log('✅ [WALLET API] PIN set successfully');
    console.log('📄 Response Data:', result);

    return result;
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer money from wallet to bank account' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transfer completed successfully',
    type: TransferResponse 
  })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid transfer details' })
  @ApiResponse({ status: 401, description: 'Invalid wallet PIN' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async transferToBank(@Request() req, @Body() transferDto: TransferDto): Promise<TransferResponse> {
    console.log('💸 [WALLET API] POST /wallet/transfer - Request received');
    console.log('👤 [WALLET API] User ID:', req.user.id);
    console.log('💰 [WALLET API] Transfer amount:', transferDto.amount);
    console.log('🏦 [WALLET API] Recipient:', transferDto.accountName, '-', transferDto.accountNumber);

    const transferResult = await this.walletService.transferToBank(req.user.id, transferDto);

    console.log('✅ [WALLET API] Transfer completed successfully');
    console.log('📄 Response Data:', {
      success: transferResult.success,
      reference: transferResult.reference,
      amount: transferResult.amount,
      fee: transferResult.fee,
      newBalance: transferResult.newBalance
    });

    return transferResult;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of transactions to return (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of transactions to skip (default: 0)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction history retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cuid123' },
          amount: { type: 'number', example: 1000.00 },
          type: { type: 'string', example: 'WITHDRAWAL' },
          status: { type: 'string', example: 'COMPLETED' },
          reference: { type: 'string', example: 'TXN_1234567890' },
          description: { type: 'string', example: 'Transfer to John Doe' },
          fee: { type: 'number', example: 50.00 },
          createdAt: { type: 'string', example: '2024-01-15T10:30:00Z' },
          sender: { 
            type: 'object',
            properties: {
              name: { type: 'string', example: 'John Doe' },
              accountNumber: { type: 'string', example: '9038123456' }
            }
          },
          receiver: { 
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Jane Smith' },
              accountNumber: { type: 'string', example: '9038654321' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getTransactions(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    console.log('📊 [WALLET API] GET /wallet/transactions - Request received');
    console.log('👤 [WALLET API] User ID:', req.user.id);
    console.log('📊 [WALLET API] Query params:', { limit, offset });

    const transactions = await this.walletService.getWalletTransactions(
      req.user.id,
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0
    );

    console.log('✅ [WALLET API] Transactions retrieved successfully');
    console.log('📄 Response Data:', `${transactions.length} transactions`);

    return transactions;
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current wallet balance' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number', example: 5000.00 },
        currency: { type: 'string', example: 'NGN' },
        formattedBalance: { type: 'string', example: '₦5,000.00' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@Request() req) {
    console.log('💰 [WALLET API] GET /wallet/balance - Request received');
    console.log('👤 [WALLET API] User ID:', req.user.id);

    const walletDetails = await this.walletService.getWalletDetails(req.user.id);

    const balanceInfo = {
      balance: walletDetails.balance,
      currency: walletDetails.currency,
      formattedBalance: `₦${walletDetails.balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };

    console.log('✅ [WALLET API] Balance retrieved successfully');
    console.log('📄 Response Data:', balanceInfo);

    return balanceInfo;
  }
} 