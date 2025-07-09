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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const ocr_service_1 = require("./ocr.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const ocr_dto_1 = require("./dto/ocr.dto");
const multer_1 = require("multer");
const path_1 = require("path");
let OcrController = class OcrController {
    constructor(ocrService) {
        this.ocrService = ocrService;
    }
    async uploadImage(file, req, uploadImageDto) {
        return this.ocrService.processImage(file, req.user.id);
    }
    async extractText(extractTextDto, req) {
        return this.ocrService.extractText(extractTextDto, req.user.id);
    }
    async getOcrHistory(req) {
        return this.ocrService.getOcrHistory(req.user.id);
    }
    async getOcrScan(id, req) {
        return this.ocrService.getOcrScan(id, req.user.id);
    }
};
exports.OcrController = OcrController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Upload image for OCR processing' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Image uploaded successfully', type: ocr_dto_1.OcrResponseDto }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, ocr_dto_1.UploadImageDto]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "uploadImage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Extract and process text from raw OCR output' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Text extracted successfully', type: ocr_dto_1.OcrResponseDto }),
    (0, common_1.Post)('extract'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ocr_dto_1.ExtractTextDto, Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "extractText", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get OCR scan history for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OCR history retrieved successfully', type: [ocr_dto_1.OcrResponseDto] }),
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "getOcrHistory", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get specific OCR scan by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OCR scan retrieved successfully', type: ocr_dto_1.OcrResponseDto }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "getOcrScan", null);
exports.OcrController = OcrController = __decorate([
    (0, swagger_1.ApiTags)('OCR'),
    (0, common_1.Controller)('ocr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ocr_service_1.OcrService])
], OcrController);
//# sourceMappingURL=ocr.controller.js.map