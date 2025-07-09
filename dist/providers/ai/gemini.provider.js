"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GeminiAiProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAiProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let GeminiAiProvider = GeminiAiProvider_1 = class GeminiAiProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(GeminiAiProvider_1.name);
        this.apiKey = this.configService.get('GEMINI_API_KEY');
        this.apiUrl = this.configService.get('GEMINI_API_URL');
        if (!this.apiKey || !this.apiUrl) {
            throw new Error('Gemini AI credentials not configured properly');
        }
        this.axiosInstance = axios_1.default.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.logger.log('Gemini AI Provider initialized successfully');
    }
    async verifySelfie(request) {
        this.logger.log(`🤖 [GEMINI AI] Starting selfie verification for user: ${request.userId}`);
        try {
            const prompt = this.buildVerificationPrompt(request.bvnData);
            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: request.imageBase64
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 1024,
                }
            };
            this.logger.log(`📤 [GEMINI AI] Sending verification request to Gemini API`);
            const response = await this.axiosInstance.post(`${this.apiUrl}?key=${this.apiKey}`, requestBody);
            this.logger.log(`📥 [GEMINI AI] Response received from Gemini API`);
            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                const analysisText = response.data.candidates[0].content.parts[0].text;
                this.logger.log(`📊 [GEMINI AI] Analysis: ${analysisText}`);
                const verificationResult = this.parseGeminiResponse(analysisText);
                this.logger.log(`✅ [GEMINI AI] Verification completed - Valid: ${verificationResult.isValidSelfie}, Confidence: ${verificationResult.confidence}`);
                return verificationResult;
            }
            else {
                this.logger.error(`❌ [GEMINI AI] Invalid response format from Gemini API`);
                return {
                    success: false,
                    isValidSelfie: false,
                    confidence: 0,
                    message: 'Failed to analyze selfie - invalid API response',
                    error: 'INVALID_API_RESPONSE'
                };
            }
        }
        catch (error) {
            this.logger.error(`❌ [GEMINI AI] Error during selfie verification:`, error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Selfie verification failed';
                this.logger.error(`🚨 [GEMINI AI] HTTP Error ${status}: ${message}`);
                return {
                    success: false,
                    isValidSelfie: false,
                    confidence: 0,
                    message: `Selfie verification failed: ${message}`,
                    error: `HTTP_${status}`
                };
            }
            else if (error.request) {
                this.logger.error(`🌐 [GEMINI AI] Network error: ${error.message}`);
                return {
                    success: false,
                    isValidSelfie: false,
                    confidence: 0,
                    message: 'Network error occurred during selfie verification',
                    error: 'NETWORK_ERROR'
                };
            }
            else {
                this.logger.error(`🔥 [GEMINI AI] Unexpected error: ${error.message}`);
                return {
                    success: false,
                    isValidSelfie: false,
                    confidence: 0,
                    message: 'An unexpected error occurred during selfie verification',
                    error: 'UNEXPECTED_ERROR'
                };
            }
        }
    }
    buildVerificationPrompt(bvnData) {
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

${bvnData ? `
ADDITIONAL CONTEXT:
- User's registered name: ${bvnData.firstName} ${bvnData.lastName}
- User's registered gender: ${bvnData.gender}
Please note if the person in the image appears to match the registered gender.
` : ''}

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
    parseGeminiResponse(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                isValidSelfie: parsed.isValidSelfie || false,
                confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1),
                message: parsed.message || 'Selfie analysis completed',
                details: {
                    faceClear: parsed.details?.faceClear || false,
                    singlePerson: parsed.details?.singlePerson || false,
                    properLighting: parsed.details?.properLighting || false,
                    faceVisible: parsed.details?.faceVisible || false,
                    noObstructions: parsed.details?.noObstructions || false,
                }
            };
        }
        catch (error) {
            this.logger.error(`❌ [GEMINI AI] Failed to parse response: ${error.message}`);
            this.logger.error(`📄 [GEMINI AI] Raw response: ${responseText}`);
            const responseUpper = responseText.toUpperCase();
            const isValid = responseUpper.includes('TRUE') &&
                responseUpper.includes('VALID') &&
                !responseUpper.includes('FALSE');
            return {
                success: true,
                isValidSelfie: isValid,
                confidence: isValid ? 0.6 : 0.3,
                message: isValid ? 'Selfie appears valid (fallback analysis)' : 'Selfie validation failed (fallback analysis)',
                details: {
                    faceClear: false,
                    singlePerson: false,
                    properLighting: false,
                    faceVisible: false,
                    noObstructions: false,
                }
            };
        }
    }
};
exports.GeminiAiProvider = GeminiAiProvider;
exports.GeminiAiProvider = GeminiAiProvider = GeminiAiProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiAiProvider);
//# sourceMappingURL=gemini.provider.js.map