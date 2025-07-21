import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import tesseract from 'node-tesseract-ocr';
import * as sharp from 'sharp';
import { IOcrProvider, OcrOptions, OcrResult } from '../base/ocr-provider.interface';

@Injectable()
export class TesseractOcrProvider implements IOcrProvider {
  private readonly logger = new Logger(TesseractOcrProvider.name);
  private readonly config: any;

  constructor(private configService: ConfigService) {
    this.config = {
      lang: 'eng',
      oem: 1,
      psm: 3,
      dpi: 300,
      preprocess: 'contrast',
    };
  }

  async extractText(imageBuffer: Buffer, options?: OcrOptions): Promise<OcrResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log('Starting OCR text extraction with Tesseract');
      
      // Validate input
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        throw new Error('Invalid image buffer provided');
      }
      
      this.logger.log(`Image buffer size: ${imageBuffer.length} bytes`);
      
      // Preprocess image if requested
      let processedBuffer = imageBuffer;
      if (options?.preprocess !== false) {
        try {
          this.logger.log('Preprocessing image...');
          processedBuffer = await this.preprocessImage(imageBuffer);
          this.logger.log('Image preprocessing successful');
        } catch (preprocessError) {
          this.logger.warn('Image preprocessing failed, using original:', preprocessError.message);
          processedBuffer = imageBuffer;
        }
      }

      // Configure OCR options
      const ocrConfig = {
        ...this.config,
        lang: options?.language || this.config.lang,
      };

      this.logger.log('Calling Tesseract OCR with config:', ocrConfig);
      
      // Extract text using Tesseract
      const text = await tesseract.recognize(processedBuffer, ocrConfig);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`OCR completed in ${processingTime}ms. Extracted text: "${text.trim()}"`);
      
      return {
        success: true,
        text: text.trim(),
        confidence: options?.confidence || 0.8,
        processingTime,
      };
    } catch (error) {
      this.logger.error('OCR extraction failed:', error.message);
      this.logger.error('Full error:', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  isAvailable(): boolean {
    try {
      // Check if Tesseract is installed on the system
      const { execSync } = require('child_process');
      execSync('tesseract --version', { stdio: 'ignore' });
      this.logger.log('Tesseract is available on system');
      return true;
    } catch (error) {
      this.logger.warn('Tesseract not available on system:', error.message);
      return false;
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();
    } catch (error) {
      this.logger.warn('Image preprocessing failed, using original:', error.message);
      return imageBuffer;
    }
  }
} 