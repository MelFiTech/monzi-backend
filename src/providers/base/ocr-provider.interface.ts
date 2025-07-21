export interface IOcrProvider {
  extractText(imageBuffer: Buffer, options?: OcrOptions): Promise<OcrResult>;
  isAvailable(): boolean;
}

export interface OcrOptions {
  language?: string;
  confidence?: number;
  preprocess?: boolean;
}

export interface OcrResult {
  success: boolean;
  text: string;
  confidence: number;
  error?: string;
  processingTime?: number;
}

export interface OcrProviderConfig {
  enabled: boolean;
  fallbackToSimulation?: boolean;
  maxProcessingTime?: number;
  supportedLanguages?: string[];
} 