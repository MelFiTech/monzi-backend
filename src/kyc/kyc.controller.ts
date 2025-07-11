import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  VerifyBvnDto,
  UploadSelfieDto,
  BvnVerificationResponseDto,
  SelfieUploadResponseDto,
  KycStatusResponseDto,
} from './dto/kyc.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Type definition for multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard) // Restored authentication
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @ApiOperation({
    summary: 'Verify user BVN',
    description: 'Verify Bank Verification Number (BVN) to start KYC process',
  })
  @ApiResponse({
    status: 200,
    description: 'BVN verification completed',
    type: BvnVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid BVN or user already verified',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('verify-bvn')
  async verifyBvn(@Body() verifyBvnDto: VerifyBvnDto, @Request() req) {
    console.log('🔍 [KYC API] POST /kyc/verify-bvn - Request received');
    console.log('📝 Request Data:', JSON.stringify(verifyBvnDto, null, 2));

    try {
      // Get user ID from JWT token
      const userId = req.user.id;

      const result = await this.kycService.verifyBvn(verifyBvnDto, userId);
      console.log('✅ [KYC API] BVN verification completed');
      console.log('📄 Response Data:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log('❌ [KYC API] BVN verification failed');
      console.log('🚨 Error:', error.message);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Upload selfie for verification',
    description: 'Upload selfie image for face verification against BVN data',
  })
  @ApiResponse({
    status: 200,
    description: 'Selfie uploaded and verified successfully',
    type: SelfieUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or BVN not verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiConsumes('multipart/form-data')
  @Post('upload-selfie')
  @UseInterceptors(
    FileInterceptor('selfie', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new Error('Only image files (jpg, jpeg, png) are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadSelfie(
    @UploadedFile() file: MulterFile,
    @Request() req,
  ) {
    console.log('📸 [KYC API] POST /kyc/upload-selfie - Request received');
    console.log('📁 File info:', {
      filename: file?.originalname,
      size: file?.size,
      mimetype: file?.mimetype,
    });

    try {
      // Get user ID from JWT token
      const userId = req.user.id;

      const result = await this.kycService.uploadSelfie(file, userId);
      console.log('✅ [KYC API] Selfie upload completed');
      console.log('📄 Response Data:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log('❌ [KYC API] Selfie upload failed');
      console.log('🚨 Error:', error.message);
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get KYC status',
    description: 'Check current KYC verification status for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved successfully',
    type: KycStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('status')
  async getKycStatus(@Request() req) {
    console.log('📊 [KYC API] GET /kyc/status - Request received');

    try {
      // Get user ID from JWT token
      const userId = req.user.id;

      const result = await this.kycService.getKycStatus(userId);
      console.log('✅ [KYC API] KYC status retrieved');
      console.log('📄 Response Data:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log('❌ [KYC API] Failed to get KYC status');
      console.log('🚨 Error:', error.message);
      throw error;
    }
  }
}
