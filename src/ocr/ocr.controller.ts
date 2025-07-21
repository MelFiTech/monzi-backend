import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
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
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExtractTextDto, OcrResponseDto, UploadImageDto } from './dto/ocr.dto';
import { memoryStorage } from 'multer';
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

@ApiTags('OCR')
@Controller('ocr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @ApiOperation({ summary: 'Upload image for OCR processing' })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: OcrResponseDto,
  })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: MulterFile,
    @Request() req,
    @Body() uploadImageDto: UploadImageDto,
  ) {
    return this.ocrService.processImage(file, req.user.id);
  }

  @ApiOperation({ summary: 'Extract and process text from raw OCR output' })
  @ApiResponse({
    status: 201,
    description: 'Text extracted successfully',
    type: OcrResponseDto,
  })
  @Post('extract')
  async extractText(@Body() extractTextDto: ExtractTextDto, @Request() req) {
    return this.ocrService.extractText(extractTextDto, req.user.id);
  }

  @ApiOperation({ summary: 'Get OCR system health and available providers' })
  @ApiResponse({
    status: 200,
    description: 'OCR system health information',
  })
  @Get('health')
  async getOcrHealth() {
    return this.ocrService.getOcrHealth();
  }

  @ApiOperation({ summary: 'Get OCR scan history for current user' })
  @ApiResponse({
    status: 200,
    description: 'OCR history retrieved successfully',
    type: [OcrResponseDto],
  })
  @Get('history')
  async getOcrHistory(@Request() req) {
    return this.ocrService.getOcrHistory(req.user.id);
  }

  @ApiOperation({ summary: 'Get specific OCR scan by ID' })
  @ApiResponse({
    status: 200,
    description: 'OCR scan retrieved successfully',
    type: OcrResponseDto,
  })
  @Get('scan/:id')
  async getOcrScan(@Param('id') id: string, @Request() req) {
    return this.ocrService.getOcrScan(id, req.user.id);
  }

  @ApiOperation({ summary: 'Get specific OCR scan by ID (alternative route)' })
  @ApiResponse({
    status: 200,
    description: 'OCR scan retrieved successfully',
    type: OcrResponseDto,
  })
  @Get(':id')
  async getOcrScanById(@Param('id') id: string, @Request() req) {
    return this.ocrService.getOcrScan(id, req.user.id);
  }
}
