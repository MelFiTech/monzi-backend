import { Controller, Post, Get, Delete, Body, Param, ValidationPipe, HttpStatus, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { 
  SetFeeDto, 
  SetFeeResponse, 
  GetFeesResponse, 
  DeleteFeeResponse, 
  FeeConfigurationResponse,
  FeeType,
  GetKycSubmissionsResponse,
  KycSubmissionDetailResponse,
  KycReviewDto,
  KycReviewResponse 
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('fees')
  @ApiOperation({ 
    summary: 'Set or update fee configuration',
    description: 'Configure fees for different transaction types. Can set percentage-based or fixed amount fees with optional minimum and maximum limits.'
  })
  @ApiBody({ type: SetFeeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Fee configuration created or updated successfully',
    type: SetFeeResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid fee configuration data',
  })
  async setFee(@Body(ValidationPipe) setFeeDto: SetFeeDto): Promise<SetFeeResponse> {
    console.log('⚙️ [ADMIN API] POST /admin/fees - Setting fee configuration');
    console.log('📝 Request Data:', setFeeDto);
    
    const result = await this.adminService.setFee(setFeeDto);
    
    console.log('✅ [ADMIN API] Fee configuration set successfully');
    console.log('📄 Response Data:', result);
    
    return result;
  }

  @Get('fees')
  @ApiOperation({ 
    summary: 'Get all fee configurations',
    description: 'Retrieve all configured fees for different transaction types'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee configurations retrieved successfully',
    type: GetFeesResponse,
  })
  async getFees(): Promise<GetFeesResponse> {
    console.log('📊 [ADMIN API] GET /admin/fees - Retrieving all fee configurations');
    
    const result = await this.adminService.getFees();
    
    console.log('✅ [ADMIN API] Fee configurations retrieved successfully');
    console.log('📄 Response Data:', { ...result, fees: `${result.fees.length} fee configurations` });
    
    return result;
  }

  @Get('fees/:type')
  @ApiOperation({ 
    summary: 'Get fee configuration by type',
    description: 'Retrieve fee configuration for a specific transaction type'
  })
  @ApiParam({ 
    name: 'type', 
    enum: FeeType, 
    description: 'Fee type to retrieve',
    example: 'TRANSFER'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee configuration retrieved successfully',
    type: FeeConfigurationResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee configuration not found',
  })
  async getFeeByType(@Param('type') type: FeeType): Promise<FeeConfigurationResponse | null> {
    console.log('🔍 [ADMIN API] GET /admin/fees/:type - Retrieving fee for type:', type);
    
    const result = await this.adminService.getFeeByType(type);
    
    if (result) {
      console.log('✅ [ADMIN API] Fee configuration found for type:', type);
      console.log('📄 Response Data:', result);
    } else {
      console.log('⚠️ [ADMIN API] No fee configuration found for type:', type);
    }
    
    return result;
  }

  @Delete('fees/:type')
  @ApiOperation({ 
    summary: 'Delete fee configuration',
    description: 'Remove fee configuration for a specific transaction type'
  })
  @ApiParam({ 
    name: 'type', 
    enum: FeeType, 
    description: 'Fee type to delete',
    example: 'TRANSFER'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee configuration deleted successfully',
    type: DeleteFeeResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Fee configuration not found',
  })
  async deleteFee(@Param('type') type: FeeType): Promise<DeleteFeeResponse> {
    console.log('🗑️ [ADMIN API] DELETE /admin/fees/:type - Deleting fee for type:', type);
    
    const result = await this.adminService.deleteFee(type);
    
    console.log('✅ [ADMIN API] Fee configuration deleted successfully');
    console.log('📄 Response Data:', result);
    
    return result;
  }

  @Post('fees/seed')
  @ApiOperation({ 
    summary: 'Seed default fee configurations',
    description: 'Initialize the system with default fee configurations for common transaction types'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Default fee configurations seeded successfully',
  })
  async seedDefaultFees(): Promise<{ success: boolean; message: string }> {
    console.log('🌱 [ADMIN API] POST /admin/fees/seed - Seeding default fees');
    
    await this.adminService.seedDefaultFees();
    
    console.log('✅ [ADMIN API] Default fees seeded successfully');
    
    return {
      success: true,
      message: 'Default fee configurations seeded successfully'
    };
  }

  @Post('fees/:type/calculate')
  @ApiOperation({ 
    summary: 'Calculate fee for amount',
    description: 'Calculate the fee that would be charged for a specific amount and fee type'
  })
  @ApiParam({ 
    name: 'type', 
    enum: FeeType, 
    description: 'Fee type to calculate',
    example: 'TRANSFER'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          example: 1000,
          description: 'Amount to calculate fee for'
        }
      },
      required: ['amount']
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        amount: { type: 'number', example: 1000 },
        fee: { type: 'number', example: 25 },
        totalAmount: { type: 'number', example: 1025 },
        feeType: { type: 'string', example: 'TRANSFER' }
      }
    }
  })
  async calculateFee(
    @Param('type') type: FeeType,
    @Body() body: { amount: number }
  ): Promise<{
    success: boolean;
    amount: number;
    fee: number;
    totalAmount: number;
    feeType: string;
  }> {
    console.log('🧮 [ADMIN API] POST /admin/fees/:type/calculate - Calculating fee');
    console.log('📝 Type:', type, 'Amount:', body.amount);
    
    const fee = await this.adminService.calculateFee(type, body.amount);
    const totalAmount = body.amount + fee;
    
    console.log('✅ [ADMIN API] Fee calculated successfully');
    console.log('📄 Fee:', fee, 'Total:', totalAmount);
    
    return {
      success: true,
      amount: body.amount,
      fee,
      totalAmount,
      feeType: type
    };
  }

  // ==================== KYC MANAGEMENT ENDPOINTS ====================

  @Get('kyc/submissions')
  @ApiOperation({ 
    summary: 'Get all KYC submissions',
    description: 'Retrieve all KYC submissions with their current status (pending, verified, rejected)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC submissions retrieved successfully',
    type: GetKycSubmissionsResponse,
  })
  async getKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log('📋 [ADMIN API] GET /admin/kyc/submissions - Retrieving all KYC submissions');
    
    const result = await this.adminService.getKycSubmissions();
    
    console.log('✅ [ADMIN API] KYC submissions retrieved successfully');
    console.log('📊 [ADMIN API] Total:', result.total, 'Pending:', result.pending, 'Verified:', result.verified, 'Rejected:', result.rejected);
    
    return result;
  }

  @Get('kyc/submissions/pending')
  @ApiOperation({ 
    summary: 'Get pending KYC submissions',
    description: 'Retrieve only KYC submissions that are pending admin review'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending KYC submissions retrieved successfully',
    type: GetKycSubmissionsResponse,
  })
  async getPendingKycSubmissions(): Promise<GetKycSubmissionsResponse> {
    console.log('⏳ [ADMIN API] GET /admin/kyc/submissions/pending - Retrieving pending KYC submissions');
    
    const result = await this.adminService.getPendingKycSubmissions();
    
    console.log('✅ [ADMIN API] Pending KYC submissions retrieved successfully');
    console.log('📊 [ADMIN API] Total pending:', result.total);
    
    return result;
  }

  @Get('kyc/submissions/:userId')
  @ApiOperation({ 
    summary: 'Get KYC submission details',
    description: 'Retrieve detailed information about a specific user\'s KYC submission including uploaded images'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to get KYC submission for',
    example: 'cuid123' 
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC submission details retrieved successfully',
    type: KycSubmissionDetailResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getKycSubmissionDetails(@Param('userId') userId: string): Promise<KycSubmissionDetailResponse> {
    console.log('🔍 [ADMIN API] GET /admin/kyc/submissions/:userId - Retrieving KYC submission details');
    console.log('👤 User ID:', userId);
    
    const result = await this.adminService.getKycSubmissionDetails(userId);
    
    console.log('✅ [ADMIN API] KYC submission details retrieved successfully');
    console.log('📄 Status:', result.submission.kycStatus);
    
    return result;
  }

  @Put('kyc/submissions/:userId/review')
  @ApiOperation({ 
    summary: 'Review KYC submission',
    description: 'Approve or reject a user\'s KYC submission. When approved, a wallet is automatically created for the user.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to review KYC submission for',
    example: 'cuid123' 
  })
  @ApiBody({ type: KycReviewDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KYC submission reviewed successfully',
    type: KycReviewResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid review data or submission cannot be reviewed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async reviewKycSubmission(
    @Param('userId') userId: string,
    @Body(ValidationPipe) reviewDto: KycReviewDto
  ): Promise<KycReviewResponse> {
    console.log('⚖️ [ADMIN API] PUT /admin/kyc/submissions/:userId/review - Reviewing KYC submission');
    console.log('👤 User ID:', userId);
    console.log('📝 Decision:', reviewDto.decision);
    console.log('💬 Comment:', reviewDto.comment);
    
    const result = await this.adminService.reviewKycSubmission(userId, reviewDto);
    
    console.log('✅ [ADMIN API] KYC submission reviewed successfully');
    console.log('📄 New Status:', result.newStatus);
    console.log('💳 Wallet Created:', result.walletCreated);
    
    return result;
  }
} 