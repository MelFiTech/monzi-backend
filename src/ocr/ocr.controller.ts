import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request, 
  Get, 
  Param, 
  UseInterceptors, 
  UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExtractTextDto, OcrResponseDto, UploadImageDto } from './dto/ocr.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('OCR')
@Controller('ocr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @ApiOperation({ summary: 'Upload image for OCR processing' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully', type: OcrResponseDto })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body() uploadImageDto: UploadImageDto,
  ) {
    return this.ocrService.processImage(file, req.user.id);
  }

  @ApiOperation({ summary: 'Extract and process text from raw OCR output' })
  @ApiResponse({ status: 201, description: 'Text extracted successfully', type: OcrResponseDto })
  @Post('extract')
  async extractText(@Body() extractTextDto: ExtractTextDto, @Request() req) {
    return this.ocrService.extractText(extractTextDto, req.user.id);
  }

  @ApiOperation({ summary: 'Get OCR scan history for current user' })
  @ApiResponse({ status: 200, description: 'OCR history retrieved successfully', type: [OcrResponseDto] })
  @Get('history')
  async getOcrHistory(@Request() req) {
    return this.ocrService.getOcrHistory(req.user.id);
  }

  @ApiOperation({ summary: 'Get specific OCR scan by ID' })
  @ApiResponse({ status: 200, description: 'OCR scan retrieved successfully', type: OcrResponseDto })
  @Get(':id')
  async getOcrScan(@Param('id') id: string, @Request() req) {
    return this.ocrService.getOcrScan(id, req.user.id);
  }
}
