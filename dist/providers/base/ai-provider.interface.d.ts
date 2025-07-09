export interface SelfieVerificationRequest {
    imageBase64: string;
    userId: string;
    bvnData?: {
        firstName: string;
        lastName: string;
        gender: string;
    };
}
export interface SelfieVerificationResult {
    success: boolean;
    isValidSelfie: boolean;
    confidence: number;
    message: string;
    details?: {
        faceClear: boolean;
        singlePerson: boolean;
        properLighting: boolean;
        faceVisible: boolean;
        noObstructions: boolean;
    };
    error?: string;
}
export interface IAiProvider {
    verifySelfie(request: SelfieVerificationRequest): Promise<SelfieVerificationResult>;
}
