declare module 'node-tesseract-ocr' {
  interface TesseractConfig {
    lang?: string;
    oem?: number;
    psm?: number;
    dpi?: number;
    preprocess?: string;
    [key: string]: any;
  }

  export function recognize(
    image: Buffer | string,
    config?: TesseractConfig
  ): Promise<string>;
} 