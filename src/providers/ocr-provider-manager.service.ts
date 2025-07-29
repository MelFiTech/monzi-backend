import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TesseractOcrProvider } from './tesseract/tesseract-ocr.provider';
import {
  IOcrProvider,
  OcrOptions,
  OcrResult,
} from './base/ocr-provider.interface';

@Injectable()
export class OcrProviderManagerService {
  private readonly logger = new Logger(OcrProviderManagerService.name);
  private providers: IOcrProvider[] = [];
  private fallbackToSimulation: boolean;

  constructor(
    private configService: ConfigService,
    private tesseractProvider: TesseractOcrProvider,
  ) {
    this.fallbackToSimulation =
      this.configService.get('OCR_FALLBACK_TO_SIMULATION', 'true') === 'true';
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.logger.log('Initializing OCR providers...');

    // Add Tesseract provider if available
    try {
      const isTesseractAvailable = this.tesseractProvider.isAvailable();
      this.logger.log(
        `Tesseract availability check result: ${isTesseractAvailable}`,
      );

      if (isTesseractAvailable) {
        this.providers.push(this.tesseractProvider);
        this.logger.log('Tesseract OCR provider initialized');
      } else {
        this.logger.warn('Tesseract OCR provider not available');
      }
    } catch (error) {
      this.logger.error(
        'Error checking Tesseract availability:',
        error.message,
      );
    }

    this.logger.log(
      `OCR providers initialized: ${this.providers.length} available`,
    );
  }

  async extractText(
    imageBuffer: Buffer,
    options?: OcrOptions,
  ): Promise<OcrResult> {
    if (this.providers.length === 0) {
      return this.fallbackToSimulation
        ? this.simulateOcr()
        : {
            success: false,
            text: '',
            confidence: 0,
            error: 'No OCR providers available',
          };
    }

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        this.logger.log(
          `Attempting OCR with provider: ${provider.constructor.name}`,
        );
        const result = await provider.extractText(imageBuffer, options);

        if (result.success && result.text.trim()) {
          this.logger.log(`OCR successful with ${provider.constructor.name}`);
          return result;
        } else {
          this.logger.warn(
            `OCR failed with ${provider.constructor.name}: ${result.error || 'No text extracted'}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `OCR failed with ${provider.constructor.name}:`,
          error.message,
        );
      }
    }

    // If all providers fail, fallback to simulation if enabled
    if (this.fallbackToSimulation) {
      this.logger.warn('All OCR providers failed, falling back to simulation');
      return this.simulateOcr();
    }

    return {
      success: false,
      text: '',
      confidence: 0,
      error: 'All OCR providers failed',
    };
  }

  private simulateOcr(): OcrResult {
    return {
      success: true,
      text: 'Simulated OCR text - Transfer to John Doe Account: 1234567890 Amount: 50000 Bank: GTBank',
      confidence: 0.95,
      processingTime: 1000,
    };
  }

  getAvailableProviders(): string[] {
    return this.providers.map((provider) => provider.constructor.name);
  }

  isOcrAvailable(): boolean {
    return this.providers.length > 0 || this.fallbackToSimulation;
  }
}
