import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IAiProvider,
  SelfieVerificationRequest,
  SelfieVerificationResult,
} from '../base/ai-provider.interface';

@Injectable()
export class GeminiAiProvider implements IAiProvider {
  private readonly logger = new Logger(GeminiAiProvider.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.apiUrl = this.configService.get<string>('GEMINI_API_URL');

    if (!this.apiKey || !this.apiUrl) {
      throw new Error('Gemini AI credentials not configured properly');
    }

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('Gemini AI Provider initialized successfully');
  }

  async verifySelfie(
    request: SelfieVerificationRequest,
  ): Promise<SelfieVerificationResult> {
    this.logger.log(
      `🤖 [GEMINI AI] Starting selfie verification for user: ${request.userId}`,
    );

    try {
      const prompt = this.buildVerificationPrompt(request.bvnData);

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: request.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
      };

      this.logger.log(
        `📤 [GEMINI AI] Sending verification request to Gemini API`,
      );

      const response = await this.axiosInstance.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        requestBody,
      );

      this.logger.log(`📥 [GEMINI AI] Response received from Gemini API`);

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const analysisText = response.data.candidates[0].content.parts[0].text;
        this.logger.log(`📊 [GEMINI AI] Analysis: ${analysisText}`);

        const verificationResult = this.parseGeminiResponse(analysisText);

        this.logger.log(
          `✅ [GEMINI AI] Verification completed - Valid: ${verificationResult.isValidSelfie}, Confidence: ${verificationResult.confidence}`,
        );

        return verificationResult;
      } else {
        this.logger.error(
          `❌ [GEMINI AI] Invalid response format from Gemini API`,
        );
        return {
          success: false,
          isValidSelfie: false,
          confidence: 0,
          message: 'Failed to analyze selfie - invalid API response',
          error: 'INVALID_API_RESPONSE',
        };
      }
    } catch (error) {
      this.logger.error(
        `❌ [GEMINI AI] Error during selfie verification:`,
        error,
      );

      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.error?.message || 'Selfie verification failed';

        this.logger.error(`🚨 [GEMINI AI] HTTP Error ${status}: ${message}`);

        return {
          success: false,
          isValidSelfie: false,
          confidence: 0,
          message: `Selfie verification failed: ${message}`,
          error: `HTTP_${status}`,
        };
      } else if (error.request) {
        this.logger.error(`🌐 [GEMINI AI] Network error: ${error.message}`);
        return {
          success: false,
          isValidSelfie: false,
          confidence: 0,
          message: 'Network error occurred during selfie verification',
          error: 'NETWORK_ERROR',
        };
      } else {
        this.logger.error(`🔥 [GEMINI AI] Unexpected error: ${error.message}`);
        return {
          success: false,
          isValidSelfie: false,
          confidence: 0,
          message: 'An unexpected error occurred during selfie verification',
          error: 'UNEXPECTED_ERROR',
        };
      }
    }
  }

  private buildVerificationPrompt(bvnData?: {
    firstName: string;
    lastName: string;
    gender: string;
  }): string {
    const basePrompt = `
You are an expert AI image analyst specialized in verifying selfie photographs for KYC (Know Your Customer) verification purposes.

Please analyze this image and determine if it meets the criteria for a valid KYC selfie:

CRITERIA TO CHECK:
1. FACE VISIBILITY: Is there a clear, unobstructed view of a human face?
2. SINGLE PERSON: Is there only one person visible in the image?
3. PROPER LIGHTING: Is the face well-lit and clearly visible (not too dark, not overexposed)?
4. NO OBSTRUCTIONS: Are there no sunglasses, masks, hats, or other items obscuring the face?
5. IMAGE QUALITY: Is the image clear and not blurry?
6. AUTHENTIC SELFIE: Does this appear to be a real selfie photo (not a screenshot, drawing, or photo of a photo)?

${
  bvnData
    ? `
ADDITIONAL CONTEXT:
- User's registered name: ${bvnData.firstName} ${bvnData.lastName}
- User's registered gender: ${bvnData.gender}
Please note if the person in the image appears to match the registered gender.
`
    : ''
}

RESPONSE FORMAT:
Please respond with EXACTLY this JSON format (no additional text):
{
  "isValidSelfie": true/false,
  "confidence": 0.0-1.0,
  "message": "Brief explanation of your decision",
  "details": {
    "faceClear": true/false,
    "singlePerson": true/false,
    "properLighting": true/false,
    "faceVisible": true/false,
    "noObstructions": true/false,
    "imageQuality": true/false,
    "authenticSelfie": true/false
  },
  "genderMatch": true/false/null
}

IMPORTANT: Only approve (isValidSelfie: true) if ALL criteria are met and confidence is above 0.8.`;

    return basePrompt;
  }

  private parseGeminiResponse(responseText: string): SelfieVerificationResult {
    try {
      // Extract JSON from response (Gemini sometimes adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        isValidSelfie: parsed.isValidSelfie || false,
        confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1), // Clamp between 0-1
        message: parsed.message || 'Selfie analysis completed',
        details: {
          faceClear: parsed.details?.faceClear || false,
          singlePerson: parsed.details?.singlePerson || false,
          properLighting: parsed.details?.properLighting || false,
          faceVisible: parsed.details?.faceVisible || false,
          noObstructions: parsed.details?.noObstructions || false,
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ [GEMINI AI] Failed to parse response: ${error.message}`,
      );
      this.logger.error(`📄 [GEMINI AI] Raw response: ${responseText}`);

      // Fallback: try to determine from keywords
      const responseUpper = responseText.toUpperCase();
      const isValid =
        responseUpper.includes('TRUE') &&
        responseUpper.includes('VALID') &&
        !responseUpper.includes('FALSE');

      return {
        success: true,
        isValidSelfie: isValid,
        confidence: isValid ? 0.6 : 0.3, // Lower confidence for fallback parsing
        message: isValid
          ? 'Selfie appears valid (fallback analysis)'
          : 'Selfie validation failed (fallback analysis)',
        details: {
          faceClear: false,
          singlePerson: false,
          properLighting: false,
          faceVisible: false,
          noObstructions: false,
        },
      };
    }
  }
}
